#!/usr/bin/env node
// Mines real Jev question sets out of the verified repositories' source code.
// Reads data/repos.json, writes mined.json: one entry per question set, with a
// permalink to the file and line it came from.
// Run: node scripts/extract-questions.mjs [max-repos]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execFile } from 'node:child_process'; import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const pexec = promisify(execFile);

/** Matches a balanced {...} (or (...)) starting at `open`, skipping strings and comments. */
function balanced(text, open) {
  const pairs = { '{': '}', '(': ')' };
  const close = pairs[text[open]];
  if (!close) return null;
  let depth = 0, i = open, q = null;
  while (i < text.length) {
    const c = text[i], prev = text[i - 1];
    if (q) {
      if (c === q && prev !== '\\') q = null;
      else if (q === '`' && c === '$' && text[i + 1] === '{') { const inner = balanced(text, i + 1); if (inner) { i = inner.end; continue; } }
    } else if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '/' && text[i + 1] === '/') { const nl = text.indexOf('\n', i); if (nl < 0) break; i = nl; }
    else if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i); if (e < 0) break; i = e + 1; }
    else if (c === '#' && /\.py$/.test(text.__ext || '')) { const nl = text.indexOf('\n', i); if (nl < 0) break; i = nl; }
    else if (c === text[open]) depth++;
    else if (c === close) { depth--; if (depth === 0) return { text: text.slice(open, i + 1), end: i }; }
    i++;
  }
  return null;
}

