// Paired bootstrap CI for accuracy difference (JEV - other model), plus error overlap. Writes results/stats.json
// Usage: node stats.mjs [model]  (default: baseline; output file gets a suffix for other models)
import fs from 'node:fs';
const L = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(JSON.parse);
const OTHER = process.argv[2] ?? 'baseline';
const J = L('results/jev.jsonl'), B = Object.fromEntries(L(`results/${OTHER}.jsonl`).map(r => [r.id, r]));
const ok = r => r.kind === 'noul' ? (r.p >= .5) === r.label : r.choice === r.label;
const ans = r => r.kind === 'noul' ? r.p >= .5 : r.choice;
let seed = 1; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const out = {};
for (const s of [...new Set(J.map(r => r.suite))]) {
  const rows = J.filter(r => r.suite === s).map(r => [ok(r) ? 1 : 0, ok(B[r.id]) ? 1 : 0, r, B[r.id]]);
  const n = rows.length, diffs = [];
  for (let k = 0; k < 4000; k++) { let d = 0; for (let i = 0; i < n; i++) { const x = rows[Math.floor(rnd() * n)]; d += x[0] - x[1]; } diffs.push(d / n); }
  diffs.sort((a, b) => a - b);
  const jw = rows.filter(x => !x[0]);
  out[s] = { n, diff: +(rows.reduce((a, x) => a + x[0] - x[1], 0) / n).toFixed(3), lo: +diffs[100].toFixed(3), hi: +diffs[3899].toFixed(3),
    jev_wrong: jw.length, same_wrong_as_baseline: jw.filter(x => ans(x[2]) === ans(x[3])).length };
}
fs.writeFileSync(OTHER === 'baseline' ? 'results/stats.json' : `results/stats_${OTHER}.json`, JSON.stringify(out, null, 1));
for (const [s, v] of Object.entries(out)) console.log(s.padEnd(18), `diff ${v.diff} [${v.lo}, ${v.hi}]  JEV错${v.jev_wrong} 其中对照组同错${v.same_wrong_as_baseline}`);
