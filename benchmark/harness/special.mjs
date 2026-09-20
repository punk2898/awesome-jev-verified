// Determinism, clean latency, fan-out scaling and batch-vs-single agreement. Writes results/special.json
import fs from 'node:fs';
import { experimental_evaluate as evaluate, generateText } from 'ai';
const D = JSON.parse(fs.readFileSync('data/datasets.json'));
const SENT = { true: 'The review expresses a positive opinion of the movie.', false: 'The review expresses a negative opinion of the movie.' };
const prov = r => { const pa = r.providerMetadata?.gateway?.routing?.modelAttempts?.at(-1)?.providerAttempts?.at(-1); return pa ? pa.endTime - pa.startTime : null; };
async function ev(state, questions) { const t = performance.now(); const r = await evaluate({ model: 'typesafe-ai/jev', state, questions, maxRetries: 4 }); return { r, e2e: Math.round(performance.now() - t), prov: prov(r) }; }
const S = {};

// 1. Determinism: 30 items x 5 sequential repeats
S.repeat = [];
for (const x of D.boolq.slice(0, 30)) {
  const ps = [];
  for (let k = 0; k < 5; k++) { const { r } = await ev({ passage: x.passage }, { q: { type: 'boolean', instructions: `According to the passage, is the answer to the question "${x.question}?" yes?` } }); ps.push(r.answers.q.probability); }
  S.repeat.push({ id: x.id, ps });
}
console.log('repeat done');

// 2. Clean sequential latency, single question
S.latency_single = [];
for (const x of D.sst2.slice(0, 40)) { const { e2e, prov: p } = await ev(x.text, { q: { type: 'boolean', instructions: 'Is this movie review positive?', criteria: SENT } }); S.latency_single.push({ e2e, prov: p }); }
S.latency_baseline = [];
for (const x of D.sst2.slice(0, 20)) { const t = performance.now(); await generateText({ model: 'openai/gpt-4.1-mini', system: 'Reply with JSON only: {"p_yes": <0-1>}', prompt: `Review: ${x.text}\nIs this movie review positive?`, temperature: 0 }); S.latency_baseline.push({ e2e: Math.round(performance.now() - t) }); }
console.log('latency done');

// 3. Fan-out: N questions in one call (items dict in state), vs asking each alone
const items = D.sst2.slice(0, 100);
S.fanout = [];
for (const n of [1, 10, 25, 50, 100]) {
  const state = Object.fromEntries(items.slice(0, n).map((x, i) => [`review_${i}`, x.text]));
  const qs = Object.fromEntries(items.slice(0, n).map((x, i) => [`q${i}`, { type: 'boolean', instructions: `Is review_${i} positive?`, criteria: SENT }]));
  const runs = [];
  for (let k = 0; k < 3; k++) { const { r, e2e, prov: p } = await ev(state, qs); runs.push({ e2e, prov: p, in_tok: r.usage?.inputTokens, answers: Object.fromEntries(Object.entries(r.answers).map(([k2, v]) => [k2, v.probability])) }); }
  S.fanout.push({ n, runs, labels: items.slice(0, n).map(x => x.label) });
  console.log('fanout', n, runs.map(x => x.e2e));
}
fs.writeFileSync('results/special.json', JSON.stringify(S, null, 1));
console.log('special done');
