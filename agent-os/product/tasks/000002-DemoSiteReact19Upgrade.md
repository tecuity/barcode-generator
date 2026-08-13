# 000002-DemoSiteReact19Upgrade - Tasks

## Braden Steiner - Last Modified: 2026-08-13

## Story Description

Upgrade the `barcode-generator` **demo-site** — the GitHub Pages marketing page in
[demo-site/](../../../../demo-site/), built into [docs/](../../../../docs/) — from React 16 to
React 19, along with its Emotion 10 → 11 and Parcel 1 → 2 toolchain. The demo-site is **not** part
of the published npm package; it is a standalone single-page app that imports the built library and
lets a visitor type a value and see the generated barcode.

**Do all of [000001-Node24PublishModernization.md](./000001-Node24PublishModernization.md) first.**
This story is sequenced after 000001 in full — do not start it in parallel. Three separate couplings
make the demo-site depend on the modernized library:

1. **The `dist` import path.** The demo-site imports the library's built output directly, and 000001
   Task 5 renames those files (see Task 3 below).
2. **The `Buffer` global.** The library base64-encodes with a Node-only `Buffer` call that Parcel 1
   silently polyfilled; Parcel 2 does not, so `build-site` fails until 000001 Task 9.5 replaces it
   (see the Developer Notes).
3. **The shared root `.babelrc`.** Both builds historically read it; 000001 Task 7 removes it so the
   demo-site's Parcel 2 build uses its own SWC transform (see the Developer Notes).

Because 000001 lands first, none of these are conditional — every prerequisite is simply already in
place when this story starts.

**Starting state (as of this task file):**
- `demo-site/index.js` uses React 16 (`ReactDOM.render`), `@emotion/styled@10`, and a deprecated
  `e.keyCode === 13` Enter check.
- `demo-site/Tape.js` imports `keyframes`/`css` from `@emotion/core` (Emotion v10 package name).
- `devDependencies` pin `react@^16.12.0`, `react-dom@^16.12.0`, `@emotion/core@^10.0.27`,
  `@emotion/styled@^10.0.27`, and `parcel@^2.0.0-beta.1`.
- **`parcel-bundler@^1.12.4` is already gone** — removed early, on 2026-08-13, by 000001 Task 13
  rather than by Task 1 here. It had to go before 000001 could install anything: `parcel-bundler@1`
  depends on `deasync`, whose postinstall spawns `node-gyp.cmd` without `shell: true`, which Node ≥20.12
  on Windows rejects with `spawn EINVAL` — failing `npm install` outright on Node 24. Task 1 below is
  amended accordingly; nothing else about it changes.
- The repo-root `.babelrc` is `{ "presets": ["@babel/preset-env"] }` — no `@babel/preset-react`.
  Under Parcel 1 this was fine (Parcel 1 added JSX support itself); under Parcel 2 it is a hazard
  (see Developer Notes). 000001 Task 7 deletes it.
- The `start-site`/`build-site` scripts use **Parcel 1** CLI flags (`--out-dir`), which don't match
  the installed Parcel 2 beta.
- `demo-site/index.js` imports the library as `import generateBarcode from "../dist/index.js"`.

## Acceptance Criteria

1. `devDependencies` put the demo-site on React 19 (`react`/`react-dom` `^19`), Emotion 11
   (`@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1`; `@emotion/core` removed), and a stable
   Parcel 2 (`parcel@^2`); the duplicate `parcel-bundler@1` is removed. (The `parcel-bundler@1`
   half is **already satisfied** — 000001 Task 13 removed it on 2026-08-13; just verify it is still
   absent rather than re-running an uninstall.)
2. Demo-site source uses `createRoot` (no `ReactDOM.render`), imports Emotion from `@emotion/react`
   (no `@emotion/core`), and uses `e.key === "Enter"` (no `keyCode`).
