// Grades the concierge's prose, which every other metric in this harness ignores.
//
// run-eval scores the cards. A reply can carry the right ten watches and still fail the customer:
// answer a different question, claim a spec the catalogue does not support, or end on a question
// that leads nowhere. This reads the stored replies from a finished run and grades each one.
//
// The judge is a stronger model than the one that wrote the reply — Haiku grading its own prose is
// not an independent opinion. It is still a model grading a model, so the number to report is the
// distribution with the low grades quoted, never a single headline figure.
//
// The judge is shown what the concierge itself was given for the cards beside the reply: each card's
// record in the same fields, and the note of each collection among them. A claim is checked against
// what the writer could see, whether the reply names the watch by reference or by model name. Thinking is off: the verdict is a
// short JSON object, and thinking tokens bill as output.
//
// Usage:
//   node eval/judge-reply.mjs --from=eval/results/eval-<stamp>.json
//   node eval/judge-reply.mjs --from=<run>.json --arm=concierge --limit=10
//   node eval/judge-reply.mjs --from=<run>.json --out=eval/results/reply-grades.json
//   node eval/judge-reply.mjs --from=<run>.json --dry-run          # estimated cost, no calls
//   node eval/judge-reply.mjs --from=<run>.json --budget=0.30      # refuse to start, or stop, past $0.30
//   node eval/judge-reply.mjs --from=<run>.json --batch            # Message Batches API: half price, minutes not seconds
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCatalogue } from './catalogue.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const BASE_URL = args['base-url'] ?? process.env.BASE_URL ?? 'http://localhost:5248';
const FROM = args.from;
const ARM = args.arm ?? 'concierge';
const MODEL = args.model ?? 'claude-sonnet-5-5';
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const CARDS_SHOWN = Number(args.cards ?? 10);

// Claude Sonnet 5.5 list price, US dollars per million tokens (Anthropic pricing table, 2026-09-25).
const PRICE_IN = 2, PRICE_OUT = 10;
// The Message Batches API bills every token at half price; the requests, and so the grades, are the same.
const BATCH = Boolean(args.batch);
const DISCOUNT = BATCH ? 0.5 : 1;
const BUDGET = args.budget ? Number(args.budget) : null;
// A verdict is about 80 tokens of JSON; the estimate allows half again.
const OUTPUT_ESTIMATE = 120;
// Input billed beyond the prompt's own text, mostly the verdict schema: 510 and 497 tokens a request
// on the two runs measured 2026-10-02, where characters alone had put the input at about half.
const REQUEST_OVERHEAD = 500;
const priceAt = (rate, inputTokens, outputTokens) => rate * (inputTokens * PRICE_IN + outputTokens * PRICE_OUT) / 1_000_000;
const estimateCost = (inputTokens, outputTokens) => priceAt(DISCOUNT, inputTokens, outputTokens);
// About 3.5 characters per token for English prose with numbers, rounded toward more tokens.
const estimateTokens = text => Math.ceil(text.length / 3.5) + REQUEST_OVERHEAD;

const DIM = '\x1b[2m', BOLD = '\x1b[1m', RESET = '\x1b[0m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m', RED = '\x1b[31m';

/// The key lives in .env and nowhere else. It is read even when commented out, because local .env
/// keeps it commented while the stack runs on the local model.
function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const match = /^#?\s*LLM_API_KEY=(.+)$/m.exec(env);
  if (!match) throw new Error('No LLM_API_KEY in .env and no ANTHROPIC_API_KEY in the environment');
  return match[1].trim();
}

