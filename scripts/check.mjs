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
  must.push(
    ['meter', { meterId: 'shop-1:main', protocol: 'green-button', dataItem: 'UsagePoint', scope: 'facility' }, true],
    ['meter', { meterId: 'shop-1:main', dataItem: 'UsagePoint', scope: 'facility' }, false],
  );
  for (const [name, doc, ok] of must) {
    const v = def(name);
    if (v && v(doc) !== ok) fail('standard/common.schema.json', `${name} ${ok ? 'refuses' : 'accepts'} ${JSON.stringify(doc)}`);
  }
}

// 4c. An energy interval ends after it starts, in every example.
for (const { example } of manifest) {
  if (!existsSync(join(ROOT, example))) continue;
  walk(load(example), (node) => {
    const iv = node.interval;
    if (iv && typeof iv.start === 'string' && typeof iv.end === 'string' && Date.parse(iv.end) <= Date.parse(iv.start)) fail(example, `an interval ends (${iv.end}) before it starts (${iv.start})`);
  });
}

// 4d. No new unit lives in a property name: a figure is a quantity, measure or rate with a UN/CEFACT code. The
// unit-suffixed properties of 0.x records are kept, listed here, and no other is added.
const LEGACY_UNIT_NAMES = new Set(['powerKw', 'forceKn', 'lengthMm', 'widthMm', 'heightMm', 'diameterMinMm', 'diameterMaxMm', 'weightKg', 'clearanceMm', 'electricalKva', 'voltageV', 'frequencyHz', 'pressureBar', 'flowLpm', 'thicknessMinMm', 'thicknessMaxMm']);
const UNIT_SUFFIX = /[a-z](Mm|Cm|M|Kg|G|Kw|W|Kn|N|Bar|Pa|Lpm|Kva|V|Hz|Rpm|Deg|Sec|S|Min|H|Pct)$/;
for (const rel of files) {
  walk(schemas[rel], (node, path) => {
    if (!node.properties || typeof node.properties !== 'object') return;
    for (const name of Object.keys(node.properties)) {
      if (UNIT_SUFFIX.test(name) && !LEGACY_UNIT_NAMES.has(name)) fail(rel, `/${[...path, 'properties', name].join('/')} carries a unit in its name; state the figure as a quantity, measure or rate`);
    }
  });
}

// 4e. An extension applies to the processes it names: a record carries one only when it performs one of them.
const extensionSchemas = Object.fromEntries(files.filter((rel) => rel.startsWith('standard/extensions/')).map((rel) => [rel.slice('standard/extensions/'.length, -'.schema.json'.length), schemas[rel]]));
const baseline = schemas['standard/equipment-capability.schema.json'];
const extensionKeys = baseline ? Object.entries(baseline.properties.extensions?.properties || {}).map(([k, v]) => [k, v.$ref.slice((BASE + 'standard/extensions/').length, -'.schema.json'.length)]) : [];
for (const [, name] of extensionKeys) {
  const s = extensionSchemas[name];
  if (!s) fail('standard/equipment-capability.schema.json', `extensions names ${name}, which has no schema`);
  else if (!Array.isArray(s.appliesTo) || !s.appliesTo.length) fail(`standard/extensions/${name}.schema.json`, 'names no processes it applies to (appliesTo)');
  else for (const p of s.appliesTo) if (!common.definitions.process.enum.includes(p)) fail(`standard/extensions/${name}.schema.json`, `appliesTo names ${p}, which is not a process`);
}
for (const name of Object.keys(extensionSchemas)) if (!extensionKeys.some(([, n]) => n === name)) fail(`standard/extensions/${name}.schema.json`, 'is not named by the baseline\'s extensions');
for (const { example, schema } of manifest) {
  if (schema !== 'standard/equipment-capability.schema.json' || !existsSync(join(ROOT, example))) continue;
  const rec = load(example);
  const performs = new Set((rec.processes || []).map((p) => p.process));
  for (const key of Object.keys(rec.extensions || {})) {
    const name = Object.fromEntries(extensionKeys)[key];
    const applies = extensionSchemas[name]?.appliesTo || [];
    if (!applies.some((p) => performs.has(p))) fail(example, `carries the ${key} extension but performs none of ${applies.join(', ')}`);
  }
}
{
  const def = (name) => ajv.getSchema(`${idOf('standard/common.schema.json')}#/definitions/${name}`);
  const cases = [
    ['accuracy', { characteristic: 'pose-repeatability', value: 0.04, uom: 'MMT', standard: { identifier: 'ISO 9283:1998' } }, true],
    ['accuracy', { characteristic: 'pose-repeatability', value: 0.04, uom: 'MMT' }, false],
    ['measure', { min: 0.5, max: 3, uom: 'MMT' }, true],
    ['measure', { uom: 'MMT' }, false],
    ['classification', { system: 'eclass', systemVersion: '16.0', classId: '36-63-07-01' }, true],
    ['classification', { system: 'eclass', classId: '36-63-07-01' }, false],
    ['rate', { value: 2.5, numerator: 'MTQ', denominator: 'MIN' }, true],
  ];
  for (const [name, doc, ok] of cases) {
    const v = def(name);
    if (v && v(doc) !== ok) fail('standard/common.schema.json', `${name} ${ok ? 'refuses' : 'accepts'} ${JSON.stringify(doc)}`);
  }
}