3. `npm run start-site` serves the demo; typing a value and clicking GO renders a barcode.
4. `npm run build-site` completes on Parcel 2 and regenerates the `docs/` GitHub Pages bundle.
5. After `npm run build-site`, `docs/` contains exactly one JS bundle, one CSS bundle, `index.html`,
   the font and logo assets, and `social.png` — no React 16-era bundles remain. (Parcel 2 does not
   clean its output directory, and `social.png` is referenced by absolute URL so Parcel never emits
   it; both are handled by the `build-site` script in Task 4.)
6. The root `README.md` describes the package as it exists after 000001: it states the Node 24
   requirement, shows both the ESM and CJS consumption forms served by the `exports` map, notes that
   TypeScript declarations ship with the package, and contains no claim contradicted by the
   modernized build. The API reference table still matches `src/index.d.ts`, and the
   `ALL-CONTRIBUTORS-LIST` block is untouched.
7. `README.md` carries a `## Development` section documenting every npm script a maintainer runs —
   build, test, demo-site, and the three release commands from 000001 Task 14.5 (`pack:preview`,
   `release:preview`, `release`) — and each documented command matches the actual `scripts` block in
   `package.json`.

## Developer Notes

**Not published — safe to iterate.** Nothing here ships in the npm tarball (`np.contents: "dist"`),
so demo-site changes can't regress consumers. The only risk surface is the GitHub Pages site.

**Coupling to 000001 — the `dist` import path.** `demo-site/index.js` imports
`../dist/index.js`. Package modernization (000001 Task 5) renames the build outputs to
`dist/index.cjs` / `dist/index.mjs` / `dist/index.umd.js`, so `../dist/index.js` no longer exists by
the time this story starts. Task 3 below updates the import to `../dist/index.mjs`. Importing the
package by name instead is **not** an option: self-reference resolves against the repo-root
`package.json`, whose `exports` targets are correct only from inside the `dist/` publish root. The
library must also be built (`npm run build`) before the site is served or built, since the site
consumes `dist/` and `dist` is gitignored.