/// What the judge is shown about one watch: the fields the concierge was given, in the order
/// ChatService.BuildChatSpecs writes them, with the record's own wording ("Minimum 65 hours").
function describe(watch) {
  const s = watch.specs ?? {};
  return [
    summarise(watch.description),
    `${watch.brandName} ${watch.collectionName} ${watch.name}`.replace(/\s+/g, ' ').trim(),
    watch.price > 0 ? `$${watch.price.toLocaleString('en-AU')}` : 'price on request',
    s.case?.material,
    s.case?.diameter,
    s.case?.waterResistance ? `water resistance ${s.case.waterResistance}` : null,
    s.dial?.color ? `${s.dial.color} dial` : null,
    s.movement?.type,
    s.movement?.powerReserve ? `power reserve ${s.movement.powerReserve}` : null,
    (s.movement?.functions ?? []).slice(0, 6).join(', ') || null,
    s.strap?.material,
  ].filter(Boolean).join(' | ');
}

/// The watch's own copy as ChatService.Summarise sends it: cut at a sentence boundary near 180 characters.
function summarise(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed.length <= 180) return trimmed || null;
  const cut = Math.max(...['.', '!', '?'].map(mark => trimmed.lastIndexOf(mark, Math.min(180, trimmed.length - 1))));
  return cut > 40 ? trimmed.slice(0, cut + 1) : `${trimmed.slice(0, 180).trimEnd()}…`;
}

/// What the concierge was given beside the reply: every card shown, and the note of each collection
/// among them. Showing only the cards a reply names by reference hid every watch it named by model
/// name ("the Seamaster Diver 300M"), so true claims about those were graded as invented.
function shownEvidence(row, catalogue) {
  const cards = (row.rankedIds ?? []).slice(0, CARDS_SHOWN).map(id => catalogue.byId.get(id)).filter(Boolean);
  const notes = new Map(cards.filter(w => w.collectionDescription)
    .map(w => [w.collectionId, `${w.brandName} ${w.collectionName}: ${w.collectionDescription.trim()}`]));
  return { cards: cards.map(describe), collections: [...notes.values()] };
}

function prompt(row, evidence) {
  const shown = evidence.cards.length
    ? evidence.cards.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '(no watches were shown with this reply)';
  const notes = evidence.collections.length
    ? `\n\nThe collection notes it was given:\n${evidence.collections.map(note => `- ${note}`).join('\n')}`
    : '';
  return `A customer wrote to a luxury watch concierge: "${row.query}"

The concierge replied:
"""
${row.reply}
"""

The catalogue records the concierge was given for the watches shown beside its reply:
${shown}${notes}

Scenario-specific expectations:
${(row.replyChecks ?? []).map(check => `- ${check}`).join('\n') || '(none beyond the customer request)'}
Evaluate these expectations as well as the cards. Admit missing catalogue facts rather than
rewarding invented fit, availability, durability or movement claims.

Grade the reply 0-3:
  3: answers what was actually asked, every specific claim is supported by the watches shown, and it ends somewhere useful
  2: answers the request, nothing in it is wrong, but it is generic or the closing line adds little
  1: partly answers, or leans on the customer to restate what they already said
  0: answers a different question, or states something the watches shown do not support

Also report whether every factual claim the reply makes about a watch (price, size, material,
complication, movement, strap) is supported by the records and notes above.

Reply with one JSON object and no prose:
{"grade": 2, "supported": true, "why": "at most fifteen words", "unsupported": "the claim, or empty"}`;
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    grade: { type: 'integer', enum: [0, 1, 2, 3] },
    supported: { type: 'boolean' },
    why: { type: 'string' },
    unsupported: { type: 'string' },
  },
  required: ['grade', 'supported', 'why', 'unsupported'],
  additionalProperties: false,
};