// 4f. Every edition a record or schema links to is an edition record in this repository.
const editionIds = new Set(editionFiles().map((rel) => idOf(rel)));
for (const rel of [...files, ...manifest.map((e) => e.example)]) {
  if (!existsSync(join(ROOT, rel))) continue;
  walk(load(rel), (node, path) => {
    if (typeof node.edition === 'string' && node.edition.startsWith(BASE + 'editions/') && !editionIds.has(node.edition)) fail(rel, `/${path.join('/')}/edition names ${node.edition}, which is not an edition record`);
  });
}

// 4g. Simulations, KPIs and comparisons hold together across records: a run names a study and KPIs that exist, a KPI
// value lies in its definition's range, a comparison's sides are in the metric's unit and its ratio is reference over
// simulated. Each rule is proven on a seeded defect.
{
  const of = (schema) => manifest.filter((e) => e.schema === schema && existsSync(join(ROOT, e.example))).map((e) => ({ rel: e.example, doc: load(e.example) }));
  const kpis = new Map(of('standard/kpi-definition.schema.json').map(({ doc }) => [doc.kpiId, doc]));
  const studies = new Set(of('standard/simulation-study.schema.json').map(({ doc }) => doc.studyId));
  const runProblems = (doc) => {
    const out = [];
    if (!studies.has(doc.studyRef)) out.push(`names study ${doc.studyRef}, which is not a simulation-study`);
    for (const o of doc.outputs || []) if (!kpis.has(o.kpiRef)) out.push(`reports ${o.kpiRef}, which is not a kpi-definition`);
    for (const o of doc.outputs || []) if (o.interval && !(o.interval.low <= o.value && o.value <= o.interval.high)) out.push(`reports ${o.kpiRef} ${o.value} outside its interval`);
    return out;
  };
  const valueProblems = (doc) => {
    const k = kpis.get(doc.kpiRef);
    if (!k) return [`is a value of ${doc.kpiRef}, which is not a kpi-definition`];
    const r = k.range || {};
    if ((r.min !== undefined && doc.value < r.min) || (r.max !== undefined && doc.value > r.max)) return [`value ${doc.value} lies outside ${doc.kpiRef}'s range`];
    if (doc.uom && doc.uom !== k.unit) return [`is in ${doc.uom}, ${doc.kpiRef} is in ${k.unit}`];
    return [];
  };
  const comparisonProblems = (doc) => {
    const out = [];
    const u = doc.metric?.uom;
    for (const side of [doc.simulated, ...(doc.references || [])]) if (u && side?.uom && side.uom !== u) out.push(`a side is in ${side.uom}, the metric in ${u}`);
    const ref0 = (doc.references || [])[0];
    if (typeof doc.ratio === 'number' && ref0 && doc.simulated?.value) {
      const want = ref0.value / doc.simulated.value;
      if (Math.abs(want - doc.ratio) > 0.0015 * Math.max(1, want)) out.push(`ratio ${doc.ratio} is not reference over simulated (${want.toFixed(3)})`);
    }
    return out;
  };
  for (const { rel, doc } of of('standard/simulation-run.schema.json')) for (const p of runProblems(doc)) fail(rel, p);
  for (const { rel, doc } of of('standard/kpi-value.schema.json')) for (const p of valueProblems(doc)) fail(rel, p);
  for (const { rel, doc } of of('standard/comparison.schema.json')) for (const p of comparisonProblems(doc)) fail(rel, p);
  const run = of('standard/simulation-run.schema.json')[0]?.doc;
  const val = of('standard/kpi-value.schema.json')[0]?.doc;
  const cmp = of('standard/comparison.schema.json')[0]?.doc;
  const seeded = [
    ['a run naming no study', run && runProblems({ ...run, studyRef: 'nowhere:study' })],
    ['a run reporting an undefined KPI', run && runProblems({ ...run, outputs: [{ ...run.outputs[0], kpiRef: 'nowhere:kpi' }] })],
    ['a KPI value outside its range', val && valueProblems({ ...val, value: 1.4 })],
    ['a comparison side in another unit', cmp && comparisonProblems({ ...cmp, references: [{ ...cmp.references[0], uom: 'MIN' }] })],
    ['a ratio that is not reference over simulated', cmp && comparisonProblems({ ...cmp, ratio: 2 })],
  ];
  for (const [what, problems] of seeded) if (problems && !problems.length) fail('scripts/check.mjs', `accepts ${what}`);
  const def = (name) => ajv.getSchema(`${idOf('standard/common.schema.json')}#/definitions/${name}`);
  for (const [name, doc, ok] of [['evidence', 'simulated', true], ['maturity', 'concept', true], ['maturity', 'guessed', false], ['fraction', 1.2, false]]) {
    const v = def(name);
    if (v && v(doc) !== ok) fail('standard/common.schema.json', `${name} ${ok ? 'refuses' : 'accepts'} ${JSON.stringify(doc)}`);
  }
  const cellExt = ajv.getSchema(idOf('standard/extensions/cell.schema.json'));
  if (cellExt && cellExt({ members: [{ role: 'robot' }] })) fail('standard/extensions/cell.schema.json', 'accepts a member with neither a record nor a class');
}