**Coupling to 000001 — `Buffer` is not available under Parcel 2.** The library encodes with
`Buffer.from(svg).toString("base64")` at [src/index.js:5](../../../../src/index.js#L5). `Buffer` is a
Node-only global; the demo-site works today **only** because Parcel 1 auto-injected a polyfill — the
committed `docs/demo-site.51f96e0f.js` contains one (`base64-js`, `isBuffer`, 43 `Buffer`
references). Parcel 2 does not do this for free: it resolves `Buffer` to the `buffer` package and
errors if that package is not installed, which it is not. **000001 Task 9.5 fixes this at the source**
by replacing the encoder with a single `TextEncoder` + `btoa` path. Since all of 000001 lands before
this story, the fix is already in place — do not install the `buffer` package as a workaround, as
that would leak a runtime dependency into the library's own resolution graph.

**Coupling to 000001 — the shared root `.babelrc`.** The repo-root `.babelrc` is read by both the
library's Rollup build and (once on Parcel 2) the demo-site. Parcel 2 **bypasses** a `.babelrc`
that contains only standard presets and transforms JSX/env itself via SWC — but once
`@babel/preset-env` gains custom options like `modules: false` (which the library build needs),
Parcel uses the config and it **overrides** Parcel's default JSX handling. With no
`@babel/preset-react` in that config, the demo-site's JSX would break. 000001 Task 7 removes the
root `.babelrc` (moving the library's Babel options inline into Rollup), which leaves the demo-site
cleanly on Parcel's SWC path. Since all of 000001 lands before this story, the root `.babelrc` is
already gone when the demo-site moves to Parcel 2 — there is no ancestor Babel config to contend
with and no `@babel/preset-react` is needed. Do not reintroduce a root `.babelrc`.

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

**Package manager: npm** (per 000001's decision — the repo standardizes on npm; the commands below
use `npm`). The `Files` lists reference `package-lock.json`; note the demo-site shares the single
repo-root `package.json`/lockfile with the library.

**Dependency versions — verified 2026-08-11 against the npm registry.** Nothing here is left for the
implementer to confirm:
- `@emotion/react@11.14.0` (peer `react: ">=16.8.0"`) and `@emotion/styled@11.14.1` (peers
  `react: ">=16.8.0"`, `@emotion/react: "^11.0.0-rc.0"`) — both are the current latest, and
  `>=16.8.0` satisfies React 19, so no `--legacy-peer-deps` is needed (Task 1).
- `parcel@2.16.4` (`engines.node: ">= 16.0.0"`) supports `--dist-dir` and `--public-url` (Task 4).
- The demo-site uses no `css` prop, so no Emotion Babel plugin or JSX-runtime config is required
  (Task 4).

The starting-state facts above were confirmed against the working tree: React 16 `ReactDOM.render` at
[demo-site/index.js:184](../../../../demo-site/index.js#L184), `e.keyCode === 13` at
[demo-site/index.js:32](../../../../demo-site/index.js#L32), `@emotion/core` at
[demo-site/Tape.js:3](../../../../demo-site/Tape.js#L3), and the Parcel-1 `--out-dir` flags.

---

## Task 1: [x] Bump demo-site React, Emotion, and Parcel versions

**Task:** Move the demo-site off React 16 / Emotion 10 / Parcel 1.

- `react`: `^16.12.0` → `^19`
- `react-dom`: `^16.12.0` → `^19`
- Replace `@emotion/core@^10` with `@emotion/react@^11.14.0`; bump `@emotion/styled@^10` →
  `^11.14.1` (these are the versions whose peer `react: ">=16.8.0"` covers React 19 and include the
  React-19 ref-forwarding fix — see Developer Notes).
- Pin a stable `parcel@^2`. **`parcel-bundler@^1.12.4` needs no action here** — 000001 Task 13 already
  removed it (see Starting state). Confirm it is absent from `package.json`; do not re-run an uninstall
  for it.

```
npm install --save-dev react@^19 react-dom@^19 @emotion/react@^11.14.0 @emotion/styled@^11.14.1 parcel@^2
npm uninstall @emotion/core
```

> **Lockfile.** 000001 Task 15 already removed `yarn.lock` and committed `package-lock.json`, so this
> `npm install` updates an existing lockfile rather than creating one. Commit the updated
> `package-lock.json` with this task.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 1

**History:**
- 2026-08-13 — Completed. Ran the two specified commands on Node v24.16.0 / npm 11.13.0.
  `package.json` `devDependencies` now carry `react@^19.2.8`, `react-dom@^19.2.8`,
  `@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1` and `parcel@^2.16.4`; `@emotion/core` is gone
  and `parcel-bundler` was confirmed still absent (grep of `package.json` returns zero matches) — no
  uninstall re-run, per the amended scope. The install resolved cleanly with **no `ERESOLVE` and no
  `--legacy-peer-deps`**, confirming the Developer Notes' finding that Emotion 11.14's
  `react: ">=16.8.0"` peer satisfies React 19. Net tree change: +115 / −598 / 17 more removed with
  `@emotion/core`. `package-lock.json` updated in place (it already existed from 000001 Task 15).
- 2026-08-13 — `npm audit` baseline re-measured per the note below, and the expectation held:
  **138 → 26 findings** (6 low, 7 moderate, 8 high, 5 critical), i.e. the 2020-era
  `parcel@^2.0.0-beta.1` accounted for ~112 of them. None of the 26 that remain trace to the
  demo-site stack — the roots are `all-contributors-cli`, `np`, `@babel/core`/`@babel/helpers` (still
  pinned at 7.8.4 by 000001 Task 7's finding), and their transitive `ajv`/`lodash`/`minimist`/`qs`/
  `y18n`/`yargs` chains. Nothing was auto-fixed; `npm audit fix` was deliberately not run, as it is
  outside this task's scope.
- 2026-08-13 — Scope reduced: `parcel-bundler` dropped from this task's uninstall list because 000001
  Task 13 already removed it, so the command is now `npm uninstall @emotion/core`. This was not a
  preference — `parcel-bundler@1.12.4` depends on `deasync@^0.1.14`, whose `install` script
  (`node ./build.js`) spawns `node-gyp.cmd` through `child_process.spawn` **without** `shell: true`;
  Node ≥20.12 on Windows rejects that with `spawn EINVAL`, which failed the entire `npm install` on
  Node 24 (reproduced on Node v24.16.0 / npm 11.13.0) and blocked 000001's whole dependency
  transaction. Isolation-tested as the only blocker: a probe install of the full target dependency set
  minus `parcel-bundler` exited 0 with no `ERESOLVE`/`EBADENGINE`. Approved by Braden on 2026-08-13.
  Everything else this task owns was deliberately left alone for it: `@emotion/core@^10.0.27`,
  `@emotion/styled@^10.0.27`, `react@^16.12.0`, `react-dom@^16.12.0` and `parcel@^2.0.0-beta.1` are all
  still in `package.json`.
- 2026-08-13 — Note for whoever runs this task: the ~138 `npm audit` findings currently attributed to
  the demo-site stack (measured in 000001 Task 15's History) trace chiefly to the 2020-era
  `parcel@^2.0.0-beta.1` pinned above. Bumping it to a stable `parcel@^2` here is expected to clear
  most of them — worth re-running `npm audit` after this task to record the new baseline.

---

## Task 2: [x] Update demo-site source for React 19 and Emotion 11

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
These are the **only** occurrences in the repo — verified 2026-08-11 by grepping `demo-site/` for
`@emotion/core`, `ReactDOM.render`, and `keyCode`. `demo-site/GithubCorner.js` imports React but
needs no change. No further searching is required.

**Files:**
- `demo-site/index.js`
- `demo-site/Tape.js`

**Acceptance Criteria:** AC 2

**History:**
- 2026-08-13 — Completed. All three edits applied exactly as specified:
  [demo-site/index.js:2](../../../../demo-site/index.js#L2) swaps
  `import ReactDOM from "react-dom"` for `import { createRoot } from "react-dom/client"`;
  [demo-site/index.js:184](../../../../demo-site/index.js#L184) becomes
  `createRoot(document.getElementById("root")).render(<App />);`;
  [demo-site/index.js:32](../../../../demo-site/index.js#L32) becomes `if (e.key === "Enter")`; and
  [demo-site/Tape.js:3](../../../../demo-site/Tape.js#L3) now imports `keyframes`/`css` from
  `@emotion/react`. The task's "these are the only occurrences" claim held — a post-edit grep of
  `demo-site/` for `@emotion/core`, `ReactDOM`, and `keyCode` returns **zero** matches.
  `demo-site/GithubCorner.js` was read and left untouched as stated (it imports React only). No
  `@emotion/babel-plugin`, JSX pragma, or Babel config was added.

---

## Task 3: [x] Fix the `dist` import path for the modernized build

**Task:** All of 000001 has landed before this story starts, so `dist/index.mjs` exists and
`dist/index.js` does not. In [demo-site/index.js:4](../../../../demo-site/index.js#L4), change:
```js
import generateBarcode from "../dist/index.js";
```
to:
```js
import generateBarcode from "../dist/index.mjs";
```

Do **not** import the package by name (`@tecuity/barcode-generator`). Self-reference resolves against
the **repo-root** `package.json`, whose `exports` map (000001 Task 8) points at `./index.mjs` and
`./index.cjs` — paths that are correct only from inside the `dist/` publish root, where `np` publishes
after `postversion` copies `package.json` there. At the repo root those files do not exist and never
will (`.gitignore` contains a bare `dist` entry), so the import cannot resolve. The by-name path is
verified properly by 000001 Task 10, which installs a real `npm pack` tarball into a sandbox.

Run `npm run build` (library) before `npm run start-site` or `npm run build-site` — `dist/` is
gitignored and absent on a fresh clone.

**Files:**
- `demo-site/index.js`

**Acceptance Criteria:** AC 3, AC 4

**History:**
- 2026-08-11 — Research completed: resolved the "or, preferred, import the package by name" directive.
  Self-reference is not viable here — the root `exports` map's targets are dist-relative, so they
  resolve to non-existent root files. Fixed the import at `../dist/index.mjs` and replaced the
  "if 000001 has not landed" conditional with a hard prerequisite on 000001 Task 5.
- 2026-08-11 — Superseded by the story-level sequencing decision: all of 000001 now runs before this
  story, so the per-task prerequisite is redundant and the task simply states that `dist/index.mjs`
  already exists.

---

## Task 4: [x] Update the Parcel 2 site scripts

**Task:** The `start-site`/`build-site` scripts use Parcel 1 CLI flags. Verified 2026-08-11 against
`parcel@2.16.4` (`engines.node: ">= 16.0.0"`, which `npm install --save-dev parcel@^2` resolves to):
`--dist-dir` replaces Parcel 1's `--out-dir`, and `--public-url` is still supported. No flag
confirmation is needed at implementation time.

`build-site` must also clean `docs/` first and restore `social.png` afterward:

```json
"start-site": "parcel demo-site/index.html --dist-dir site-dist",
"build-site": "node -e \"require('fs').rmSync('docs',{recursive:true,force:true})\" && parcel build demo-site/index.html --dist-dir docs --public-url https://tecuity.github.io/barcode-generator/ && node -e \"require('fs').copyFileSync('demo-site/social.png','docs/social.png')\""
```

Both extra steps are required, for different reasons:
- **The clean** — Parcel 2 does not remove stale output. `docs/` currently holds two JS bundles
  (`demo-site.51f96e0f.js` and `demo-site.e9ff0f45.js`), and `docs/index.html` references only the
  first. Without the clean, React 16-era bundles accumulate and AC 5 fails.
- **The copy** — `demo-site/index.html` references `social.png` via `og:image`/`twitter:image` as an
  **absolute** URL, so Parcel treats it as external and never emits it. The clean would delete
  `docs/social.png` and the social preview would 404.

`node -e` is used rather than `shx` or `rimraf` — Node 24 is guaranteed by 000001's `engines.node`,
so `fs.rmSync`/`fs.copyFileSync` need no dependency (same decision as 000001 Task 3).

Do **not** add `@emotion/babel-plugin`, a JSX pragma, or any Babel/Parcel config. Verified
2026-08-11: the demo-site uses no `css` prop anywhere — [Tape.js](../../../../demo-site/Tape.js) uses
`css`/`keyframes` only as functions interpolated into `@emotion/styled` templates
([Tape.js:195-204](../../../../demo-site/Tape.js#L195-L204)), a pure-runtime path needing no
build-time plugin. `@emotion/babel-plugin` exists for the `css` prop, source maps, and readable class
names — none of which apply here.

**Files:**
- `package.json`
- `demo-site/index.html` *(added 2026-08-13 — `<script type="module">`; see History)*
- `.gitignore` *(added 2026-08-13 — `.parcel-cache`; see History)*

**Acceptance Criteria:** AC 3, AC 4, AC 5

**History:**
- 2026-08-13 — **Four unanticipated Parcel 2 blockers found and fixed. Flag for review — three of
  them required edits outside this task's original `Files` list.** The scripts as specified were
  correct but not sufficient: a smoke build (`parcel build demo-site/index.html` into a scratch
  directory, never `docs/`) failed outright, then silently produced a broken bundle. Root cause in
  every case is the same class of problem the Developer Notes already flag three times — **the
  demo-site and the library share one `package.json`, and 000001 turned that file into a library
  manifest.** Parcel 1 ignored those fields; Parcel 2 reads them as build configuration.
  1. **`main`/`module`/`types` are read by Parcel as *targets*.** The build died with
     `No transformers found for demo-site/index.html with pipeline: 'types'` — Parcel tried to run
     the HTML entry through `@parcel/transformer-typescript-types` because 000001 Task 8 added
     `types: "index.d.ts"`. Fixed by adding a Parcel `targets` block to `package.json` disabling all
     three: `"targets": { "main": false, "module": false, "types": false }`. `--target default` was
     tried first and rejected (`Could not find target with name "default"` — no default target exists
     once library fields are present).
  2. **`engines.node: ">=24.0.0"` made Parcel infer a *Node* target**, so it externalized every
     `node_modules` import and emitted an `<script type=importmap>`. The bundle was 5.16 kB and began
     `import"react";import"react-dom/client"` — it would have 404'd in a browser. Fixed by adding a
     `browserslist` field to `package.json` (`> 0.5%`, `last 2 versions`, `not dead`), which tells
     Parcel the demo-site targets browsers. `engines.node` is untouched — 000001 Task 2 calls it a
     management mandate. **Verified this does not perturb the library build:** `build.js` passes an
     explicit `targets: { node: "20" }` to `@babel/preset-env`, which takes precedence over
     `browserslist`, and a rebuild produced **byte-identical** `dist/` output (all four files' MD5s
     unchanged), with `npm run test:ci` still **26 passed (26)**.
  3. **`sideEffects: false` (000001 Task 8) was tree-shaking the demo-site's CSS away.** No `.css`
     bundle and no font asset were emitted, because `import "normalize.css"` / `import "./index.css"`
     are side-effect-only imports and the package declared it had none. That claim is true of the
     library but false of the demo-site. Narrowed to `"sideEffects": ["demo-site/**"]`, which
     preserves consumer tree-shaking exactly — no file in the published tarball matches the glob, so
     `index.mjs`/`index.cjs` are still declared side-effect-free. Isolated by bisecting the manifest
     field-by-field across four build variants; `exports` was ruled out as a contributor.
  4. **`demo-site/index.html` used `<script type="text/javascript">`**, which Parcel 2 treats as a
     classic script and rejects with `Browser scripts cannot have imports or exports`. Parcel 1
     accepted it. Changed to `<script type="module" src="./index.js">` — the only edit made to a
     demo-site file outside Task 2.
  Also added `.parcel-cache` to `.gitignore`: Parcel 2 renamed its cache directory and the existing
  entry only covers Parcel 1's `.cache`, so without this Task 5 would commit the cache into the repo.
  **Post-fix smoke build result** (scratch directory, `docs/` untouched): builds clean in ~540 ms and
  emits exactly `index.html`, one `demo-site.*.js` (284.9 kB, React and the barcode library both
  genuinely bundled — zero bare imports, no import map), one `demo-site.*.css`, the hashed
  `digital.*.ttf` font, and the hashed `logo.*.svg` — which is AC 5's expected shape, with
  `social.png` still to come from this script's copy step. `npm run pack:preview` re-verified after
  the manifest edits: still exactly five tarball entries, unchanged.
- 2026-08-13 — Completed. Replaced both scripts in `package.json` with the specified strings verbatim:
  `start-site` swaps Parcel 1's `--out-dir` for `--dist-dir`, and `build-site` is now the three-step
  chain — `node -e` `fs.rmSync('docs',…)` clean → `parcel build … --dist-dir docs --public-url
  https://tecuity.github.io/barcode-generator/` → `node -e` `fs.copyFileSync` restoring
  `demo-site/social.png` to `docs/social.png`. Task 1's install resolved `parcel` to `^2.16.4`, the
  exact version the flags were verified against. No `@emotion/babel-plugin`, JSX pragma, or
  Babel/Parcel config was added, and no `shx`/`rimraf` dependency was introduced. **Not executed
  here** — running `build-site` regenerates `docs/`, which is Task 5's deliverable, and Task 5 was
  excluded from this run; the pre-upgrade `docs/` (still carrying both React 16-era bundles,
  `demo-site.51f96e0f.js` and `demo-site.e9ff0f45.js`) is therefore untouched, and AC 3/4/5 remain
  open pending Task 5.
- 2026-08-11 — Research completed: verified `--dist-dir`/`--public-url` against `parcel@2.16.4`;
  removed the "add `@emotion/babel-plugin` if styling breaks" conditional after confirming the
  demo-site has no `css` prop usage, so it could never fire; and added the `docs/` clean plus the
  `social.png` restore, since Parcel 2 does not clean its output directory and never emits an
  absolute-URL asset.

---

## Task 5: [ ] Verify the demo runs and rebuild `docs/`

**Task:** End-to-end verification:

1. `npm run build` (library) so `dist` is present.
2. `npm run start-site` — open the served page, type a value, click GO, confirm a barcode renders
   and the `Tape` animation/styling looks correct.
3. `npm run build-site` — confirm Parcel 2 builds with no errors and regenerates `docs/`.
4. Verify the contents of `docs/` against AC 5. The Task 4 script cleans the directory first, so this
   is a check that it worked, not a cleanup step:
   - exactly **one** `demo-site.*.js` and **one** `demo-site.*.css` (the pre-upgrade tree had two JS
     bundles, `demo-site.51f96e0f.js` and `demo-site.e9ff0f45.js`, only one of which was referenced)
   - `index.html`, the hashed font and logo assets, and **`social.png`** — confirm `social.png` is
     present, since Parcel never emits it and only the Task 4 copy step restores it
   - open `docs/index.html` and confirm it renders and its `<script>`/`<link>` hashes match the
     bundles actually on disk

Commit the regenerated `docs/` bundle as part of this task (GitHub Pages serves from `docs/`).

**Files:**
- `docs/**` — regenerated build output

**Acceptance Criteria:** AC 3, AC 4, AC 5

**History:**

---

## Task 6: [x] Update the root `README.md` for the modernized package

**Task:** The root [README.md](../../../../README.md) still documents the v1.2.1 package and is not
touched by any task in 000001 or 000003. Bring it in line with what 000001 shipped. This runs last in
this story, after the demo has been verified, so every claim the README makes has already been
exercised by real code.

Make exactly these edits:

1. **Add a requirements note** under `## Installation`, before the install commands:
   ```md
   Requires **Node 24 or newer** (`engines.node: ">=24.0.0"`). Consumers on Node 20/22 will see an
   `EBADENGINE` warning on install.
   ```
2. **Drop the `yarn add` alternative** from `## Installation` (the `or` line and its fenced block),
   leaving `npm install @tecuity/barcode-generator`. 000001 Task 15 standardized this repo on npm,
   and the README follows — **decided, not open.** The package does still install fine under any
   client; the point is that the docs show one blessed path, consistent with the single
   `package-lock.json` the repo now commits. Do not re-add the Yarn command.
3. **Document both module forms** in `## Usage`. The existing ESM example stays as the primary form;
   add the CJS form after it, matching the `exports` map from 000001 Task 8 and the
   `exports: "default"` CJS bundle from Task 5 (which is what makes the bare `require` callable):
   ```js
   const generateBarcode = require('@tecuity/barcode-generator')
   ```
4. **Add a short "TypeScript" subsection** after `## API Reference` noting that the package ships a
   hand-written `index.d.ts` (000001 Task 9), so no `@types/` package is needed. Keep it to two
   sentences.
5. **Verify the API reference table** against `src/index.d.ts` — `spacing` (default `5`), `raw`
   (default `false`), `height` (default `172.89`). 000001 changed no option names, defaults, or
   behavior, so this is expected to be a no-op check; correct the table only if it disagrees with the
   declaration file.
6. **Add a `## Development` section** documenting the scripts, placed after `## API Reference` and
   before `## Contributors ✨` (maintainer content belongs below the consumer-facing docs, and above
   the generated contributors block). Cover the build, test, demo-site, and release scripts — the
   release scripts come from **000001 Task 14.5**, which is what created them:

   ```md
   ## Development

   Requires Node 24 (`nvm use 24` — see `.nvmrc`), then `npm install`.

   | Command | Description |
   |---------|-------------|
   | `npm run build` | Regenerates the SVG character map and bundles `dist/` (ESM + CJS + UMD + types). |
   | `npm test` | Runs the Vitest suite in watch mode. |
   | `npm run test:ci` | Single-pass test run, used by CI and gated on before every release. |
   | `npm run start-site` | Serves the demo-site locally. Run `npm run build` first — the site imports `dist/`. |
   | `npm run build-site` | Rebuilds the `docs/` GitHub Pages bundle. |

   ### Releasing

   | Command | Description |
   |---------|-------------|
   | `npm run pack:preview` | Shows exactly what the published tarball will contain. Writes nothing. |
   | `npm run release:preview` | Dry run of the release — prints the steps without publishing. |
   | `npm run release -- minor` | Cuts the release (version bump, git tag, publish). Accepts any `np` bump argument. |

   Releases run from `master` on Node 24 and are gated on `test:ci`. `dist/` is gitignored, so the
   release flow rebuilds it automatically via the `postversion` hook.
   ```

   Cross-check every command against the final `scripts` block in `package.json` before committing —
   if 000001 landed a script under a different name, the README follows `package.json`, not this task.

Leave the rest of the file alone. In particular:
- **Do not touch the `ALL-CONTRIBUTORS-LIST` block** or the surrounding
  `prettier-ignore`/`markdownlint` comments — `all-contributors-cli` regenerates that region and is
  deliberately retained (000001 Task 13 keeps it out of scope).
- **Do not change the badges.** The npm, license, and bundlephobia badges all still resolve; the
  package remains on public npm until 000003 Phase 0 decides its fate, so re-pointing them now would
  be premature.
- **Do not touch the logo image or the demo-site link.** `https://tecuity.github.io/barcode-generator/`
  is the same URL Task 4's `--public-url` targets, so it stays correct after the `docs/` rebuild.

The "generates SVG barcodes in a browser, NodeJS, or anywhere else Javascript can run" claim in the
intro needs **no edit** — it was aspirational before (the `Buffer.from` call meant a bare browser
import threw), and 000001 Task 9.5's `TextEncoder` + `btoa` encoder makes it literally true. No new
wording is required.

**Files:**
- `README.md`

**Acceptance Criteria:** AC 6

**History:**
- 2026-08-13 — Completed. All six edits made: (1) the Node 24 requirements note added under
  `## Installation` above the install command; (2) the `yarn add` alternative and its `or` line
  removed, leaving `npm install @tecuity/barcode-generator` as the single blessed path; (3) the CJS
  `require` form added to `## Usage` after the existing ESM example, which stays primary; (4) a
  two-sentence `### TypeScript` subsection added after the API reference table; (5) the API table
  verified against `src/index.d.ts` — `spacing` 5, `raw` false, `height` 172.89 all agree, so it was
  a genuine no-op as predicted and the table is unchanged; (6) the `## Development` and
  `### Releasing` sections added between `## API Reference:` and `## Contributors ✨`. The
  `ALL-CONTRIBUTORS-LIST` block and its `prettier-ignore`/`markdownlint` comments, the three badges,
  the logo image, the demo-site link, and the "browser, NodeJS, or anywhere else" intro claim were
  all left untouched, as instructed.
- 2026-08-13 — **One deviation from this task's specified README text, taken under the task's own
  "the README follows `package.json`, not this task" directive.** The `npm test` row was specified as
  "Runs the Vitest suite in watch mode," but `package.json` defines `"test": "vitest run"` — a
  single-pass run, not a watcher. 000001 Task 11's History records this as a deliberate change made
  at Braden's direction on 2026-08-13 (bare `vitest` starts the file watcher and never exits, hanging
  `np`, CI, or an agent), so the task text here was simply written before that decision landed. The
  row now reads "Single-pass run of the Vitest suite. Watch mode is `npx vitest`." — which is what
  000001 Task 11 says watch mode costs. Every other documented command was cross-checked against the
  live `scripts` block and matches verbatim: `build`, `test:ci`, `start-site`, `build-site`,
  `pack:preview`, `release:preview`, and `release` (`np`, so `npm run release -- minor` → `np minor`).
  The `pack:preview` row's "Writes nothing" was also softened to "Writes no tarball," since the script
  is `npm run build && npm run copy-manifest && npm pack ./dist --dry-run` — only the `npm pack` is a
  dry run; the build genuinely writes `dist/`. The closing "gated on `test:ci`" claim was verified
  against `np.testScript: "test:ci"` in `package.json`.
- 2026-08-11 — Task added. No task in 000001, 000002, or 000003 updated the root README, leaving it
  describing the pre-modernization package. Placed at the end of 000002 rather than in 000001 so the
  documentation lands after both the library and the demo-site have been verified against it; noted
  that the content it documents is produced entirely by 000001.
