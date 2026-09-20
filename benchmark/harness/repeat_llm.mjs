// Determinism check for LLMs: the same 30 BoolQ items as special.mjs, asked 5 times each. Writes results/repeat_<model>.json
import fs from 'node:fs';
import { generateText } from 'ai';
const LLM = { baseline: 'openai/gpt-4.1-mini', sol: 'openai/gpt-5.6-sol', terra: 'openai/gpt-5.6-terra', luna: 'openai/gpt-5.6-luna' };
const target = process.argv[2];
const D = JSON.parse(fs.readFileSync('data/datasets.json'));
const sys = 'You are a precise classifier. Read the STATE and answer the yes/no QUESTION. Reply with JSON only: {"p_yes": <probability 0-1 that the answer is yes>}. Be calibrated.';
const opts = target === 'baseline' ? { temperature: 0, providerOptions: { openai: { responseFormat: { type: 'json_object' } } } } : { providerOptions: { openai: { responseFormat: { type: 'json_object' } } } };
async function ask(x) {
  const prompt = `STATE:\n${JSON.stringify({ passage: x.passage }, null, 1)}\n\nQUESTION: According to the passage, is the answer to the question "${x.question}?" yes?\n\nCRITERIA:\nyes = The passage indicates the answer is yes.\nno = The passage indicates the answer is no.`;
  const r = await generateText({ model: LLM[target], system: sys, prompt, maxRetries: 4, ...opts });
  return Number(JSON.parse(r.text.match(/\{[\s\S]*\}/)[0]).p_yes);
}
const out = await Promise.all(D.boolq.slice(0, 30).map(async x => ({ id: x.id, ps: await Promise.all(Array.from({ length: 5 }, () => ask(x))) })));
fs.writeFileSync(`results/repeat_${target}.json`, JSON.stringify(out));
const sp = out.map(r => Math.max(...r.ps) - Math.min(...r.ps));
console.log(target, 'identical', sp.filter(x => x === 0).length, 'flips', out.filter(r => new Set(r.ps.map(p => p >= .5)).size > 1).length, 'max', Math.max(...sp).toFixed(2));