// 4h. Physical figures hold: a machine's quantities agree with the unit-named 0.x figures it also carries.
// Proven on a seeded defect.
{
  const of = (schema) => manifest.filter((e) => e.schema === schema && existsSync(join(ROOT, e.example))).map((e) => ({ rel: e.example, doc: load(e.example) }));
  const MM = { MMT: 1, CMT: 10, MTR: 1000, INH: 25.4, FOT: 304.8 };
  const KG = { KGM: 1, TNE: 1000, LBR: 0.45359237, STN: 907.18474 };
  const physicalProblems = (doc) => {
    const out = [];
    const ph = doc.physical || {};
    const agree = (legacy, q, f, what) => {
      if (legacy === undefined || !q || f[q.uom] === undefined) return;
      if (Math.abs(q.value * f[q.uom] - legacy) > 0.005 * legacy) out.push(`${what} ${q.value} ${q.uom} disagrees with its 0.x figure ${legacy}`);
    };
    agree(ph.footprint?.lengthMm, ph.footprint?.length, MM, 'footprint length');
    agree(ph.footprint?.widthMm, ph.footprint?.width, MM, 'footprint width');
    agree(ph.heightMm, ph.height, MM, 'height');
    agree(ph.clearanceMm, ph.clearance, MM, 'clearance');
    agree(ph.weightKg, ph.mass, KG, 'mass');
    return out;
  };
  for (const { rel, doc } of of('standard/equipment-capability.schema.json')) for (const p of physicalProblems(doc)) fail(rel, p);
  const seeded = [
    ['a footprint in two forms that disagree', physicalProblems({ physical: { footprint: { lengthMm: 1000, widthMm: 500, length: { value: 2, uom: 'MTR' }, width: { value: 0.5, uom: 'MTR' } } } })],
  ];
  for (const [what, problems] of seeded) if (problems && !problems.length) fail('scripts/check.mjs', `accepts ${what}`);
  const eq = ajv.getSchema(idOf('standard/equipment-capability.schema.json'));
  if (eq && eq({ $schema: idOf('standard/equipment-capability.schema.json'), equipmentId: 'x:y', name: 'x', processes: [{ process: 'other' }], physical: { footprint: { includes: [] } } }))
    fail('standard/equipment-capability.schema.json', 'accepts a footprint with no length or width');
}

