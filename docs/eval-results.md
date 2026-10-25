# Measured results

Every number the README and the case study page quote, with the run it came from and the commit it
was measured at. A number without a date is an impression; this file is where each claim is
anchored. How the harness works — arms, labels, metrics, significance — is in
[eval/README.md](../eval/README.md) (English) and [eval/FRAMEWORK.md](../eval/FRAMEWORK.md)
(Vietnamese).

## At a glance

Two systems, one sealed query set, measured before the redesign that set was written to judge.

| | Smart Search | Concierge |
|---|---|---|
| Answers | briefs that name a filter | briefs that name none |
| Query set | 100 facet briefs, **sealed** | 50 open-ended briefs, **sealed** |
| Baseline | BM25 | BM25 |
| nDCG@10 | **0.63** vs 0.50 | **0.31** vs 0.12 |
| Precision@5 / mean grade | **0.62** vs 0.47 | **0.40** vs 0.15 |
| MRR | 0.69 vs 0.61 | **0.65** vs 0.30 |
| Recall@10, share of ceiling | 61% vs 53% | **18%** vs 8% |
| Results breaking a stated constraint | - | 21 of 235 (8.9%) vs 368 of 493 (74.6%) |
| Latency, p95 | 53 ms | 8.9 s |
| Model calls per query | none | 3 |

Bold is better than BM25 with 95% confidence on a paired bootstrap. **The concierge clears the
baseline on all four ranking metrics; Smart Search on precision and nDCG**, with recall and MRR still
inside the interval. Both are the system as it stood at commit `5f97903`, before the redesign.

The set was written and sealed before either system changed: its category mix was fixed from the dev
set's proportions, only label health was checked before sealing, and a content hash in
`eval/sets.test.mjs` fails the tests on any edit. The previous held-out set had been read (one half
found defects that were then fixed, the other named its failing briefs in this file), so it moved to
the dev set, and its tables further down are development numbers now.

**The constraint row went from 0 to 21, and that is the harder set, not a regression.** The retired set
stated a hard constraint in 10 of 36 briefs; the sealed one does in 44 of 50, as a shopper who names a
budget usually does. 21 of 235 cards breaking what the brief said is the number the redesign has to
bring down.

