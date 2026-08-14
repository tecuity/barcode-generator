import { describe, it, expect } from "vitest";
import generateBarcode from "../src/index.js";
import baseline from "./fixtures/baseline-1.2.1.json";

const DATA_URL_PREFIX = "data:image/svg+xml;base64,";

const decode = dataURL =>
  Buffer.from(dataURL.slice(DATA_URL_PREFIX.length), "base64").toString("utf8");

const glyphCount = svg => svg.match(/<svg x="/g).length;

describe("generateBarcode", () => {
  it("returns a base64 SVG data URL by default", () => {
    expect(generateBarcode("1234567")).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("returns raw SVG markup when raw is true", () => {
    const svg = generateBarcode("1234567", { raw: true });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox");
  });

  it("wraps the output in the Code 39 start/stop guard", () => {
    const svg = generateBarcode("ABC", { raw: true });
    const star = generateBarcode("", { raw: true });
    const guard = star.match(/<svg x="0\.00">(.*?)<\/svg>/)[1];

    expect(svg).toContain(`<svg x="0.00">${guard}</svg>`);
    expect(svg.endsWith(`${guard}</svg></svg>`)).toBe(true);
  });

  it("widens the viewBox as spacing increases", () => {
    const width = svg => parseFloat(svg.match(/viewBox="0 0 (\S+) /)[1], 10);

    expect(width(generateBarcode("1234567", { spacing: 10, raw: true }))).toBeGreaterThan(
      width(generateBarcode("1234567", { spacing: 5, raw: true }))
    );
  });

  it("sets the viewBox height from the height option", () => {
    expect(generateBarcode("1234567", { height: 200, raw: true })).toContain(
      'viewBox="0 0 867.42 200"'
    );
  });

  it("filters characters absent from the map without throwing", () => {
    expect(glyphCount(generateBarcode("A#B.C", { raw: true }))).toBe(5);
    expect(glyphCount(generateBarcode("A@B$C", { raw: true }))).toBe(5);
  });

  it("renders lowercase letters and hyphens", () => {
    expect(glyphCount(generateBarcode("abc-123", { raw: true }))).toBe(9);
  });

  it("returns a valid guard-wrapped SVG for empty input", () => {
    const svg = generateBarcode("", { raw: true });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(glyphCount(svg)).toBe(2);
  });

  it("strips an embedded * from the input", () => {
    expect(glyphCount(generateBarcode("A*B", { raw: true }))).toBe(4);
  });

  it("decodes the data URL to the same markup the raw option returns", () => {
    expect(decode(generateBarcode("HELLO WORLD"))).toBe(
      generateBarcode("HELLO WORLD", { raw: true })
    );
  });
});

describe("parity with 1.2.1", () => {
  it.each(Object.keys(baseline.cases))("reproduces %s byte-for-byte", key => {
    const [input, opts] = JSON.parse(key);

    expect(generateBarcode(input, opts)).toBe(baseline.cases[key]);
  });
});