// 4i. A trace's intervals hold: each ends after it starts, a station's intervals are in order and do not overlap, and
// none ends after the horizon. A placement places each piece of equipment once. Each rule is proven on a seeded defect.
{
  const of = (schema) => manifest.filter((e) => e.schema === schema && existsSync(join(ROOT, e.example))).map((e) => ({ rel: e.example, doc: load(e.example) }));
  const traceProblems = (doc) => {
    const out = [];
    for (const st of doc.stations || []) {
      let last = -Infinity;
      for (const iv of st.intervals || []) {
        if (iv.end <= iv.start) out.push(`${st.stationRef} has an interval that ends (${iv.end}) before it starts (${iv.start})`);
        if (iv.start < last) out.push(`${st.stationRef} has an interval starting at ${iv.start}, before the previous one ends (${last})`);
        if (doc.horizon !== undefined && iv.end > doc.horizon) out.push(`${st.stationRef} has an interval ending at ${iv.end}, after the horizon ${doc.horizon}`);
        last = Math.max(last, iv.end);
      }
    }
    return out;
  };
  const placementProblems = (doc) => {
    const seen = new Set();
    const out = [];
    for (const p of doc.placed || []) {
      if (seen.has(p.equipmentRef)) out.push(`places ${p.equipmentRef} more than once`);
      seen.add(p.equipmentRef);
    }
    return out;
  };
  for (const { rel, doc } of of('standard/simulation-run-trace.schema.json')) for (const p of traceProblems(doc)) fail(rel, p);
  for (const { rel, doc } of of('standard/placement.schema.json')) for (const p of placementProblems(doc)) fail(rel, p);
  const trace = of('standard/simulation-run-trace.schema.json')[0]?.doc;
  const placement = of('standard/placement.schema.json')[0]?.doc;
  const st0 = trace?.stations[0];
  const seeded = [
    ['an interval that ends before it starts', st0 && traceProblems({ ...trace, stations: [{ ...st0, intervals: [{ state: 'busy', start: 30, end: 10 }] }] })],
    ['overlapping intervals on one station', st0 && traceProblems({ ...trace, stations: [{ ...st0, intervals: [{ state: 'busy', start: 0, end: 30 }, { state: 'blocked', start: 20, end: 40 }] }] })],
    ['an interval after the horizon', st0 && traceProblems({ ...trace, horizon: 10, stations: [{ ...st0, intervals: [{ state: 'busy', start: 0, end: 30 }] }] })],
    ['equipment placed twice', placement && placementProblems({ ...placement, placed: [placement.placed[0], placement.placed[0]] })],
  ];
  for (const [what, problems] of seeded) if (problems && !problems.length) fail('scripts/check.mjs', `accepts ${what}`);
  const pl = ajv.getSchema(idOf('standard/placement.schema.json'));
  if (pl && placement && pl({ ...placement, placed: [] })) fail('standard/placement.schema.json', 'accepts a placement naming no equipment');
}

