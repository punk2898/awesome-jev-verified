// Computes all metrics from results/*.jsonl + results/special.json into results/summary.json
import fs from 'node:fs';
const load = f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
// Every model with a complete run (the Opus 5 file only holds a 20-item pilot, so it is skipped).
const ALL = ['jev', 'baseline', 'sol', 'terra', 'luna', 'opus'];
const R = Object.fromEntries(ALL.filter(k => fs.existsSync(`results/${k}.jsonl`)).map(k => [k, load(`results/${k}.jsonl`)]).filter(([, v]) => v.length >= 2000));
const MODELS = Object.keys(R);
const idx = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, Object.fromEntries(v.map(r => [r.id, r]))]));
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r3 = x => Math.round(x * 1000) / 1000;

// For both kinds, reduce to (confidence in predicted answer, correct?) and for nouls also (p_yes, label)
const pred = r => r.kind === 'noul' ? { conf: Math.max(r.p, 1 - r.p), correct: (r.p >= 0.5) === r.label } : { conf: r.probs?.[r.choice] ?? r.confidence, correct: r.choice === r.label };
function calib(rows) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ lo: i / 10, n: 0, conf: 0, acc: 0 }));
  let brier = 0;
  for (const r of rows) {
    const { conf, correct } = pred(r);
    const b = bins[Math.min(9, Math.floor(conf * 10))]; b.n++; b.conf += conf; b.acc += correct ? 1 : 0;
    brier += r.kind === 'noul' ? (r.p - (r.label ? 1 : 0)) ** 2 : (conf - (correct ? 1 : 0)) ** 2;
  }
  const ece = bins.reduce((s, b) => s + (b.n ? b.n / rows.length * Math.abs(b.acc / b.n - b.conf / b.n) : 0), 0);
  const P = rows.map(pred);
  const wrong = P.filter(x => !x.correct);
  return { n: rows.length, acc: r3(mean(P.map(x => x.correct ? 1 : 0))), ece: r3(ece), brier: r3(brier / rows.length), mean_conf: r3(mean(P.map(x => x.conf))),
    confident_wrong: wrong.filter(x => x.conf >= 0.9).length, wrong: wrong.length,
    bins: bins.filter(b => b.n).map(b => ({ lo: b.lo, n: b.n, conf: r3(b.conf / b.n), acc: r3(b.acc / b.n) })) };
}
const S = { suites: {}, groups: {} };
const suites = [...new Set(R.jev.map(r => r.suite))];
for (const s of suites) S.suites[s] = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, calib(v.filter(r => r.suite === s))]));
const BENCH_NOUL = ['boolq', 'sst2', 'rte', 'truthfulqa'], BENCH_CHOICE = ['xnli_en', 'banking77', 'agnews'];
for (const [name, list] of [['bench_noul', BENCH_NOUL], ['bench_choice', BENCH_CHOICE], ['bench_all', [...BENCH_NOUL, ...BENCH_CHOICE]]])
  S.groups[name] = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, calib(v.filter(r => list.includes(r.suite)))]));

// Confidence gating (JEV's own confidence field on choice answers)
S.gating = {};
for (const k of MODELS) {
  const rows = R[k].filter(r => BENCH_CHOICE.includes(r.suite));
  S.gating[k] = [[0.9, 1.01], [0.7, 0.9], [0.5, 0.7], [0, 0.5]].map(([lo, hi]) => { const g = rows.filter(r => (r.confidence ?? 0) >= lo && (r.confidence ?? 0) < hi);
    return { range: `${lo}–${Math.min(hi, 1)}`, n: g.length, share: r3(g.length / rows.length), acc: r3(mean(g.map(r => r.choice === r.label ? 1 : 0))) }; });
}

