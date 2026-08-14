import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fromMjs from "../dist/index.mjs";
import baseline from "./fixtures/baseline-1.2.1.json";

// Loaded through require(), not Vitest's transform, so this exercises the real published artifact.
const fromCjs = createRequire(import.meta.url)("../dist/index.cjs");

describe("parity with 1.2.1 — built bundles", () => {
  describe.each([
    ["dist/index.cjs", fromCjs],
    ["dist/index.mjs", fromMjs]
  ])("%s", (_bundle, generateBarcode) => {
    it.each(Object.keys(baseline.cases))("reproduces %s byte-for-byte", key => {
      const [input, opts] = JSON.parse(key);

      expect(generateBarcode(input, opts)).toBe(baseline.cases[key]);
    });
  });
});
