var rollup = require("rollup");
var babel = require("rollup-plugin-babel");
const chalk = require('chalk')
const json = require('@rollup/plugin-json')

console.log(chalk.green("Starting Build..."))

rollup.rollup({
  input: "./src/index.js",
  plugins: [ babel(), json() ]
}).then(function (bundle) {
  bundle.write({
    output: {
      dir: "dist",
      name: "index.js"
    },
    format: "umd"
  });
});
