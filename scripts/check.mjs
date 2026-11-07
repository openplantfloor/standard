// The gate every change to the standard passes, in CI and before a release:
// canonical formatting, $id equals the served URL, closure (no $ref leaves schemas.openplantfloor.org),
// every schema compiles under draft-07, every example and edition record validates, public text
// names only the standard and the published standards it maps, and no published version changes.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BASE, DRAFT7, ROOT, canonical, editionFiles, idOf, load, read, relOf, schemaFiles } from './lib.mjs';
import { publishedVersions } from './versions.mjs';

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const files = schemaFiles();
const schemas = Object.fromEntries(files.map((rel) => [rel, load(rel)]));

// 1. Shape of each file.
for (const rel of files) {
  const s = schemas[rel];
  if (read(rel) !== canonical(s)) fail(rel, 'not in canonical form (2-space JSON, UTF-8, trailing newline)');
  if (s.$schema !== DRAFT7) fail(rel, `$schema must be ${DRAFT7}`);
  if (s.$id !== idOf(rel)) fail(rel, `$id must be ${idOf(rel)} (got ${s.$id})`);
  if (!/^\d+\.\d+\.\d+$/.test(s.version || '')) fail(rel, 'version must be semver');
  if (!s.title || !s.description) fail(rel, 'title and description are required');
}

// 2. Closure: every $ref is local or names a schema in this repo, and its fragment resolves.
const pointer = (doc, frag) => {
  let node = doc;
  for (const raw of frag.replace(/^\//, '').split('/').filter(Boolean)) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
};
const walk = (node, visit, path = []) => {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, visit, [...path, i]));
  else if (node && typeof node === 'object') {
    visit(node, path);
    for (const [k, v] of Object.entries(node)) walk(v, visit, [...path, k]);
  }
};
for (const rel of files) {
  walk(schemas[rel], (node) => {
    if (typeof node.$ref !== 'string') return;
    const [base, frag = ''] = node.$ref.split('#');
    const target = base === '' ? rel : relOf(base);
    if (target === null) return fail(rel, `$ref leaves ${BASE}: ${node.$ref}`);
    if (!schemas[target]) return fail(rel, `$ref names no schema in this repo: ${node.$ref}`);
    if (frag && pointer(schemas[target], frag) === undefined) fail(rel, `$ref fragment does not resolve: ${node.$ref}`);
  });
}

// 3. Every schema compiles, with every other schema registered under its $id.
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
for (const rel of files) ajv.addSchema(schemas[rel]);
const uncompiled = new Set();
for (const rel of files) {
  try {
    ajv.getSchema(idOf(rel));
  } catch (e) {
    uncompiled.add(rel);
    fail(rel, `does not compile: ${e.message}`);
  }
}

// 4. Examples and edition records: each is listed in examples/manifest.json against the schema it shows, and validates.
const manifest = load('examples/manifest.json').examples;
const exampleFiles = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const full = join(dir, n);
    return statSync(full).isDirectory() ? exampleFiles(full) : n.endsWith('.json') && n !== 'manifest.json' ? [relative(ROOT, full).split(sep).join('/')] : [];
  });
const listed = new Set(manifest.map((e) => e.example));
for (const ex of exampleFiles(join(ROOT, 'examples'))) if (!listed.has(ex)) fail(ex, 'not listed in examples/manifest.json');
for (const ed of editionFiles()) if (!listed.has(ed)) fail(ed, 'an edition record must be listed in examples/manifest.json against its schema');
for (const { example, schema } of manifest) {
  if (!existsSync(join(ROOT, example))) { fail(example, 'listed in the manifest but missing'); continue; }
  if (!schemas[schema]) { fail(example, `manifest names no schema ${schema}`); continue; }
  if (uncompiled.has(schema)) continue;
  const instance = load(example);
  if (read(example) !== canonical(instance)) fail(example, 'not in canonical form (2-space JSON, UTF-8, trailing newline)');
  if (instance.$schema !== idOf(schema)) fail(example, `$schema must be ${idOf(schema)}`);
  if (example.startsWith('editions/') && instance.$id !== idOf(example)) fail(example, `$id must be ${idOf(example)}`);
  const v = ajv.getSchema(idOf(schema));
  if (v && !v(instance)) fail(example, `fails ${schema}: ${ajv.errorsText(v.errors)}`);
}

