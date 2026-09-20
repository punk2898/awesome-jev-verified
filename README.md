# Awesome Jev — Verified [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

![verified](https://img.shields.io/badge/code--verified-765-2a78d6?style=flat-square) ![entries](https://img.shields.io/badge/entries-788-444?style=flat-square) ![checked](https://img.shields.io/badge/last%20checked-2026--09--20-666?style=flat-square) [![CC0](https://img.shields.io/badge/license-CC0--1.0-lightgrey?style=flat-square)](LICENSE)

**English** · [简体中文](README.zh-CN.md)

> A curated list of open-source projects built on [Jev](https://typesafe.ai/), TypeSafe AI's System One model for typed decisions — where **every entry links to the line of code that calls Jev**, and every performance number comes from a measurement we ran ourselves.

Jev is not a chat model. You hand it state plus typed questions, and it hands back constrained answers with probabilities:

```js
import { experimental_evaluate as evaluate } from 'ai';

const { answers } = await evaluate({
  model: 'typesafe-ai/jev',
  state: 'I was charged twice. Please refund the duplicate.',
  questions: {
    requestsRefund: { type: 'boolean', instructions: 'Is the customer asking for money back?' },
    dept: { type: 'choice', instructions: 'Which team?',
            criteria: { billing: 'Charges and refunds', technical: 'Bugs', account: 'Login' } },
    severity: { type: 'score', instructions: 'How severe?', criteria: ['Cosmetic', 'Degraded', 'Blocking'] },
  },
});
// answers.dept.choice === 'billing', with a probability distribution attached
```

## Why another Jev list

There are already more than a dozen `awesome-jev` lists, and several are good — they are credited in [Lists & resources](#lists--resources). This one is built differently in two ways.

**1. Entries carry receipts.** Inclusion is not decided by reading a README. Every repository below was downloaded at a pinned commit and searched for an actual Jev call — the API endpoint, an official SDK import, a model identifier, or the AI SDK's evaluate interface. The `kind` badge on each entry links to that exact file and line. 765 of 788 entries cleared that bar; the 54 that matched a search but produced no code evidence are parked in [`data/leads.json`](data/leads.json) instead of being quietly listed.

**2. Claims are replaced by measurements.** Most lists repeat TypeSafe's marketing numbers — "sub-100ms", "100× faster", "eliminates hallucination". We ran 2,390 labelled questions through Jev and four comparison models and checked. Some claims hold up well; several do not.

| What we measured | Jev | GPT-4.1-mini | GPT-5.6 Sol |
| --- | --- | --- | --- |
| True/false accuracy | **92.5%** | 87.8% | 92.1% |
| Multiple-choice accuracy | 77.3% | 74.3% | **82.5%** |
| Confidently wrong (≥90% sure, still wrong, of 800) | **6** | 70 | 39 |
| Prompt injections that worked (of 80) | **1** | 73 | 1 |
| Median latency, one question per call | **456 ms** | 928 ms | 1661 ms |
| Cost for all 2,390 questions | **$0.049** | $0.246 | $4.27 |

And claim by claim:

| Claim | Source | What we measured | Verdict |
| --- | --- | --- | --- |
| Probabilities are calibrated | docs | Boolean ECE 0.048 — level with Sol (0.043) and Terra (0.051), better than Luna (0.105). Multiple-choice ECE 0.124: overconfident, same as Sol. | Partly |
| Extremely consistent on similar inputs | docs | 60 rephrased questions: zero answer flips (Sol 1, Terra 3, Luna 9). 120 polarity pairs: 1 self-contradiction (Sol 5, Terra 6, Luna 11). Best of the five. | Holds |
| Deterministic — use it like a strongly typed object | tweet | Same question 5×: no answer ever flipped, max probability drift 0.09. But only 12 of 30 were bit-identical. Terra and Luna flipped outright (drift 0.81, 0.98). | Close, not bit-exact |
| Under 100 ms — fits inside a 60 FPS game loop | tweet | Server-side median 248 ms, fastest single call 189 ms. Across 40 sequential calls, not one came in under 100 ms. End-to-end median 456 ms. | Not reproduced |
| 100× / 194× faster than language models | tweet / blog | One question per call: ~3–3.6× faster than GPT-5.6 (456 ms vs 1.3–1.7 s), ~2× vs GPT-4.1-mini. Batching 50 questions into one call gets to ~5 ms per question — that is where the order of magnitude lives. | Only when batching |
| $42 per billion input tokens, output free | docs | 1,154,813 input tokens billed at $0.0485 — rate confirmed. Note Jev counts roughly 2× the tokens GPT does for the same text. | Holds |
| 445× cheaper than language models | blog | Same 2,390 questions: 88× cheaper than Sol, 45× than Terra, about 5× than Luna and GPT-4.1-mini. 445× did not reproduce against anything we ran. | Depends who you compare to |
| Eliminates hallucination | tweet | 36 answers were wrong while ≥90% confident, out of 1,200 standard-dataset questions. That is the fewest of five models (Sol 84, Terra 88, Luna 140, GPT-4.1-mini 142) — but it is not zero. | Overstated |
| Weaker in Chinese than English | docs (TypeSafe's own caveat) | Same 150 XNLI items: 79.3% in English, 68.7% in Chinese. All three GPT-5.6 variants dropped further (13–16 points) than Jev did (11). | True, and not unique to Jev |

Full method, per-dataset accuracy, calibration curves and the failure cases are in [`benchmark/`](benchmark/README.md). The harness is open, so you can disagree with us in code.

## Contents

- [Official](#official) — **4**
- [SDKs & clients](#sdks--clients) — **131**
- [Agent tooling](#agent-tooling) — **154**
- [Guardrails & review](#guardrails--review) — **47**
- [Context engineering](#context-engineering) — **25**
- [Browser & computer use](#browser--computer-use) — **42**
- [Infrastructure](#infrastructure) — **31**
- [Search & retrieval](#search--retrieval) — **25**
- [Applications](#applications) — **106**
- [Games, robotics & simulation](#games-robotics--simulation) — **49**
- [Open reproductions](#open-reproductions) — **35**
- [Benchmarks & research](#benchmarks--research) — **83**
- [Lists & resources](#lists--resources) — **56**

Each section shows the top 10 by stars; the full category list is one click away. Stars were read on 2026-09-20 — they measure attention, not quality.

## How an entry gets here

1. **Discover.** GitHub search across repository names, descriptions and topics for Jev and TypeSafe System One terms.
2. **Verify.** Download the repository at its current commit and search the source for `api.typesafe.ai`, `/v1/systemone`, an official SDK import, a `jev-*` model identifier, or `experimental_evaluate`. Config and CI files count for less than real source files.
3. **Classify.** Jev itself sorts each repository into one of the categories above and rates how reusable and substantial it looks. Low-confidence calls are flagged in the data for human review. Using the model to build its own directory is partly a demonstration and partly an admission: the categories are a machine's opinion, not a verdict.
4. **Publish.** `scripts/build.mjs` regenerates these pages from [`data/repos.json`](data/repos.json). Nothing in this README is hand-edited.

### What a listing does not mean

A listing means one thing: on 2026-09-20, this repository contained code that calls Jev. It is **not** a review of quality, security, licensing or whether the project runs at all. Many of these repositories are days old and were published during a launch rush. Before depending on one, read the code, check the license, and run it yourself.

## The list

### Official

Repositories published by TypeSafe AI itself. · **4** entries

- **[typesafe-ai/skills](https://github.com/typesafe-ai/skills)** — Agent skills for building with TypeSafe's System One API `★ 785` · `official`
- **[typesafe-ai/system-one-adapter-python](https://github.com/typesafe-ai/system-one-adapter-python)** — Drop-in TypeSafeClient replacement backed by LLM APIs `★ 177` · [`sdk`](https://github.com/typesafe-ai/system-one-adapter-python/blob/adffc2eab300a4fa3c0e92252d4ffd6ceaa53700/src/system_one_adapter/__init__.py#L3) · Python
- **[typesafe-ai/typesafe-sdk-js](https://github.com/typesafe-ai/typesafe-sdk-js)** — The official TypeScript/JavaScript library for the TypeSafe API `★ 168` · [`endpoint`](https://github.com/typesafe-ai/typesafe-sdk-js/blob/66880ccded6cb642dc1809620c2b108c33730214/src/client.ts#L41) · TypeScript
- **[typesafe-ai/typesafe-sdk-python](https://github.com/typesafe-ai/typesafe-sdk-python)** — The official Python library for the TypeSafe API `★ 129` · [`endpoint`](https://github.com/typesafe-ai/typesafe-sdk-python/blob/2ce5c65f13646cab6e6f782328194c9d85f3300a/src/typesafe_sdk/constants.py#L15) · Python

→ full list: [categories/official.md](categories/official.md)

### SDKs & clients

Libraries, bindings and CLIs for calling Jev from a language or shell. · **131** entries

- **[Sac-Y/Jev-cu](https://github.com/Sac-Y/Jev-cu)** — 把 Computer Use 的「下一步点哪里」交给 Jev（TypeSafe System One）：Jev 从界面文字候选中选元素、动作、完成度与风险，Codex Computer Use 负责读取界面与执行，本地策略门槛拦截敏感操作。只传文字，不传截图。 `★ 355` · [`endpoint`](https://github.com/Sac-Y/Jev-cu/blob/38fb31de7dfe6209bbe6e04057c00c6e885ba577/scripts/jev-decide.mjs#L19) · JavaScript
- **[sutro-sh/jev-align](https://github.com/sutro-sh/jev-align)** — Build calibrated AI classifiers from human feedback using Jev and GEPA. `★ 164` · [`sdk`](https://github.com/sutro-sh/jev-align/blob/49753df924d30c0d3642b58e0b9b1e89921dc102/src/jev_align/jev.py#L79) · Python
- **[pithings/advocaat](https://github.com/pithings/advocaat)** — A small, type-safe client for asking AI questions about your data, powered by TypeSafe Jev. `★ 85` · [`endpoint`](https://github.com/pithings/advocaat/blob/bc46287fc1102b95852a81d679c6e34a2c44f4a2/src/api.ts#L162) · TypeScript
- **[obie/ruby_decision_model](https://github.com/obie/ruby_decision_model)** — Ruby client for decision models such as Typesafe Jev `★ 45` · [`endpoint`](https://github.com/obie/ruby_decision_model/blob/f79a890ce4eaa8f83d8220727319ee7b11416e01/lib/ruby_decision_model/providers/typesafe.rb#L22) · Ruby
- **[bnsd55/jevmlx](https://github.com/bnsd55/jevmlx)** — Jev-style parallel constrained decisions for any MLX model on Apple Silicon. Typed, schema-valid JSON in one forward pass. `★ 40` · [`model_id`](https://github.com/bnsd55/jevmlx/blob/7ccf3ab4f8156f9100a451e570f8fddc12ae5613/tests/test_leaderboard.py#L19) · Python
- **[mizchi/jev-lint](https://github.com/mizchi/jev-lint)** — A linter for the things a linter could never check: whether a function does `★ 21` · [`endpoint`](https://github.com/mizchi/jev-lint/blob/4653f834fb2a304dcb0f4a6ce8bdc1512a6cdb01/src/config.ts#L228) · TypeScript
- **[zhengxuyu/litjev](https://github.com/zhengxuyu/litjev)** — Turn any off-the-shelf LLM into a Jev -like decision layer `★ 21` · [`endpoint`](https://github.com/zhengxuyu/litjev/blob/f21216c9fe5afe7fa52ff7064a402ee57fdbddd3/src/litjev/api.py#L74) · Python
- **[dannote/jev](https://github.com/dannote/jev)** — TypeSafe Jev for OTP: reply to Jev from a GenServer and pattern match on its answer `★ 17` · [`endpoint`](https://github.com/dannote/jev/blob/09fbb6cbaf32257924c08ba993ca8631adc16056/lib/jev/http.ex#L3) · Elixir
- **[shiftynick/jev-axi](https://github.com/shiftynick/jev-axi)** — Agent-ergonomic CLI for TypeSafe's Jev: fast calibrated judgments (pick, rate, check, rank, triage, guard) from the shell `★ 17` · [`endpoint`](https://github.com/shiftynick/jev-axi/blob/09766b60317958afbe1dcd632067b7458bc0e86b/src/client.ts#L324) · TypeScript
- **[shantanugoel/mario-jev](https://github.com/shantanugoel/mario-jev)** — A uv-managed Python prototype that plays NES Super Mario Bros. (level 1-1 by default). `★ 12` · [`sdk`](https://github.com/shantanugoel/mario-jev/blob/14f0c289e48cd99e3b5b91353d0456fb1f32d499/src/mario_jev/policy.py#L3) · Python

→ 121 more in [categories/sdk.md](categories/sdk.md)

### Agent tooling

Plugins, MCP servers and skills that put Jev inside a coding agent. · **154** entries

- **[thruwire/foreman](https://github.com/thruwire/foreman)** — Software factory foreman based on TypeSafe's Jev model `★ 408` · [`sdk`](https://github.com/thruwire/foreman/blob/3de1556a59b7a7e14daa1f89b2fc49080bbb8cce/src/foreman/foreman/jev.py#L105) · Python
- **[gargpratyush/jev-router](https://github.com/gargpratyush/jev-router)** — Route to the cheapest model in claude code for your task using jev-router `★ 217` · [`sdk`](https://github.com/gargpratyush/jev-router/blob/38da6b84ea01241bfc41fbddc0928d0f40a703f0/src/config.mjs#L2) · JavaScript
- **[kitze/skillbox](https://github.com/kitze/skillbox)** — Self-hosted, versioned skills library for AI agents. MCP, scoped clients, and optional Jev recommendations. `★ 200` · [`endpoint`](https://github.com/kitze/skillbox/blob/cda64ad3310abe690c6d497352791da4cfeb9a0a/src/server/recommendations.ts#L142) · TypeScript
- **[NiazMorshed2007/jev-review](https://github.com/NiazMorshed2007/jev-review)** — Local-first MCP plugin for continuous software-quality review by AI coding agents, powered by Jev. `★ 171` · [`endpoint`](https://github.com/NiazMorshed2007/jev-review/blob/57690af54ef7d862c2483342c1e61c14dffcf727/src/jev/client.ts#L4) · TypeScript
- **[jkudish/jev-mcp](https://github.com/jkudish/jev-mcp)** — Fast, cheap, typed judgments from TypeSafe's Jev model, as MCP tools. `★ 121` · [`sdk`](https://github.com/jkudish/jev-mcp/blob/67dd9fa5a6e895909f1b2d80bf45534c29cff25a/src/index.ts#L20) · TypeScript
- **[dbreunig/building-with-jev-skill](https://github.com/dbreunig/building-with-jev-skill)** — A skill for writing and improving programs that call Jev, TypeSafe's System One model `★ 120` · [`model_id`](https://github.com/dbreunig/building-with-jev-skill/blob/04fe3666c6b8b8abfec1271c0e581c823a181f6d/.claude-plugin/marketplace.json#L9)
- **[itsmostafa/typesafe-mcp](https://github.com/itsmostafa/typesafe-mcp)** — mcp connector to give your AI agent direct access to typesafe ai's jev model `★ 118` · [`endpoint`](https://github.com/itsmostafa/typesafe-mcp/blob/d4c110c7edd82127a4ca962c9d60fb96f748eb6e/cmd/evaluate/evaluate_test.go#L25) · Go
- **[tamaratran/jev-pruner](https://github.com/tamaratran/jev-pruner)** — Claude Code plugin: trim long Bash output with TypeSafe Jev before the model sees it `★ 118` · [`endpoint`](https://github.com/tamaratran/jev-pruner/blob/47d017c34eab7690b95f075ce6f4839247c5dc0a/src/jev.ts#L1) · TypeScript
- **[vinilana/jev-eval-agent](https://github.com/vinilana/jev-eval-agent)** — 🇺🇸 English · 🇧🇷 Leia em português `★ 95` · [`sdk`](https://github.com/vinilana/jev-eval-agent/blob/037de1120c84b4b63cdf748e2acf258ff66d7731/agent/lib/jev-router.ts#L1) · HTML
- **[BillionsBobby/JevRouter](https://github.com/BillionsBobby/JevRouter)** — A lightweight Jev-powered router for models, tools, and subagents `★ 94` · [`endpoint`](https://github.com/BillionsBobby/JevRouter/blob/3c558a78edf57934790f50480d8f9ac468977853/src/provider.ts#L72) · TypeScript

→ 144 more in [categories/agent.md](categories/agent.md)

### Guardrails & review

Approve, reject, flag or escalate — safety gates, moderation, code review. · **47** entries

- **[devagrawal09/jev-review](https://github.com/devagrawal09/jev-review)** — A staged code-review workflow and local dashboard built with TypeSafe Jev. `★ 367` · [`sdk`](https://github.com/devagrawal09/jev-review/blob/31f89602797fb7bea007f8a480bf368bf564954e/src/review/codebase-judgments.ts#L3) · TypeScript
- **[lakeday-org/perch](https://github.com/lakeday-org/perch)** — Semantic code linting with Jev `★ 161` · [`endpoint`](https://github.com/lakeday-org/perch/blob/54a38d6034264dc507e97294b82316c347fe5a5e/src/systemone.js#L9) · JavaScript
- **[DevMortimer/pi-warden](https://github.com/DevMortimer/pi-warden)** — Guardrails for Pi built on pi-typesafe that steer the agent instead of interrupting you: Jev judges irreversible and off-task tool calls, detects stuck loops, checks unverified done claims, flags slop `★ 96` · [`endpoint`](https://github.com/DevMortimer/pi-warden/blob/7a6d65cbf7d1992131789b3d6a75f85d6071b5dd/src/backend.ts#L8) · TypeScript
- **[brainstormity/Jev-Moderation-Bot](https://github.com/brainstormity/Jev-Moderation-Bot)** — A Discord moderation bot built with Python and TypeSafe AI (Jev System One). It filters spam and scam links in real time, escalates offenses automatically, and lets moderators prof `★ 36` · [`endpoint`](https://github.com/brainstormity/Jev-Moderation-Bot/blob/1629ac80bea758883ee7541ffc654c83acfae4b6/typesafe/__init__.py#L125) · Python
- **[Eriskii/ErisLint](https://github.com/Eriskii/ErisLint)** — Rust linter powered by configurable Jev rules, with a VS Code extension. `★ 15` · [`endpoint`](https://github.com/Eriskii/ErisLint/blob/f04d016461b66b38d46647fb20762fb67bda350a/src/jev.rs#L24) · Rust
- **[wobsoriano/oxlint-plugin-jev](https://github.com/wobsoriano/oxlint-plugin-jev)** — Lint rules written in plain English. Oxlint finds the code, TypeSafe Jev answers the question. `★ 14` · [`endpoint`](https://github.com/wobsoriano/oxlint-plugin-jev/blob/3fa50b566af98586fe91f5a710462fc11106d920/src/index.ts#L35) · TypeScript
- **[huntedman/JevLint](https://github.com/huntedman/JevLint)** — Configurable semantic linting powered by Jev, with file-level NOUL judgments and a magic-strings plugin. `★ 10` · [`endpoint`](https://github.com/huntedman/JevLint/blob/8bf4b4e0c4c088b9cbcd9d735baa84c770a9c418/src/jev-client.ts#L52) · TypeScript
- **[tyler-dot-earth/patdown](https://github.com/tyler-dot-earth/patdown)** — typesafe's jev as a "fuzzy linter". give your code an ocular patdown. `★ 10` · [`endpoint`](https://github.com/tyler-dot-earth/patdown/blob/fe95dc727e0610d3d2c165ccbeeba844489dcb77/packages/patdown-jev/src/jev-choice-schema.ts#L3) · TypeScript
- **[anpicasso/hermes-jev-approvals](https://github.com/anpicasso/hermes-jev-approvals)** — PoC: TypeSafe Jev as the reviewer for Hermes Agent smart command approvals. 8.7x faster, 4.4x fewer prompts, measured on 153 real commands. Approvals only. `★ 8` · [`endpoint`](https://github.com/anpicasso/hermes-jev-approvals/blob/d323921ce3773dc50c26b00723009319ce6a4629/benchmarks/bench_framing_weakens.py#L54) · Python
- **[frostney/clean-code-review](https://github.com/frostney/clean-code-review)** — Every code file in a pull request, judged against Uncle Bob's Clean Code by TypeSafe's Jev, then reviewed by Luna. Built on eve and Next.js. `★ 6` · [`ai_sdk`](https://github.com/frostney/clean-code-review/blob/34073fccdc3058ab960bb4e69e99ec3306ec67a3/agent/lib/judging/judge.ts#L1) · TypeScript

→ 37 more in [categories/guardrail.md](categories/guardrail.md)

### Context engineering

Compaction, pruning, memory and deciding what an agent should read or keep. · **25** entries

- **[tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction)** — Claude Code plugin that replaces the compaction summary with Jev decisions: every tool call and result is scored in one fast request, stale ones are dropped or truncated, everything kept stays verbatim. `★ 4.4k` · [`endpoint`](https://github.com/tamaratran/fast-jev-compaction/blob/e3f262a7f4d42bd8dd32ced30d26176f7cb545b0/src/request.ts#L3) · TypeScript
- **[compozy/yoshi](https://github.com/compozy/yoshi)** — Context-pruning proxy for Claude Code and Codex: Jev judges which history is still needed, measured not claimed. POC here now, heading soon into https://github.com/compozy/compozy `★ 18` · [`ai_sdk`](https://github.com/compozy/yoshi/blob/55c719718e5039f2276fbad804211682ae012f1e/src/context.ts#L1) · TypeScript
- **[chopratejas/invalidate](https://github.com/chopratejas/invalidate)** — The invalidation layer for AI memory. Every fact gets a lease; new evidence ends it. Built on TypeSafe Jev. `★ 13` · [`sdk`](https://github.com/chopratejas/invalidate/blob/d6ade60108b8064bafaee425fd8f9e78683dbd82/src/invalidate/cli.py#L20) · Python
- **[samdotmak/jev-recall](https://github.com/samdotmak/jev-recall)** — Retrieve by relevance, not resemblance: filter an AI assistant's memories with TypeSafe's Jev `★ 13` · [`endpoint`](https://github.com/samdotmak/jev-recall/blob/d3e4acfb45c7cf6231f1621b7dafb09d21e95862/src/jev_recall/core.py#L21) · TypeScript
- **[reachjalil/jevlogs](https://github.com/reachjalil/jevlogs)** — Open-source Jev log triage for OpenTelemetry. Score the signal before expensive LLM analysis. `★ 8` · [`ai_sdk`](https://github.com/reachjalil/jevlogs/blob/b1ff60079c30d50a7f93dbfa09848f9539665d44/src/index.ts#L1) · TypeScript
- **[jerryfane/omp-jev-compaction](https://github.com/jerryfane/omp-jev-compaction)** — Verbatim Jev-scored context reduction for omp, over TypeSafe or OpenRouter `★ 7` · [`endpoint`](https://github.com/jerryfane/omp-jev-compaction/blob/3719495ceb109c0d6e40d29053675f0d6ecb2e9f/src/asker.ts#L15) · TypeScript
- **[joelhooks/pi-fast-jev-compaction](https://github.com/joelhooks/pi-fast-jev-compaction)** — Pi extension: verbatim context compaction with TypeSafe Jev decisions `★ 5` · [`endpoint`](https://github.com/joelhooks/pi-fast-jev-compaction/blob/eb83f533f4fd10a08728b02c062c249afda5a4dc/src/core/request.ts#L8) · TypeScript
- **[fatelei/jev-compact](https://github.com/fatelei/jev-compact)** — Jev-scored context compaction for OpenAI Codex CLI — scores every tool call before compaction and restores critical tool outputs verbatim after it `★ 4` · [`endpoint`](https://github.com/fatelei/jev-compact/blob/213a37faef2bc87c4d8ea830f8b779f379a32da8/plugins/jev-compact/src/jev/types.ts#L3) · TypeScript
- **[christian-taillon/opencode-jev-compactor](https://github.com/christian-taillon/opencode-jev-compactor)** — Jev powered OpenCode compaction `★ 2` · [`endpoint`](https://github.com/christian-taillon/opencode-jev-compactor/blob/08731fe98c974bfd3cd7e3c0c38e906983087a53/src/plugin/options.ts#L44) · TypeScript
- **[KamilPostrozny/pi-fast-jev-compaction](https://github.com/KamilPostrozny/pi-fast-jev-compaction)** — Fast JEV compaction extension for pi `★ 2` · [`endpoint`](https://github.com/KamilPostrozny/pi-fast-jev-compaction/blob/58eca97079b200282b1cd22eb59ea9d9eb23f1db/extensions/fast-jev-core.ts#L180) · TypeScript

→ 15 more in [categories/context.md](categories/context.md)

### Browser & computer use

Browser automation, GUI and device control driven by typed decisions. · **42** entries

- **[browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)** — i. am. speed. `★ 9.4k` · [`endpoint`](https://github.com/browser-use/jev-ultrafast/blob/1231850a0bf1a0c0341fe408ef1668dbbfdfac46/jev_ultrafast/model.py#L119) · Python
- **[wy-coliney/jev-browser-use](https://github.com/wy-coliney/jev-browser-use)** — 5–10x faster browser operations: Jev clicks, Codex thinks and verifies. Built at EZCollegeApp. `★ 207` · [`endpoint`](https://github.com/wy-coliney/jev-browser-use/blob/f14b60e0ae1ee90cd73eb6650e30a666a84c021a/skills/jev-browser-use/bridge.mjs#L11) · JavaScript
- **[jkudish/jev-browser](https://github.com/jkudish/jev-browser)** — Browser use using Typesafe's Jev model `★ 156` · [`sdk`](https://github.com/jkudish/jev-browser/blob/8d90c51bedbe7cd07596bfaa532ded019a31d2a8/src/provider.ts#L7) · TypeScript
- **[moritzkremb/jev-voice-browser](https://github.com/moritzkremb/jev-voice-browser)** — Control a real browser by voice. Jev (TypeSafe System One) decides intent + target in ~300 ms per spoken word; Playwright acts — often before you finish the sentence. `★ 126` · [`sdk`](https://github.com/moritzkremb/jev-voice-browser/blob/054db0f3dbf537af63a8117632d3f941ccd520e1/src/jev.js#L7) · JavaScript
- **[savka777/jev-use](https://github.com/savka777/jev-use)** — Say it, and your Mac does it. A computer-use harness on Jev that reads the screen through Accessibility. Fast, no vision model `★ 36` · [`endpoint`](https://github.com/savka777/jev-use/blob/8907f85354addfa3d2b78f6a462087e4c73310b8/Sources/JevCore/Decision.swift#L177) · Swift
- **[Ying-Kai-Liao/jev-browser](https://github.com/Ying-Kai-Liao/jev-browser)** — Browser automation where an LLM plans and Jev (Typesafe System One) decides. Library, CLI and MCP server. `★ 22` · [`endpoint`](https://github.com/Ying-Kai-Liao/jev-browser/blob/578cff6e701a131733d03256078bb559a45ad188/src/jev.mjs#L8) · JavaScript
- **[razaanstha/ulka](https://github.com/razaanstha/ulka)** — Experimental browser agent powered by FX, Jev, and Vercel AI Gateway. Bring your own API key to read pages and automate browser tasks. `★ 18` · [`ai_sdk`](https://github.com/razaanstha/ulka/blob/1aa6da8b9425fc25cd357b499a1a6581fbfbb584/apps/extension/src/agent/vercel-jev.ts#L4) · TypeScript
- **[jcpsimmons/jev-macos-loop](https://github.com/jcpsimmons/jev-macos-loop)** — Open-source macOS AI computer use and native GUI automation on Apple silicon. Jev + OmniParser CoreML + Apple Vision OCR. Bring your own OpenRouter, Vercel AI Gateway, or TypesafeAI token. `★ 13` · [`endpoint`](https://github.com/jcpsimmons/jev-macos-loop/blob/1aadc01ef262c3b01460909c5dd102f0d9616ba5/src/providers.mjs#L17) · JavaScript
- **[jekhov/jekhov](https://github.com/jekhov/jekhov)** — Policy-bounded Jev target selection for resilient Playwright workflows `★ 7` · [`endpoint`](https://github.com/jekhov/jekhov/blob/5fda60b7cc949d6ff99aa53f0a571a2fceb6591f/src/jev-policy-client.ts#L111) · TypeScript
- **[romaluev/jev-ego](https://github.com/romaluev/jev-ego)** — Fast browser agent for ego lite. One TypeSafe request per step; an agent or Jev picks the move. `★ 7` · [`endpoint`](https://github.com/romaluev/jev-ego/blob/12eaafe795db56da821d9268ee7b9ae9ea24b23b/src/model.ts#L176) · TypeScript

→ 32 more in [categories/browser.md](categories/browser.md)

### Infrastructure

Gateways, routers, caches, database extensions and self-hosted endpoints. · **31** entries

- **[featherless-ai/simple-jev](https://github.com/featherless-ai/simple-jev)** — Turn any open model into a classifier/jev endpoint `★ 312` · [`endpoint`](https://github.com/featherless-ai/simple-jev/blob/0dd5396ffce671ab7c4bfc031506d8e558cf8d23/hf-server/hf_server.py#L676) · Python
- **[realZachi/pg-jev](https://github.com/realZachi/pg-jev)** — Ask your Postgres tables questions in plain language. A PostgreSQL extension powered by TypeSafe's Jev. `★ 225` · [`endpoint`](https://github.com/realZachi/pg-jev/blob/afd11fa856d7a2b831a1bfd8ee7f869ce8efcd62/sql/jev--0.1.0--0.2.0.sql#L28) · Shell
- **[ekzhang/openjev-sglang](https://github.com/ekzhang/openjev-sglang)** — Jev-compatible API endpoint based on open models (prefill-only) `★ 204` · [`endpoint`](https://github.com/ekzhang/openjev-sglang/blob/604664a22b2cf44c6cc499e503092ae4e3c24c03/src/openjev/api.py#L159) · Python
- **[giuliosmall/pg_typesafe](https://github.com/giuliosmall/pg_typesafe)** — Pre-alpha PostgreSQL extension for TypeSafe AI (Jev) categorical classification `★ 79` · [`endpoint`](https://github.com/giuliosmall/pg_typesafe/blob/4b5bfc1df11b18c3f07bb10804eeb47e4508ec6a/typesafe.c#L61) · C
- **[vinilana/jev-gateway](https://github.com/vinilana/jev-gateway)** — A local LLM gateway for coding agents. When your agent is about to decide which tool to call, `★ 58` · [`endpoint`](https://github.com/vinilana/jev-gateway/blob/9463952bf118773fb955427d2725a98f76546233/scripts/mock-jev.mjs#L2) · TypeScript
- **[yusukebe/hono-jev-router](https://github.com/yusukebe/hono-jev-router)** — Route HTTP requests by meaning. A semantic router for Hono powered by Jev. `★ 39` · [`endpoint`](https://github.com/yusukebe/hono-jev-router/blob/04f6e103e1397bca659ab85c042011a1f14b679d/src/index.ts#L77) · TypeScript
- **[iammrduncan/typesafe-ai-benchmark](https://github.com/iammrduncan/typesafe-ai-benchmark)** — This is a LLM Gateway that mimics typesafe ai structured output. Like an imposter Jev. `★ 32` · [`endpoint`](https://github.com/iammrduncan/typesafe-ai-benchmark/blob/cf348cd291bb538ad9fa902334649ef5dd937e92/packages/api/src/http.ts#L28) · TypeScript
- **[Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)** — ⚡ Adaptive multi-model LLM router — 80+ providers, Jev System One single-pass routing (model=jev-auto), pheromone-trail failover, parallel ensemble merge. npm: adaptive-memory-multi-model-router `★ 16` · [`endpoint`](https://github.com/Das-rebel/a3m-router/blob/62caefe5931595b91bc90c4262b6714b55c5ac70/src/routing/jev/remote.ts#L5) · TypeScript
- **[colliber/duckdb-jev](https://github.com/colliber/duckdb-jev)** — DuckDB extension: typed Jev answers as real SQL types `★ 13` · [`endpoint`](https://github.com/colliber/duckdb-jev/blob/fad67eb4a1def91fcf1efbc96bdf5e6e11208644/src/jev_client.cpp#L17) · C++
- **[pst2154/Nemotron_Jev](https://github.com/pst2154/Nemotron_Jev)** — Nemotron Diffusion Decision Lab `★ 9` · [`endpoint`](https://github.com/pst2154/Nemotron_Jev/blob/983cc2982200d23815a174dd300775b596adb006/app/server.py#L46) · HTML

→ 21 more in [categories/infra.md](categories/infra.md)

### Search & retrieval

Semantic grep, ranking, filtering and classification over documents and data. · **25** entries

- **[kyotofin/tax-doc-classifier](https://github.com/kyotofin/tax-doc-classifier)** — Tax document page classifier built on Jev decisions. 100% strict accuracy across 261 IRS forms, ~$0.001 per page. `★ 272` · [`endpoint`](https://github.com/kyotofin/tax-doc-classifier/blob/6afcf701395466d7c936ec8178daf017b9d96b0c/src/backend.ts#L22) · TypeScript
- **[superagents-lab/jev-search](https://github.com/superagents-lab/jev-search)** — Search the web with TypeSafe's Jev: source selection, query understanding and relevance ranking. Built with Search1API. `★ 248` · [`endpoint`](https://github.com/superagents-lab/jev-search/blob/f1a33b8bf4bd9d39f52806ff470d4732e8d5b506/src/lib/typesafe.ts#L72) · TypeScript
- **[uehaj/jev-semgrep](https://github.com/uehaj/jev-semgrep)** — grep by meaning, across languages. TypeSafe Jev scores every line against a meaning; combine meanings with AND/OR/NOT. 意味で探す grep。日本語で英語を、英語で日本語を検索できる `★ 96` · [`endpoint`](https://github.com/uehaj/jev-semgrep/blob/ba6ef50f85d0c5d6caa4db102ee4db4a08c85dd2/semgrep.mjs#L228) · JavaScript
- **[can1357/jegrep](https://github.com/can1357/jegrep)** — Semantic grep: find code by describing what you're looking for, powered by Jev. `★ 29` · [`endpoint`](https://github.com/can1357/jegrep/blob/a280f14f6da8163bde67e0c49f58b23517a02882/src/jev.rs#L30) · Rust
- **[devanshbatham/commit-miner](https://github.com/devanshbatham/commit-miner)** — Classify Git commit diffs and messages with Jev. Bug fixes, security fixes/CWEs, and change types. `★ 26` · [`endpoint`](https://github.com/devanshbatham/commit-miner/blob/977617ebce07c56b965253a68577b1d92b93fdf1/src/jev.rs#L261) · Rust
- **[ellipsis-dev/blink](https://github.com/ellipsis-dev/blink)** — Codebase search powered by Jev from @typesafe-ai `★ 24` · [`sdk`](https://github.com/ellipsis-dev/blink/blob/a621ede75649303a933828c18c27ad800bb43ef0/src/search.ts#L3) · TypeScript
- **[keltokhy/jgrep](https://github.com/keltokhy/jgrep)** — grep, but the pattern is a description. Filters lines by meaning with TypeSafe's Jev decision model: ~200 ms and a thousandth of a cent per line. `★ 12` · [`endpoint`](https://github.com/keltokhy/jgrep/blob/bc0dc8ddb63f9ae940490d436123775d08217b6b/src/jgrep/core.py#L72) · Python
- **[hev/reranker](https://github.com/hev/reranker)** — Use Jev (TypeSafe's System One model) as a calibrated reranker: one call, up to 30 documents, a probability per document. Apache-2.0. `★ 6` · [`sdk`](https://github.com/hev/reranker/blob/1eb47266270b32b2a3667f9fb89646378ca9c9d6/hev_rerank/rerank.py#L18) · Python
- **[kyu1204/jgrep](https://github.com/kyu1204/jgrep)** — grep for what code does, not what it's called. Semantic code search powered by TypeSafe Jev. `★ 6` · [`endpoint`](https://github.com/kyu1204/jgrep/blob/e91569b6c871717ac47ac1e94e4387110ac900f1/src/init.ts#L49) · TypeScript
- **[1jehuang/jev-pr-labeler](https://github.com/1jehuang/jev-pr-labeler)** — Semantic GitHub PR labels using Jev's typed decisions, with conceptual scope instead of line counts `★ 4` · [`model_id`](https://github.com/1jehuang/jev-pr-labeler/blob/01f0029d0f832d695f04b53fd8e46bdfc27d57e1/jev_labeler/classifier.py#L13) · Python

→ 15 more in [categories/retrieval.md](categories/retrieval.md)

### Applications

End-user products: trading, social, recruiting, home automation, productivity. · **106** entries

- **[jarrodwatts/jev-trader](https://github.com/jarrodwatts/jev-trader)** — One AI trade decision every Monad block. Jev on Kuru MON-USDC. `★ 1.4k` · [`ai_sdk`](https://github.com/jarrodwatts/jev-trader/blob/b587759e459ea049590102e54a0b07800864cdc3/src/model.ts#L1) · TypeScript
- **[droidrun/mobile-jev](https://github.com/droidrun/mobile-jev)** — ▶ Watch the demo — Jev opens Uber, enters a route from San Francisco Airport to the Golden Gate Bridge, and reaches payment selection. The recorded task timer shows about 21 second `★ 241` · [`endpoint`](https://github.com/droidrun/mobile-jev/blob/395fc222beac4f059f9a0beb337d114a2b066e99/scripts/mobile-agent/policy.mjs#L224) · JavaScript
- **[kitze/unclutter](https://github.com/kitze/unclutter)** — WXT browser extension: Jev-powered page clutter removal with reusable template rules. `★ 136` · [`endpoint`](https://github.com/kitze/unclutter/blob/9ef9beccc1e57b4e3115ae68644b8fc9c19c29f6/lib/jev.ts#L6) · TypeScript
- **[trungdq88/youtube-sponsor-detection](https://github.com/trungdq88/youtube-sponsor-detection)** — Detect youtube sponsor segment with live audio and transcript powered by Jev `★ 74` · [`endpoint`](https://github.com/trungdq88/youtube-sponsor-detection/blob/de01f0568d043035889a296a61ce21e0accc8b16/extension/background.js#L20) · JavaScript
- **[ChetasLua/jevmeter](https://github.com/ChetasLua/jevmeter)** — Put a live Jev (TypeSafe) meter on any video: every sentence scored, rendered as a 16:9 edit `★ 70` · [`endpoint`](https://github.com/ChetasLua/jevmeter/blob/cbf8e117b5b8835e3294c3a8ee652c7dfa737a9a/jevmeter/config.py#L66) · Python
- **[mrnugget/jev-shell-history](https://github.com/mrnugget/jev-shell-history)** — Fish-style zsh history autosuggestions ranked by Jev (TypeSafe) `★ 67` · [`sdk`](https://github.com/mrnugget/jev-shell-history/blob/4b2b75d26c0ccf5726263904514a22a8e11659ea/src/cli.ts#L5) · TypeScript
- **[realZachi/typesafe-adblock](https://github.com/realZachi/typesafe-adblock)** — 🧹 Fun project: a Chrome extension that asks a tiny AI decision model (TypeSafe Jev) "is this DOM element an ad?" and pops it off the page. BYOK, no backend, not a real ad blocker. `★ 58` · [`endpoint`](https://github.com/realZachi/typesafe-adblock/blob/7e067d243d87b7fe4d511653c0ddcd77b9beee18/src/typesafe.js#L3) · JavaScript
- **[w3cj/jev-chat](https://github.com/w3cj/jev-chat)** — A tool calling chat bot built with Jev and no LLM. `★ 46` · [`sdk`](https://github.com/w3cj/jev-chat/blob/e543aba8c21b57a28a748ef41966502130f0f69e/apps/server/src/jev/client.ts#L1) · TypeScript
- **[RafalWilinski/vibecheck](https://github.com/RafalWilinski/vibecheck)** — Chrome extension: vibe-check your X posts with TypeSafe's Jev before you hit Post `★ 42` · [`endpoint`](https://github.com/RafalWilinski/vibecheck/blob/badf9dad5deecababd8afe43a574a5ea6d376711/background.js#L6) · JavaScript
- **[brainstormity/Jev-X-Sentiment-Analysis](https://github.com/brainstormity/Jev-X-Sentiment-Analysis)** — An on-demand crypto market intelligence and decision-support terminal powered by TypeSafe AI's System One model (Jev). `★ 41` · [`sdk`](https://github.com/brainstormity/Jev-X-Sentiment-Analysis/blob/5c932f941a92348781e8e5b471a9ddb6af980253/app/services/typesafe_service.py#L3) · Python

→ 96 more in [categories/app.md](categories/app.md)

### Games, robotics & simulation

Games, simulations, drones and other embodied or playful demos. · **49** entries

- **[fhshaik/typesafe-mario](https://github.com/fhshaik/typesafe-mario)** — A TypeSafe/Jev agent that plays Super Mario Bros. from structured emulator state. `★ 287` · [`sdk`](https://github.com/fhshaik/typesafe-mario/blob/ca22449ed187118d19326d1f54b01b6636578aa4/src/typesafe_mario/policy.py#L29) · Python
- **[rokbenko/quackd](https://github.com/rokbenko/quackd)** — One CLI for all your robots. Connect them, command them, and let them work together, each with an LLM for a brain, Jev for cheaper steps. Microduck, Open Duck Mini, LeRobot, XLeRobot, AlohaMini, ToddlerBot or any ROS base. Claude, OpenAI, Gemini, Grok, or local via Ollama or vLLM. Simulator, .duck safety contracts, MCP, memory between runs, flocks. `★ 214` · [`sdk`](https://github.com/rokbenko/quackd/blob/6073829048b4c8152b7260d3c1d2af62709bfd02/quackd/doctor.py#L63) · Python
- **[standardagents/jevpilot](https://github.com/standardagents/jevpilot)** — A playable Three.js driving simulator with Jev-powered autopilot `★ 99` · [`endpoint`](https://github.com/standardagents/jevpilot/blob/e1beeb13b9a928fb76f167f86af584f4ce9cf180/server/jev.js#L78) · JavaScript
- **[RomanSlack/jev-drone](https://github.com/RomanSlack/jev-drone)** — Camera-only autonomous drone in MuJoCo with a small judgment model (TypeSafe Jev) in the loop at 2.5Hz `★ 79` · [`sdk`](https://github.com/RomanSlack/jev-drone/blob/cbeb53ce4f17a06ea490ae43effcdad231143610/tactics.py#L12) · Python
- **[sorrycc/typesafe-snake](https://github.com/sorrycc/typesafe-snake)** — Snake auto-played by TypeSafe's Jev model: one System One choice per tick, legal moves and facts generated in code `★ 18` · [`sdk`](https://github.com/sorrycc/typesafe-snake/blob/8bf3f7c261ad35ece3345a02d21ba638ddfaf87f/server/index.ts#L2) · TypeScript
- **[phyous/tsai-sc](https://github.com/phyous/tsai-sc)** — TypeSafe Jev controls original StarCraft shareware through keyboard and mouse with recorded action probabilities. `★ 17` · [`endpoint`](https://github.com/phyous/tsai-sc/blob/6046ecc60156c4a3c04d384b41821a4ff08501b7/tsai_sc/typesafe.py#L24) · Python
- **[Dimweaker/jev-libero](https://github.com/Dimweaker/jev-libero)** — Fine-grained robot control with Jev, physics previews, and configurable LIBERO tasks. `★ 10` · [`endpoint`](https://github.com/Dimweaker/jev-libero/blob/e5e3b757093a2555bab45a2692d436db5dd9c683/src/jev_libero/client.py#L14) · Python
- **[kavehmz/typesafe-playground](https://github.com/kavehmz/typesafe-playground)** — Interactive experiments with TypeSafe Jev, from support routing to 3D driving simulations with real AI decisions and visible sensor inputs. `★ 10` · [`endpoint`](https://github.com/kavehmz/typesafe-playground/blob/ec6102ef693de3c1775af5c844d48713b6d3f4a2/demo01/server.mjs#L67) · JavaScript
- **[vinilana/live-jev](https://github.com/vinilana/live-jev)** — 2D autonomous car simulation in the browser, driven by TypeSafe's Jev decision model `★ 10` · [`sdk`](https://github.com/vinilana/live-jev/blob/cd13ab0a7b58ca9b6749a78aed2a729153fa6910/server.js#L8) · JavaScript
- **[AbdelStark/heist-one](https://github.com/AbdelStark/heist-one)** — Observable browser stealth game: Jev makes typed guard judgments while deterministic code owns the world. `★ 6` · [`sdk`](https://github.com/AbdelStark/heist-one/blob/632c9a55a1e5eb2cbf0b9f87db575f0b5eb36e8c/apps/server/src/jev.ts#L19) · TypeScript

→ 39 more in [categories/game.md](categories/game.md)

### Open reproductions

Open-source clones, alternative System One models and local runtimes. · **35** entries

- **[TheoLeeCJ/SemIf](https://github.com/TheoLeeCJ/SemIf)** — Semantic ifs from open models, on a 3090 at home. Independent; not affiliated with Jev or TypeSafe. `★ 2.0k` · [`primitives`](https://github.com/TheoLeeCJ/SemIf/blob/ca3ba65f142967030ecb453346e94d6f476a69df/benchmarks/build_every.py#L85) · Python
- **[TianyuCodings/NanoJev](https://github.com/TianyuCodings/NanoJev)** — A nano replica of Jev: parallel decisions, dynamic candidates, and an end-to-end training pipeline. `★ 1.1k` · [`ai_sdk`](https://github.com/TianyuCodings/NanoJev/blob/71a513bb0163b5634467842b523ee0c0ed6fb1c7/scripts/jev_probe.mjs#L1) · Python
- **[jaredpalmer/kev](https://github.com/jaredpalmer/kev)** — tiny Jev-like model built on top of Qwen2.5-0.5B you can train and run on your MacBook `★ 617` · [`endpoint`](https://github.com/jaredpalmer/kev/blob/20fa6268c8ceb226530be2fb5266ab2c36b37724/playground/src/lib/kev.ts#L1) · Python
- **[razorback16/openjev](https://github.com/razorback16/openjev)** — Open, Jev-compatible System One decision server on DiffusionGemma `★ 146` · [`endpoint`](https://github.com/razorback16/openjev/blob/91d5005effcf8cc0ecccaa9538ceabbb130fef59/openjev/api.py#L1) · Python
- **[logan-markewich/jeff](https://github.com/logan-markewich/jeff)** — A self-hosted drop-in replacement for TypeSafe's jev, powered by GliFormer. `★ 125` · [`endpoint`](https://github.com/logan-markewich/jeff/blob/34b32f99a727c47b679adde33f4702a001e02979/src/jeff/server/app.py#L139) · Python
- **[Heman10x-NGU/openJev-verdict-2.0](https://github.com/Heman10x-NGU/openJev-verdict-2.0)** — Calibrated 151M Non-Autoregressive Decision Engine beating TypeSafe Jev & Laya on LocalLLaMA/typed-decisions (77.10% acc, 0.0636 Brier, 0.0144 ECE) `★ 80` · [`model_id`](https://github.com/Heman10x-NGU/openJev-verdict-2.0/blob/33950bfc407edabaf7aab593fbbee82dc69dad57/scripts/exp_external_eval.py#L121) · Python
- **[kshetrajna12/reflex](https://github.com/kshetrajna12/reflex)** — A small open decision model: state + typed questions -\> calibrated probabilities. A Jev / System One re-creation on Qwen3.5. `★ 80` · [`endpoint`](https://github.com/kshetrajna12/reflex/blob/21c95dfd0cd43d0ac102ae95f5232173e4314267/src/reflex/client.py#L18) · Python
- **[daseinlabs/open-jev](https://github.com/daseinlabs/open-jev)** — Open Jev implementation with custom finetuning `★ 58` · [`endpoint`](https://github.com/daseinlabs/open-jev/blob/8a4fbdf712e78c5ef45509a16aacb81facdd79be/openjev/cli.py#L253) · Python
- **[wfzyx/von](https://github.com/wfzyx/von)** — The open-source System One decision model. Sub-15ms, non-autoregressive, local drop-in alternative to TypeSafe Jev. `★ 48` · [`endpoint`](https://github.com/wfzyx/von/blob/a94aa368ff4dcc58cdfd569cf0b4b1ae7d592d54/js/src/client.ts#L43) · Python
- **[deepanwadhwa/OpenDecision](https://github.com/deepanwadhwa/OpenDecision)** — OpenDecision is an open-source semantic decision engine like typesafe's jev. `★ 29` · [`endpoint`](https://github.com/deepanwadhwa/OpenDecision/blob/194dd112d5e52f5dfa35aeb43894303137cf5747/src/opendecision/api/app.py#L82) · Python

→ 25 more in [categories/repro.md](categories/repro.md)

### Benchmarks & research

Evaluations, calibration studies and test harnesses that measure behaviour. · **83** entries

- **[hr98w/jev-visual](https://github.com/hr98w/jev-visual)** — An educational Jev-like visual inference experiment on Apple Silicon: shared context, direct candidate scoring, and local visual demos. `★ 152` · [`primitives`](https://github.com/hr98w/jev-visual/blob/19af545f096e8db4c4dd5d47aed42d92ec252111/jev_visual/cli.py#L9) · Python
- **[myc0576/SmartMoney-Cub](https://github.com/myc0576/SmartMoney-Cub)** — Read-only trading journal and review harness: Jev typed judgments, agent integration, and a reproducible finance benchmark. No orders, no advice. `★ 24` · [`endpoint`](https://github.com/myc0576/SmartMoney-Cub/blob/d93cf493853dd79b337215909e6ac60bec22a799/src/smartmoney_cub_harness/jev/direct.py#L33) · Python
- **[Zaious/jev-capability-atlas](https://github.com/Zaious/jev-capability-atlas)** — Independent, evidence-based map of when TypeSafe's Jev actually holds up vs. breaks down — real API-call receipts, not a leaderboard. 中文為主的雙語 repo。 `★ 19` · [`sdk`](https://github.com/Zaious/jev-capability-atlas/blob/b85bae4925f77a8d9576f63882a94521936d3c22/scripts/common/jev_client.py#L36) · Python
- **[JoshuaSP/open-jev](https://github.com/JoshuaSP/open-jev)** — Typed JSON inference with DiffusionGemma, with Every and Jev benchmark results `★ 17` · [`model_id`](https://github.com/JoshuaSP/open-jev/blob/50d32c7e542dd714c89bb223e8fc8c0b2b3d0d9c/public_eval_benchmark.py#L183) · Python
- **[mizchi/jev-playground](https://github.com/mizchi/jev-playground)** — TypeSafe AI の System One モデル Jev を MoonBit から触るためのプレイグラウンド。 `★ 17` · [`endpoint`](https://github.com/mizchi/jev-playground/blob/92701bb053ffcec7bb77f23f26b6b1b01ad83f8b/jevlang-js/src/jev.mjs#L11) · TypeScript
- **[goodrahstar/jev-column-race](https://github.com/goodrahstar/jev-column-race)** — Jev vs Gemini 3.8 Flash: labelling 1,000 app reviews, 4.1× faster and 7× cheaper `★ 16` · [`endpoint`](https://github.com/goodrahstar/jev-column-race/blob/d9ee360ccd84462f4eab9493a7c2c617d0dab9df/lib/racers.mjs#L64) · JavaScript
- **[danielgshea/jev-as-a-judge](https://github.com/danielgshea/jev-as-a-judge)** — Using Jev as an evaluator. `★ 12` · [`model_id`](https://github.com/danielgshea/jev-as-a-judge/blob/adfea74905f721ea2594e22804c8c8edf1693163/src/evals/judge_reliability.py#L12) · Python
- **[AbdelStark/jev-benchmarks](https://github.com/AbdelStark/jev-benchmarks)** — Probability-aware evaluation for typed decision models: calibration, selective risk, latency, and reproducible benchmarks. `★ 11` · [`sdk`](https://github.com/AbdelStark/jev-benchmarks/blob/0d610cc53e79bcbec691312b0c4adb4a0e371642/src/jev_benchmarks/adapters/jev.py#L5) · Python
- **[NanmiCoder/jev-arena](https://github.com/NanmiCoder/jev-arena)** — Jev 模型介绍与实测：通过 Choice / Score / Noul 将自然语言转为带类型的判断与概率，用于分类、评分和路由；支持与 DeepSeek 等模型对比评论打标、速度与结果，含 CSV/Excel 导入、原速回放与离线报告。 `★ 9` · [`model_id`](https://github.com/NanmiCoder/jev-arena/blob/cddc901138d513003b686a404122a6b9227fba40/src/config.mjs#L6) · JavaScript
- **[abhixhek/jevcal](https://github.com/abhixhek/jevcal)** — Stop guessing confidence thresholds: calibrate, threshold, and drift-check typed decision models (TypeSafe Jev) against an LLM teacher. `★ 8` · [`endpoint`](https://github.com/abhixhek/jevcal/blob/ae8f3144d69c9cb0e5e0a2c17f70b9d14714cb9f/src/jevcal/providers/typesafe.py#L19) · Python

→ 73 more in [categories/research.md](categories/research.md)

### Lists & resources

Other curated lists, directories, guides and cookbooks. · **56** entries

- **[Anil-matcha/awesome-jev-by-typesafe](https://github.com/Anil-matcha/awesome-jev-by-typesafe)** — Evidence-backed use cases, patterns, prompts, and starter code for TypeSafe Jev — a System One model for fast, typed, confidence-aware decisions in software. `★ 643` · [`sdk`](https://github.com/Anil-matcha/awesome-jev-by-typesafe/blob/bb18d31d1bf55ba3540f9b400b44c0dcfcf9a874/examples/python/quickstart.py#L3) · Python
- **[yibie/awesome-jev](https://github.com/yibie/awesome-jev)** — A curated list of public projects, integrations, and discussions built on Jev — TypeSafe AI's System One model for typed decisions. `★ 420` · `resource` · Python
- **[AbdelStark/awesome-typesafe](https://github.com/AbdelStark/awesome-typesafe)** — A curated list of official resources and community projects for TypeSafe, System One models, and Jev. `★ 352` · `resource` · CSS
- **[v-modal/awesome-jev-tools](https://github.com/v-modal/awesome-jev-tools)** — A curated list of tools built for Jev — TypeSafe AI's System One model for typed decisions. `★ 292` · `resource`
- **[cobanov/awesome-jev](https://github.com/cobanov/awesome-jev)** — A curated, source-backed list of projects built with Jev, TypeSafe AI's System One model for typed decisions. `★ 221` · `resource`
- **[fatwang2/awesome-jev](https://github.com/fatwang2/awesome-jev)** — A source-backed Jev project directory with a reusable Jev-only GitHub review workflow. `★ 166` · [`endpoint`](https://github.com/fatwang2/awesome-jev/blob/f036095ba8203001d40be955f3486cd3e0d0a81b/entries/omnijev--playjev.json#L4) · JavaScript
- **[logicrw/awesome-jev-projects](https://github.com/logicrw/awesome-jev-projects)** — Awesome Jev: source-backed open-source ecosystem radar, plain-language project discovery, and automatic GitHub sync `★ 135` · [`endpoint`](https://github.com/logicrw/awesome-jev-projects/blob/97057cc1ff712104b212ad27f0f935ee5e90ffac/scripts/issue-ingestion.mjs#L748) · JavaScript
- **[AnotiaWang/awesome-jev](https://github.com/AnotiaWang/awesome-jev)** — A curated list of awesome Jev / TypeSafe System One applications, libraries, and resources. `★ 87` · `resource`
- **[hellogumbo/awesome-jev](https://github.com/hellogumbo/awesome-jev)** — A community directory of projects built on Jev, TypeSafe AI's System One model. `★ 77` · [`endpoint`](https://github.com/hellogumbo/awesome-jev/blob/776f499028aa2557e5abd621b1205d295b9bcc44/scripts/build.mjs#L58) · JavaScript
- **[OmniJev/awesome-jev](https://github.com/OmniJev/awesome-jev)** — 🔥🔥 Papers, open reproductions and independent evaluations behind System One models and Jev. `★ 71` · `resource` · JavaScript

→ 46 more in [categories/list.md](categories/list.md)

## Contributing

Additions, corrections and **removals** are all welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Because entries are generated, a pull request should change `data/` or the pipeline, not the README. If we listed a project that does not belong here, open an issue and it will be removed.

## License

[CC0 1.0](LICENSE) — public domain. The pipeline under `scripts/` is MIT. This is an independent community project, not affiliated with or endorsed by TypeSafe AI.
