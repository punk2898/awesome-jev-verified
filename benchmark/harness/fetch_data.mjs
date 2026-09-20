// Fetch labeled public datasets from HuggingFace datasets-server with a fixed seed.
import fs from 'node:fs';
let seed = 20260919; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
async function page(dataset, config, split, offset) {
  const u = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${config}&split=${split}&offset=${offset}&length=100`;
  const cf = `data/cache/${dataset.replace('/', '_')}_${config}_${split}_${offset}.json`;
  if (fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf));
  for (let i = 0; i < 8; i++) { const r = await fetch(u); if (r.ok) { const rows = (await r.json()).rows.map(x => ({ idx: x.row_idx, ...x.row })); fs.writeFileSync(cf, JSON.stringify(rows)); return rows; } await new Promise(s => setTimeout(s, 5000 * (i + 1))); }
  throw new Error('fetch failed ' + u);
}
async function sample(dataset, config, split, total, n, pagesN) {
  const offs = shuffle([...Array(Math.ceil(total / 100)).keys()]).slice(0, pagesN).map(p => p * 100);
  let rows = []; for (const o of offs) rows.push(...await page(dataset, config, split, o));
  return shuffle(rows).slice(0, n);
}
const out = {};
out.boolq = (await sample('google/boolq', 'default', 'validation', 3270, 200, 6)).map(r => ({ id: 'boolq-' + r.idx, passage: r.passage, question: r.question, label: r.answer }));
out.sst2 = (await sample('stanfordnlp/sst2', 'default', 'validation', 872, 150, 5)).map(r => ({ id: 'sst2-' + r.idx, text: r.sentence, label: r.label === 1 }));
out.rte = (await sample('nyu-mll/glue', 'rte', 'validation', 277, 150, 3)).map(r => ({ id: 'rte-' + r.idx, premise: r.sentence1, hypothesis: r.sentence2, label: r.label === 0 }));
// XNLI: same rows in en and zh
{ const offs = shuffle([...Array(51).keys()]).slice(0, 4).map(p => p * 100); const en = [], zh = [];
  for (const o of offs) { en.push(...await page('facebook/xnli', 'en', 'test', o)); zh.push(...await page('facebook/xnli', 'zh', 'test', o)); }
  const pick = shuffle([...en.keys()]).slice(0, 150); const L = ['entailment', 'neutral', 'contradiction'];
  out.xnli = pick.map(i => ({ id: 'xnli-' + en[i].idx, en: { premise: en[i].premise, hypothesis: en[i].hypothesis }, zh: { premise: zh[i].premise, hypothesis: zh[i].hypothesis }, label: L[en[i].label] }));
  if (pick.some(i => en[i].label !== zh[i].label)) throw new Error('xnli misaligned'); }
out.banking77 = (await sample('mteb/banking77', 'default', 'test', 3076, 150, 8)).map(r => ({ id: 'b77-' + r.idx, text: r.text, label: r.label_text }));
{ const all = []; for (let o = 0; o < 3076; o += 100) for (const r of await page('mteb/banking77', 'default', 'test', o)) all.push(r.label_text); out.banking77_labels = [...new Set(all)].sort(); }
const AG = ['World', 'Sports', 'Business', 'Sci/Tech'];
out.agnews = (await sample('fancyzhx/ag_news', 'default', 'test', 7600, 100, 4)).map(r => ({ id: 'ag-' + r.idx, text: r.text, label: AG[r.label] }));
out.truthfulqa = (await sample('truthfulqa/truthful_qa', 'multiple_choice', 'validation', 817, 150, 9)).flatMap(r => {
  const c = r.mc1_targets.choices, l = r.mc1_targets.labels; const good = c[l.indexOf(1)]; const bads = c.filter((_, i) => !l[i]); const bad = bads[Math.floor(rnd() * bads.length)];
  return [{ id: `tqa-${r.idx}-t`, question: r.question, answer: good, label: true }, { id: `tqa-${r.idx}-f`, question: r.question, answer: bad, label: false }];
});
fs.writeFileSync('data/datasets.json', JSON.stringify(out, null, 1));
for (const k in out) console.log(k, out[k].length);