// Consistency: negation pairs, paraphrase, noul-vs-choice, injection, distractor
const byGroup = (k, suite, base) => R[k].filter(r => r.suite === suite).map(r => [idx[k][r.id.replace(/-(neg|para\d|aschoice|inject|distract)$/, '')], r]).filter(([a]) => a && (!base || a.suite === base));
S.consistency = {};
for (const k of MODELS) {
  const c = {};
  for (const suite of ['c_negation', 'c_negation_boolq']) {
    const pairs = byGroup(k, suite);
    c[suite] = { n: pairs.length, mean_abs_sum_err: r3(mean(pairs.map(([a, b]) => Math.abs(a.p + b.p - 1)))), contradictory: pairs.filter(([a, b]) => (a.p >= 0.5) === (b.p >= 0.5)).length,
      examples: pairs.map(([a, b]) => ({ id: a.id, p: a.p, p_neg: b.p })).sort((x, y) => Math.abs(y.p + y.p_neg - 1) - Math.abs(x.p + x.p_neg - 1)).slice(0, 5) };
  }
  { const g = {}; for (const r of R[k].filter(r => r.suite === 'c_paraphrase')) { const id = r.id.replace(/-para\d$/, ''); (g[id] ??= [idx[k][id]?.p]).push(r.p); }
    const G = Object.values(g).filter(a => a.every(x => x != null));
    c.paraphrase = { n: G.length, mean_range: r3(mean(G.map(a => Math.max(...a) - Math.min(...a)))), flip_items: G.filter(a => new Set(a.map(x => x >= 0.5)).size > 1).length }; }
  { const pairs = byGroup(k, 'c_noul_vs_choice'); c.noul_vs_choice = { n: pairs.length, mean_abs_diff: r3(mean(pairs.map(([a, b]) => Math.abs(a.p - (b.probs?.yes ?? (b.choice === 'yes' ? b.confidence : 1 - b.confidence)))))),
    disagree: pairs.filter(([a, b]) => (a.p >= 0.5) !== (b.choice === 'yes')).length }; }
  { const pairs = byGroup(k, 'w_injection'); c.injection = { n: pairs.length, clean_acc: r3(mean(pairs.map(([a]) => pred(a).correct ? 1 : 0))), injected_acc: r3(mean(pairs.map(([, b]) => pred(b).correct ? 1 : 0))),
    flipped: pairs.filter(([a, b]) => pred(a).correct && !pred(b).correct).length, mean_shift: r3(mean(pairs.map(([a, b]) => Math.abs(a.p - b.p)))) }; }
  { const pairs = byGroup(k, 'w_distractor'); c.distractor = { n: pairs.length, clean_acc: r3(mean(pairs.map(([a]) => pred(a).correct ? 1 : 0))), distract_acc: r3(mean(pairs.map(([, b]) => pred(b).correct ? 1 : 0))) }; }
  { const u = R[k].filter(r => r.suite === 'h_unanswerable'), a = R[k].filter(r => r.suite === 'h_answerable');
    c.unanswerable = { n: u.length, said_not_stated: u.filter(r => r.choice === 'not_stated').length, invented_answer: u.filter(r => r.choice !== 'not_stated').length,
      invented_confident: u.filter(r => r.choice !== 'not_stated' && (r.probs?.[r.choice] ?? 0) >= 0.9).length, answerable_acc: r3(mean(a.map(r => r.choice === r.label ? 1 : 0))), answerable_n: a.length }; }
  S.consistency[k] = c;
}
// XNLI language comparison on the same items
S.language = Object.fromEntries(MODELS.map(k => [k, Object.fromEntries(['xnli_en', 'xnli_zh', 'xnli_zh_full'].map(s => [s, S.suites[s][k]]))]));

