// Pure text-transformation logic for the Worksheet Generator.
// No DOM access here on purpose — worksheet.js does the rendering/escaping,
// so this file can be unit-tested with plain Node and (later) swapped for an
// AI-backed version without touching any UI code.

(function (global) {
  const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "in", "on", "at",
    "to", "for", "with", "by", "from", "as", "is", "are", "was", "were", "be", "been",
    "being", "this", "that", "these", "those", "it", "its", "into", "over", "under",
    "than", "which", "who", "whom", "what", "when", "where", "why", "how", "there",
    "their", "they", "them", "we", "you", "your", "our", "us", "he", "she", "his",
    "her", "not", "no", "can", "could", "will", "would", "should", "may", "might",
    "must", "do", "does", "did", "have", "has", "had", "also", "such", "each", "any",
    "all", "some", "one", "two", "three", "more", "most", "other", "into", "up",
    "out", "about", "after", "before", "between", "because", "very", "just",
  ]);

  function splitSentences(text) {
    return String(text)
      .replace(/\r\n/g, "\n")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && /[a-zA-Z]/.test(s));
  }

  function tokenize(sentence) {
    return sentence.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
  }

  function extractKeyTerms(sentences, maxTerms) {
    const freq = new Map(); // lowercase -> { count, original }
    sentences.forEach((sentence) => {
      tokenize(sentence).forEach((word) => {
        const lower = word.toLowerCase();
        if (STOPWORDS.has(lower) || word.length < 4) return;
        const entry = freq.get(lower) || { count: 0, original: word };
        entry.count += 1;
        // Prefer a capitalized/proper-noun-looking rendering if we see one.
        if (/^[A-Z]/.test(word) && !/^[A-Z]/.test(entry.original)) entry.original = word;
        freq.set(lower, entry);
      });
    });

    const ranked = [...freq.entries()]
      .filter(([, v]) => v.count >= 1)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));

    return ranked.slice(0, maxTerms).map(([lower, v]) => ({ term: v.original, lower, count: v.count }));
  }

  function findContextSentence(sentences, lowerTerm) {
    return sentences.find((s) => s.toLowerCase().includes(lowerTerm)) || "";
  }

  function blankOutTerm(sentence, term) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (!re.test(sentence)) return null;
    return sentence.replace(re, "______");
  }

  /**
   * @param {{title?: string, notes: string, numQuestions?: number, difficulty?: "easy"|"medium"|"hard"}} input
   */
  function generateWorksheet(input) {
    const title = (input && input.title ? String(input.title) : "").trim() || "Study Worksheet";
    const notes = input && input.notes ? String(input.notes) : "";
    const numQuestions = Math.min(15, Math.max(4, parseInt(input && input.numQuestions, 10) || 8));
    const difficulty = ["easy", "medium", "hard"].includes(input && input.difficulty) ? input.difficulty : "medium";
    const blanksPerSentence = difficulty === "hard" ? 2 : 1;
    const minSentenceLen = difficulty === "easy" ? 40 : 20;

    const sentences = splitSentences(notes).filter((s) => s.length >= minSentenceLen);

    if (sentences.length === 0) {
      return {
        title,
        difficulty,
        keyTerms: [],
        fillBlank: [],
        shortAnswer: [],
        isEmpty: true,
        warning: notes.trim()
          ? "Couldn't find enough complete sentences in these notes to build a worksheet. Try pasting a few full sentences (not just bullet fragments)."
          : "Paste some notes above, then click Generate Worksheet.",
      };
    }

    const maxTerms = Math.max(6, Math.ceil(numQuestions * 1.5));
    const keyTermsRanked = extractKeyTerms(sentences, maxTerms);

    // Build fill-in-the-blank items, spending roughly 2/3 of numQuestions here.
    const fillTarget = Math.max(2, Math.round(numQuestions * 0.6));
    const usedSentenceIdx = new Set();
    const usedTerms = new Set();
    const fillBlank = [];

    for (const { term, lower } of keyTermsRanked) {
      if (fillBlank.length >= fillTarget) break;
      if (usedTerms.has(lower)) continue;
      const idx = sentences.findIndex((s, i) => !usedSentenceIdx.has(i) && s.toLowerCase().includes(lower));
      if (idx === -1) continue;
      const sentence = sentences[idx];
      let blanked = blankOutTerm(sentence, term);
      if (!blanked) continue;

      // Optionally blank a second distinct term in the same sentence for "hard".
      if (blanksPerSentence === 2) {
        const second = keyTermsRanked.find(
          (t) => t.lower !== lower && !usedTerms.has(t.lower) && sentence.toLowerCase().includes(t.lower)
        );
        if (second) {
          const twice = blankOutTerm(blanked, second.term);
          if (twice) {
            blanked = twice;
            usedTerms.add(second.lower);
          }
        }
      }

      fillBlank.push({ prompt: blanked, answer: term });
      usedTerms.add(lower);
      usedSentenceIdx.add(idx);
    }

    // Short-answer items: leftover sentences ("explain in your own words") plus
    // a couple of "why does X matter" prompts built from unused key terms.
    const shortTarget = Math.max(2, numQuestions - fillBlank.length);
    const shortAnswer = [];

    sentences.forEach((sentence, idx) => {
      if (shortAnswer.length >= Math.ceil(shortTarget * 0.7)) return;
      if (usedSentenceIdx.has(idx)) return;
      shortAnswer.push({
        prompt: `In your own words, explain the following: "${sentence}"`,
        referenceNote: sentence,
      });
      usedSentenceIdx.add(idx);
    });

    for (const { term, lower } of keyTermsRanked) {
      if (shortAnswer.length >= shortTarget) break;
      if (usedTerms.has(lower)) continue;
      const context = findContextSentence(sentences, lower);
      if (!context) continue;
      shortAnswer.push({
        prompt: `Why is "${term}" important, based on your notes?`,
        referenceNote: context,
      });
      usedTerms.add(lower);
    }

    const keyTerms = keyTermsRanked.slice(0, Math.max(5, Math.min(10, maxTerms))).map(({ term, lower }) => ({
      term,
      contextSentence: findContextSentence(sentences, lower),
    }));

    return {
      title,
      difficulty,
      keyTerms,
      fillBlank: fillBlank.slice(0, numQuestions),
      shortAnswer: shortAnswer.slice(0, numQuestions),
      isEmpty: false,
      warning: null,
    };
  }

  const api = { generateWorksheet, splitSentences, extractKeyTerms };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.WorksheetGenerator = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