// 4j. A line flow holds together: its stations run 1, 2, 3 ... with no gap and no repeat, a shared machine is one a
// station runs, a feed comes from a line some line flow describes and enters a station the flow has, and a repair
// time comes with a time between failures; a buffer holds at least one unit. Each rule is proven on a seeded defect.
{
  const of = (schema) => manifest.filter((e) => e.schema === schema && existsSync(join(ROOT, e.example))).map((e) => ({ rel: e.example, doc: load(e.example) }));
  const flows = of('standard/line-flow.schema.json');
  const lines = new Set(flows.map(({ doc }) => doc.lineRef));
  const flowProblems = (doc) => {
    const out = [];
    const seqs = (doc.stations || []).map((s) => s.sequence);
    const sorted = [...seqs].sort((a, b) => a - b);
    if (sorted.some((n, i) => n !== i + 1)) out.push(`stations run ${seqs.join(', ')}, not 1 to ${seqs.length} with no gap or repeat`);
    const run = new Set((doc.stations || []).map((s) => s.equipmentRef));
    for (const m of doc.sharedMachines || []) if (!run.has(m.equipmentRef)) out.push(`shares ${m.equipmentRef}, which no station runs`);
    for (const f of doc.feeds || []) {
      if (!lines.has(f.fromLineRef)) out.push(`takes from ${f.fromLineRef}, a line no line flow describes`);
      if (f.intoStation !== undefined && !seqs.includes(f.intoStation)) out.push(`feeds station ${f.intoStation}, which the flow does not have`);
    }
    for (const s of doc.stations || []) {
      const r = s.reliability || {};
      if (r.meanTimeToRepair && !r.meanTimeBetweenFailures) out.push(`station ${s.sequence} states a repair time without a time between failures`);
    }
    return out;
  };
  for (const { rel, doc } of flows) for (const p of flowProblems(doc)) fail(rel, p);
  const flow = flows.find(({ doc }) => (doc.sharedMachines || []).length && (doc.stations || []).some((s) => s.reliability))?.doc;
  const fed = flows.find(({ doc }) => (doc.feeds || []).length)?.doc;
  const seeded = [
    ['a sequence with a gap', flow && flowProblems({ ...flow, stations: flow.stations.map((s, i) => ({ ...s, sequence: i === 0 ? 1 : s.sequence + 1 })) })],
    ['a sequence with a repeat', flow && flowProblems({ ...flow, stations: flow.stations.map((s) => ({ ...s, sequence: 1 })) })],
    ['a shared machine no station runs', flow && flowProblems({ ...flow, sharedMachines: [{ equipmentRef: 'shop-1:nowhere', sharedWith: ['shop-1:line-2'] }] })],
    ['a feed from a line that is not named', fed && flowProblems({ ...fed, feeds: [{ ...fed.feeds[0], fromLineRef: 'shop-1:nowhere' }] })],
    ['a repair time without a time between failures', flow && flowProblems({ ...flow, stations: flow.stations.map((s) => (s.reliability ? { ...s, reliability: { basis: s.reliability.basis, meanTimeToRepair: s.reliability.meanTimeToRepair } } : s)) })],
  ];
  for (const [what, problems] of seeded) if (problems && !problems.length) fail('scripts/check.mjs', `accepts ${what}`);
  const lf = ajv.getSchema(idOf('standard/line-flow.schema.json'));
  if (lf && flow && lf({ ...flow, stations: [{ ...flow.stations[0], bufferAfter: 0 }] })) fail('standard/line-flow.schema.json', 'accepts a buffer of no capacity');
}

// 5. Public text names the standard and the published standards it maps, nothing internal to any steward.
const FORBIDDEN = [
  [/\bd-\d{4}-\d\d-\d\d-[a-z0-9-]+/, 'an internal deliverable or decision id'],
  [/\b(?:FU|RULE|DEC)-[A-Z0-9]+(?:-[A-Z0-9]+)*/, 'an internal follow-up, rule or decision id'],
  [/\bDISPATCH-/, 'an internal work order'],
  [/schemas\.(?!openplantfloor\.org)[a-z0-9-]+(\.[a-z0-9-]+)+/i, 'another publisher\'s schema domain (the standard references other standards by name, never by $ref)'],
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
