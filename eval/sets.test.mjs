// Structural tests for the golden set. None of them need the live catalogue: they catch the label
// mistakes that would otherwise surface as a plausible score, such as a misspelt truth key that
// silently widens a label, or a new category that falls into the wrong scope.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { SCOPE_BY_CATEGORY, scopeOf, validateQueries } from './labels.mjs';
import { HANDWRITTEN, REALISTIC, FORMER_TEST } from './dev-set.mjs';
import { TEST } from './test-set.mjs';
import { TRUTH_KEYS, matchesTruth, unknownTruthKeys, unknownLabelKeys, gradeFor } from './catalogue.mjs';

const FORMER_SEMANTIC = FORMER_TEST.filter(q => q.rubric);
const FORMER_SPEC = FORMER_TEST.filter(q => !q.rubric);

/// A catalogue record with every field matchesTruth reads, so a test only states what it varies.
function record(overrides = {}) {
  return {
    id: 0, name: '', price: 10000, brandName: 'Brand', collectionName: '', collectionStyles: [],
    diameterMm: 40, waterResistanceM: 100, powerReserveH: 48, caseMaterial: 'steel', caseBack: '',
    movementFamily: 'automatic', functions: [], dialColour: 'black', strapMaterial: 'leather',
    ...overrides,
  };
}

test('realistic scenarios have distinct ids, valid labels and both scopes', () => {
  const ids = [...HANDWRITTEN, ...REALISTIC, ...FORMER_TEST, ...TEST].map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(REALISTIC.filter(q => scopeOf(q) === 'spec').length, 20);
  assert.equal(REALISTIC.filter(q => scopeOf(q) === 'semantic').length, 20);
  for (const q of REALISTIC) {
    assert.ok(q.category in SCOPE_BY_CATEGORY, q.id);
    assert.deepEqual(unknownLabelKeys(q), [], q.id);
    assert.equal(Boolean(q.rubric), scopeOf(q) === 'semantic', q.id);
    if (q.rubric) {
      assert.deepEqual(q.rubric.map(t => t.grade).sort(), [1, 2, 3], q.id);
      assert.ok(q.replyChecks.length > 0 && q.rubric.every(t => t.why), q.id);
    }
  }
});

test('realistic labels enforce the whole request, including budget and exclusions', () => {
  const label = id => REALISTIC.find(q => q.id === id);
  assert.equal(matchesTruth(record({ powerReserveH: 120 }), label('r09').truth), false);
  assert.equal(matchesTruth(record({ powerReserveH: 168 }), label('r09').truth), true);
  const greenSports = record({ dialColour: 'green', collectionStyles: ['sport'], strapMaterial: 'bracelet' });
  assert.equal(matchesTruth(greenSports, label('r06').truth), true);
  assert.equal(matchesTruth({ ...greenSports, strapMaterial: 'leather' }, label('r06').truth), false);
  assert.equal(matchesTruth({ ...greenSports, collectionStyles: ['dress'] }, label('r06').truth), false);
  const office = record({ price: 8000, diameterMm: 38, collectionStyles: ['dress'] });
  assert.equal(gradeFor(office, label('r30')), 3);
  assert.equal(gradeFor({ ...office, price: 8001 }, label('r30')), 0);
  assert.equal(gradeFor({ ...office, price: 0 }, label('r40')), 0);
  assert.equal(gradeFor({ ...office, brandName: 'Patek Philippe' }, label('r28')), 0);
});

test('handwritten ids are unique', () => {
  const ids = HANDWRITTEN.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every handwritten category has an explicit scope', () => {
  // scopeOf falls back to spec, so an unregistered semantic category would be scored against
  // Smart Search without any error. Registration has to be deliberate.
  const missing = [...new Set(HANDWRITTEN.map(q => q.category))].filter(c => !(c in SCOPE_BY_CATEGORY));
  assert.deepEqual(missing, []);
});

test('scopes are only spec or semantic', () => {
  assert.deepEqual([...new Set(Object.values(SCOPE_BY_CATEGORY))].sort(), ['semantic', 'spec']);
  assert.equal(scopeOf({ category: 'not_registered' }), 'spec');
});

test('every handwritten label uses only keys the matcher understands', () => {
  const bad = HANDWRITTEN
    .map(q => ({ id: q.id, keys: q.rubric ? unknownLabelKeys(q) : unknownTruthKeys(q.truth) }))
    .filter(q => q.keys.length > 0);
  assert.deepEqual(bad, []);
});

