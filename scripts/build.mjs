#!/usr/bin/env node
// Renders README.md, README.zh-CN.md and categories/*.md from data/repos.json.
// Run: node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/repos.json'), 'utf8'));
const bench = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark/claims.json'), 'utf8'));

const CATS = [
  ['official',  'Official',                    'Repositories published by TypeSafe AI itself.',
                '官方仓库',                     'TypeSafe AI 官方发布的仓库。'],
  ['sdk',       'SDKs & clients',              'Libraries, bindings and CLIs for calling Jev from a language or shell.',
                'SDK 与客户端',                 '各语言的客户端、绑定和命令行工具，用来调用 Jev。'],
  ['agent',     'Agent tooling',               'Plugins, MCP servers and skills that put Jev inside a coding agent.',
                'Agent 工具',                   '把 Jev 接进编码 agent 的插件、MCP server 和 skill。'],
  ['guardrail', 'Guardrails & review',         'Approve, reject, flag or escalate — safety gates, moderation, code review.',
                '护栏与审查',                   '放行、拦截、标记或升级：安全闸门、内容审核、代码审查。'],
  ['context',   'Context engineering',         'Compaction, pruning, memory and deciding what an agent should read or keep.',
                '上下文工程',                   '压缩、裁剪、记忆，决定 agent 该读什么、留什么。'],
  ['browser',   'Browser & computer use',      'Browser automation, GUI and device control driven by typed decisions.',
                '浏览器与电脑操作',              '由类型化决策驱动的浏览器自动化、GUI 与设备控制。'],
  ['infra',     'Infrastructure',              'Gateways, routers, caches, database extensions and self-hosted endpoints.',
                '基础设施',                     '网关、路由、缓存、数据库扩展和自托管端点。'],
  ['retrieval', 'Search & retrieval',          'Semantic grep, ranking, filtering and classification over documents and data.',
                '搜索与检索',                   '语义 grep、排序、过滤，以及对文档和数据的分类。'],
  ['app',       'Applications',                'End-user products: trading, social, recruiting, home automation, productivity.',
                '应用产品',                     '面向最终用户的产品：交易、社交、招聘、智能家居、效率工具。'],
  ['game',      'Games, robotics & simulation','Games, simulations, drones and other embodied or playful demos.',
                '游戏、机器人与仿真',            '游戏、仿真、无人机等具身或好玩的演示。'],
  ['repro',     'Open reproductions',          'Open-source clones, alternative System One models and local runtimes.',
                '开源复现',                     '开源复刻、替代的 System One 模型和本地运行时。'],
  ['research',  'Benchmarks & research',       'Evaluations, calibration studies and test harnesses that measure behaviour.',
                '评测与研究',                   '评估、校准研究和测试框架，用来量化模型表现。'],
  ['list',      'Lists & resources',           'Other curated lists, directories, guides and cookbooks.',
                '榜单与资源',                   '其他精选列表、目录、指南和 cookbook。'],
];
const TOP_N = 10;

const stars = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const esc = s => String(s || '').replace(/\|/g, '\\|').replace(/([*_[\]<>])/g, '\\$1');
// Mirrors GitHub's heading-anchor rules: lowercase, drop punctuation, spaces to hyphens.
const slug = s => s.toLowerCase().trim()
  .replace(/[^\p{Letter}\p{Number} _-]/gu, '')
  .replace(/ /g, '-');

function entryLine(e) {
  const bits = [`- **[${e.repo}](${e.url})** — ${esc(e.desc) || '_no description_'}`];
  const tail = [`\`★ ${stars(e.stars)}\``];
  if (e.evidence) tail.push(`[\`${e.evidence.kind}\`](${e.evidence.permalink})`);
  else if (e.tier === 'official') tail.push('`official`');
  else tail.push('`resource`');
  if (e.lang) tail.push(e.lang);
  return `${bits[0]} ${tail.join(' · ')}`;
}

const byCat = Object.fromEntries(CATS.map(([k]) => [k, []]));
for (const e of db.entries) (byCat[e.category] ||= []).push(e);
for (const k of Object.keys(byCat)) byCat[k].sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo));

