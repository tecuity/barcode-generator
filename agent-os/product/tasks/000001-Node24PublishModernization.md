# 000001-Node24PublishModernization - Tasks

## Braden Steiner - Last Modified: 2026-08-13

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
apps on Vite can import it as native ESM (with a `require`-able CJS fallback) via a proper `exports`
map. Today the package ships **UMD-only** through Rollup 1 with a single `main` field.

**Verification scope is Vite (browser ESM) and Node (CJS `require`) only.** Webpack 5 and other
bundlers are expected to work via the same `exports` map but are **not** tested in this story.

**Starting state (as of this task file):**
- `@tecuity/barcode-generator` v1.2.1, published to public npm (`publishConfig.access: public`).
- Build: `node process.js && node build.js` — `process.js` generates the SVG character map,
  `build.js` bundles `src/index.js` with **Rollup 1.31** to a **UMD** bundle at `dist/index.js`.
- `main: dist/index.js`. **No `module`, no `exports`, no `types`, no ESM output.**
- No `engines` field; no `.nvmrc`. The `postversion` script uses Unix `cp -f` (breaks on native
  Windows shells).
- No real test suite — [index.test.js](../../../../index.test.js) is a placeholder that `require`s
  the built `dist/index` and `console.log`s the output; it asserts nothing and needs a prior build to run.
- `devDependencies` mix the (tiny) library build toolchain with the demo-site's stack and contain a
  stale ESLint 6 / `@typescript-eslint@2` toolchain unused by any npm script.
- Publishing is done via `np` (`npx np`), with `np.contents: "dist"` and `np.tests: false`.
- The repo uses **Yarn** today — a `yarn.lock` (~408 KB) is committed and there is **no
  `package-lock.json`**. `np`'s historical `yarn: false` flag was removed (commit `595e758`), so `np`
  currently releases through Yarn. Phase 4 standardizes the repo on npm (Task 15).
- devDependencies also include `all-contributors-cli` (README contributor-list tool) and
  `normalize.css` (imported by the demo-site) — neither is part of the library build/test/publish
  toolchain.
- **Prerequisite — DONE (commit `80d6436`).** `src/svg/*.svg` was renamed to `src/svg/STAR.svg` (the
  `*` character is illegal on Windows/NTFS and made the repo impossible to `git clone` on Windows).
  The rename, the `process.js` `STAR` → `*` special-casing, and the regenerated `svgMap.json` files
  all landed in that commit; a fresh `git clone` now checks out cleanly on Windows and no tracked
  path contains `*`. Tracked as Task 1 (marked done below) for the record.

## Acceptance Criteria

1. A `.nvmrc` pins Node `24` and `package.json` declares an `engines.node` floor; `npm run build`
   exits with code 0 on Node 24 and emits no Rollup warnings other than informational plugin-version
   or `EMPTY_BUNDLE` notices. Any warning left in place must be recorded in Task 16's History with a
   one-line justification.
2. `src/svg/*.svg` no longer exists in the repo; `src/svg/STAR.svg` holds the Code 39 start/stop
   (`*`) glyph, and a fresh `git clone` checks out cleanly on Windows.
3. The build toolchain runs on Node 24 with every package at or above these floors (all verified
   Node-24-compatible on 2026-08-11): `rollup@^4`, `@rollup/plugin-babel@^7`, `@rollup/plugin-json@^6`,
   `@babel/core@^7`, `@babel/preset-env@^7`, `vitest@^4`, `np@^12`. No shell-helper package (`shx` or
   similar) is added — npm scripts use `node -e` instead.
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
9. A new version (proposed `1.3.0`) is published to npm from a Node 24 environment. Verified by:
   `npm view @tecuity/barcode-generator version` prints `1.3.0`; and after a clean install of
   `@tecuity/barcode-generator@1.3.0` in the React 19 sandbox, `generateBarcode('1234567')` returns a
   string starting with `data:image/svg+xml;base64,` and the `<img>` displays visible barcode bars.
