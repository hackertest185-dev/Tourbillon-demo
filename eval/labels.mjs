// The label schema and its health checks: what makes an answer correct, and whether a label is
// sound enough to score against at all. Also buildGenerated, which derives the mechanical facet
// queries straight from the live catalogue so they scale with the data instead of going stale.
//
// The query sets themselves live in dev-set.mjs and test-set.mjs.

import { mulberry32 } from './metrics.mjs';
import {
  normaliseMaterial, relevantIds, unknownTruthKeys,
  gradesFor, relevantIdsForTier, unknownLabelKeys,
} from './catalogue.mjs';

// -- Generated set ------------------------------------------------------------

/// How many of each generated facet query to draw. The generated half is exact by construction but
/// repetitive, so it is capped to leave room for handwritten wording. Caps take prefixes of the
/// same seeded shuffles, so a smaller cap yields a subset of a larger one and old runs stay
/// comparable by query id. Size bands are fixed rather than sampled, so they are not capped.
export const GENERATED_CAPS = Object.freeze({
  reference: 3, brand: 1, brand_budget: 2, material: 2, dial: 1, complication: 1,
});

/// Derives mechanical facet queries from the catalogue itself. Each generator states its own
/// truth spec, so labelling is exact by construction and no query can drift out of date.
/// The seeded PRNG makes the sample identical on every run, which is what lets two runs be compared.
export function buildGenerated(catalogue, { seed = 1234, caps = GENERATED_CAPS } = {}) {
  const rand = mulberry32(seed);
  const queries = [];
  const pick = (arr, n) => shuffle(arr, rand).slice(0, n);

  // Exact reference lookup. One correct answer, so this measures precision at rank 1
  // rather than recall - the search should never bury an exact match.
  const withRefs = catalogue.records.filter(r => /\d/.test(r.name) && r.name.length >= 4);
  for (const w of pick(withRefs, caps.reference)) {
    queries.push({
      id: `g-ref-${w.id}`, category: 'reference', query: w.name,
      truth: { ids: [w.id] },
    });
  }

  // Brand browsing. The semantic router is supposed to send these down the SQL path,
  // so this group doubles as the check that the cheap path is being taken.
  const brandCounts = countBy(catalogue.records, r => r.brandName);
  const brands = [...brandCounts.entries()].filter(([, n]) => n >= 5).map(([b]) => b);
  for (const brand of pick(brands, caps.brand)) {
    queries.push({
      id: `g-brand-${slugish(brand)}`, category: 'brand', query: `show me ${brand} watches`,
      truth: { brand },
    });
  }

  // Brand plus budget. Hard filters, so the semantic cache must be bypassed here.
  // Brands with too few priced watches are skipped, so the cap counts emitted queries rather than
  // candidates; walking the whole shuffle keeps the emitted ones a prefix of the old sample.
  let budgetEmitted = 0;
  for (const brand of pick(brands, brands.length)) {
    if (budgetEmitted >= caps.brand_budget) break;
    const prices = catalogue.records
      .filter(r => r.brandName === brand && r.price > 0)
      .map(r => r.price).sort((a, b) => a - b);
    if (prices.length < 4) continue;
    const cap = roundBudget(prices[Math.floor(prices.length * 0.6)]);
    queries.push({
      id: `g-brandbudget-${slugish(brand)}`, category: 'brand_budget',
      query: `${brand} under ${formatMoney(cap)}`,
      truth: { brand, priceMin: 1, priceMax: cap },
    });
    budgetEmitted += 1;
  }

  // Case material.
  const materials = [...countBy(catalogue.records, r => normaliseMaterial(r.caseMaterial)).entries()]
    .filter(([m, n]) => n >= 8 && m !== '(unknown)' && m !== 'gold (other)').map(([m]) => m);
  for (const material of pick(materials, caps.material)) {
    queries.push({
      id: `g-material-${slugish(material)}`, category: 'material', query: `${material} case watches`,
      truth: { materialAny: materialTokens(material) },
    });
  }

  // Diameter bands. Sizing is the constraint users state most literally and the one a
  // keyword index has no way to satisfy, since diameter lives inside the specs JSON.
  for (const [lo, hi] of [[0, 36], [36, 39], [39, 42], [42, 99]]) {
    queries.push({
      id: `g-size-${lo}-${hi}`, category: 'size',
      query: hi === 99 ? `watches ${lo}mm and above` : `watches between ${lo}mm and ${hi}mm`,
      truth: { diameterMin: lo === 0 ? null : lo, diameterMax: hi === 99 ? null : hi },
    });
  }

  // Dial colour.
  const dials = [...countBy(catalogue.records, r => r.dialColour).entries()]
    .filter(([d, n]) => d && n >= 8).map(([d]) => d);
  for (const dial of pick(dials, caps.dial)) {
    queries.push({
      id: `g-dial-${slugish(dial)}`, category: 'dial', query: `${dial} dial`,
      truth: { dialAny: [dial] },
    });
  }

  // Complications.
  let complicationsEmitted = 0;
  for (const fn of ['chronograph', 'moon phase', 'perpetual calendar', 'gmt', 'tourbillon']) {
    if (complicationsEmitted >= caps.complication) break;
    const truth = { functionsAny: [fn.split(' ')[0]] };
    if (relevantIds(catalogue, truth).size >= 3) {
      complicationsEmitted += 1;
      queries.push({ id: `g-fn-${slugish(fn)}`, category: 'complication', query: `${fn} watches`, truth });
    }
  }

  return queries.filter(q => q.truth != null);
}

