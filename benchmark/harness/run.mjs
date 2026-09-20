// Runs tasks against JEV or an LLM. Usage: node --env-file=.env.local run.mjs <jev|baseline|opus> [suiteRegex] [concurrency] [idsFile]
// Results are appended to results/<target>.jsonl and skipped on re-run, so the script is resumable.
import fs from 'node:fs';
import { experimental_evaluate as evaluate, generateText } from 'ai';
const [target = 'jev', suiteRe = '.*', conc = '8', idsFile] = process.argv.slice(2);
const only = idsFile ? new Set(JSON.parse(fs.readFileSync(idsFile))) : null;
const LLM = { baseline: 'openai/gpt-4.1-mini', opus: 'anthropic/claude-opus-5', sol: 'openai/gpt-5.6-sol', terra: 'openai/gpt-5.6-terra', luna: 'openai/gpt-5.6-luna' };
const out = `results/${target}.jsonl`;
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const tasks = JSON.parse(fs.readFileSync('data/tasks.json')).filter(t => new RegExp(suiteRe).test(t.suite) && !done.has(t.id) && (!only || only.has(t.id)));
console.log(`${target}: ${tasks.length} to run (${done.size} already done)`);

async function jev(t) {
  const q = t.kind === 'noul' ? { type: 'boolean', instructions: t.instructions, criteria: t.criteria } : { type: 'choice', instructions: t.instructions, criteria: t.criteria };
  const t0 = performance.now();
  const r = await evaluate({ model: 'typesafe-ai/jev', state: t.state, questions: { q }, maxRetries: 4 });
  const e2e = performance.now() - t0;
  const g = r.providerMetadata?.gateway, pa = g?.routing?.modelAttempts?.at(-1)?.providerAttempts?.at(-1);
  const a = r.answers.q;
  return { p: a.probability, choice: a.choice, probs: a.probabilities, confidence: r.providerMetadata?.typesafe?.confidence?.q,
    e2e_ms: Math.round(e2e), provider_ms: pa ? pa.endTime - pa.startTime : null, in_tok: r.usage?.inputTokens, cost: Number(g?.marketCost ?? g?.cost ?? 0) };
}

const stateText = s => typeof s === 'string' ? s : JSON.stringify(s, null, 1);
async function baseline(t) {
  const sys = t.kind === 'noul'
    ? 'You are a precise classifier. Read the STATE and answer the yes/no QUESTION. Reply with JSON only: {"p_yes": <probability 0-1 that the answer is yes>}. Be calibrated.'
    : 'You are a precise classifier. Read the STATE and pick exactly one OPTION key. Reply with JSON only: {"choice": "<option key>", "confidence": <probability 0-1 that your choice is correct>}. Be calibrated.';
  const crit = t.kind === 'noul' ? `yes = ${t.criteria.true}\nno = ${t.criteria.false}` : Object.entries(t.criteria).map(([k, v]) => `${k}: ${v}`).join('\n');
  const prompt = `STATE:\n${stateText(t.state)}\n\nQUESTION: ${t.instructions}\n\n${t.kind === 'noul' ? 'CRITERIA' : 'OPTIONS'}:\n${crit}`;
  const t0 = performance.now();
  // Reasoning models (Opus 5, GPT-5.6) run with their default settings: they reject temperature. GPT-4.1-mini runs at temperature 0.
  const opts = target === 'opus' ? {} : target === 'baseline' ? { temperature: 0, providerOptions: { openai: { responseFormat: { type: 'json_object' } } } } : { providerOptions: { openai: { responseFormat: { type: 'json_object' } } } };
  const r = await generateText({ model: LLM[target], system: sys, prompt, maxRetries: 4, ...opts });
  const e2e = performance.now() - t0;
  const j = JSON.parse(r.text.match(/\{[\s\S]*\}/)[0]);
  const g = r.providerMetadata?.gateway;
  const base = { e2e_ms: Math.round(e2e), in_tok: r.usage?.inputTokens, out_tok: r.usage?.outputTokens, reason_tok: r.usage?.outputTokenDetails?.reasoningTokens ?? r.usage?.reasoningTokens, cost: Number(g?.marketCost ?? g?.cost ?? 0) };
  if (t.kind === 'noul') return { p: Math.min(1, Math.max(0, Number(j.p_yes))), ...base };
  const c = String(j.choice); const conf = Math.min(1, Math.max(0, Number(j.confidence)));
  const keys = Object.keys(t.criteria), k = keys.includes(c) ? c : keys.find(x => x.toLowerCase() === c.toLowerCase().replace(/ /g, '_')) ?? c;
  // Spread the remaining mass evenly so the baseline also yields a distribution.
  const probs = Object.fromEntries(keys.map(x => [x, x === k ? conf : (1 - conf) / (keys.length - 1)]));
  return { choice: k, probs, confidence: conf, ...base };
}

const fn = target === 'jev' ? jev : baseline;
const fd = fs.openSync(out, 'a');
let i = 0, n = 0, errs = 0;
async function worker() {
  while (i < tasks.length) {
    const t = tasks[i++];
    try { const r = await fn(t); fs.writeSync(fd, JSON.stringify({ id: t.id, suite: t.suite, kind: t.kind, label: t.label, ...r }) + '\n'); }
    catch (e) { errs++; console.error('ERR', t.id, String(e.message).slice(0, 160)); }
    if (++n % 100 === 0) console.log(`${n}/${tasks.length}`);
  }
}
await Promise.all(Array.from({ length: +conc }, worker));
console.log(`done: ${n - errs} ok, ${errs} errors`);