10. The repo is standardized on **npm**: a `package-lock.json` is generated and committed, `yarn.lock`
    is removed, and `npm ci` installs cleanly on Node 24 (so `np` and 000003's CI both use npm).
11. A committed v1.2.1 output fixture exists, and parity with it is enforced automatically rather
    than by manual comparison, at **both** levels:
    - the Vitest suite asserts `src/index.js` reproduces every fixture entry byte-for-byte; and
    - Task 16 asserts the **built** `dist/index.mjs` and `dist/index.cjs` reproduce every fixture
      entry byte-for-byte (this is the level the Rollup/Babel change could actually break, since the
      fixture was captured from the built v1.2.1 bundle).
12. Releasing is driven by named npm scripts rather than memorized command sequences: `npm run
    pack:preview` (inspect what will ship, writing nothing), `npm run release:preview` (`np` dry run),
    and `npm run release` (publish, accepting a bump via `npm run release -- minor`). `release`
    invokes the lockfile-pinned `np` binary, not `npx`. The scripts are documented in `README.md` by
    000002 Task 6.

## Developer Notes

**The library has zero runtime dependencies — keep it that way.** No task below should add a
runtime `dependencies` entry. React must never become a dependency or peerDependency of the
published package.

**Node 24 is a hard floor and applies to consumers too — this is decided, not open.** Management
requires every Tecuity repo on Node 24, so `engines.node` is `">=24.0.0"` (matching the `.nvmrc`
pin), not merely a build-toolchain floor. Downstream repos still on Node 20/22 will see `EBADENGINE`
warnings on install; that is the intended signal. Do not soften the floor.

**`dist/` is gitignored and never exists on a fresh clone.** `.gitignore` contains a bare `dist`
entry. Every flow that consumes `dist/` — the demo-site's `../dist/index.mjs` import (000002), `np`'s
`contents: "dist"` publish (Task 18), and 000003's pipeline — must run `npm run build` first. `np`
itself never builds.

**`Buffer` is a Node-only global and the library depends on it.** [src/index.js](../../../../src/index.js)
base64-encodes via `Buffer.from(svg).toString("base64")`. This works in Node and worked in the
demo-site only because Parcel 1 auto-injected a Buffer polyfill (the shipped `docs/demo-site.*.js`
bundle contains one). Vite does **not** polyfill `Buffer`, and Parcel 2 requires the `buffer` package
to be installed — so AC 6's Vite check and 000002's Parcel 2 build both fail without a fix. Task 9.5
replaces it with a single `TextEncoder` + `btoa` path that runs unchanged in Node and browsers, with
byte-for-byte identical output.

**Package manager: standardize on npm.** The repo is Yarn-based today (committed `yarn.lock`, no
`package-lock.json`), but every task here uses `npm`. Task 15 removes `yarn.lock` and commits a
`package-lock.json` — the first `npm install` in Phase 1 already generates the lockfile as a side
effect. This is a deliberate decision (over keeping Yarn) so the ADO pipeline in 000003 can rely on
`npm ci`.

**Toolchain versions and Node 24 compatibility — verified 2026-08-11 against the npm registry.**
Nothing here is left for the implementer to confirm:
- `rollup@4.62.4` — `engines.node: ">=18.0.0"` ✔
- `@rollup/plugin-babel@7.1.0` — `engines.node: ">=14.0.0"`, peer `rollup: ^2||^3||^4` ✔
  (use `^7`, **not** `^6`)
- `@rollup/plugin-json@6.1.0` — `engines.node: ">=14.0.0"` ✔
- `np@12.0.1` — `engines.node: ">=22"` ✔ (use `^12`, **not** `^10`)
- `vitest@4.1.10` — `engines.node: "^20.0.0 || ^22.0.0 || >=24.0.0"` ✔ (use `^4`, **not** `^3`)
- `@babel/core@^7` / `@babel/preset-env@^7` latest ✔
- Both `@rollup/plugin-*` CJS builds end with
  `module.exports = Object.assign(exports.default, exports)`, so `require()` returns a callable
  plugin. Use `const { babel } = require("@rollup/plugin-babel")` and
  `const json = require("@rollup/plugin-json")` — see Task 5. There is no interop gotcha to work
  around.

Everything in "Starting state" and these notes was verified against the working tree at commit
`ddbcc47`.

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

**Release runs from `master`, on Node 24, authenticated.** The publish (Task 18) is intentionally
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

## Task 1: [x] Land the `src/svg/*.svg` → `src/svg/STAR.svg` rename — **DONE (commit `80d6436`)**

**Task:** The Code 39 start/stop guard character `*` had its glyph stored in a file literally named
`*.svg`. `*` is a reserved character on Windows/NTFS, so `git clone` / `git checkout` aborted the
**entire** working-tree checkout on Windows (`error: invalid path 'src/svg/*.svg'`), making the repo
unusable for any Windows developer and unbuildable in a Windows publish environment. The file was
renamed to `STAR.svg` (mirroring the existing `SPACE.svg` convention) and the build taught to map it
back to the `*` map key.

**Status: complete** — verified against the current tree (commit `80d6436`, "Research Upgrades and
fix Windows file compatibility"):
- `src/svg/*.svg` → `src/svg/STAR.svg` (content-identical rename; `git show` records it as
  `src/svg/{*.svg => STAR.svg}`).
- [process.js](../../../../process.js) special-cases `STAR` → `'*'` alongside `SPACE` → `' '`.
- Both `svgMap.json` and `src/svgMap.json` have the `*` entry's `"filename"` updated to `STAR.svg`.
- A tree scan confirms **no tracked path contains a Windows-illegal character** (`< > : " | ? *`);
  `src/svg/*.svg` was the only offender and it is gone. Git status is clean — nothing is pending.

**Remaining hygiene aside (optional, not required for AC 2):** `src/svg/.DS_Store` is still tracked
but harmless — `process.js` filters it via the `.includes('.svg')` guard. Optionally
`git rm --cached src/svg/.DS_Store` and add it to `.gitignore`.

**Files:**
- `src/svg/STAR.svg` *(renamed from `src/svg/*.svg`)*
- `process.js`
- `svgMap.json`, `src/svgMap.json`

**Acceptance Criteria:** AC 2

**History:**
- Completed in commit `80d6436` (verified 2026-07-10): rename + `process.js` special-casing + both
  `svgMap.json` files updated. AC 2 satisfied — a fresh `git clone` checks out cleanly on Windows.

---

## Task 1.5: [x] Capture the v1.2.1 output baseline as a regression fixture

> **Do this FIRST — before Task 4 changes the build toolchain.** Numbered `1.5` deliberately so the
> existing Task 2–18 numbering and all cross-references stay intact.

**Task:** This release is meant to be **functionally identical** to 1.2.1 — only the module wrapper
and toolchain change, not the generator logic. Output parity is therefore the primary acceptance
check for the whole story. Capture the current output as a committed fixture so parity is verified
automatically by the test suite rather than by manual string comparison.

1. Capture from the **published tarball** — do not attempt a local pre-upgrade build. `node_modules/`
   is absent from this tree and Rollup 1.31 with `rollup-plugin-babel@4` is a 2019 toolchain that is
   unlikely to install cleanly on Node 24.
   ```powershell
   npm pack @tecuity/barcode-generator@1.2.1
   tar -xzf tecuity-barcode-generator-1.2.1.tgz     # extracts to package/
   ```
   then `require("./package/index.js")` from a scratch Node script.
2. Run this fixed input set through `generateBarcode`, recording the **exact** returned string for
   **both** default options and `{ raw: true }`:
   - `"1234567"` — digits
   - `"ABCDEF"` — uppercase letters
   - `"HELLO WORLD"` — contains a space, exercises `SPACE.svg`
   - `""` — empty input (still returns a valid `*`-wrapped SVG)
   - `"abc-123"` — lowercase and hyphen. **These are all supported and must render** — `src/svg/`
     ships `al.svg`…`zl.svg` and `-.svg`, which
     [process.js:15](../../../../process.js#L15) maps to `a`–`z` and `-`. The map has 65 entries.
     Do not describe this input as filtered.
   - `"A#B.C"` — `#` and `.` are genuinely absent from the map; this is the input that exercises the
     `characterMap[c]` filter in [src/index.js](../../../../src/index.js)
   - `"A*B"` — embedded `*`, which the `rawString.replace(/\*/g, '')` guard strips before wrapping
   - `"1234567"` with `{ spacing: 10, height: 200 }` — non-default options
3. Write the results to `test/fixtures/baseline-1.2.1.json` in **exactly** this shape, so Task 11's
   and Task 16's parity checks can both read it without guessing:
   ```json
   {
     "version": "1.2.1",
     "source": "published npm tarball",
     "commit": "<SHA of the tree at capture time>",
     "captured": "<YYYY-MM-DD>",
     "cases": {
       "[\"1234567\",{}]": "data:image/svg+xml;base64,…",
       "[\"1234567\",{\"raw\":true}]": "<svg …>"
     }
   }
   ```
   Each key is `JSON.stringify([input, opts])`; each value is the exact returned string.
4. **Commit the fixture before starting Phase 1.**

Task 11's Vitest suite then asserts `src/index.js` reproduces every fixture entry exactly, and Task 16
asserts the built `dist/index.cjs` and `dist/index.mjs` do the same. Because `generateBarcode` is pure
string assembly plus a base64 encode — no dates, no randomness, no locale-sensitive formatting — the
output is deterministic and Node-version-independent, so the fixture stays valid as a Node 24
assertion regardless of which Node captured it. Task 9.5 swaps `Buffer.from(...)` for a
`TextEncoder` + `btoa` encoder, which encodes the same UTF-8 bytes and was verified byte-identical on
Node v24.16.0, so fixture parity holds.

**Files:**
- `test/fixtures/baseline-1.2.1.json` *(new)*

**Acceptance Criteria:** AC 11

**History:**
- 2026-08-13 — Completed. Captured from the published tarball (`npm pack
  @tecuity/barcode-generator@1.2.1` → `tar -xzf` → `require("./package/index.js")`, which returns the
  generator function directly). Wrote `test/fixtures/baseline-1.2.1.json` with **16 cases** — each of
  the 8 specified inputs recorded twice, once with the stated options and once with `raw: true` added
  (`["1234567",{}]` / `["1234567",{"raw":true}]`, … , `["1234567",{"spacing":10,"height":200}]` /
  `["1234567",{"spacing":10,"height":200,"raw":true}]`). Keys are `JSON.stringify([input, opts])`;
  `commit` is `99bc623`, `captured` is `2026-08-13`. Verified the captured values behave as the task
  describes: `"abc-123"` → 9 glyphs (lowercase and `-` all render), `"A#B.C"` → 5 glyphs (`#` and `.`
  filtered), `"A*B"` → 4 glyphs (embedded `*` stripped), `""` → 2 glyphs (`*`-wrapped), the
  `{spacing:10,height:200}` case carries `viewBox="0 0 912.42 200"` vs the default `"0 0 867.42
  172.89"`, and every base64 case decodes to its matching `raw` case. Captured on Node v24.16.0 /
  npm 11.13.0.
- 2026-08-11 — Research completed: resolved the "local build **or** published tarball" directive in
  favour of the published 1.2.1 tarball (`node_modules/` is absent and the Rollup 1.31 toolchain is
  unlikely to install on Node 24). Also corrected a factual error in the input set — `"abc-123"` was
  described as lowercase/unsupported input that gets filtered, but `src/svg/` ships `al.svg`…`zl.svg`
  and `-.svg`, so all of it renders; `"A#B.C"` was added as the real filter case. Pinned the fixture
  JSON schema so Tasks 11 and 16 read the same structure.

---

## Task 2: [x] Add `.nvmrc` and an `engines` floor

**Task:** Pin the maintainer/publish Node version and declare a supported floor.

- Add `.nvmrc` at the repo root containing `24`.
- Add to `package.json`:
  ```json
  "engines": {
    "node": ">=24.0.0"
  }
  ```

Node 24 is a **management mandate** — it applies to consumers as well as maintainers, not just the
build toolchain. Set the floor to `>=24.0.0`, matching the `.nvmrc` pin. Downstream repos still on
Node 20/22 will see `EBADENGINE` warnings on install; that is the intended signal.

Do **not** create an `.npmrc` and do **not** set `engine-strict=true`. npm reads `engine-strict` from
the *installing* project's own config, never from a dependency's `.npmrc`, so shipping it here cannot
hard-fail consumer installs — it would only affect installs inside this repo. `.npmrc` creation is
owned by 000003 Task 11; leave that file to it.

**Files:**
- `.nvmrc` *(new)*
- `package.json` — add `engines`

**Acceptance Criteria:** AC 1

**History:**
- 2026-08-13 — Completed. Added `.nvmrc` containing `24` and an `engines.node: ">=24.0.0"` block to
  `package.json` (placed after `homepage`, before `scripts`). No `.npmrc` created and no
  `engine-strict` set, per the research decision above. The local Node is v24.16.0, so the floor is
  satisfied here; `npm run copy-manifest` ran without an `EBADENGINE` warning.
- 2026-08-11 — Research completed: resolved the "consider adding `engine-strict=true`" directive.
  npm reads `engine-strict` from the installing project's config, not from a dependency's `.npmrc`,
  so it cannot enforce the floor on consumers; the `engines` field alone is the ceiling for a
  published package. Decision: `engines.node: ">=24.0.0"`, no `.npmrc`. Task rewritten as a concrete
  instruction with no open decision remaining.

---

## Task 3: [x] Make the `postversion` copy cross-platform

**Task:** `postversion` currently runs `cp -f package.json dist`, which relies on a Unix `cp` and
fails in native Windows shells (`cmd`/PowerShell), breaking the release flow on a Windows publish
machine. It also does not build — and neither does `np`, whose flow is prerequisite checks → cleanup
and install → tests → `npm version` → publish from `contents: "dist"`. Since `.gitignore` contains a
bare `dist` entry, `dist/` does not exist at all on a fresh clone, so as written a release would
publish a stale or missing directory. Fix both problems in this one hook.

Replace the script with a cross-platform, zero-dependency version. Node 24 is guaranteed by
`engines.node` (Task 2), so `fs.copyFileSync` is available with nothing installed:

```json
"copy-manifest": "node -e \"require('node:fs').copyFileSync('package.json','dist/package.json')\"",
"postversion": "npm run build && npm run copy-manifest"
```

The copy is extracted into its own `copy-manifest` script rather than inlined, because **Task 14.5's
`pack:preview` needs the identical copy step**. Two hand-maintained copies of the same
`copyFileSync` line is exactly the write/read split that made `svgMap.json` diverge (Task 6) — define
it once and call it from both places.

`npm version` fires `postversion` immediately before `np`'s publish step, so this guarantees `dist/`
is freshly built and carries a current `package.json` at publish time.

Do **not** add `shx` or any other shell-helper package. It was considered and rejected: `shx@0.4.0`
has no known vulnerabilities today, but it pulls roughly 20 transitive packages (`shelljs` →
`execa@^1.0.0` from 2018 → `cross-spawn@^6`) for what `node -e` does natively on Node 24, and this
library's premise is a zero-dependency toolchain. 000002 Task 4 uses the same `node -e` approach for
its `docs/` cleanup.

If the build fails during a release, the version commit has already been made — back it out with
`git reset --hard HEAD~1` and delete the tag before retrying.

**Files:**
- `package.json` — `scripts.copy-manifest`, `scripts.postversion`

**Acceptance Criteria:** AC 9, AC 12

**History:**
- 2026-08-13 — Completed. Replaced `"postversion": "cp -f package.json dist"` with the two scripts
  specified: `copy-manifest` (`node -e "require('node:fs').copyFileSync('package.json','dist/package.json')"`)
  and `postversion` (`npm run build && npm run copy-manifest`). No shell-helper package added.
  Verified the embedded-quote form survives npm's Windows shell: with a stub `dist/` present,
  `npm run copy-manifest` produced `dist/package.json` under PowerShell on Node v24.16.0 / npm
  11.13.0. The `postversion` chain was not run end-to-end here because `npm run build` still needs
  the Phase 1 toolchain (Rollup 4 is not installed until Task 4); Task 16 exercises the full chain.
- 2026-08-11 — Extracted the `copyFileSync` call into a reusable `copy-manifest` script so Task 14.5's
  `pack:preview` calls the same step instead of duplicating it. `postversion` behavior is unchanged.
- 2026-08-11 — Research completed: resolved the "pick one" directive by choosing the zero-dependency
  `node -e` form over `shx`. `shx@0.4.0` is clean (its only historical advisories —
  `shelljs` CVE-2022-0144 and `cross-spawn` CVE-2024-21538 — fall outside the ranges it resolves to),
  but it adds ~20 transitive packages for functionality Node 24 provides natively. Also folded in the
  missing build step, since `np` never builds and `dist/` is gitignored, and corrected the AC field
  from AC 1 to AC 9.

---

# Phase 1 — Build toolchain upgrade (Rollup 1 → 4)

## Task 4: [ ] Upgrade Rollup and Babel plugins

**Task:** Rollup 1.31 is years out of support and has Node 24 incompatibilities. Upgrade to Rollup 4
and swap the deprecated `rollup-plugin-babel` for the maintained scoped package.

```
npm install --save-dev rollup@^4 @rollup/plugin-babel@^7 @rollup/plugin-json@^6
npm uninstall rollup-plugin-babel chalk
```

Notes:
- Versions verified 2026-08-11: `rollup@4.62.4` (`engines.node >=18`), `@rollup/plugin-babel@7.1.0`
  (`engines.node >=14`, peer `rollup: ^2||^3||^4`), `@rollup/plugin-json@6.1.0` (`engines.node >=14`,
  peer `rollup: ^1.20||^2||^3||^4`). All Node-24-clean. Use `@rollup/plugin-babel@^7` — **not** `^6`;
  v7 is the current major.
- `@rollup/plugin-babel` v7's only breaking change vs v6 was `include`/`exclude` filtering behavior.
  The options this build uses (`babelHelpers`, `babelrc`, `configFile`, `presets`) are unchanged.
- `@rollup/plugin-babel` requires an explicit `babelHelpers` option (use `'bundled'` for a
  self-contained library bundle) — set in Task 5.
- `@rollup/plugin-json` bumps from v4 to v6 (Rollup 4 compatible).
- **Remove `chalk` in favor of Node's built-in `util.styleText`.** The `npm uninstall` above drops
  it; change the status line in [build.js](../../../../build.js) from
  `console.log(chalk.green("Starting Build..."))` to:
  ```js
  const { styleText } = require("node:util");
  console.log(styleText("green", "Starting build..."));
  ```
  Neither keeping nor bumping `chalk` works: `chalk@3` is three majors behind (failing AC 3), and
  `chalk@6` is ESM-only (`"type": "module"`), so from the CommonJS `build.js` it needs
  `require("chalk").default` — a plain `require("chalk")` returns a namespace object whose `.green`
  is undefined, which fails silently at call time. `util.styleText` was added in Node v20.12.0 and
  **stabilized in v22.13.0**, so it is Stable on the Node 24 floor that `engines.node` guarantees
  (Task 2). It auto-detects TTY exactly like chalk, so CI logs stay uncoloured. Zero dependencies,
  colour retained.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 3

**History:**
- 2026-08-11 — Research completed: pinned the exact toolchain versions against the npm registry and
  corrected `@rollup/plugin-babel` from `^6` to `^7` (7.1.0 is the current major; v7's only breaking
  change was `include`/`exclude` filtering, which this build does not use).
- 2026-08-11 — Research completed: resolved the "pin `chalk@^4` or drop it" directive. `chalk@6` is
  ESM-only and `chalk@3` fails AC 3, so neither keeping nor bumping works; replaced with Node's
  built-in `util.styleText` (stable since v22.13.0), which keeps the coloured output at zero
  dependency cost. Verified `require(esm)` interop on the local Node v24.16.0 before deciding.

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
| `dist/index.umd.js` | `umd` | legacy `<script>` / CDN — **keep it**; Tasks 8, 16 and 17 all reference it |

Replace the contents of [build.js](../../../../build.js) with exactly this. It is one
`rollup.rollup()` call followed by three `bundle.write()` calls — the Rollup JS API takes **one**
output config per `write()`, so there is no `output` array to pass here (that is a config-file
concept, and Task 5 does not use a config file):

```js
const rollup = require("rollup");
const { babel } = require("@rollup/plugin-babel");
const json = require("@rollup/plugin-json");
const { styleText } = require("node:util");
const fs = require("fs");

console.log(styleText("green", "Starting build..."));

rollup
  .rollup({
    input: "./src/index.js",
    plugins: [
      json(),
      babel({
        babelHelpers: "bundled",
        babelrc: false,
        configFile: false,
        presets: [["@babel/preset-env", { targets: { node: "20" }, modules: false }]]
      })
    ]
  })
  .then(async bundle => {
    await bundle.write({ file: "dist/index.cjs", format: "cjs", exports: "default" });
    await bundle.write({ file: "dist/index.mjs", format: "es" });
    await bundle.write({ file: "dist/index.umd.js", format: "umd", name: "barcodeGenerator" });
    fs.copyFileSync("src/index.d.ts", "dist/index.d.ts");
    console.log(styleText("green", "Build complete."));
  });
```

Details that matter, none of them optional:
- `exports: "default"` on the CJS write makes `require("@tecuity/barcode-generator")` return the
  generator **function directly** rather than `{ default: fn }`. AC 6 and Task 10 step 4 both depend
  on this. Without it Rollup emits a namespace object and the CJS check fails.
- The UMD `name` is `barcodeGenerator` — a valid JS identifier. The current script sets
  `name: "index.js"`, which is not one.
- `modules: false` on `@babel/preset-env` stops Babel rewriting ES module syntax to CommonJS.
  Without it Rollup cannot tree-shake and `dist/index.mjs` would contain `require` calls.
- `babelrc: false` / `configFile: false` make the build ignore any external Babel file — see Task 7,
  which deletes the shared root `.babelrc`.
- The `fs.copyFileSync` line places `index.d.ts` in the publish root (Task 9).

> **Plugin imports — settled, no verification needed.** Keep `build.js` as CommonJS and require the
> plugins exactly like this:
> ```js
> const { babel } = require("@rollup/plugin-babel");
> const json = require("@rollup/plugin-json");
> ```
> Verified 2026-08-11 against the published CJS builds of `@rollup/plugin-babel@7.1.0` and
> `@rollup/plugin-json@6.1.0`: both end with
> `module.exports = Object.assign(exports.default, exports);`, so `module.exports` is the plugin
> **function** with the named exports attached as properties. Every access form works —
> `require(...)()`, `require(...).default()`, and the destructure above. `@rollup/plugin-babel` also
> exports `babel` as a real named export, so the destructure is the form its own README documents.
>
> That footer is a hand-written line in the `rollup/plugins` monorepo's shared build config
> (`output: { exports: 'named', footer: '…' }`), applied to every `@rollup/plugin-*`, and it survived
> the v6 → v7 major unchanged. The one time this package did change export shape (v5.0.0) it shipped
> as a documented breaking major. Combined with the committed `package-lock.json` (Task 15) and
> `npm ci` (000003), the resolved version is frozen and a caret range never crosses a major.
>
> **Do not convert `build.js` to ESM** and do not add an interop verification step.

**Files:**
- `build.js` — keep it as the imperative CommonJS script that `npm run build` invokes. Do not add a
  `rollup.config.mjs` and do not convert it to ESM.

**Acceptance Criteria:** AC 3, AC 4

**History:**
- 2026-08-11 — Research completed: resolved the "single Rollup run with an `output` array (or a
  config-array export)" and "optionally a `rollup.config.mjs`" directives. The Rollup JS API takes one
  output config per `bundle.write()`, so the task now specifies the complete imperative CommonJS
  script verbatim — one `rollup()` plus three `write()` calls — with `exports: "default"` on the CJS
  output (required by AC 6). UMD is kept, since Tasks 8, 16 and 17 reference `dist/index.umd.js`.
- 2026-08-11 — Research completed: resolved the "verify which plugin import is callable" directive by
  reading the published CJS builds of `@rollup/plugin-babel@7.1.0` and `@rollup/plugin-json@6.1.0`.
  Both end with `module.exports = Object.assign(exports.default, exports);`, so `require()` returns a
  callable plugin; the documented `const { babel } = require(...)` form is used. The blockquote was
  rewritten as a concrete instruction and the ESM-conversion fallback removed.

---

## Task 6: [ ] Fix the `svgMap.json` generation so the build bundles the fresh map

**Task:** `process.js` writes `./svgMap.json` (repo root), but `src/index.js` imports the map
resolved relative to `src/` (i.e. `src/svgMap.json`). The build therefore bundles a stale,
hand-committed `src/svgMap.json` and silently ignores the freshly generated root copy. Two
near-duplicate maps are committed today (currently byte-identical, so consolidating is safe).

Fix the **reader**, not the writer: `process.js` is already writing to the right place, and the root
is where a generated artifact belongs. Keeping the map out of `src/` leaves that directory as
hand-written source only (`index.js`, `index.d.ts`, `svg/`), which is what let two divergent copies
go unnoticed in the first place.

1. In [src/index.js:1](../../../../src/index.js#L1), change
   `import characterMap from "./svgMap.json"` to `import characterMap from "../svgMap.json"`.
   Leave [process.js](../../../../process.js) alone — it needs no change.
   Verified 2026-08-11: the only two `svgMap` references in the repo are `process.js:34` and
   `src/index.js:1`. Both Rollup (via `@rollup/plugin-json`, which has no path restriction in this
   config) and Vitest resolve `../svgMap.json` relative to the importing file, so no bundler or test
   config change is needed.
2. `git rm src/svgMap.json`. The two maps are byte-identical today (`diff` clean, verified
   2026-08-11), so this loses nothing.
3. Confirm `process.js` reads `STAR.svg` and produces the `*` key (depends on Task 1).
4. Re-run `node process.js` and confirm the committed root `svgMap.json` reproduces from the SVGs —
   it should contain **65 entries** (10 digits, A–Z, a–z, `-`, space, `*`). The map is built by
   iterating `fs.readdir`, whose order is filesystem-dependent, so a fresh run may reorder keys even
   when the glyph data is identical. Treat semantic equality (same keys, same glyph/viewBox data),
   not byte-identity, as the bar — key order cannot affect generator output, because
   `src/index.js` looks the map up by key. Commit the freshly generated map.
5. **Keep `svgMap.json` committed at the repo root — do not add it to `.gitignore`.** Task 11's
   Vitest suite imports `src/index.js` directly with no prior build, so a fresh clone must already
   have the map on disk. Task 11 additionally adds `pretest` / `pretest:ci` hooks that run
   `node process.js`, so the map is always regenerated before a test run.

**Files:**
- `src/index.js` (import path)
- `svgMap.json` (regenerated at the repo root, stays committed)
- `src/svgMap.json` *(deleted)*

**Acceptance Criteria:** AC 3, AC 4

**History:**
- 2026-08-11 — Research completed: resolved the "pick one and be consistent" directive. Chose to fix
  the reader (`src/index.js` → `../svgMap.json`) and keep the generated map at the repo root, so
  `src/` holds hand-written source only. Confirmed the only two `svgMap` references are
  `process.js:34` and `src/index.js:1`, and that the two committed maps are byte-identical. Added
  `pretest`/`pretest:ci` hooks in Task 11 so the map is regenerated before every test run.

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
       ["@babel/preset-env", { targets: { node: "20" }, modules: false }]
     ]
   })
   ```
   `modules: false` lets Rollup handle module syntax (required for a clean `.mjs`).

   Use `targets: { node: "20" }` **only** — do not add `esmodules: true`. Babel treats a bare
   `esmodules: true` as a union with the ES-module browser baseline (Chrome 61 / Safari 11 /
   Edge 16), not as a filter; it intersects only when set to the string `"intersect"`. Edge 16
   predates object spread, which [src/index.js](../../../../src/index.js) uses, so including it would
   make Babel transpile the spread and inject helpers into all three bundles for browsers no React 19
   consumer runs. With `node: "20"` alone the output stays essentially pass-through.
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
- 2026-08-11 — Research completed: settled the Babel targets. Dropped `esmodules: true` from the
  preset config — Babel unions it with the ES-module browser baseline (Chrome 61 / Safari 11 /
  Edge 16) rather than filtering, and Edge 16 predates the object spread used in `src/index.js`, so
  it would have forced unnecessary transpilation and helper injection. `targets: { node: "20" }` alone
  is now specified.

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
publish tarball in Task 17. `sideEffects: false` is safe — the module only defines and exports a
pure function.

**Files:**
- `package.json`

**Acceptance Criteria:** AC 4, AC 6

**History:**

---

## Task 9: [ ] Add a TypeScript declaration for the default export

**Task:** The library is plain JS, so TypeScript consumers (the common case in React 19 apps) get no
types. Hand-write a small declaration and ship it in the publish root.

Create `src/index.d.ts` with exactly these contents. No extra copy step is needed — Task 5's
[build.js](../../../../build.js) already copies it via
`fs.copyFileSync("src/index.d.ts", "dist/index.d.ts")` after the three `bundle.write()` calls:

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

The option names and defaults were verified against [src/index.js](../../../../src/index.js) on
2026-08-11 and are correct as written above — `spacing` defaults to `5`
([src/index.js:11-14](../../../../src/index.js#L11-L14)), `raw` to `false`, and `height` falls back to
the first character's `viewBox.height`. Note that `height` is read directly from `opts` at
[src/index.js:47](../../../../src/index.js#L47) rather than from the normalized `options` object — a
quirk of the source, not an error in the declaration. No further confirmation is required.

`export default` is intentional. Task 5 sets `exports: "default"` on the CJS bundle, so `require()`
returns the bare function; TypeScript pairs that with an `export default` declaration correctly under
`esModuleInterop`, which is on by default in Vite and every modern React setup. Do **not** switch to
`export = generateBarcode` — that would break the `import` condition, which is the primary
consumption path.

**Files:**
- `src/index.d.ts` *(new)* — the `dist/` copy is handled by `build.js` (Task 5)

**Acceptance Criteria:** AC 5

**History:**
- 2026-08-11 — Research completed: resolved the "extend the build/copy step, or emit it alongside the
  bundles" directive by folding `fs.copyFileSync("src/index.d.ts", "dist/index.d.ts")` into Task 5's
  `build.js`. Verified the drafted option types against the source and recorded why `export default`
  is correct rather than `export =`.

---

## Task 9.5: [ ] Make base64 encoding work in the browser (remove the `Buffer` dependency)

> **Do this BEFORE Task 10** — Task 10's Vite check cannot pass until this lands. Numbered `9.5`
> deliberately (mirroring Task 1.5) so the existing Task 10–18 numbering and all cross-references
> stay intact.

**Task:** [src/index.js:5](../../../../src/index.js#L5) encodes with
`Buffer.from(svg).toString("base64")`. `Buffer` is a **Node-only global** — it does not exist in
browsers. This has never surfaced because Parcel 1 auto-injected a Buffer polyfill into the
demo-site bundle (the shipped `docs/demo-site.51f96e0f.js` contains one — `base64-js`, `isBuffer`,
43 `Buffer` references). Vite does **not** polyfill it, so AC 6's React 19 sandbox check throws
`ReferenceError: Buffer is not defined`; Parcel 2 requires the `buffer` package to be installed, so
000002's demo-site build breaks the same way.

Replace `svgToDataURL` in [src/index.js](../../../../src/index.js) with a **single** encoder that runs
unchanged in both environments. `btoa` and `TextEncoder` are globals in browsers *and* in Node
(verified on Node v24.16.0), so no branching is needed — encoding UTF-8 bytes explicitly also means
non-ASCII glyph data can never corrupt the result:

```js
const svgToDataURL = svg => {
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const encoded = btoa(bin);
  const header = "data:image/svg+xml;base64,";

  return header + encoded;
};
```

Do **not** reintroduce a `typeof Buffer !== "undefined"` branch. A single code path was chosen
deliberately for maintainability: two branches can silently diverge, and there is nothing to gain
since the output is identical. Verified 2026-08-11 on Node v24.16.0 — this produces byte-for-byte the
same base64 as the `Buffer.from(svg).toString("base64")` it replaces, so Task 1.5's fixture (captured
in Node from the published 1.2.1 bundle) still reproduces exactly and AC 11 parity is unaffected. No
extra test is needed beyond Task 11's existing fixture-parity assertions.

Do **not** add a `buffer` polyfill package either — that would violate the zero-runtime-dependency
rule in the Developer Notes.

**Files:**
- `src/index.js`

**Acceptance Criteria:** AC 6, AC 11

**History:**
- 2026-08-11 — Decision recorded: collapsed the originally-drafted dual-branch encoder
  (`Buffer` in Node, `btoa` in browsers) to a single universal `TextEncoder` + `btoa` path, for
  maintainability. Confirmed on Node v24.16.0 that both globals are present and the output is
  byte-identical to `Buffer.from`.

---

## Task 10: [ ] Verify consumption in a React 19 sandbox (ESM and CJS)

**Task:** Prove the published shape works for a React 19 consumer. Build the package
(`npm run build`), then create a throwaway sandbox **outside** this repo and install the local build
via `npm pack` + install of the tarball (which exercises the real published `files`/`exports`, not a
symlink).

1. Pack **from `dist/`, not from the repo root** — Task 8 sets `files`/`main`/`module`/`types`/
   `exports` to paths that are correct only as seen from inside the publish root, so a root
   `npm pack` produces a tarball containing none of the build output. Replicate the `np` flow:
   ```powershell
   npm run build
   node -e "require('fs').copyFileSync('package.json','dist/package.json')"
   cd dist
   npm pack          # → tecuity-barcode-generator-1.2.1.tgz
   ```
   The version is still `1.2.1` at this point — the bump to `1.3.0` does not happen until Task 18.
2. In a scratch Vite + React 19 app: `npm install /path/to/tecuity-barcode-generator-1.2.1.tgz`.
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
npm install --save-dev vitest@^4
```

