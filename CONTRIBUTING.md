# Contributing

This list is generated. `README.md`, `README.zh-CN.md` and everything in `categories/` are rendered from `data/repos.json` by `scripts/build.mjs`, so a pull request that edits those files by hand will be overwritten on the next refresh.

## Adding a project

Open an issue with the repository URL, or send a pull request that adds an entry to `data/repos.json`. Either way, the project has to clear the same bar as everything else:

1. **It is public on GitHub** and not a fork or an archive.
2. **Its source contains a real Jev call.** The pipeline looks for `api.typesafe.ai`, `/v1/systemone`, an official SDK import (`@typesafe-ai/…`, `typesafe-sdk…`, `TypeSafeClient`), a `jev-*` model identifier, or the AI SDK's `experimental_evaluate`. A README that describes Jev is not enough — the code has to call it.
3. **The project is about Jev**, rather than mentioning it in passing.

Open reproductions and alternative System One models count, even though they do not call the hosted API: they are listed under Open reproductions and their evidence points at the implementation instead.

## Asking for a removal

Removal requests are as welcome as additions, and they do not need a justification beyond one of these:

- the project no longer uses Jev,
- you are the author and would rather not be listed,
- the entry is wrong, mis-categorised, or the description misrepresents the project.

Open an issue and it will be removed on the next build.

## Correcting a category

Categories are assigned by Jev itself, which gets things wrong — particularly for projects that straddle two areas. `data/repos.json` records the model's confidence for every call (`jev_says.category_confidence`). If a project is filed under the wrong heading, say so in an issue with the category you think fits; manual overrides win over the model.

## Re-running the pipeline

```bash
node scripts/discover.mjs    # GitHub search → data/raw.json
node scripts/verify.mjs      # download at pinned commit, find evidence
node scripts/classify.mjs    # Jev sorts each repo into a category
node scripts/build.mjs       # render README + categories
```

`discover` and `verify` need `gh` authenticated. `classify` needs an `AI_GATEWAY_API_KEY` in the environment; the whole run costs a few cents.

## Scope

This list covers open-source projects that use Jev. It does not cover closed products, blog posts, or discussion threads — several other lists do that well, and they are linked from the Lists & resources section.
