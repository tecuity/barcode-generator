import characterMap from "./svgMap.json";
const SPACING = 5;

const svgToDataURL = svg => {
  const encoded = Buffer.from(svg).toString("base64");
  const header = "data:image/svg+xml;base64,";

  return header + encoded;
};

export default (string = "") => {
  const stringMap = string.split("");

  let characters = [];

  stringMap.forEach((char, i) => {
    characters.push({
      ...characterMap[char],
      x:
        i === 0
          ? 0
          : characters[i - 1].x +
            parseFloat(characterMap[char].viewBox.width, 10) +
            SPACING
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
    (sum, char) => sum + parseFloat(char.viewBox.width, 10) + SPACING,
    0
  )} ${characters[0].viewBox.height}">${innerElements}</svg>`;

  return svgToDataURL(svg);
};
