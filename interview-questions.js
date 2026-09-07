// Pure question-bank filter/search logic, kept separate from interview.js (which
// touches the DOM) so it can be unit-tested with plain Node — same split as
// jobs/jobs-filter.js and interview-star.js.

(function (global) {
  function filterQuestions(questions, filters) {
    const { category, keyword, difficulty, status, progress } = filters || {};
    const progressMap = progress || {};

    return (questions || []).filter((q) => {
      if (category && category !== "all" && q.category !== category) return false;
      if (difficulty && difficulty !== "all" && q.difficulty !== difficulty) return false;

      if (status && status !== "all") {
        const entry = progressMap[q.id] || {};
        if (status === "practiced" && !entry.practiced) return false;
        if (status === "unpracticed" && entry.practiced) return false;
        if (status === "favorites" && !entry.favorite) return false;
      }

      if (keyword) {
        const k = keyword.trim().toLowerCase();
        if (k) {
          const haystack = [q.question, q.subcategory, ...(q.tags || []), ...(q.evaluates || [])]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(k)) return false;
        }
      }

      return true;
    });
  }

  function countByCategory(questions) {
    return (questions || []).reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {});
  }

  function countPracticed(questions, progress) {
    const progressMap = progress || {};
    return (questions || []).reduce((acc, q) => {
      acc[q.category] = acc[q.category] || { total: 0, practiced: 0 };
      acc[q.category].total += 1;
      if (progressMap[q.id] && progressMap[q.id].practiced) acc[q.category].practiced += 1;
      return acc;
    }, {});
  }

  function findQuestionIndex(questions, id) {
    return (questions || []).findIndex((q) => q.id === id);
  }

  const api = { filterQuestions, countByCategory, countPracticed, findQuestionIndex };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.InterviewQuestions = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
