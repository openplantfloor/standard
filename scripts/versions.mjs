// Every version of every schema the standard has published, read from git history since the
// first release tag, plus the working tree. A version is immutable: one schema version has
// exactly one content. build-site serves each at v/{version}/{path}; check fails when a
// schema's content changes without a version bump. Before the first release tag exists, or
// outside a git clone, only the working tree counts as published.
import { execFileSync } from 'node:child_process';
import { NOT_SCHEMAS, ROOT, canonical, load, schemaFiles } from './lib.mjs';

export const SINCE = 'v0.1.0';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
const isSchema = (rel) => rel.endsWith('.schema.json') && !NOT_SCHEMAS.has(rel.split('/')[0]) && rel.includes('/');

/** { published: Map<"path@version", {rel, version, text, from}>, conflicts: string[], history: boolean } */
export function publishedVersions() {
  let commits = [];
  let history = false;
  try {
    git('rev-parse', '--verify', '--quiet', `${SINCE}^{commit}`);
    commits = [git('rev-parse', `${SINCE}^{commit}`).trim(), ...git('rev-list', '--reverse', '--first-parent', `${SINCE}..HEAD`).split('\n').filter(Boolean)];
    history = true;
  } catch {
    commits = [];
  }
  const states = commits.map((c) => ({
    from: c.slice(0, 12),
    files: git('ls-tree', '-r', '--name-only', c).split('\n').filter(isSchema).map((rel) => [rel, JSON.parse(git('show', `${c}:${rel}`))]),
  }));
  states.push({ from: 'working tree', files: schemaFiles().map((rel) => [rel, load(rel)]) });

  const published = new Map();
  const conflicts = [];
  for (const { from, files } of states) {
    for (const [rel, schema] of files) {
      const key = `${rel}@${schema.version}`;
      const text = canonical(schema);
      const seen = published.get(key);
      if (!seen) published.set(key, { rel, version: schema.version, text, from });
      else if (seen.text !== text) conflicts.push(`${rel}: version ${schema.version} changed without a version bump (published at ${seen.from}, differs at ${from})`);
    }
  }
  return { published, conflicts: [...new Set(conflicts)], history };
}
