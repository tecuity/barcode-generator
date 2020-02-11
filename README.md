![](https://github.com/tecuity/barcode-generator/blob/master/logo.png)

# barcode-generator

Ever needed to generate a barcode in a JS-only environment? barcode-generator
generates SVG barcodes in a browser, NodeJS, or anywhere else Javascript can
run.

### Features:

- Javascript-only. No canvas or browser emulator needed
- Support for the common 3 of 9 format
- Returns a barcode as a base64 data url, or raw SVG
- Zero dependencies

## Installation

```bash
npm install @tecuity/barcode-generator
```

or

```bash
yarn add @tecuity/barcode-generator
```

## Usage

For a default usage, just import and call the generator with a string like this:

```js
import generateBarcode from '@tecuity/barcode-generator'

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

| Key     | Type         | Default | Description                                                                     |
|---------|--------------|---------|---------------------------------------------------------------------------------|
| spacing | int || float | 5       | The spacing between characters, relative to the `viewBox` of the resulting SVG. |
| raw     | boolean      | false   | Returns the barcode as a raw SVG string rather than a base64 data-url.          |
