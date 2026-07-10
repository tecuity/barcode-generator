# 000001-Node24PublishModernization - Tasks

## Braden Steiner - Last Modified: 2026-07-10

## Story Description

Modernize the `@tecuity/barcode-generator` package so a new version can be built and published to
npm on **Node 24**, and so the published output consumes cleanly in **React 19** applications. The
demo-site's own React 19 upgrade is tracked separately in
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md); the later move to Azure
DevOps is [000003-ADOMigration.md](./000003-ADOMigration.md). CI setup is deliberately deferred to
the ADO task and is out of scope here.

**Important framing — this is not a React component library.** The published code in
[src/index.js](../../../../src/index.js) is zero-dependency, framework-agnostic vanilla JS. It
exports a single function `generateBarcode(string, opts)` that returns a base64 SVG data URL (or a
raw SVG string). It imports no React. Therefore "React 19 compatibility" at the package level does
**not** mean upgrading a React dependency — it means **modernizing the module output** so React 19
apps on Vite / Webpack 5 / modern bundlers can import it as native ESM (with a `require`-able CJS
fallback) via a proper `exports` map. Today the package ships **UMD-only** through Rollup 1 with a
single `main` field.

**Starting state (as of this task file):**
- `@tecuity/barcode-generator` v1.2.1, published to public npm (`publishConfig.access: public`).
- Build: `node process.js && node build.js` — `process.js` generates the SVG character map,
  `build.js` bundles `src/index.js` with **Rollup 1.31** to a **UMD** bundle at `dist/index.js`.
- `main: dist/index.js`. **No `module`, no `exports`, no `types`, no ESM output.**
- No `engines` field; no `.nvmrc`. The `postversion` script uses Unix `cp -f` (breaks on native
  Windows shells).
- No real test suite — [index.test.js](../../../../index.test.js) is a one-line `console.log`.
- `devDependencies` mix the (tiny) library build toolchain with the demo-site's stack and contain a
  stale ESLint 6 / `@typescript-eslint@2` toolchain unused by any npm script.
- Publishing is done via `np` (`npx np`), with `np.contents: "dist"` and `np.tests: false`.
- **Prerequisite (in flight):** `src/svg/*.svg` was renamed to `src/svg/STAR.svg` because the `*`
  character is illegal on Windows/NTFS and made the repo impossible to `git clone` on Windows. See
  Task 1.

## Acceptance Criteria

1. A `.nvmrc` pins Node `24` and `package.json` declares an `engines.node` floor; `npm run build`
   completes with no errors or warnings on Node 24.
2. `src/svg/*.svg` no longer exists in the repo; `src/svg/STAR.svg` holds the Code 39 start/stop
   (`*`) glyph, and a fresh `git clone` checks out cleanly on Windows.
3. The build toolchain (Rollup, Babel plugins, `np`) runs on Node 24 with all packages on
   currently-supported major versions.
4. `npm run build` emits **both** an ESM build and a CJS build into `dist/`, and `package.json`
   exposes them through a correct `exports` map (plus back-compatible `main`/`module` fields).
5. A hand-written `index.d.ts` is shipped in the publish root so TypeScript React 19 consumers get
   types for the default export.
6. The built package imports and runs correctly in a React 19 + Vite sandbox app via
   `import generateBarcode from '@tecuity/barcode-generator'` **and** via
   `const g = require('@tecuity/barcode-generator')` in a CJS context — both return a valid
   `data:image/svg+xml;base64,...` URL for a sample input.
7. `npm test` and `npm run test:ci` run a real test runner with meaningful assertions on the
   generator output; the suite passes on Node 24.
8. Unused / duplicate devDependencies that belong to the library toolchain are removed; the
   remaining library `devDependencies` are on supported majors.
9. A new version (proposed `1.3.0`) is published to npm from a Node 24 environment, verified with
   `npm view @tecuity/barcode-generator` and a clean install in the React 19 sandbox.

## Developer Notes

**The library has zero runtime dependencies — keep it that way.** No task below should add a
runtime `dependencies` entry. React must never become a dependency or peerDependency of the
published package.