const STR = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`((?:[^\`\\\\]|\\\\.)*)\`)`;
const pickStr = (m, a, b, c) => (m[a] ?? m[b] ?? m[c]);
const clean = (s) => s ? s.replace(/\\n/g, ' ').replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim() : '';
const isDynamic = (s) => /\$\{|\+\s*\w|\bformat\(|f["']/.test(s);

/** Pulls `key: 'value'` style fields out of one question body. */
function field(body, name) {
  const re = new RegExp(`\\b${name}\\s*[:=]\\s*${STR}`);
  const m = body.match(re);
  if (m) return clean(pickStr(m, 1, 2, 3));
  // `instructions: { question: '…', goal: '…' }` — take the question, fall back to the first string.
  const objAt = body.search(new RegExp(`\\b${name}\\s*[:=]\\s*\\{`));
  if (objAt < 0) return null;
  const blk = balanced(body, body.indexOf('{', objAt));
  if (!blk) return null;
  const q = blk.text.match(new RegExp(`\\b(?:question|instruction|text|prompt)\\s*[:=]\\s*${STR}`));
  if (q) return clean(pickStr(q, 1, 2, 3));
  const first = blk.text.match(new RegExp(STR));
  return first ? clean(pickStr(first, 1, 2, 3)) : null;
}

function parseCriteria(body) {
  const idx = body.search(/\bcriteria\s*[:=]/);
  if (idx < 0) return null;
  const braceAt = body.indexOf('{', idx);
  const brackAt = body.indexOf('[', idx);
  // A list means score levels; an object means named choices.
  if (brackAt >= 0 && (braceAt < 0 || brackAt < braceAt) && brackAt - idx < 30) {
    const end = body.indexOf(']', brackAt);
    if (end < 0) return null;
    const items = [...body.slice(brackAt, end).matchAll(new RegExp(STR, 'g'))].map((m) => clean(pickStr(m, 1, 2, 3)));
    return items.length >= 2 ? { kind: 'levels', levels: items } : null;
  }
  if (braceAt >= 0 && braceAt - idx < 30) {
    const blk = balanced(body, braceAt);
    if (!blk) return null;
    const opts = {};
    const re = new RegExp(`["']?([A-Za-z0-9_\\-]+)["']?\\s*:\\s*${STR}`, 'g');
    for (const m of blk.text.matchAll(re)) opts[m[1]] = clean(pickStr(m, 2, 3, 4));
    return Object.keys(opts).length >= 2 ? { kind: 'options', options: opts } : null;
  }
  return null;
}

/** Splits a questions block into `name: <body>` entries at depth 1. */
function splitEntries(block) {
  const out = [];
  let i = 1, depth = 0, q = null, keyStart = 1;
  const body = block;
  while (i < body.length - 1) {
    const c = body[i], prev = body[i - 1];
    if (q) { if (c === q && prev !== '\\') q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; i++; continue; }
    if (c === '{' || c === '(' || c === '[') { depth++; i++; continue; }
    if (c === '}' || c === ')' || c === ']') { depth--; i++; continue; }
    if (c === ',' && depth === 0) { out.push(body.slice(keyStart, i)); keyStart = i + 1; }
    i++;
  }
  out.push(body.slice(keyStart, body.length - 1));
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseQuestions(block) {
  const questions = [];
  for (const entry of splitEntries(block)) {
    const nameM = entry.match(/^["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*[:=]\s*/);
    if (!nameM) continue;
    const id = nameM[1];
    const rest = entry.slice(nameM[0].length);
    const instructions = field(rest, 'instructions') || field(rest, 'question') || field(rest, 'prompt');
    if (!instructions || instructions.length < 8 || isDynamic(rest.slice(0, 400)) && !instructions) continue;
    const crit = parseCriteria(rest);
    let type = null;
    const declared = field(rest, 'type');
    if (declared && /boolean|choice|score|noul/i.test(declared)) type = declared.toLowerCase().replace('noul', 'boolean');
    else if (/\bNoul\s*\(|noul\s*\(/.test(rest)) type = 'boolean';
    else if (/\bChoice\s*\(|choice\s*\(/.test(rest)) type = 'choice';
    else if (/\bScore\s*\(|score\s*\(/.test(rest)) type = 'score';
    else if (crit) type = crit.kind === 'levels' ? 'score' : 'choice';
    else type = 'boolean';
    if ((type === 'choice' && (!crit || crit.kind !== 'options')) || (type === 'score' && (!crit || crit.kind !== 'levels'))) continue;
    const q = { id, type, instructions };
    if (type === 'choice') q.options = crit.options;
    if (type === 'score') q.levels = crit.levels;
    questions.push(q);
    if (questions.length >= 8) break;
  }
  return questions;
}

const walk = (d, a = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'build', '.venv', 'vendor', '.next'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, a) : a.push(p);
  }
  return a;
};

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.rb', '.json']);

async function mine(entry) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mine-'));
  const found = [];
  try {
    await pexec('bash', ['-c',
      `curl -sfL --max-time 90 "https://codeload.github.com/${entry.repo}/tar.gz/${entry.evidence.sha}" | tar -xz -C ${d} 2>/dev/null`]);
    const tops = fs.readdirSync(d); if (!tops.length) return found;
    const root = path.join(d, tops[0]);
    for (const f of walk(root)) {
      const ext = path.extname(f); if (!EXT.has(ext)) continue;
      let text; try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (text.length > 400_000 || !/questions?\s*[:=]/i.test(text)) continue;
      const rel = path.relative(root, f);
      // Three shapes in the wild: an inline `questions: {...}`, a named constant the call
      // refers to (`questions: QUESTIONS`), and a type annotation, which we must not follow.
      const starts = [
        ...text.matchAll(/\bquestions\s*[:=]\s*\{/g),
        ...[...text.matchAll(/(?:const|let|var|export\s+const)?\s*\b([A-Za-z_$][\w$]*)\s*(?::\s*[\w<>\[\].,\s|'"]+)?=\s*\{/g)]
          .filter((m) => /question/i.test(m[1])),
      ].sort((a, b) => a.index - b.index);
      const seen = new Set();
      for (const m of starts) {
        const at = m.index + m[0].length - 1;
        if (seen.has(at)) continue;
        seen.add(at);
        const blk = balanced(text, at);
        if (!blk || blk.text.length < 40) continue;
        const questions = parseQuestions(blk.text);
        if (!questions.length) continue;
        const line = text.slice(0, m.index).split('\n').length;
        found.push({
          repo: entry.repo, stars: entry.stars, lang: entry.lang, category: entry.category,
          file: rel, line, sha: entry.evidence.sha,
          permalink: `https://github.com/${entry.repo}/blob/${entry.evidence.sha}/${rel}#L${line}`,
          questions,
        });
        if (found.length >= 4) break;
      }
      if (found.length >= 4) break;
    }
  } catch { /* unreachable repo */ }
  finally { fs.rmSync(d, { recursive: true, force: true }); }
  return found;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/repos.json'), 'utf8'));
const targets = db.entries.filter((e) => e.evidence);
const limit = Number(process.argv[2] || targets.length);
const queue = targets.slice(0, limit);
const out = []; let done = 0;
await Promise.all(Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const e = queue.shift(); if (!e) break;
    out.push(...await mine(e));
    if (++done % 50 === 0) process.stderr.write(`${done} `);
  }
}));
fs.writeFileSync(path.join(ROOT, 'data/mined.json'), JSON.stringify(out, null, 1));
const qs = out.reduce((n, x) => n + x.questions.length, 0);
console.log(`\nscanned ${limit} repos → ${out.length} question sets (${qs} questions) from ${new Set(out.map(o => o.repo)).size} repos`);
