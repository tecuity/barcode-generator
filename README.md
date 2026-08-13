![](https://raw.githubusercontent.com/tecuity/barcode-generator/master/logo.png)

# barcode-generator [![](https://img.shields.io/npm/v/@tecuity/barcode-generator)](https://www.npmjs.com/package/@tecuity/barcode-generator) ![](https://img.shields.io/github/license/tecuity/barcode-generator) ![](https://img.shields.io/bundlephobia/minzip/@tecuity/barcode-generator)

Ever needed to generate a barcode in a JS-only environment? barcode-generator
generates SVG barcodes in a browser, NodeJS, or anywhere else Javascript can
run.

### Features:

- Javascript-only. No canvas or browser emulator needed
- Support for the common 3 of 9 format
- Returns a barcode as a base64 data url, or raw SVG
- Zero dependencies

### Demo Site

View a demo [here](https://tecuity.github.io/barcode-generator/)

## Installation

Requires **Node 24 or newer** (`engines.node: ">=24.0.0"`). Consumers on Node 20/22 will see an
`EBADENGINE` warning on install.

```bash
npm install @tecuity/barcode-generator
```

## Usage

For a default usage, just import and call the generator with a string like this:

```js
import generateBarcode from '@tecuity/barcode-generator'

const barcode = generateBarcode("1234567")
```

The package also ships a CommonJS build, so `require` works too:

```js
const generateBarcode = require('@tecuity/barcode-generator')

const barcode = generateBarcode("1234567")
```

And that's it! By default the generator will return a barcode as a base64-encoded
data url. Ready to pop into the `src` attribute of an `img` element.

For further customization, you can pass an options object as the second
parameter of the function like so:

```js
import generateBarcode from '@tecuity/barcode-generator'

const barcode = generateBarcode("1234567", {raw: true, spacing: 10})
```

## API Reference:

| Key     | Type           | Default | Description                                                                     |
|---------|----------------|---------|---------------------------------------------------------------------------------|
| spacing | int \|\| float | 5       | The spacing between characters, relative to the `viewBox` of the resulting SVG. |
| raw     | boolean        | false   | Returns the barcode as a raw SVG string rather than a base64 data-url.          |
| height  | int \|\| float | 172.89  | The `viewBox` height of the resulting SVG.                                      |

### TypeScript

The package ships a hand-written `index.d.ts` alongside the build, so the default export and its
options object are typed out of the box. There is no `@types/` package to install.

## Development

Requires Node 24 (`nvm use 24` — see `.nvmrc`), then `npm install`.

| Command | Description |
|---------|-------------|
| `npm run build` | Regenerates the SVG character map and bundles `dist/` (ESM + CJS + UMD + types). |
| `npm test` | Single-pass run of the Vitest suite. Watch mode is `npx vitest`. |
| `npm run test:ci` | Single-pass test run, used by CI and gated on before every release. |
| `npm run start-site` | Serves the demo-site locally. Run `npm run build` first — the site imports `dist/`. |
| `npm run build-site` | Rebuilds the `docs/` GitHub Pages bundle. |

### Releasing

| Command | Description |
|---------|-------------|
| `npm run pack:preview` | Shows exactly what the published tarball will contain. Writes no tarball. |
| `npm run release:preview` | Dry run of the release — prints the steps without publishing. |
| `npm run release -- minor` | Cuts the release (version bump, git tag, publish). Accepts any `np` bump argument. |

Releases run from `master` on Node 24 and are gated on `test:ci`. `dist/` is gitignored, so the
release flow rebuilds it automatically via the `postversion` hook.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.christopherpatty.com"><img src="https://avatars1.githubusercontent.com/u/14916515?v=4" width="100px;" alt=""/><br /><sub><b>Christopher Patty</b></sub></a><br /><a href="https://github.com/tecuity/barcode-generator/commits?author=chrisjpatty" title="Code">💻</a> <a href="https://github.com/tecuity/barcode-generator/commits?author=chrisjpatty" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