Add scripts:
```json
"pretest": "node process.js",
"test": "vitest",
"pretest:ci": "node process.js",
"test:ci": "vitest run"
```

Both `pre` hooks are required — npm runs `pre<name>` for arbitrary script names, but `pretest` fires
only for `npm test`, **not** for `npm run test:ci`, so `test:ci` needs its own. These regenerate the
root `svgMap.json` (Task 6) before every test run, so the suite can never assert against a stale map.

Create `test/index.test.js` — beside the Task 1.5 fixtures, and keeping `src/` as hand-written source
only (Task 6 removed the generated map from `src/` for the same reason). Import the source directly
so tests need no prior build:

```js
import { describe, it, expect } from "vitest";
import generateBarcode from "../src/index.js";
import baseline from "./fixtures/baseline-1.2.1.json";
```

No `vitest.config.js` is needed — Vitest's default include glob covers `test/**/*.test.js`. Assert:
- Default call returns a string starting with `data:image/svg+xml;base64,`.
- `{ raw: true }` returns a string starting with `<svg` and containing `viewBox`.
- The output is wrapped with the Code 39 start/stop `*` guard (decode the base64 or inspect raw SVG
  — the first and last glyphs correspond to the `*` map entry).
- `spacing` changes the computed total width; `height` sets the viewBox height.
- Characters absent from the map (e.g. `#`, `.`, `@`, `$`) are filtered out without throwing.
  **Lowercase `a`–`z` and `-` ARE in the map and must render** — `src/svg/` ships `al.svg`…`zl.svg`
  and `-.svg`, and [process.js](../../../../process.js) maps them to `a`…`z` and `-`. Do not write a
  test asserting lowercase input is stripped; it will fail.