**The `svgMap` build has a latent bug — fix it during modernization.** `process.js` writes its
generated map to `./svgMap.json` (repo root), but [src/index.js](../../../../src/index.js) imports
`./svgMap.json` resolved relative to `src/`, i.e. `src/svgMap.json`. So the build bundles a
**stale, committed** `src/svgMap.json` and ignores the freshly generated root copy every time.
There are currently two near-identical committed maps (verified byte-identical today). Task 6
resolves this. It also depends on the `STAR.svg` rename (Task 1) because `process.js` now maps the
`STAR` filename to the `*` map key.

**The build toolchain and the demo-site must not share one Babel config.** The current root
`.babelrc` (`{ "presets": ["@babel/preset-env"] }`) is read by **both** the library's Rollup build
and — once the demo-site moves to Parcel 2 in 000002 — the demo-site's Parcel build. Parcel 2 will
**bypass** a `.babelrc` that contains only standard presets (SWC handles it), **but the moment
`@babel/preset-env` carries custom options such as `modules: false` / `targets` (which the library
build needs), Parcel picks the config up and it overrides Parcel's default JSX handling.** Since the
root config has no `@babel/preset-react`, that would break the demo-site's JSX. Task 7 therefore
**removes the shared root `.babelrc`** and moves the library's Babel options inline into the Rollup
plugin config (`babelrc: false`, `configFile: false`), leaving the demo-site on Parcel's fast SWC
path. This is called out in 000002 as well.

**Test runner choice: Vitest, not Jest.** This library is pure functions returning strings, with no
jsdom/React needs, and Phase 2 makes it ESM-first. Vitest is ESM-native, needs no Babel/jsdom
config, and runs cleanly on Node 24 — the right fit here. (Jest 29 is the org convention in
`granite-ui`, but that repo has jsdom/React component tests this one does not. The divergence is
intentional; document it in Task 11 History.)

**Version bump is a minor.** Adding ESM + `exports` while keeping the existing `main` working is
additive and backward-compatible — publish `1.3.0`, not a major. If a later decision drops the UMD
`main` entirely, that would be a breaking `2.0.0`; do not do that in this task.

**`np.tests` must flip once real tests exist.** Today `np.tests: false` skips testing on release
(there were no tests). After Phase 3, set `np` to run `test:ci` so releases are gated on a green
suite.

**Release runs from `master`, on Node 24, authenticated.** The publish (Task 17) is intentionally
last. It assumes: this preparation branch has been merged to `master` and the release is cut from
`master`; the active Node is `24` (managed via `nvm use 24`); and `npm` has been authenticated with
`@tecuity` publish rights (an OTP prompt is expected). These are environment preconditions, not code
changes — confirm them before starting Phase 5.

**Demo-site coupling.** The demo-site imports the built `dist` output directly
(`import generateBarcode from "../dist/index.js"`). Renaming the build outputs in Phase 1 (to
`index.cjs`/`index.mjs`) will break that import — the fix belongs to
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md), noted here so the coupling
is not a surprise.

---

# Phase 0 — Repo hygiene and Node 24 baseline

## Task 1: [ ] Land the `src/svg/*.svg` → `src/svg/STAR.svg` rename

**Task:** The Code 39 start/stop guard character `*` had its glyph stored in a file literally named
`*.svg`. `*` is a reserved character on Windows/NTFS, so `git clone` / `git checkout` aborted the
**entire** working-tree checkout on Windows (`error: invalid path 'src/svg/*.svg'`), making the
repo unusable for any Windows developer and unbuildable in a Windows publish environment. Rename the
file to `STAR.svg` (mirroring the existing `SPACE.svg` convention for the space character) and teach
the build to map it back to the `*` map key.

This change has already been prepared in the working tree and staged (awaiting a manual commit):
- `src/svg/*.svg` → `src/svg/STAR.svg` (100% content-identical rename).
- `process.js` — the `letter` derivation now special-cases `STAR` → `'*'` alongside the existing
  `SPACE` → `' '`.
