// Interview Guide content — the ONLY file you should need to edit to add or change
// interview stages, STAR guidance, the question bank, technical-prep content, the
// interviewer-question list, self-review checklists, or the before/during/after
// checklists. Plain data, no logic. Loaded as a global (InterviewData) in the
// browser and via module.exports in Node tests.
//
// To add a new question: copy an existing object in QUESTIONS, give it a new
// unique "id" (lowercase, hyphens, never reused/changed once published — saved
// practice answers are keyed by this id), and fill in the fields. difficulty is
// one of "introductory" | "intermediate" | "advanced".

(function (global) {
  const STAGES = [
    { name: "Recruiter / Initial Screening", description: "A short call (usually 20-30 minutes) with a recruiter or talent-acquisition contact, not the hiring team. Checks basic fit: background, interest, timeline, and sometimes salary expectations." },
    { name: "Behavioral Interview", description: "Questions about how you've handled real situations — teamwork, conflict, failure, leadership. This is where the STAR method pays off." },
    { name: "Technical Screen", description: "An early, often shorter technical check — sometimes a recruiter-scheduled online assessment or a quick call with an engineer to confirm baseline technical fluency before a longer interview." },
    { name: "Coding Interview", description: "A live or take-home coding exercise, typically for software engineering and some data roles. May be solo (shared editor) or pair-programming style with an interviewer." },
    { name: "Technical Discussion", description: "A conversation-style technical interview without live coding — system design, statistics/ML concepts, lab methods, or engineering fundamentals depending on the role." },
    { name: "Project Walkthrough", description: "You present and defend a project from your resume, coursework, research, or portfolio. Common for research, data, and engineering roles." },
    { name: "Case / Problem-Solving Interview", description: "Common for technical product and some analytics roles — a business or product scenario you reason through out loud. Not every STEM role includes this." },
    { name: "Hiring Manager Interview", description: "Usually later in the process. The person who would actually manage you asks about how you work, what you're looking for, and team fit specifically." },
    { name: "Panel / Final Interview", description: "One or more rounds with several interviewers (sometimes together, sometimes back-to-back), often the last step before a decision." },
    { name: "Follow-Up", description: "After the final round: reference checks, an offer conversation, or simply a wait while the team decides. Timelines vary widely." },
  ];

  const STAR_GUIDANCE = {
    situation: [
      "Where did this happen — a class, job, internship, research lab, or club?",
      "What context does the interviewer actually need to understand what comes next?",
      "Keep the setup concise — a sentence or two, not a scene-setting story.",
      "Skip backstory that doesn't change how the interviewer understands your action.",
    ],
    task: [
      "What was YOUR responsibility, specifically — not the team's, yours?",
      "What problem or goal existed that made this worth talking about?",
      "If you were assigned the task, say so; if you took it on yourself, say that too.",
    ],
    action: [
      "What did you actually do, step by step?",
      "What choices did you make, and why did you make them?",
      "How did you communicate with teammates, a manager, or stakeholders along the way?",
      "What tools, methods, or reasoning did you use to solve the problem?",
      "This is usually the longest part of your answer — it's the part that's actually about you.",
    ],
    result: [
      "What happened because of what you did?",
      "What changed — a number, a deadline hit, a bug fixed, a process adopted by others?",
      "What did you learn, or what would you do differently next time?",
      "If you don't have a hard metric, a clear, honest outcome is still a result.",
    ],
  };

  const STAR_WHY_IT_WORKS = [
    "Interviewers ask behavioral questions because past behavior is a reasonable predictor of how you'll act on their team — they're not looking for a perfect story, they're looking for evidence.",
    "STAR gives your answer a clear beginning, middle, and end, so you don't rehearse-ramble through a memory and lose the interviewer halfway through.",
    "It also stops you from over-explaining context (Situation) at the expense of the part that actually matters (Action).",
    "Say \"I\" when you describe what you personally did, even inside a team project — \"we shipped it\" tells an interviewer nothing about your contribution. It's fine, and often better, to also say what the team did (\"the team decided X, and I specifically owned Y\").",
    "Aim for roughly 60-90 seconds spoken (a few sentences per letter, more for Action) — long enough to be specific, short enough that you don't lose the thread.",
    "The same structure works for a software bug, a data-analysis project, a lab experiment, a group presentation, or a research paper — STAR describes how you tell the story, not what kind of story it has to be.",
  ];

  const STAR_MISTAKES = [
    "Spending too long on Situation and running out of room for Action and Result.",
    "Never explaining your personal contribution — describing only what \"the team\" did.",
    "Saying \"we\" for everything without ever clarifying what specifically you did.",
    "Giving vague actions (\"I worked hard on it\") instead of specific steps.",
    "Forgetting to state a Result at all.",
    "Making up metrics that sound impressive but aren't true.",
    "Blaming teammates, a manager, or \"bad luck\" for what went wrong.",
    "Turning the answer into a technical deep-dive lecture instead of a story about your judgment and actions.",
    "Reusing the exact same story for every question, even when it doesn't fit.",
    "Answering a different (usually easier, more rehearsed) question than the one actually asked.",
  ];

  const STAR_EXAMPLE = {
    label: "Hypothetical example — not a real person's story",
    situation: "A student team's software application had a critical bug appear during final rehearsal, two days before a public demo.",
    task: "As the team member who had written the module that crashed, it was my job to find the cause and fix it without breaking anything else before the demo.",
    action: "I reproduced the crash, added logging to narrow down where it failed, found a null-value edge case we hadn't tested, and wrote a fix along with two new test cases so the same bug couldn't silently return. I also messaged the team immediately so no one wasted time investigating something I was already fixing.",
    result: "The demo ran without issues, the two new tests are still in the project's test suite, and I learned to add null/empty-input tests as a habit rather than an afterthought.",
  };

  const SITUATIONAL_FRAMEWORK = [
    "Clarify the situation — what's actually happening, and what don't you know yet?",
    "Determine priorities and constraints — what actually needs to happen first, and by when?",
    "Gather relevant information before acting on assumptions.",
    "Communicate with the right people — the ones affected or who can help.",
    "Take proportionate action — don't escalate a small issue or sit on a serious one.",
    "Escalate when necessary — especially for safety, security, legal, compliance, or ethical concerns, where waiting can make things worse.",
    "Verify the outcome — did the action actually solve the problem?",
    "Document or share what you learned when it would help someone else avoid the same issue.",
  ];

  const TMAY = {
    present: {
      label: "Present",
      prompt: "Who are you right now?",
      examples: ["A student in your final year", "A recent graduate", "Someone currently in a related role", "Your field of study and what drew you to it"],
    },
    past: {
      label: "Past",
      prompt: "What 1-2 relevant experiences led you here?",
      examples: ["A class project", "An internship", "A research position", "A hackathon", "A leadership role", "A technical project you built"],
    },
    future: {
      label: "Future",
      prompt: "Why does this opportunity make sense as your next step?",
      examples: ["What you want to grow into", "Why this type of role specifically", "What you're looking for next and why this fits"],
    },
    avoid: [
      "Reciting your entire resume line by line.",
      "Telling your life story from childhood onward.",
      "Sharing personal history that isn't relevant to the role.",
      "Talking for several minutes straight — 60-90 seconds is plenty.",
      "Giving a generic answer that could apply to any job at any company.",
    ],
    lengthGuidance: "About 60-90 seconds spoken (roughly 3-5 sentences: one on Present, one or two on Past, one on Future). Practice saying it out loud, not just reading it.",
  };

  const TECHNICAL_PREP = {
    roleNotes: [
      { role: "Software Engineering", note: "Expect data structures, algorithms, and a live or take-home coding exercise. Communication while coding matters as much as the final answer." },
      { role: "Data Science", note: "Expect statistics fundamentals, SQL, a coding exercise (often Python/pandas-flavored), and questions about how you'd validate a model or result." },
      { role: "Engineering (non-software)", note: "Expect project/design walkthroughs, fundamentals from your discipline, and problem-solving questions grounded in real constraints (cost, safety, manufacturability)." },
      { role: "Research", note: "Expect a deep walkthrough of your own research or thesis work, methodology questions, and how you handle ambiguous or inconclusive results." },
      { role: "Technical Product", note: "Expect case-style or prioritization questions, some technical fluency checks (you don't need to code, but need to reason about tradeoffs), and communication with both technical and non-technical audiences." },
    ],
    fundamentals: [
      "Variables", "Primitive/basic data types", "Strings", "Arrays / lists", "Conditionals", "Loops",
      "Functions, parameters, and return values", "Scope", "Classes and objects (OOP basics, where relevant)",
      "Recursion", "Exceptions / error handling", "Debugging strategy",
    ],
    dataStructures: [
      { name: "Array", whatItIs: "A fixed-order, indexable list of values.", goodFor: "Fast lookup by position; simple, predictable storage.", operations: "Read by index: fast. Insert/remove in the middle: slow (shifts everything after it)." },
      { name: "String", whatItIs: "Text, usually treated as a sequence of characters.", goodFor: "Representing and manipulating text.", operations: "Most languages treat strings as immutable — building one char-by-char in a loop can be slow at scale." },
      { name: "Linked List", whatItIs: "A chain of nodes, each pointing to the next.", goodFor: "Fast insert/remove at a known position without shifting other elements.", operations: "No fast lookup by index — you have to walk the chain." },
      { name: "Stack", whatItIs: "Last-in, first-out (LIFO) — like a stack of plates.", goodFor: "Undo history, function-call tracking, matching brackets/parentheses.", operations: "Push and pop from the top only." },
      { name: "Queue", whatItIs: "First-in, first-out (FIFO) — like a line at a store.", goodFor: "Task scheduling, breadth-first traversal.", operations: "Enqueue at the back, dequeue from the front." },
      { name: "Hash Map / Dictionary", whatItIs: "Key-value pairs with fast lookup by key.", goodFor: "Counting things, deduplication, fast \"have I seen this before?\" checks.", operations: "Average-case constant-time lookup, insert, and delete." },
      { name: "Set", whatItIs: "A collection of unique values, no duplicates, usually unordered.", goodFor: "Membership checks and removing duplicates.", operations: "Average-case constant-time \"is this in the set?\" checks." },
      { name: "Tree", whatItIs: "A hierarchical structure of nodes with parent/child relationships.", goodFor: "Representing hierarchy — file systems, org charts, UI trees.", operations: "Traversal (visiting every node) is the core operation interviewers ask about." },
      { name: "Binary Search Tree", whatItIs: "A tree where each node's left subtree is smaller and right subtree is larger.", goodFor: "Keeping sorted data while still supporting fast search, insert, and delete.", operations: "Search/insert/delete are fast when the tree stays balanced." },
      { name: "Graph", whatItIs: "Nodes connected by edges, which may be directed or weighted.", goodFor: "Networks, dependencies, maps, relationships between things.", operations: "Traversal (BFS/DFS) and reachability are the core operations." },
      { name: "Heap / Priority Queue", whatItIs: "A tree-shaped structure that always keeps the smallest (or largest) item quickly accessible.", goodFor: "Always processing the \"next most important\" item — scheduling, top-K problems.", operations: "Fast access to the min/max; insert and remove-min are efficient." },
    ],
    algorithms: [
      { name: "Iteration", note: "Looping over a collection — the basis for most simple algorithms." },
      { name: "Sorting", note: "Putting data in order; know that built-in sorts exist and roughly how they perform." },
      { name: "Searching", note: "Finding a value in a collection — linear scan vs. faster structured search." },
      { name: "Binary Search", note: "Repeatedly halving a sorted search range — requires sorted input." },
      { name: "Two Pointers", note: "Walking two positions through a sequence at once, often from both ends inward." },
      { name: "Sliding Window (intro level)", note: "Tracking a running range of elements instead of recomputing from scratch each time." },
      { name: "Hashing / Frequency Maps", note: "Using a hash map to count or look up items in roughly constant time." },
      { name: "Tree Traversal", note: "Visiting every node — pre-order, in-order, post-order, or level-order." },
      { name: "Graph Traversal", note: "Visiting every reachable node in a graph, tracking what's already been seen." },
      { name: "BFS (Breadth-First Search)", note: "Explore level by level, outward from a starting point — good for shortest paths in unweighted graphs." },
      { name: "DFS (Depth-First Search)", note: "Explore as far as possible down one path before backtracking." },
      { name: "Recursion", note: "A function that calls itself on a smaller version of the same problem." },
      { name: "Backtracking", note: "Trying a choice, undoing it if it doesn't work, and trying the next one." },
      { name: "Basic Dynamic Programming", note: "Breaking a problem into overlapping subproblems and reusing already-computed answers." },
      { name: "Greedy Strategies (intro level)", note: "Making the locally best choice at each step and hoping (with justification) it leads to a good overall answer." },
    ],
    complexity: [
      { notation: "O(1)", meaning: "Constant time — same speed no matter the input size.", example: "Looking up a value by key in a hash map." },
      { notation: "O(log n)", meaning: "Time grows very slowly as input grows.", example: "Binary search on a sorted array." },
      { notation: "O(n)", meaning: "Time grows directly with input size.", example: "Scanning every element of an array once." },
      { notation: "O(n log n)", meaning: "Slightly worse than linear — common for efficient sorting.", example: "Merge sort or quicksort on average." },
      { notation: "O(n²)", meaning: "Time grows with the square of the input — gets slow fast on large inputs.", example: "Comparing every pair of elements with nested loops." },
    ],
    workflow: [
      "Read or listen to the complete question before reacting.",
      "Restate the problem in your own words.",
      "Ask clarifying questions.",
      "Confirm input and output expectations.",
      "Identify constraints (input size, time limits, data types).",
      "Walk through a simple example by hand.",
      "Discuss an initial approach out loud before writing code.",
      "Improve the approach if a better one exists.",
      "Explain why you chose the data structure(s) you're using.",
      "State the time and space complexity of your approach.",
      "Write clean, readable code.",
      "Test it manually against your example.",
      "Check edge cases.",
      "If you find a mistake, correct it calmly — don't panic or apologize repeatedly.",
      "Summarize the final solution and its complexity.",
    ],
    edgeCases: [
      "Empty input", "Null or undefined values (where relevant)", "A single element", "Duplicate values",
      "Negative values", "Zero", "Already-sorted input", "Reverse-sorted input", "Repeated/identical values",
      "Very large input", "Invalid input (where relevant)", "Off-by-one boundaries",
    ],
  };

  const INTERVIEWER_QUESTIONS = {
    guidance: "Don't ask questions just to fill time. Prefer ones whose answers actually matter to your decision, show genuine interest, and aren't trivially available on the company's homepage.",
    groups: [
      { key: "role", label: "About the Role", questions: [
        "What would success look like in the first 90 days?",
        "What projects would I likely work on first?",
        "What are the biggest challenges someone in this position faces?",
        "What distinguishes excellent performers in this role?",
        "How is performance evaluated?",
      ]},
      { key: "team", label: "About the Team", questions: [
        "How does the team typically collaborate day to day?",
        "How are technical decisions made?",
        "How does the team handle code or design reviews?",
        "How does this team interact with other teams?",
        "What does onboarding look like?",
      ]},
      { key: "growth", label: "Growth", questions: [
        "How do interns or new hires typically receive feedback?",
        "What mentorship opportunities exist?",
        "How do people develop new technical skills here?",
        "What career paths have people in this role taken?",
      ]},
      { key: "direction", label: "Product / Company / Technical Direction", questions: [
        "What are the team's biggest technical challenges right now?",
        "What's the team's most important priority this year?",
        "What changes do you expect over the next year?",
        "How does this role contribute to the broader organization?",
      ]},
      { key: "perspective", label: "Interviewer Perspective", questions: [
        "What do you enjoy most about working here?",
        "What surprised you after joining?",
        "What's kept you at the company?",
      ]},
    ],
  };

  const SELF_REVIEW = {
    behavioral: [
      "I answered the actual question that was asked.",
      "I gave enough context without overexplaining the Situation.",
      "I clearly explained my personal contribution.",
      "I described specific actions, not vague generalities.",
      "I explained the outcome or result.",
      "I used truthful metrics where appropriate — nothing made up.",
      "I avoided blaming other people.",
      "I kept the answer organized (roughly Situation → Task → Action → Result).",
      "I explained what I learned when it was relevant.",
      "My answer was concise enough for an interview (not several minutes long).",
      "I sounded confident and professional.",
    ],
    technical: [
      "I clarified the problem before jumping in.",
      "I stated my assumptions out loud.",
      "I walked through a simple example.",
      "I explained my approach before writing code.",
      "I chose (and could justify) an appropriate data structure.",
      "I considered edge cases.",
      "I discussed time complexity.",
      "I discussed space complexity.",
      "I tested my solution against an example.",
      "I communicated while solving, instead of going silent.",
      "I responded calmly to my own mistakes.",
    ],
  };

  const CHECKLIST_BEFORE = [
    "Research the company", "Understand what the company/product does", "Review the job description",
    "Identify the most important qualifications", "Review your resume", "Review projects listed on your resume",
    "Prepare 5-8 adaptable STAR stories", "Practice “Tell Me About Yourself”",
    "Review relevant technical fundamentals", "Practice coding / problem solving if the role needs it",
    "Prepare questions to ask the interviewer", "Confirm the interview date and time", "Confirm the time zone",
    "Confirm the meeting link or location", "Test your camera", "Test your microphone", "Test your internet connection",
    "Charge your laptop", "Prepare a quiet environment", "Have your resume accessible", "Have notes available", "Join a few minutes early",
  ];

  const CHECKLIST_DURING = [
    "Listen to the full question before answering", "Ask for clarification if something is ambiguous",
    "Take a moment to think before responding", "Organize behavioral responses (roughly STAR)",
    "Communicate your reasoning out loud for technical questions", "Ask questions when an assumption actually matters",
    "Stay concise", "Be truthful", "Show curiosity about the team and the work", "Take notes where appropriate",
    "Ask thoughtful questions at the end",
  ];

  const CHECKLIST_AFTER = [
    "Write down the questions you were actually asked, while they're fresh",
    "Record what went well", "Identify weak answers to improve", "Review any technical gaps you noticed",
    "Improve your STAR stories based on what came up", "Send a thank-you or follow-up message when appropriate",
    "Record important next-step dates", "Keep practicing for the next round",
  ];

  // ---------- Question bank ----------
  // category: "behavioral" | "situational" | "technical"
  // difficulty: "introductory" | "intermediate" | "advanced"
  const QUESTIONS = [
    // ===== BEHAVIORAL — General =====
    { id: "beh-tell-me-about-yourself", category: "behavioral", subcategory: "General", question: "Tell me about yourself.", difficulty: "introductory", evaluates: ["Communication", "Self-awareness"], tip: "Use the Present → Past → Future framework from the “Tell Me About Yourself” guide, not your full resume.", starRecommended: false, tags: ["intro", "background"] },
    { id: "beh-walk-through-background", category: "behavioral", subcategory: "General", question: "Walk me through your background.", difficulty: "introductory", evaluates: ["Communication", "Relevance"], tip: "Focus on the experiences most relevant to this role, in a few sentences each, not everything you've ever done.", starRecommended: false, tags: ["intro", "background"] },
    { id: "beh-why-this-role", category: "behavioral", subcategory: "General", question: "Why are you interested in this role?", difficulty: "introductory", evaluates: ["Motivation", "Fit"], tip: "Connect something specific about the role to something specific about you — avoid a generic answer that could fit any job.", starRecommended: false, tags: ["motivation"] },
    { id: "beh-why-this-company", category: "behavioral", subcategory: "General", question: "Why this company?", difficulty: "introductory", evaluates: ["Motivation", "Research"], tip: "Reference something real about the company's work or mission — this is where a little research goes a long way.", starRecommended: false, tags: ["motivation", "research"] },
    { id: "beh-why-this-field", category: "behavioral", subcategory: "General", question: "Why did you choose your field?", difficulty: "introductory", evaluates: ["Motivation", "Self-awareness"], tip: "A specific moment or project that pulled you toward this field is more convincing than a general statement of interest.", starRecommended: false, tags: ["motivation"] },
    { id: "beh-career-goals", category: "behavioral", subcategory: "General", question: "What are your career goals?", difficulty: "introductory", evaluates: ["Motivation", "Fit"], tip: "Keep it honest and reasonably near-term — a vague 10-year plan is less convincing than a clear next step.", starRecommended: false, tags: ["motivation", "goals"] },
    // ===== BEHAVIORAL — Strengths / Development =====
    { id: "beh-greatest-strength", category: "behavioral", subcategory: "Strengths & Growth", question: "What is your greatest strength?", difficulty: "introductory", evaluates: ["Self-awareness"], tip: "Pick a strength relevant to this role and back it with one concrete example.", starRecommended: true, tags: ["self-awareness"] },
    { id: "beh-area-improving", category: "behavioral", subcategory: "Strengths & Growth", question: "What is an area you are working to improve?", difficulty: "introductory", evaluates: ["Self-awareness", "Growth mindset"], tip: "Pick something real and show what you're actively doing about it — not a disguised strength.", starRecommended: true, tags: ["self-awareness", "growth"] },
    { id: "beh-learn-quickly", category: "behavioral", subcategory: "Strengths & Growth", question: "Tell me about something you had to learn quickly.", difficulty: "intermediate", evaluates: ["Adaptability", "Learning ability"], tip: "Describe how you learned it, not just that you learned it — that's the part that shows adaptability.", starRecommended: true, tags: ["learning", "adaptability"] },
    { id: "beh-sought-feedback", category: "behavioral", subcategory: "Strengths & Growth", question: "Tell me about a time you sought feedback.", difficulty: "intermediate", evaluates: ["Growth mindset", "Initiative"], tip: "Show that you asked before being told, and what you changed as a result.", starRecommended: true, tags: ["feedback", "growth"] },
    { id: "beh-difficult-feedback", category: "behavioral", subcategory: "Strengths & Growth", question: "Tell me about a time you received difficult feedback.", difficulty: "intermediate", evaluates: ["Maturity", "Growth mindset"], tip: "Focus on how you responded and what changed, not on defending yourself.", starRecommended: true, tags: ["feedback", "maturity"] },
    // ===== BEHAVIORAL — Teamwork =====
    { id: "beh-successful-team", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a successful team experience.", difficulty: "introductory", evaluates: ["Collaboration"], tip: "Be specific about what you contributed, not just that the team succeeded.", starRecommended: true, tags: ["teamwork"] },
    { id: "beh-difficult-teammate", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a difficult teammate.", difficulty: "intermediate", evaluates: ["Collaboration", "Professionalism"], tip: "Describe the behavior and how you handled it professionally — avoid trashing the person.", starRecommended: true, tags: ["teamwork", "conflict"] },
    { id: "beh-disagreement-team", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a disagreement within a team.", difficulty: "intermediate", evaluates: ["Communication", "Conflict resolution"], tip: "Focus on how you handled the disagreement professionally and moved the work forward.", starRecommended: true, tags: ["teamwork", "conflict"] },
    { id: "beh-time-you-compromised", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a time you had to compromise.", difficulty: "intermediate", evaluates: ["Collaboration", "Flexibility"], tip: "Show what you gave up and why it was the right call for the team's goal.", starRecommended: true, tags: ["teamwork", "compromise"] },
    { id: "beh-helped-a-teammate", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a time you helped a teammate.", difficulty: "introductory", evaluates: ["Collaboration", "Generosity"], tip: "A small, concrete example of helping unblock someone is more convincing than a vague claim.", starRecommended: true, tags: ["teamwork"] },
    // ===== BEHAVIORAL — Leadership / Initiative =====
    { id: "beh-led-a-project", category: "behavioral", subcategory: "Leadership & Initiative", question: "Tell me about a time you led a project.", difficulty: "intermediate", evaluates: ["Leadership", "Organization"], tip: "You don't need a formal title to describe leading — coordinating a group project counts.", starRecommended: true, tags: ["leadership"] },
    { id: "beh-took-initiative", category: "behavioral", subcategory: "Leadership & Initiative", question: "Tell me about a time you took initiative.", difficulty: "intermediate", evaluates: ["Initiative", "Ownership"], tip: "Describe what you did without being asked, and why it mattered.", starRecommended: true, tags: ["initiative"] },
    { id: "beh-influenced-without-authority", category: "behavioral", subcategory: "Leadership & Initiative", question: "Tell me about a time you influenced others without authority.", difficulty: "advanced", evaluates: ["Influence", "Communication"], tip: "Focus on how you persuaded people — evidence, framing, or building trust — not just that they agreed.", starRecommended: true, tags: ["leadership", "influence"] },
    { id: "beh-improved-a-process", category: "behavioral", subcategory: "Leadership & Initiative", question: "Tell me about a time you improved an existing process.", difficulty: "intermediate", evaluates: ["Initiative", "Problem solving"], tip: "Name the specific inefficiency you noticed and the specific change you made.", starRecommended: true, tags: ["initiative", "process"] },
    { id: "beh-identified-missed-problem", category: "behavioral", subcategory: "Leadership & Initiative", question: "Tell me about a time you identified a problem others had missed.", difficulty: "advanced", evaluates: ["Attention to detail", "Initiative"], tip: "Explain what tipped you off, since that's often more interesting than the fix itself.", starRecommended: true, tags: ["initiative", "attention-to-detail"] },
    // ===== BEHAVIORAL — Problem Solving =====
    { id: "beh-difficult-problem-solved", category: "behavioral", subcategory: "Problem Solving", question: "Tell me about a difficult problem you solved.", difficulty: "intermediate", evaluates: ["Problem solving", "Persistence"], tip: "Walk through your reasoning process, not just the final fix.", starRecommended: true, tags: ["problem-solving"] },
    { id: "beh-first-approach-failed", category: "behavioral", subcategory: "Problem Solving", question: "Tell me about a time your first approach failed.", difficulty: "intermediate", evaluates: ["Resilience", "Problem solving"], tip: "Show what told you the first approach wasn't working and how you pivoted.", starRecommended: true, tags: ["problem-solving", "resilience"] },
    { id: "beh-decision-incomplete-info", category: "behavioral", subcategory: "Problem Solving", question: "Tell me about a time you made a decision with incomplete information.", difficulty: "advanced", evaluates: ["Judgment", "Decision-making"], tip: "Explain what you did know, how you weighed the risk, and why you moved forward anyway.", starRecommended: true, tags: ["decision-making", "ambiguity"] },
    { id: "beh-worked-through-ambiguity", category: "behavioral", subcategory: "Problem Solving", question: "Tell me about a time you worked through ambiguity.", difficulty: "advanced", evaluates: ["Judgment", "Adaptability"], tip: "Describe how you narrowed down what was actually being asked, not just that it was unclear.", starRecommended: true, tags: ["ambiguity"] },
    // ===== BEHAVIORAL — Failure / Resilience =====
    { id: "beh-a-failure", category: "behavioral", subcategory: "Failure & Resilience", question: "Tell me about a failure.", difficulty: "intermediate", evaluates: ["Honesty", "Resilience"], tip: "Pick a real failure with a real lesson — not a humblebrag disguised as a failure.", starRecommended: true, tags: ["failure", "resilience"] },
    { id: "beh-a-mistake", category: "behavioral", subcategory: "Failure & Resilience", question: "Tell me about a mistake.", difficulty: "intermediate", evaluates: ["Ownership", "Honesty"], tip: "Own the mistake plainly, then focus on what you did to fix or prevent it.", starRecommended: true, tags: ["ownership", "mistake"] },
    { id: "beh-a-setback", category: "behavioral", subcategory: "Failure & Resilience", question: "Tell me about a setback.", difficulty: "intermediate", evaluates: ["Resilience"], tip: "Show how you kept moving after the setback, not just that it happened.", starRecommended: true, tags: ["resilience"] },
    { id: "beh-missed-a-goal", category: "behavioral", subcategory: "Failure & Resilience", question: "Tell me about a time you missed a goal.", difficulty: "intermediate", evaluates: ["Accountability", "Resilience"], tip: "Be honest about why you missed it, and what changed afterward.", starRecommended: true, tags: ["resilience", "accountability"] },
    { id: "beh-stressful-situation", category: "behavioral", subcategory: "Failure & Resilience", question: "Tell me about a stressful situation.", difficulty: "intermediate", evaluates: ["Composure", "Resilience"], tip: "Focus on how you managed the stress and kept functioning, not just how stressful it was.", starRecommended: true, tags: ["resilience", "stress"] },
    // ===== BEHAVIORAL — Organization =====
    { id: "beh-multiple-deadlines", category: "behavioral", subcategory: "Organization", question: "Tell me about a time you managed multiple deadlines.", difficulty: "intermediate", evaluates: ["Time management", "Prioritization"], tip: "Explain how you decided what came first, not just that you juggled everything.", starRecommended: true, tags: ["organization", "prioritization"] },
    { id: "beh-priorities-changed", category: "behavioral", subcategory: "Organization", question: "Tell me about a time priorities changed suddenly.", difficulty: "intermediate", evaluates: ["Adaptability", "Prioritization"], tip: "Show how quickly you re-prioritized and what you communicated to others about the change.", starRecommended: true, tags: ["adaptability", "prioritization"] },
    { id: "beh-limited-resources", category: "behavioral", subcategory: "Organization", question: "Tell me about a time you had limited time or resources.", difficulty: "intermediate", evaluates: ["Resourcefulness"], tip: "Focus on the tradeoffs you made, not just that resources were tight.", starRecommended: true, tags: ["resourcefulness"] },
    // ===== BEHAVIORAL — Communication =====
    { id: "beh-explained-technical-nontechnical", category: "behavioral", subcategory: "Communication", question: "Tell me about a time you explained something technical to a nontechnical audience.", difficulty: "intermediate", evaluates: ["Communication"], tip: "Describe how you adjusted your language, not just that you “explained it simply.”", starRecommended: true, tags: ["communication"] },
    { id: "beh-communication-misunderstanding", category: "behavioral", subcategory: "Communication", question: "Tell me about a communication misunderstanding.", difficulty: "intermediate", evaluates: ["Communication", "Self-awareness"], tip: "Own your part in the misunderstanding and explain what you changed to fix it.", starRecommended: true, tags: ["communication"] },
    { id: "beh-persuaded-someone", category: "behavioral", subcategory: "Communication", question: "Tell me about a time you persuaded someone.", difficulty: "intermediate", evaluates: ["Influence", "Communication"], tip: "Explain the evidence or reasoning you used, not just that you were persistent.", starRecommended: true, tags: ["communication", "influence"] },
    // ===== BEHAVIORAL — Projects / STEM =====
    { id: "beh-project-proud-of", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about a project you are proud of.", difficulty: "introductory", evaluates: ["Technical ability", "Ownership"], tip: "Explain your specific role clearly if it was a team project.", starRecommended: true, tags: ["project", "stem"] },
    { id: "beh-most-technically-challenging", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about your most technically challenging project.", difficulty: "advanced", evaluates: ["Technical depth", "Problem solving"], tip: "Be ready to go deep if asked follow-up questions — this one often gets probed further.", starRecommended: true, tags: ["project", "technical"] },
    { id: "beh-technical-decision", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about a technical decision you made.", difficulty: "advanced", evaluates: ["Judgment", "Technical reasoning"], tip: "Explain the alternatives you considered and why you picked what you picked.", starRecommended: true, tags: ["technical", "decision-making"] },
    { id: "beh-debugged-difficult-issue", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about a time you debugged a difficult issue.", difficulty: "advanced", evaluates: ["Debugging", "Persistence"], tip: "Walk through your debugging process step by step, not just the eventual root cause.", starRecommended: true, tags: ["debugging", "technical"] },
    { id: "beh-learned-new-tool", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about a time you learned a new tool or technology.", difficulty: "intermediate", evaluates: ["Learning ability"], tip: "Describe how you got up to speed — docs, trial and error, asking someone — not just that you learned it.", starRecommended: true, tags: ["learning", "technical"] },
    { id: "beh-improved-quality", category: "behavioral", subcategory: "Projects & STEM", question: "Tell me about a time you improved the quality of a technical solution.", difficulty: "advanced", evaluates: ["Technical judgment", "Initiative"], tip: "Be specific about what “better” meant — faster, more reliable, more readable, fewer bugs.", starRecommended: true, tags: ["technical", "quality"] },
    // ===== BEHAVIORAL — Ethics / Ownership =====
    { id: "beh-raised-a-concern", category: "behavioral", subcategory: "Ethics & Ownership", question: "Tell me about a time you raised a concern.", difficulty: "advanced", evaluates: ["Integrity", "Communication"], tip: "Describe how you raised it professionally and what happened as a result.", starRecommended: true, tags: ["ethics", "ownership"] },
    { id: "beh-responsibility-for-error", category: "behavioral", subcategory: "Ethics & Ownership", question: "Tell me about a time you took responsibility for an error.", difficulty: "intermediate", evaluates: ["Ownership", "Integrity"], tip: "State the error plainly and focus on the fix, not on excuses.", starRecommended: true, tags: ["ownership", "ethics"] },
    { id: "beh-right-thing-inconvenient", category: "behavioral", subcategory: "Ethics & Ownership", question: "Tell me about a time doing the right thing was inconvenient.", difficulty: "advanced", evaluates: ["Integrity"], tip: "Be honest about the cost of doing it, not just that you did it.", starRecommended: true, tags: ["ethics"] },

    // ===== SITUATIONAL — Team & Communication =====
    { id: "sit-disagree-with-manager", category: "situational", subcategory: "Team & Communication", question: "What would you do if you disagreed with your manager?", difficulty: "intermediate", evaluates: ["Communication", "Professionalism"], tip: "Raise the disagreement respectfully and privately, with reasoning — then support the final call.", starRecommended: true, tags: ["conflict", "manager"] },
    { id: "sit-teammate-stopped-contributing", category: "situational", subcategory: "Team & Communication", question: "What would you do if a teammate stopped contributing?", difficulty: "intermediate", evaluates: ["Collaboration", "Communication"], tip: "Talk to the teammate directly first before escalating, unless it's already hurting the deadline.", starRecommended: true, tags: ["teamwork"] },
    { id: "sit-stakeholders-contradictory", category: "situational", subcategory: "Team & Communication", question: "What if stakeholders wanted contradictory things?", difficulty: "advanced", evaluates: ["Communication", "Prioritization"], tip: "Surface the contradiction explicitly and ask who has final say, rather than guessing.", starRecommended: true, tags: ["stakeholders"] },
    { id: "sit-unresponsive-teammate", category: "situational", subcategory: "Team & Communication", question: "What if you needed information from an unresponsive teammate?", difficulty: "intermediate", evaluates: ["Initiative", "Communication"], tip: "Try more than one channel, then loop in someone else if the deadline is at risk.", starRecommended: true, tags: ["teamwork", "communication"] },
    { id: "sit-manager-vague-instructions", category: "situational", subcategory: "Team & Communication", question: "What if your manager gave you vague instructions?", difficulty: "intermediate", evaluates: ["Clarifying questions", "Initiative"], tip: "Ask targeted clarifying questions rather than guessing or stalling.", starRecommended: true, tags: ["manager", "ambiguity"] },
    { id: "sit-disagree-technical-design", category: "situational", subcategory: "Team & Communication", question: "What if you disagreed with a technical design?", difficulty: "advanced", evaluates: ["Technical judgment", "Communication"], tip: "Bring specific reasoning or evidence, not just a preference.", starRecommended: true, tags: ["technical", "conflict"] },
    { id: "sit-explain-delay-nontechnical", category: "situational", subcategory: "Team & Communication", question: "What if you had to explain a delay to a nontechnical stakeholder?", difficulty: "intermediate", evaluates: ["Communication"], tip: "Explain impact and next steps in plain language, not jargon.", starRecommended: true, tags: ["communication", "stakeholders"] },
    { id: "sit-conflicting-feedback", category: "situational", subcategory: "Team & Communication", question: "What if you received conflicting feedback from two people you report to?", difficulty: "advanced", evaluates: ["Communication", "Judgment"], tip: "Name the conflict to both parties and ask them to align, rather than picking a side silently.", starRecommended: true, tags: ["communication", "conflict"] },
    { id: "sit-present-no-notice", category: "situational", subcategory: "Team & Communication", question: "What if you were asked to present technical work to a nontechnical audience with almost no notice?", difficulty: "intermediate", evaluates: ["Communication", "Adaptability"], tip: "Lead with the outcome and impact first, details only if asked.", starRecommended: true, tags: ["communication"] },
    // ===== SITUATIONAL — Deadlines & Prioritization =====
    { id: "sit-cannot-meet-deadline", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if you could not meet a deadline?", difficulty: "intermediate", evaluates: ["Communication", "Ownership"], tip: "Flag it as early as possible, with a plan or options — not at the deadline itself.", starRecommended: true, tags: ["deadlines"] },
    { id: "sit-requirements-changed-late", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if requirements changed late in the project?", difficulty: "intermediate", evaluates: ["Adaptability", "Communication"], tip: "Assess real impact on scope/timeline and communicate it clearly instead of just absorbing it silently.", starRecommended: true, tags: ["ambiguity", "deadlines"] },
    { id: "sit-several-urgent-tasks", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if you had several urgent tasks simultaneously?", difficulty: "intermediate", evaluates: ["Prioritization"], tip: "Clarify true urgency/impact with whoever assigned them rather than guessing at priority.", starRecommended: true, tags: ["prioritization"] },
    { id: "sit-wrong-estimate", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if you realized an estimate you gave was wrong?", difficulty: "intermediate", evaluates: ["Honesty", "Communication"], tip: "Flag the revised estimate immediately, with the reason, rather than hoping to make it up silently.", starRecommended: true, tags: ["estimation", "honesty"] },
    { id: "sit-impossible-within-deadline", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if a stakeholder asked for something technically impossible within the deadline?", difficulty: "advanced", evaluates: ["Technical judgment", "Communication"], tip: "Explain the constraint clearly and offer alternatives (reduced scope, more time, more resources).", starRecommended: true, tags: ["deadlines", "technical"] },
    { id: "sit-two-bugs-one-fix", category: "situational", subcategory: "Deadlines & Prioritization", question: "What if two bugs appeared and you could only fix one before launch?", difficulty: "advanced", evaluates: ["Prioritization", "Risk assessment"], tip: "Prioritize by user impact and severity, and communicate the tradeoff to the team.", starRecommended: true, tags: ["prioritization", "risk"] },
    // ===== SITUATIONAL — Quality, Ethics & Risk =====
    { id: "sit-production-issue-before-launch", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if a production issue happened immediately before launch?", difficulty: "advanced", evaluates: ["Composure", "Prioritization"], tip: "Assess severity first — decide whether to delay, patch, or ship with a known issue and a plan.", starRecommended: true, tags: ["risk", "production"] },
    { id: "sit-code-review-challenged", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if code review feedback strongly challenged your solution?", difficulty: "intermediate", evaluates: ["Openness", "Technical judgment"], tip: "Engage with the reasoning, not the ego — ask questions before defending your original approach.", starRecommended: true, tags: ["code-review", "feedback"] },
    { id: "sit-error-after-submitting", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if you found an error after submitting your work?", difficulty: "intermediate", evaluates: ["Honesty", "Ownership"], tip: "Report it immediately rather than hoping no one notices.", starRecommended: true, tags: ["ownership", "honesty"] },
    { id: "sit-believed-action-unethical", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if you believed a proposed action was unethical?", difficulty: "advanced", evaluates: ["Integrity"], tip: "Voice the concern clearly through the right channel — this is a case where escalating quickly is appropriate.", starRecommended: true, tags: ["ethics"] },
    { id: "sit-solution-created-maintenance-problems", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if your solution worked but created maintenance problems?", difficulty: "advanced", evaluates: ["Technical judgment", "Long-term thinking"], tip: "Flag the tradeoff honestly rather than presenting a quick fix as a finished solution.", starRecommended: true, tags: ["technical", "quality"] },
    { id: "sit-sensitive-data-mishandled", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if you discovered sensitive data was being handled incorrectly?", difficulty: "advanced", evaluates: ["Integrity", "Escalation judgment"], tip: "This is a case for fast escalation — security and privacy issues shouldn't wait.", starRecommended: true, tags: ["security", "ethics"] },
    { id: "sit-teammate-ship-without-testing", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if a teammate wanted to ship without enough testing?", difficulty: "intermediate", evaluates: ["Quality judgment", "Communication"], tip: "State the specific risk you're worried about, not just “we should test more.”", starRecommended: true, tags: ["quality", "testing"] },
    { id: "sit-security-vulnerability-before-release", category: "situational", subcategory: "Quality, Ethics & Risk", question: "What if you spotted a security vulnerability right before a release?", difficulty: "advanced", evaluates: ["Risk assessment", "Escalation judgment"], tip: "Raise it immediately and be ready to explain the actual risk, not just that something “feels unsafe.”", starRecommended: true, tags: ["security", "risk"] },
    // ===== SITUATIONAL — Ambiguity & Unfamiliar Territory =====
    { id: "sit-requirements-unclear", category: "situational", subcategory: "Ambiguity & Unfamiliar Territory", question: "What if requirements were unclear?", difficulty: "intermediate", evaluates: ["Clarifying questions", "Initiative"], tip: "Ask specific questions or propose an interpretation and confirm it, rather than guessing silently.", starRecommended: true, tags: ["ambiguity"] },
    { id: "sit-bug-cannot-reproduce", category: "situational", subcategory: "Ambiguity & Unfamiliar Territory", question: "What if a user reported a bug you could not reproduce?", difficulty: "intermediate", evaluates: ["Debugging", "Persistence"], tip: "Gather more detail (environment, steps, logs) before concluding it can't be reproduced.", starRecommended: true, tags: ["debugging"] },
    { id: "sit-unfamiliar-technology", category: "situational", subcategory: "Ambiguity & Unfamiliar Territory", question: "What if you were assigned a technology you had never used?", difficulty: "intermediate", evaluates: ["Learning ability", "Resourcefulness"], tip: "Describe how you'd ramp up quickly — docs, small experiments, asking someone experienced.", starRecommended: true, tags: ["learning"] },
    { id: "sit-team-rejected-idea", category: "situational", subcategory: "Ambiguity & Unfamiliar Territory", question: "What if your team rejected your idea?", difficulty: "intermediate", evaluates: ["Openness", "Collaboration"], tip: "Show you can accept a team decision gracefully while still voicing your reasoning once.", starRecommended: true, tags: ["teamwork"] },
    { id: "sit-poor-documentation", category: "situational", subcategory: "Ambiguity & Unfamiliar Territory", question: "What if you joined a project with poor documentation?", difficulty: "intermediate", evaluates: ["Initiative", "Resourcefulness"], tip: "Explain how you'd reconstruct understanding — reading code/history, asking questions — and whether you'd improve the docs for the next person.", starRecommended: true, tags: ["ambiguity"] },

    // ===== TECHNICAL — Coding =====
    { id: "tech-reverse-a-string", category: "technical", subcategory: "Coding", question: "Reverse a string.", difficulty: "introductory", evaluates: ["Basic string manipulation"], tip: "Know at least one approach (two pointers or built-in reverse) and its time complexity.", starRecommended: false, tags: ["strings"] },
    { id: "tech-palindrome-check", category: "technical", subcategory: "Coding", question: "Check whether a string is a palindrome.", difficulty: "introductory", evaluates: ["Basic string manipulation"], tip: "Two pointers from both ends is the classic O(n) approach.", starRecommended: false, tags: ["strings"] },
    { id: "tech-max-element", category: "technical", subcategory: "Coding", question: "Find the maximum element in an array.", difficulty: "introductory", evaluates: ["Iteration"], tip: "A single pass tracking a running max is all that's needed.", starRecommended: false, tags: ["arrays"] },
    { id: "tech-find-duplicates", category: "technical", subcategory: "Coding", question: "Find duplicate values in an array.", difficulty: "introductory", evaluates: ["Hashing"], tip: "A set or hash map gets you O(n) instead of the O(n²) nested-loop approach.", starRecommended: false, tags: ["arrays", "hashing"] },
    { id: "tech-char-frequencies", category: "technical", subcategory: "Coding", question: "Count character frequencies in a string.", difficulty: "introductory", evaluates: ["Hashing"], tip: "A hash map keyed by character is the standard approach.", starRecommended: false, tags: ["strings", "hashing"] },
    { id: "tech-two-sum", category: "technical", subcategory: "Coding", question: "Two Sum — find two numbers in an array that add up to a target.", difficulty: "intermediate", evaluates: ["Hashing", "Optimization"], tip: "A hash map of seen values turns this into a single O(n) pass instead of O(n²).", starRecommended: false, tags: ["arrays", "hashing"] },
    { id: "tech-remove-duplicates", category: "technical", subcategory: "Coding", question: "Remove duplicates from an array.", difficulty: "intermediate", evaluates: ["Data structure choice"], tip: "A set (or sorted-array two-pointer trick) is the standard approach.", starRecommended: false, tags: ["arrays"] },
    { id: "tech-merge-sorted-arrays", category: "technical", subcategory: "Coding", question: "Merge two sorted arrays.", difficulty: "intermediate", evaluates: ["Two pointers"], tip: "Walk both arrays with two pointers, taking the smaller front element each time.", starRecommended: false, tags: ["arrays", "two-pointers"] },
    { id: "tech-merge-sorted-linked-lists", category: "technical", subcategory: "Coding", question: "Merge two sorted linked lists.", difficulty: "advanced", evaluates: ["Linked lists", "Pointer manipulation"], tip: "Same two-pointer idea as merging arrays, but rewiring `next` pointers instead of indices.", starRecommended: false, tags: ["linked-lists"] },
    { id: "tech-binary-search", category: "technical", subcategory: "Coding", question: "Implement binary search.", difficulty: "intermediate", evaluates: ["Binary search", "Complexity"], tip: "Requires sorted input; know the O(log n) reasoning, not just the code.", starRecommended: false, tags: ["searching"] },
    { id: "tech-valid-parentheses", category: "technical", subcategory: "Coding", question: "Check whether a string of brackets/parentheses is valid.", difficulty: "intermediate", evaluates: ["Stacks"], tip: "A stack is the natural fit — push opens, pop and match on closes.", starRecommended: false, tags: ["stacks"] },
    { id: "tech-first-non-repeating-char", category: "technical", subcategory: "Coding", question: "Find the first non-repeating character in a string.", difficulty: "intermediate", evaluates: ["Hashing"], tip: "Count frequencies first, then scan again in order for the first count-of-one.", starRecommended: false, tags: ["strings", "hashing"] },
    { id: "tech-find-missing-number", category: "technical", subcategory: "Coding", question: "Find a missing number in a sequence.", difficulty: "intermediate", evaluates: ["Math reasoning", "Hashing"], tip: "The expected-sum-minus-actual-sum trick avoids needing extra space.", starRecommended: false, tags: ["arrays", "math"] },
    { id: "tech-move-zeros", category: "technical", subcategory: "Coding", question: "Move all zeros in an array to the end.", difficulty: "intermediate", evaluates: ["Two pointers"], tip: "A single-pass two-pointer swap does this in place.", starRecommended: false, tags: ["arrays", "two-pointers"] },
    { id: "tech-reverse-linked-list", category: "technical", subcategory: "Coding", question: "Reverse a linked list.", difficulty: "intermediate", evaluates: ["Linked lists", "Pointer manipulation"], tip: "Track previous/current/next pointers and flip one link at a time.", starRecommended: false, tags: ["linked-lists"] },
    { id: "tech-detect-linked-list-cycle", category: "technical", subcategory: "Coding", question: "Detect a cycle in a linked list.", difficulty: "advanced", evaluates: ["Linked lists", "Two pointers"], tip: "Fast/slow pointers (Floyd's algorithm) detect a cycle without extra memory.", starRecommended: false, tags: ["linked-lists"] },
    { id: "tech-tree-traversal", category: "technical", subcategory: "Coding", question: "Traverse a binary tree (pre-order, in-order, or post-order).", difficulty: "intermediate", evaluates: ["Trees", "Recursion"], tip: "Know the difference between the three orders and be able to implement one recursively.", starRecommended: false, tags: ["trees", "recursion"] },
    { id: "tech-tree-depth", category: "technical", subcategory: "Coding", question: "Find the depth (height) of a binary tree.", difficulty: "intermediate", evaluates: ["Trees", "Recursion"], tip: "1 + the max of the left and right subtree depths, recursively.", starRecommended: false, tags: ["trees", "recursion"] },
    { id: "tech-bfs-traversal", category: "technical", subcategory: "Coding", question: "Implement a BFS traversal.", difficulty: "advanced", evaluates: ["Graphs", "Queues"], tip: "Use a queue and a visited set so you don't revisit nodes.", starRecommended: false, tags: ["graphs", "bfs"] },
    { id: "tech-dfs-traversal", category: "technical", subcategory: "Coding", question: "Implement a DFS traversal.", difficulty: "advanced", evaluates: ["Graphs", "Recursion"], tip: "Can be done recursively or with an explicit stack — know both.", starRecommended: false, tags: ["graphs", "dfs"] },
    { id: "tech-graph-reachability", category: "technical", subcategory: "Coding", question: "Determine whether one node in a graph can reach another.", difficulty: "advanced", evaluates: ["Graphs", "Traversal"], tip: "BFS or DFS from the start node, checking whether the target is ever visited.", starRecommended: false, tags: ["graphs"] },
    // ===== TECHNICAL — Conceptual =====
    { id: "tech-what-is-hash-map", category: "technical", subcategory: "Conceptual", question: "What is a hash map?", difficulty: "introductory", evaluates: ["Data structure fundamentals"], tip: "Be ready to explain average-case lookup and give a real use case.", starRecommended: false, tags: ["data-structures"] },
    { id: "tech-stack-vs-queue", category: "technical", subcategory: "Conceptual", question: "What's the difference between a stack and a queue?", difficulty: "introductory", evaluates: ["Data structure fundamentals"], tip: "LIFO vs FIFO — give one real example of each.", starRecommended: false, tags: ["data-structures"] },
    { id: "tech-array-vs-linked-list", category: "technical", subcategory: "Conceptual", question: "Array vs. linked list — what's the tradeoff?", difficulty: "introductory", evaluates: ["Data structure fundamentals"], tip: "Fast indexed access vs. fast insert/remove — know when each wins.", starRecommended: false, tags: ["data-structures"] },
    { id: "tech-bfs-vs-dfs", category: "technical", subcategory: "Conceptual", question: "BFS vs. DFS — when would you use each?", difficulty: "intermediate", evaluates: ["Graph fundamentals"], tip: "BFS for shortest path in an unweighted graph; DFS when you need to explore deeply or don't care about shortest path.", starRecommended: false, tags: ["graphs"] },
    { id: "tech-what-is-recursion", category: "technical", subcategory: "Conceptual", question: "What is recursion?", difficulty: "introductory", evaluates: ["Fundamentals"], tip: "Mention the base case — that's the part people forget to explain.", starRecommended: false, tags: ["fundamentals"] },
    { id: "tech-what-is-big-o", category: "technical", subcategory: "Conceptual", question: "What is Big O notation?", difficulty: "introductory", evaluates: ["Complexity fundamentals"], tip: "It describes how runtime or memory grows as input grows, not exact runtime.", starRecommended: false, tags: ["complexity"] },
    { id: "tech-what-does-n-log-n-mean", category: "technical", subcategory: "Conceptual", question: "What does O(n log n) mean?", difficulty: "intermediate", evaluates: ["Complexity fundamentals"], tip: "Common for efficient sorting — slightly worse than linear, much better than quadratic.", starRecommended: false, tags: ["complexity"] },
    { id: "tech-what-is-an-api", category: "technical", subcategory: "Conceptual", question: "What is an API?", difficulty: "introductory", evaluates: ["Systems fundamentals"], tip: "A defined way for two pieces of software to talk to each other.", starRecommended: false, tags: ["systems"] },
    { id: "tech-rest-basics", category: "technical", subcategory: "Conceptual", question: "What are the basics of REST?", difficulty: "introductory", evaluates: ["Systems fundamentals"], tip: "Resources identified by URLs, manipulated with standard HTTP verbs.", starRecommended: false, tags: ["systems", "api"] },
    { id: "tech-http-request-response", category: "technical", subcategory: "Conceptual", question: "Explain the basics of an HTTP request/response.", difficulty: "introductory", evaluates: ["Systems fundamentals"], tip: "A client sends a request (method, URL, headers, maybe a body); the server sends back a status code and a response.", starRecommended: false, tags: ["systems"] },
    { id: "tech-client-vs-server", category: "technical", subcategory: "Conceptual", question: "Client vs. server — what's the difference?", difficulty: "introductory", evaluates: ["Systems fundamentals"], tip: "The client requests; the server holds data/logic and responds.", starRecommended: false, tags: ["systems"] },
    { id: "tech-database-basics", category: "technical", subcategory: "Conceptual", question: "What are the basics of how a database works?", difficulty: "introductory", evaluates: ["Systems fundamentals"], tip: "Structured, persistent storage you can query — mention tables/rows or documents depending on the type.", starRecommended: false, tags: ["databases"] },
    { id: "tech-sql-basics", category: "technical", subcategory: "Conceptual", question: "What are the basics of SQL?", difficulty: "introductory", evaluates: ["Databases"], tip: "Know SELECT/WHERE/JOIN at a conversational level, even if not fluent.", starRecommended: false, tags: ["databases", "sql"] },
    { id: "tech-inner-vs-left-join", category: "technical", subcategory: "Conceptual", question: "INNER JOIN vs. LEFT JOIN — what's the difference?", difficulty: "intermediate", evaluates: ["Databases"], tip: "INNER JOIN keeps only matches; LEFT JOIN keeps everything from the left table, matched or not.", starRecommended: false, tags: ["databases", "sql"] },
    { id: "tech-primary-key", category: "technical", subcategory: "Conceptual", question: "What is a primary key?", difficulty: "introductory", evaluates: ["Databases"], tip: "A unique identifier for each row/record in a table.", starRecommended: false, tags: ["databases"] },
    { id: "tech-database-index", category: "technical", subcategory: "Conceptual", question: "What is a database index, and why does it help?", difficulty: "intermediate", evaluates: ["Databases", "Performance"], tip: "It trades extra storage/write cost for much faster lookups on the indexed column.", starRecommended: false, tags: ["databases", "performance"] },
    { id: "tech-git-basics", category: "technical", subcategory: "Conceptual", question: "What are the basics of Git?", difficulty: "introductory", evaluates: ["Tooling fundamentals"], tip: "Commits, branches, and how changes move between them — a working conversational understanding is enough.", starRecommended: false, tags: ["git", "tooling"] },
    { id: "tech-merge-vs-rebase", category: "technical", subcategory: "Conceptual", question: "Merge vs. rebase — what's the difference, at an introductory level?", difficulty: "intermediate", evaluates: ["Git fundamentals"], tip: "Merge keeps both histories and adds a merge commit; rebase replays your commits on top of another branch.", starRecommended: false, tags: ["git"] },
    { id: "tech-unit-testing", category: "technical", subcategory: "Conceptual", question: "What is unit testing?", difficulty: "introductory", evaluates: ["Testing fundamentals"], tip: "Testing a single small piece of code in isolation, independent of the rest of the system.", starRecommended: false, tags: ["testing"] },
    { id: "tech-integration-testing", category: "technical", subcategory: "Conceptual", question: "What is integration testing?", difficulty: "intermediate", evaluates: ["Testing fundamentals"], tip: "Testing how multiple pieces work together, not just each piece alone.", starRecommended: false, tags: ["testing"] },
    { id: "tech-maintainable-code", category: "technical", subcategory: "Conceptual", question: "What makes code maintainable?", difficulty: "introductory", evaluates: ["Code quality judgment"], tip: "Clear naming, small focused functions, tests, and reasonable comments — not cleverness.", starRecommended: false, tags: ["code-quality"] },
    // ===== TECHNICAL — Project & Systems =====
    { id: "tech-explain-a-project", category: "technical", subcategory: "Project & Systems", question: "Explain a technical project you built.", difficulty: "introductory", evaluates: ["Communication", "Technical depth"], tip: "Lead with what it does and your role, then go deeper only as follow-up questions ask for it.", starRecommended: true, tags: ["project"] },
    { id: "tech-what-architecture-chosen", category: "technical", subcategory: "Project & Systems", question: "What architecture did you choose, and why?", difficulty: "intermediate", evaluates: ["Systems design", "Judgment"], tip: "Name the alternative you didn't pick and why — that's what shows real reasoning.", starRecommended: true, tags: ["project", "systems-design"] },
    { id: "tech-hardest-technical-problem", category: "technical", subcategory: "Project & Systems", question: "What was the hardest technical problem on this project?", difficulty: "advanced", evaluates: ["Problem solving", "Technical depth"], tip: "Pick something you can explain clearly end-to-end, not just something that sounds impressive.", starRecommended: true, tags: ["project", "problem-solving"] },
    { id: "tech-what-tradeoff-made", category: "technical", subcategory: "Project & Systems", question: "What tradeoff did you make on this project?", difficulty: "intermediate", evaluates: ["Judgment"], tip: "Name both sides of the tradeoff and why you chose the side you did.", starRecommended: true, tags: ["project", "tradeoffs"] },
    { id: "tech-what-would-you-improve", category: "technical", subcategory: "Project & Systems", question: "What would you improve about this project if you kept working on it?", difficulty: "intermediate", evaluates: ["Self-awareness", "Technical judgment"], tip: "A specific, honest answer here is more convincing than “nothing, it's done.”", starRecommended: true, tags: ["project", "reflection"] },
    { id: "tech-how-did-you-test-it", category: "technical", subcategory: "Project & Systems", question: "How did you test it?", difficulty: "intermediate", evaluates: ["Testing", "Quality mindset"], tip: "Mention what you actually did — manual checks, unit tests, a specific edge case you worried about.", starRecommended: true, tags: ["project", "testing"] },
    { id: "tech-how-did-you-debug", category: "technical", subcategory: "Project & Systems", question: "How did you debug a difficult issue on this project?", difficulty: "advanced", evaluates: ["Debugging", "Persistence"], tip: "Walk through the actual steps you took to isolate the cause.", starRecommended: true, tags: ["project", "debugging"] },
    { id: "tech-scale-behavior", category: "technical", subcategory: "Project & Systems", question: "How would this system behave at a much larger scale?", difficulty: "advanced", evaluates: ["Systems thinking"], tip: "Identify the part that would break first (a database, a loop, a single server) and how you'd address it.", starRecommended: true, tags: ["systems-design", "scale"] },
  ];

  const api = {
    STAGES, STAR_GUIDANCE, STAR_WHY_IT_WORKS, STAR_MISTAKES, STAR_EXAMPLE, SITUATIONAL_FRAMEWORK,
    TMAY, TECHNICAL_PREP, INTERVIEWER_QUESTIONS, SELF_REVIEW,
    CHECKLIST_BEFORE, CHECKLIST_DURING, CHECKLIST_AFTER, QUESTIONS,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.InterviewData = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