test('every handwritten query states at least one constraint', () => {
  // A graded label may state no hard constraint — most briefs do not — but it must say what a
  // good answer looks like, or it scores everything zero.
  const unconstrained = HANDWRITTEN
    .filter(q => (q.rubric ? q.rubric.length === 0 : Object.keys(q.truth ?? {}).length === 0))
    .map(q => q.id);
  assert.deepEqual(unconstrained, []);
});

test('the semantic half is graded and the facet half is not', () => {
  const wrong = HANDWRITTEN.filter(q => (scopeOf(q) === 'semantic') !== Boolean(q.rubric)).map(q => q.id);
  assert.deepEqual(wrong, []);
});

test('every grade tier explains itself', () => {
  // The `why` is what a blind judge is shown, so a tier without one cannot be checked by anyone.
  const silent = HANDWRITTEN.flatMap(q => (q.rubric ?? [])
    .filter(tier => !tier.why || tier.why.length < 12)
    .map(tier => `${q.id} grade ${tier.grade}`));
  assert.deepEqual(silent, []);
});

test('grades run 1 to 3 and never repeat inside a label', () => {
  const bad = HANDWRITTEN.filter(q => {
    const grades = (q.rubric ?? []).map(t => t.grade);
    return grades.some(g => ![1, 2, 3].includes(g)) || new Set(grades).size !== grades.length;
  }).map(q => q.id);
  assert.deepEqual(bad, []);
});

test('a stated constraint outranks every tier', () => {
  // The point of the rewrite: an over-budget watch is a violation, however well it reads otherwise.
  const label = {
    must: { priceMax: 15000 },
    rubric: [{ grade: 3, when: { styleAny: ['dress'] }, why: 'elegant' }],
  };
  assert.equal(gradeFor(record({ price: 9000, collectionStyles: ['dress'] }), label), 3);
  assert.equal(gradeFor(record({ price: 40000, collectionStyles: ['dress'] }), label), 0);
});

test('a tier is taken at its highest grade, not its first match', () => {
  const label = {
    rubric: [
      { grade: 1, when: { diameterMax: 44 }, why: 'wearable' },
      { grade: 3, when: { diameterMax: 36 }, why: 'sized for the wrist stated' },
    ],
  };
  assert.equal(gradeFor(record({ diameterMm: 35 }), label), 3);
  assert.equal(gradeFor(record({ diameterMm: 42 }), label), 1);
  assert.equal(gradeFor(record({ diameterMm: 46 }), label), 0);
});

test('a tier can be reached two ways', () => {
  const label = {
    rubric: [{ grade: 2, whenAny: [{ functionsAny: ['gmt'] }, { styleAny: ['sport'] }], why: 'travels well' }],
  };
  assert.equal(gradeFor(record({ functions: ['gmt'] }), label), 2);
  assert.equal(gradeFor(record({ collectionStyles: ['sport'] }), label), 2);
  assert.equal(gradeFor(record({}), label), 0);
});

// -- Former test set ----------------------------------------------------------
// The 80 briefs that were held out until they had been read. They are dev data now, but the checks
// they were published under still describe them, and old run files are rescored against them.

test('the former test set is two halves that do not collide with the rest of dev', () => {
  const devIds = new Set([...HANDWRITTEN, ...REALISTIC].map(q => q.id));
  assert.deepEqual(FORMER_TEST.filter(q => devIds.has(q.id)).map(q => q.id), []);
  assert.equal(new Set(FORMER_TEST.map(q => q.id)).size, FORMER_TEST.length);
  assert.equal(FORMER_SEMANTIC.length + FORMER_SPEC.length, 80);
});

test('the semantic half is graded and covers every intent group evenly', () => {
  assert.deepEqual(FORMER_SEMANTIC.filter(q => !q.rubric).map(q => q.id), []);
  assert.deepEqual(FORMER_SEMANTIC.filter(q => scopeOf(q) !== 'semantic').map(q => q.id), []);
  const counts = {};
  for (const q of FORMER_SEMANTIC) counts[q.category] = (counts[q.category] ?? 0) + 1;
  assert.deepEqual(counts, { occasion: 6, persona: 6, aesthetic: 6, lifestyle: 6, collector: 6, fit: 6 });
});