- `svgMap.json` and `src/svgMap.json` — the `*` entry's `"filename"` field updated `*.svg` →
  `STAR.svg` (the `*` map key and glyph data are unchanged, so barcode output is identical).

Confirm no other tracked path contains a Windows-illegal character (`< > : " | ? *`) — a tree scan
confirmed `src/svg/*.svg` was the only one. (Note: `src/svg/.DS_Store` is tracked but harmless —
`process.js` filters it out via the `.includes('.svg')` guard. Optionally `git rm --cached` it and
add it to `.gitignore` as a hygiene aside.)

**Files:**
- `src/svg/STAR.svg` *(renamed from `src/svg/*.svg`)*
- `process.js`
- `svgMap.json`, `src/svgMap.json`

**Acceptance Criteria:** AC 2

**History:**

---

## Task 2: [ ] Add `.nvmrc` and an `engines` floor

**Task:** Pin the maintainer/publish Node version and declare a supported floor.

- Add `.nvmrc` at the repo root containing `24`.
- Add to `package.json`:
  ```json
  "engines": {
    "node": ">=24.0.0"
  }
  ```

Node 24 is a **management mandate** — it applies to consumers as well as maintainers, not just the
build toolchain. Set the floor to `>=24.0.0` (matching the `.nvmrc` pin) so both `npm install` in
downstream repos and the local build/publish flow enforce the same baseline. Consider also adding
`"engine-strict=true"` to an `.npmrc` if the mandate requires the floor to hard-fail installs rather
than warn — flag that with the team and note the decision in History.

**Files:**
- `.nvmrc` *(new)*
- `package.json` — add `engines`

**Acceptance Criteria:** AC 1

**History:**

---

## Task 3: [ ] Make the `postversion` copy cross-platform

**Task:** `postversion` currently runs `cp -f package.json dist`, which relies on a Unix `cp` and
fails in native Windows shells (`cmd`/PowerShell), breaking the release flow on a Windows publish
machine. Replace it with a cross-platform copy.

Preferred: add `shx` as a devDependency and use it (matches the granite-ui approach):
```json
"postversion": "shx cp -f package.json dist"
```
Alternative with zero new deps — a tiny Node one-liner:
```json
"postversion": "node -e \"require('fs').copyFileSync('package.json','dist/package.json')\""
```

Pick one; if adding `shx`, list it in `devDependencies`.

**Files:**
- `package.json` — `scripts.postversion` (and `devDependencies` if `shx` is added)

**Acceptance Criteria:** AC 1

**History:**

---

# Phase 1 — Build toolchain upgrade (Rollup 1 → 4)

## Task 4: [ ] Upgrade Rollup and Babel plugins

**Task:** Rollup 1.31 is years out of support and has Node 24 incompatibilities. Upgrade to Rollup 4
and swap the deprecated `rollup-plugin-babel` for the maintained scoped package.

```
npm install --save-dev rollup@^4 @rollup/plugin-babel@^6 @rollup/plugin-json@^6
npm uninstall rollup-plugin-babel
```

Notes:
- `@rollup/plugin-babel` v6 requires an explicit `babelHelpers` option (use `'bundled'` for a
  self-contained library bundle) — set in Task 5.
- `@rollup/plugin-json` bumps from v4 to v6 (Rollup 4 compatible).
- `chalk` is used by `build.js` for a status log. `chalk@3` is CJS and works under Node 24; if it
  causes ESM/CJS friction after the config rewrite, pin `chalk@^4` (last CJS major) or drop it for a
  plain `console.log`.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 3

**History:**

---

## Task 5: [ ] Rewrite the build for Rollup 4 and dual ESM + CJS output

**Task:** Update `build.js` for Rollup 4's API and emit **two** builds — ESM and CJS — plus keep a
UMD build for backward compatibility. The current script uses `output.dir` with `name: "index.js"`
(the UMD global name set, incorrectly, to a non-identifier) and emits UMD only.

