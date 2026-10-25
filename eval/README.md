# Smart Search evaluation harness

Measures retrieval quality on a labelled set of queries: Smart Search (a deterministic parser with a
BM25F fallback), the chat concierge, and the individual retrieval designs they are built from
(BM25F, vector, and their fusion), each against the same labels.

Without this, every claim about search quality is an impression. With it, the claim is a number
with a confidence interval attached, reproducible by anyone who clones the repo.

The numbers these runs produced, with the date and the commit each was measured at, are in
[docs/eval-results.md](../docs/eval-results.md).

## Running

There are two sets, `dev` and `test`. The dev set has three groups, run together by default or
one at a time with `--group`:

| Group | n | What it is |
|---|---|---|
| `realistic` | 40 | Authored shopping requests, 20 Smart Search and 20 concierge: terse searches, typos, compound requirements, gifts, owned collections, wrist measurements, preferred versus firm budgets. Synthetic, not customer logs |
| `legacy` | 89 + generated | The original queries. The published development numbers were measured on this group, so `--group=legacy` reproduces them |
| `former-test` | 80 | The previous held-out set, moved here once it had been read |

```bash
node eval/run-eval.mjs --set=dev --group=realistic --validate
node eval/run-eval.mjs --set=dev --group=realistic --scope=spec --arms=bm25,smart
node eval/run-eval.mjs --set=dev --group=legacy --scope=spec --arms=bm25,keyword,smart
```

The realistic group pairs each request with explicit constraints and, for concierge briefs,
graded preferences plus `replyChecks` for the prose judge. A wrist measurement is not a case
diameter; an owned watch is not a requested brand; a preferred spend is not a hard minimum.
Do not relax labels to fit available stock. Validation reports empty or thin cases separately,
so a run's score must be read alongside its coverage. Retrieval labels are proxies for fit and
style; the reply checks require honesty about facts such as thickness or decoration that those
labels cannot verify. No-match handling and customer satisfaction are not measured by this set.

```bash
make up                                    # backend must be reachable
node eval/run-eval.mjs --inspect           # what the catalogue actually contains
node eval/run-eval.mjs --validate          # label health only, no search calls
node eval/run-eval.mjs                     # full run, both arms
node eval/run-eval.mjs --scope=spec --arms=bm25,keyword,vector,hybrid,smart         # facet queries
node eval/run-eval.mjs --scope=semantic --arms=bm25,keyword,vector,hybrid,concierge  # open-ended briefs
node eval/run-eval.mjs --from=eval/results/eval-<stamp>.json   # re-print a saved run, no API calls
node eval/run-eval.mjs --rescore=eval/results/<run>.json      # score a saved run against today's labels
node eval/run-eval.mjs --set=test --arms=bm25,concierge       # the sealed set: report, never tune
node eval/judge-pool.mjs --sample=12                          # blind second opinion on the rubrics (~$0.02)
node eval/label-versions.mjs                                  # v1 vs v2 labels against a rubric-free judge
node eval/judge-reply.mjs --from=<run.json>                   # grade the concierge's prose 0-3 (~$0.15 for 36)
node eval/compare-runs.mjs --a=<run.json> --b=<run.json> --arm=concierge   # same arm, two runs: paired deltas, latency, per-category
```

Set `WatchFinderSettings:DisableLimitInDev=true` first, otherwise the daily quota rejects the run
after 5 queries. Each scope holds 50 queries and runs sequentially per arm. The `vector` and
`hybrid` arms embed every query in-process, which takes a few seconds each on CPU.

| Flag | Default | Purpose |
|---|---|---|
| `--base-url` / `BASE_URL` | `http://localhost:5248` | Target backend |
| `--arms` | `keyword,smart` | Arms to score: `bm25`, `keyword`, `vector`, `hybrid`, `smart`, `concierge`. The first is the baseline every other arm is compared against |
| `--scope` | `all` | `spec` for facet queries, `semantic` for open-ended briefs |
| `--k` | `10` | Cutoff for recall, MRR, nDCG, hit rate |
| `--pk` | `5` | Cutoff for precision |
| `--max-share` | `0.25` | Reject labels matching more than this share of the catalogue |
| `--passes` | `1` | Repeat the set; pass 2 shows the semantic cache warm |
| `--limit` | all | Score only the first N queries (smoke runs) |
| `--delay` | `0` | Milliseconds between requests |
| `--from` | none | Re-print the report from a saved JSON run instead of calling any arm |
| `--rescore` | none | Re-score a saved run's stored ranked ids against the current labels, without calling any arm. Changing a label costs nothing after this |
| `--set` | `dev` | `dev` for everything that may be tuned against, `test` for the sealed held-out set |
| `--group` | all | With `--set=dev` only: `legacy`, `realistic`, `former-test`, comma-separated |
| `--unseal` | off | Print per-query and per-category results for a sealed-set run. Without it, `--set=test` (and `--from`, `--rescore`, `compare-runs.mjs`, `judge-reply.mjs` on a test run) prints totals only, and `--only` is refused. Use it once the final numbers are recorded |
| `--only` | all | Comma-separated query ids. A spot check on the briefs a fix targets, which is one minute against twenty for the whole set — never a score |

