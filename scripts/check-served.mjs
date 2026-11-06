// What https://schemas.openplantfloor.org/ serves is what the repo builds: every file build-site stages
// answers 200 with exactly the staged bytes, and a path the standard does not hold answers 404.
// Runs after every deploy and daily.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASE, ROOT } from './lib.mjs';

export const ABSENT = '_served-check/not-a-schema.json';

/** Every .json build-site staged, as [path relative to the site, its bytes]. */
export function stagedFiles(site) {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : name.endsWith('.json') ? [full] : [];
    });
  return walk(site).map((full) => [relative(site, full).split(sep).join('/'), readFileSync(full, 'utf8')]);
}

/** The findings, one line each: a staged file served differently, or the absent path served. */
export async function servedFindings(files, fetchText, base = BASE, limit = 8) {
  const findings = [];
  const queue = [...files];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [rel, text] = next;
      const { status, body } = await fetchText(base + rel);
      if (status !== 200) findings.push(`${rel}: answers ${status}`);
      else if (body !== text) findings.push(`${rel}: served bytes differ from the built site`);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  const absent = await fetchText(base + ABSENT);
  if (absent.status !== 404) findings.push(`${ABSENT}: answers ${absent.status}, not 404 -- the host serves paths the standard does not hold`);
  return findings.sort();
}

async function fetchText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
      return { status: res.status, body: await res.text() };
    } catch (err) {
      if (attempt === 3) return { status: `unreachable (${err.message})`, body: '' };
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = stagedFiles(join(ROOT, '_site'));
  const findings = await servedFindings(files, fetchText);
  for (const f of findings) console.error(`::error::${f}`);
  console.log(`${files.length} staged files checked against ${BASE}: ${findings.length} finding(s)`);
  process.exit(findings.length ? 1 : 0);
}