test('every semantic test label uses only known keys and explains each tier', () => {
  assert.deepEqual(FORMER_SEMANTIC.filter(q => unknownLabelKeys(q).length > 0).map(q => q.id), []);
  assert.deepEqual(
    FORMER_SEMANTIC.flatMap(q => q.rubric.filter(t => !t.why || t.why.length < 12).map(() => q.id)), []);
});

// -- The facet half of the former test set -------------------------------------
// Smart Search was quoted from the dev set until this half existed, so its labels now feed a
// published number directly. unknownLabelKeys reads `must` and `rubric` only, which means a binary
// label passes it without being looked at - unknownTruthKeys is the one that checks these.

test('the facet half is binary, scoped to spec, and spread across the facet categories', () => {
  assert.equal(FORMER_SPEC.length, 44);
  assert.deepEqual(FORMER_SPEC.filter(q => q.rubric || !q.truth).map(q => q.id), []);
  assert.deepEqual(FORMER_SPEC.filter(q => scopeOf(q) !== 'spec').map(q => q.id), []);
  assert.deepEqual(FORMER_SPEC.filter(q => unknownTruthKeys(q.truth).length > 0).map(q => q.id), []);
  const counts = {};
  for (const q of FORMER_SPEC) counts[q.category] = (counts[q.category] ?? 0) + 1;
  assert.deepEqual(counts, {
    brand_alias: 2, collection: 3, style: 3, size: 3, dial: 3, material: 3, movement: 3,
    water_resistance: 2, complication: 3, budget: 3, brand_budget: 3, exclusion: 6, compound: 7,
  });
});

test('no facet label in the test set pins a catalogue id', () => {
  // Ids do not survive a reseed, so such a label would quietly start measuring different watches.
  // Reference lookups stay in the dev set, where buildGenerated rebuilds them against live data.
  assert.deepEqual(FORMER_SPEC.filter(q => q.truth.ids).map(q => q.id), []);
});

test('negation and multi-facet briefs carry near a third of the facet half', () => {
  // Where the parser is weakest, and where a fit to the dev set would hide most easily.
  const hard = FORMER_SPEC.filter(q => ['exclusion', 'compound'].includes(q.category));
  assert.equal(hard.length, 13);
});

test('no facet brief repeats a dev-set query word for word', () => {
  // The half exists to ask whether the vocabulary survives new phrasing. A duplicate would measure
  // the phrase the parser was built against and report it as generalisation.
  const dev = new Set([...HANDWRITTEN, ...REALISTIC].map(q => q.query.trim().toLowerCase()));
  assert.deepEqual(FORMER_SPEC.filter(q => dev.has(q.query.trim().toLowerCase())).map(q => q.id), []);
});

test('the key list matches what matchesTruth actually reads', () => {
  // Guards the guard: a new predicate added to matchesTruth but not to TRUTH_KEYS would make
  // every label using it fail validation, and a removed one would let dead keys through.
  const source = matchesTruth.toString();
  const read = new Set([...source.matchAll(/truth\.(\w+)/g)].map(m => m[1]));
  assert.deepEqual([...read].sort(), [...TRUTH_KEYS].sort());
});

test('an unknown key is reported by name', () => {
  assert.deepEqual(unknownTruthKeys({ diamterMax: 40, priceMax: 1 }), ['diamterMax']);
  assert.deepEqual(unknownTruthKeys({ diameterMax: 40 }), []);
});

test('validation rejects a misspelt key before judging breadth', () => {
  const catalogue = { records: [record({ id: 1 }), record({ id: 2 })] };
  const [q] = validateQueries(catalogue, [{ id: 'x', category: 'size', query: 'q', truth: { diamterMax: 40 } }]);
  assert.equal(q.status, 'invalid_key');
  assert.deepEqual(q.badKeys, ['diamterMax']);
});

