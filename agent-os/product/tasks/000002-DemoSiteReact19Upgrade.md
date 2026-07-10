# 000002-DemoSiteReact19Upgrade - Tasks

## Braden Steiner - Last Modified: 2026-07-09

## Story Description

Upgrade the `barcode-generator` **demo-site** — the GitHub Pages marketing page in
[demo-site/](../../../../demo-site/), built into [docs/](../../../../docs/) — from React 16 to
React 19, along with its Emotion 10 → 11 and Parcel 1 → 2 toolchain. The demo-site is **not** part
of the published npm package; it is a standalone single-page app that imports the built library and
lets a visitor type a value and see the generated barcode.

This work is independent of the package modernization in
[000001-Node24PublishModernization.md](./000001-Node24PublishModernization.md) and can proceed in
parallel — with two couplings: (1) the demo-site imports the library's built `dist` output
directly, and 000001 renames those output files (see Task 3); (2) both builds historically shared
the repo-root `.babelrc`, which 000001 Task 7 removes so the demo-site's Parcel 2 build uses its
own SWC transform (see the Developer Notes).

**Starting state (as of this task file):**
- `demo-site/index.js` uses React 16 (`ReactDOM.render`), `@emotion/styled@10`, and a deprecated
  `e.keyCode === 13` Enter check.
- `demo-site/Tape.js` imports `keyframes`/`css` from `@emotion/core` (Emotion v10 package name).
- `devDependencies` pin `react@^16.12.0`, `react-dom@^16.12.0`, `@emotion/core@^10.0.27`,
  `@emotion/styled@^10.0.27`, and **both** `parcel@^2.0.0-beta.1` and `parcel-bundler@^1.12.4`
  (the latter is dead — Parcel 1, superseded).
- The repo-root `.babelrc` is `{ "presets": ["@babel/preset-env"] }` — no `@babel/preset-react`.
  Under Parcel 1 this was fine (Parcel 1 added JSX support itself); under Parcel 2 it is a hazard
  (see Developer Notes). 000001 Task 7 deletes it.
- The `start-site`/`build-site` scripts use **Parcel 1** CLI flags (`--out-dir`), which don't match
  the installed Parcel 2 beta.
- `demo-site/index.js` imports the library as `import generateBarcode from "../dist/index.js"`.

## Acceptance Criteria

1. `devDependencies` put the demo-site on React 19 (`react`/`react-dom` `^19`), Emotion 11
   (`@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1`; `@emotion/core` removed), and a stable
   Parcel 2 (`parcel@^2`); the duplicate `parcel-bundler@1` is removed.
2. Demo-site source uses `createRoot` (no `ReactDOM.render`), imports Emotion from `@emotion/react`
   (no `@emotion/core`), and uses `e.key === "Enter"` (no `keyCode`).
3. `npm run start-site` serves the demo; typing a value and clicking GO renders a barcode.
4. `npm run build-site` completes on Parcel 2 and regenerates the `docs/` GitHub Pages bundle.

## Developer Notes

**Not published — safe to iterate.** Nothing here ships in the npm tarball (`np.contents: "dist"`),
so demo-site changes can't regress consumers. The only risk surface is the GitHub Pages site.

**Coupling to 000001 — the `dist` import path.** `demo-site/index.js` imports
`../dist/index.js`. Package modernization (000001 Task 5) renames the build outputs to
`dist/index.cjs` / `dist/index.mjs` / `dist/index.umd.js`, so `../dist/index.js` will no longer
exist. Task 3 below updates the import to the ESM build (`../dist/index.mjs`) or, cleaner, imports
the package by name and lets Parcel resolve `exports`. Either way, the library must be built
(`npm run build`) before the site is built, since the site consumes `dist`. If 000001 has not landed
yet, keep importing `../dist/index.js` and defer the path change until it does — note which case
applied in History.

