var fs = require('fs');
const SVG_PATH = './src/svg';

let config = {};

(()=>{
  fs.readdir(SVG_PATH, (err, files) => {
      files.filter(f => f.includes('.svg')).forEach(file => {
        const svg = fs.readFileSync(`${SVG_PATH}/${file}`, 'utf8')
        const filename = file.split('.')[0];
        const letter = filename === "SPACE" ? ' ' : filename.slice(0,1)

        const viewBox = svg.match(/viewBox="(.*?)"/)[1];
        const viewBoxParts = viewBox.split(' ')
        config[letter] = {
          filename: file,
          letter,
          isLower: filename.length === 2,
          raw: svg,
          viewBox: {
            raw: viewBox,
            minX: viewBoxParts[0],
            miny: viewBoxParts[1],
            width: viewBoxParts[2],
            height: viewBoxParts[3]
          },
          innerElements: svg.match(/<svg(.*?)>(.*?)<\/svg>/)[2]
        }
      })
      fs.writeFileSync('svgMap.json', JSON.stringify(config, null, 2), {encoding: 'utf8'})
  });
})()
