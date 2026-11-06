// Stages what https://schemas.openplantfloor.org/ serves: every schema at the path its $id names, every
// published version of it at v/{version}/{path} (immutable), every edition record at its path,
// an index.json listing them, an index.html for people, and nothing else.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BASE, ROOT, canonical, editionFiles, idOf, load, schemaFiles } from './lib.mjs';
import { publishedVersions } from './versions.mjs';

const SITE = join(ROOT, '_site');
const pkg = load('package.json');
rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE);

const { published, conflicts } = publishedVersions();
if (conflicts.length) throw new Error(conflicts.join('\n'));
const versions = {};
for (const { rel, version, text } of published.values()) {
  const out = join(SITE, 'v', version, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  (versions[rel] ||= []).push(version);
}
const semver = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

const files = schemaFiles();
const entries = files.map((rel) => {
  const s = load(rel);
  mkdirSync(dirname(join(SITE, rel)), { recursive: true });
  cpSync(join(ROOT, rel), join(SITE, rel));
  const pinned = (versions[rel] || []).sort(semver).map((v) => ({ version: v, url: `${BASE}v/${v}/${rel}` }));
  return { $id: idOf(rel), title: s.title, version: s.version, maturity: semver(s.version, '1.0.0') < 0 ? 'draft' : 'stable', versions: pinned };
});

const editions = editionFiles().map((rel) => {
  const e = load(rel);
  mkdirSync(dirname(join(SITE, rel)), { recursive: true });
  cpSync(join(ROOT, rel), join(SITE, rel));
  return { $id: idOf(rel), schema: e.$schema, edition: e.standard?.edition?.number ?? null, date: e.standard?.edition?.date ?? null, title: e.standard?.name ?? null };
});

writeFileSync(join(SITE, 'index.json'), canonical({ name: 'Open Plant Floor standard', base: BASE, license: pkg.license, repository: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''), schemas: entries, editions }));
writeFileSync(join(SITE, '.nojekyll'), '');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = entries.map((e) => `<tr><td><a href="${esc(e.$id)}">${esc(e.$id.slice(BASE.length))}</a></td><td>${esc(e.title)}</td><td>${e.versions.length ? `<a href="${esc(e.versions.at(-1).url)}">${esc(e.version)}</a>` : esc(e.version)}</td><td>${esc(e.maturity)}</td></tr>`).join('\n');
const editionRows = editions.map((e) => `<tr><td><a href="${esc(e.$id)}">${esc(e.$id.slice(BASE.length))}</a></td><td>${esc(e.title ?? '')}</td><td>${esc(e.edition ?? '')}</td><td>${esc(e.date ?? '')}</td></tr>`).join('\n');
writeFileSync(
  join(SITE, 'index.html'),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open Plant Floor standard</title>
<style>
:root{--canvas:#FAFAF8;--ink:#111418;--muted:#5A6270;--rule:#DADDE2;--link:#1F5FBF}
body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:2.5rem 1rem;color:var(--ink);background:var(--canvas)}
main{max-width:60rem;margin:0 auto}
h1{font-weight:650;font-size:2rem;letter-spacing:-.02em;margin:0 0 .5rem}
.eyebrow{font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
table{border-collapse:collapse;width:100%;margin:0 0 2rem}td,th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid var(--rule);vertical-align:top}th{border-bottom:1.5px solid var(--ink);font-size:12px}
a{color:var(--link)}code{font-size:.9em}
@media (prefers-color-scheme:dark){:root{--canvas:#12161D;--ink:#EEF0F3;--muted:#A9B1BF;--rule:#2B323E;--link:#8DB4F2}}
</style>
</head><body><main>
<div class="eyebrow">An open standard for the plant floor</div>
<h1>Open Plant Floor</h1>
<p>What a machine on the plant floor can do, how long its work takes, and the jobs a shop is asked for and returns. The definitions are JSON Schema (draft-07), each served at its <code>$id</code>; <a href="index.json">index.json</a> lists them. Use a schema by its <code>$id</code>, pin an exact version at <code>v/{version}/{path}</code>, or vendor <a href="${esc(pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''))}">the repository</a> at a commit. ${esc(pkg.license)}.</p>
<h2>Schemas</h2>
<table><thead><tr><th>Schema</th><th>Title</th><th>Version</th><th>Maturity</th></tr></thead><tbody>
${rows}
</tbody></table>
${editions.length ? `<h2>Editions</h2>
<table><thead><tr><th>Record</th><th>Standard</th><th>Edition</th><th>Date</th></tr></thead><tbody>
${editionRows}
</tbody></table>
` : ''}</main></body></html>
`,
);
console.log(`staged ${files.length} schema(s), ${editions.length} edition record(s) and ${published.size} pinned version(s) into _site/`);