// -- Scope --------------------------------------------------------------------
// Which subsystem owns a category now that Smart Search is deterministic-only and the concierge
// answers open-ended briefs. Scoring both on one mixed set charges each arm for queries it no
// longer claims to serve, which reads as a regression rather than as a scope change.

export const SCOPE_BY_CATEGORY = Object.freeze({
  // Reduces to facets, even when the wording hides it, so a parser can compile it to SQL.
  reference: 'spec', brand: 'spec', brand_alias: 'spec', collection: 'spec', brand_budget: 'spec',
  budget: 'spec', material: 'spec', size: 'spec', dial: 'spec', complication: 'spec',
  water_resistance: 'spec', movement: 'spec', style: 'spec', exclusion: 'spec', compound: 'spec',
  // Names no facet: occasion, person, taste, lifestyle, collecting, fit, or a vibe with a budget.
  occasion: 'semantic', persona: 'semantic', aesthetic: 'semantic', lifestyle: 'semantic',
  collector: 'semantic', fit: 'semantic', budget_vibe: 'semantic',
});

/// Scope a query belongs to. Unknown categories default to spec: a new facet category is the
/// common case, and landing in the measured set is safer than being silently dropped.
export function scopeOf(query) {
  return SCOPE_BY_CATEGORY[query.category] ?? 'spec';
}

// -- Label validation ---------------------------------------------------------

/// A label is only useful if it is neither empty nor so broad that any result set scores well.
/// Anything the harness cannot score fairly is reported and excluded rather than silently kept.
export function validateQueries(catalogue, queries, { maxShare = 0.25 } = {}) {
  const total = catalogue.records.length;
  return queries.map(q => (q.rubric ? validateGraded(catalogue, q, total, maxShare)
                                    : validateBinary(catalogue, q, total, maxShare)));
}

/// Spec labels: one predicate, one relevant set, as before.
function validateBinary(catalogue, q, total, maxShare) {
  const relevant = relevantIds(catalogue, q.truth);
  const share = total === 0 ? 0 : relevant.size / total;
  const badKeys = unknownTruthKeys(q.truth);
  let status = 'ok';
  // Checked first: an unknown key is silently unconstrained, so the label is wider than
  // written and every other status computed from it would be measuring the typo.
  if (badKeys.length > 0) status = 'invalid_key';
  else if (relevant.size === 0) status = 'empty';
  else if (share > maxShare) status = 'too_broad';
  else if (relevant.size < 2 && q.category !== 'reference') status = 'thin';
  return { ...q, relevant, relevantCount: relevant.size, share, status, badKeys };
}

/// Graded labels: the health of the label is the health of its top tier, plus two checks the
/// binary form never needed — a `must` nothing satisfies makes every answer a violation, and a
/// tier that matches fewer watches than the tier above it means the grades are the wrong way round.
function validateGraded(catalogue, q, total, maxShare) {
  const { grades, violating } = gradesFor(catalogue, q);
  const tierCounts = [...(q.rubric ?? [])]
    .sort((a, b) => b.grade - a.grade)
    .map(tier => ({ grade: tier.grade, count: relevantIdsForTier(catalogue, tier).size }));
  const ideal = new Set([...grades.entries()].filter(([, g]) => g === 3).map(([id]) => id));
  const useful = new Set([...grades.entries()].filter(([, g]) => g >= 2).map(([id]) => id));
  const share = total === 0 ? 0 : ideal.size / total;
  const badKeys = unknownLabelKeys(q);
  const mustCount = total - violating.size;

  let status = 'ok';
  if (badKeys.length > 0) status = 'invalid_key';
  else if (mustCount === 0) status = 'must_empty';
  else if (ideal.size === 0) status = 'empty';
  else if (share > maxShare) status = 'too_broad';
  else if (ideal.size < 2) status = 'thin';
  else if (tierCounts.some(tier => tier.count === 0)) status = 'tier_dead';

  // `relevant` stays populated so everything that still thinks in sets — action scoring, the
  // per-category recall table — keeps working; grade 2 is the "would actually consider it" line.
  return {
    ...q, relevant: useful, ideal, relevantCount: ideal.size, grades, violating, tierCounts,
    mustCount, share, status, badKeys,
  };
}

// -- Helpers ------------------------------------------------------------------

function shuffle(arr, rand) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function countBy(records, pick) {
  const counts = new Map();
  for (const r of records) {
    const v = pick(r);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/// Expands a display bucket back into the substrings that appear in raw spec text.
function materialTokens(material) {
  if (material === 'rose gold') return ['rose gold', 'pink gold'];
  if (material === 'gold (other)') return ['gold'];
  if (material === 'platinum') return ['platin'];
  if (material === 'titanium') return ['titan'];
  return [material];
}

/// Rounds a budget to a figure a person would actually type, so the generated phrasing
/// reads like a real query rather than a percentile.
function roundBudget(value) {
  if (value >= 100000) return Math.round(value / 25000) * 25000;
  if (value >= 20000) return Math.round(value / 5000) * 5000;
  return Math.round(value / 1000) * 1000;
}

const formatMoney = v => `$${v.toLocaleString('en-AU')}`;
const slugish = v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
