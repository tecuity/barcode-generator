# barcode-generator — Modernization Roadmap

## Braden Steiner - Last Modified: 2026-08-11

## Goal

Take `@tecuity/barcode-generator` from its current state (v1.2.1, UMD-only Rollup 1 build, no tests,
no CI, Yarn-based) to a modern package that:
1. Builds and publishes on **Node 24** (management mandate).
2. Consumes cleanly in **React 19** apps via native ESM + CJS `exports`.
3. Has a real test suite and a React-19 demo-site.
4. Eventually lives in **Azure DevOps** with its own CI and private Artifacts feed.

The library core is zero-dependency, framework-agnostic vanilla JS — "React 19 compatibility" means
modern module output, **not** adding React as a dependency. See each task file for detail.

---

## Prerequisite — DONE ✓

**`src/svg/*.svg` → `src/svg/STAR.svg` rename.** The `*` glyph filename was illegal on Windows/NTFS
and made the repo impossible to `git clone` on Windows. **This has already landed in commit
`80d6436`** — the rename, the `process.js` `STAR` → `*` special-casing, and the regenerated
`svgMap.json` files are all committed; git status is clean and no tracked path contains `*`. Tracked
as **000001 Task 1** (marked done). This no longer blocks anything.

---

## Sequence

Stories run in order: **000001 → 000002 → 000003.** Within each story, do the steps below in order.
Everything listed inside a single step can be worked at the same time. Task numbers are unchanged
from the task files — these steps only regroup them, and where a task moves the table says so.

One exception to the story order: **000003 Step 1 changes no file in this repo, so it can be done at
any time** — including now, while 000001 is in flight. Doing it early keeps the Artifacts feed off
the critical path.

### 000001 — [Node 24 Publish & Module Modernization](./000001-Node24PublishModernization.md)

| Step | Do these together | Move on when |
|------|-------------------|--------------|
| 1. Baseline | **1.5** fixture capture · **2** `.nvmrc` + `engines` · **3** `copy-manifest`/`postversion` · **19** untrack `.DS_Store` | The fixture is committed (8 inputs × both option sets) and `node -v` is 24.x |
| 2. Install everything | One dependency transaction — the install/uninstall halves of **4, 11, 13, 14, 15** (command below) | `package-lock.json` committed, `yarn.lock` gone, `npm ci` clean on Node 24 |
| 3. Write the code | **5** Rollup 4 build · **6** `svgMap` fix · **7** delete root `.babelrc` · **8** `exports` map · **9** `index.d.ts` · **9.5** remove `Buffer` · **11** Vitest suite · **12** `np.testScript` · **13** delete `.eslintrc`/`.npmignore` · **14.5** release scripts | `npm run build` green with all four files in `dist/`; `npm run test:ci` green |
| 4. Clean-room check | **16** wipe `node_modules`/`dist`, reinstall, build, test, built-output parity | Both parity scripts print `parity OK` |
| 5. Prove the package | **10** React 19 sandbox (ESM + CJS + types) · **17** `npm run pack:preview` | Sandbox renders a barcode both ways; tarball lists exactly the four files + `package.json` |
| 6. Publish | **18** `npm run release -- minor` from `master` | `npm view` reports **1.3.0** |

**Step 2 command** — batching this is what lets Step 3 be worked by several people at once, since
`package-lock.json` cannot be merged from two branches:

```
npm install --save-dev rollup@^4 @rollup/plugin-babel@^7 @rollup/plugin-json@^6 vitest@^4 np@^12
npm uninstall rollup-plugin-babel chalk eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser babel-eslint eslint-config-react-app eslint-plugin-flowtype eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-react eslint-plugin-react-hooks
git rm yarn.lock
```

The build is **expected to be red between Steps 2 and 3** — `chalk` is uninstalled in Step 2 but
`build.js` stops referencing it only when Task 5 lands. That is why Step 2's check is `npm ci`, not
`npm run build`.

Three things to watch inside Step 3, all caused by two tasks sharing one file:
- **5 and 7 are a single edit** to `build.js` — the Babel config Task 7 inlines lives in the plugin
  block Task 5 writes. Task 4's `chalk` → `util.styleText` change is already part of that rewrite.
