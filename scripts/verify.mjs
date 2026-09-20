#!/usr/bin/env node
// Downloads each candidate at its exact HEAD commit and searches the source for a real Jev call.
// Writes data/verified.json. Run: node scripts/verify.mjs [input.json] [output.json]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execFile } from 'node:child_process'; import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const pexec = promisify(execFile);

const CODE_EXT = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.go','.rs','.rb','.java','.kt','.swift','.c','.h','.cpp','.cs','.php','.ex','.exs','.sh','.sql','.lua','.zig','.dart','.scala','.clj','.hs','.pl','.r','.m','.mm','.vue','.svelte','.astro','.ipynb','.yml','.yaml','.toml','.json']);
const PROSE_EXT = new Set(['.md','.mdx','.txt','.rst']);

// evidence patterns, strongest first
const PATTERNS = [
  ['endpoint',   /api\.typesafe\.ai|\/v1\/systemone/i],
  ['sdk',        /@typesafe-ai\/|typesafe[-_]sdk|from\s+typesafe\s+import|import\s+typesafe\b|TypeSafeClient|typesafe\.ai\/v1/i],
  ['model_id',   /typesafe[-_/]?ai\/jev|typesafe\/jev|jev-latest|jev-preview|jev-1\.\d+|@cf\/typesafe\/jev|"jev"|'jev'/i],
  ['ai_sdk',     /experimental_evaluate|experimental_evaluate as evaluate/i],
  ['primitives', /\bNoul\b|systemOne|system_one|SystemOne/],
];
const KIND_RANK = { endpoint:50, sdk:40, ai_sdk:35, model_id:30, primitives:10 };
const CONFIGISH = /(^|\/)(\.github|\.circleci|dist|build|docs?|examples?)\//;
const CONFIG_EXT = new Set(['.yml','.yaml','.toml','.json','.lock']);
function fileScore(rel, ext) {
  let s = 0;
  if (CONFIG_EXT.has(ext)) s -= 25; else s += 15;
  if (CONFIGISH.test(rel)) s -= 20;
  if (/(^|\/)(src|lib|app|pkg|internal|cmd)\//.test(rel)) s += 10;
  if (/(^|\/)(test|tests|__tests__|spec)\//.test(rel) || /\.(test|spec)\./.test(rel)) s -= 6;
  if (/(^|\/)(examples?|demos?|samples?)\//.test(rel)) s -= 4;
  s -= Math.min(6, rel.split('/').length);
  return s;
}
const walk = (dir, acc=[]) => {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'vendor' || e.name === 'dist' || e.name==='.venv') continue;
    const p = path.join(dir,e.name);
    if (e.isDirectory()) walk(p,acc); else if (e.isFile()) acc.push(p);
  }
  return acc;
};

async function verifyRepo(r, tmpRoot) {
  const dir = fs.mkdtempSync(path.join(tmpRoot,'r-'));
  const res = { full_name:r.full_name, ok:false, sha:null, evidence:null, evidence_file:null, evidence_line:null,
                evidence_snippet:null, n_evidence:0, kinds:[], code_bytes:0, prose_bytes:0, n_code_files:0, n_files:0,
                has_tests:false, has_ci:false, scaffold:false, error:null };
  try {
    // Resolve the exact commit first, then fetch that commit, so evidence links are permanent.
    const { stdout: ls } = await pexec('git', ['ls-remote', `https://github.com/${r.full_name}.git`, 'HEAD'],
                                       { timeout: 60_000 });
    const sha = (ls.match(/^([0-9a-f]{40})/) || [])[1];
    if (!sha) throw new Error('no sha');
    res.sha = sha;
    await pexec('bash',['-c',
      `curl -sfL --max-time 120 "https://codeload.github.com/${r.full_name}/tar.gz/${sha}" | tar -xz -C ${dir} 2>/dev/null`]);
    const tops = fs.readdirSync(dir);
    if (!tops.length) throw new Error('empty');
    const root = path.join(dir, tops[0]);
    const files = walk(root);
    res.n_files = files.length;
    const kinds = new Set(); const hits = [];
    for (const f of files) {
      const rel = path.relative(root,f); const ext = path.extname(f).toLowerCase();
      let st; try { st = fs.statSync(f); } catch { continue; }
      if (st.size > 2_000_000) continue;
      if (CODE_EXT.has(ext)) { res.code_bytes += st.size; res.n_code_files++; }
      else if (PROSE_EXT.has(ext)) res.prose_bytes += st.size;
      if (/(^|\/)(tests?|__tests__|spec)(\/|$)|\.(test|spec)\.[a-z]+$|^test_/.test(rel)) res.has_tests = true;
      if (rel.startsWith('.github/workflows/')) res.has_ci = true;
      if (!CODE_EXT.has(ext) && !PROSE_EXT.has(ext)) continue;
      let txt; try { txt = fs.readFileSync(f,'utf8'); } catch { continue; }
      const isProse = PROSE_EXT.has(ext);
      for (const [kind,re_] of PATTERNS) {
        if (!re_.test(txt)) continue;
        kinds.add(isProse ? `doc:${kind}` : kind);
        if (isProse) continue;
        const lines = txt.split('\n');
        const i = lines.findIndex(l=>re_.test(l));
        if (i < 0) continue;
        hits.push({ kind, file: rel, line: i+1, snippet: lines[i].trim().slice(0,160),
                    score: fileScore(rel, ext) + KIND_RANK[kind] });
      }
    }
    hits.sort((a,b)=>b.score-a.score);
    res.n_evidence = hits.length;
    if (hits.length) { const b = hits[0];
      res.evidence = b.kind; res.evidence_file = b.file; res.evidence_line = b.line; res.evidence_snippet = b.snippet; }
    res.kinds = [...kinds];
    const names = new Set(files.map(f=>path.basename(f)));
    res.scaffold = ['AGENTS.md','CLAUDE.md','STATE.md'].filter(n=>names.has(n)).length >= 3
                   && res.prose_bytes > res.code_bytes;
    res.ok = true;
  } catch(e) { res.error = String(e.message||e).slice(0,120); }
  finally { try { fs.rmSync(dir,{recursive:true,force:true}); } catch {} }
  return res;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = process.env.JEV_WORK_DIR || path.join(ROOT, 'data');
const input = process.argv[2] || path.join(WORK, 'rows.json');
const output = process.argv[3] || path.join(WORK, path.basename(input) === 'official.json' ? 'official_verified.json' : 'verified.json');
// Repositories with no stars and very large repositories are skipped to keep a refresh cheap.
const cands = JSON.parse(fs.readFileSync(input,'utf8'))
  .filter(r => (r.stars ?? 1) >= 1 && (r.size || 0) <= 40_000);
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(),'jevverify-'));
const out = []; let done = 0;
const CONC = 10;
await Promise.all(Array.from({length:CONC}, async () => {
  while (cands.length) {
    const r = cands.shift(); if (!r) break;
    out.push(await verifyRepo(r, tmpRoot));
    if (++done % 25 === 0) process.stderr.write(`${done} `);
  }
}));
fs.rmSync(tmpRoot,{recursive:true,force:true});
fs.writeFileSync(output, JSON.stringify(out,null,1));
console.log('\nverified', out.length, 'with code evidence:', out.filter(r=>r.evidence).length);
