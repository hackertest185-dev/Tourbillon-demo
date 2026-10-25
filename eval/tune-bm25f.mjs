// Tunes BM25F by coordinate ascent on one half of the dev set and checks the result on the other.
// It scores the bm25 arm alone: the parameters belong to the lexical ranker, and tuning them on Smart
// Search's score would hand the baseline weights chosen for somebody else. It never reads the sealed set.
//
//   node eval/tune-bm25f.mjs                # tune on half A, report both halves
//   node eval/tune-bm25f.mjs --passes=3     # more sweeps over the parameters (default 2)
//
// Requires WatchFinderSettings:AllowEvalOverrides=true on the backend (on in local compose).

import { loadCatalogue } from './catalogue.mjs';
import { HANDWRITTEN, REALISTIC, FORMER_TEST } from './dev-set.mjs';
import { buildGenerated, validateQueries, scopeOf } from './labels.mjs';
import { ndcgAtK, ndcgAtKGraded, mean, pairedBootstrap, significance } from './metrics.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const BASE_URL = args['base-url'] ?? process.env.BASE_URL ?? 'http://localhost:5248';
const PASSES = Number(args.passes ?? 2);
const K = 10;
// A change has to beat noise-sized wobble to be taken; below this it is left where it was.
const MIN_GAIN = 0.002;

const FIELDS = ['Name', 'Brand', 'Collection', 'Description', 'Specs'];
const DEFAULT = {
  k1: 1.2,
  fields: { Name: [2.0, 0.3], Brand: [3.0, 0.0], Collection: [3.0, 0.3], Description: [1.0, 0.75], Specs: [1.0, 0.75] },
};
const GRID = { k1: [0.6, 0.9, 1.2, 1.6, 2.0], weight: [0.5, 1, 2, 3, 4, 6], b: [0, 0.25, 0.5, 0.75, 1] };

/// A fixed split by a hash of the id, so a rerun tunes on the same half and checks on the same other.
function halfOf(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 2 === 0 ? 'A' : 'B';
}

async function rankedIds(query, params) {
  const res = await fetch(`${BASE_URL}/api/watch/find`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode: 'bm25', bm25: params }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return [...(body.watches ?? []), ...(body.otherCandidates ?? [])].map(w => w.id);
}

/// nDCG@10 per query, graded for the open-ended half and binary for the facet half, as the harness scores.
async function perQuery(queries, params) {
  const out = [];
  for (const q of queries) {
    const ids = await rankedIds(q.query, params);
    out.push(q.grades ? ndcgAtKGraded(ids, q.grades, K) : ndcgAtK(ids, q.relevant, K));
  }
  return out;
}

/// The two scopes weigh the same, so the half with more queries does not decide the weights alone.
async function objective(split, params) {
  const spec = await perQuery(split.spec, params);
  const semantic = await perQuery(split.semantic, params);
  return { value: (mean(spec) + mean(semantic)) / 2, spec, semantic };
}

const withField = (params, field, index, value) => ({
  ...params,
  fields: { ...params.fields, [field]: params.fields[field].map((v, i) => (i === index ? value : v)) },
});

async function main() {
  const catalogue = await loadCatalogue(BASE_URL);
  const dev = [...HANDWRITTEN, ...buildGenerated(catalogue), ...REALISTIC, ...FORMER_TEST];
  const usable = validateQueries(catalogue, dev).filter(q => q.status === 'ok');
  const split = { A: { spec: [], semantic: [] }, B: { spec: [], semantic: [] } };
  for (const q of usable) split[halfOf(q.id)][scopeOf(q)].push(q);
  console.log(`dev set ${usable.length} usable: half A ${split.A.spec.length} spec + ${split.A.semantic.length} semantic,`
    + ` half B ${split.B.spec.length} spec + ${split.B.semantic.length} semantic`);

  let best = DEFAULT;
  let bestScore = (await objective(split.A, best)).value;
  console.log(`default on A: ${bestScore.toFixed(4)}`);

  // One parameter at a time, each tried across its grid with the others held; keep the best if it
  // clears MIN_GAIN. Repeat until a sweep changes nothing or the passes run out.
  for (let pass = 1; pass <= PASSES; pass++) {
    let changed = false;
    const candidates = [
      ...GRID.k1.map(v => ['k1', () => ({ ...best, k1: v }), v]),
      ...FIELDS.flatMap(f => [
        ...GRID.weight.map(v => [`${f}.weight`, () => withField(best, f, 0, v), v]),
        ...GRID.b.map(v => [`${f}.b`, () => withField(best, f, 1, v), v]),
      ]),
    ];
    for (const name of [...new Set(candidates.map(([n]) => n))]) {
      let local = { params: best, score: bestScore };
      for (const [, make, value] of candidates.filter(([n]) => n === name)) {
        const params = make();
        const { value: score } = await objective(split.A, params);
        if (score > local.score + MIN_GAIN) local = { params, score, value };
      }
      if (local.params !== best) {
        console.log(`  pass ${pass}  ${name.padEnd(18)} -> ${local.value}   A ${bestScore.toFixed(4)} -> ${local.score.toFixed(4)}`);
        best = local.params;
        bestScore = local.score;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // The check: the half nothing was tuned on, paired per query against the defaults.
  console.log('\nparameters');
  console.log(`  k1 ${best.k1}`);
  for (const f of FIELDS) console.log(`  ${f.padEnd(12)} weight ${best.fields[f][0]}   b ${best.fields[f][1]}`);
  for (const half of ['A', 'B']) {
    const before = await objective(split[half], DEFAULT);
    const after = await objective(split[half], best);
    console.log(`\nhalf ${half}${half === 'A' ? ' (tuned on)' : ' (held back)'}  objective ${before.value.toFixed(4)} -> ${after.value.toFixed(4)}`);
    for (const scope of ['spec', 'semantic']) {
      const stat = pairedBootstrap(before[scope], after[scope]);
      console.log(`  ${scope.padEnd(9)} nDCG ${mean(before[scope]).toFixed(3)} -> ${mean(after[scope]).toFixed(3)}`
        + `   delta ${stat.delta >= 0 ? '+' : ''}${stat.delta.toFixed(3)} [${stat.ci.lo.toFixed(3)}, ${stat.ci.hi.toFixed(3)}] ${significance(stat.ci)}`);
    }
  }
  console.log(`\n${JSON.stringify(best)}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