test('validation flags empty, too broad and thin labels', () => {
  const catalogue = { records: Array.from({ length: 10 }, (_, i) => record({ id: i + 1 })) };
  const statuses = validateQueries(catalogue, [
    { id: 'empty', category: 'dial', query: 'q', truth: { dialAny: ['blue'] } },
    { id: 'broad', category: 'dial', query: 'q', truth: { dialAny: ['black'] } },
    { id: 'thin', category: 'size', query: 'q', truth: { ids: [1] } },
    // Reference lookups have exactly one right answer by design, so one match is not thin.
    { id: 'ref', category: 'reference', query: 'q', truth: { ids: [1] } },
    { id: 'ok', category: 'size', query: 'q', truth: { ids: [1, 2] } },
  ]).map(q => [q.id, q.status]);
  assert.deepEqual(statuses, [
    ['empty', 'empty'], ['broad', 'too_broad'], ['thin', 'thin'], ['ref', 'ok'], ['ok', 'ok'],
  ]);
});

// -- Sealed test set -----------------------------------------------------------
// Run to report and never to tune, so nothing catches a mistake in it until a number is already
// published. These checks stand in for that review, and the hash makes any edit a deliberate act.

const SEALED_SHA256 = '03330ec0595f7e887a108439879788f35834a9588e1cca3d57f86390df8d4ee3';
const SEALED_FACET = TEST.filter(q => !q.rubric);
const SEALED_OPEN = TEST.filter(q => q.rubric);

const tally = queries => {
  const counts = {};
  for (const q of queries) counts[q.category] = (counts[q.category] ?? 0) + 1;
  return counts;
};

test('the sealed set has not changed since it was sealed', () => {
  // A label may change only when it is wrong on its own terms. Update this hash in the same commit
  // and record the reason in docs/eval-results.md, so the edit shows in both places.
  const hash = createHash('sha256').update(JSON.stringify(TEST)).digest('hex');
  assert.equal(hash, SEALED_SHA256);
});

test('the sealed set keeps the category mix fixed before it was written', () => {
  // Proportional to the dev set, not to what was known to be weak: tilting it toward the categories
  // the redesign targets would inflate the before-and-after difference it exists to measure.
  assert.deepEqual(tally(SEALED_FACET), {
    compound: 16, exclusion: 12, size: 9, dial: 8, style: 7, movement: 7, complication: 7,
    brand_alias: 6, collection: 6, budget: 6, material: 5, water_resistance: 5, brand_budget: 5, brand: 1,
  });
  assert.deepEqual(tally(SEALED_OPEN), {
    occasion: 8, persona: 8, aesthetic: 8, lifestyle: 8, collector: 8, fit: 6, budget_vibe: 4,
  });
});

test('the sealed facet half is binary, spec-scoped, and pins no catalogue id', () => {
  assert.deepEqual(SEALED_FACET.filter(q => !q.truth || scopeOf(q) !== 'spec').map(q => q.id), []);
  assert.deepEqual(SEALED_FACET.filter(q => unknownTruthKeys(q.truth).length > 0).map(q => q.id), []);
  assert.deepEqual(SEALED_FACET.filter(q => q.truth.ids).map(q => q.id), []);
});

test('the sealed open-ended half is graded and gives the prose judge something to check', () => {
  const bad = SEALED_OPEN.filter(q => scopeOf(q) !== 'semantic'
    || unknownLabelKeys(q).length > 0
    || JSON.stringify(q.rubric.map(t => t.grade).sort()) !== '[1,2,3]'
    || q.rubric.some(t => !t.why || t.why.length < 12)
    || !(q.replyChecks?.length > 0));
  assert.deepEqual(bad.map(q => q.id), []);
});

test('no sealed brief collides with or closely copies a dev query', () => {
  // The set asks whether the system handles briefs it was not built against. A copied brief would
  // measure the one it was built against, so ids, exact wording and near wording are all checked.
  const dev = [...HANDWRITTEN, ...REALISTIC, ...FORMER_TEST];
  const devIds = new Set(dev.map(q => q.id));
  assert.deepEqual(TEST.filter(q => devIds.has(q.id)).map(q => q.id), []);
  assert.equal(new Set(TEST.map(q => q.id)).size, TEST.length);

  const stop = new Set(('a an the and or but of for with to in on at by from is it its i im me my be under '
    + 'over no not up so just some something any want please show watch watches').split(' '));
  const words = q => new Set(q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !stop.has(w)));
  const overlap = (a, b) => {
    const shared = [...a].filter(w => b.has(w)).length;
    return shared / (a.size + b.size - shared || 1);
  };
  const devWords = dev.map(q => words(q.query));
  const close = TEST.filter(q => devWords.some(d => overlap(words(q.query), d) >= 0.55)).map(q => q.id);
  assert.deepEqual(close, []);
});
