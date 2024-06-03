import { game, addGameToDB, addHoraToDB, addKyokuToDB, loadGames} from "./game";
import {paihuPath} from "./settings"

const LIMIT = 10 //0: everything

const paths = paihuPath
const DBCollection:DB[] = []
async function exe() {
  if (!paths.length) return console.log("Done");
  const path = paths.pop()
  const raw = await loadGames(path, LIMIT)
  let rates = 0
  let nSamples = 0
  //for (let i = 0; i < raw.length; i++) DBCollection.push(await game(raw[i], i))
  for (let i = 0; i < 100; i++){
    rates += wrap(raw[i])
    nSamples += 3
  }
  console.log("nSamples: " + nSamples)
  console.log("avg: " + rates/nSamples);
  
  //addGameToDB(DBCollection)
  //addKyokuToDB(DBCollection)
  //addHoraToDB(DBCollection)
}
exe()

function wrap(ls:string[]) {
  ls.shift()
  const rate3p = setName(ls.shift())
  return rate3p
}
function setName(l :string): number{   
  let rate = 0     
  const line = l.replaceAll(/.*35000\s|\[\d\]/g, "").split(/\s+/)
  for (let i = 0; i < 3; i++) {
      rate += Number(line[i*2+1].substring(1))
  }
  return rate
}