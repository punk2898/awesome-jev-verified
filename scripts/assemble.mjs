#!/usr/bin/env node
// Merges discovery metadata + evidence + Jev's classification into data/repos.json and data/leads.json.
// Run after verify.mjs and classify.mjs, before build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = process.env.JEV_WORK_DIR || path.join(ROOT, 'data');
const read = f => JSON.parse(fs.readFileSync(path.join(WORK, f), 'utf8'));

// Official repositories are included on provenance: they are published by TypeSafe itself.
const OFFICIAL = new Set([
  'typesafe-ai/skills', 'typesafe-ai/system-one-adapter-python',
  'typesafe-ai/typesafe-sdk-js', 'typesafe-ai/typesafe-sdk-python',
]);

const JEV_TOKEN = /(^|[^a-z])jev([^a-z]|$)/i;
const aboutJev = r =>
  JEV_TOKEN.test(String(r.name || '').replace(/[-_]/g, ' ')) ||
  JEV_TOKEN.test(r.desc || r.desc_from_readme || '') ||
  /typesafe/i.test(r.desc || r.desc_from_readme || '');

const rows = read('rows.json');
const evidence = new Map(read('verified.json').map(r => [r.full_name, r]));
const officialRows = read('official.json');
const officialEvidence = new Map(read('official_verified.json').map(r => [r.full_name, r]));

const entry = (r, v, category, tier) => ({
  repo: r.full_name,
  url: `https://github.com/${r.full_name}`,
  tier,
  desc: (r.desc && r.desc.length >= 12 ? r.desc : (r.desc_from_readme || r.desc || '')).replace(/\s+/g, ' ').trim(),
  stars: r.stars,
  lang: r.lang,
  license: r.license,
  topics: (r.topics || []).slice(0, 8),
  pushed: r.pushed.slice(0, 10),
  created: r.created.slice(0, 10),
  category,
  evidence: v && v.evidence && v.sha ? {
    kind: v.evidence, file: v.evidence_file, line: v.evidence_line,
    snippet: v.evidence_snippet, matches: v.n_evidence, sha: v.sha,
    permalink: `https://github.com/${r.full_name}/blob/${v.sha}/${v.evidence_file}#L${v.evidence_line}`,
  } : null,
  doc_markers: (v ? v.kinds : []).filter(k => k.startsWith('doc:')).map(k => k.slice(4)),
  shape: v ? {
    code_files: v.n_code_files, code_kb: Math.round(v.code_bytes / 1024),
    prose_kb: Math.round(v.prose_bytes / 1024), tests: v.has_tests, ci: v.has_ci,
  } : null,
  jev_says: r.uses !== undefined
    ? { uses_jev: r.uses, reusable: r.reusable, maturity: r.maturity, category_confidence: r.cat_conf }
    : null,
});

const listed = [], leads = [];
for (const r of officialRows) {
  if (OFFICIAL.has(r.full_name)) listed.push(entry(r, officialEvidence.get(r.full_name), 'official', 'official'));
}
for (const r of rows) {
  const v = evidence.get(r.full_name);
  const hasProof = !!(v && v.evidence && v.sha);
  const e = entry(r, v, r.category_override || r.cat, hasProof ? 'verified' : 'resource');
  if (hasProof && aboutJev(r)) listed.push(e);
  else if (r.cat === 'list' && aboutJev(r)) listed.push({ ...e, tier: 'resource' });
  else leads.push(e);
}

const bySt = (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo);
listed.sort(bySt); leads.sort(bySt);
const today = new Date().toISOString().slice(0, 10);

fs.writeFileSync(path.join(ROOT, 'data/repos.json'),
  JSON.stringify({ generated_at: today, count: listed.length, entries: listed }, null, 1));
fs.writeFileSync(path.join(ROOT, 'data/leads.json'), JSON.stringify({
  note: 'Matched a Jev-related search but did not meet the inclusion rule: no code-level evidence, and not a Jev-focused resource. Kept so the exclusions are auditable.',
  generated_at: today, count: leads.length, entries: leads,
}, null, 1));

console.log(`assembled ${listed.length} listed (${listed.filter(e => e.evidence).length} with proof), ${leads.length} leads`);
