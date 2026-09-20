#!/usr/bin/env node
// Sorts every verified repository into a category, using Jev itself.
// Reads data/rows.json + data/verified.json, writes the classification back into data/rows.json.
// Needs AI_GATEWAY_API_KEY. Run: node scripts/classify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_evaluate as evaluate } from 'ai';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = process.env.JEV_WORK_DIR || path.join(ROOT, 'data');
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error('AI_GATEWAY_API_KEY is not set — classification needs access to typesafe-ai/jev.');
  process.exit(1);
}

const CATEGORIES = {
  sdk:       'A client library, SDK, binding, CLI or language wrapper whose job is to let developers call Jev from a language, shell or framework.',
  agent:     'Tooling that plugs Jev into an AI coding agent or agent framework: Claude Code / Codex / Cursor / Pi plugins, MCP servers, agent skills, tool-call gating, model routing for agents.',
  guardrail: 'Guardrails, safety gates, moderation, policy or code-review checks that use Jev to approve, reject, flag or escalate something.',
  context:   'Context engineering: compaction, pruning, filtering of tool output, memory storage and recall, deciding what an agent should keep or read.',
  browser:   'Browser automation, computer use, GUI or mobile device control driven by Jev decisions.',
  infra:     'Serving and plumbing infrastructure: gateways, proxies, model routers between providers, decision caches, database extensions, self-hosted endpoints.',
  retrieval: 'Search, retrieval, ranking, semantic grep, classification or filtering over documents, code, or data records.',
  app:       'An end-user application or product: trading bots, social media tools, recruiting, SEO, home automation, productivity apps.',
  game:      'Games, simulations, robotics, drones or other embodied or playful demos.',
  repro:     'An open-source reproduction, clone or alternative implementation of Jev or of a System One decision model, including trained models and local runtimes.',
  research:  'Benchmarks, evaluations, calibration studies, test harnesses, or research that measures how a decision model behaves.',
  list:      'A curated list, directory, aggregation, cookbook, tutorial or documentation resource about Jev.',
};

const rows = JSON.parse(fs.readFileSync(path.join(WORK, 'rows.json'), 'utf8'));
const evidence = new Map(JSON.parse(fs.readFileSync(path.join(WORK, 'verified.json'), 'utf8')).map(r => [r.full_name, r]));
const todo = rows.filter(r => { const v = evidence.get(r.full_name); return v && (v.evidence || v.kinds.length); });

async function classify(r) {
  const v = evidence.get(r.full_name);
  const state = {
    repo: r.full_name,
    description: r.desc || r.desc_from_readme || '(no description)',
    topics: r.topics.slice(0, 12).join(', ') || '(none)',
    primary_language: r.lang || 'unknown',
    homepage: r.homepage || '',
    code_evidence: v.evidence ? `${v.evidence} in ${v.evidence_file}: ${v.evidence_snippet}` : '(none found)',
    repo_shape: `${v.n_code_files} code files, ${Math.round(v.code_bytes / 1024)}KB code, ` +
                `${Math.round(v.prose_bytes / 1024)}KB prose, tests=${v.has_tests}, ci=${v.has_ci}`,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { answers } = await evaluate({
        model: 'typesafe-ai/jev',
        state,
        questions: {
          category: { type: 'choice', criteria: CATEGORIES,
            instructions: 'Which single category best describes what this GitHub repository IS, judged by its primary purpose?' },
          usesJev: { type: 'boolean',
            instructions: "Does this repository actually use, implement, reimplement or benchmark TypeSafe AI's Jev model (or a System One decision model), as opposed to only mentioning it in passing or being unrelated?" },
          reusable: { type: 'boolean',
            instructions: 'Is this something another developer could install, run or depend on as a tool or library, rather than a one-off demo, experiment or personal playground?' },
          maturity: { type: 'score', criteria: ['A stub or placeholder', 'A small demo or experiment', 'A working project with real functionality', 'A polished, well-rounded project'],
            instructions: 'How substantial and complete does this project appear, based on its shape and description?' },
        },
      });
      const probs = answers.category?.probabilities || {};
      return {
        cat: answers.category?.choice,
        cat_conf: +Math.max(0, ...Object.values(probs)).toFixed(2),
        uses: +(answers.usesJev?.probability ?? 0).toFixed(2),
        reusable: +(answers.reusable?.probability ?? 0).toFixed(2),
        maturity: +(answers.maturity?.score ?? 0).toFixed(2),
      };
    } catch (err) {
      if (attempt === 2) return { cat: null, error: String(err.message || err).slice(0, 120) };
      await new Promise(s => setTimeout(s, 800 * (attempt + 1)));
    }
  }
}

const byName = new Map(rows.map(r => [r.full_name, r]));
const queue = [...todo];
let done = 0, failed = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const r = queue.shift(); if (!r) break;
    const result = await classify(r);
    if (result.error) failed++;
    Object.assign(byName.get(r.full_name), result);
    if (++done % 50 === 0) process.stderr.write(`${done} `);
  }
}));

fs.writeFileSync(path.join(WORK, 'rows.json'), JSON.stringify(rows, null, 1));
console.log(`\nclassified ${done} repositories (${failed} failed)`);