Each run writes a full per-query JSON record to `eval/results/`.

## The arms

| Arm | What it calls | What it isolates |
|---|---|---|
| `bm25` | `POST /api/watch/find` with `mode=bm25` | BM25F lexical ranking: the standard lexical baseline. |
| `keyword` | `GET /api/search` | The site's search bar: substring matching with a hand-built score. |
| `vector` | `POST /api/watch/find` with `mode=vector` | The embedding index alone: no parser, no rerank, no cache. |
| `hybrid` | `POST /api/watch/find` with `mode=hybrid` | BM25F and vector rankings fused by reciprocal rank in the backend. |
| `smart` | `POST /api/watch/find` | Smart Search as shipped: deterministic parser, then BM25F inside the parsed filters, no model calls. |
| `concierge` | `POST /api/chat/message` | The chat path, which owns the open-ended briefs. |

`bm25` ranks with BM25F (`backend/Services/Bm25WatchIndex.cs`), an in-memory index over brand,
collection and styles, reference, description and spec values. Unlike the keyword arm it weighs
rare terms above common ones (IDF), stops rewarding a term after a few repetitions (saturation) and
discounts long fields (length normalisation). Brand aliases are indexed as synonyms.

`hybrid` fuses the BM25F and vector rankings with reciprocal rank fusion
(`backend/Services/ReciprocalRankFusion.cs`): an id scores `1 / (k + rank)` in each list it appears
in, and the scores are summed. Only positions are used, because a BM25 score and a cosine distance
share no scale and normalising them would invent one. `k` is 60, the value from the original paper:
large enough that ids both retrievers agree on outrank a single retriever's first place.

`--scope` is what keeps the comparison fair once search and chat own different query types:
`spec` for the facet queries the parser serves, `semantic` for the briefs the concierge serves.
Scoring an arm on the half it no longer claims measures a scope decision, not retrieval quality.

## How ground truth is built

The weak point of any retrieval evaluation is the labels. Two rules keep them honest here.

**Labels are predicates, not id lists.** Each query states *what a correct answer is*
(`{ styleAny: ['dress'], diameterMax: 40 }`), and the harness derives the relevant id set by
scanning the live catalogue. Adding watches never invalidates a label, and a reviewer can argue
with the definition instead of having to trust a hand-picked list.

**Labels are written without looking at the output.** The truth spec for "something understated
for the office" is decided from the brief alone. Labelling by eyeballing what the pipeline
returned would score the pipeline against itself.

**The open-ended half is graded, not binary.** Its first version labelled every brief as a
conjunction of facets, most of them invented by the label author: "something for a black tie gala"
demanded gold and 39 mm, neither of which the brief says, and a white-gold 40 mm dress watch scored
as low as a dive watch. A graded label separates the two things that were conflated:

```js
{ id: 'h49', query: 'something for a black tie gala',
  must: {},                                    // only what the brief states
  rubric: [
    { grade: 3, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'], diameterMax: 39,
                        functionsNone: ['chronograph'] },
      why: 'the most formal dress code there is: precious, slim, no stopwatch pushers' },
    { grade: 2, when: { styleAny: ['dress'] }, why: 'a dress watch, in a metal or size that is not the formal choice' },
    { grade: 1, when: { functionsNone: ['chronograph'], diameterMax: 42 }, why: 'quiet enough to pass under a dinner jacket' },
  ] }
```

- `must` holds what the user actually stated — a budget, a named brand, an explicit exclusion.
  Breaking it is a **violation**, reported on its own line rather than averaged into a score.
- `rubric` holds the reading of the brief: grade 3 is what a knowledgeable salesperson brings out
  first, 2 fits with a trade-off, 1 is defensible, anything else is 0. A watch takes the highest
  tier it satisfies, and a tier may be reached two ways through `whenAny`.
- `why` is the sentence the tier is argued from, and it is what a blind judge is shown.

