// Form engine for the admin dashboard. Turns a field spec from cms-schema.js into
// accessible form controls, and applies edits back onto a plain JS object.
// Every control carries data-path (e.g. "certifications.2.url") so admin.js can
// write the new value straight into the item being edited. List add/remove/move
// buttons carry data-action. No framework; output is escaped with esc() from utils.js.

(function (global) {
  function getAt(obj, path) {
    if (!path) return obj;
    return path.split(".").reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
  }

  function setAt(obj, path, value) {
    const keys = path.split(".");
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => {
      if (o[k] === undefined || o[k] === null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
  }

  function emptyFor(spec) {
    switch (spec.t) {
      case "bool": return false;
      case "strlist": case "reflist": case "list": return [];
      case "obj": return blankObject(spec.of);
      default: return "";
    }
  }

  function blankObject(specs) {
    const o = {};
    specs.forEach((s) => { o[s.key] = emptyFor(s); });
    return o;
  }

  function idFor(path) {
    return `f-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
  }

  function errorHtml(errors, path) {
    const msgs = errors[path];
    if (!msgs || !msgs.length) return "";
    return `<p class="field-error" id="${idFor(path)}-err">${msgs.map(esc).join("<br>")}</p>`;
  }

  function described(errors, path, helpId) {
    const ids = [];
    if (helpId) ids.push(helpId);
    if (errors[path]) ids.push(`${idFor(path)}-err`);
    return ids.length ? ` aria-describedby="${ids.join(" ")}"` : "";
  }

  function moveButtons(path, i, len, label, fixed) {
    if (fixed) return "";
    return `<span class="row-actions">
      <button type="button" class="icon-btn" data-action="move-up" data-path="${esc(path)}" data-index="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(label)} up">↑</button>
      <button type="button" class="icon-btn" data-action="move-down" data-path="${esc(path)}" data-index="${i}" ${i === len - 1 ? "disabled" : ""} aria-label="Move ${esc(label)} down">↓</button>
      <button type="button" class="icon-btn icon-btn-danger" data-action="remove" data-path="${esc(path)}" data-index="${i}" aria-label="Remove ${esc(label)}">✕</button>
    </span>`;
  }

  function renderField(spec, value, path, ctx) {
    const id = idFor(path);
    const req = spec.req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : "";
    const helpId = spec.help ? `${id}-help` : "";
    const help = spec.help ? `<p class="muted-note" id="${helpId}">${esc(spec.help)}</p>` : "";
    const err = errorHtml(ctx.errors, path);
    const invalid = ctx.errors[path] ? ' aria-invalid="true"' : "";
    const v = value === undefined || value === null ? emptyFor(spec) : value;

    switch (spec.t) {
      case "str":
      case "slug":
      case "date":
        return `<div class="form-field">
          <label for="${id}">${esc(spec.label)}${req}</label>${help}
          <input type="${spec.t === "date" ? "date" : "text"}" id="${id}" data-path="${esc(path)}" data-kind="str" value="${esc(v)}" ${spec.max ? `maxlength="${spec.max}"` : ""}${invalid}${described(ctx.errors, path, helpId)} />
          ${err}</div>`;
      case "text":
        return `<div class="form-field">
          <label for="${id}">${esc(spec.label)}${req}</label>${help}
          <textarea id="${id}" rows="${Math.min(8, Math.max(2, Math.ceil(String(v).length / 90)))}" data-path="${esc(path)}" data-kind="str" ${spec.max ? `maxlength="${spec.max}"` : ""}${invalid}${described(ctx.errors, path, helpId)}>${esc(v)}</textarea>
          ${err}</div>`;
      case "url":
        return `<div class="form-field">
          <label for="${id}">${esc(spec.label)}${req}</label>${help}
          <div class="url-row">
            <input type="url" id="${id}" data-path="${esc(path)}" data-kind="str" value="${esc(v)}" placeholder="https://" inputmode="url"${invalid}${described(ctx.errors, path, helpId)} />
            ${v && CmsSchema.isHttpUrl(v) ? `<a class="btn btn-secondary btn-small" href="${esc(v)}" target="_blank" rel="noopener noreferrer">Test link ↗</a>` : ""}
          </div>
          ${err}</div>`;
      case "bool":
        return `<div class="form-field form-check">
          <label><input type="checkbox" id="${id}" data-path="${esc(path)}" data-kind="bool" ${v ? "checked" : ""}${described(ctx.errors, path, helpId)} /> ${esc(spec.label)}</label>${help}
          ${err}</div>`;
      case "enum":
        return `<div class="form-field">
          <label for="${id}">${esc(spec.label)}${req}</label>${help}
          <select id="${id}" data-path="${esc(path)}" data-kind="str"${invalid}${described(ctx.errors, path, helpId)}>
            ${v ? "" : '<option value="">Choose…</option>'}
            ${spec.options.map((o) => `<option value="${esc(o.value)}" ${o.value === v ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
          </select>${err}</div>`;
      case "ref": {
        const opts = ctx.fieldOptions || [];
        return `<div class="form-field">
          <label for="${id}">${esc(spec.label)}${req}</label>${help}
          <select id="${id}" data-path="${esc(path)}" data-kind="str"${invalid}${described(ctx.errors, path, helpId)}>
            <option value="">Choose a career field…</option>
            ${opts.map((o) => `<option value="${esc(o.id)}" ${o.id === v ? "selected" : ""}>${esc(o.name)}</option>`).join("")}
          </select>${err}</div>`;
      }
      case "reflist": {
        const opts = ctx.fieldOptions || [];
        return `<fieldset class="form-field checkbox-group"${described(ctx.errors, path, helpId)}>
          <legend>${esc(spec.label)}${spec.min ? req : ""}</legend>${help}
          ${opts.map((o, i) => `<label class="check-option"><input type="checkbox" id="${id}-${i}" data-path="${esc(path)}" data-kind="reflist" data-value="${esc(o.id)}" ${v.includes(o.id) ? "checked" : ""} /> ${esc(o.name)}</label>`).join("")}
          ${err}</fieldset>`;
      }
      case "strlist": {
        const label = spec.itemLabel || "entry";
        const rows = v.map((s, i) => `<li class="strlist-row">
            ${spec.multiline
              ? `<textarea rows="2" data-path="${esc(path)}.${i}" data-kind="str" aria-label="${esc(label)} ${i + 1}" ${spec.itemMax ? `maxlength="${spec.itemMax}"` : ""}>${esc(s)}</textarea>`
              : `<input type="text" data-path="${esc(path)}.${i}" data-kind="str" value="${esc(s)}" aria-label="${esc(label)} ${i + 1}" ${spec.itemMax ? `maxlength="${spec.itemMax}"` : ""} />`}
            ${moveButtons(path, i, v.length, `${label} ${i + 1}`)}
          </li>`).join("");
        return `<fieldset class="form-field strlist"${described(ctx.errors, path, helpId)}>
          <legend>${esc(spec.label)}</legend>${help}
          ${v.length ? `<ol class="strlist-rows">${rows}</ol>` : `<p class="muted-note">None yet.</p>`}
          <button type="button" class="btn btn-secondary btn-small" data-action="add" data-path="${esc(path)}">+ Add ${esc(label.toLowerCase())}</button>
          ${err}</fieldset>`;
      }
      case "list": {
        const label = spec.itemLabel || "Entry";
        const items = v.map((item, i) => {
          const title = spec.titleKey && item && item[spec.titleKey] ? `${label} ${i + 1}: ${item[spec.titleKey]}` : `${label} ${i + 1}`;
          return `<fieldset class="list-item">
            <legend>${esc(title)}</legend>
            ${moveButtons(path, i, v.length, `${label} ${i + 1}`, spec.fixed)}
            ${spec.of.map((s) => renderField(s, item ? item[s.key] : undefined, `${path}.${i}.${s.key}`, ctx)).join("")}
          </fieldset>`;
        }).join("");
        return `<section class="form-section" aria-labelledby="${id}-h">
          <h3 id="${id}-h">${esc(spec.label)}</h3>${help}
          ${items || '<p class="muted-note">None yet.</p>'}
          ${spec.fixed ? "" : `<button type="button" class="btn btn-secondary btn-small" data-action="add" data-path="${esc(path)}">+ Add ${esc(label.toLowerCase())}</button>`}
          ${err}</section>`;
      }
      case "obj":
        return `<section class="form-section" aria-labelledby="${id}-h">
          <h3 id="${id}-h">${esc(spec.label)}</h3>${help}
          ${spec.of.map((s) => renderField(s, v[s.key], `${path}.${s.key}`, ctx)).join("")}
        </section>`;
      default:
        return "";
    }
  }

  // specs: field spec list; value: object being edited; ctx: { errors: {path: [msg]}, fieldOptions }
  function render(specs, value, ctx) {
    const c = { errors: {}, fieldOptions: [], ...(ctx || {}) };
    return specs.map((s) => renderField(s, value[s.key], s.key, c)).join("");
  }

  function findSpec(specs, path) {
    const keys = path.split(".");
    let list = specs;
    let spec = null;
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      if (/^\d+$/.test(k)) continue;
      spec = (list || []).find((s) => s.key === k);
      if (!spec) return null;
      list = spec.of;
    }
    return spec;
  }

  // Applies a list action (add / remove / move-up / move-down) to `value`.
  function applyAction(specs, value, action, path, index) {
    const list = getAt(value, path);
    const spec = findSpec(specs, path);
    if (!spec) return false;
    const arr = Array.isArray(list) ? list : [];
    if (!Array.isArray(list)) setAt(value, path, arr);
    if (action === "add") {
      arr.push(spec.t === "strlist" ? "" : blankObject(spec.of));
    } else if (action === "remove") {
      arr.splice(index, 1);
    } else if (action === "move-up" && index > 0) {
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    } else if (action === "move-down" && index < arr.length - 1) {
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    } else {
      return false;
    }
    return true;
  }

  // Applies an input/change event from a control back onto `value`.
  function applyInput(value, el) {
    const path = el.dataset.path;
    if (!path) return false;
    if (el.dataset.kind === "bool") setAt(value, path, el.checked);
    else if (el.dataset.kind === "reflist") {
      const current = new Set(getAt(value, path) || []);
      if (el.checked) current.add(el.dataset.value);
      else current.delete(el.dataset.value);
      setAt(value, path, [...current]);
    } else setAt(value, path, el.value);
    return true;
  }

  // Converts schema errors ({path: "fields.3.certifications.0.url"}) into a map keyed
  // by the form's own paths ("certifications.0.url").
  function errorsByPath(errors, prefix) {
    const map = {};
    (errors || []).forEach((e) => {
      if (!e.path) return;
      let p = e.path;
      if (prefix && p.startsWith(`${prefix}.`)) p = p.slice(prefix.length + 1);
      else if (prefix && p === prefix) p = "";
      (map[p] = map[p] || []).push(e.message.replace(/^[^:]+ \d+: /, ""));
    });
    return map;
  }

  const api = { render, applyAction, applyInput, errorsByPath, getAt, setAt, blankObject, idFor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.AdminForms = api;
})(typeof window !== "undefined" ? window : globalThis);