Target output layout in `dist/`:
| File | Format | Purpose |
|------|--------|---------|
| `dist/index.cjs` | `cjs` | `require()` / `main` |
| `dist/index.mjs` | `esm` | `import` / `module` |
| `dist/index.umd.js` | `umd` | legacy `<script>` / CDN (optional but cheap to keep) |

Use a single Rollup run with an `output` array (or a config-array export). Set the UMD `name` to a
valid identifier such as `barcodeGenerator`. Set `@rollup/plugin-babel` with
`babelHelpers: 'bundled'` and its Babel options inline (see Task 7 — pass `babelrc: false`,
`configFile: false`, and the presets directly so the build does not depend on any external file).

For ESM output, ensure Babel does **not** down-transpile ES module syntax to CommonJS — set
`modules: false` on `@babel/preset-env` (Task 7 covers the preset config), otherwise Rollup can't
tree-shake and the `.mjs` will contain `require` calls.

> **CJS interop gotcha — this is the most likely place Phase 1 breaks.** `build.js` uses
> `require(...)` (CommonJS). The old `rollup-plugin-babel` returned the plugin function as the
> module's direct export, so `var babel = require("rollup-plugin-babel"); babel()` worked. The
> scoped **`@rollup/plugin-babel@6`** (and **`@rollup/plugin-json@6`**) instead expose the plugin as
> a **named `default` export**, so `require("@rollup/plugin-babel")` returns a namespace object, not
> a callable — `babel()` throws `TypeError: babel is not a function`. Destructure the default when
> requiring:
> ```js
> const { babel } = require("@rollup/plugin-babel");
> const json = require("@rollup/plugin-json"); // json's default-vs-namespace shape differs by version — verify which is callable
> ```
> Verify each plugin import is actually callable after the upgrade. If the interop stays fragile,
> convert `build.js` to ESM (`rollup.config.mjs` / `import`) instead, which sidesteps the CJS default
> unwrapping entirely.

**Files:**
- `build.js`
- (optionally) a new `rollup.config.mjs` if you prefer config-file style over the imperative
  `rollup.rollup(...)` call — either is acceptable; keep whichever `npm run build` invokes.

**Acceptance Criteria:** AC 3, AC 4

**History:**

---

## Task 6: [ ] Fix the `svgMap.json` generation so the build bundles the fresh map

**Task:** `process.js` writes `./svgMap.json` (repo root), but `src/index.js` imports the map
resolved relative to `src/` (i.e. `src/svgMap.json`). The build therefore bundles a stale,
hand-committed `src/svgMap.json` and silently ignores the freshly generated root copy. Two
near-duplicate maps are committed today (currently byte-identical, so consolidating is safe).

Fix by making `process.js` write to the single location that `src/index.js` imports, and remove the
redundant copy:
1. Change `process.js` to `fs.writeFileSync('src/svgMap.json', ...)` (or update `src/index.js`'s
   import to point at a single canonical location — pick one and be consistent).
2. Delete the now-unused duplicate map file from the repo root.
3. Confirm `process.js` reads `STAR.svg` and produces the `*` key (depends on Task 1).
4. Re-run `node process.js` and confirm the committed `src/svgMap.json` reproduces from the SVGs.
   The map is built by iterating `fs.readdir`, whose order is filesystem-dependent, so a fresh run
   may reorder keys even when the glyph data is identical — treat semantic equality (same keys, same
   glyph/viewBox data), not byte-identity, as the bar. Commit the freshly generated map so the
   committed copy matches what the build produces.

**Files:**
- `process.js`
- `src/svgMap.json` (regenerated), `svgMap.json` (deleted)
- possibly `src/index.js` (import path)

**Acceptance Criteria:** AC 3, AC 4

**History:**

---

## Task 7: [ ] Decouple the library Babel config from the demo-site (remove the shared root `.babelrc`)

