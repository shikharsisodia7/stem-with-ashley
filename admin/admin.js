// STEM with Ashley — Admin Dashboard.
// Sign in (Supabase Auth) -> pick content -> edit -> Save Draft -> Preview ->
// Publish -> watch it go live. Every private action goes through /api/* where the
// server re-checks the session and role; nothing here is trusted for security.
// Depends on: supabase-js (CDN), utils.js (esc), cms-schema.js, admin-forms.js.

(function () {
  const Schema = window.CmsSchema;
  const Forms = window.AdminForms;
  const IDLE_WARN_MS = 25 * 60 * 1000;
  const IDLE_SIGNOUT_MS = 30 * 60 * 1000;
  const PUBLISH_TRACK_KEY = "stemAdminPublishTracking";

  const S = {
    sb: null,
    cfg: null,
    me: null,
    docs: {},          // name -> { live, liveSha, draft, working, baseSha }
    headSha: null,
    publishing: false,
    editing: null,     // { collection, index, value, dirty, errors, isNew }
    route: "",
    suppressHash: false,
    tracking: null,    // { sha, files, startedAt, label }
    previewData: null,
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const view = () => $("#view");
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // ---------- Toast + modal ----------

  let toastTimer = null;
  function toast(message, kind) {
    const el = $("#toast");
    el.className = `toast toast-${kind || "info"}`;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, kind === "error" ? 9000 : 4500);
  }

  // Accessible modal. buttons: [{ label, value, kind }] -> resolves with the value.
  function modal({ title, body, buttons, wide }) {
    return new Promise((resolve) => {
      const root = $("#modal-root");
      const previous = document.activeElement;
      root.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal${wide ? " modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">${esc(title)}</h2>
            <div class="modal-body">${body}</div>
            <div class="modal-actions">
              ${buttons.map((b, i) => `<button type="button" class="btn ${b.kind === "secondary" ? "btn-secondary" : b.kind === "danger" ? "btn-danger" : ""}" data-modal-btn="${i}">${esc(b.label)}</button>`).join("")}
            </div>
          </div>
        </div>`;
      const dialog = $(".modal", root);
      const focusables = () => [...dialog.querySelectorAll("button, a[href], input, select, textarea")].filter((el) => !el.disabled);
      const close = (value) => {
        root.innerHTML = "";
        document.removeEventListener("keydown", onKey, true);
        if (previous && previous.focus) previous.focus();
        resolve(value);
      };
      const cancelValue = (buttons.find((b) => b.cancel) || buttons[buttons.length - 1]).value;
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); close(cancelValue); }
        if (e.key === "Tab") {
          const f = focusables();
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      }
      document.addEventListener("keydown", onKey, true);
      root.querySelectorAll("[data-modal-btn]").forEach((btn) => {
        btn.addEventListener("click", () => close(buttons[Number(btn.dataset.modalBtn)].value));
      });
      const primary = dialog.querySelector("input, select, textarea") || dialog.querySelector("[data-modal-btn]");
      if (primary) primary.focus();
    });
  }

  function confirmModal(title, bodyHtml, confirmLabel, danger) {
    return modal({
      title,
      body: bodyHtml,
      buttons: [
        { label: confirmLabel, value: true, kind: danger ? "danger" : "" },
        { label: "Cancel", value: false, kind: "secondary", cancel: true },
      ],
    });
  }

  // ---------- API ----------

  async function accessToken() {
    const { data } = await S.sb.auth.getSession();
    return data.session ? data.session.access_token : null;
  }

  async function api(path, opts) {
    const o = opts || {};
    const token = await accessToken();
    if (!token) { await signedOut("Please sign in again."); throw new Error("signed out"); }
    let res;
    try {
      res = await fetch(`/api/${path}`, {
        method: o.method || "GET",
        headers: { Authorization: `Bearer ${token}`, ...(o.body ? { "Content-Type": "application/json" } : {}) },
        body: o.body ? JSON.stringify(o.body) : undefined,
      });
    } catch (e) {
      const err = new Error("Couldn't reach the server. Check your internet connection and try again.");
      err.network = true;
      throw err;
    }
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401) {
      await signedOut(data.error || "Your session has expired. Please sign in again.");
      throw new Error(data.error || "signed out");
    }
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status}).`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ---------- Auth screens ----------

  function showAuth(mode, message, kind) {
    $("#dashboard").hidden = true;
    $("#draft-bar").hidden = true;
    $("#signout-btn").hidden = mode !== "password";
    $("#auth-screen").hidden = false;
    $("#login-form").hidden = mode !== "login";
    $("#forgot-form").hidden = mode !== "forgot";
    $("#password-form").hidden = mode !== "password";
    $("#auth-title").textContent = { login: "Sign in", forgot: "Reset your password", password: "Create your password" }[mode];
    $("#auth-intro").hidden = mode !== "login";
    const msg = $("#auth-message");
    if (message) {
      msg.textContent = message;
      msg.className = `notice notice-${kind || "info"}`;
      msg.hidden = false;
    } else {
      msg.hidden = true;
    }
    const first = $(`#${mode === "login" ? "login-email" : mode === "forgot" ? "forgot-email" : "new-password"}`);
    if (first) first.focus();
  }

  async function signedOut(message) {
    try { await S.sb.auth.signOut({ scope: "local" }); } catch (e) { /* already signed out */ }
    S.me = null;
    S.editing = null;
    showAuth("login", message, "info");
  }

  function wireAuthForms() {
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#login-email").value.trim();
      const password = $("#login-password").value;
      if (!email || !password) return showAuth("login", "Enter your email and password.", "error");
      const btn = $("#login-submit");
      btn.disabled = true;
      btn.textContent = "Signing in…";
      const { error } = await S.sb.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      btn.textContent = "Sign in";
      if (error) {
        const msg = /invalid/i.test(error.message)
          ? "That email and password don't match. Check for typos, or use “Forgot your password?”."
          : /rate|too many/i.test(error.message)
            ? "Too many attempts. Please wait a few minutes and try again."
            : `Couldn't sign in: ${error.message}`;
        return showAuth("login", msg, "error");
      }
      $("#login-password").value = "";
      await enterDashboard();
    });

    $("#forgot-btn").addEventListener("click", () => {
      $("#forgot-email").value = $("#login-email").value;
      showAuth("forgot");
    });
    $("#back-to-login").addEventListener("click", () => showAuth("login"));

    $("#forgot-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#forgot-email").value.trim();
      if (!email) return showAuth("forgot", "Enter your email address.", "error");
      const { error } = await S.sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/` });
      if (error) {
        return showAuth("forgot", "We couldn't send the email right now. Ask Shikhar for a password-reset link instead — he can create one from Settings → Team access.", "error");
      }
      showAuth("login", "If that email has an account, a reset link is on its way. It can take a few minutes — check your spam folder too. No email after 10 minutes? Ask Shikhar for a reset link.", "success");
    });

    $("#password-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = $("#new-password").value;
      const b = $("#new-password-2").value;
      if (a.length < 10) return showAuth("password", "Please use at least 10 characters.", "error");
      if (a !== b) return showAuth("password", "The two passwords don't match.", "error");
      const { error } = await S.sb.auth.updateUser({ password: a });
      if (error) return showAuth("password", `Couldn't save the password: ${error.message}`, "error");
      $("#new-password").value = "";
      $("#new-password-2").value = "";
      toast("Password saved. You're signed in.", "success");
      await enterDashboard();
    });

    $("#signout-btn").addEventListener("click", async () => {
      if (S.editing && S.editing.dirty) {
        const ok = await confirmModal("Sign out?", "<p>You have changes on this page that aren't saved as a draft yet. Signing out will lose them.</p>", "Sign out anyway", true);
        if (!ok) return;
      }
      await S.sb.auth.signOut();
      S.editing = null;
      showAuth("login", "You've signed out.", "success");
    });
  }

  // One-time setup/reset links created from Settings -> Team access look like
  // /admin/?setup=<token>&type=invite|recovery
  async function handleSetupLink() {
    const params = new URLSearchParams(location.search);
    const token = params.get("setup");
    const type = params.get("type");
    if (!token) return false;
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
    const { data, error } = await S.sb.auth.verifyOtp({ token_hash: token, type: type === "invite" ? "invite" : "recovery" });
    if (error || !data.session) {
      showAuth("login", "That sign-in link has expired or was already used. Ask Shikhar to send you a new one (links work once).", "error");
      return true;
    }
    $("#password-for").textContent = `Signed in as ${data.session.user.email}. Choose a password you'll use to sign in from now on.`;
    showAuth("password", type === "invite" ? "Welcome! Create a password to finish setting up your account." : "Choose a new password.", "success");
    return true;
  }

  async function enterDashboard() {
    try {
      S.me = await api("me");
    } catch (e) {
      if (e.status === 403) {
        await S.sb.auth.signOut();
        return showAuth("login", e.message, "error");
      }
      return showAuth("login", e.message, "error");
    }
    $("#auth-screen").hidden = true;
    $("#dashboard").hidden = false;
    $("#signout-btn").hidden = false;
    resetIdle();
    await loadContent();
    if (!location.hash || location.hash === "#") location.hash = "#/overview";
    else route();
    resumeTracking();
  }

  // ---------- Content state ----------

  async function loadContent() {
    view().innerHTML = '<p class="loading">Loading your content…</p>';
    const data = await api("content");
    S.headSha = data.headSha;
    S.publishing = data.publishing;
    S.docs = {};
    Object.entries(data.docs).forEach(([name, d]) => {
      S.docs[name] = {
        live: d.live,
        liveSha: d.liveSha,
        draft: d.draft,
        working: clone(d.draft ? Schema.mergeManaged(name, d.live, d.draft.content) : d.live),
        baseSha: d.draft ? d.draft.baseSha : d.liveSha,
      };
    });
    updateDraftIndicators();
  }

  function workingDocs() {
    return Object.fromEntries(Object.entries(S.docs).map(([k, v]) => [k, v.working]));
  }
  function liveDocs() {
    return Object.fromEntries(Object.entries(S.docs).map(([k, v]) => [k, v.live]));
  }

  function listOf(colName, docs) {
    const col = Schema.COLLECTIONS[colName];
    const d = (docs || workingDocs())[col.doc];
    return col.key === null ? d : d[col.key];
  }

  function withList(colName, mutate) {
    const col = Schema.COLLECTIONS[colName];
    const next = clone(S.docs[col.doc].working);
    const list = col.key === null ? next : next[col.key];
    mutate(list, next);
    return next;
  }

  function pendingChanges() {
    return Schema.summarizeChanges(liveDocs(), workingDocs());
  }

  function hasDrafts() {
    return Object.values(S.docs).some((d) => d.draft);
  }

  function updateDraftIndicators() {
    const changes = hasDrafts() ? pendingChanges() : [];
    const badge = $("#draft-badge");
    const bar = $("#draft-bar");
    if (changes.length) {
      badge.textContent = changes.length;
      badge.hidden = false;
      bar.innerHTML = `<span><strong>${plural(changes.length, "unpublished change")}</strong> saved as a draft — not on the live website yet.</span>
        <a class="btn btn-small" href="#/publish">Review &amp; Publish</a>`;
      bar.hidden = false;
    } else {
      badge.hidden = true;
      bar.hidden = true;
    }
  }

  async function saveDoc(docName, nextWorking) {
    const d = S.docs[docName];
    const res = await api("draft", { method: "PUT", body: { doc: docName, content: nextWorking, baseSha: d.baseSha } });
    d.draft = res.draft;
    d.working = Schema.mergeManaged(docName, d.live, res.draft.content);
    updateDraftIndicators();
    return res;
  }

  function fieldOptions() {
    return (S.docs.roadmap.working.fields || []).map((f) => ({ id: f.id, name: f.name }));
  }

  // ---------- Router ----------

  const ROUTES = [
    [/^\/overview$/, () => renderOverview()],
    [/^\/c\/([a-z]+)$/, (m) => renderList(m[1])],
    [/^\/c\/([a-z]+)\/new$/, (m) => openEditor(m[1], -1)],
    [/^\/c\/([a-z]+)\/(\d+)$/, (m) => openEditor(m[1], Number(m[2]))],
    [/^\/publish$/, () => renderPublish()],
    [/^\/history$/, () => renderHistory()],
    [/^\/settings$/, () => renderSettings()],
    [/^\/help$/, () => renderHelp()],
  ];

  async function route() {
    if (!S.me) return;
    const path = location.hash.replace(/^#/, "") || "/overview";
    if (S.editing && S.editing.dirty && path !== S.route) {
      const choice = await unsavedPrompt();
      if (choice === "stay") {
        S.suppressHash = true;
        location.hash = `#${S.route}`;
        return;
      }
      if (choice === "save") {
        const ok = await saveEditing();
        if (!ok) { S.suppressHash = true; location.hash = `#${S.route}`; return; }
      }
    }
    if (!path.startsWith("/c/") || !/\/(\d+|new)$/.test(path)) S.editing = null;
    S.route = path;
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const key = a.dataset.nav;
      const active = path === `/${key}` || path.startsWith(`/c/${key}`) || (key === "overview" && path === "/overview");
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("#sidebar").classList.remove("open");
    $("#sidebar-toggle").setAttribute("aria-expanded", "false");
    const r = ROUTES.find(([re]) => re.test(path));
    if (!r) { location.hash = "#/overview"; return; }
    try {
      await r[1](path.match(r[0]));
    } catch (e) {
      view().innerHTML = `<div class="notice notice-error"><p>${esc(e.message)}</p><p><button type="button" class="btn btn-small" data-action="reload">Try again</button></p></div>`;
    }
    view().focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function unsavedPrompt() {
    return modal({
      title: "You have unsaved changes",
      body: "<p>The changes on this page aren't saved yet. Save them as a draft before leaving?</p>",
      buttons: [
        { label: "Save draft", value: "save" },
        { label: "Discard changes", value: "discard", kind: "danger" },
        { label: "Keep editing", value: "stay", kind: "secondary", cancel: true },
      ],
    });
  }

  // ---------- Overview ----------

  async function renderOverview() {
    const w = workingDocs();
    const counts = Object.entries(Schema.COLLECTIONS).filter(([, c]) => !c.object).map(([name, c]) => ({
      name, label: c.label, n: (listOf(name, w) || []).length,
    }));
    const changes = hasDrafts() ? pendingChanges() : [];
    view().innerHTML = `
      <h1>Welcome back</h1>
      <p class="muted-note">Signed in as ${esc(S.me.email)}</p>
      ${S.publishing ? "" : `<div class="notice notice-warning"><p><strong>Publishing isn't connected yet.</strong> You can edit and save drafts, but the Publish button stays off until Shikhar finishes the server setup.</p></div>`}
      <section class="card status-card" aria-labelledby="status-h">
        <h2 id="status-h">Website status</h2>
        ${changes.length
          ? `<p><strong>${plural(changes.length, "change")}</strong> saved as a draft and not yet live.</p>
             <p><a class="btn" href="#/publish">Review &amp; Publish</a></p>`
          : `<p>✓ Everything you've saved is live on the website.</p>`}
        <div id="tracking-slot"></div>
      </section>

      <section aria-labelledby="quick-h">
        <h2 id="quick-h">Quick actions</h2>
        <div class="quick-grid">
          <a class="quick-card" href="#/c/fields">✏️ Edit a career field</a>
          <a class="quick-card" href="#/c/fields/new">➕ Add a career field</a>
          <a class="quick-card" href="#/c/jobs/new">💼 Add a job listing</a>
          <a class="quick-card" href="#/c/questions/new">🎤 Add an interview question</a>
          <a class="quick-card" href="#/c/resources/new">🔗 Add a career resource</a>
          <a class="quick-card" href="#/history">🕘 Undo / restore an earlier version</a>
        </div>
      </section>

      <section aria-labelledby="content-h">
        <h2 id="content-h">Your content</h2>
        <div class="count-grid">
          ${counts.map((c) => `<a class="count-card" href="#/c/${c.name}"><span class="count-n">${c.n}</span><span>${esc(c.label)}</span></a>`).join("")}
        </div>
      </section>

      <section aria-labelledby="apps-h">
        <h2 id="apps-h">The live website</h2>
        <ul class="link-list">
          <li><a href="../#/" target="_blank" rel="noopener">Career Roadmap (home page) ↗</a></li>
          <li><a href="../#/majors" target="_blank" rel="noopener">College Majors ↗</a></li>
          <li><a href="../#/skills" target="_blank" rel="noopener">Developmental Skills ↗</a></li>
          <li><a href="../#/interview" target="_blank" rel="noopener">Interview Prep ↗</a></li>
          <li><a href="../#/worksheet" target="_blank" rel="noopener">Worksheet Generator ↗</a></li>
          <li><a href="../#/resources" target="_blank" rel="noopener">Resources ↗</a></li>
          <li><a href="../jobs/" target="_blank" rel="noopener">Job Finder ↗</a></li>
        </ul>
      </section>

      <section aria-labelledby="recent-h">
        <h2 id="recent-h">Recently published</h2>
        <div id="recent-slot"><p class="loading">Loading…</p></div>
      </section>`;
    renderTrackingInto($("#tracking-slot"));
    const slot = $("#recent-slot");
    if (!S.publishing) { slot.innerHTML = '<p class="muted-note">Available once publishing is connected.</p>'; return; }
    try {
      const h = await api("history");
      const recent = h.versions.slice(0, 5);
      slot.innerHTML = recent.length
        ? `<ul class="history-mini">${recent.map((v) => `<li><strong>${esc(fmtDate(v.date))}</strong> — ${esc(v.publishedBy)}${v.changes ? `: ${esc(v.changes.slice(0, 3).map((c) => `${c.type} “${c.title}”`).join(", "))}${v.changes.length > 3 ? "…" : ""}` : `: ${esc(v.message)}`}</li>`).join("")}</ul>
           <p><a href="#/history">See full version history →</a></p>`
        : '<p class="muted-note">Nothing published yet.</p>';
    } catch (e) {
      slot.innerHTML = `<p class="muted-note">${esc(e.message)}</p>`;
    }
  }

  // ---------- Collection list ----------

  function badgeFor(colName, item, liveList) {
    const col = Schema.COLLECTIONS[colName];
    const key = col.idKey || col.uniqueKey;
    if (!key) return "";
    const liveItem = (liveList || []).find((x) => String(x[key]).toLowerCase() === String(item[key]).toLowerCase());
    if (!liveItem) return '<span class="tag tag-new">New — not published</span>';
    if (Schema.stable(liveItem) !== Schema.stable(item)) return '<span class="tag tag-draft">Edited — not published</span>';
    return "";
  }

  function renderList(colName, filterText) {
    const col = Schema.COLLECTIONS[colName];
    if (!col) { location.hash = "#/overview"; return; }
    if (col.object) return openEditor(colName, 0);
    const list = listOf(colName) || [];
    const liveList = listOf(colName, liveDocs()) || [];
    const removed = liveList.filter((li) => {
      const key = col.idKey || col.uniqueKey;
      return key && !list.some((x) => String(x[key]).toLowerCase() === String(li[key]).toLowerCase());
    });
    const q = (filterText || "").trim().toLowerCase();
    const rows = list.map((item, i) => ({ item, i })).filter(({ item }) => !q || JSON.stringify(item).toLowerCase().includes(q));
    const fieldNames = Object.fromEntries(fieldOptions().map((f) => [f.id, f.name]));

    view().innerHTML = `
      <div class="view-head">
        <h1>${esc(col.label)}</h1>
        <a class="btn" href="#/c/${colName}/new">+ Add ${esc(col.singular)}</a>
      </div>
      ${listIntro(colName)}
      <div class="form-field search-field">
        <label for="list-search">Search ${esc(col.label.toLowerCase())}</label>
        <input type="search" id="list-search" value="${esc(filterText || "")}" placeholder="Type to filter…" />
      </div>
      <p class="muted-note" aria-live="polite">${q ? `${rows.length} of ${list.length} shown` : plural(list.length, col.singular)}${q ? "" : " · use ↑ ↓ to change the order they appear on the website"}</p>
      <ul class="item-list">
        ${rows.map(({ item, i }) => `
          <li class="item-card">
            <div class="item-card-main">
              <a class="item-card-title" href="#/c/${colName}/${i}">${esc(Schema.itemTitle(colName, item))}</a>
              ${badgeFor(colName, item, liveList)}
              ${colName === "jobs" ? `<span class="tag ${item.isSampleData === false ? "tag-real" : "tag-sample"}">${item.isSampleData === false ? "Real listing" : "Sample"}</span>` : ""}
              <div class="item-card-sub">${esc(subtitleFor(colName, item, fieldNames))}</div>
            </div>
            <div class="item-card-actions">
              ${q ? "" : `<button type="button" class="icon-btn" data-list-move="up" data-index="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(Schema.itemTitle(colName, item))} up">↑</button>
              <button type="button" class="icon-btn" data-list-move="down" data-index="${i}" ${i === list.length - 1 ? "disabled" : ""} aria-label="Move ${esc(Schema.itemTitle(colName, item))} down">↓</button>`}
              <a class="btn btn-secondary btn-small" href="#/c/${colName}/${i}">Edit</a>
              <button type="button" class="btn btn-danger btn-small" data-list-delete="${i}">Delete</button>
            </div>
          </li>`).join("") || `<li class="empty-state">${q ? "Nothing matches that search." : `No ${esc(col.label.toLowerCase())} yet.`}</li>`}
      </ul>
      ${removed.length ? `<div class="notice notice-warning"><p><strong>Deleted in your draft (still live until you publish):</strong> ${removed.map((r) => esc(Schema.itemTitle(colName, r))).join(", ")}</p></div>` : ""}`;

    const search = $("#list-search");
    search.addEventListener("input", () => {
      const pos = search.selectionStart;
      renderList(colName, search.value);
      const s2 = $("#list-search");
      s2.focus();
      s2.setSelectionRange(pos, pos);
    });
    view().querySelectorAll("[data-list-move]").forEach((btn) => btn.addEventListener("click", () => moveItem(colName, Number(btn.dataset.index), btn.dataset.listMove)));
    view().querySelectorAll("[data-list-delete]").forEach((btn) => btn.addEventListener("click", () => deleteItem(colName, Number(btn.dataset.listDelete))));
  }

  function subtitleFor(colName, item, fieldNames) {
    switch (colName) {
      case "jobs": return `${item.company} · ${fieldNames[item.fieldId] || item.fieldId || "no field"} · ${item.location}`;
      case "majors": return `Leads to: ${(item.leadsToFields || []).map((f) => fieldNames[f] || f).join(", ") || "—"}`;
      case "skills": return plural((item.resources || []).length, "resource");
      case "questions": return `${item.category} · ${item.subcategory} · ${item.difficulty}`;
      case "fields": return `${plural((item.certifications || []).length, "certification")} · ${(item.companies || []).length} ${(item.companies || []).length === 1 ? "company" : "companies"}`;
      default: {
        const col = Schema.COLLECTIONS[colName];
        const s = col.subtitleKey ? String(item[col.subtitleKey] || "") : "";
        return s.length > 140 ? `${s.slice(0, 140)}…` : s;
      }
    }
  }

  function listIntro(colName) {
    const notes = {
      fields: "Each career field has its own page on the website with a five-year pathway, companies, certifications, graduate programs, conferences, organizations, and media links.",
      majors: "Majors appear on the College Majors page. Each one links to the career fields it leads to.",
      skills: "Skills appear on the Developmental Skills page with their learning resources.",
      resources: "Resources appear on the Resources page.",
      questions: "Questions appear in Interview Prep → Step 6 (Question Bank). Students' saved practice answers stay attached to existing questions.",
      stages: "The stages appear in Interview Prep → Step 2 (The Interview Process).",
      jobs: "Listings appear in the Job Finder. Mark anything that isn't a real, currently open job as a Sample.",
    };
    return notes[colName] ? `<p class="muted-note">${esc(notes[colName])}</p>` : "";
  }

  async function moveItem(colName, index, dir) {
    const j = dir === "up" ? index - 1 : index + 1;
    const next = withList(colName, (list) => { [list[index], list[j]] = [list[j], list[index]]; });
    try {
      await saveDoc(Schema.COLLECTIONS[colName].doc, next);
      toast("Order saved as a draft.", "success");
      renderList(colName);
      const btn = view().querySelector(`[data-list-move="${dir}"][data-index="${j}"]`);
      if (btn && !btn.disabled) btn.focus();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function deleteItem(colName, index) {
    const col = Schema.COLLECTIONS[colName];
    const item = listOf(colName)[index];
    const title = Schema.itemTitle(colName, item);
    if (colName === "fields") {
      const refs = Schema.fieldReferences(item.id, workingDocs());
      if (refs.length) {
        await modal({
          title: "This career field is still linked",
          body: `<p>“${esc(title)}” can't be deleted yet because these still point to it:</p>
            <ul>${refs.map((r) => `<li>${esc(Schema.COLLECTIONS[r.collection].label)}: ${esc(r.title)}</li>`).join("")}</ul>
            <p>Edit those first (choose a different career field or remove the link), then delete this field.</p>`,
          buttons: [{ label: "OK", value: true }],
        });
        return;
      }
    }
    const extra = colName === "questions" ? "<p>Students who saved practice answers for this question won't see them anymore.</p>" : "";
    const ok = await confirmModal(`Delete this ${col.singular}?`,
      `<p>“${esc(title)}” will be removed from your draft. It stays on the live website until you publish, and you can always restore it later from Version History.</p>${extra}`,
      "Delete", true);
    if (!ok) return;
    const next = withList(colName, (list) => { list.splice(index, 1); });
    try {
      await saveDoc(col.doc, next);
      toast(`Deleted “${title}” (draft — publish to update the website).`, "success");
      if (S.route !== `/c/${colName}`) location.hash = `#/c/${colName}`;
      else renderList(colName);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------- Item editor ----------

  function openEditor(colName, index) {
    const col = Schema.COLLECTIONS[colName];
    if (!col) { location.hash = "#/overview"; return; }
    if (!S.editing || S.editing.collection !== colName || S.editing.index !== index) {
      let value;
      if (col.object) value = Object.fromEntries(col.item.map((s) => [s.key, clone(S.docs[col.doc].working[s.key])]));
      else if (index === -1) value = col.newItem();
      else {
        const list = listOf(colName);
        if (!list[index]) { location.hash = `#/c/${colName}`; return; }
        value = clone(list[index]);
      }
      S.editing = { collection: colName, index, value, dirty: false, errors: {}, isNew: index === -1 };
    }
    renderEditor();
  }

  function renderEditor() {
    const ed = S.editing;
    const col = Schema.COLLECTIONS[ed.collection];
    const title = col.object ? col.label : ed.isNew ? `New ${col.singular}` : Schema.itemTitle(ed.collection, ed.value);
    const scroll = window.scrollY;
    const active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.path : null;
    view().innerHTML = `
      <p class="breadcrumb">${col.object ? "" : `<a href="#/c/${ed.collection}">← All ${esc(col.label.toLowerCase())}</a>`}</p>
      <div class="view-head">
        <h1>${esc(title)}</h1>
        ${ed.dirty ? '<span class="tag tag-draft">Unsaved changes</span>' : ""}
      </div>
      ${col.object ? '<p class="muted-note">These lists appear in the Interview Prep guide. The STAR worksheet, “Tell Me About Yourself” builder, technical prep, and self-review checklists are maintained by a developer.</p>' : ""}
      ${ed.collection === "jobs" ? '<p class="notice notice-info">Only mark a listing as real if you\'ve confirmed the job is open right now and you have the link to the original posting. Real listings show the date you last checked them.</p>' : ""}
      ${Object.keys(ed.errors).length ? `<div class="notice notice-error" role="alert"><p><strong>Please check the highlighted fields.</strong> Your draft can still be saved, but these must be fixed before publishing.</p></div>` : ""}
      <form id="editor-form" class="editor-form" novalidate>
        ${col.idKey && !ed.isNew ? `<details class="advanced"><summary>Advanced</summary><p class="muted-note">Internal ID: <code>${esc(ed.value[col.idKey])}</code> (used in links; it never changes)</p></details>` : ""}
        ${Forms.render(col.item, ed.value, { errors: ed.errors, fieldOptions: fieldOptions() })}
      </form>
      <div class="editor-actions" role="group" aria-label="Save options">
        <button type="button" class="btn" id="save-draft-btn">Save draft</button>
        <button type="button" class="btn btn-secondary" id="preview-btn">Preview on website</button>
        ${col.object ? "" : `<a class="btn btn-secondary" href="#/c/${ed.collection}">Back to list</a>`}
        ${!col.object && !ed.isNew ? '<button type="button" class="btn btn-danger" id="delete-btn">Delete</button>' : ""}
      </div>`;
    window.scrollTo(0, scroll);
    if (active) {
      const el = view().querySelector(`[data-path="${CSS.escape(active)}"]`);
      if (el) el.focus({ preventScroll: true });
    }
    const form = $("#editor-form");
    form.addEventListener("input", onEditorInput);
    form.addEventListener("change", onEditorInput);
    form.addEventListener("click", onEditorAction);
    form.addEventListener("submit", (e) => e.preventDefault());
    $("#save-draft-btn").addEventListener("click", () => saveEditing());
    $("#preview-btn").addEventListener("click", () => previewEditing());
    const del = $("#delete-btn");
    if (del) del.addEventListener("click", () => deleteItem(ed.collection, ed.index));
  }

  function onEditorInput(e) {
    if (!Forms.applyInput(S.editing.value, e.target)) return;
    if (!S.editing.dirty) {
      S.editing.dirty = true;
      const head = $(".view-head");
      if (head && !head.querySelector(".tag-draft")) head.insertAdjacentHTML("beforeend", '<span class="tag tag-draft">Unsaved changes</span>');
    }
    if (e.target.type === "url") updateTestLink(e.target);
    // Checkbox clicks can show/hide related fields, so redraw. Never redraw on blur of a
    // text box: that would swap out the button the user is in the middle of clicking.
    if (e.type === "change" && e.target.dataset.kind === "bool") renderEditor();
  }

  function updateTestLink(input) {
    const row = input.closest(".url-row");
    if (!row) return;
    let link = row.querySelector("a");
    const url = input.value.trim();
    if (!Schema.isHttpUrl(url)) { if (link) link.remove(); return; }
    if (!link) {
      link = document.createElement("a");
      link.className = "btn btn-secondary btn-small";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Test link ↗";
      row.appendChild(link);
    }
    link.href = url;
  }

  function onEditorAction(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const col = Schema.COLLECTIONS[S.editing.collection];
    const changed = Forms.applyAction(col.item, S.editing.value, btn.dataset.action, btn.dataset.path, Number(btn.dataset.index));
    if (!changed) return;
    S.editing.dirty = true;
    renderEditor();
    if (btn.dataset.action === "add") {
      const list = Forms.getAt(S.editing.value, btn.dataset.path);
      const target = view().querySelector(`[data-path^="${CSS.escape(`${btn.dataset.path}.${list.length - 1}`)}"]`);
      if (target) target.focus();
    }
  }

  // Applies the editor's value to a copy of the working document. Returns
  // { next, index, item } or null when the item can't be saved yet.
  function applyEditingToDoc() {
    const ed = S.editing;
    const col = Schema.COLLECTIONS[ed.collection];
    if (col.object) {
      const next = clone(S.docs[col.doc].working);
      col.item.forEach((s) => { next[s.key] = ed.value[s.key]; });
      return { next: Schema.sanitizeDoc(col.doc, next), index: 0 };
    }
    const item = Schema.sanitizeItem(ed.collection, ed.value);
    if (col.titleKey && !item[col.titleKey]) return null;
    let index = ed.index;
    const next = withList(ed.collection, (list) => {
      if (ed.isNew) {
        if (col.idKey) {
          const ids = list.map((x) => x[col.idKey]);
          item[col.idKey] = Schema.uniqueId(col.makeId(item, ids), ids);
        }
        list.push(item);
        index = list.length - 1;
      } else {
        if (col.idKey) item[col.idKey] = list[index][col.idKey];
        list[index] = item;
      }
    });
    return { next: Schema.sanitizeDoc(col.doc, next), index, item };
  }

  function editingErrors(nextDoc, index) {
    const ed = S.editing;
    const col = Schema.COLLECTIONS[ed.collection];
    const docs = { ...workingDocs(), [col.doc]: nextDoc };
    const all = Schema.validateDocs(docs).filter((e) => e.collection === ed.collection && (col.object || e.index === index));
    return Forms.errorsByPath(all, col.object ? ed.collection : `${ed.collection}.${index}`);
  }

  async function saveEditing() {
    const ed = S.editing;
    const col = Schema.COLLECTIONS[ed.collection];
    const applied = applyEditingToDoc();
    if (!applied) {
      const label = col.item.find((s) => s.key === col.titleKey).label;
      ed.errors = { [col.titleKey]: [`"${label}" is required before you can save.`] };
      renderEditor();
      toast(`Please fill in “${label}” first.`, "error");
      return false;
    }
    const btn = $("#save-draft-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    try {
      await saveDoc(col.doc, applied.next);
      ed.errors = editingErrors(S.docs[col.doc].working, applied.index);
      const wasNew = ed.isNew;
      ed.isNew = false;
      ed.index = applied.index;
      ed.dirty = false;
      if (!col.object) ed.value = clone(listOf(ed.collection)[applied.index]);
      const problems = Object.keys(ed.errors).length;
      toast(problems
        ? `Draft saved. ${plural(problems, "thing")} need fixing before you can publish.`
        : "Draft saved. It's not on the live website until you publish.", problems ? "warning" : "success");
      if (wasNew && !col.object) {
        S.route = `/c/${ed.collection}/${applied.index}`;
        S.suppressHash = true;
        location.hash = `#${S.route}`;
      }
      renderEditor();
      return true;
    } catch (e) {
      toast(`Couldn't save: ${e.message} Your changes are still on this page — try again.`, "error");
      if (btn) { btn.disabled = false; btn.textContent = "Save draft"; }
      return false;
    }
  }

  // ---------- Preview ----------

  function previewEditing() {
    const ed = S.editing;
    const col = Schema.COLLECTIONS[ed.collection];
    const applied = applyEditingToDoc();
    const docs = workingDocs();
    if (applied) docs[col.doc] = applied.next;
    let target = "../";
    if (col.previewPage === "jobs") target = "../jobs/";
    else if (col.previewHash) {
      const item = applied && applied.item ? applied.item : ed.value;
      target = `../${col.previewHash(item)}`;
    }
    openPreview(docs, target, ed.dirty ? "Showing your unsaved edits." : "Showing your draft.");
  }

  function openPreview(docs, target, note) {
    S.previewData = { roadmap: docs.roadmap, jobs: docs.jobs, interview: docs.interview };
    const [base, hash] = target.split("#");
    const src = `${base}?cms-preview=1${hash ? `#${hash}` : ""}`;
    const root = $("#modal-root");
    root.innerHTML = `
      <div class="modal-backdrop preview-backdrop">
        <div class="preview-shell" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div class="preview-bar">
            <h2 id="preview-title">Preview — not published</h2>
            <span class="muted-note">${esc(note || "")} Only you can see this.</span>
            <span class="preview-tabs">
              <button type="button" class="btn btn-secondary btn-small" data-preview-go="../">Home</button>
              <button type="button" class="btn btn-secondary btn-small" data-preview-go="../#/majors">Majors</button>
              <button type="button" class="btn btn-secondary btn-small" data-preview-go="../#/interview">Interview</button>
              <button type="button" class="btn btn-secondary btn-small" data-preview-go="../jobs/">Jobs</button>
            </span>
            <button type="button" class="btn btn-small" id="preview-close">Close preview</button>
          </div>
          <iframe id="preview-frame" title="Website preview" src="${esc(src)}"></iframe>
        </div>
      </div>`;
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey, true); };
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey, true);
    $("#preview-close").addEventListener("click", close);
    $("#preview-close").focus();
    root.querySelectorAll("[data-preview-go]").forEach((b) => b.addEventListener("click", () => {
      const [b2, h2] = b.dataset.previewGo.split("#");
      $("#preview-frame").src = `${b2}?cms-preview=1${h2 ? `#${h2}` : ""}`;
    }));
  }

  // The preview iframe (same origin) asks for the draft data once it has loaded.
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "cms-preview-ready") return;
    const frame = $("#preview-frame");
    if (!frame || e.source !== frame.contentWindow || !S.previewData) return;
    frame.contentWindow.postMessage({ type: "cms-preview-data", ...S.previewData }, location.origin);
  });

  // ---------- Review & Publish ----------

  async function renderPublish() {
    view().innerHTML = '<h1>Review &amp; Publish</h1><p class="loading">Checking your changes…</p>';
    if (!hasDrafts()) {
      view().innerHTML = `<h1>Review &amp; Publish</h1>
        <div class="card"><p>✓ There's nothing waiting to be published. Everything you've saved is live.</p>
        <p><a href="../" target="_blank" rel="noopener">View the live website ↗</a></p></div>
        <div id="tracking-slot"></div>`;
      renderTrackingInto($("#tracking-slot"));
      return;
    }
    let report;
    if (S.publishing) {
      report = await api("publish", { method: "POST", body: { dryRun: true } });
    } else {
      const errors = Schema.validateDocs(workingDocs());
      report = { changes: pendingChanges(), errors, conflicts: [] };
    }
    const changes = report.changes || [];
    const grouped = {};
    changes.forEach((c) => { (grouped[c.collection] = grouped[c.collection] || []).push(c); });
    const indexOf = (e) => (e.index === null || e.index === undefined ? "" : `/${e.index}`);
    view().innerHTML = `
      <h1>Review &amp; Publish</h1>
      <p>These changes are saved as a draft. Nobody else can see them until you publish.</p>
      <div id="tracking-slot"></div>
      ${report.conflicts && report.conflicts.length ? `<div class="notice notice-warning"><p><strong>Heads up:</strong> the live website was updated after you started these drafts (${report.conflicts.map((c) => esc(c.label)).join(", ")}). When you publish you'll be asked whether to keep your version.</p></div>` : ""}
      ${report.errors.length ? `<div class="notice notice-error" role="alert"><p><strong>${plural(report.errors.length, "thing")} must be fixed before publishing:</strong></p>
        <ul>${report.errors.slice(0, 30).map((e) => `<li>${e.collection && Schema.COLLECTIONS[e.collection] ? `<a href="#/c/${e.collection}${Schema.COLLECTIONS[e.collection].object ? "" : indexOf(e)}">${esc(Schema.COLLECTIONS[e.collection].label)}${e.item ? ` — ${esc(e.item)}` : ""}</a>: ` : ""}${esc(e.message)}</li>`).join("")}</ul></div>` : ""}
      <section class="card">
        <h2>What will change (${changes.length})</h2>
        ${changes.length ? Object.entries(grouped).map(([colName, list]) => `
          <h3>${esc(Schema.COLLECTIONS[colName].label)}</h3>
          <ul class="change-list">${list.map((c) => `<li><span class="tag tag-${c.type}">${esc(c.type)}</span> ${esc(c.title)}</li>`).join("")}</ul>`).join("")
          : "<p>Your drafts match the live website — publishing will just clear them.</p>"}
      </section>
      <div class="editor-actions">
        <button type="button" class="btn btn-secondary" id="preview-all-btn">Preview whole website</button>
        <button type="button" class="btn" id="publish-btn" ${!S.publishing || report.errors.length ? "disabled" : ""}>Publish to live website</button>
        <button type="button" class="btn btn-danger" id="discard-btn">Discard all unpublished changes</button>
      </div>
      ${S.publishing ? "" : '<p class="muted-note">Publishing turns on once Shikhar connects the website to GitHub. Your drafts are saved safely until then.</p>'}`;
    renderTrackingInto($("#tracking-slot"));
    $("#preview-all-btn").addEventListener("click", () => openPreview(workingDocs(), "../", "Showing all your drafts."));
    $("#publish-btn").addEventListener("click", () => publish(changes));
    $("#discard-btn").addEventListener("click", discardAll);
  }

  async function publish(changes, overwrite) {
    if (!overwrite) {
      const removed = changes.filter((c) => c.type === "removed");
      const ok = await confirmModal("Publish to the live website?",
        `<p>This updates the public website for everyone (${plural(changes.length, "change")}).</p>
         ${removed.length ? `<p><strong>This deletes:</strong> ${removed.map((r) => esc(r.title)).join(", ")}</p>` : ""}
         <p>It usually takes 1–2 minutes to appear. If anything looks wrong afterwards, you can restore the previous version from Version History.</p>`,
        "Publish now");
      if (!ok) return;
    }
    const btn = $("#publish-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Publishing…"; }
    try {
      const res = await api("publish", { method: "POST", body: { overwrite: overwrite || [] } });
      if (res.nothingToPublish) {
        await loadContent();
        toast("Nothing changed compared to the live website, so there was nothing to publish.", "info");
        return renderPublish();
      }
      startTracking({ sha: res.commitSha, files: res.files, label: plural(res.changes.length, "change") });
      await loadContent();
      toast("Published! The website is updating now.", "success");
      renderPublish();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Publish to live website"; }
      if (e.data && e.data.code === "conflict") return resolveConflict(e.data.conflicts, changes);
      if (e.data && e.data.code === "invalid") { toast(e.message, "error"); return renderPublish(); }
      await modal({
        title: "Publishing didn't finish",
        body: `<p>${esc(e.message)}</p><p>Nothing on the live website changed, and your drafts are still saved. You can try again in a few minutes. If it keeps happening, contact Shikhar.</p>`,
        buttons: [{ label: "OK", value: true }],
      });
    }
  }

  async function resolveConflict(conflicts, changes) {
    const names = conflicts.map((c) => c.doc);
    const choice = await modal({
      title: "The live website changed while you were editing",
      body: `<p>Someone (or a developer update) changed <strong>${conflicts.map((c) => esc(c.label)).join(", ")}</strong> after you started your draft.</p>
        <p><strong>Keep my version</strong> publishes your draft and replaces those newer changes (they stay in Version History if you need them back).</p>
        <p><strong>Start over</strong> throws away your draft for those sections and loads the latest live version.</p>`,
      buttons: [
        { label: "Keep my version", value: "keep" },
        { label: "Start over from live version", value: "reset", kind: "danger" },
        { label: "Cancel", value: "cancel", kind: "secondary", cancel: true },
      ],
    });
    if (choice === "keep") return publish(changes, names);
    if (choice === "reset") {
      await Promise.all(names.map((d) => api(`draft?doc=${encodeURIComponent(d)}`, { method: "DELETE" })));
      await loadContent();
      toast("Loaded the latest live version.", "info");
      renderPublish();
    }
    return null;
  }

  async function discardAll() {
    const ok = await confirmModal("Discard all unpublished changes?",
      "<p>Every draft change will be thrown away and the dashboard will go back to what's on the live website. This can't be undone.</p>",
      "Discard everything", true);
    if (!ok) return;
    try {
      await Promise.all(Object.entries(S.docs).filter(([, d]) => d.draft).map(([name]) => api(`draft?doc=${name}`, { method: "DELETE" })));
      S.editing = null;
      await loadContent();
      toast("Drafts discarded.", "success");
      renderPublish();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------- Live status tracking ----------

  function startTracking(t) {
    S.tracking = { ...t, startedAt: Date.now(), state: "queued" };
    try { localStorage.setItem(PUBLISH_TRACK_KEY, JSON.stringify(S.tracking)); } catch (e) { /* convenience only */ }
    pollTracking();
  }

  function resumeTracking() {
    try {
      const t = JSON.parse(localStorage.getItem(PUBLISH_TRACK_KEY) || "null");
      if (t && Date.now() - t.startedAt < 30 * 60 * 1000 && t.state !== "live" && t.state !== "failed") {
        S.tracking = t;
        pollTracking();
      }
    } catch (e) { /* ignore */ }
  }

  let pollTimer = null;
  async function pollTracking() {
    clearTimeout(pollTimer);
    const t = S.tracking;
    if (!t || !S.me) return;
    try {
      const files = t.files.map((f) => `${f.path}:${f.sha}`).join(",");
      const s = await api(`status?sha=${t.sha}&files=${encodeURIComponent(files)}`);
      t.state = s.state;
      t.detail = s.detail || "";
    } catch (e) {
      t.detail = e.message;
    }
    try { localStorage.setItem(PUBLISH_TRACK_KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
    renderTrackingInto($("#tracking-slot"));
    if (t.state === "live") { toast("✓ Your changes are live on the website.", "success"); return; }
    if (t.state === "failed") return;
    pollTimer = setTimeout(pollTracking, Date.now() - t.startedAt > 3 * 60 * 1000 ? 15000 : 5000);
  }

  function renderTrackingInto(slot) {
    if (!slot) return;
    const t = S.tracking;
    if (!t) { slot.innerHTML = ""; return; }
    const order = ["queued", "deploying", "verifying", "live"];
    const idx = order.indexOf(t.state);
    const slow = Date.now() - t.startedAt > 10 * 60 * 1000 && t.state !== "live";
    const steps = [
      ["Saved to the website's files", idx >= 0],
      ["Website is rebuilding", idx >= 2 || t.state === "live"],
      ["Live on the website", t.state === "live"],
    ];
    slot.innerHTML = `
      <div class="tracker ${t.state === "failed" ? "tracker-failed" : t.state === "live" ? "tracker-live" : ""}" role="status" aria-live="polite">
        <h3>Latest publish (${esc(t.label || "")}) — ${t.state === "live" ? "✓ Live" : t.state === "failed" ? "Failed" : "Updating…"}</h3>
        ${t.state === "failed"
          ? `<p>The website couldn't be rebuilt, so the previous version is still showing (nothing is broken). Your content is saved — please let Shikhar know. ${t.detail ? `Details: ${esc(t.detail)}` : ""}</p>`
          : `<ol class="tracker-steps">${steps.map(([label, done], i) => `<li class="${done ? "done" : i === steps.findIndex((s) => !s[1]) ? "current" : ""}">${done ? "✓" : "○"} ${esc(label)}</li>`).join("")}</ol>`}
        ${t.state === "live" ? '<p><a href="../" target="_blank" rel="noopener">Open the live website ↗</a> (if you still see the old version, refresh the page)</p>' : ""}
        ${slow ? "<p>This is taking longer than usual. It's safe to leave this page — check back in a few minutes, or contact Shikhar if it never goes live.</p>" : ""}
      </div>`;
  }

  // ---------- History ----------

  async function renderHistory() {
    view().innerHTML = '<h1>Version History</h1><p class="loading">Loading…</p>';
    if (!S.publishing) {
      view().innerHTML = '<h1>Version History</h1><p class="notice notice-warning">Version history is available once publishing is connected.</p>';
      return;
    }
    const h = await api("history");
    const actionLabels = {
      publish: "Published", restore: "Restored a version", discard_draft: "Discarded a draft",
      team_invite: "Invited someone", team_link: "Created a sign-in link", team_set_role: "Changed someone's access",
    };
    view().innerHTML = `
      <h1>Version History</h1>
      <p>Every published version of the content is kept. If something went wrong, find the last good version and choose <strong>Restore</strong> — it's published as a new version, so a restore can be undone too.</p>
      <div id="tracking-slot"></div>
      <ul class="version-list">
        ${h.versions.map((v) => `
          <li class="version-card">
            <div>
              <strong>${esc(fmtDate(v.date))}</strong>
              ${v.current ? '<span class="tag tag-real">Live now</span>' : ""}
              ${v.kind === "restore" ? '<span class="tag tag-draft">Restore</span>' : ""}
              <div class="item-card-sub">By ${esc(v.publishedBy)}</div>
              ${v.changes && v.changes.length
                ? `<details><summary>${plural(v.changes.length, "change")}</summary><ul class="change-list">${v.changes.map((c) => `<li><span class="tag tag-${c.type}">${esc(c.type)}</span> ${esc(Schema.COLLECTIONS[c.collection] ? Schema.COLLECTIONS[c.collection].label : c.collection)} — ${esc(c.title)}</li>`).join("")}</ul></details>`
                : `<div class="item-card-sub">${esc(v.message)}</div>`}
            </div>
            ${v.current ? "" : `<button type="button" class="btn btn-secondary btn-small" data-restore="${esc(v.sha)}" data-date="${esc(fmtDate(v.date))}">Restore this version</button>`}
          </li>`).join("")}
      </ul>
      <section class="card">
        <h2>Activity log</h2>
        <ul class="activity-list">
          ${h.audit.map((a) => `<li class="${a.ok ? "" : "activity-failed"}"><strong>${esc(fmtDate(a.created_at))}</strong> — ${esc(a.actor || "system")}: ${esc(actionLabels[a.action] || a.action)}${a.ok ? "" : " (failed)"}${a.details && a.details.removed && a.details.removed.length ? ` — deleted ${esc(a.details.removed.map((r) => r.title).join(", "))}` : ""}${a.details && a.details.email ? ` — ${esc(a.details.email)}` : ""}</li>`).join("") || "<li>No activity yet.</li>"}
        </ul>
      </section>`;
    renderTrackingInto($("#tracking-slot"));
    view().querySelectorAll("[data-restore]").forEach((b) => b.addEventListener("click", () => restoreVersion(b.dataset.restore, b.dataset.date)));
  }

  async function restoreVersion(sha, dateLabel) {
    const drafts = hasDrafts();
    const ok = await confirmModal("Restore this version?",
      `<p>The website's content will go back to how it was on <strong>${esc(dateLabel)}</strong>. This is published right away.</p>
       ${drafts ? "<p><strong>Your unpublished drafts will be discarded.</strong></p>" : ""}
       <p>The current version stays in the history, so you can switch back later.</p>`,
      "Restore and publish", true);
    if (!ok) return;
    try {
      const res = await api("restore", { method: "POST", body: { sha, discardDrafts: true } });
      S.editing = null;
      await loadContent();
      if (res.nothingToPublish) { toast("That version is the same as what's live now.", "info"); return renderHistory(); }
      startTracking({ sha: res.commitSha, files: res.files, label: "restore" });
      toast("Restored. The website is updating now.", "success");
      renderHistory();
    } catch (e) {
      await modal({ title: "Couldn't restore", body: `<p>${esc(e.message)}</p>`, buttons: [{ label: "OK", value: true }] });
    }
  }

  // ---------- Settings ----------

  async function renderSettings() {
    const isAdmin = S.me.role === "admin";
    view().innerHTML = `
      <h1>Settings</h1>
      <section class="card">
        <h2>Your account</h2>
        <dl class="kv">
          <dt>Email</dt><dd>${esc(S.me.email)}</dd>
          <dt>Access</dt><dd>${S.me.role === "admin" ? "Administrator (content + team access)" : "Editor (content)"}</dd>
          <dt>Last sign-in</dt><dd>${esc(fmtDate(S.me.lastSignIn))}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>Change your password</h2>
        <form id="change-pw-form" novalidate>
          <div class="form-field"><label for="cp-1">New password</label><input type="password" id="cp-1" autocomplete="new-password" minlength="10" /></div>
          <div class="form-field"><label for="cp-2">Type it again</label><input type="password" id="cp-2" autocomplete="new-password" minlength="10" /></div>
          <button type="submit" class="btn">Change password</button>
        </form>
        <p class="muted-note">For safety you're signed out automatically after 30 minutes without activity.</p>
      </section>
      ${isAdmin ? `<section class="card" id="team-card"><h2>Team access</h2><div id="team-slot"><p class="loading">Loading…</p></div></section>` : ""}
      <section class="card">
        <h2>Help</h2>
        <p><a href="guide.html" target="_blank" rel="noopener">Open the step-by-step admin guide ↗</a></p>
      </section>`;
    $("#change-pw-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = $("#cp-1").value;
      const b = $("#cp-2").value;
      if (a.length < 10) return toast("Please use at least 10 characters.", "error");
      if (a !== b) return toast("The two passwords don't match.", "error");
      const { error } = await S.sb.auth.updateUser({ password: a });
      if (error) return toast(`Couldn't change the password: ${error.message}`, "error");
      $("#cp-1").value = "";
      $("#cp-2").value = "";
      toast("Password changed.", "success");
    });
    if (isAdmin) renderTeam();
  }

  async function renderTeam() {
    const slot = $("#team-slot");
    if (!slot) return;
    if (!S.me.features.teamManagement) {
      slot.innerHTML = '<p class="notice notice-warning">Team management needs one more server setting (the Supabase service key). See the technical handoff guide.</p>';
      return;
    }
    let users;
    try {
      users = (await api("team")).users;
    } catch (e) {
      slot.innerHTML = `<p class="notice notice-error">${esc(e.message)}</p>`;
      return;
    }
    slot.innerHTML = `
      <p>People with access can sign in at <code>${esc(location.origin)}/admin/</code>. Nobody shares passwords: each person gets a one-time link to set their own.</p>
      <table class="team-table">
        <thead><tr><th scope="col">Email</th><th scope="col">Access</th><th scope="col">Last sign-in</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          ${users.map((u) => `<tr>
            <td>${esc(u.email)}</td>
            <td><label class="sr-only" for="role-${esc(u.id)}">Access for ${esc(u.email)}</label>
              <select id="role-${esc(u.id)}" data-role-user="${esc(u.id)}" ${u.id === S.me.id ? "disabled" : ""}>
                ${[["admin", "Administrator"], ["editor", "Editor"], ["none", "No access"]].map(([v, l]) => `<option value="${v}" ${u.role === v ? "selected" : ""}>${l}</option>`).join("")}
              </select></td>
            <td>${esc(u.lastSignIn ? fmtDate(u.lastSignIn) : "Never")}</td>
            <td><button type="button" class="btn btn-secondary btn-small" data-link-email="${esc(u.email)}">Create sign-in link</button></td>
          </tr>`).join("")}
        </tbody>
      </table>
      <h3>Invite someone</h3>
      <form id="invite-form" class="inline-form" novalidate>
        <div class="form-field"><label for="invite-email">Email</label><input type="email" id="invite-email" /></div>
        <div class="form-field"><label for="invite-role">Access</label>
          <select id="invite-role"><option value="editor">Editor (content)</option><option value="admin">Administrator (content + team)</option></select></div>
        <button type="submit" class="btn">Create invite link</button>
      </form>
      <div id="link-result"></div>`;
    slot.querySelectorAll("[data-role-user]").forEach((sel) => sel.addEventListener("change", async () => {
      try {
        await api("team", { method: "POST", body: { action: "setRole", userId: sel.dataset.roleUser, role: sel.value } });
        toast("Access updated.", "success");
      } catch (e) { toast(e.message, "error"); renderTeam(); }
    }));
    slot.querySelectorAll("[data-link-email]").forEach((b) => b.addEventListener("click", () => teamLink("link", b.dataset.linkEmail)));
    $("#invite-form").addEventListener("submit", (e) => {
      e.preventDefault();
      teamLink("invite", $("#invite-email").value.trim(), $("#invite-role").value);
    });
  }

  async function teamLink(action, email, role) {
    try {
      const r = await api("team", { method: "POST", body: { action, email, role } });
      $("#link-result").innerHTML = `
        <div class="notice notice-success">
          <p><strong>One-time ${r.linkType === "invite" ? "invite" : "password-reset"} link for ${esc(r.email)}:</strong></p>
          <p><input type="text" readonly class="link-box" value="${esc(r.link)}" aria-label="Sign-in link" /></p>
          <p><button type="button" class="btn btn-small" id="copy-link">Copy link</button></p>
          <p class="muted-note">Send it to them yourself (email or text). It works once and expires after a while (1 hour unless the expiry was lengthened in Supabase) — make a new one any time. Never send a password.</p>
        </div>`;
      $("#copy-link").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(r.link); toast("Link copied.", "success"); } catch (e) { $(".link-box").select(); }
      });
      if (action === "invite") renderTeam().then(() => {});
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------- Help ----------

  function renderHelp() {
    view().innerHTML = `
      <h1>Help</h1>
      <section class="card">
        <h2>Updating the website in 6 steps</h2>
        <ol class="steps">
          <li><strong>Choose what to change</strong> in the menu (for example <em>Career Fields</em>).</li>
          <li><strong>Click Edit</strong> next to the item, or <strong>+ Add</strong> to create a new one.</li>
          <li><strong>Make your changes</strong> in the boxes. Fields marked * are required.</li>
          <li><strong>Click Save draft.</strong> Drafts are private and safe — nothing changes on the website yet.</li>
          <li><strong>Click Preview on website</strong> to see exactly how it will look.</li>
          <li>Go to <strong>Review &amp; Publish</strong>, check the list of changes, and click <strong>Publish to live website</strong>. Wait for “✓ Live” (about 1–2 minutes).</li>
        </ol>
        <p>Made a mistake? <a href="#/history">Version History</a> lets you restore any earlier version.</p>
      </section>
      <section class="card">
        <h2>Full instructions</h2>
        <p><a href="guide.html" target="_blank" rel="noopener">Open the step-by-step admin &amp; app guide ↗</a></p>
      </section>
      <section class="card">
        <h2>Things that need a developer</h2>
        <p>Page layouts and colors, the STAR worksheet and “Tell Me About Yourself” builder, technical-prep and self-review content, the Worksheet Generator's logic, and connecting a live job-listings feed. Contact Shikhar for these.</p>
      </section>`;
  }

  // ---------- Idle sign-out ----------

  let idleWarnTimer = null;
  let idleOutTimer = null;
  let idleWarned = false;
  function resetIdle() {
    if (!S.me) return;
    clearTimeout(idleWarnTimer);
    clearTimeout(idleOutTimer);
    if (idleWarned) return;
    idleWarnTimer = setTimeout(async () => {
      idleWarned = true;
      const stay = await modal({
        title: "Still there?",
        body: "<p>You'll be signed out in 5 minutes because there's been no activity. Unsaved changes on this page will be saved as a draft first.</p>",
        buttons: [{ label: "Keep me signed in", value: true }],
      });
      idleWarned = false;
      if (stay) resetIdle();
    }, IDLE_WARN_MS);
    idleOutTimer = setTimeout(async () => {
      if (S.editing && S.editing.dirty) await saveEditing().catch(() => {});
      $("#modal-root").innerHTML = "";
      idleWarned = false;
      await S.sb.auth.signOut();
      S.me = null;
      S.editing = null;
      showAuth("login", "You were signed out after 30 minutes without activity. Any unsaved edits were saved as a draft.", "info");
    }, IDLE_SIGNOUT_MS);
  }

  // ---------- Boot ----------

  async function boot() {
    wireAuthForms();
    ["click", "keydown", "input", "scroll"].forEach((ev) => document.addEventListener(ev, () => { if (!idleWarned) resetIdle(); }, { passive: true }));
    window.addEventListener("hashchange", () => {
      if (S.suppressHash) { S.suppressHash = false; return; }
      route();
    });
    window.addEventListener("beforeunload", (e) => {
      if (S.editing && S.editing.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
    $("#sidebar-toggle").addEventListener("click", () => {
      const open = $("#sidebar").classList.toggle("open");
      $("#sidebar-toggle").setAttribute("aria-expanded", String(open));
    });
    view().addEventListener("click", (e) => {
      if (e.target.closest("[data-action=reload]")) route();
    });

    try {
      const res = await fetch("/api/config");
      S.cfg = await res.json();
    } catch (e) {
      S.cfg = {};
    }
    if (!window.supabase || !S.cfg.supabaseUrl || !S.cfg.supabaseAnonKey) {
      showAuth("login", "The admin dashboard can't connect right now. Please try again later or contact Shikhar.", "error");
      $("#login-form").hidden = true;
      return;
    }
    S.sb = window.supabase.createClient(S.cfg.supabaseUrl, S.cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    S.sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        $("#password-for").textContent = `Signed in as ${session.user.email}.`;
        showAuth("password", "Choose a new password.", "success");
      }
    });

    if (await handleSetupLink()) return;
    if (/type=recovery/.test(location.hash)) return; // onAuthStateChange shows the password form
    const { data } = await S.sb.auth.getSession();
    if (data.session) await enterDashboard();
    else showAuth("login");
  }


  document.addEventListener("DOMContentLoaded", boot);
})();
