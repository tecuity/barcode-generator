# 000004-DemoSiteViteMigration - Tasks

## Braden Steiner - Last Modified: 2026-08-14

## Story Description

Move the `barcode-generator` **demo-site** — the GitHub Pages page in
[demo-site/](../../../../demo-site/), built into [docs/](../../../../docs/) — from Parcel 2 to Vite 8.
React 19 and Emotion 11 are already in place from
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md) and **do not change**; this
story swaps only the bundler.

**The motivation is not build speed — it is that Parcel's configuration lives in the library's
published manifest.** The demo-site and the library share the single repo-root `package.json`, and
Parcel 2 reads library manifest fields as build configuration. Getting Parcel 2 green in 000002 Task 4
required three concessions to that shared file:

| Field | Why Parcel needed it | Fate under Vite |
|-------|---------------------|-----------------|
| `targets: { main: false, module: false, types: false }` | Parcel read `main`/`module`/`types` as build targets and tried to run `index.html` through the TypeScript-types transformer | **Deleted** — Parcel-only field, meaningless to every other tool |
| `browserslist` | `engines.node: ">=24.0.0"` made Parcel infer a *Node* target and externalize every `node_modules` import | **Deleted** — Vite targets browsers by default and does not read `browserslist` |
| `sideEffects: ["demo-site/**"]` (narrowed from `false`) | `sideEffects: false` made Parcel tree-shake the demo-site's CSS imports away entirely | **Restored to `false`** — verified safe under Vite (Task 6) |

Because `copy-manifest` copies the root `package.json` into `dist/` and `np` publishes from there,
**all three currently ship to consumers inside the published tarball.** Removing them is the point of
this story. The secondary payoff is that `build-site` collapses from a three-command shell chain to
`vite build`, and the committed `docs/` bundle drops from **1.71 MB to 452 KB** — Vite emits no source
maps, and Parcel's were 2.1 MB of the 2.5 MB it produced.

**Starting state (as of this task file — all of 000002 is complete and verified):**
- `devDependencies` carry `parcel@^2.16.4`; React is `^19.2.8`, Emotion is `@emotion/react@^11.14.0` /
  `@emotion/styled@^11.14.1`.
- `demo-site/` holds `index.js`, `Tape.js`, `GithubCorner.js` (**all three contain JSX**), plus
  `index.css`, `digital.ttf`, `logo.svg`, `quotes.json`, `social.png`, `index.html`.
- [demo-site/index.js](../../../../demo-site/index.js) carries a Parcel-2 workaround —
  `const logo = new URL('./logo.svg', import.meta.url).href` — added by 000002 Task 5 because a plain
  `import logo from './logo.svg'` silently resolved to `{}` under Parcel 2.
- `start-site` is `parcel demo-site/index.html --dist-dir site-dist`; `build-site` is the three-step
  `node -e` rmSync → `parcel build … --public-url …` → `node -e` copyFileSync chain.