// 4b. Classification and units hold: every process but other has exactly one DIN 8580 group, and the
// standard refuses what it is meant to refuse (a unit symbol in place of a UN/CEFACT code, a range with
// no unit, a process given another group).
const common = schemas['standard/common.schema.json'];
if (common && !uncompiled.has('standard/common.schema.json')) {
  const rules = common.definitions.classifiedProcess.allOf.map((r) => r.if.properties.process.const);
  for (const p of common.definitions.process.enum) {
    const n = rules.filter((r) => r === p).length;
    if (p === 'other' ? n !== 0 : n !== 1) fail('standard/common.schema.json', `process ${p} has ${n} DIN 8580 group rule(s)`);
  }
  const def = (name) => ajv.getSchema(`${idOf('standard/common.schema.json')}#/definitions/${name}`);
  const must = [
    ['parameter', { name: 'thickness', max: 3, uom: 'MMT' }, true],
    ['parameter', { name: 'thickness', max: 3, uom: 'mm' }, false],
    ['parameter', { name: 'thickness', max: 3 }, false],
    ['parameter', { name: 'material', values: ['mild-steel'] }, true],
    ['classifiedProcess', { process: 'laser-cut', processGroup: 'separating' }, true],
    ['classifiedProcess', { process: 'laser-cut', processGroup: 'forming' }, false],
    ['automationLevel', { mechanical: 8, scale: 'frohm-2008' }, false],
  ];
  const ec = ajv.getSchema(idOf('standard/equipment-capability.schema.json'));
  const machine = (axes) => ({ $schema: idOf('standard/equipment-capability.schema.json'), equipmentId: 'shop-1:robot-01', name: 'Robot cell', processes: [{ process: 'weld-robotic', processGroup: 'joining' }], axes });
  if (ec) {
    if (!ec(machine({ machineAxes: 6, externalAxes: [{ kind: 'linear-track', travel: { value: 6000, uom: 'MMT' }, coordinated: true }] }))) fail('standard/equipment-capability.schema.json', 'refuses a 6-axis arm on a track');
    if (!ec(machine({ machineAxes: 7 }))) fail('standard/equipment-capability.schema.json', 'refuses a 7-joint arm');
    if (ec(machine(7))) fail('standard/equipment-capability.schema.json', 'accepts a bare axis count (0.3.0 form)');
  }
  for (const [name, doc, ok] of must) {
    const v = def(name);
    if (v && v(doc) !== ok) fail('standard/common.schema.json', `${name} ${ok ? 'refuses' : 'accepts'} ${JSON.stringify(doc)}`);
  }
}

// 5. Public text names the standard and the published standards it maps, nothing internal to any steward.
const FORBIDDEN = [
  [/\bd-\d{4}-\d\d-\d\d-[a-z0-9-]+/, 'an internal deliverable or decision id'],
  [/\b(?:FU|RULE|DEC)-[A-Z0-9]+(?:-[A-Z0-9]+)*/, 'an internal follow-up, rule or decision id'],
  [/\bDISPATCH-/, 'an internal work order'],
  [/schemas\.luh\.tech|schemas\.ectropy\.ai/, 'another publisher\'s schema domain (the standard references other standards by name, never by $ref)'],
  [/\b[\w./-]+\.(?:py|tsx?|mjs|msg)\b/, 'a code path'],
];
const FORBIDDEN_KEYS = new Set(['x-authoring', '_metadata']);
const VALUE_KEYS = new Set(['$id', '$ref', '$schema', 'pattern', 'const', 'enum', 'examples', 'default']);
for (const rel of [...files, ...editionFiles()]) {
  walk(load(rel), (node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(k)) fail(rel, `carries ${k} at /${[...path, k].join('/')}`);
      if (typeof v !== 'string' || VALUE_KEYS.has(k)) continue;
      for (const [re, what] of FORBIDDEN) if (re.test(v)) fail(rel, `/${[...path, k].join('/')} names ${what}: "${v.match(re)[0]}"`);
    }
  });
}
for (const [re, what] of FORBIDDEN) {
  const m = read('README.md').match(re);
  if (m) fail('README.md', `names ${what}: "${m[0]}"`);
}

// 6. A published version never changes: new content needs a new version.
let versionCount = 0;
let history = false;
try {
  const r = publishedVersions();
  versionCount = r.published.size;
  history = r.history;
  for (const c of r.conflicts) fail(c.split(':')[0], c.slice(c.indexOf(':') + 2));
} catch (e) {
  fail('history', e.message);
}

if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) in ${files.length} schema(s)`);
  process.exit(1);
}
console.log(`PASS ${files.length} schema(s), ${manifest.length} example(s) and edition record(s), ${versionCount} published version(s)${history ? '' : ' (no release tag yet: working tree only)'}: canonical, closed under ${BASE}, compiled, public text clean, versions immutable`);