**There are two sets, and the difference is how they may be used.** The queries in
`dev-set.mjs` are the **development set**: every tuning decision — the reranker, the prompt, the
BM25F weights, the chip rules, the parser's vocabulary — was made by reading their per-query
results, so a score from them says how well the system fits those queries. `test-set.mjs` holds the
sealed briefs that are run to report a number and never to decide a change: no reading per-query
results while tuning, no editing a label to move a score. Run it with `--set=test`. Published numbers
should come from it; the dev set is for iteration.

**A test set stops being one once it has been read.** The previous held-out set had been: its
open-ended half found defects that were then fixed, and its facet half's first run named the briefs
it failed. It now sits in dev as the `former-test` group, and a fresh set replaced it, written before
the changes it measures: 100 facet briefs and 50 open-ended ones. Its category mix was fixed before
a brief was written, in proportion to the dev set rather than toward known weaknesses; only label
health was checked before sealing; and `sets.test.mjs` pins its content to a sha256 hash, so any edit
fails the tests until it is made on purpose. The same tests reject a brief whose id, wording, or near
wording (word overlap of 0.55 or more) matches a dev query.

**Each set covers both scopes, which is four cells in all.** The facet half of the test set was
added last: until then Smart Search had a dev cell and no test cell, so its headline numbers were
measured on the 50 queries that chose the parser's vocabulary. Pass `--scope` to read one half, or
omit it and the runner prints a table per scope — the two are scored with different definitions
(precision@k against mean grade, and so on) and cannot share a row.

The development set is 100 queries, split evenly by the subsystem that owns them:

| Scope | Owner | n | Categories |
|---|---|---|---|
| `spec` | Smart Search | 50 | reference, brand, brand alias, collection, brand + budget, budget, material, size, dial, complication, water resistance, movement, style, exclusion, compound |
| `semantic` | concierge | 50 | occasion, persona, aesthetic, lifestyle, collector, fit, budget with a vibe |

The split follows what the query needs, not how it is worded. "Something that can time a lap" is a
chronograph and "a proper strong diver" is a water-resistance floor, so both are `spec`: resolving
everyday wording to a facet is the parser's vocabulary job. `semantic` keeps only briefs that name no
facet at all, where the label is a judgement a knowledgeable salesperson would make.

Two sources feed the set:

- `HANDWRITTEN` — 89 queries, each with a comment recording why its label reads the brief the way
  it does, so a reviewer can argue with the reasoning rather than with a list of ids.
- `buildGenerated` — mechanical facet queries derived from the catalogue at runtime (exact
  reference lookup, brand, brand + budget, size band, material, dial, complication). Exact by
  construction, seeded so the sample is identical on every run, and capped by `GENERATED_CAPS`
  so repetitive facet lookups do not crowd out the handwritten wording.

`--validate` rejects six kinds of bad label before scoring: **invalid_key** (a key the matcher does
not read, which would silently widen the label), **must_empty** (no watch satisfies the stated
constraint, so every answer counts as a violation), **empty** (nothing reaches grade 3, so the label
is wrong), **too_broad** (grade 3 covers over `--max-share` of the catalogue, so any arm scores well
and the metric discriminates nothing), **thin** (under 2 watches at grade 3, so recall jumps between
0 and 0.5 on a single result), and **tier_dead** (a grade tier matches nothing at all, which is how
a misspelt dial colour or a facet the catalogue does not carry hides).

One data rule the harness enforces: **price 0 is "Price on Request", not free**. Those watches
stay in the catalogue but can never satisfy a budget constraint, because their price is unknown.

## The metrics

| Metric | Question it answers |
|---|---|
| **Recall@10** | Of everything that should have matched, how much did the user see? |
| **Precision@5** | Of the top 5, how much was actually relevant? Denominator is 5, not the result count, so returning 3 good results out of a possible 10 is not scored as perfect. |
| **MRR** | How far down was the first good result? Rewards getting one right answer to the top. On the graded half, "good" means grade 2 or better. |
| **Mean grade** (`prec` column, graded half) | Average grade over the k slots as a share of a perfect 3, so a near miss scores instead of counting as a failure. |
| **Violations** (`viol`) | Share of the top k that breaks a constraint the brief stated. Separate by design: an average grade can look respectable while a third of the list is over budget. |
| **Pool recall@50 / nDCG@50** | What retrieval ranked before the card cut. Printed only for an arm that exposes its pool: the concierge, with `ChatSettings:ExposeCandidates` on. |
| **gain@3 / nDCG@3** | What the reply actually showed. A weak pool is a retrieval problem; a good pool with a weak shortlist is a selection problem, and the two are fixed in different places. |
| **nDCG@10** | Recall weighted by rank — separates "relevant but buried" from "relevant and first". |
| **Hit rate@10** | Did the user see anything useful at all? The most legible number for non-engineers. |
| **p50 / p95 latency** | What a single user waits. The mean hides the tail of slow model calls; p95 is the number worth quoting. |