- **`docs/` in git still holds the React 16-era Parcel 1 bundles** — 1.71 MB across ten files:
  `demo-site.51f96e0f.js`, `demo-site.e9ff0f45.js` (two JS bundles, only the first referenced),
  `demo-site.e0a32588.css`, a `.map` for each of the three, `digital.75c0fc73.ttf`, `index.html`,
  `logo.490eed06.svg`, `social.png`. 000002 Task 5 rebuilt and fully verified a Parcel 2 bundle but
  **deliberately did not commit it** (see that task's History), precisely so this story could regenerate
  `docs/` once rather than churning it twice. So this story lands the first `docs/` commit since the
  React 16 era, and the live GitHub Pages site is still serving the old bundle until Task 8 ships.
- The working tree may still carry that uncommitted Parcel 2 output (`demo-site.543c762d.js` and
  friends). `emptyOutDir` wipes it on the first Vite build; nothing needs to be cleaned by hand.

---

## Acceptance Criteria

1. `devDependencies` carry `vite@^8` and `@vitejs/plugin-react@^6`; `parcel` is removed. React 19 and
   both Emotion 11 packages are **unchanged**.
2. A `vite.config.mjs` at the repo root is the demo-site's only build configuration. The root
   `package.json` contains **no** `targets` field and **no** `browserslist` field, and `sideEffects` is
   back to `false`. `main`, `module`, `types`, `exports`, `engines` and `files` are untouched.
3. The three JSX files are `.jsx` (`index.jsx`, `Tape.jsx`, `GithubCorner.jsx`) and
   `demo-site/index.html` points at `./index.jsx`. No `.js` file in `demo-site/` contains JSX.
4. `demo-site/index.js`'s `new URL('./logo.svg', import.meta.url).href` workaround is gone, replaced by
   a plain `import logo from './logo.svg'`, and the logo still renders.
5. `npm run start-site` serves the demo at `http://localhost:5173/`; typing a value and clicking GO
   renders a barcode, and the `Tape` animation and Emotion styling are correct.
6. `npm run build-site` is exactly `vite build` — no `node -e` clean step and no `node -e` copy step —
   and it regenerates `docs/`.
7. After `npm run build-site`, `docs/` contains exactly `index.html`, `social.png`, and an `assets/`
   directory holding exactly one JS bundle, one CSS bundle and the hashed font. **No source maps, no
   separate logo file** (it inlines as a data URI), and no filename from either Parcel era remains —
   neither the committed React 16 bundles nor 000002's uncommitted Parcel 2 output.
8. The published tarball is unchanged in shape: `npm run pack:preview` still lists exactly the five
   entries (`index.cjs`, `index.mjs`, `index.umd.js`, `index.d.ts`, `package.json`), and the copied
   `dist/package.json` carries no bundler configuration.
9. `npm run build` and `npm run test:ci` still pass, and `dist/` output is byte-identical to before this
   story — the library build must not be perturbed.

---

## Developer Notes

**Everything below was verified on 2026-08-13 by building and rendering the real demo-site files in a
throwaway Vite 8 project — not read from documentation.** The prototype copied `demo-site/*` and
`dist/index.mjs` into a scratch directory alongside a `package.json` that reproduced the repo's library
fields (`main`, `module`, `types`, `engines`, `sideEffects`), then built and rendered the output in
headless Chrome. Nothing here is left for the implementer to confirm.

**Versions, verified against the npm registry 2026-08-13.**
- `vite@8.2.1` — `engines.node: "^20.19.0 || >=22.12.0"`, which Node 24 satisfies, so no `EBADENGINE`.
  Vite 8 bundles with **Rolldown** (`rolldown@~1.2.1`) and `lightningcss`, not Rollup 4.
- `@vitejs/plugin-react@6.0.5` — its only *required* peer is `vite@^8.0.0`. Its `@rolldown/plugin-babel`
  and `babel-plugin-react-compiler` peers are declared **optional** in `peerDependenciesMeta`, so a
  plain `npm install -D vite @vitejs/plugin-react` resolves clean with no `ERESOLVE` and no extra
  packages to add. Install measured at 82 packages in 5 s.
- `@vitejs/plugin-react-swc@4.3.3` also supports Vite 8 and was considered. **Use the Babel-based
  `@vitejs/plugin-react`** — it costs nothing here and leaves the door open for `@emotion/babel-plugin`
  if a `css` prop is ever introduced.

**JSX in `.js` files does not build — this is the one unavoidable breaking change.** Vite/Rolldown
treats `.js` as plain JavaScript and fails with `Unexpected JSX expression … JSX syntax is disabled and
should be enabled via the parser options`. Parcel transformed JSX in `.js` happily. The fix is the
idiomatic Vite one: rename the three JSX-bearing files to `.jsx` (Task 3). Do **not** reach for a
config override to force JSX in `.js` — renaming is what Vite expects and it keeps the config empty.
Extensionless imports keep working after the rename (`./Tape` → `Tape.jsx`, `./quotes` → `quotes.json`)
because `.jsx` and `.json` are both in Vite's default `resolve.extensions`.

**`import logo from './logo.svg'` works natively — and the logo inlines.** This is the defect 000002
Task 5 had to work around under Parcel, and Vite's default asset handling simply resolves it to a URL
string. Because `logo.svg` is 1706 bytes and Vite's `build.assetsInlineLimit` defaults to 4096, Vite
inlines it as a `data:image/svg+xml,…` URI rather than emitting a file — so **`docs/` will not contain a
logo asset at all**, which AC 7 accounts for. Accept this (one fewer request); set
`build.assetsInlineLimit: 0` only if a separate file is wanted for some external reason. The existing
`new URL(…, import.meta.url).href` form also works under Vite, so Task 4 is a simplification, not a
repair — but revert it anyway so no Parcel-shaped workaround is left to confuse the next reader.

**`vite.config.mjs`, not `vite.config.js`.** The root `package.json` has no `"type"` field, so the
package is CJS by default, and `build.js`/`process.js`/the `node -e` scripts rely on `require`. Adding
`"type": "module"` to fix an ESM config file would break them. Using the `.mjs` extension sidesteps the
question entirely — **verified working with no `"type"` field present.** Do not add `"type": "module"`.

**Vite ignores the library manifest fields that broke Parcel.** The prototype's `package.json` carried
`main: "index.cjs"`, `module: "index.mjs"`, `types: "index.d.ts"` and `engines.node: ">=24.0.0"`, and the
build was correct with no `targets` block and no `browserslist` — no phantom build targets, no inferred
Node target, no externalized imports, no import map. React and the barcode library are genuinely
bundled into a single 276.11 kB chunk (gzip 77.60 kB), slightly smaller than Parcel's 285.05 kB.

**`sideEffects: false` is safe under Vite — verified, not assumed.** Rebuilt with `sideEffects: false`
in place of the `["demo-site/**"]` narrowing: the CSS bundle came out at 2506 bytes with its
`@font-face` intact and the hashed font emitted, with byte-identical hashes to the narrowed run. Vite
does not tree-shake the demo-site's `import "normalize.css"` / `import "./index.css"` the way Parcel
did. This is what lets Task 6 restore the value the library actually wants.

**Both `node -e` shell steps are genuinely replaced — verified.**
- `emptyOutDir: true` cleans `docs/` even though it sits *outside* the Vite `root`. Tested by planting
  stale `demo-site.STALE.js` and `assets/index-STALE.js` files and rebuilding: both were removed. Vite
  refuses to empty an out-of-root `outDir` *unless* the flag is explicit, so it must be set.
- `publicDir` defaults to `demo-site/public`, so `social.png` moved there is copied to `docs/social.png`
  automatically. This is why Task 7 moves the file rather than adding a copy script.

**Use a relative `base: "./"`.** With an absolute `base` the dev server relocates to
`http://localhost:5173/barcode-generator/` — a papercut for a maintainer who opens the root URL. A
relative base keeps dev at `/`, emits `./assets/…` references, and makes the bundle independent of its
deploy path. Verified by serving the built `docs/` at a `/barcode-generator/` sub-path in Chrome: every
asset resolved and the page rendered with an empty console. Note this means `--public-url` and the
hard-coded `https://tecuity.github.io/…` build flag disappear; the absolute `og:image`/`twitter:image`
URLs in `index.html` are hand-written and stay as they are.

**Source maps are off by default and should stay off.** Both Parcel generations emitted them: the
committed React 16-era tree carries three `.map` files totalling 1.07 MB, and the Parcel 2 rebuild
produced a single **2.1 MB** `demo-site.*.js.map`. Vite emits none unless `build.sourcemap: true`.
Leaving it off is most of what takes `docs/` from 1.71 MB to 452 KB — and it is why deferring 000002's
`docs/` commit was worth doing at all. Do not enable it.

**Emotion 11 needs no configuration, exactly as under Parcel.** The demo-site uses `styled` plus
`css`/`keyframes` as interpolated functions and no `css` prop, so `@vitejs/plugin-react` alone is
enough. Verified in the prototype: the `Tape.jsx` interpolation still produces a real named keyframes
rule, applied as `animation-name: animation-jzdcv9` on `ReceiptPaper` — the same value the Parcel build
produces, since Emotion resolves it at runtime. Do **not** add `@emotion/babel-plugin` or a JSX pragma.

**The `../dist/index.mjs` import still works from outside the Vite root.** `root` is `demo-site`, so the
library import reaches outside it. Verified in **both** dev and build — the barcode generated correctly
on the dev server, so Vite's default `server.fs.allow` covers the project root and needs no widening.
As under Parcel, `npm run build` must run before serving or building the site, since `dist/` is
gitignored.

**GitHub Pages needs no `.nojekyll`.** Vite's default asset directory is `assets`, which Jekyll serves
normally. Only an underscore-prefixed directory would require one, so do not rename `assets`.

**`docs/` gets rewritten with new paths and hashes, in a single commit.** 000002 Task 5 deferred its
`docs/` commit specifically so the Pages bundle churns once instead of twice, which is why the Task 8
diff replaces the React 16-era files directly with Vite's — no Parcel 2 output ever enters history.
GitHub Pages picks up the new `index.html` and its relative references together.

---

## Task 1: [x] Swap Parcel for Vite in `devDependencies`

**Task:** Replace the bundler. React 19 and both Emotion 11 packages must **not** change.

```
npm install --save-dev vite@^8 @vitejs/plugin-react@^6
npm uninstall parcel
```

Expect a clean resolve — no `ERESOLVE`, no `--legacy-peer-deps`, no `EBADENGINE` on Node 24 (see
Developer Notes for the verified peer/engine ranges). Commit the updated `package-lock.json`.
Re-run `npm audit` afterward and record the new count in this task's History; 000002 Task 1 measured
26 findings with Parcel installed, and none of them traced to the demo-site stack.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 1

**History:**
- 2026-08-14 — Completed. Ran both specified commands on Node v24.16.0 / npm 11.13.0. Resolved to
  `vite@8.2.1` and `@vitejs/plugin-react@6.0.5` — the exact versions the Developer Notes verified —
  and `parcel` is gone from `devDependencies`. React (`^19.2.8`), `react-dom` (`^19.2.8`),
  `@emotion/react` (`^11.14.0`) and `@emotion/styled` (`^11.14.1`) are byte-unchanged. The resolve was
  clean as predicted: **no `ERESOLVE`, no `--legacy-peer-deps`, no `EBADENGINE`** — `vite@8`'s
  `^20.19.0 || >=22.12.0` engine range is satisfied by Node 24, and `@vitejs/plugin-react`'s
  `@rolldown/plugin-babel` / `babel-plugin-react-compiler` peers are optional so nothing extra was
  needed.
  The install added only **4 packages** (removing 2), far fewer than the Developer Notes' measured 82:
  `vitest@^4` already depends on Vite, so most of the tree — including `rolldown` and `lightningcss` —
  was already installed and only the plugin and its direct deps were new. Uninstalling `parcel`
  then removed **133 packages**, netting the tree down to 671 from 804.
  `npm audit` afterward: **26 findings (6 low, 7 moderate, 8 high, 5 critical)** — *identical* to the
  26 that 000002 Task 1 measured with Parcel installed. This confirms that task's conclusion that none
  of the findings traced to the demo-site stack: removing 133 Parcel packages moved the count by zero.
  The roots remain `all-contributors-cli`, `np`, `@babel/core`/`@babel/helpers` and their transitive
  `ajv`/`lodash`/`minimist`/`qs`/`y18n`/`yargs` chains. `npm audit fix` was not run — out of scope.
  `package-lock.json` updated in place.

---

## Task 2: [x] Add `vite.config.mjs`

**Task:** Create `vite.config.mjs` at the repo root — **`.mjs`, not `.js`**, and do not add
`"type": "module"` to `package.json` (see Developer Notes):

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "demo-site",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
```

Every line is load-bearing: `root` scopes the build to the demo-site, `base: "./"` replaces
`--public-url` and keeps the dev server at `/`, `outDir: "../docs"` overrides Vite's default `dist`
(which would collide with the library's publish root), and `emptyOutDir: true` is required because
`docs/` sits outside `root`. Add nothing else — no `server`, no `build.target`, no `assetsInlineLimit`,
no `sourcemap`.

**Files:**
- `vite.config.mjs` *(new)*

**Acceptance Criteria:** AC 2, AC 6, AC 7

**History:**
- 2026-08-14 — Completed. Created [vite.config.mjs](../../../../vite.config.mjs) at the repo root with
  the specified config verbatim — `root: "demo-site"`, `base: "./"`, `plugins: [react()]`,
  `build.outDir: "../docs"`, `build.emptyOutDir: true`. Nothing else was added: no `server`, no
  `build.target`, no `assetsInlineLimit`, no `sourcemap`. The `.mjs` extension was used as directed and
  **no `"type": "module"` was added to `package.json`** — verified by Task 8's build, which loaded the
  config with no ESM/CJS complaint while `build.js`, `process.js` and the `copy-manifest` `node -e`
  script kept working under CJS.

---

## Task 3: [x] Rename the three JSX files to `.jsx`

**Task:** Vite will not transform JSX in a `.js` file (see Developer Notes — this is a hard build
failure, not a warning). Rename, preserving git history:

```
git mv demo-site/index.js demo-site/index.jsx
git mv demo-site/Tape.js demo-site/Tape.jsx
git mv demo-site/GithubCorner.js demo-site/GithubCorner.jsx
```

Then update the entry reference in [demo-site/index.html](../../../../demo-site/index.html):
```html
<script type="module" src="./index.jsx"></script>
```

Change **no import statements** — `import Tape from "./Tape"` and `import quotes from './quotes'` are
extensionless and keep resolving. `quotes.json`, `index.css`, `digital.ttf`, `logo.svg` and
`social.png` are untouched by this task.

**Files:**
- `demo-site/index.js` → `demo-site/index.jsx`
- `demo-site/Tape.js` → `demo-site/Tape.jsx`
- `demo-site/GithubCorner.js` → `demo-site/GithubCorner.jsx`
- `demo-site/index.html`

**Acceptance Criteria:** AC 3

**History:**
- 2026-08-14 — Completed. Ran the three `git mv` commands as specified; `git status` reports all three
  as renames (`R`), so history is preserved. Updated the entry reference in
  [demo-site/index.html:20](../../../../demo-site/index.html#L20) to
  `<script type="module" src="./index.jsx"></script>` — the `type="module"` that 000002 Task 4 added for
  Parcel 2 is what Vite requires as well, so only the extension changed. **No import statement was
  touched**, and the extensionless resolution held exactly as the Developer Notes predicted: Task 8's
  build resolved `import Tape from "./Tape"` → `Tape.jsx` and `import quotes from './quotes'` →
  `quotes.json` with no config and no warning. No `.js` file remains in `demo-site/` — the directory now
  holds only the three `.jsx` files plus `index.css`, `index.html`, `quotes.json`, `digital.ttf`,
  `logo.svg` and `public/social.png`.

---

## Task 4: [x] Revert the Parcel `logo.svg` workaround

**Task:** In `demo-site/index.jsx`, replace the workaround 000002 Task 5 added:

```js
const logo = new URL('./logo.svg', import.meta.url).href
```

with the plain import, restored to its original position in the import block:

```js
import logo from './logo.svg'
```

`<Logo src={logo} />` does not change. Vite resolves this to a URL string natively and inlines the
1.7 kB SVG as a data URI — see Developer Notes. Leave the `className` fixes in
`GithubCorner.jsx` from 000002 Task 5 **in place**; those were a real React bug, unrelated to the
bundler.

**Files:**
- `demo-site/index.jsx`

**Acceptance Criteria:** AC 4

**History:**
- 2026-08-14 — Completed. Removed the `const logo = new URL('./logo.svg', import.meta.url).href` line
  from [demo-site/index.jsx](../../../../demo-site/index.jsx) and restored
  `import logo from './logo.svg'` to its **original position** — line 6, between `import Tape` and
  `import GithubCorner`, confirmed against `git show HEAD:demo-site/index.js`, since 000002 Task 5's
  workaround was never committed. `<Logo src={logo} />` is unchanged. Verified rendering in headless
  Chrome under Task 8 rather than by inspection: the wordmark renders as a real 260×54 image with
  `naturalWidth` 260 (not the `[object Object]` / zero-width breakage Parcel 2 produced), and its `src`
  is a `data:image/svg+xml,…` URI — Vite inlined the 1706-byte SVG under the default 4096-byte
  `assetsInlineLimit`, exactly as the Developer Notes predicted, so no logo file appears in `docs/`.
  The `className` fixes in `GithubCorner.jsx` were left in place as instructed.

---

## Task 5: [x] Move `social.png` into `demo-site/public/`

**Task:** Vite copies everything in `publicDir` (which defaults to `demo-site/public`) to the output
root, which is what replaces `build-site`'s `node -e` copy step:

```
git mv demo-site/social.png demo-site/public/social.png
```

Nothing references `social.png` by a build-relative path — `index.html` points at the absolute
`https://tecuity.github.io/barcode-generator/social.png` in its `og:image`/`twitter:image` tags, which
is exactly why Parcel never emitted it and a copy step was needed. Leave those tags alone.

**Files:**
- `demo-site/social.png` → `demo-site/public/social.png`

**Acceptance Criteria:** AC 7

**History:**
- 2026-08-14 — Completed. `git mv demo-site/social.png demo-site/public/social.png`; `git status`
  reports it as a rename (`R`), byte-identical. The `demo-site/public/` directory did not exist and was
  created by the move. The absolute `og:image`/`twitter:image` tags in `index.html` were left alone as
  instructed. Verified under Task 8 that this genuinely replaces the old `node -e` copy step: after
  `vite build`, `docs/social.png` is present and its MD5 matches `demo-site/public/social.png` — Vite's
  default `publicDir` picked it up with no copy script and no reference from any source file.

---

## Task 6: [x] Clean the Parcel concessions out of `package.json` and rewrite the site scripts

**Task:** This is the task the story exists for. In the root `package.json`:

1. **Delete the `targets` block** entirely (`{ "main": false, "module": false, "types": false }`) — it
   is Parcel-only and meaningless to Vite.
2. **Delete the `browserslist` array** (`"> 0.5%"`, `"last 2 versions"`, `"not dead"`) — Vite does not
   read it.
3. **Restore `sideEffects` to `false`** from `["demo-site/**"]`, which is the value correct for the
   published library. Verified safe under Vite in the Developer Notes.
4. **Replace both site scripts:**
   ```json
   "start-site": "vite",
   "build-site": "vite build"
   ```

Do **not** touch `main`, `module`, `types`, `exports`, `files`, `engines`, `np`, `publishConfig`, or any
other script. After editing, run `npm run pack:preview` and confirm the tarball still lists exactly
five entries (AC 8).

**Files:**
- `package.json`
- `vitest.config.mjs` *(new, added 2026-08-14 — Vitest root isolation; see History)*

**Acceptance Criteria:** AC 1, AC 2, AC 6, AC 8

**History:**
- 2026-08-14 — **One unanticipated blocker found and fixed, requiring a new file outside this task's
  original `Files` list. Flag for review.** All four specified edits landed cleanly, but `npm run
  test:ci` then **failed** — `No test files found, exiting with code 1`, with Vitest reporting
  `RUN v4.1.10 C:/repos/barcode-generator/demo-site`. Root cause is the same shared-configuration
  problem this whole story exists to unwind, just pointed the other way: **Vitest reads
  `vite.config.mjs` when no Vitest-specific config exists**, so Task 2's `root: "demo-site"` silently
  became the *test* root, and the suite at [test/index.test.js](../../../../test/index.test.js) fell
  outside it. Nothing was wrong with the tests; Vitest was looking in the wrong directory. This did not
  exist before — the repo had no Vite-family config at all, so Vitest defaulted its root to the cwd.
  Fixed by adding [vitest.config.mjs](../../../../vitest.config.mjs) with `root: "."`. Vitest gives
  `vitest.config.*` precedence over `vite.config.*`, so the demo-site build config no longer reaches
  the test run **and Task 2's config stays exactly as specified** — this was chosen over adding a
  `test` block to `vite.config.mjs`, which would have violated that task's explicit "Add nothing else"
  constraint and re-coupled the two concerns. It carries a two-line comment, the non-obvious kind worth
  leaving: the file looks like a no-op otherwise. After the fix, `npm run test:ci` is back to
  **26 passed (26)** with root correctly at `C:/repos/barcode-generator`.
- 2026-08-14 — Completed. All four edits made to `package.json`: (1) the `targets` block deleted
  entirely; (2) the `browserslist` array deleted; (3) `sideEffects` restored from `["demo-site/**"]` to
  `false`; (4) both site scripts replaced with `"start-site": "vite"` and `"build-site": "vite build"`.
  **This is the payoff the story was written for** — all three Parcel concessions that 000002 Task 4
  had to make to the shared manifest are gone, and since `copy-manifest` copies this file into `dist/`,
  they no longer ship to consumers: the published `package.json` drops from **2247 to 1797 bytes**.
  `main`, `module`, `types`, `exports`, `files`, `engines`, `np`, `publishConfig` and every other script
  are untouched, and no `"type": "module"` was added.
  **AC 8 verified:** `npm run pack:preview` still lists exactly five entries — `index.cjs` (54.3 kB),
  `index.mjs` (54.3 kB), `index.umd.js` (56.6 kB), `index.d.ts` (521 B), `package.json` (1.8 kB) —
  total 5 files, and the copied `dist/package.json` now carries no bundler configuration of any kind.
  **AC 9 verified for the `browserslist` removal specifically:** the rebuild `pack:preview` triggered
  produced `dist/` output **byte-identical** to the pre-story baseline — `index.cjs`
  `E17B6A0F0441C41A0AD864ED1B8C9FEF`, `index.mjs` `114BEF779F8CCEE154ECDA37E91ABD2D`, `index.umd.js`
  `1A9C6652785ACFE46924480ECD2D4D3A`, `index.d.ts` `CE3B8636A9F5306B6883E8600D1280B1`, all four MD5s
  unchanged. This confirms 000002 Task 4's finding from the opposite direction: `build.js` passes an
  explicit `targets: { node: "20" }` to `@babel/preset-env`, so removing `browserslist` perturbs the
  library build exactly as little as adding it did. Only `dist/package.json` differs, which is the
  intended change.

---

## Task 7: [x] Drop the dead Parcel entries from `.gitignore`

**Task:** [.gitignore](../../../../.gitignore) carries three entries that exist only for Parcel and are
dead once it is removed:
- `.cache` — Parcel 1's cache directory
- `.parcel-cache` — Parcel 2's, added by 000002 Task 4
- `/site-dist` — the old `start-site --dist-dir` target; Vite's dev server serves from memory and
  writes nothing

Remove all three, along with the `# parcel-bundler cache (https://parceljs.org/)` comment above the
first two. Note there is a **second, separate** `.cache/` entry further down under `# Gatsby files` —
that one is not Parcel's and **stays**. Vite's own cache lives in `node_modules/.vite`, already covered
by the existing `node_modules/` entry, so **do not add a new ignore entry for it.**

**Files:**
- `.gitignore`
- `.parcel-cache/`, `site-dist/` *(deleted from disk 2026-08-14 — see History)*

**Acceptance Criteria:** None directly — housekeeping for AC 6

**History:**
- 2026-08-14 — Completed. Removed all three Parcel-only entries plus the
  `# parcel-bundler cache (https://parceljs.org/)` comment above the first two: `.cache` and
  `.parcel-cache` (the latter added by 000002 Task 4) came out as a four-line block including the
  blank line, and `/site-dist` came out near the end of the file. The distinction the task warned about
  was honored — the **separate `.cache/` entry under `# Gatsby files` (now line 83) is untouched**,
  confirmed by grep after the edit. No ignore entry was added for Vite: its cache lives in
  `node_modules/.vite`, already covered by the existing `node_modules/` entry, and Task 8's build
  confirmed nothing untracked appeared at the repo root afterward.
- 2026-08-14 — **Follow-on consequence this task did not anticipate, resolved.** Removing the ignore
  entries made the *directories* they had been hiding visible: `.parcel-cache/` (8 files, 5.7 MB) and
  `site-dist/` (7 files, 3.5 MB — including a 2.2 MB `demo-site.0340cca6.js.map`) were still on disk
  from 000002's Parcel runs and immediately began showing as **untracked** in `git status`. The entries
  were dead, as the task says, but the artifacts behind them were not. Left alone this was a live
  hazard — a `git add -A` would have committed ~9 MB of dead Parcel output, the exact class of blob
  this story's deferred-`docs/`-commit decision existed to keep out of history. Confirmed both were
  **never tracked** (`git ls-files` returns nothing for either) and that nothing installed can read or
  regenerate them now that `parcel` is uninstalled, then deleted both from disk. Approved by Braden on
  2026-08-14. `git status` is now clean of Parcel entirely.

---

## Task 8: [x] Verify the demo runs and rebuild `docs/`

**Task:** End-to-end verification, the same shape as 000002 Task 5:

1. `npm run build` (library) so `dist/` exists, then confirm `dist/` is **byte-identical** to its
   pre-story state (compare all four file hashes) and `npm run test:ci` still passes — the library build
   must not be perturbed (AC 9).
2. `npm run start-site` — the dev server should come up at `http://localhost:5173/` (**not** a
   `/barcode-generator/` sub-path; if it does, `base` is wrong). Type a value, click GO, and confirm the
   barcode renders, the receipt animates out of the slot, the logo shows, the `Digital` font applies,
   and the browser console is **empty**.
3. `npm run build-site` — confirm it completes with no errors and regenerates `docs/`.
4. Verify `docs/` against AC 7. `emptyOutDir` cleans the directory, so this is a check that it worked:
   - `docs/index.html`, `docs/social.png`, and `docs/assets/` — nothing else at the top level
   - `docs/assets/` holds exactly one `index-*.js`, one `index-*.css`, and one `digital-*.ttf`
   - **no `.map` files anywhere**, and **no separate logo file** (it is inlined — see Developer Notes)
   - every filename from both Parcel eras is gone — the committed React 16 set
     (`demo-site.51f96e0f.js`, `demo-site.e9ff0f45.js`, `demo-site.e0a32588.css`, their three `.map`s,
     `digital.75c0fc73.ttf`, `logo.490eed06.svg`) **and** any uncommitted Parcel 2 leftovers
     (`demo-site.543c762d.js`, `demo-site.c0a2d9b0.css`, `digital.7e4dbc27.ttf`, `logo.06ac5d38.svg`)
   - `docs/index.html`'s `./assets/…` references match the files actually on disk
5. Confirm the built bundle renders **as it will be served from a sub-path**, not just from disk —
   serve `docs/` under a `/barcode-generator/` prefix locally and load it. A relative `base` makes this
   the meaningful test; opening `docs/index.html` over `file://` is not equivalent.

Expect roughly 276 kB of JS (gzip ~78 kB) and a total `docs/` size near 452 KB, down from the committed
1.71 MB.

**This task carries the `docs/` commit deferred from 000002 Task 5, so expect a larger-than-usual diff:
it replaces the React 16-era bundle directly with Vite's, and it is the change that finally moves the
live GitHub Pages site off React 16.** Ten deletions, and the additions land under `docs/assets/`.
Sanity-check `git status` before committing to confirm no Parcel 2 file is being added (those were never
committed and must not arrive now); `emptyOutDir` should already have removed them.

**Files:**
- `docs/**` — regenerated build output

**Acceptance Criteria:** AC 4, AC 5, AC 7, AC 9

**History:**
- 2026-08-14 — Completed, all five steps. Verified in real headless Chrome (Chrome 141, driven over the
  DevTools Protocol), not by reading the bundle.
  **(1) Library unperturbed (AC 9).** `npm run build` then all four `dist/` MD5s compared against a
  baseline captured *before* any change in this story: `index.cjs`
  `E17B6A0F0441C41A0AD864ED1B8C9FEF`, `index.mjs` `114BEF779F8CCEE154ECDA37E91ABD2D`, `index.umd.js`
  `1A9C6652785ACFE46924480ECD2D4D3A`, `index.d.ts` `CE3B8636A9F5306B6883E8600D1280B1` — **byte-identical**.
  `npm run test:ci` **26 passed (26)** (after the Task 6 Vitest-root fix; see that task's History for the
  blocker).
  **(2) Dev server.** `npm run start-site` came up in 174 ms and served the app at the **root path** —
  no `/barcode-generator/` prefix — confirming `base: "./"` is right. **Port caveat:** Vite reported
  `Port 5173 is in use, trying another one...` and bound **5174**. The occupant is an unrelated project's
  dev server (`react-image-viewer`, PID 38608, launched 2026-08-12 with `--strictPort`), not anything
  this repo starts; it was left running rather than killed. AC 5's port claim is otherwise satisfied —
  5173 is Vite 8's default and nothing in `vite.config.mjs` overrides it. Rendering was verified on 5174.
  Scripted Chrome typed `TECUITY 42` into the input (via the native value setter so React's controlled
  input registers it) and clicked GO: the barcode renders as a **300×45** `data:image/svg+xml;base64`
  image, the receipt animates out of the slot, and the logo shows as a **260×76** image whose `src` is a
  `data:image/svg+xml,…` URI (AC 4 — the inlining the Developer Notes predicted). Emotion 11 is fully
  functional with no Babel plugin or JSX pragma: 28 rules across 28 `style[data-emotion]` tags, and the
  `Tape.jsx` `css`/`keyframes` interpolation resolves to `animation-name: animation-jzdcv9` — **the exact
  same value the Parcel build produced** (000002 Task 5), since Emotion resolves it at runtime. The
  `Digital` @font-face loads and applies to the input, `normalize.css` applies (`body` margin `0px`), and
  the `github-corner`/`octo-arm` classNames from 000002 Task 5 are intact. **Zero exceptions, zero failed
  requests.** Screenshot reviewed — pixel-correct. Every request 200 except a **`/favicon.ico` 404**,
  which is the browser's own automatic request for a file this site has never had in any bundler era —
  pre-existing, not a migration regression, and the only blemish on an otherwise empty console.
  **(3) Build.** `npm run build-site` — now just `vite build` — completed clean in **96 ms**, 54 modules
  transformed, no errors and no warnings.
  **(4) `docs/` verified against AC 7.** Top level holds exactly `index.html`, `social.png` and
  `assets/`; `assets/` holds exactly one JS (`index-3IrVkaCq.js`, 279.76 kB / gzip 77.85 kB), one CSS
  (`index-ktzU_vZG.css`, 2506 B) and one hashed font (`digital-nvE1-jg2.ttf`). **No `.map` file anywhere**
  and **no logo file** — both as designed. The CSS came out at 2506 bytes, matching the Developer Notes'
  prototype byte-for-byte, which confirms `sideEffects: false` did not tree-shake the demo-site's CSS.
  `docs/social.png` MD5-matches `demo-site/public/social.png`, so Task 5's `publicDir` move genuinely
  replaced the old copy step. `index.html`'s `./assets/…` references match the files on disk exactly.
  Total `docs/` is **442 KB**, down from the committed 1.71 MB — slightly better than the ~452 KB
  estimate. `git status` is clean of surprises: nine React 16-era files deleted, `index.html` modified,
  `docs/assets/` added, `social.png` unmodified. **No Parcel 2 leftover is being added** — all four
  (`demo-site.543c762d.js`, `demo-site.c0a2d9b0.css`, `digital.7e4dbc27.ttf`, `logo.06ac5d38.svg`) were
  removed from disk by `emptyOutDir`, confirming it cleans an out-of-root `outDir` as the Developer Notes
  claimed. (Note the diff is nine deletions plus one modification, not the ten deletions the task text
  anticipated — `index.html` is regenerated in place rather than deleted.)
  **(5) Served from a sub-path.** `docs/` was served under a `/barcode-generator/` prefix by a local
  static server and loaded in Chrome — the meaningful test for a relative `base`, which `file://` cannot
  substitute for. It requested exactly the three local assets plus the font, all 200, all correctly
  resolved under the prefix, and produced the **same** working barcode (300×45), inlined logo, fonts and
  `animation-jzdcv9` animation, with a screenshot pixel-identical to the dev server's. Also confirmed on
  the built bundle: **no import map and zero bare/externalized imports** — React and the barcode library
  are genuinely bundled, so the regression that forced 000002 Task 4's `browserslist` concession has not
  returned now that the field is gone.

---

## Task 9: [x] Reconcile the README's demo-site rows with the migration

**Task:** Review, and **change the README where the migration makes a more accurate statement
possible.** The `## Development` table that 000002 Task 6 added documents `npm run start-site` as
"Serves the demo-site locally. Run `npm run build` first — the site imports `dist/`." and
`npm run build-site` as "Rebuilds the `docs/` GitHub Pages bundle." Neither makes a Parcel-specific
claim, so nothing here is *wrong* after this story — the script names are unchanged, only their
implementations differ, and the `npm run build` prerequisite still holds.

Read the section, and correct anything the migration falsifies. Beyond that, an edit is **allowed but
not required**: the bar is whether it tells a maintainer something true and useful that the migration
newly makes knowable — the dev server's URL being the obvious candidate, since Vite serves on a fixed
default port where Parcel used a different one. Do **not** name the bundler for its own sake; the
README documents the commands a maintainer runs, not the toolchain behind them. A no-op outcome is a
legitimate result here — record whichever way it lands, with the reasoning.

**Files:**
- `README.md`

**Acceptance Criteria:** None directly — documentation consistency

**History:**
- 2026-08-14 — Completed as the predicted **no-op: no change required**, recorded rather than skipped.
  Read the `## Development` and `### Releasing` sections in full and grepped the whole README for
  `parcel`, `vite`, `bundler` and `site-dist`. **Zero bundler references exist** — the single `vite`
  substring hit is the word "Vitest" in the `npm test` row, which is the test runner and unrelated to
  this story. Both site rows remain accurate as written: `npm run start-site` — "Serves the demo-site
  locally. Run `npm run build` first — the site imports `dist/`." (the prerequisite still holds, and
  Task 8 confirmed it directly: the dev server loads `../dist/index.mjs` through Vite's `@fs` path); and
  `npm run build-site` — "Rebuilds the `docs/` GitHub Pages bundle." Both script *names* are unchanged,
  so only implementations differ, exactly as this task anticipated. No Vite mention was added for its
  own sake — the README documents the commands a maintainer runs, not the toolchain behind them.
  `README.md` is byte-unchanged by this story.
- 2026-08-14 — **Superseded in part: the README did change, and this task was rewritten to allow it.**
  The entry above is accurate as of when it was written but no longer describes the tree. In commit
  `2e0d982` Braden edited the `npm run start-site` row to read "Serves the demo-site at
  `http://localhost:5173`. Run `npm run build` first — the site imports `dist/`." That is a Vite-specific
  fact (5173 is Vite's default; Parcel served on 1234), which this task's original text had prohibited as
  "a Vite mention for its own sake." The prohibition was too broad: the port is not toolchain trivia but
  the address a maintainer actually opens, and it is knowable only because the bundler changed. The task
  text and title above were rewritten accordingly — a README change is now explicitly permitted where it
  states something true and useful, with a no-op still a legitimate outcome. **The no-op finding itself
  still stands on its own terms:** nothing in the README was *falsified* by this story, so no correction
  was ever required; the edit that landed is an improvement, not a fix. Note the same commit made three
  further README changes — a `MIGRATING.md` link, a CJS "no `.default` to unwrap" clarification, and a
  new UMD `<script>` section. Those document the **published package** (000001 territory), not the
  demo-site, and fall outside this task's scope; they were reviewed and verified accurate against
  `build.js` and the built bundles, but they are not this task's work and are not claimed as such.
