#!/usr/bin/env node
// Spot-checks that evidence permalinks still resolve and still point at the recorded line.
// Usage: node scripts/check-links.mjs [sample-size]   (0 or "all" checks every entry)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/repos.json'), 'utf8'));
const withEvidence = db.entries.filter(e => e.evidence);

const arg = process.argv[2] ?? '40';
const size = arg === 'all' || arg === '0' ? withEvidence.length : Math.min(+arg, withEvidence.length);
const sample = size === withEvidence.length
  ? withEvidence
  : Array.from({ length: size }, (_, i) => withEvidence[Math.floor(i * withEvidence.length / size)]);

let ok = 0; const problems = [];
const queue = [...sample];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const e = queue.shift(); if (!e) break;
    const raw = `https://raw.githubusercontent.com/${e.repo}/${e.evidence.sha}/${e.evidence.file}`;
    try {
      const res = await fetch(raw);
      if (!res.ok) { problems.push([e.repo, `HTTP ${res.status}`]); continue; }
      const line = (await res.text()).split('\n')[e.evidence.line - 1] ?? '';
      if (line.trim().slice(0, 160) === e.evidence.snippet) ok++;
      else problems.push([e.repo, `line ${e.evidence.line} no longer matches`]);
    } catch (err) { problems.push([e.repo, String(err.message).slice(0, 60)]); }
  }
}));

for (const [repo, why] of problems) console.log(`✗ ${repo} — ${why}`);
console.log(`checked ${sample.length} of ${withEvidence.length}: ${ok} exact, ${problems.length} problems`);
process.exit(problems.length > sample.length * 0.05 ? 1 : 0);