Four further measurements sit beside the retrieval table:

| Measurement | Arm | Question it answers |
|---|---|---|
| **Structured filter accuracy** | `smart` | Did the parser read the constraints the brief states? Slot recall (constraints read), slot precision (parsed constraints that were right) and the share of queries read exactly, on the spec half only. It separates a parse error from a ranking error. |
| **Action relevance** | `concierge` | Are the compare, navigate and search actions on a reply valid and useful? A comparison is relevant when every compared watch is in the answer set, a destination when at least half its watches are, a hand-off search when two of its first five results are. |
| **Reply grade** (`judge-reply.mjs`) | `concierge` | Does the prose answer the brief, is every claim supported by the cards it names, and does it end somewhere useful? Graded 0-3 offline from the stored reply by a stronger model than the one that wrote it, and reported as a distribution with the low grades quoted. |
| **Candidate recall** (`--k=50`) | `bm25`, `vector`, `hybrid` | Does a retriever's pool of 50 contain the answers? This is the job a retriever does for a reranker (the concierge had one until it was removed; it now shows the fused order, so recall@10 is its metric), and it can rank designs differently from recall@10, which is the job it does when its order is shown directly. |

Structured filter accuracy is a component metric, not a headline: a perfect parse can still rank
badly, and labels carry judgement no parser can hold (a strap, a date window), which is not scored.

Recall and precision trade off against each other, which is why both are reported.

**Stage timing.** Every concierge reply carries a `Server-Timing` header (`backend/Infrastructure/StageTimings.cs`)
with the wall time of each stage: `rules`, `sql`, `classify`, `route`, `embed`, `cache`, `parse`,
`parse_wait`, `vector`, `bm25`, `chat`, `planner`, `total`. A stage that ran twice reports its summed
time and the call count, which is how a repeated model call shows up. `parse` is the call itself and
`parse_wait` is what the reply waited for it; when the parse was started beside the classifier the
second is smaller. `chat` and `planner` run in parallel, so the rows do not add up to `total`. The
harness prints the table for the `concierge` arm, and `compare-runs.mjs` prints it before and after.
Clear the caches before a timing run, including the ai-service process, which keeps parse results in
memory until it restarts. A pipeline that
returns the entire catalogue has perfect recall and useless precision.

**Why the confidence interval matters.** With 50 queries per scope a point estimate is noisy. The harness
reports a bootstrap interval on recall and a **paired** bootstrap on the arm-to-arm delta. Pairing
(scoring both arms on the same queries and bootstrapping the per-query differences) removes
query-difficulty variance, which would otherwise swamp the effect being measured. A delta whose
interval crosses zero is reported as **not significant** — it is not a result yet, and quoting it
would be quoting noise.

## Reading the output

Four blocks, in the order they matter:

1. **Golden set** — label health. Fix anything flagged before believing the scores.
2. **Retrieval quality** — the headline table, plus recall broken down by category. The breakdown
   is where the interesting story is: expect the arms to be close on `reference` and `brand`
   lookups, where a keyword index is already adequate, and far apart on plain-language facets,
   compound briefs and the semantic categories, which is what everything beyond keyword matching
   is paying for.
3. **Path distribution** — which internal path served each query, measured per request rather than
   assumed from the code. This is the evidence behind any claim about keeping queries off the LLM.
4. **Paired deltas** — every arm against the first one listed, then every query where that arm is
   *worse*. The regression list is the most useful output in the file; it is the tuning queue.
5. **Structured filter accuracy and action relevance** — printed when an arm returns a parsed
   intent or actions.

## Turning the output into a claim

The pattern that survives scrutiny is **baseline + delta + n**. Missing any of the three makes the
number unfalsifiable, and an experienced reader discounts the whole line.

> Recall@10 0.54 → 0.89 against the keyword baseline on an 80-query labelled set

not

> improved search accuracy by 40%

State the cutoff (`@10`), because recall without a cutoff is meaningless. State the set size,
because it bounds how much the number can be trusted. Name the baseline, because "better" with no
comparison is not a measurement.

If the paired interval crosses zero, the honest move is to say the pipeline matched the baseline
on quality while doing something else better — latency, cost, or one scope — rather
than quoting a delta the data does not support.

## Extending it

- **New arm**: add an entry to `ARM_IMPLS` in `run-eval.mjs` returning `{ ids, meta }`. Nothing
  else in the harness knows which arm it is scoring.
- **New label dimension**: add the field to the record in `catalogue.mjs`, then a clause in
  `matchesTruth`.
- **New queries**: append to `HANDWRITTEN`, then run `--validate` before trusting the result.
