import characterMap from "./svgMap.json";
const SPACING = 5;

const svgToDataURL = svg => {
  const encoded = Buffer.from(svg).toString("base64");
  const header = "data:image/svg+xml;base64,";

  return header + encoded;
};

const getDefaultOptions = opts => ({
  spacing: opts.spacing !== undefined ? opts.spacing : SPACING,
  raw: opts.raw === true ? true : false
})

export default (rawString = "", opts: {}) => {
  const string = `*${rawString.replace(/\*/g, '')}*`
  const options = getDefaultOptions(opts)
  const stringMap = string.split("");

  let characters = [];

  stringMap.forEach((char, i) => {
    characters.push({
      ...characterMap[char],
      x:
        i === 0
          ? 0
          : characters[i - 1].x +
            parseFloat(characters[i - 1].viewBox.width, 10) +
            options.spacing
    });
  });

  const innerElements = characters
    .map(
      (char, i) =>
        `<svg x="${char.x.toFixed(2)}">${
          char.innerElements
        }</svg>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${characters.reduce(
    (sum, char) => sum + parseFloat(char.viewBox.width, 10) + options.spacing,
    0
  )} ${characters[0].viewBox.height}">${innerElements}</svg>`;

  return options.raw ? svg : svgToDataURL(svg);
};
