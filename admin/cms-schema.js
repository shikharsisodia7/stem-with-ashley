// Content schema for the admin dashboard — the single source of truth for what
// Ashley can edit, shared by the browser dashboard (form rendering + instant
// validation) and the server API (authoritative sanitizing + validation before
// anything is published). Pure logic, no DOM, no network — unit tested with plain
// Node (cms-schema.test.js), same split as jobs/jobs-filter.js.
//
// Three "documents" (repo files) hold all editable content:
//   roadmap   -> data/roadmap-data.json  (plain JSON)
//   jobs      -> jobs/jobs-data.js       (JSON between CMS-DATA markers)
//   interview -> interview-data.js       (JSON between CMS-DATA markers)

(function (global) {
  const MARK_START = "/* CMS-DATA-START */";
  const MARK_END = "/* CMS-DATA-END */";

  const DOCS = {
    roadmap: { path: "data/roadmap-data.json", format: "json", label: "Career roadmap content" },
    jobs: { path: "jobs/jobs-data.js", format: "marked", label: "Job Finder listings" },
    interview: { path: "interview-data.js", format: "marked", label: "Interview Prep content" },
  };
  const DOC_NAMES = Object.keys(DOCS);

  // ---------- Field specs ----------
  // t: "str" | "text" (multi-line) | "url" | "bool" | "enum" | "strlist" | "list" | "obj" | "ref" | "reflist"

  const EXPERIENCE_LEVELS = [
    { value: "internship", label: "Internship" },
    { value: "new-grad", label: "New grad" },
    { value: "1-3-years", label: "1-3 years" },
  ];
  const QUESTION_CATEGORIES = [
    { value: "behavioral", label: "Behavioral" },
    { value: "situational", label: "Situational" },
    { value: "technical", label: "Technical" },
  ];
  const DIFFICULTIES = [
    { value: "introductory", label: "Introductory" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];
  const MEDIA_TYPES = [
    { value: "youtube", label: "YouTube video/channel" },
    { value: "podcast", label: "Podcast" },
  ];

  const FIELD_ITEM = [
    { key: "name", t: "str", label: "Career field name", req: true, max: 120 },
    { key: "summary", t: "text", label: "One-sentence summary (shown on the home page card)", req: true, max: 600 },
    {
      key: "pathway", t: "list", label: "Five-year pathway", fixed: 4, autoIndex: "level", itemLabel: "Stage",
      help: "Four stages from entry level to senior. Each stage needs a job title, a year range, and a description.",
      of: [
        { key: "title", t: "str", label: "Job title(s)", req: true, max: 200 },
        { key: "yearRange", t: "str", label: "Years into career (e.g. 0-1, 1-3, 3-5, 5+)", req: true, max: 20 },
        { key: "description", t: "text", label: "What this stage looks like", req: true, max: 800 },
      ],
    },
    { key: "companies", t: "strlist", label: "Companies that hire for this field", max: 40, itemMax: 150, itemLabel: "Company" },
    {
      key: "certifications", t: "list", label: "Certifications", max: 20, itemLabel: "Certification", titleKey: "name",
      of: [
        { key: "name", t: "str", label: "Certification name", req: true, max: 200 },
        { key: "provider", t: "str", label: "Who offers it", max: 150 },
        { key: "url", t: "url", label: "Official web page (https://…)" },
      ],
    },
    {
      key: "mastersPrograms", t: "list", label: "Graduate (master's) programs", max: 15, itemLabel: "Program", titleKey: "name",
      of: [
        { key: "name", t: "str", label: "Program name", req: true, max: 200 },
        { key: "schools", t: "strlist", label: "Schools that offer it", max: 20, itemMax: 150, itemLabel: "School" },
      ],
    },
    { key: "conferences", t: "strlist", label: "Conferences", max: 30, itemMax: 200, itemLabel: "Conference" },
    { key: "organizations", t: "strlist", label: "Professional organizations", max: 30, itemMax: 200, itemLabel: "Organization" },
    {
      key: "media", t: "list", label: "YouTube & podcast links", max: 10, omitEmpty: true, itemLabel: "Link", titleKey: "title",
      of: [
        { key: "type", t: "enum", label: "Type", options: MEDIA_TYPES, req: true },
        { key: "title", t: "str", label: "Title", req: true, max: 200 },
        { key: "url", t: "url", label: "Link (https://…)", req: true },
        { key: "description", t: "text", label: "One-sentence description", max: 400 },
      ],
    },
  ];

  const MAJOR_ITEM = [
    { key: "name", t: "str", label: "Major name", req: true, max: 120 },
    { key: "summary", t: "text", label: "One-sentence summary", req: true, max: 600 },
    { key: "typicalCourses", t: "strlist", label: "Typical courses", max: 30, itemMax: 150, itemLabel: "Course" },
    { key: "whyChooseIt", t: "text", label: "Why students choose it", max: 800 },
    { key: "leadsToFields", t: "reflist", label: "Career fields this major leads to", to: "fields", min: 1 },
  ];

  const SKILL_ITEM = [
    { key: "name", t: "str", label: "Skill name", req: true, max: 120 },
    { key: "resources", t: "strlist", label: "Learning resources (books, courses, organizations)", max: 20, itemMax: 250, itemLabel: "Resource" },
  ];

  const RESOURCE_ITEM = [
    { key: "title", t: "str", label: "Resource name", req: true, max: 200 },
    { key: "url", t: "url", label: "Web address (https://…)", req: true },
    { key: "provider", t: "str", label: "Who runs it", max: 150 },
    { key: "description", t: "text", label: "Short description", max: 800 },
  ];

  const JOB_ITEM = [
    { key: "title", t: "str", label: "Job title", req: true, max: 150 },
    { key: "company", t: "str", label: "Company", req: true, max: 150 },
    { key: "fieldId", t: "ref", label: "STEM field", to: "fields", req: true },
    { key: "experienceLevel", t: "enum", label: "Experience level", options: EXPERIENCE_LEVELS, req: true },
    { key: "location", t: "str", label: "Location (city, state, or Remote)", req: true, max: 120 },
    { key: "remote", t: "bool", label: "Remote position" },
    { key: "description", t: "text", label: "One-sentence description", req: true, max: 600 },
    {
      key: "isSampleData", t: "bool", label: "This is a SAMPLE listing (not a real opening)",
      help: "Leave checked for illustrative examples. Uncheck only for a real, currently open job — you must then add the link to the original posting.",
    },
    { key: "sourceUrl", t: "url", label: "Link to the real job posting (required for real listings)" },
    { key: "lastVerified", t: "date", label: "Date you last checked the real posting was open", optional: true },
  ];

  const QUESTION_ITEM = [
    { key: "question", t: "text", label: "Interview question", req: true, max: 400 },
    { key: "category", t: "enum", label: "Category", options: QUESTION_CATEGORIES, req: true },
    { key: "subcategory", t: "str", label: "Topic (e.g. Teamwork, Leadership, Project & Systems)", req: true, max: 80 },
    { key: "difficulty", t: "enum", label: "Difficulty", options: DIFFICULTIES, req: true },
    { key: "evaluates", t: "strlist", label: "What it evaluates", max: 10, itemMax: 80, itemLabel: "Skill" },
    { key: "tip", t: "text", label: "Tip for answering", max: 600 },
    { key: "starRecommended", t: "bool", label: "Recommend answering with the STAR method" },
    { key: "tags", t: "strlist", label: "Search tags", max: 15, itemMax: 50, itemLabel: "Tag" },
  ];

  const STAGE_ITEM = [
    { key: "name", t: "str", label: "Stage name", req: true, max: 120 },
    { key: "description", t: "text", label: "Description", req: true, max: 800 },
  ];

  // Interview guidance lists are edited as one form (an "object" collection).
  const INTERVIEW_GUIDANCE = [
    { key: "STAR_WHY_IT_WORKS", t: "strlist", label: "STAR method — why it works", max: 20, itemMax: 600, itemLabel: "Point", multiline: true },
    { key: "STAR_MISTAKES", t: "strlist", label: "STAR method — common mistakes", max: 30, itemMax: 600, itemLabel: "Mistake", multiline: true },
    { key: "SITUATIONAL_FRAMEWORK", t: "strlist", label: "Situational questions — step-by-step framework", max: 20, itemMax: 600, itemLabel: "Step", multiline: true },
    { key: "CHECKLIST_BEFORE", t: "strlist", label: "Checklist — before the interview", max: 60, itemMax: 400, itemLabel: "Item" },
    { key: "CHECKLIST_DURING", t: "strlist", label: "Checklist — during the interview", max: 60, itemMax: 400, itemLabel: "Item" },
    { key: "CHECKLIST_AFTER", t: "strlist", label: "Checklist — after the interview", max: 60, itemMax: 400, itemLabel: "Item" },
    {
      key: "INTERVIEWER_QUESTIONS", t: "obj", label: "Questions students can ask the interviewer",
      of: [
        { key: "guidance", t: "text", label: "Guidance paragraph", max: 800 },
        {
          key: "groups", t: "list", label: "Question groups", max: 12, itemLabel: "Group", titleKey: "label",
          of: [
            { key: "key", t: "slug", label: "Short internal name (lowercase, no spaces)", req: true, max: 40 },
            { key: "label", t: "str", label: "Group heading", req: true, max: 120 },
            { key: "questions", t: "strlist", label: "Questions", max: 30, itemMax: 300, itemLabel: "Question" },
          ],
        },
      ],
    },
  ];

  // Collections Ashley sees in the dashboard sidebar.
  const COLLECTIONS = {
    fields: {
      doc: "roadmap", key: "fields", label: "Career Fields", singular: "career field",
      idKey: "id", titleKey: "name", subtitleKey: "summary", item: FIELD_ITEM,
      makeId: (item) => slugify(item.name),
      previewHash: (item) => `#/field/${item.id}`,
      newItem: () => ({
        name: "", summary: "",
        pathway: [1, 2, 3, 4].map((level) => ({ level, title: "", yearRange: ["0-1", "1-3", "3-5", "5+"][level - 1], description: "" })),
        companies: [], certifications: [], mastersPrograms: [], conferences: [], organizations: [],
      }),
    },
    majors: {
      doc: "roadmap", key: "majors", label: "College Majors", singular: "major",
      idKey: "id", titleKey: "name", subtitleKey: "summary", item: MAJOR_ITEM,
      makeId: (item) => `${slugify(item.name)}-major`,
      previewHash: (item) => `#/major/${item.id}`,
      newItem: () => ({ name: "", summary: "", typicalCourses: [], whyChooseIt: "", leadsToFields: [] }),
    },
    skills: {
      doc: "roadmap", key: "skills", label: "Developmental Skills", singular: "skill",
      titleKey: "name", uniqueKey: "name", item: SKILL_ITEM,
      previewHash: () => "#/skills",
      newItem: () => ({ name: "", resources: [] }),
    },
    resources: {
      doc: "roadmap", key: "resources", label: "Career Resources", singular: "resource",
      titleKey: "title", subtitleKey: "description", uniqueKey: "url", item: RESOURCE_ITEM,
      previewHash: () => "#/resources",
      newItem: () => ({ title: "", url: "", provider: "", description: "" }),
    },
    jobs: {
      doc: "jobs", key: null, label: "Job Finder", singular: "job listing",
      idKey: "id", titleKey: "title", subtitleKey: "company", item: JOB_ITEM,
      makeId: (item, existing) => nextNumberedId("job", existing),
      previewPage: "jobs",
      newItem: () => ({
        title: "", company: "", fieldId: "", experienceLevel: "new-grad", location: "", remote: false,
        description: "", isSampleData: true, sourceUrl: "",
      }),
    },
    questions: {
      doc: "interview", key: "QUESTIONS", label: "Interview Questions", singular: "interview question",
      idKey: "id", titleKey: "question", subtitleKey: "subcategory", item: QUESTION_ITEM,
      makeId: (item) => {
        const prefix = { behavioral: "beh", situational: "sit", technical: "tech" }[item.category] || "q";
        return `${prefix}-${slugify(item.question).split("-").slice(0, 6).join("-")}`;
      },
      previewHash: () => "#/interview/6",
      newItem: () => ({
        question: "", category: "behavioral", subcategory: "", difficulty: "introductory",
        evaluates: [], tip: "", starRecommended: true, tags: [],
      }),
    },
    stages: {
      doc: "interview", key: "STAGES", label: "Interview Stages", singular: "interview stage",
      titleKey: "name", subtitleKey: "description", uniqueKey: "name", item: STAGE_ITEM,
      previewHash: () => "#/interview/2",
      newItem: () => ({ name: "", description: "" }),
    },
    guidance: {
      doc: "interview", object: true, label: "Interview Guidance & Checklists", singular: "guidance",
      item: INTERVIEW_GUIDANCE, previewHash: () => "#/interview/3",
    },
  };

  // Top-level keys of each document that the dashboard is allowed to change. Every
  // other key is copied from the live file by the server (never from the client).
  const MANAGED_KEYS = {
    roadmap: ["fields", "majors", "skills", "resources"],
    interview: ["QUESTIONS", "STAGES", ...INTERVIEW_GUIDANCE.map((f) => f.key)],
  };

  // ---------- Small helpers ----------

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80)
      .replace(/-$/, "");
  }

  function nextNumberedId(prefix, existingIds) {
    let max = 0;
    (existingIds || []).forEach((id) => {
      const m = new RegExp(`^${prefix}-(\\d+)$`).exec(id || "");
      if (m) max = Math.max(max, Number(m[1]));
    });
    return `${prefix}-${max + 1}`;
  }

  // Ensures an id is unique by appending -2, -3, … when needed.
  function uniqueId(base, existingIds) {
    const taken = new Set(existingIds || []);
    const root = base || "item";
    if (!taken.has(root)) return root;
    let n = 2;
    while (taken.has(`${root}-${n}`)) n += 1;
    return `${root}-${n}`;
  }

  function isHttpUrl(value) {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
    try {
      const u = new URL(value);
      return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname) && u.hostname.includes(".");
    } catch (e) {
      return false;
    }
  }

  const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function cleanString(v, max) {
    if (v === null || v === undefined) return "";
    // Strip control characters (keep newlines/tabs), normalize whitespace at the ends.
    const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    return max ? s.slice(0, max * 2) : s; // hard cap at 2x so validation can still report "too long"
  }

  function getPath(obj, key) {
    return key === null ? obj : obj && obj[key];
  }

  // ---------- Sanitizing (drops unknown keys, coerces types) ----------

  function sanitizeValue(spec, value) {
    switch (spec.t) {
      case "bool":
        return value === true || value === "true" || value === "on";
      case "strlist":
        return (Array.isArray(value) ? value : [])
          .map((s) => cleanString(s, spec.itemMax))
          .filter(Boolean);
      case "reflist":
        return [...new Set((Array.isArray(value) ? value : []).map((s) => cleanString(s, 100)).filter(Boolean))];
      case "list":
        return (Array.isArray(value) ? value : []).map((item, i) => {
          const out = sanitizeObject(spec.of, item);
          if (spec.autoIndex) return orderLike({ [spec.autoIndex]: i + 1, ...out }, item);
          return out;
        });
      case "obj":
        return sanitizeObject(spec.of, value);
      case "slug":
        return slugify(value);
      default:
        return cleanString(value, spec.max);
    }
  }

  // Rebuilds `out` so keys keep the order they had in `src` (new keys go last).
  // Keeps published files' diffs minimal and makes edits easy to review.
  function orderLike(out, src) {
    const ordered = {};
    Object.keys(src || {}).forEach((k) => { if (k in out) ordered[k] = out[k]; });
    Object.keys(out).forEach((k) => { if (!(k in ordered)) ordered[k] = out[k]; });
    return ordered;
  }

  function sanitizeObject(specs, value) {
    const src = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const out = {};
    specs.forEach((spec) => {
      const v = sanitizeValue(spec, src[spec.key]);
      if (spec.omitEmpty && Array.isArray(v) && v.length === 0) return;
      if ((spec.optional || spec.t === "url") && v === "" && !(spec.key in src)) return;
      if (spec.optional && v === "") return;
      out[spec.key] = v;
    });
    return orderLike(out, src);
  }

  function sanitizeItem(collectionName, item) {
    const col = COLLECTIONS[collectionName];
    const clean = sanitizeObject(col.item, item);
    if (col.idKey) {
      const id = cleanString(item && item[col.idKey], 100);
      return orderLike({ [col.idKey]: id, ...clean }, item);
    }
    return clean;
  }

  // Keeps key order of the original data stable (id first, then spec order).
  function sanitizeDoc(docName, data) {
    if (docName === "jobs") {
      return (Array.isArray(data) ? data : []).map((j) => {
        const clean = sanitizeItem("jobs", j);
        if (!clean.sourceUrl) delete clean.sourceUrl;
        return clean;
      });
    }
    const src = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const out = {};
    Object.keys(src).forEach((k) => {
      if (!MANAGED_KEYS[docName].includes(k)) out[k] = src[k];
    });
    Object.entries(COLLECTIONS).forEach(([name, col]) => {
      if (col.doc !== docName) return;
      if (col.object) {
        Object.assign(out, sanitizeObject(col.item, src));
      } else {
        out[col.key] = (Array.isArray(src[col.key]) ? src[col.key] : []).map((it) => sanitizeItem(name, it));
      }
    });
    return orderLike(out, src);
  }

  // Server-side merge: managed keys from the client, everything else from the live file.
  function mergeManaged(docName, liveData, clientData) {
    const clean = sanitizeDoc(docName, clientData);
    if (docName === "jobs") return clean;
    const out = {};
    Object.keys(liveData || {}).forEach((k) => {
      out[k] = MANAGED_KEYS[docName].includes(k) ? clean[k] : liveData[k];
    });
    MANAGED_KEYS[docName].forEach((k) => { if (!(k in out) && k in clean) out[k] = clean[k]; });
    return out;
  }

  // ---------- Validation ----------

  function validateValue(spec, value, path, errors, ctx) {
    const label = spec.label;
    const add = (message) => errors.push({ path, message });
    switch (spec.t) {
      case "str":
      case "text":
      case "slug":
        if (spec.req && !value) add(`"${label}" is required.`);
        if (spec.max && value && value.length > spec.max) add(`"${label}" is too long (${value.length} characters, limit ${spec.max}).`);
        if (spec.t === "slug" && value && !ID_RE.test(value)) add(`"${label}" may only use lowercase letters, numbers, and hyphens.`);
        break;
      case "date":
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) add(`"${label}" must be a date.`);
        break;
      case "url":
        if (spec.req && !value) add(`"${label}" is required.`);
        else if (value && !isHttpUrl(value)) add(`"${label}" must be a full web address starting with https:// (got "${value}").`);
        break;
      case "enum":
        if (spec.req && !value) add(`Choose a value for "${label}".`);
        else if (value && !spec.options.some((o) => o.value === value)) add(`"${label}" has an unsupported value "${value}".`);
        break;
      case "ref":
        if (spec.req && !value) add(`Choose a "${label}".`);
        else if (value && ctx.refs[spec.to] && !ctx.refs[spec.to].has(value)) add(`"${label}" points to a career field that doesn't exist ("${value}").`);
        break;
      case "reflist":
        if (spec.min && value.length < spec.min) add(`Pick at least ${spec.min} option(s) for "${label}".`);
        value.forEach((v) => {
          if (ctx.refs[spec.to] && !ctx.refs[spec.to].has(v)) add(`"${label}" includes a career field that doesn't exist ("${v}").`);
        });
        break;
      case "strlist":
        if (spec.max && value.length > spec.max) add(`"${label}" has too many entries (limit ${spec.max}).`);
        value.forEach((s, i) => {
          if (spec.itemMax && s.length > spec.itemMax) add(`"${label}" entry ${i + 1} is too long (limit ${spec.itemMax} characters).`);
        });
        break;
      case "list":
        if (spec.fixed && value.length !== spec.fixed) add(`"${label}" must have exactly ${spec.fixed} entries.`);
        if (spec.max && value.length > spec.max) add(`"${label}" has too many entries (limit ${spec.max}).`);
        value.forEach((item, i) => validateObject(spec.of, item, `${path}.${i}`, errors, ctx, `${spec.itemLabel || "Entry"} ${i + 1}: `));
        break;
      case "obj":
        validateObject(spec.of, value || {}, path, errors, ctx, "");
        break;
      default:
        break;
    }
  }

  function validateObject(specs, obj, path, errors, ctx, prefix) {
    const before = errors.length;
    specs.forEach((spec) => {
      const v = obj[spec.key] === undefined ? sanitizeValue(spec, undefined) : obj[spec.key];
      validateValue(spec, v, `${path}.${spec.key}`, errors, ctx);
    });
    if (prefix) {
      for (let i = before; i < errors.length; i += 1) errors[i].message = prefix + errors[i].message;
    }
  }

  function itemTitle(collectionName, item) {
    const col = COLLECTIONS[collectionName];
    const t = col.titleKey && item[col.titleKey];
    return t ? String(t).slice(0, 80) : `(untitled ${col.singular})`;
  }

  function validateItem(collectionName, item, ctx, index) {
    const col = COLLECTIONS[collectionName];
    const errors = [];
    const path = `${collectionName}.${index}`;
    if (col.idKey) {
      const id = item[col.idKey];
      if (!id) errors.push({ path: `${path}.${col.idKey}`, message: "Missing an internal ID." });
      else if (!ID_RE.test(id)) errors.push({ path: `${path}.${col.idKey}`, message: `Internal ID "${id}" may only use lowercase letters, numbers, and hyphens.` });
    }
    validateObject(col.item, item, path, errors, ctx, "");
    if (collectionName === "jobs" && item.isSampleData === false && !item.sourceUrl) {
      errors.push({ path: `${path}.sourceUrl`, message: "Real (non-sample) job listings need a link to the original posting so students can verify it." });
    }
    const title = itemTitle(collectionName, item);
    errors.forEach((e) => { e.collection = collectionName; e.index = index; e.item = title; });
    return errors;
  }

  function buildContext(docs) {
    const refs = {};
    if (docs.roadmap && Array.isArray(docs.roadmap.fields)) refs.fields = new Set(docs.roadmap.fields.map((f) => f.id));
    return { refs };
  }

  // Validates a set of documents together (cross-document references included).
  // docs: { roadmap?, jobs?, interview? } — pass every document that exists so
  // references (e.g. a job's career field) can be checked.
  function validateDocs(docs) {
    const errors = [];
    const ctx = buildContext(docs);
    Object.entries(COLLECTIONS).forEach(([name, col]) => {
      const data = docs[col.doc];
      if (data === undefined) return;
      if (col.object) {
        validateObject(col.item, data, name, errors, ctx, "");
        errors.forEach((e) => { if (!e.collection) { e.collection = name; e.item = col.label; } });
        return;
      }
      const list = getPath(data, col.key);
      if (!Array.isArray(list)) {
        errors.push({ collection: name, path: name, message: `${col.label} list is missing.` });
        return;
      }
      const seen = new Map();
      list.forEach((item, i) => {
        validateItem(name, item, ctx, i).forEach((e) => errors.push(e));
        const uk = col.idKey || col.uniqueKey;
        if (uk && item[uk]) {
          const k = String(item[uk]).toLowerCase();
          if (seen.has(k)) {
            errors.push({
              collection: name, index: i, item: itemTitle(name, item), path: `${name}.${i}.${uk}`,
              message: `Duplicate: another ${col.singular} already uses "${item[uk]}".`,
            });
          }
          seen.set(k, i);
        }
      });
    });
    if (docs.roadmap && Array.isArray(docs.roadmap.fields) && docs.roadmap.fields.length === 0) {
      errors.push({ collection: "fields", path: "fields", message: "The site needs at least one career field." });
    }
    return errors;
  }

  // Which items refer to a given career field id — used to block deleting a field
  // that majors or job listings still link to.
  function fieldReferences(fieldId, docs) {
    const refs = [];
    ((docs.roadmap && docs.roadmap.majors) || []).forEach((m) => {
      if ((m.leadsToFields || []).includes(fieldId)) refs.push({ collection: "majors", title: m.name });
    });
    (Array.isArray(docs.jobs) ? docs.jobs : []).forEach((j) => {
      if (j.fieldId === fieldId) refs.push({ collection: "jobs", title: `${j.title} — ${j.company}` });
    });
    return refs;
  }

  // ---------- Parse / serialize repo files ----------

  function parseDoc(docName, text) {
    const meta = DOCS[docName];
    if (!meta) throw new Error(`Unknown document "${docName}"`);
    if (meta.format === "json") return JSON.parse(text);
    const a = text.indexOf(MARK_START);
    const b = text.indexOf(MARK_END);
    if (a < 0 || b < 0 || b < a) throw new Error(`${meta.path} is missing its CMS-DATA markers`);
    return JSON.parse(text.slice(a + MARK_START.length, b));
  }

  function serializeDoc(docName, data, templateText) {
    const meta = DOCS[docName];
    if (meta.format === "json") return `${JSON.stringify(data, null, 2)}\n`;
    const a = templateText.indexOf(MARK_START);
    const b = templateText.indexOf(MARK_END);
    if (a < 0 || b < 0 || b < a) throw new Error(`${meta.path} is missing its CMS-DATA markers`);
    return `${templateText.slice(0, a + MARK_START.length)} ${JSON.stringify(data, null, 2)} ${templateText.slice(b)}`;
  }

  // ---------- Change summary (for Preview + the publication log) ----------

  // Canonical JSON (sorted object keys) so key order never counts as a change.
  function stable(v) {
    if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
    if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
    return JSON.stringify(v);
  }

  function summarizeChanges(beforeDocs, afterDocs) {
    const changes = [];
    Object.entries(COLLECTIONS).forEach(([name, col]) => {
      const before = beforeDocs[col.doc];
      const after = afterDocs[col.doc];
      if (before === undefined || after === undefined) return;
      if (col.object) {
        col.item.forEach((spec) => {
          if (stable(before[spec.key]) !== stable(after[spec.key])) {
            changes.push({ collection: name, type: "edited", title: spec.label });
          }
        });
        return;
      }
      const a = getPath(before, col.key) || [];
      const b = getPath(after, col.key) || [];
      const keyOf = (it, i) => (col.idKey ? it[col.idKey] : col.uniqueKey ? String(it[col.uniqueKey]).toLowerCase() : String(i));
      const beforeMap = new Map(a.map((it, i) => [keyOf(it, i), it]));
      const afterMap = new Map(b.map((it, i) => [keyOf(it, i), it]));
      b.forEach((it, i) => {
        const k = keyOf(it, i);
        if (!beforeMap.has(k)) changes.push({ collection: name, type: "added", title: itemTitle(name, it) });
        else if (stable(beforeMap.get(k)) !== stable(it)) changes.push({ collection: name, type: "edited", title: itemTitle(name, it) });
      });
      a.forEach((it, i) => {
        if (!afterMap.has(keyOf(it, i))) changes.push({ collection: name, type: "removed", title: itemTitle(name, it) });
      });
      const orderA = a.map(keyOf).filter((k) => afterMap.has(k));
      const orderB = b.map(keyOf).filter((k) => beforeMap.has(k));
      if (stable(orderA) !== stable(orderB)) changes.push({ collection: name, type: "reordered", title: col.label });
    });
    return changes;
  }

  const api = {
    DOCS, DOC_NAMES, COLLECTIONS, MANAGED_KEYS, EXPERIENCE_LEVELS, MARK_START, MARK_END,
    slugify, uniqueId, nextNumberedId, isHttpUrl,
    sanitizeDoc, sanitizeItem, mergeManaged,
    validateDocs, validateItem, buildContext, fieldReferences, itemTitle,
    parseDoc, serializeDoc, summarizeChanges, stable,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.CmsSchema = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
