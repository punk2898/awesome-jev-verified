#!/usr/bin/env node
// Searches GitHub for Jev-related repositories, filters obvious false positives,
// backfills missing descriptions from READMEs, and writes data/rows.json + data/official.json.
// Needs `gh` authenticated. Run: node scripts/discover.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const pexec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.JEV_WORK_DIR || path.join(ROOT, 'data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const QUERIES = [
  'jev', 'jev in:name,description,topics', 'topic:jev', 'topic:typesafe', 'topic:typesafe-ai',
  'typesafe jev', '"system one" ai', 'jev typesafe in:readme', 'topic:system-one', 'topic:jev-model',
  'jev mcp', 'jev classifier', 'jev router', 'jev benchmark', 'jev sdk', 'jev agent',
];

// "jev" collides with Japanese encephalitis virus, EVE Online tooling, JeVois, Jevons and so on.
const FALSE_POSITIVE = /encephalitis|eve-online|eve online|jevois|jevons|jevko|jeveassets|vaccine|flavivirus|mosquito|\bjeva\b|jevelin/i;
const JEV_TOKEN = /(^|[^a-z])jev([^a-z]|$)/i;
const TYPESAFE = /typesafe[\s.\-_]?ai|typesafe\.ai|system[\s-]one|systemone/i;

const api = async (args) => JSON.parse(
  (await pexec('gh', ['api', '-X', 'GET', ...args], { maxBuffer: 100e6 })).stdout);

async function search() {
  const found = new Map();
  let calls = 0;
  for (const q of QUERIES) {
    for (let page = 1; page <= 10; page++) {
      if (++calls % 25 === 0) { process.stderr.write('[rate-limit pause]'); await sleep(62_000); }
      let items;
      try {
        items = await api(['search/repositories', '-f', `q=${q}`, '-f', 'sort=stars', '-f', 'order=desc',
                           '-f', 'per_page=100', '-f', `page=${page}`, '--jq', '.items']);
      } catch { await sleep(62_000); break; }
      if (!items.length) break;
      for (const r of items) found.set(r.full_name, shape(r));
      process.stderr.write('.');
      if (items.length < 100) break;
    }
  }
  return [...found.values()];
}

const shape = r => ({
  full_name: r.full_name, owner: r.owner.login, name: r.name, desc: r.description || '',
  stars: r.stargazers_count, forks: r.forks_count, lang: r.language, topics: r.topics || [],
  created: r.created_at, pushed: r.pushed_at, archived: r.archived, fork: r.fork,
  homepage: r.homepage || '', license: r.license?.spdx_id || null,
  open_issues: r.open_issues_count, size: r.size,
});

function filter(all) {
  return all.filter(r => {
    if (r.fork || r.archived) return false;
    const blob = `${r.full_name} ${r.desc} ${r.topics.join(' ')} ${r.homepage}`;
    if (FALSE_POSITIVE.test(blob)) return false;
    const name = r.name.replace(/[-_]/g, ' ');
    return JEV_TOKEN.test(name) || JEV_TOKEN.test(r.desc) || JEV_TOKEN.test(r.topics.join(' ')) || TYPESAFE.test(blob);
  }).sort((a, b) => b.stars - a.stars);
}

// A surprising number of repositories ship no description; take the first real line of the README.
const cleanLine = t => t.replace(/<[^>]+>/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`#>|]/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();

async function backfillDescriptions(rows) {
  const need = rows.filter(r => !r.desc || r.desc.length < 12);
  const queue = [...need];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const r = queue.shift(); if (!r) break;
      try {
        const { stdout } = await pexec('gh', ['api', `repos/${r.full_name}/readme`, '--jq', '.content'], { maxBuffer: 20e6 });
        const md = Buffer.from(stdout, 'base64').toString('utf8');
        const line = md.split('\n').map(cleanLine).find(l =>
          l.length > 25 && l.length < 300 && !/^!?\[|^https?:|^=+$|^-+$/.test(l) && !/^[A-Za-z ]{0,20}badge/i.test(l));
        if (line) r.desc_from_readme = line.slice(0, 180);
      } catch { /* no readme, or private */ }
    }
  }));
  return need.filter(r => r.desc_from_readme).length;
}

fs.mkdirSync(OUT, { recursive: true });
const all = await search();
const rows = filter(all);
const filled = await backfillDescriptions(rows);
fs.writeFileSync(path.join(OUT, 'raw.json'), JSON.stringify(all, null, 1));
fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 1));

const official = (await api(['orgs/typesafe-ai/repos', '-f', 'per_page=100',
  '--jq', '[.[] | select(.fork == false and .archived == false)]'])).map(shape);
fs.writeFileSync(path.join(OUT, 'official.json'), JSON.stringify(official, null, 1));

console.log(`\nfound ${all.length}, kept ${rows.length} candidates (${filled} descriptions backfilled), ${official.length} official repos`);
