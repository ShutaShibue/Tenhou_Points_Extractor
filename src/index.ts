import * as iconv from "iconv-lite";
import * as fs from "fs";
import * as readline from "readline" 
import { Game } from "./game";
import {paihuPath} from "./settings"
//===Config===


const game = new Game()
const paths = paihuPath
exe()
function exe() {
  if (!paths.length) return console.log("Done");
  var rs = fs.createReadStream(paths.pop()!)
    .pipe(iconv.decodeStream("shift-jis"));
  const rl = readline.createInterface({ input: rs });
  rl.on('line', (line:string) => {
    
    game.add(line)
    if(game.wData.length >= 10000) exportCSV(game.wData.splice(0, game.wData.length))

  })
  rl.on('close', () => {
    exportCSV(game.wData.splice(0, game.wData.length))
    exe()
  })
}
/*
setInterval(() => {
  if(game.wData.length == 0) exit();
  exportCSV(game.wData.splice(0, game.wData.length))
}, 1000)
*/

function exportCSV(content: Array<Array<string | number>>){
  let formatCSV = ""
  for (var i = 0; i < content.length; i++) {
      var value = content[i];

      for (var j = 0; j < value.length; j++) { var innerValue = value[j]===null?'':value[j].toString(); var result = innerValue.replace(/"/g, '""'); if (result.search(/("|,|\n)/g) >= 0)
      result = '"' + result + '"';
      if (j > 0)
      formatCSV += ',';
      formatCSV += result;
    }
    formatCSV += '\n';
  }
  fs.appendFile('./data.csv', formatCSV, 'utf8', function (err) {
    if (err) console.log('failed to save csv.')
  });
}