**Task:** The root `.babelrc` is `{ "presets": ["@babel/preset-env"] }` with no targets, so Babel
transpiles to a broad default and rewrites ES modules to CJS (which breaks the ESM build). It is also
a shared-config landmine: once 000002 moves the demo-site to Parcel 2, Parcel reads this same root
config. Parcel bypasses a `.babelrc` that has only standard presets, but as soon as
`@babel/preset-env` carries custom options (`modules: false` / `targets`) Parcel uses it and it
overrides Parcel's default JSX handling — and this config has no `@babel/preset-react`, so the
demo-site's JSX would break.

Resolve both problems by removing the shared file and making the library's Babel config live inline
in the Rollup build (chosen approach — fully decouples the two builds and keeps the demo-site on
Parcel's fast SWC path):

1. **Delete the root `.babelrc`.**
2. In `build.js` (Task 5), configure `@rollup/plugin-babel` inline so it ignores any external Babel
   file and self-describes the library targets:
   ```js
   babel({
     babelHelpers: "bundled",
     babelrc: false,
     configFile: false,
     presets: [
       ["@babel/preset-env", { targets: { node: "20", esmodules: true }, modules: false }]
     ]
   })
   ```
   `modules: false` lets Rollup handle module syntax (required for a clean `.mjs`).
3. Confirm the demo-site build (000002) now has **no** ancestor Babel config and relies on Parcel's
   built-in SWC transform for JSX + env — no `@babel/preset-react` needed.

Keep `@babel/core` and `@babel/preset-env` current (`^7` latest) — bump if needed for Node 24.

> Alternative considered: keep a `.babelrc` but relocate it to `src/` so it only applies to library
> source (Parcel building the sibling `demo-site/` never sees it). Rejected in favor of the inline
> approach for explicitness — no reliance on Babel's config file-walking — but it is a valid
> fallback if a `.babelrc` file is preferred.

**Files:**
- `.babelrc` *(deleted)*
- `build.js` (inline Babel config — coordinate with Task 5)
- `package.json` (if `@babel/*` versions are bumped)

**Acceptance Criteria:** AC 3, AC 4

**History:**

---

# Phase 2 — Module output modernization (React 19 consumption)

## Task 8: [ ] Add `exports`, `module`, `types`, `files`, and `sideEffects`

**Task:** Wire the dual build from Phase 1 into `package.json` so modern bundlers resolve the right
format. Keep `main` pointing at the CJS build for backward compatibility.

```json
{
  "main": "index.cjs",
  "module": "index.mjs",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.mjs",
      "require": "./index.cjs",
      "default": "./index.cjs"
    }
  },
  "sideEffects": false,
  "files": ["index.cjs", "index.mjs", "index.umd.js", "index.d.ts"]
}
```

**Important — paths are relative to the publish root.** `np` publishes from `dist/` (`np.contents:
"dist"`) and `postversion` copies `package.json` into `dist/`. So these paths must be correct **as
seen from inside `dist/`** (hence `index.cjs`, not `dist/index.cjs`). Verify against the actual
publish tarball in Task 16. `sideEffects: false` is safe — the module only defines and exports a
pure function.

**Files:**
- `package.json`

**Acceptance Criteria:** AC 4, AC 6

**History:**

---

## Task 9: [ ] Add a TypeScript declaration for the default export

**Task:** The library is plain JS, so TypeScript consumers (the common case in React 19 apps) get no
types. Hand-write a small declaration and ship it in the publish root.

Create `src/index.d.ts` and ensure the build copies it into `dist/` (extend the build/copy step, or
emit it alongside the bundles):

```ts
export interface BarcodeOptions {
  /** Spacing between characters, relative to the SVG viewBox. Default 5. */
  spacing?: number;
  /** Return raw SVG markup instead of a base64 data URL. Default false. */
  raw?: boolean;
  /** viewBox height of the resulting SVG. Defaults to the first character's viewBox height. */
  height?: number;
}

/** Generate a Code 39 barcode as a base64 SVG data URL, or raw SVG when `raw` is true. */
export default function generateBarcode(value?: string, opts?: BarcodeOptions): string;
```

Confirm the option names/defaults match [src/index.js](../../../../src/index.js) (`spacing` default
5, `raw` default false, `height` default from the first character's viewBox height).

**Files:**
- `src/index.d.ts` *(new)*
- `build.js` or `package.json` (ensure `index.d.ts` lands in `dist/`)

**Acceptance Criteria:** AC 5

**History:**

---

## Task 10: [ ] Verify consumption in a React 19 sandbox (ESM and CJS)

**Task:** Prove the published shape works for a React 19 consumer. Build the package
(`npm run build`), then create a throwaway sandbox **outside** this repo and install the local build
via `npm pack` + install of the tarball (which exercises the real published `files`/`exports`, not a
symlink).

1. `npm pack` in this repo → produces `tecuity-barcode-generator-1.3.0.tgz`.
2. In a scratch Vite + React 19 app: `npm install /path/to/that.tgz`.
3. ESM check — in a component:
   ```jsx
   import generateBarcode from '@tecuity/barcode-generator';
   const src = generateBarcode('1234567');
   // renders <img src={src} /> — barcode shows
   ```
   Confirm `src` starts with `data:image/svg+xml;base64,` and the `<img>` renders.
4. CJS check — a Node script: `const g = require('@tecuity/barcode-generator'); console.log(g('ABC', {raw:true}));`
   Confirm it returns raw SVG.
5. TypeScript check — confirm the editor resolves the `generateBarcode` type and `BarcodeOptions`.

Verification only — no code change unless a defect surfaces (fix it in the relevant Phase 1/2 task
and note it here).

**Files:** None — verification only

**Acceptance Criteria:** AC 6

**History:**

---

# Phase 3 — Real test suite (Vitest)

## Task 11: [ ] Add Vitest and replace the placeholder test

**Task:** [index.test.js](../../../../index.test.js) is a single `console.log` against `dist/index`
and asserts nothing. Replace it with a real Vitest suite that tests the source directly (so tests
don't require a prior build).

```
npm install --save-dev vitest@^3
```

Add scripts:
```json
"test": "vitest",
"test:ci": "vitest run"
```

Create `src/index.test.js` (or `test/index.test.js`) importing the source and asserting behavior:
- Default call returns a string starting with `data:image/svg+xml;base64,`.
- `{ raw: true }` returns a string starting with `<svg` and containing `viewBox`.
- The output is wrapped with the Code 39 start/stop `*` guard (decode the base64 or inspect raw SVG
  — the first and last glyphs correspond to the `*` map entry).
- `spacing` changes the computed total width; `height` sets the viewBox height.
- Characters not present in the map are filtered out (e.g. lowercase/unsupported input) without
  throwing.
- Empty input still returns a valid `*`-wrapped SVG.

Because Vitest is ESM-native, confirm it runs the source under Node 24 with no Babel config needed
(and note that Task 7 removed the root `.babelrc`, so nothing should reintroduce one). Vitest
supports JSON imports out of the box, so `import ... from './svgMap.json'` should just work.

Document here the intentional divergence from the `granite-ui` Jest convention (see Developer Notes).

**Files:**
- `package.json`, `package-lock.json`
- `src/index.test.js` *(new)*; delete the old root `index.test.js`

**Acceptance Criteria:** AC 7

**History:**

---

## Task 12: [ ] Gate releases on the test suite

**Task:** With a real suite in place, stop skipping tests on release. Update the `np` config in
`package.json`:

```json
"np": {
  "contents": "dist",
  "testScript": "test:ci"
}
```

Remove `"tests": false`. Confirm `npx np --preview` reports that it will run `test:ci`.

**Files:**
- `package.json`

**Acceptance Criteria:** AC 7, AC 9

**History:**

---

# Phase 4 — Prune library devDependencies

## Task 13: [ ] Remove stale library-toolchain devDependencies

**Task:** The `devDependencies` block carries a stale ESLint 6 stack that no npm script uses.
Prune the library-side dead weight (the demo-site's React / Emotion / Parcel dependency changes,
including removing the duplicate `parcel-bundler@1`, are handled in
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md)):

- **Remove `rollup-plugin-babel`** (replaced in Task 4) and confirm no other stale Rollup 1
  plugins remain.
- **Remove the stale ESLint 6 stack** unless the team actively lints: `eslint@6.x`,
  `@typescript-eslint/eslint-plugin@2.x`, `@typescript-eslint/parser@2.x`, `babel-eslint`,
  `eslint-config-react-app@5`, `eslint-plugin-flowtype@3.x`, `eslint-plugin-import`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react@7`, `eslint-plugin-react-hooks@1.x`. There is no
  `lint` script and no `.eslintrc` rule config beyond a bare extends — this stack is unused by any
  npm script. If linting is desired, that's a separate follow-up with a modern flat-config ESLint,
  not these pinned-ancient versions.

Keep: `@babel/core`, `@babel/preset-env`, `rollup@4`, `@rollup/plugin-babel`, `@rollup/plugin-json`,
`chalk` (or drop per Task 4), `vitest`, `np`, `shx` (if chosen in Task 3). Do a dependency-usage pass
(`git grep` each package name across `src/`, `*.js` config) before removing, and record what was
confirmed unused in History.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 8

**History:**

---

## Task 14: [ ] Upgrade `np` for Node 24

**Task:** Ensure the release tool runs on Node 24. Bump to the current major:

```
npm install --save-dev np@^10
```

Confirm `npx np --version` prints `10.x`. (Matches the version used by the granite-ui upgrade.)

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 3, AC 9

**History:**

---

# Phase 5 — Final verification and publish

## Task 15: [ ] Clean install and build on Node 24

**Task:** From a Node 24 environment (`node -v` → `v24.x`, matching `.nvmrc`; `nvm use 24` if
needed), verify a clean build:

```powershell
node -v            # confirm v24.x
Remove-Item -Recurse -Force node_modules, dist -ErrorAction SilentlyContinue
npm install
npm run build
npm run test:ci
```

Confirm `dist/` contains `index.cjs`, `index.mjs`, `index.umd.js`, and `index.d.ts`, and that the
build/test run with no errors or warnings.

**Files:** None — verification only

**Acceptance Criteria:** AC 1, AC 3, AC 4, AC 7

**History:**

---

## Task 16: [ ] Inspect the publish tarball

**Task:** Confirm the package that will actually be published is correct **before** publishing.
Because `np` publishes from `dist/` with a copied `package.json`, verify the paths resolve from the
publish root.

Replicate the `np` flow: build, copy `package.json` into `dist/`, then `cd dist && npm pack
--dry-run`. Confirm the tarball contains the four `dist` files and that `main`/`module`/`types`/
`exports` paths point at files present in the tarball (no `dist/` prefix inside the tarball). Fix any
path mismatch back in Task 8.

**Files:** None — verification only

**Acceptance Criteria:** AC 6, AC 9

**History:**

---

## Task 17: [ ] Publish 1.3.0

**Task:** With everything green on Node 24, cut the release. **Preconditions:** the preparation
branch has been merged to `master` and you are releasing from `master`; `nvm use 24` is active; and
`npm login` (with `@tecuity` publish rights) has been completed — an OTP prompt is expected. `np`
handles the version bump, git tag, and publish; `np.testScript` (Task 12) gates on `test:ci`.

```
npx np minor        # 1.2.1 → 1.3.0
```

If `np`'s interactive prompts are undesirable in the environment, use `npm version minor` +
`npm publish` from `dist/` as a fallback (ensuring `postversion` copied `package.json` into `dist/`).
If a release must be cut from a non-default branch for any reason, `np` requires `--any-branch`;
otherwise it refuses to publish off `master`. After publishing:

```
npm view @tecuity/barcode-generator version   # → 1.3.0
```

Then install `@tecuity/barcode-generator@1.3.0` fresh in the React 19 sandbox from Task 10 and
confirm it resolves and renders — this validates the real published artifact, not a local build.

**Files:**
- `package.json` (version bump via `np`)

**Acceptance Criteria:** AC 9

**History:**
