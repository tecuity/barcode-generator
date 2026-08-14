# Migrating to @tecuity/barcode-generator 1.3.0

This guide covers upgrading from **1.2.1** to **1.3.0**.

1.3.0 modernizes the package's *module output and publish toolchain*. The generator logic is
unchanged and its output is byte-for-byte identical to 1.2.1 — see
[Output parity](#output-parity-nothing-you-render-changes).

**If you `require()` or `import` the package by its bare name and you are on Node 24, no code change
is required.** The one change that can break you is the new Node floor.

## What changed in the published package

| | 1.2.1 | 1.3.0 |
|---|---|---|
| `engines.node` | *absent* | `>=24.0.0` — **can fail your install** |
| `main` | `dist/index.js` (broken path; see below) | `index.cjs` |
| `module` | *absent* | `index.mjs` — real ESM build |
| `types` | *absent* | `index.d.ts` |
| `exports` | *absent* | `"."` only — subpath imports now blocked |
| `sideEffects` | *absent* | `false` |
| Tarball contents | `index.js`, `package.json` | `index.cjs`, `index.mjs`, `index.umd.js`, `index.d.ts`, `package.json` |
| Base64 encoder | `Buffer.from(...)` (Node-only) | `TextEncoder` + `btoa` (universal) |
| UMD global | `window.index.js` | `window.barcodeGenerator` |
| Runtime dependencies | none | none |

---

## 1. Node 24 is a hard floor

This is the only change that can stop an install.

```json
"engines": { "node": ">=24.0.0" }
```

This is deliberate and org-wide, not a build-toolchain artifact. It arrives in a minor version, so a
`^1.2.x` range **will float you onto it automatically** on the next fresh resolve.

| Your Node | Result |
|---|---|
| 24+ | Clean install |
| 20 / 22 | `EBADENGINE` **warning**; install proceeds |
| 20 / 22 with `engine-strict=true` or `npm ci --engine-strict` | Install **aborts** |

**Sequencing matters.** If your project is also moving to Node 24, land the runtime bump *before*
the barcode-generator bump. Upgrading this package first — while a Dockerfile, CI agent, or runtime
manifest still pins an older Node — turns a passing install into a failing one.

If you need to hold at 1.2.1 while the Node work lands, pin exactly and bump deliberately:

```json
"@tecuity/barcode-generator": "1.2.1"
```

Check **every** manifest that declares the dependency, not just the root `package.json`. Container
runtime manifests, per-environment manifests, and committed lockfiles in subdirectories each carry
their own copy of the range and their own Node assumption.

## 2. Entry points moved

`main` changed from `dist/index.js` to `index.cjs`, and an `exports` map now governs resolution:

```json
"exports": {
  ".": {
    "types": "./index.d.ts",
    "import": "./index.mjs",
    "require": "./index.cjs",
    "default": "./index.cjs"
  }
}
```

**Bare-specifier imports are unaffected** — both of these keep working exactly as before:

```js
import generateBarcode from '@tecuity/barcode-generator'   // → index.mjs
const generateBarcode = require('@tecuity/barcode-generator') // → index.cjs
```

**Path-based imports break.** The `exports` map declares only the `.` subpath, so Node and modern
bundlers refuse anything deeper. Replace any of these with the bare specifier:

```js
require('@tecuity/barcode-generator/dist/index.js')  // ✗ file no longer exists
require('@tecuity/barcode-generator/index.js')       // ✗ renamed to index.cjs
import '@tecuity/barcode-generator/src/index.js'     // ✗ src/ was never published
```

The tarball ships four files plus the manifest. `src/`, `svgMap.json`, and the `.ttf` font are not
published and were not published in 1.2.1 either — nothing that previously resolved has been removed.

### A note on 1.2.1's `main`

1.2.1 declared `main: "dist/index.js"`, but its tarball contained only `index.js` at the package
root — that path never resolved. `require()` worked solely because Node falls back to `index.js`
when `main` is unresolvable. 1.3.0 fixes this. If you had worked around it with an explicit path,
drop the workaround.

## 3. `require()` returns the same thing — still no `.default`

Both versions return the generator **function itself**, not a namespace object. 1.2.1's UMD wrapper
did `module.exports = factory()`; 1.3.0's CJS build is emitted with Rollup's `exports: "default"`.
Verified on the built bundle: `typeof require(...) === 'function'`, and `'default' in require(...)`
is `false`.

```js
const generateBarcode = require('@tecuity/barcode-generator')
generateBarcode('1234567')        // ✓ unchanged
```

Do **not** add `.default` when upgrading:

```js
require('@tecuity/barcode-generator').default   // ✗ undefined in both 1.2.1 and 1.3.0
```

## 4. UMD global renamed

Only relevant if you load the bundle via a `<script>` tag.

1.2.1's build set the UMD name to the string `"index.js"`, which Rollup split on the dot into a
nested namespace — the global was `window.index.js`. 1.3.0 uses a valid identifier:

```html
<script src=".../index.umd.js"></script>
<script>
  // was: window.index.js(...)
  barcodeGenerator('1234567')
</script>
```

## 5. Base64 encoding no longer uses `Buffer`

1.2.1 encoded via `Buffer.from(svg).toString("base64")`. 1.3.0 uses `TextEncoder` + `btoa`.

**Why:** `Buffer` is a Node-only global. In the browser it worked only under bundlers that
auto-injected a polyfill (Parcel 1 did; Vite and Parcel 2 do not), so the package could not be
consumed by a modern browser build without a shim. Both `TextEncoder` and `btoa` are present in Node
and in browsers, so one code path now serves both.

**For browser consumers:** this removes a failure. No `buffer` package or polyfill config is needed.

**For Node consumers:** this is a change to a path that already worked, made for browser reasons —
so it is worth a smoke test rather than an assumption. Both globals are available on Node 24
(`btoa` since Node 16, `TextEncoder` since Node 11) and the encoded bytes are identical. Verified on
Node v24.16.0: the built CJS bundle produces correct output and emits **no deprecation warning**,
including under `--throw-deprecation --pending-deprecation`. (Node's docs deprecate the
`buffer.btoa()` *module export* in favor of `Buffer.from`; the global used here is unaffected.)

If your usage is server-side, exercise it in the environment you actually deploy — a container or
process manager, not just local dev.

## 6. TypeScript types now ship

A hand-written `index.d.ts` is published and wired through the `exports` map's `types` condition.
Remove any local ambient declaration or `@ts-ignore` you added for this package. There is no
`@types/` package to install.

## Output parity: nothing you render changes

`generateBarcode` is pure string assembly plus a base64 encode — no dates, no randomness, no
locale-sensitive formatting. Output is deterministic and Node-version-independent.

Parity with 1.2.1 is enforced automatically by the test suite against a fixture captured from the
**published 1.2.1 tarball**, covering 16 cases (8 inputs × default and `raw: true`), including empty
input, lowercase, hyphens, spaces, embedded `*`, unmapped characters, and non-default
`spacing`/`height`. It is asserted at two levels: against `src/index.js`, and against the built
`dist/index.cjs` and `dist/index.mjs` — the level a toolchain change could actually break.

**If you gate releases on rendered-output parity** (PDF diffs, image snapshots, visual regression),
this matters: the barcodes 1.3.0 produces are byte-identical to 1.2.1's, so any diff you observe
across the upgrade did **not** originate here. Rule this library out and look at the rest of the
change set.

Worth confirming with your own inputs rather than taking it on faith — run a representative sample
of your real values through both versions and diff the returned strings. The code path is a
per-character map lookup, so parity on the fixture set predicts parity generally, but a direct check
on your data is cheap.

## What did not change

- **Zero runtime dependencies.** Still none, and this is a deliberate constraint on the package.
- **React is not a dependency, a peer dependency, or a requirement.** The library is
  framework-agnostic vanilla JS that returns a string. "React 19 compatible" here means the module
  output can be consumed by a modern React 19 build — it does not imply any React coupling.
- **The public API.** `generateBarcode(value?, opts?)` with `spacing`, `raw`, and `height`, and the
  same defaults. See the API reference in [README.md](README.md).
- **The UMD build still ships**, as `index.umd.js`.

## Upgrade checklist

- [ ] Every environment that installs this package runs Node 24 or newer — local, CI agents,
      container base images, and any build/publish step.
- [ ] Every manifest declaring the dependency is accounted for, including container and
      per-environment manifests and any lockfile in a subdirectory.
- [ ] Node 24 lands **before** the version bump if both are in flight.
- [ ] No path-based import of the package remains — grep for `barcode-generator/`.
- [ ] No `.default` was added to a `require()` of this package.
- [ ] Any `<script>`-tag usage reads `barcodeGenerator`, not `index.js`.
- [ ] A rendered-output check passed in the environment you deploy to, not only in dev.
