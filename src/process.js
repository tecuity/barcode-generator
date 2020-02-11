var fs = require('fs');
const SVG_PATH = './svg';

let config = {};

(()=>{
  fs.readdir(SVG_PATH, (err, files) => {
      files.forEach(file => {
        const svg = fs.readFileSync(`${SVG_PATH}/${file}`, 'utf8')
        const letter = file.split('.')[0];
        const viewBox = svg.match(/viewBox="(.*?)"/)[1];
        const viewBoxParts = viewBox.split(' ')
        config[letter.slice(0,1)] = {
          filename: file,
          letter: letter.slice(0,1),
          isLower: letter.length == 2,
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
