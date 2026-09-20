# What we measured

Every performance number in this list comes from one test run, not from marketing copy.

- **When:** 2026-09-19
- **What:** 2,390 labelled questions (English, plus 300 Chinese counterparts), 0 errors
- **Who:** `typesafe-ai/jev` (`jev-1.13.0`) against GPT-4.1-mini and GPT-5.6 Sol / Terra / Luna
- **How:** Vercel AI Gateway, AI SDK 7.0.107, concurrency 10, one question per call unless stated
- **Full report (Chinese, with charts):** <https://jev-playground-five.vercel.app/report>
- **Try it yourself:** <https://jev-playground-five.vercel.app>

The grading standard is TypeSafe's own: the criteria in their documentation for accuracy, calibration, consistency, latency and price.

The scripts are in [`harness/`](harness/README.md) and every per-question result is in [`results/`](results) — one JSONL line per question per model. Re-running `harness/fetch_data.mjs` rebuilds the same sample from a fixed seed.

## Headline

| | Jev | GPT-4.1-mini | GPT-5.6 Sol | GPT-5.6 Terra | GPT-5.6 Luna |
| --- | --- | --- | --- | --- | --- |
| True/false accuracy (800) | **92.5%** | 87.8% | 92.1% | 91.6% | 86.0% |
| Multiple-choice accuracy (400) | 77.3% | 74.3% | **82.5%** | 82.0% | 80.5% |
| Boolean ECE (lower is better) | 0.048 | 0.078 | **0.043** | 0.051 | 0.105 |
| Confidently wrong (≥90%, of 800) | **6** | 70 | 39 | 49 | 88 |
| Prompt injections that worked (of 80) | **1** | 73 | **1** | 11 | 63 |
| Median latency, single question | **456 ms** | 928 ms | 1661 ms | 1342 ms | 1367 ms |
| Slowest 1% of requests | **< 0.8 s** | — | 6–7.6 s | 6–7.6 s | 6–7.6 s |
| Cost for all 2,390 questions | **$0.049** | $0.246 | $4.27 | $2.16 | $0.27 |

Read that as: accuracy roughly level with the newest reasoning models on yes/no work, about 5 points behind on multiple choice, far steadier, much faster, and one to two orders of magnitude cheaper — and by a wide margin the least likely to be confidently wrong.

## Accuracy by dataset

Accuracy % / expected calibration error.

| Dataset | Jev | GPT-4.1-mini | Sol | Terra | Luna |
| --- | --- | --- | --- | --- | --- |
| SST-2 | 96.0 / 0.095 | 92.7 / 0.084 | 96.0 / 0.026 | 95.3 / 0.041 | 95.3 / 0.038 |
| BoolQ | 88.0 / 0.046 | 87.0 / 0.115 | 90.0 / 0.078 | 91.5 / 0.065 | 84.0 / 0.134 |
| RTE | 94.0 / 0.047 | 92.0 / 0.043 | 91.3 / 0.064 | 89.3 / 0.083 | 85.3 / 0.124 |
| TruthfulQA | 93.0 / 0.060 | 83.7 / 0.117 | 92.0 / 0.041 | 91.0 / 0.068 | 83.0 / 0.133 |
| XNLI (en) | 79.3 / 0.101 | 77.3 / 0.139 | 83.3 / 0.127 | 82.7 / 0.119 | 78.7 / 0.191 |
| XNLI (zh) | 68.7 / 0.198 | 70.0 / 0.200 | 70.0 / 0.247 | 69.3 / 0.257 | 62.7 / 0.342 |
| Banking77 (77-way intent) | 68.0 / 0.180 | 66.0 / 0.265 | 78.0 / 0.138 | 76.7 / 0.152 | 78.0 / 0.153 |
| AG News | 88.0 / 0.118 | 82.0 / 0.115 | 88.0 / 0.104 | 89.0 / 0.063 | 87.0 / 0.115 |
| Counting | 65.0 / 0.126 | 67.5 / 0.325 | 97.5 / 0.021 | 75.0 / 0.248 | 90.0 / 0.096 |
| Arithmetic | 100.0 / 0.019 | 90.0 / 0.100 | 100.0 / 0.000 | 97.5 / 0.024 | 95.0 / 0.048 |
| Dates | 100.0 / 0.035 | 100.0 / 0.001 | 100.0 / 0.000 | 100.0 / 0.000 | 97.5 / 0.020 |
| Multi-hop indirection | 100.0 / 0.055 | 86.7 / 0.133 | 96.7 / 0.033 | 100.0 / 0.001 | 93.3 / 0.066 |
| Injection resistance | 97.5 / 0.164 | 1.3 / 0.988 | 95.0 / 0.032 | 86.3 / 0.128 | 16.3 / 0.827 |
| **All booleans** | **92.5 / 0.048** | 87.8 / 0.078 | 92.1 / 0.043 | 91.6 / 0.051 | 86.0 / 0.105 |
| **All choices** | 77.3 / 0.124 | 74.3 / 0.179 | **82.5 / 0.124** | 82.0 / 0.116 | 80.5 / 0.152 |

## What this means when you build

- **Counting is the real weakness.** Jev answers 65–77% on counting tasks; Sol, which can reason step by step, gets 97.5%. Every counting error in the base set was Jev agreeing with a number the question suggested. Do not ask it to count.
- **Fine-grained classification degrades.** On Banking77 — one intent out of 77 — Jev scores 68% against 77–78% for the GPT-5.6 models. Keep option sets small.
- **Its confidence is worth routing on.** Put the top 68% of multiple-choice answers through automatically and they are 90% correct; the 20% Jev marks as unsure are 43% correct, which is exactly the pile a human should see. The GPT models push 81–87% of everything into their top bucket, so their confidence sorts almost nothing.
- **Batch your questions.** Fifty questions in one call cost about the same wall-clock time as one, and only 2 of 50 answers differed from asking separately. At 100 per call, end-to-end time became erratic (1.0 s, 4.1 s, 8.2 s).
- **Injection resistance is genuinely strong**, level with Sol and far ahead of GPT-4.1-mini and Luna.

## Limits of this test

- The GPT-5.6 variants ran on default settings (reasoning on, no temperature set); GPT-4.1-mini ran at temperature 0. Turning reasoning effort up would likely raise their accuracy — and their cost and latency with it.
- The GPT models' "probabilities" are self-reported numbers, which are coarse by nature and cluster near 0.95. That comparison flatters Jev's calibration. Token log-probabilities would treat them more fairly.
- Claude Opus 5 was tried on 20 questions only (15 of 17 successful calls correct, ~$0.0044 per question, ~2.7 s median, rate-limited at the gateway) — too small a sample to include.
- Each dataset holds 100–300 items, so 95% confidence intervals are roughly ±3–6 points.
- Not tested: image input (Jev does not accept it), 32k-token contexts, and two items from TypeSafe's own jaggedness list.
- Latency was measured through the Vercel gateway from one location. Users closer to the datacentre will see less — but Jev's own server-side time never went below 189 ms.

Sources for the question sets: google/boolq, stanfordnlp/sst2, nyu-mll/glue (RTE), truthfulqa, facebook/xnli, PolyAI/banking77, fancyzhx/ag_news.
