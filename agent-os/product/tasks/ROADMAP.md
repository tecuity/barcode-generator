# barcode-generator — Modernization Roadmap

## Braden Steiner - Last Modified: 2026-07-10

## Goal

Take `@tecuity/barcode-generator` from its current state (v1.2.1, UMD-only Rollup 1 build, no tests,
no CI, unbuildable on Windows) to a modern package that:
1. Builds and publishes on **Node 24** (management mandate).
2. Consumes cleanly in **React 19** apps via native ESM + CJS `exports`.
3. Has a real test suite and a React-19 demo-site.
4. Eventually lives in **Azure DevOps** with its own CI and private Artifacts feed.

The library core is zero-dependency, framework-agnostic vanilla JS — "React 19 compatibility" means
modern module output, **not** adding React as a dependency. See each task file for detail.

---

## Prerequisite (blocking everything)

**`src/svg/*.svg` → `src/svg/STAR.svg` rename.** The `*` glyph filename is illegal on Windows/NTFS
and makes the repo impossible to `git clone` on Windows. The rename is prepared in the working tree
and awaiting a manual commit. Tracked as **000001 Task 1**. Nothing else can be built or tested on
Windows until this lands.

---

## Sequence

The three plans are ordered. 000001 is the foundation; 000002 can run in parallel once the library
builds; 000003 comes last and depends on 000001's build + test scripts existing.

### 000001 — [Node 24 Publish & Module Modernization](./000001-Node24PublishModernization.md)

Root/package changes. The foundation for everything else.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Repo hygiene: STAR.svg rename, `.nvmrc` + `engines: >=24`, cross-platform `postversion` | |
| 1 | Rollup 1 → 4 toolchain (mind the `@rollup/plugin-*` v6 CJS `default`-export interop); dual ESM + CJS + UMD output; fix the `svgMap.json` generation bug; remove the shared root `.babelrc` (inline the library's Babel config into Rollup) | |
| 2 | `exports`/`module`/`types` map; hand-written `index.d.ts`; verify import in a React 19 sandbox | |
| 3 | Vitest suite replacing the placeholder `index.test.js`; gate `np` on `test:ci` | |
| 4 | Prune stale library devDependencies; bump `np` to v10 | |
| 5 | Clean Node 24 build, inspect the publish tarball, publish **1.3.0** | |

### 000002 — [Demo-Site React 19 Upgrade](./000002-DemoSiteReact19Upgrade.md)

Independent of the published package. Can proceed in parallel with 000001 Phases 1–4; only Task 3
(the `dist` import path) depends on 000001 Phase 1 having renamed the build outputs.

| Task | Description | Status |
|------|-------------|--------|
| 1 | Bump demo-site to React 19, Emotion 11, Parcel 2; remove the duplicate `parcel-bundler@1` | |
| 2 | Source updates: `createRoot`, `@emotion/react`, drop deprecated `keyCode` | |
| 3 | Fix the `../dist/index.js` import for the renamed build outputs | |
| 4 | Update the Parcel 2 site scripts (`--out-dir` → `--dist-dir`) | |
| 5 | Verify the demo runs; rebuild `docs/` | |

### 000003 — [ADO Migration](./000003-ADOMigration.md)

Runs **after** 000001 is merged (CI wires to its `build`/`test:ci` scripts). CI is net-new here —
this repo has no pipeline today.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Confirm ADO org/project; decide public-npm fate; create Artifacts feed | |
| 1 | Create ADO repo; mirror history/branches/tags; repoint remotes; branch policies | |
| 2 | Create `azure-pipelines.yml` (Node 24 install/build/test); create the pipeline | |
| 3 | Scoped `.npmrc`; `publishConfig` → feed; PAT; CI publish step; verify end-to-end publish | |
| 4 | Repoint every consuming repo at the feed; update their CI auth | |
| 5 | Redirect notice + archive the GitHub repo | |

---

## Flags and Known Issues

**Node 24 is a hard floor (management mandate).** 000001 Task 2 sets `engines.node: ">=24.0.0"`
(not just a toolchain floor) — this applies to downstream consumers too. Decide whether to add
`engine-strict=true` so installs hard-fail rather than warn.

**Two committed `svgMap.json` files, one of them stale.** `process.js` writes the root copy but the
build imports `src/svgMap.json`. 000001 Task 6 consolidates to a single reproducible map. Don't
hand-edit either map before that task — regenerate from the SVGs.

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