// Latency + cost from the main (concurrent) runs
S.perf = {};
for (const k of MODELS) {
  const e = R[k].map(r => r.e2e_ms), p = R[k].map(r => r.provider_ms).filter(x => x != null);
  S.perf[k] = { calls: R[k].length, e2e_p50: pct(e, .5), e2e_p90: pct(e, .9), e2e_p99: pct(e, .99), prov_p50: p.length ? pct(p, .5) : null, prov_p90: p.length ? pct(p, .9) : null, prov_min: p.length ? Math.min(...p) : null,
    total_cost: r3(R[k].reduce((s, r) => s + (r.cost || 0), 0) * 1000) / 1000, in_tok: R[k].reduce((s, r) => s + (r.in_tok || 0), 0) };
}
if (fs.existsSync('results/special.json')) {
  const X = JSON.parse(fs.readFileSync('results/special.json'));
  const sp = X.repeat.map(r => Math.max(...r.ps) - Math.min(...r.ps));
  S.determinism = { items: X.repeat.length, repeats: 5, identical_items: sp.filter(x => x === 0).length, max_spread: Math.max(...sp), mean_spread: r3(mean(sp)), flips: X.repeat.filter(r => new Set(r.ps.map(p => p >= 0.5)).size > 1).length, examples: X.repeat.slice(0, 8) };
  const rep = { jev: X.repeat };
  for (const k of MODELS) if (k !== 'jev' && fs.existsSync(`results/repeat_${k}.json`)) rep[k] = JSON.parse(fs.readFileSync(`results/repeat_${k}.json`));
  S.determinism_all = Object.fromEntries(Object.entries(rep).map(([k, rows]) => { const d = rows.map(r => Math.max(...r.ps) - Math.min(...r.ps));
    return [k, { items: rows.length, identical: d.filter(x => x === 0).length, flips: rows.filter(r => new Set(r.ps.map(p => p >= 0.5)).size > 1).length, max_spread: r3(Math.max(...d)), mean_spread: r3(mean(d)) }]; }));
  const le = X.latency_single.map(x => x.e2e), lp = X.latency_single.map(x => x.prov), lb = X.latency_baseline.map(x => x.e2e);
  S.latency_clean = { jev_e2e_p50: pct(le, .5), jev_e2e_p90: pct(le, .9), jev_prov_p50: pct(lp, .5), jev_prov_min: Math.min(...lp), jev_prov_p90: pct(lp, .9), under_100ms: lp.filter(x => x < 100).length, n: lp.length, base_e2e_p50: pct(lb, .5), base_e2e_p90: pct(lb, .9) };
  S.fanout = X.fanout.map(f => {
    const single = f.labels.map((_, i) => null);
    const agree = f.runs.slice(1).every(r => Object.keys(r.answers).every(q => r.answers[q] === f.runs[0].answers[q]));
    const acc = mean(Object.entries(f.runs[0].answers).map(([q, p]) => (p >= 0.5) === f.labels[+q.slice(1)] ? 1 : 0));
    // Compare batched answer with single-item answer from main sst2 run (same review, asked alone)
    const D = JSON.parse(fs.readFileSync('data/datasets.json'));
    const diffs = Object.entries(f.runs[0].answers).map(([q, p]) => { const s = idx.jev[D.sst2[+q.slice(1)].id]; return s ? Math.abs(s.p - p) : null; }).filter(x => x != null);
    const flips = Object.entries(f.runs[0].answers).filter(([q, p]) => { const s = idx.jev[D.sst2[+q.slice(1)].id]; return s && (s.p >= 0.5) !== (p >= 0.5); }).length;
    return { n: f.n, e2e_p50: pct(f.runs.map(r => r.e2e), .5), prov_p50: pct(f.runs.map(r => r.prov), .5), ms_per_q: r3(pct(f.runs.map(r => r.prov), .5) / f.n), in_tok: f.runs[0].in_tok, repeat_identical: agree, acc: r3(acc), mean_diff_vs_single: r3(mean(diffs)), flips_vs_single: flips };
  });
}
fs.writeFileSync('results/summary.json', JSON.stringify(S, null, 1));
const row = o => MODELS.map(k => `${(o[k].acc * 100).toFixed(1).padStart(5)}/${o[k].ece.toFixed(3)}`).join('  ');
console.log('acc%/ECE'.padEnd(18), MODELS.map(k => k.padEnd(11)).join(' '));
for (const s of suites) console.log(s.padEnd(18), row(S.suites[s]));
for (const g in S.groups) console.log(g.padEnd(18), row(S.groups[g]));
console.log(JSON.stringify({ gating: S.gating, consistency: S.consistency, perf: S.perf, determinism: S.determinism && { ...S.determinism, examples: undefined }, latency_clean: S.latency_clean, fanout: S.fanout }, null, 1));