const headers = key => ({ 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' });

/// One judging request, the same whether it is sent alone or inside a batch.
function requestParams(text) {
  return {
    // Sonnet 5.5 rejects { type: 'disabled' }; between_tools is its thinking-off setting, and with
    // no tools in the request it never thinks.
    model: MODEL, max_tokens: 400, thinking: { type: 'between_tools' },
    // Asked for JSON alone, Sonnet 5.5 still walks through each claim in prose first and can run
    // out of tokens before the verdict; a schema makes the verdict the whole reply.
    output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    messages: [{ role: 'user', content: text }],
  };
}

function readVerdict(message) {
  const out = (message.content ?? []).map(part => part.text ?? '').join('');
  const match = /\{[\s\S]*\}/.exec(out);
  // A verdict cut off at the ceiling still carries its grade, and the grade is what is reported.
  if (!match) {
    const grade = /"grade"\s*:\s*([0-3])/.exec(out);
    if (!grade) throw new Error(`No JSON in the judge's reply: ${out.slice(0, 120)}`);
    return { grade: Number(grade[1]), supported: !/"supported"\s*:\s*false/.test(out), why: 'verdict truncated' };
  }
  return JSON.parse(match[0]);
}

async function judge(text, key) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: headers(key), body: JSON.stringify(requestParams(text)),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return { verdict: readVerdict(body), usage: body.usage ?? {}, rate: 1 };
}

/// Sends every prompt as one Message Batch, waits for it to end and returns the results in prompt
/// order. A batch cannot stop part-way, so its budget is checked once, before it is sent. A request
/// the batch could not run is not billed there and is judged again on its own, at full price.
async function judgeBatch(prompts, key) {
  const api = 'https://api.anthropic.com/v1/messages/batches';
  const created = await fetch(api, {
    method: 'POST', headers: headers(key),
    body: JSON.stringify({ requests: prompts.map((text, i) => ({ custom_id: `reply-${i}`, params: requestParams(text) })) }),
  });
  if (!created.ok) throw new Error(`Anthropic HTTP ${created.status}: ${(await created.text()).slice(0, 200)}`);
  let batch = await created.json();
  console.log(`${DIM}  batch ${batch.id}${RESET}`);
  while (batch.processing_status !== 'ended') {
    await new Promise(resolve => setTimeout(resolve, 15_000));
    const res = await fetch(`${api}/${batch.id}`, { headers: headers(key) });
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status} polling ${batch.id}`);
    batch = await res.json();
    const c = batch.request_counts;
    process.stdout.write(`\r${DIM}  ${c.succeeded + c.errored + c.canceled + c.expired}/${prompts.length} judged in the batch${RESET}`);
  }

  const res = await fetch(batch.results_url, { headers: headers(key) });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status} reading the results of ${batch.id}`);
  const results = new Array(prompts.length);
  for (const line of (await res.text()).split('\n').filter(Boolean)) {
    const { custom_id: id, result } = JSON.parse(line);
    if (result.type !== 'succeeded') continue;
    results[Number(id.slice('reply-'.length))] = { verdict: readVerdict(result.message), usage: result.message.usage ?? {}, rate: 0.5 };
  }
  for (const [index, text] of prompts.entries())
    if (!results[index]) results[index] = await judge(text, key);
  return results;
}