- **6 before 9.5** — both edit `src/index.js` (the line-1 import, then `svgToDataURL`).
- **One person owns `package.json`** for the whole step. Tasks 8, 11 (its scripts), 12, 13 and 14.5
  all edit it; batch them into one commit so the other work never rebases on it.

**Task 10 moves to Step 5** from the task file's Phase 2 — it needs the finished build, the `exports`
map, and the `Buffer` removal, none of which exist before Step 3 completes.

### 000002 — [Demo-Site React 19 Upgrade](./000002-DemoSiteReact19Upgrade.md)

Runs after **all** of 000001 — three separate couplings make it depend on the modernized library: the
renamed `dist` outputs (000001 Task 5), the `Buffer` global Parcel 2 will not polyfill (000001 Task
9.5), and the shared root `.babelrc` (000001 Task 7). Because 000001 lands first, none are conditional.

| Step | Do these together | Move on when |
|------|-------------------|--------------|
| 1. Upgrade | **1** React 19 / Emotion 11 / Parcel 2 · **2** `createRoot`, `@emotion/react`, `e.key` · **3** `../dist/index.mjs` import · **4** Parcel 2 site scripts · **6** root `README.md` | `npm install` resolves with no `--legacy-peer-deps`; no `ReactDOM.render`, `@emotion/core`, or `keyCode` left in `demo-site/` |
| 2. Verify and ship | **5** build the library, run the site, rebuild `docs/`, commit it | `docs/` holds exactly one JS and one CSS bundle plus `social.png`, and the page renders a barcode |

Tasks 1 and 4 both edit `package.json` — one commit. Task 6 (README) touches no demo-site file and
depends only on 000001, so it can start as soon as 000001's `package.json` is final; just cross-check
its `## Development` table against the real `scripts` block before merging.

### 000003 — [ADO Migration](./000003-ADOMigration.md)

Step 1 can start now. Everything from Step 2 on waits until 000001 is merged and `v1.3.0` is tagged —
CI wires to its `build`/`test:ci` scripts and `npm ci` needs the committed lockfile. CI is net-new
here; this repo has no pipeline today.

| Step | Do these together | Move on when |
|------|-------------------|--------------|
| 1. ADO setup | **1** confirm org/project → **3** create the feed · **2** decide the public-npm fate | The feed's registry URL is written down and the public-npm decision is recorded |
| 2. Move the repo | **4** create the repo → **5** mirror-push, then **6** dev remotes · **7** default branch · **8** reviewer policy | All branches and tags (`v1.2.1`, `v1.3.0`) are in ADO and every developer's `origin` is repointed |
| 3. Configure CI and publishing | **9** `azure-pipelines.yml` · **11** scoped `.npmrc` · **12** `publishConfig` → feed · **13** PAT · **15** document local auth | All five are committed or recorded |
| 4. Turn CI on | **10** create the pipeline and run it once | The run passes; add build validation to the Task 8 branch policy |
| 5. Prove publishing | **14** add the publish step → **16** verify from the feed | `npm view … --registry <feed>` returns the expected version |
| 6. Repoint consumers | For **each** consuming repo: **17** → **18** → **19** | Every consumer installs and builds from the feed and its CI is green |
| 7. Decommission | **20** redirect notice → **21** archive GitHub | The GitHub repo is archived |

Step 5 gates Step 6 — do not touch a consuming repo until Task 16 confirms the package is reachable.
In Step 6 the three tasks are ordered *within* a repo but the repos are independent, so all of them
can be done at once.

Step 2's mirror push must happen **after** `v1.3.0` is tagged, or the tag has to be pushed again.

---

## Flags and Known Issues

**The steps above override the `# Phase` headers inside the task files.** Task numbers, content, and
acceptance criteria are unchanged — only the execution order is regrouped. Two deliberate
differences: 000001's dependency changes are batched into Step 2 instead of being run task-by-task
(Tasks 4, 11, 13, 14 and 15 keep their verification steps, just not their own `npm install`), and
000001 Task 10 moves to Step 5 because it cannot pass until the full build exists. Where a task
file's ordering conflicts with a step here, the step wins.

**Node 24 is a hard floor (management mandate) — decided, not open.** 000001 Task 2 sets
`engines.node: ">=24.0.0"` (not just a toolchain floor); it applies to downstream consumers too,
which is intended, since management requires every Tecuity repo on Node 24. Consumers still on Node
20/22 will see `EBADENGINE` warnings — that is the intended signal. Do not soften the floor.

