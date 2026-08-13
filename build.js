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