**Method.** Labels say what a right answer is ("a dress watch, 40 mm or smaller, in a precious
metal") rather than listing watches, and were written from the query before any result was seen. The
open-ended half is graded 0-3 rather than judged right or wrong, with what the shopper stated held
separately as a hard constraint. Differences are tested with a paired bootstrap over 2,000 resamples;
only an interval clear of zero counts. Recall is read against its ceiling, because ten cards cannot
hold seventy right answers. Only the sealed set is quoted as held out; every other table in this file
was measured on briefs that have since steered a change.

## Sealed set, after the redesign

Smart Search measured 2026-10-01 at commit `5c1ab03`, the concierge the same day at `6d7285e`; clean
trees, totals only.

**Smart Search, 100 sealed facet briefs.** Paired against the same briefs before the redesign:

| Metric | Before (`5f97903`) | After | Change, 95% CI | BM25 |
|---|---|---|---|---|
| nDCG@10 | 0.630 | **0.789** | +0.159 [+0.099, +0.227] | 0.497 |
| Precision@5 | 0.618 | **0.764** | +0.146 [+0.088, +0.212] | 0.474 |
| MRR | 0.693 | **0.802** | +0.109 [+0.048, +0.176] | 0.607 |
| Recall@10 | 0.409 | **0.531** | +0.122 [+0.073, +0.179] | 0.357 |
| Hit rate@10 | 74% | **83%** | +0.090 [+0.040, +0.150] | 78% |
| Latency, p95 | 53 ms | 28 ms | | 10 ms |

Every metric improved with 95% confidence, and every ranking metric is now ahead of BM25 with 95%
confidence (nDCG +0.292 [0.202, 0.376]). Recall is 79% of the ceiling, from 61%. The parser's slot F1
is 0.895 and it reads 75% of briefs exactly. 91 briefs took the filter-then-rank path, 5 were filtered
to nothing and 4 read no watch signal.

**Concierge, 50 sealed open-ended briefs** (Claude Haiku 4.5). Paired against the same briefs before
the redesign:

| Metric | Before (`5f97903`) | After | Change, 95% CI | BM25 |
|---|---|---|---|---|
| nDCG@10 | 0.309 | **0.426** | +0.116 [+0.058, +0.181] | 0.124 |
| Mean grade, top 5 | 0.396 | **0.500** | +0.104 [+0.044, +0.172] | 0.152 |
| MRR | 0.651 | **0.833** | +0.182 [+0.073, +0.298] | 0.302 |
| Recall@10 | 0.145 | **0.241** | +0.096 [+0.038, +0.159] | 0.060 |
| Hit rate@10, grade 2 or better | 76% | **92%** | +0.160 [+0.060, +0.260] | 48% |
| Cards breaking a stated constraint | 21 of 235 (8.9%) | 19 of 263 (7.2%) | | 368 of 493 (74.6%) |
| Replies with a relevant action | 30 of 47 | 36 of 48 | | - |
| Latency, p50 / p95 | 5.6 s / 8.9 s | 6.0 s / 10.6 s | | 7 ms / 11 ms |

Every ranking metric improved with 95% confidence, and every one is ahead of BM25 with 95% confidence
(nDCG +0.301 [0.221, 0.377]). Recall is 31% of the ceiling, from 18%. 46 of 50 briefs took the new
filter-then-fuse path. The cards breaking a constraint sit in 4 briefs, as before, so the count moved
with how many cards those briefs carried, not with how many briefs fail.

The run records commit `6d7285e` on a clean tree; the backend container serving it was built at
`2dce1a4`, and the only file that differs between the two is `eval/judge-reply.mjs`, which a run does
not load. It cost $0.68.

**Where nDCG@10 stops.** Read from the stored run after its totals were seen, so it describes the
result and steered nothing. 27 of the 50 briefs were classified as advice and carry at most three
cards (`AdviceCardLimit`), and a reply showing three cards cannot reach the nDCG of ten. Averaged over
the 50 briefs, the best nDCG@10 the shown cards allow is 0.682 (0.632 before), and the cards shown
reach 0.627 of that best (0.502 before). Showing the first ten of the fused pool instead would score
0.639. The wording of a reply does not enter nDCG; it is chosen after the cards.

**The reply prose is not graded on this set.** Two batch grades were run
(`judge-sealed-before.json`, `judge-sealed-after.json`), but the judge was shown only the cards a reply
named by reference and none of the collection notes the concierge reads, so a true claim about a watch
named by its model name ("the Seamaster Diver 300M") counted as invented. Those grades are void and not
quoted. `38d59ae` shows the judge every card and collection note the concierge saw; it has not been
re-run.

**Earlier reads of the concierge half.** The first after-run is void: the Anthropic account ran out of
credit at 15:28:48, about a third of the way from the end, so roughly the last 16 briefs were answered
with no model (34 `/chat` calls returned 502, 17 replies fell back to deterministic wording). It spent
$0.44 and its totals must not be quoted. A local Qwen 2.5 7B run of the build at `2dce1a4` followed, to
check the pipeline end to end before paying for Haiku: nDCG 0.288, with 36 of 193 cards breaking a
constraint across 10 briefs and a median reply of 39 s. Haiku on the same build broke 19 of 263 in 4
briefs, so that rise was the local model, not the redesign. The Haiku run above is the sealed set's
fourth read.

## Smart Search redesign, step by step (dev set)

Each step of the redesign was measured on the 112 facet queries of the dev set against the step before
it, paired by query. These are development numbers: the queries steered the work, so they say how well
each change fixed what they showed, not what it does on unseen wording. The sealed set answers that
once the redesign is finished.

| Step | Commit | nDCG@10 | Precision@5 | MRR | Hit rate | Slot F1 | Read exactly |
|---|---|---|---|---|---|---|---|
| Before | `5f97903` | 0.662 | 0.621 | 0.711 | 77% | 0.824 | 59% |
| Filter first, then rank | `dce1bd2` | 0.694 | 0.662 | 0.741 | 76% | 0.824 | 59% |
| Complications in the catalogue's words | `31160e6` | 0.744 | 0.707 | 0.792 | 80% | 0.842 | 64% |
| Materials, dials, movement in one lexicon | `1b8b988` | 0.786 | 0.745 | 0.828 | 84% | 0.862 | 69% |
| Budgets, sizes, reserves as people write them | `4bbede1` | 0.867 | 0.827 | 0.915 | 92% | 0.908 | 80% |
| Refused brands ruled out; a stated date | `9f2f17b` | **0.904** | **0.864** | **0.951** | **96%** | **0.937** | **84%** |

Every step after the first improved every ranking metric with 95% confidence over the step before;
the first improved recall, precision and nDCG. BM25 alone scores 0.514 nDCG on the same queries, and
p95 latency stayed between 44 and 64 ms throughout. Run files, in order:
`eval-2026-09-29T17-06-28-755Z.json`, `17-13-23-585Z`, `17-20-32-854Z`, `17-27-17-659Z`, `17-38-32-519Z`,
`17-42-34-339Z`. Each was measured on the working tree that became the commit in its row, so its
recorded commit is the one before, marked dirty.

Three of those steps were bugs found by reading dev results, not tuning: a complication brief was
checked for the filter bar's label rather than the catalogue's wording, so every moon phase and GMT
brief came back empty; "i can go up to 8 thousand" was filtered to Glashütte Original, because "go" is
its alias; and "M126331-0001", a Rolex reference, briefly read as a budget from $126,331 down to $1,000.

**Tuning BM25F did not generalise.** Coordinate ascent over k1 and each field's weight and b, scored on
the bm25 arm across both scopes (`eval/tune-bm25f.mjs`), gained 0.016 on the half of the dev set it was
tuned on and lost 0.025 nDCG on the other half's facet queries, [-0.051, -0.004]. Eleven parameters
fitted to about a hundred queries learned the queries, so the hand-set weights stay. The split is what
caught it: tuned on the whole dev set, the change would have shipped.

## What each table was measured on

| Table | Query set | Run file | Measured |
|---|---|---|---|
| At a glance, Smart Search | 100 sealed facet briefs | `eval-2026-09-29T16-53-06-154Z.json` | 2026-09-30, commit `5f97903`, clean tree, $0 |
| At a glance, concierge (Haiku 4.5) | 50 sealed open-ended briefs | `eval-2026-09-29T16-59-49-908Z.json` | 2026-09-30, commit `5f97903`, clean tree, ~$0.65; prose not yet judged |
| Sealed after-run, Smart Search | 100 sealed facet briefs | `eval-2026-10-01T15-23-45-891Z.json` | 2026-10-01, commit `5c1ab03`, clean tree, $0 |
| Sealed after-run, concierge, **void** | 50 sealed open-ended briefs | `eval-2026-10-01T15-29-07-715Z.json` | 2026-10-01, commit `5c1ab03`; Anthropic credit ran out mid-run, $0.44 spent; not to be quoted |
| Sealed after-run, concierge, Qwen 2.5 7B local | 50 sealed open-ended briefs | `eval-2026-10-01T17-28-33-162Z.json` | 2026-10-01, commit `2dce1a4`, clean tree, $0; a pipeline check, not a reported result |
| Sealed after-run, concierge (Haiku 4.5) | 50 sealed open-ended briefs | `eval-2026-10-01T19-00-56-542Z.json` | 2026-10-01, recorded commit `6d7285e`, clean tree, container built at `2dce1a4`, $0.68 |
| Sealed reply grades, **void** | the before and after replies | `judge-sealed-before.json`, `judge-sealed-after.json` | 2026-10-02, judge as at `60d86ad`; shown only the cards named by reference, not to be quoted |
| Smart Search | 50 facet queries | `eval-2026-09-18T18-41-54-976Z.json` | 2026-09-18 |
| Concierge, Claude Haiku 4.5 and BM25 | 50 open-ended briefs | `eval-2026-09-21T15-07-46-450Z.json` | 2026-09-21, tree as at commit `ebecdba` |
| Concierge, Qwen 2.5 7B local | 50 open-ended briefs | `eval-2026-09-18T22-06-31-987Z.json` | 2026-09-18 |
| Choosing the retriever | both sets | `full-pool-spec.log`, `full-pool-semantic.log` | 2026-09-18 |
| Held-out, facet half | 44 held-out facet briefs | `eval-2026-09-27T14-11-27-524Z.json` | 2026-09-27, commit `eff9ea7` plus uncommitted constraint work |
| Held-out, before the fixes | 36 held-out briefs | `eval-2026-09-23T15-48-45-911Z.json` | 2026-09-23 |
| Held-out, after the fixes | 36 held-out briefs | `eval-2026-09-24T04-07-51-860Z.json` | 2026-09-24, tree as at commit `9b7ea73` |
| Reply grades | the same 36 replies | `reply-grades.json` | 2026-09-24 |

Run files live in `eval/results/`, which is gitignored: they are large and reproducible, so this
file is the record that travels with the repository. Re-print one without spending anything:
`node eval/run-eval.mjs --from=eval/results/<file>.json`.

## Smart Search, 50 facet queries

Deterministic parser and BM25F, no model. Re-measured 2026-09-24 after the constraint work, which
is the same parser the concierge now shares.

| Metric | Smart Search | BM25 alone | Old search bar |
|---|---|---|---|
| nDCG@10 | **0.76** | 0.57 | 0.44 |
| Precision@5 | **0.72** | 0.54 | 0.39 |
| Recall@10, share of ceiling | **77%** | 61% | 51% |
| MRR | **0.83** | 0.70 | 0.55 |
| Hit rate@10 | 86% | 84% | 78% |
| Latency, p95 | 28 ms | 12 ms | 236 ms |

Bold is better than the BM25 baseline with 95% confidence on a paired bootstrap. All four ranking
metrics now clear it — recall +0.081 [0.033, 0.135], precision +0.184 [0.088, 0.288], MRR +0.130
[0.022, 0.247], nDCG +0.189 [0.087, 0.295] — where MRR was inside noise before the constraint work.
Slot F1 of the parser is 0.809, and 60% of briefs are read exactly.

The four briefs where Smart Search still trails BM25 are the ones whose constraint the parser reads
but the catalogue cannot answer precisely: "green dial sports watch on a bracelet", a second time
zone, a week of power reserve, a steel watch with a date window.

**This half is the development set.** These 50 queries decided the parser's vocabulary, so the
number says how well it fits the briefs it was built against. The held-out facet half below is the
same parser on 44 briefs it never saw, and the gap between the two sections is the size of that fit.

## Concierge, 50 open-ended briefs

The same pipeline on two models, each against BM25 on the same briefs. Every value is over all 50
briefs. Against BM25 the concierge is significantly better on recall (+0.028, 95% CI [0.005,
0.057]); precision, MRR and nDCG are higher but inside the interval, which 50 briefs cannot
separate from noise.

| Metric | Claude Haiku 4.5 | Qwen 2.5 7B, local | BM25 alone |
|---|---|---|---|
| MRR | 0.46 | 0.30 | 0.32 |
| Precision@5 | 0.28 | 0.16 | 0.21 |
| nDCG@10 | 0.24 | 0.14 | 0.17 |
| Recall@10, share of ceiling | 21% | 14% | 12% |
| Hit rate@10 | 72% | 48% | 66% |
| Replies with a relevant action | 48% | 38% | - |
| Latency, p50 | 4.5 s | - | 6 ms |
| Latency, p95 | 10.8 s | - | 8 ms |

The local model's latency is left out: the laptop GPU throttled during its run, so the figure
would describe the cooling rather than the model.

**Stage timing, Haiku, 50 replies** (the wording and the action planner run in parallel)

| Stage | Ran on | p50 | p95 |
|---|---|---|---|
| classify | 50/50 | 820 ms | 1,244 ms |
| parse (beside the classifier) | 48/50 | 1,119 ms | 1,570 ms |
| parse wait | 33/50 | 144 ms | 712 ms |
| retrieval (SQL, vector, BM25F) | 50/50 | < 30 ms | < 40 ms |
| wording | 50/50 | 3,071 ms | 6,769 ms |
| action planner | 50/50 | 2,086 ms | 2,668 ms |
| **total** | 50/50 | **4,439 ms** | **10,772 ms** |

## What changed since the previous concierge run

2026-09-19 (`eval-2026-09-19T14-41-50-677Z.json`) → 2026-09-21, same model, same 50 briefs.

| | Before | After | Why |
|---|---|---|---|
| Retrieval metrics | 0.46 / 0.28 / 0.24 | identical | nothing in retrieval changed |
| Latency p50 / p95 | 3.9 s / 7.1 s | 4.5 s / 10.8 s | the reply now runs to its 180-token ceiling instead of being cut at 140; the planner got faster |
| Replies with a relevant action | 58% | 48% | the Smart Search chip is now offered only when Smart Search can read a filter from the message |
| Smart Search chips | 50, 24% relevant | 13, 38% relevant | 21 of the old chips opened a page with no results at all |
| Planner replies cut at the token ceiling | 48/48 | 12/50 | the planner no longer writes a `reason` per chip |
| Wording cut at the token ceiling | 52/54 | 38/58 | ceiling raised from 140 to 180 tokens |

The action figure is the honest cost of the chip rule: five of the removed hand-offs would have
landed on results that satisfied the brief, while twenty-one opened an empty page. The metric sees
the first and not the second.

## Re-measure after the links moved to the backend

2026-09-22, Haiku 4.5, ten of the same fifty briefs, one per category, paired against their own rows
in the run above. The change under test: the model names watches in plain words and the backend
attaches the links, so none of the reply's tokens go on URLs.

| | Before | After |
|---|---|---|
| Wording stage, median of the ten | 3,268 ms | 3,169 ms |
| Total, median of the ten | 4,333 ms | 5,732 ms |
| Output tokens per reply | ~170 | ~150 |
| Replies stopped at the ceiling | 38 of 58 | 10 of 10 |
| Replies that read as finished | 20 of 58 | 10 of 10 |

The wording stage did not move: 3% on ten briefs is well inside the variance of the API itself,
which swung one brief from 2.9 s to 5.4 s between the two runs. The total looks worse for the same
reason and on the same ten briefs, so **the table above still stands and is not re-stated from ten
samples**.

What did change is what the tokens buy. Haiku writes to whatever ceiling it is given — asking for
"two or three sentences" instead of "at most 60 words" changed nothing, all ten replies still
stopped at the ceiling — so the ceiling is the control and the reply used to spend about 40 tokens
per link on an address the reader never sees. Those tokens are now sentences, and a reply cut at
the ceiling ends at its last complete clause rather than mid-thought.

## Held-out test set, 44 facet briefs

Written after the parser was finished, worded deliberately unlike the dev set, and never used to
decide a change. Both arms are free of model calls, so this table costs nothing to reproduce.

| Metric | Smart Search | BM25 alone | Old search bar |
|---|---|---|---|
| nDCG@10 | 0.59 | 0.50 | 0.25 |
| Precision@5 | 0.56 | 0.47 | 0.25 |
| Recall@10, share of ceiling | 60% | 55% | 26% |
| MRR | 0.62 | 0.61 | 0.35 |
| Hit rate@10 | 68% | 75% | 57% |
| Latency, p95 | 45 ms | 8 ms | 184 ms |

2026-09-27, `eval-2026-09-27T14-11-27-524Z.json`, $0, commit `eff9ea7` **plus uncommitted work**:
the backend image was built from a tree carrying in-progress changes to `WatchFinderService.cs`,
`StatedConstraintFilter.cs` and `ChatService.cs`. Re-run this table once that work lands; against
the same backend the 50 development queries give Smart Search MRR 0.810 and hit rate 84%, where
the 2026-09-24 run recorded 0.827 and 86%, so the Smart Search arm has moved slightly since.

**Nothing here is bold, because nothing clears the interval**: recall +0.034 [-0.079, 0.138],
precision +0.095 [-0.055, 0.250], MRR +0.004 [-0.160, 0.165], nDCG +0.089 [-0.073, 0.238]. Against
the old search bar every metric clears it comfortably and in the wrong direction for the search bar:
nDCG -0.251 [-0.355, -0.151]. So the parser is worth far more than substring matching, and is not
distinguishable from a proper lexical baseline on 44 briefs.

**The comprehension generalised; the ranking did not.** Slot F1 is 0.808 here against 0.809 on the
dev set, and briefs read exactly 57% against 60% — the parser understands unfamiliar wording as well
as familiar wording. What halved is the ranking margin, which puts the loss in what the hard filters
do to recall after a correct parse rather than in reading the brief.

The per-category split says the same thing more bluntly. The parser wins where a filter is the only
way to answer at all — exclusion 81% of ceiling against BM25's 1%, water resistance 100% against 33%,
brand-with-budget 93% against 59% — and loses where a hard filter narrows what BM25 finds by term
frequency alone: dial 33% against 95%, material 42% against 94%, movement 2% against 22%.

**Three findings worth chasing, on the dev set rather than here.**

- All three budget briefs score 0.000 for every arm against a ceiling of 0.430. The dev set has no
  price floor and no price band in it; the held-out half has both (`fs23` a 60-90k bracket, `fs24` a
  100k floor) and a plain ceiling that also returns nothing.
- `excludedBrand` was missed on both briefs that state one, though the exclusion category still
  scores 81% of its ceiling.
- Hit rate is the one metric where Smart Search is behind BM25 (68% against 75%), which is what a
  filter that is too strict looks like: better ordering when it finds something, nothing at all more
  often.

Diagnosing any of them means reading per-query results while changing the system, which this set
forbids. The route is to add the missing phrasings to `dev-set.mjs`, fix against those, and re-run
this table afterwards.

## Held-out test set, 36 open-ended briefs

These 36 briefs (`eval/test-set.mjs`) were written after the system was built and have never been
used to decide a change, which is what makes them worth quoting. Graded labels, so a near miss
scores. Two runs, same set, same model, same labels: the first found the defects, the second was
run after they were fixed.

| Metric | Concierge, after the fixes | Concierge, before | BM25 alone |
|---|---|---|---|
| Mean grade over the top 5 | **0.49** | 0.42 | 0.42 |
| MRR | **0.76** | 0.71 | 0.68 |
| nDCG@10 | **0.36** | 0.29 | 0.30 |
| Recall@10, share of ceiling | **29%** | 15% | 19% |
| Hit rate@10, grade 2 or better | 86% | 83% | 86% |
| Top 10 breaking a stated constraint | **0%** | 13% | 15% |
| Replies with a relevant action | 83% | 78% | - |
| Latency, p50 / p95 | 5.2 s / 8.5 s | 4.8 s / 10.7 s | 7 ms / 11 ms |

After: 2026-09-24, `eval-2026-09-24T04-07-51-860Z.json`, **$0.477**, tree as at commit `9b7ea73`.
Before: 2026-09-23, `eval-2026-09-23T15-48-45-911Z.json`, $0.51.

**Against BM25, nothing clears the 95% interval**: recall +0.039 [-0.028, 0.116], precision +0.070
[-0.074, 0.215], MRR +0.072 [-0.113, 0.249], nDCG +0.057 [-0.059, 0.183]. Every one of them moved
the right way and every one of them is inside noise on 36 briefs, so the claim the numbers support
is that the concierge is **at least the equal of a keyword baseline at retrieval while doing the
part the baseline cannot** — reading the brief, answering in prose, attaching a next step that is
useful 83% of the time — and that it no longer shows results the brief ruled out.

The violation row is the exception to that reading, because it is a count rather than an average:
**0 of the 191 cards shown broke a stated constraint**, against 30 of 198 in the run before the
fixes. Raw BM25 shows 47 such results in the same top tens.

**Where the remaining loss is.** The same run, scored before and after the card cut:

| | Pool of 44 candidates | The cards shown |
|---|---|---|
| Recall of the ideal answers | 0.45 (was 0.39) | 0.11 (at 10 cards) |
| nDCG | 0.55 @50 (was 0.49) | 0.56 @3 |
| Mean grade | - | 0.68 @3 (was 0.59) |

Retrieval now puts 45% of the grade-3 watches inside 50 candidates. The shortlist that reaches the
reply still holds a fraction of them, so selection remains the next thing worth working on — but it
is selecting from a better pool than before, and it is no longer selecting anything that breaks the
brief.

## Reply quality, 36 held-out replies

2026-09-24, judged by `claude-sonnet-5` from the stored replies of the run above, **$0.32**
(`eval/judge-reply.mjs`, `reply-grades.json`). A stronger model than the one that wrote them,
because Haiku grading its own prose is not an independent opinion. It is still a model grading a
model, so this is a distribution with the low grades quoted, not a headline.

| Grade | n | What it means |
|---|---|---|
| 3 | 6 (17%) | answers what was asked, every claim supported, ends somewhere useful |
| 2 | 13 (36%) | answers it, nothing wrong, but generic or the closing line adds little |
| 1 | 10 (28%) | partly answers, or asks the customer to restate what they already said |
| 0 | 7 (19%) | answers a different question, or claims something the cards do not show |

**Mean 1.50 of 3, and six replies claim a spec the cards do not support.** This is the weakest
number on this page and the most useful, because every other metric on the page scores the cards and
none of them reads the sentence the customer actually gets. Three patterns account for the zeros:

- **Unsupported specs** (`f11`, `f15`, `f26`, `f27`, `f29`): "65+ hours power reserve", "integrated
  bracelet", "openworked" — claims the catalogue record behind the card does not carry. The
  grounding validator checks the **names** a draft uses, not the specs it asserts about them.
  *Since then* it reads specs too: figures by unit, and case metal, dial, movement, complication
  and strap through `FacetLexicon`. Replayed over the 216 stored dev-set replies it flags one: the
  Black Panther's "openworked dial", whose record says hand-painted. Two of the three examples quoted
  here turn out to be supported by the full record ("Minimum 65 hours" on the Calatrava 6119R, a
  steel bracelet on the Highlife); the judge saw a card summary, not the record. The old check
  flagged none of the 216, and after link text is removed it flagged nothing wrongly either, so the
  change adds recall without adding false alarms on this sample.
- **Answering past the brief** (`f13`, `f19`, `f23`): a diamond-paved High Jewellery piece for
  someone who said "instruments, not jewellery"; dress watches for the motorbike and cycling briefs.
  The cards were defensible under the rubric; the prose did not read the context around them.
- **Cut off mid-list** (`f03`, `f04`): the reply promises three picks and describes one. The token
  ceiling again, this time visible as an unfinished thought rather than an unfinished sentence.

Each is a different fix — spec-level grounding, context in the wording prompt, a ceiling that fits
the number of picks — and none of them would have been visible from the retrieval metrics.

## Labels v2: how the open-ended half is judged

2026-09-24. The semantic labels were conjunctions of facets, most of them invented by the label
author: "something for a black tie gala" demanded gold and 39 mm, neither stated by the brief, so a
white-gold 40 mm dress watch scored as low as a dive watch. Each brief now states only what the user
stated (`must`) and reads the rest as grades 3/2/1 with the sentence the tier is argued from.

On the same 50 briefs, scored on the free arms, this moves the numbers a long way — not because
retrieval improved, but because a near miss is no longer counted as a failure:

| Metric | v1 labels (BM25) | v2 labels (BM25) |
|---|---|---|
| Precision@5 / mean grade | 0.21 | 0.44 |
| MRR | 0.32 | 0.63 |
| nDCG@10 | 0.17 | 0.30 |
| Hit rate@10 | 66% | 86% |
| Constraint violations in the top 10 | not measured | 13% |

**v1 and v2 numbers cannot be compared.** Everything published before 2026-09-24 is v1.

**The rubrics were checked blind.** `eval/judge-pool.mjs` pools candidates from BM25, the fused
retriever and three random watches, hides which system found what, and asks Haiku to grade them
against the rubric's own sentences. On 64 judgements across 12 briefs the first pass agreed exactly
59% of the time and within one grade 92%, with five two-grade disagreements. Three were the rubric's
fault and were moved: "light enough for golf" had matched a 43 mm ceramic chronograph, black tie
scored a 43.5 mm white-gold piece as zero, and "around five thousand" had been read more tightly
than the catalogue allows. After those fixes: **55% exact, 94% within one grade, one two-grade
disagreement left** — a 300 m Polaris the judge called "not sports" for a brief that says "not a
sports watch". That one is the rubric standing its ground, and it is why a stated constraint is a
constraint rather than a preference.

The judge costs $0.02 a pass and is a second opinion, never the source of truth.

**Is the new ruler better than the old one?** Not something the scores can answer: v2 reads higher
than v1 because the ruler changed, not because anything improved. What can be answered is which
version agrees with a judgement made without either ruler in view. `eval/label-versions.mjs` pools
the same candidates, asks for a 0-3 grade from the brief alone — no rubric, no predicate — and then
scores both label versions against those verdicts:

| Against a rubric-free judge, 64 watch/brief pairs | v1 (binary) | v2 (graded) |
|---|---|---|
| Exact agreement | 36% | 42% |
| Within one grade | 58% | 86% |
| Mean absolute error | 1.22 | 0.75 |
| Labelled 0 where the judge said 2 or 3 | 23 | 6 |

The last row is the one that matters: the old labels called a watch worthless 23 times out of 64
where an outside reader would have taken it seriously. That is what "the labels are too strict" looks
like when it is measured rather than argued.

## What the held-out run found, and what the fixes did

2026-09-23/24. The point of a held-out set is to find what tuning cannot. The first run found four
backend defects, all of them invisible under the v1 binary labels because a violation was scored the
same as an ordinary miss.

| Defect | What it did | Fix |
|---|---|---|
| Price on Request satisfied every budget | "under five thousand" answered with an A. Lange & Söhne tourbillon; 9 of 10 cards over budget | a stated budget requires `CurrentPrice > 0` |
| Stated spec constraints never filtered | "a green dial, nothing else matters" returned five non-green dials | `StatedConstraintFilter` over the candidate list, on both retrieval paths and Smart Search |
| A complaint was not read as a constraint | "anything over 40mm looks silly on me" set a floor of 40 mm, not a ceiling | the exclusion vocabulary reads complaints; a size complaint sets the ceiling |
| An ordinary word named a collection | "nothing else matters" resolved GMT-Master II and pinned the search to Rolex; "I hate date windows" resolved Datejust | a short name word must appear in the query, and a negated word cannot name a collection |

On the six briefs that failed, results breaking a stated constraint went **29 → 0**, with card counts
held or improved (f18 went from 0 cards to 10: the concierge had been reading the complaint as a
revision of a shortlist that did not exist, and searching nothing).

**A hypothesis that did not survive.** The brand-prestige sort was suspected of costing quality — it
promotes the most prestigious catalogue pieces into the visible cards, and Price on Request is
concentrated in those brands. Scored against the stored pools, the sort is not the problem: mean
grade over the three cards is **0.590 as shown against 0.562 in raw retrieval order**. It stays, and
the defect was the budget filter underneath it.

**Run-to-run spread.** The `bm25`, `hybrid` and `vector` arms are deterministic: two passes over the
held-out set return identical ids, so any movement between runs on those arms is a code change, not
noise. The concierge was then run twice over the same 36 briefs on the local model, with the reply
cache and the semantic cache cleared between the passes:

| Two concierge passes, Qwen 2.5 7B, held-out set | Pass A | Pass B |
|---|---|---|
| Mean grade over the top 5 | 0.467 | 0.467 |
| MRR | 0.746 | 0.746 |
| nDCG@10 | 0.344 | 0.344 |
| Hit rate@10 | 86.1% | 86.1% |
| Violations in the top 10 | 1.2% | 1.2% |
| Pool recall@50 / gain@3 | 0.389 / 0.667 | 0.389 / 0.667 |
| Latency, p50 | 23.6 s | 21.2 s |

Every card metric is identical to three decimals, and the p50 moved 10%. The model's temperature
leaves the parse and the classification the same, so what varies between two runs of this pipeline is
the prose and the wait, not the shortlist. A card metric that moves between runs is therefore a
change in the code or in the labels — which is what makes a before/after comparison readable.

**The last violation.** That 1.2% was a single brief, `f35` — "a bracelet, not a strap, I sweat
through leather" — where four of ten cards were on leather: the strap was not part of the parse at
all. Reading it needed the complaint to be cut from the sentence before the positive matcher runs,
because the word being complained about is the word the brief would otherwise be asking for.

That fix landed in the deterministic parser, and the next held-out run showed the same brief still
failing: the concierge reaches its retrieval through the **LLM parse**, which copies what the model
returned and runs none of the regex readers. Smart Search answered the brief correctly while the
concierge did not, from the same words. One reader now serves both paths, and the brief returns ten
cards and no violations — a reminder that a fix verified on one entry point is not a fix.

## Known gaps in these numbers
- **One request took 134 s** during the run, an API stall rather than pipeline work. It is the
  maximum, not the p95, so the table is unaffected.
- **Labels are one person's judgement**, and 50 queries per half detects large effects rather
  than small ones.

## Reproducing the concierge run

```bash
# .env: LLM_BASE_URL=https://api.anthropic.com, LLM_MODEL=claude-haiku-4-5, LLM_API_KEY=...
#       CHAT_PREFETCH_PARSE=true
# Cold caches: Postgres semantic cache, Redis reply cache, and the ai-service process.
docker compose -f docker-compose.yml -f docker-compose.nvidia.yml up -d --no-deps --force-recreate ai-service
node eval/run-eval.mjs --scope=semantic --arms=bm25,concierge
curl -s http://localhost:5000/usage      # what the run cost
```

The 2026-09-21 run cost **$0.74** on Haiku 4.5 for 50 briefs: 209 calls, 579k input and 31k output
tokens. Set `LLM_BUDGET_USD` on the ai-service to cap it; the cap refuses calls rather than
truncating the run cleanly, so leave headroom above the expected cost.
