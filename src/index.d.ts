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