- Empty input still returns a valid `*`-wrapped SVG.
- **Parity with 1.2.1:** every entry in `test/fixtures/baseline-1.2.1.json` (Task 1.5) reproduces
  byte-for-byte. This is the check that proves the modernization was non-functional; a failure here
  means the toolchain upgrade changed generator output and must be investigated before publishing,
  not snapshot-updated away.

Because Vitest is ESM-native, confirm it runs the source under Node 24 with no Babel config needed
(and note that Task 7 removed the root `.babelrc`, so nothing should reintroduce one). Vitest
supports JSON imports out of the box, so `src/index.js`'s `import ... from "../svgMap.json"` (see
Task 6) resolves with no extra config.

Document here the intentional divergence from the `granite-ui` Jest convention (see Developer Notes).

**Files:**
- `package.json`, `package-lock.json`
- `test/index.test.js` *(new)*
- `index.test.js` *(deleted — the root placeholder)*

**Acceptance Criteria:** AC 7, AC 11

**History:**
- 2026-08-11 — Research completed: resolved the "`src/index.test.js` (or `test/index.test.js`)"
  directive in favour of `test/index.test.js`, so the suite sits with its Task 1.5 fixtures and `src/`
  stays source-only. Confirmed Vitest's default include glob covers it with no config file. Also
  pinned `vitest@^4` (current major, `engines.node: ^20 || ^22 || >=24`) and added the
  `pretest`/`pretest:ci` hooks from Task 6.

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