async function main() {
  if (!FROM) throw new Error('--from=eval/results/<run>.json is required');
  const run = JSON.parse(readFileSync(FROM, 'utf8'));
  const rows = (run.rows?.[ARM] ?? []).filter(r => r.reply && !r.error).slice(0, LIMIT);
  if (rows.length === 0) throw new Error(`No stored replies on arm "${ARM}" in ${FROM}. Re-run the arm after the harness started storing them.`);

  const catalogue = await loadCatalogue(BASE_URL);
  const prompts = rows.map(row => prompt(row, shownEvidence(row, catalogue)));

  // Every prompt is built before any call, so the cost is known before money is spent.
  const estimate = prompts.reduce((sum, text) => sum + estimateCost(estimateTokens(text), OUTPUT_ESTIMATE), 0);
  console.log(`${BOLD}Reply grades${RESET} ${DIM}${rows.length} replies from ${FROM}, judged by ${MODEL}${RESET}`);
  console.log(`${DIM}  estimated cost $${estimate.toFixed(3)}${BUDGET != null ? `, budget $${BUDGET.toFixed(2)}` : ''}${RESET}\n`);
  if (args['dry-run']) return;
  if (BUDGET != null && estimate > BUDGET)
    throw new Error(`Estimated $${estimate.toFixed(3)} is over the $${BUDGET.toFixed(2)} budget; nothing was sent.`);

  const key = apiKey();
  const graded = [];
  let inputTokens = 0, outputTokens = 0, spent = 0;
  const batched = BATCH ? await judgeBatch(prompts, key) : null;
  for (const [index, row] of rows.entries()) {
    // Spent so far is priced from the usage each response reported, not from the estimate.
    const next = estimateCost(estimateTokens(prompts[index]), OUTPUT_ESTIMATE);
    if (!BATCH && BUDGET != null && spent + next > BUDGET)
      throw new Error(`Stopped before reply ${index + 1}: the next call could pass the $${BUDGET.toFixed(2)} budget.`);
    const { verdict, usage, rate } = batched ? batched[index] : await judge(prompts[index], key);
    inputTokens += usage.input_tokens ?? 0;
    outputTokens += usage.output_tokens ?? 0;
    spent += priceAt(rate, usage.input_tokens ?? 0, usage.output_tokens ?? 0);
    graded.push({
      id: row.queryId, query: row.query, reply: row.reply,
      grade: Number(verdict.grade), supported: verdict.supported !== false,
      why: verdict.why ?? '', unsupported: verdict.unsupported ?? '',
    });
    process.stdout.write(`\r${DIM}  ${graded.length}/${rows.length} judged${RESET}`);
  }
  console.log(`\r${' '.repeat(34)}\r`);

  const counts = [0, 1, 2, 3].map(g => graded.filter(r => r.grade === g).length);
  const mean = graded.reduce((sum, r) => sum + r.grade, 0) / graded.length;
  const unsupported = graded.filter(r => !r.supported);

  console.log(`  replies         ${graded.length}`);
  console.log(`  mean grade      ${GREEN}${mean.toFixed(2)}${RESET} ${DIM}of 3${RESET}`);
  for (const g of [3, 2, 1, 0])
    console.log(`  grade ${g}         ${String(counts[g]).padStart(3)}  ${DIM}${((counts[g] / graded.length) * 100).toFixed(0)}%${RESET}`);
  console.log(`  unsupported     ${unsupported.length ? RED : ''}${unsupported.length}${RESET} ${DIM}replies claiming something the cards do not show${RESET}`);
  const cost = spent;
  console.log(`  cost            $${cost.toFixed(3)} ${DIM}(${inputTokens} in, ${outputTokens} out; estimated $${estimate.toFixed(3)}${BATCH ? ' at batch price' : ''})${RESET}`);

  // The weak replies are listed by brief, which a sealed run must not show while it can still steer.
  const sealed = run.set === 'test' && !args.unseal;
  const weak = graded.filter(r => r.grade <= 1).sort((a, b) => a.grade - b.grade);
  if (sealed && weak.length) console.log(`\n${DIM}per-reply grades hidden: sealed set (--unseal once the numbers are recorded)${RESET}`);
  if (weak.length && !sealed) {
    console.log(`\n${BOLD}Graded 0 or 1${RESET} ${DIM}the judge's reason, then the reply${RESET}`);
    for (const row of weak) {
      console.log(`  ${YELLOW}${row.id}${RESET} ${DIM}"${row.query.slice(0, 52)}"${RESET}`);
      console.log(`      ${DIM}grade ${row.grade}: ${row.why}${row.unsupported ? ` | unsupported: ${row.unsupported}` : ''}${RESET}`);
      console.log(`      ${row.reply.replace(/\s+/g, ' ').slice(0, 150)}`);
    }
  }

  if (args.out) {
    writeFileSync(args.out, JSON.stringify({
      model: MODEL, from: FROM, arm: ARM, batch: BATCH, mean, counts,
      cost: { usd: Number(cost.toFixed(4)), inputTokens, outputTokens }, rows: graded,
    }, null, 2));
    console.log(`\n${DIM}wrote ${args.out}${RESET}`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