**`Buffer` is a Node-only global and the library depends on it.** [src/index.js](../../../../src/index.js)
base64-encodes via `Buffer.from(...)`. It works today only because Parcel 1 auto-injected a polyfill
into the demo-site bundle. Vite does not polyfill it and Parcel 2 requires the `buffer` package, so
**both** 000001's React 19 sandbox check (AC 6) and 000002's Parcel 2 build fail without a fix.
000001 Task 9.5 makes the encoder environment-agnostic with byte-identical output.

**Parcel 2 does not clean its output directory.** `docs/` already carries two JS bundles, only one of
which `docs/index.html` references. `docs/social.png` is referenced by **absolute** URL in the
`og:image`/`twitter:image` meta tags, so Parcel never emits it and a naive `rm -rf docs` silently
404s the social preview. 000002 Task 4 handles both in the `build-site` script.

**Two committed `svgMap.json` files with a write/read path split.** `process.js` writes the root
copy (`svgMap.json`) but the build imports `src/svgMap.json`, so the build always bundles the `src/`
copy and ignores the freshly generated root one. The two files are **currently byte-identical**
(56741 bytes each — confirmed 2026-08-11), so the bug is latent, but any regeneration would diverge
them. 000001 Task 6 consolidates to a single map: the **root** `svgMap.json` is canonical,
`src/index.js` imports `../svgMap.json`, and `src/svgMap.json` is deleted — leaving `src/` as
hand-written source only. The root map stays **committed** (the Vitest suite imports `src/index.js`
with no prior build), with `pretest`/`pretest:ci` hooks regenerating it before each test run. Don't
hand-edit either map before that task — regenerate from the SVGs.

**Package manager: standardizing on npm.** The repo is Yarn-based today (committed `yarn.lock`, no
`package-lock.json`; `np` releases via Yarn). 000001 Task 15 removes `yarn.lock` and commits a
`package-lock.json` so `np` and 000003's `npm ci` pipeline both use npm. Chosen over keeping Yarn.

**Releasing is a memorized command sequence today — 000001 Task 14.5 makes it three named scripts.**
The only release script is `"release": "npx np"`; the build, manifest copy, and tarball inspection are
all steps a maintainer is expected to retype, and `npx` can resolve a different `np` than the lockfile
pins. Task 14.5 settles on `npm run pack:preview` (what will ship), `npm run release:preview` (dry
run), and `npm run release -- minor` (publish), with `copy-manifest` shared between `postversion` and
`pack:preview` so the copy is defined once. Sequenced after Task 14 because the scripts call the
locally installed `np`. Documented in the README by 000002 Task 6.

**The root `README.md` is GitHub-facing only, and no task updated it until now.** `np.contents:
"dist"` publishes from `dist/`, and `postversion` copies only `package.json` there — so `README.md`
has never been in the tarball (pre-existing behavior, unchanged by these plans). It is still the
primary docs surface for anyone landing on the GitHub repo, and 000001 makes it stale: no Node 24
requirement, no ESM/CJS `exports` guidance, no mention of the shipped `index.d.ts`. **000002 Task 6**
now covers it, placed after the demo-site verification so every documented claim has already been
exercised. Note the content it documents comes entirely from 000001.

**Version strategy.** 000001 publishes `1.3.0` (additive: ESM/`exports` added, `main` preserved). Do
**not** drop the UMD `main` in this cycle — that would be a breaking `2.0.0`.

**Public-npm vs Azure Artifacts.** The package is currently on public npm. 000003 Task 2 requires
an explicit decision on whether to deprecate the public package or leave the last public version in
place once publishing moves to the private feed.

**Shared root `.babelrc` couples 000001 and 000002.** Both the library's Rollup build and the
demo-site's (new) Parcel 2 build read the repo-root `.babelrc`. Once it carries the custom
`preset-env` options the library needs, Parcel stops ignoring it and it overrides the demo-site's
JSX handling — and it has no `@babel/preset-react`. 000001 Task 7 removes the shared file (inlining
the library's Babel config into Rollup); land it before 000002 moves the demo-site to Parcel 2, or
the demo-site's JSX build will fail. Verified against Parcel 2 docs.