# Phase 4 — Prune library devDependencies and standardize on npm

## Task 13: [ ] Remove stale library-toolchain devDependencies

**Task:** The `devDependencies` block carries a stale ESLint 6 stack that no npm script uses.
Prune the library-side dead weight (the demo-site's React / Emotion / Parcel dependency changes,
including removing the duplicate `parcel-bundler@1`, are handled in
[000002-DemoSiteReact19Upgrade.md](./000002-DemoSiteReact19Upgrade.md)):

- **Confirm `rollup-plugin-babel` and `chalk` are already gone** — Task 4 already runs
  `npm uninstall rollup-plugin-babel chalk`. Do not run it again; just verify both are absent from
  `package.json`, that `build.js` uses `require("node:util").styleText` rather than `chalk`, and that
  no other stale Rollup 1 plugins remain.
- **Remove the stale ESLint 6 stack and its config.** Verified 2026-08-11: `package.json` has no
  `lint` script (only `build`, `start-site`, `build-site`, `postversion`, `release`), and `.eslintrc`
  is exactly `{ extends: "react-app" }` — a bare extends with no rule configuration. Nothing in the
  repo invokes ESLint, so remove it unconditionally:
  ```
  npm uninstall eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser babel-eslint eslint-config-react-app eslint-plugin-flowtype eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-react eslint-plugin-react-hooks
  git rm .eslintrc
  ```
  `.eslintrc` must go with the packages — leaving `{ extends: "react-app" }` behind after removing
  `eslint-config-react-app` would make any future `npx eslint` fail on an unresolvable config. A
  modern flat-config ESLint setup, if wanted, is a separate story.