// ---------- category pages ----------
for (const [key, title, blurb, zhTitle, zhBlurb] of CATS) {
  const list = byCat[key] || [];
  if (!list.length) continue;
  const body = [
    `# ${title}`, '',
    `> ${blurb}`, '',
    `${list.length} entries · sorted by stars · generated ${db.generated_at} · [back to the list](../README.md)`, '',
    `**${zhTitle}** — ${zhBlurb}`, '',
    ...list.map(entryLine), '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'categories', `${key}.md`), body);
}

// ---------- claims table ----------
const claimsTable = (lang) => {
  const head = lang === 'zh'
    ? ['宣传说法', '出处', '实测结果', '判定']
    : ['Claim', 'Source', 'What we measured', 'Verdict'];
  const rows = bench.claims.map(c => `| ${c[lang === 'zh' ? 'claim_zh' : 'claim']} | ${c.source} | ${c[lang === 'zh' ? 'measured_zh' : 'measured']} | ${c[lang === 'zh' ? 'verdict_zh' : 'verdict']} |`);
  return [`| ${head.join(' | ')} |`, `| --- | --- | --- | --- |`, ...rows].join('\n');
};

const contentsTable = (lang) => CATS.filter(([k]) => (byCat[k] || []).length).map(([k, t, , zt]) =>
  `- [${lang === 'zh' ? zt : t}](#${slug(lang === 'zh' ? zt : t)}) — **${byCat[k].length}**`).join('\n');

const counts = {
  total: db.entries.length,
  verified: db.entries.filter(e => e.evidence).length,
  langs: new Set(db.entries.map(e => e.lang).filter(Boolean)).size,
  leads: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/leads.json'), 'utf8')).count,
};

function section(lang) {
  return CATS.filter(([k]) => (byCat[k] || []).length).map(([k, title, blurb, zhTitle, zhBlurb]) => {
    const list = byCat[k];
    const shown = list.slice(0, TOP_N);
    const more = list.length - shown.length;
    const head = lang === 'zh' ? zhTitle : title;
    const desc = lang === 'zh' ? zhBlurb : blurb;
    const tail = more > 0
      ? (lang === 'zh'
        ? `\n→ 其余 ${more} 个见 [categories/${k}.md](categories/${k}.md)`
        : `\n→ ${more} more in [categories/${k}.md](categories/${k}.md)`)
      : `\n→ ${lang === 'zh' ? '完整列表' : 'full list'}: [categories/${k}.md](categories/${k}.md)`;
    return [`### ${head}`, '', `${desc} · **${list.length}** ${lang === 'zh' ? '个' : 'entries'}`, '',
      ...shown.map(entryLine), tail].join('\n');
  }).join('\n\n');
}

fs.writeFileSync(path.join(ROOT, 'README.md'), renderEN());
fs.writeFileSync(path.join(ROOT, 'README.zh-CN.md'), renderZH());
console.log(`built README (${counts.total} entries, ${counts.verified} with code evidence)`);

function badges() {
  return [
    `![verified](https://img.shields.io/badge/code--verified-${counts.verified}-2a78d6?style=flat-square)`,
    `![entries](https://img.shields.io/badge/entries-${counts.total}-444?style=flat-square)`,
    `![checked](https://img.shields.io/badge/last%20checked-${db.generated_at.replace(/-/g,'--')}-666?style=flat-square)`,
    `[![CC0](https://img.shields.io/badge/license-CC0--1.0-lightgrey?style=flat-square)](LICENSE)`,
  ].join(' ');
}

function renderEN() {
  return `# Awesome Jev — Verified [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

${badges()}

**English** · [简体中文](README.zh-CN.md)

> A curated list of open-source projects built on [Jev](https://typesafe.ai/), TypeSafe AI's System One model for typed decisions — where **every entry links to the line of code that calls Jev**, and every performance number comes from a measurement we ran ourselves.

Jev is not a chat model. You hand it state plus typed questions, and it hands back constrained answers with probabilities:

\`\`\`js
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
\`\`\`

## Why another Jev list

There are already more than a dozen \`awesome-jev\` lists, and several are good — they are credited in [Lists & resources](#lists--resources). This one is built differently in two ways.

**1. Entries carry receipts.** Inclusion is not decided by reading a README. Every repository below was downloaded at a pinned commit and searched for an actual Jev call — the API endpoint, an official SDK import, a model identifier, or the AI SDK's evaluate interface. The \`kind\` badge on each entry links to that exact file and line. ${counts.verified} of ${counts.total} entries cleared that bar; the ${counts.leads} that matched a search but produced no code evidence are parked in [\`data/leads.json\`](data/leads.json) instead of being quietly listed.

**2. Claims are replaced by measurements.** Most lists repeat TypeSafe's marketing numbers — "sub-100ms", "100× faster", "eliminates hallucination". We ran ${bench.meta.questions.toLocaleString()} labelled questions through Jev and four comparison models and checked. Some claims hold up well; several do not.

| ${'What we measured'} | Jev | GPT-4.1-mini | GPT-5.6 Sol |
| --- | --- | --- | --- |
| True/false accuracy | **${bench.headline.bool_acc.jev}** | ${bench.headline.bool_acc.baseline} | ${bench.headline.bool_acc.sol} |
| Multiple-choice accuracy | ${bench.headline.choice_acc.jev} | ${bench.headline.choice_acc.baseline} | **${bench.headline.choice_acc.sol}** |
| Confidently wrong (≥90% sure, still wrong, of 800) | **${bench.headline.confident_wrong.jev}** | ${bench.headline.confident_wrong.baseline} | ${bench.headline.confident_wrong.sol} |
| Prompt injections that worked (of 80) | **${bench.headline.injection.jev}** | ${bench.headline.injection.baseline} | ${bench.headline.injection.sol} |
| Median latency, one question per call | **${bench.headline.latency.jev}** | ${bench.headline.latency.baseline} | ${bench.headline.latency.sol} |
| Cost for all ${bench.meta.questions.toLocaleString()} questions | **${bench.headline.cost.jev}** | ${bench.headline.cost.baseline} | ${bench.headline.cost.sol} |

And claim by claim:

${claimsTable('en')}

Full method, per-dataset accuracy, calibration curves and the failure cases are in [\`benchmark/\`](benchmark/README.md). The harness is open, so you can disagree with us in code.

## Contents

${contentsTable('en')}

Each section shows the top ${TOP_N} by stars; the full category list is one click away. Stars were read on ${db.generated_at} — they measure attention, not quality.

## How an entry gets here

1. **Discover.** GitHub search across repository names, descriptions and topics for Jev and TypeSafe System One terms.
2. **Verify.** Download the repository at its current commit and search the source for \`api.typesafe.ai\`, \`/v1/systemone\`, an official SDK import, a \`jev-*\` model identifier, or \`experimental_evaluate\`. Config and CI files count for less than real source files.
3. **Classify.** Jev itself sorts each repository into one of the categories above and rates how reusable and substantial it looks. Low-confidence calls are flagged in the data for human review. Using the model to build its own directory is partly a demonstration and partly an admission: the categories are a machine's opinion, not a verdict.
4. **Publish.** \`scripts/build.mjs\` regenerates these pages from [\`data/repos.json\`](data/repos.json). Nothing in this README is hand-edited.

### What a listing does not mean

A listing means one thing: on ${db.generated_at}, this repository contained code that calls Jev. It is **not** a review of quality, security, licensing or whether the project runs at all. Many of these repositories are days old and were published during a launch rush. Before depending on one, read the code, check the license, and run it yourself.

## The list

${section('en')}

## Contributing

Additions, corrections and **removals** are all welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Because entries are generated, a pull request should change \`data/\` or the pipeline, not the README. If we listed a project that does not belong here, open an issue and it will be removed.

## License

[CC0 1.0](LICENSE) — public domain. The pipeline under \`scripts/\` is MIT. This is an independent community project, not affiliated with or endorsed by TypeSafe AI.
`;
}

function renderZH() {
  return `# Awesome Jev — 可验证版 [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

${badges()}

[English](README.md) · **简体中文**

> 一份关于 [Jev](https://typesafe.ai/)（TypeSafe AI 的 System One 类型化决策模型）开源项目的精选列表。特点是：**每一条都能点到真正调用 Jev 的那行代码**，每一个性能数字都来自我们自己跑出来的实测，而不是转述宣传。

Jev 不是聊天模型。你给它一段状态和几个带类型的问题，它返回受约束的答案和概率：

\`\`\`js
import { experimental_evaluate as evaluate } from 'ai';

const { answers } = await evaluate({
  model: 'typesafe-ai/jev',
  state: '我被重复扣款了，请退掉多收的那笔。',
  questions: {
    requestsRefund: { type: 'boolean', instructions: '客户是否在要求退款？' },
    dept: { type: 'choice', instructions: '该转给哪个团队？',
            criteria: { billing: '扣款与退款', technical: '程序问题', account: '登录问题' } },
    severity: { type: 'score', instructions: '严重程度？', criteria: ['轻微', '影响使用', '完全阻塞'] },
  },
});
// answers.dept.choice === 'billing'，并附带一份概率分布
\`\`\`

## 为什么还要再做一份

GitHub 上已经有十几份 \`awesome-jev\`，其中几份做得不错，都列在 [榜单与资源](#榜单与资源) 里。这一份有两点不同。

**一、每条都有证据。** 收录与否不靠读 README 判断。下面每个仓库都在固定 commit 上被下载下来，在源码里搜索真正的 Jev 调用——API 端点、官方 SDK 引入、模型标识符，或 AI SDK 的 evaluate 接口。每条后面的 \`kind\` 徽标直接链到那个文件和行号。${counts.total} 条里有 ${counts.verified} 条过了这一关；另外 ${counts.leads} 个搜到了但找不到代码证据的，放在 [\`data/leads.json\`](data/leads.json) 里存档，而不是混进列表。

**二、用实测替换宣传。** 大部分列表都在重复 TypeSafe 的官方说法——"0.1 秒以内""快 100 倍""彻底根除幻觉"。我们拿 ${bench.meta.questions.toLocaleString()} 道有标准答案的题，让 Jev 和四个对照模型一起跑了一遍。有些说法站得住，有几条站不住。

| 实测项 | Jev | GPT-4.1-mini | GPT-5.6 Sol |
| --- | --- | --- | --- |
| 是/否题准确率 | **${bench.headline.bool_acc.jev}** | ${bench.headline.bool_acc.baseline} | ${bench.headline.bool_acc.sol} |
| 多选题准确率 | ${bench.headline.choice_acc.jev} | ${bench.headline.choice_acc.baseline} | **${bench.headline.choice_acc.sol}** |
| 信心 ≥90% 却答错（800 题中） | **${bench.headline.confident_wrong.jev}** | ${bench.headline.confident_wrong.baseline} | ${bench.headline.confident_wrong.sol} |
| 提示注入得手次数（80 次中） | **${bench.headline.injection.jev}** | ${bench.headline.injection.baseline} | ${bench.headline.injection.sol} |
| 单题调用的中位延迟 | **${bench.headline.latency.jev}** | ${bench.headline.latency.baseline} | ${bench.headline.latency.sol} |
| 跑完 ${bench.meta.questions.toLocaleString()} 题的花费 | **${bench.headline.cost.jev}** | ${bench.headline.cost.baseline} | ${bench.headline.cost.sol} |

逐条核对：

${claimsTable('zh')}

完整方法、分数据集准确率、校准曲线和典型错误在 [\`benchmark/\`](benchmark/README.md)。测试脚本是开源的，欢迎用代码来反驳。

## 目录

${contentsTable('zh')}

每个分类在这里只展示 star 最高的 ${TOP_N} 个，完整名单点进去一页就是。star 数读取于 ${db.generated_at}，它衡量的是关注度，不是质量。

## 一条记录是怎么进来的

1. **发现**：在 GitHub 上按仓库名、描述和 topic 搜索 Jev 与 TypeSafe System One 相关词。
2. **验证**：把仓库按当前 commit 下载下来，在源码里搜 \`api.typesafe.ai\`、\`/v1/systemone\`、官方 SDK 引入、\`jev-*\` 模型标识符或 \`experimental_evaluate\`。配置和 CI 文件的权重低于真正的源码文件。
3. **分类**：由 Jev 自己把每个仓库归入上面的分类，并给出"可复用程度"和"完成度"的判断。置信度低的会在数据里标出来等人工复核。用这个模型给它自己的生态做目录，一半是演示，一半是坦白：分类是机器的意见，不是定论。
4. **生成**：\`scripts/build.mjs\` 从 [\`data/repos.json\`](data/repos.json) 重新渲染这些页面。README 里没有手写内容。

### 被收录不代表什么

被收录只说明一件事：在 ${db.generated_at} 这一天，这个仓库里有调用 Jev 的代码。它**不是**对质量、安全性、许可证或"这玩意儿能不能跑"的背书。这里不少仓库只有几天大，是在发布热潮里推上来的。在依赖任何一个之前，请自己读代码、看许可证、跑一遍。

## 列表

${section('zh')}

## 参与贡献

欢迎补充、纠错，也**欢迎提出删除**——见 [CONTRIBUTING.md](CONTRIBUTING.md)。因为条目是生成的，PR 请改 \`data/\` 或流水线脚本，不要直接改 README。如果我们收录了不该收录的项目，开个 issue，会删掉。

## 许可

[CC0 1.0](LICENSE)，公共领域。\`scripts/\` 下的流水线代码按 MIT 授权。本项目为独立的社区项目，与 TypeSafe AI 无隶属关系，也未获其背书。
`;
}