**Coupling to 000001 — the shared root `.babelrc`.** The repo-root `.babelrc` is read by both the
library's Rollup build and (once on Parcel 2) the demo-site. Parcel 2 **bypasses** a `.babelrc`
that contains only standard presets and transforms JSX/env itself via SWC — but once
`@babel/preset-env` gains custom options like `modules: false` (which the library build needs),
Parcel uses the config and it **overrides** Parcel's default JSX handling. With no
`@babel/preset-react` in that config, the demo-site's JSX would break. 000001 Task 7 removes the
root `.babelrc` (moving the library's Babel options inline into Rollup), which leaves the demo-site
cleanly on Parcel's SWC path. **If 000001 Task 7 has not landed when the demo-site moves to Parcel
2, expect JSX build errors** — either land Task 7 first, or add a demo-site-scoped Babel config with
`@babel/preset-react`. Confirmed against Parcel 2 docs: a bare `@babel/preset-env`-only config is
reported as redundant and ignored; a config with custom preset options is not.

**Emotion 11 + React 19 — verified compatible.** Current published `@emotion/react@11.14.0` and
`@emotion/styled@11.14.1` declare `react: ">=16.8.0"` as their peer, which **satisfies React 19** —
no `--legacy-peer-deps` is needed, and the ref-forwarding fix for React 19 shipped in 11.14+.
Emotion 11's known React 19 gaps are **type-level only** (full typed support lands in Emotion v12);
this demo-site is plain JS (`index.js`, `Tape.js`), so those type gaps don't apply. Pin the floors
at `@emotion/react@^11.14.0` / `@emotion/styled@^11.14.1` to lock in the React-19-safe versions.

**Emotion 11 + Parcel 2 `css` prop.** Emotion's `css` prop / `styled` under Parcel 2 typically needs
either the `@emotion/babel-plugin` or the automatic JSX runtime pointed at `@emotion/react`. This
repo uses `styled` (which works without extra config) and `css`/`keyframes` in `Tape.js`. Verify the
`css`/`keyframes` styling still renders after the upgrade; only add Babel/JSX-pragma config if it
visibly breaks, and keep any such config scoped to the demo-site so it does not affect the library's
Rollup build (and does not reintroduce a root `.babelrc`).

---

## Task 1: [ ] Bump demo-site React, Emotion, and Parcel versions

**Task:** Move the demo-site off React 16 / Emotion 10 / Parcel 1.

- `react`: `^16.12.0` → `^19`
- `react-dom`: `^16.12.0` → `^19`
- Replace `@emotion/core@^10` with `@emotion/react@^11.14.0`; bump `@emotion/styled@^10` →
  `^11.14.1` (these are the versions whose peer `react: ">=16.8.0"` covers React 19 and include the
  React-19 ref-forwarding fix — see Developer Notes).
- Pin a stable `parcel@^2`; **remove `parcel-bundler@^1.12.4`** (dead Parcel 1 duplicate).

```
npm install --save-dev react@^19 react-dom@^19 @emotion/react@^11.14.0 @emotion/styled@^11.14.1 parcel@^2
npm uninstall @emotion/core parcel-bundler
```

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 1

**History:**

---

## Task 2: [ ] Update demo-site source for React 19 and Emotion 11

**Task:** Apply the code changes React 19 / Emotion 11 require:

- **`demo-site/index.js:184`** — `ReactDOM.render(<App />, document.getElementById("root"))` is
  removed in React 19. Replace with:
  ```js
  import { createRoot } from "react-dom/client";
  createRoot(document.getElementById("root")).render(<App />);
  ```
  Remove the now-unused `import ReactDOM from "react-dom"`.
- **`demo-site/index.js:32`** — `if (e.keyCode === 13)` uses the deprecated `keyCode`. Replace with
  `if (e.key === "Enter")`.
- **`demo-site/Tape.js:3`** — `import { keyframes, css } from "@emotion/core"` →
  `import { keyframes, css } from "@emotion/react"`.
- Grep the whole `demo-site/` tree for any remaining `@emotion/core`, `ReactDOM.render`, or `keyCode`
  usages and update them.

**Files:**
- `demo-site/index.js`
- `demo-site/Tape.js`
- any other `demo-site/*.js` files surfaced by the grep

**Acceptance Criteria:** AC 2

**History:**

---

## Task 3: [ ] Fix the `dist` import path for the modernized build

**Task:** `demo-site/index.js` imports `import generateBarcode from "../dist/index.js"`. Once 000001
Task 5 renames the build outputs, `../dist/index.js` no longer exists.

Update the import to the ESM build:
```js
import generateBarcode from "../dist/index.mjs";
```
Or, preferred, import the package by name so Parcel resolves the `exports` map (matches how a real
consumer imports it):
```js
import generateBarcode from "@tecuity/barcode-generator";
```
If importing by name, confirm Parcel resolves the local package (it will if the demo-site is inside
the same package and `exports` is set) or add a small alias.

Build the library first (`npm run build`) so `dist` exists before serving/building the site.

> If 000001 has not landed when this task is done, leave the import at `../dist/index.js` and record
> that in History; revisit once the modernized build is merged.

**Files:**
- `demo-site/index.js`

**Acceptance Criteria:** AC 3, AC 4

**History:**

---

## Task 4: [ ] Update the Parcel 2 site scripts

**Task:** The `start-site`/`build-site` scripts use Parcel 1 CLI flags. Update to Parcel 2 syntax
(`--out-dir` → `--dist-dir`; `--public-url` is still supported in v2 — confirm against the installed
version):

```json
"start-site": "parcel demo-site/index.html --dist-dir site-dist",
"build-site": "parcel build demo-site/index.html --dist-dir docs --public-url https://tecuity.github.io/barcode-generator/"
```

Parcel 2 auto-detects Babel config. If the Emotion `css`/`keyframes` styling in `Tape.js` stops
rendering, add `@emotion/babel-plugin` (or the `@emotion/react` automatic JSX runtime) scoped to the
demo-site — see Developer Notes.

**Files:**
- `package.json`
- possibly a scoped Babel/Parcel config for the demo-site (only if the `css` prop breaks)

**Acceptance Criteria:** AC 3, AC 4

**History:**

---

## Task 5: [ ] Verify the demo runs and rebuild `docs/`

**Task:** End-to-end verification:

1. `npm run build` (library) so `dist` is present.
2. `npm run start-site` — open the served page, type a value, click GO, confirm a barcode renders
   and the `Tape` animation/styling looks correct.
3. `npm run build-site` — confirm Parcel 2 builds with no errors and regenerates `docs/`.
4. Spot-check the built `docs/index.html` opens and renders (it references hashed asset bundles;
   confirm the new bundles are present and the old React 16 bundles are gone).

Commit the regenerated `docs/` bundle as part of this task (GitHub Pages serves from `docs/`).

**Files:**
- `docs/**` — regenerated build output

**Acceptance Criteria:** AC 3, AC 4

**History:**