- **Delete the root `.npmignore`.** `git rm .npmignore`. It excludes `/src`, `/demo-site`,
  `/site-dist`, `/docs`, but has no effect on the real publish: `np` publishes from `dist/`, and only
  `package.json` is copied there — `.npmignore` is never present at the publish root. Task 8's
  `files` array is the authoritative include-list and takes precedence over `.npmignore` regardless.
  Leaving it in place invites someone to "fix" packaging by editing a file npm never consults.

Keep: `@babel/core`, `@babel/preset-env`, `rollup@4`, `@rollup/plugin-babel`, `@rollup/plugin-json`,
`vitest`, `np` (not present today — added by Task 14; do not flag it as missing here). Task 3
deliberately added **no** shell-helper package, so there is no `shx` to keep, and Task 4 removed
`chalk` in favour of Node's built-in `util.styleText`. Do a dependency-usage pass
(`git grep` each package name across `src/`, `*.js` config) before removing, and record what was
confirmed unused in History.

**Out of scope — leave in place:** `all-contributors-cli` (maintains the README contributor list;
referenced in `README.md`, not part of the build/test/publish toolchain) and `normalize.css` (a live
demo-site runtime import at [demo-site/index.js:8](../../../../demo-site/index.js#L8) — it is **not**
removed by any task in 000002 either; it stays). Neither is a library-toolchain dependency; do not
remove them here.

**Files:**
- `package.json`, `package-lock.json`
- `.eslintrc` *(deleted)*
- `.npmignore` *(deleted)*

**Acceptance Criteria:** AC 8

**History:**
- 2026-08-11 — Research completed: resolved the "unless the team actively lints" directive to an
  unconditional removal. `package.json` has no `lint` script and `.eslintrc` carries no rule config,
  so nothing in the repo can be linting. Added `.eslintrc` and `.npmignore` to the deletions —
  the former would dangle on an unresolvable `extends` once `eslint-config-react-app` is gone, and
  the latter never reaches the `dist/`-rooted publish that `np` performs.

---

## Task 14: [ ] Upgrade `np` for Node 24

**Task:** Ensure the release tool runs on Node 24. `np` is **not** in `devDependencies` today — only
`"release": "npx np"` — so this task adds it. Install the current major:

```
npm install --save-dev np@^12
```

Confirm `npx np --version` prints `12.x`. Verified 2026-08-11: `np@12.0.1` declares
`engines.node: ">=22"`, so it runs on Node 24. Do not pin `np@^10` — it is two majors behind.

**Files:**
- `package.json`, `package-lock.json`

**Acceptance Criteria:** AC 3, AC 9

**History:**

---

## Task 14.5: [ ] Simplify the release scripts

**Task:** Releasing is currently a set of memorized command sequences rather than named scripts. The
only release-related script is `"release": "npx np"`, and the verification steps later in this plan
(Tasks 17 and 18) spell out multi-step sequences the maintainer is expected to retype. Collapse the
whole flow to three named scripts, so each maintainer intent is exactly one command.

Runs **after Task 14** (which installs `np@^12` as a devDependency, making `np` resolvable from
`node_modules/.bin` inside npm scripts) and after Task 11 (`test:ci`) and Task 3 (`copy-manifest`).
Final release-related `scripts` block:

```json
"copy-manifest": "node -e \"require('node:fs').copyFileSync('package.json','dist/package.json')\"",
"postversion": "npm run build && npm run copy-manifest",
"pack:preview": "npm run build && npm run copy-manifest && npm pack ./dist --dry-run",
"release:preview": "np --preview",
"release": "np"
```

Only three of these are things a maintainer types:

| Command | Intent |
|---------|--------|
| `npm run pack:preview` | "What will actually ship?" — builds, stages the manifest, lists the tarball contents. Writes nothing. |
| `npm run release:preview` | "What will `np` do?" — prints the release steps without executing them. |
| `npm run release -- minor` | "Cut the release." — the real thing. |

`copy-manifest` and `postversion` are plumbing, invoked by the others.

Three specific changes to make, each with a reason:

1. **`"release": "npx np"` → `"release": "np"`.** With `np` pinned in `devDependencies` (Task 14),
   the bare name resolves to the pinned local binary via `node_modules/.bin`. Keeping `npx` risks
   resolving a *different*, newer `np` than the one the lockfile pins — the release tool is the last
   place to want that ambiguity.
2. **Add `release:preview`.** `np --preview` prints its task list without publishing. Task 12 and
   Task 17 already reach for `npx np --preview`; give it a name.
3. **Add `pack:preview`.** This replaces Task 17's three-step manual sequence. Verified 2026-08-11 on
   npm 11.13.0 / Node 24.16.0: `npm pack ./dist --dry-run` treats `./dist` as the package root, reads
   `dist/package.json`, honors its `files` array, and prints the tarball contents **without writing a
   tarball** and without a `cd`. A probe package with `files: ["index.mjs","index.cjs"]` plus an
   untracked `ignoreme.txt` listed exactly the three expected entries and excluded the junk file. This
   is why the script uses `npm pack ./dist` rather than `cd dist && npm pack` — no shell-specific
   directory change, identical behavior under `cmd`, PowerShell, and `sh`.

**Do not** add a bump-specific script per release type (`release:minor`, `release:patch`, …). npm
appends `--` arguments to the end of the script string, and `np` is last in every chain above, so
`npm run release -- minor` becomes `np minor` and `npm run release:preview -- minor` becomes
`np --preview minor`. Five near-identical scripts would be the opposite of simplifying.

**Do not** add `npm run test:ci` to the `release` chain. `np.testScript: "test:ci"` (Task 12) already
gates the release on the suite; duplicating it would run the tests twice per publish.

**Do not** add a `prepublishOnly` build hook. `np` publishes from `dist/` with a copied
`package.json`, so a `prepublishOnly` in that manifest would execute with `dist/` as its working
directory, where `process.js`/`build.js` do not exist. Build enforcement belongs in `postversion`
(Task 3), which is where it is.

Verify after editing:
- `npm run pack:preview` prints a tarball listing containing exactly `index.cjs`, `index.mjs`,
  `index.umd.js`, `index.d.ts`, and `package.json`, and leaves no `.tgz` on disk.
- `npm run release:preview` prints `np`'s task list, reports that it will run `test:ci`, and
  publishes nothing.
- `npx np --version` prints `12.x` and matches the `np` version in `package-lock.json` (confirming
  the local binary is what `release` invokes).

**Files:**
- `package.json` — `scripts.release`, `scripts.release:preview`, `scripts.pack:preview`

**Acceptance Criteria:** AC 12

**History:**
- 2026-08-11 — Task added. Requested directly: the repo had no simplified release scripts, only
  `"release": "npx np"`, with Tasks 17/18 documenting raw command sequences instead. Verified
  `npm pack ./dist --dry-run` against npm 11.13.0 / Node 24.16.0 so the tarball check needs no `cd`.
  Documented in the README by 000002 Task 6.

---

## Task 15: [ ] Standardize on npm (remove `yarn.lock`, commit `package-lock.json`)

**Task:** The repo is Yarn-based today — a committed `yarn.lock` (~408 KB) and **no
`package-lock.json`**. Every task in this plan (and 000003's CI, which runs `npm ci`) assumes npm.
Finalize the switch to npm.

The first `npm install` in Phase 1 (Task 4) already generates a `package-lock.json` (npm ignores
`yarn.lock`). This task finalizes and commits the change:

1. Confirm the lockfile is current: `npm install` on Node 24.
2. `git rm yarn.lock`.
3. Commit `package-lock.json` and the `yarn.lock` deletion.
4. Confirm `np` uses npm: with no `yarn.lock` present it auto-detects npm (the historical
   `np.yarn: false` flag was already removed in commit `595e758`, so nothing else is needed).
5. Confirm `npm ci` installs cleanly from the committed lockfile on Node 24 — this is what 000003's
   pipeline runs.

**Files:**
- `package-lock.json` *(new, committed)*
- `yarn.lock` *(deleted)*

**Acceptance Criteria:** AC 10

**History:**

---

# Phase 5 — Final verification and publish

## Task 16: [ ] Clean install and build on Node 24

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

Then assert **built-output** parity against the fixture. Task 11's suite tests `src/index.js`; this
step tests the actual bundles, which is the level the Rollup/Babel change could break (the fixture
was captured from the built v1.2.1 bundle, not from source). Run this script from the repo root:

```powershell
node -e "const b=require('./dist/index.cjs');const f=require('./test/fixtures/baseline-1.2.1.json');let n=0;for(const [k,v] of Object.entries(f.cases)){const [input,opts]=JSON.parse(k);const got=b(input,opts);if(got!==v){console.error('MISMATCH',k);process.exit(1)}n++}console.log('cjs parity OK',n)"
node --input-type=module -e "import b from './dist/index.mjs';import {readFileSync} from 'fs';const f=JSON.parse(readFileSync('./test/fixtures/baseline-1.2.1.json','utf8'));let n=0;for(const [k,v] of Object.entries(f.cases)){const [input,opts]=JSON.parse(k);const got=b(input,opts);if(got!==v){console.error('MISMATCH',k);process.exit(1)}n++}console.log('mjs parity OK',n)"
```

Both must print `parity OK` with a non-zero count. If either mismatches, the toolchain upgrade
changed generator output — investigate in Task 5/7 before publishing; do not update the fixture.

**Files:** None — verification only

**Acceptance Criteria:** AC 1, AC 3, AC 4, AC 7, AC 11

**History:**

---

## Task 17: [ ] Inspect the publish tarball

**Task:** Confirm the package that will actually be published is correct **before** publishing.
Because `np` publishes from `dist/` with a copied `package.json`, verify the paths resolve from the
publish root.

Task 14.5 turned this into one command — it replicates the `np` flow (build → stage the manifest →
inspect) with no manual steps:

```
npm run pack:preview
```

Confirm the listing contains the four `dist` files plus `package.json`, and that the
`main`/`module`/`types`/`exports` paths point at files present in the tarball (no `dist/` prefix
inside the tarball). Fix any path mismatch back in Task 8.

**Files:** None — verification only

**Acceptance Criteria:** AC 6, AC 9, AC 12

**History:**
- 2026-08-11 — Replaced the three-step manual sequence (`build`, copy `package.json`,
  `cd dist && npm pack --dry-run`) with Task 14.5's `npm run pack:preview`, which performs the same
  steps and is portable across `cmd`/PowerShell/`sh`.

---

## Task 18: [ ] Publish 1.3.0

**Task:** With everything green on Node 24, cut the release. **Preconditions:** the preparation
branch has been merged to `master` and you are releasing from `master`; `nvm use 24` is active; and
`npm login` (with `@tecuity` publish rights) has been completed — an OTP prompt is expected. `np`
handles the version bump, git tag, and publish; `np.testScript` (Task 12) gates on `test:ci`.

```
npm run release:preview -- minor   # dry run: confirm the plan and that it will run test:ci
npm run release -- minor           # 1.2.1 → 1.3.0
```

Both use the Task 14.5 scripts, which invoke the `np` version pinned in the lockfile. If `np`'s
interactive prompts are undesirable in the environment, use `npm version minor` +
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

---

## Task 19: [x] Untrack `src/svg/.DS_Store`

**Correction Note:** This task corrects a leftover in Task 1: the `STAR.svg` rename landed correctly
and AC 2 is satisfied, but the tracked macOS `src/svg/.DS_Store` artifact was recorded as an
"optional hygiene aside" inside a completed task rather than being assigned to a task of its own, so
nothing would ever act on it.

**Task:** Stop tracking the stray macOS metadata file. Confirmed present via `git ls-files` on
2026-08-11.

```
git rm --cached src/svg/.DS_Store
```

`.DS_Store` is already covered by the last line of `.gitignore`, so no `.gitignore` change is needed.
No build change is needed either — [process.js:8](../../../../process.js#L8) already skips it via the
`.includes('.svg')` filter. Confirm `git ls-files src/svg` no longer lists it and that
`node process.js` still produces a map with 65 entries.

**Files:**
- `src/svg/.DS_Store` *(untracked)*

**Acceptance Criteria:** AC 2

**History:**
- 2026-08-13 — Completed. Ran `git rm --cached src/svg/.DS_Store`; `git ls-files src/svg` no longer
  lists it and `git status` does not report it as untracked, confirming `.gitignore`'s trailing
  `.DS_Store` line already covers it — no `.gitignore` change needed. `node process.js` still
  produces a 65-entry map with `*` → `STAR.svg`, `' '`, `a`–`z` and `-` all present. Note: the
  regenerated map differed from the committed `svgMap.json` in **key order only** (`fs.readdir`
  order) — same 65 keys, zero value differences — so the working-tree copy was restored and left for
  Task 6, which owns regenerating and committing it.
