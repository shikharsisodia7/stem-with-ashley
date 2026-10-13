// Builds admin/guide.html (Ashley's printable/readable instructions) from
// docs/ASHLEY-ADMIN-GUIDE.md + docs/ASHLEY-APP-USER-GUIDE.md using pandoc.
//   node scripts/build-guide.js
// Images stay in docs/images/ and are referenced relatively (../docs/images/…).

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const docs = ["docs/ASHLEY-ADMIN-GUIDE.md", "docs/ASHLEY-APP-USER-GUIDE.md"];

function render(file) {
  return execFileSync("pandoc", ["--from", "gfm", "--to", "html5", "--wrap=none", path.join(ROOT, file)], { encoding: "utf8" })
    .replace(/src="images\//g, 'src="../docs/images/')
    .replace(/<img /g, '<img loading="lazy" ');
}

const body = docs.map((d, i) => `<section class="guide-part" id="part-${i + 1}">${render(d)}</section>`).join("\n<hr class=\"part-break\" />\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Instructions — Stem with Ashley Career Resources</title>
  <link rel="icon" type="image/jpeg" href="../assets/logo.jpeg" />
  <link rel="stylesheet" href="../styles.css" />
  <style>
    .guide { max-width: 860px; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
    .guide img { max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: var(--radius); margin: 0.5rem 0 1rem; display: block; }
    .guide table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95rem; display: block; overflow-x: auto; }
    .guide th, .guide td { border: 1px solid var(--border); padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; }
    .guide th { background: var(--bg); }
    .guide blockquote { margin: 1rem 0; padding: 0.6rem 1rem; background: #eaf1fe; border-left: 4px solid var(--brand); border-radius: 6px; }
    .guide h2 { margin-top: 2.2rem; padding-top: 0.6rem; border-top: 1px solid var(--border); }
    .guide code { background: var(--bg); padding: 0 0.25rem; border-radius: 4px; }
    .guide-toc { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem 1.25rem; }
    .part-break { margin: 3rem 0; border: none; border-top: 3px solid var(--accent); }
    @media print { .site-header, .guide-toc { display: none; } .guide img { max-width: 80%; page-break-inside: avoid; } }
  </style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="./">
      <img class="brand-logo" src="../assets/logo.jpeg" alt="Stem with Ashley Career Resources logo" width="40" height="40" />
      <span class="brand-text">Stem&nbsp;with&nbsp;Ashley — Instructions</span>
    </a>
    <nav class="site-nav">
      <a href="./">Admin dashboard</a>
      <a href="../" target="_blank" rel="noopener">Live website ↗</a>
    </nav>
  </header>
  <main class="guide">
    <nav class="guide-toc" aria-label="Guide contents">
      <strong>This page has two parts:</strong>
      <ol>
        <li><a href="#part-1">How to update your website (admin dashboard)</a></li>
        <li><a href="#part-2">How to use the apps</a></li>
      </ol>
    </nav>
    ${body}
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "admin", "guide.html"), html);
console.log(`wrote admin/guide.html (${Math.round(html.length / 1024)} KB)`);
