import sqlite3 from 'sqlite3'
import * as readline from "readline" 
import * as fs from "fs";
const db = new sqlite3.Database('sanmadb.db')

export async function game(ls: string[], gameId: number): Promise<DB>{
    const d: DB = initDbObj(gameId)
    
    gameStart(ls.shift(), d)
    setName(ls.shift(), d)

    const kyokuInfos = splitByKyoku(ls, d)
    const endOrderArr = kyokuInfos.pop()

    for (let i = 0; i < kyokuInfos.length; i++) {
        kyoku(kyokuInfos[i], i, d)
    }
    
    d.Score.Pt = d.records[d.records.length-1].EndPt
    d.Score.Order = endOrderArr.join('')

    return d
}

export function addGameToDB(allData: DB[]) {
    let placeholders = allData.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(', ');
    let query = `INSERT INTO Game
    (ID, Date, P1, P2, P3, 
    P1Dan, P2Dan, P3Dan, P1R, P2R, P3R, Orders) VALUES ` + placeholders;
    let flatData:Array<string|number|Date> = [];
    allData.forEach((d) => {
        flatData.push(
            d.GameId,
            d.Date,
            d.PlayerInfo.Name[0],
            d.PlayerInfo.Name[1],
            d.PlayerInfo.Name[2],
            d.PlayerInfo.Dan[0],
            d.PlayerInfo.Dan[1],
            d.PlayerInfo.Dan[2],
            d.PlayerInfo.Rate[0],
            d.PlayerInfo.Rate[1],
            d.PlayerInfo.Rate[2],
            d.Score.Order
        )});

    db.serialize(function(){
        db.run(query, flatData, function(err){
            if(err) throw err;
        });
    });

}

export function addKyokuToDB(allData: DB[]) {
    //局数数えてやらんと
    let placeholders = allData.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(', ');
    let query = `INSERT INTO Kyoku(
        GameID, ID, Kyoku, Honba, Kyotaku, Oya,
        InitPt0, InitPt1, InitPt2,
        DeltaPt0, DeltaPt1, DeltaPt2,
        EndPt0, EndPt1, EndPt2,
        Dora, Ura,
        Haipai0, Haipai1, Haipai2,
        Plays, Endtype) 
        VALUES ` + placeholders;
    let flatData:Array<string|number> = [];
    allData.forEach((d) => {
        for (let i = 0; i < d.records.length; i++) {
            const k = d.records[i]
            flatData.push(
                d.GameId,
                k.KyokuId,
                k.Kyoku,
                k.Honba,
                k.Kyotaku,
                k.Kyoku%3,
                ...k.InitPt,
                ...k.DeltaPt,
                ...k.EndPt,
                k.Dora,
                k.UraDora,
                ...k.Haipai,
                k.Plays,
                k.EndType
            )}
    })
    db.serialize(function(){
        db.run(query, flatData, function(err){
            if(err) throw err;
        });
    })
}

export function addHoraToDB(allData:DB[]) {
    const placeholderArr:string[] = []
    let flatData:Array<string|number|boolean> = [];
    
    allData.forEach(d=>{
        for (let i = 0; i < d.records.length; i++) {
            placeholderArr.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            const k = d.records[i]
            for (let j = 0; j < k.HoraData.length; j++) {
                flatData.push(
                    d.GameId,
                    k.KyokuId,
                    k.HoraData[j].PID,
                    k.HoraData[j].Oya,
                    k.HoraData[j].Type,
                    k.HoraData[j].Mangan,
                    k.HoraData[j].Han,
                    k.HoraData[j].Fu,
                    k.HoraData[j].Ten,
                    k.DeltaPt[k.HoraData[j].PID],
                    k.HoraData[j].Yakus
                )
            }
        }
    })
    const placeholders = placeholderArr.join(', ')
    let query = `INSERT INTO Hora(
        GameID, KyokuID, PID, Oya, EndType, Mangan, Han, Fu, Ten, DeltaPt, Yaku) 
        VALUES ` + placeholders;

    db.serialize(function(){
        db.run(query, flatData, function(err){
            if(err) throw err;
        });
    })
}

function initDbObj(gameId: number): DB{
    const d: DB = {}
    d.GameId = gameId
    d.RuleName = "三鳳南喰赤"
    d.PlayerInfo = {
            Rate: [],
            Name: [],
            Dan: []
    }
    d.Score = {}
    d.records = []
    return d
}

function gameStart(l: string, d: DB): void { 
    d.Date = new Date(l.split(" ")[5])
    const paihuLink = l.split(" ")[6].replaceAll(/.*log=|&tw=0/g, "")
    db.run(`INSERT INTO Paihu(GameID, PaihuID) Values(?,?)`,
                [d.GameId, paihuLink])
}

function setName(l :string, d: DB): void{        
    const line = l.replaceAll(/.*35000\s|\[\d\]/g, "").split(/\s+/)
    for (let i = 0; i < 3; i++) {
        d.PlayerInfo.Rate[i] = Number(line[i*2+1].substring(1))
        const NameDan = line[i*2].split("/")
        NameDan.pop() //男|女
        d.PlayerInfo.Dan[i] = danNameToNum(NameDan.pop())
        d.PlayerInfo.Name[i] = NameDan.join('/')
    }
}

function splitByKyoku(ls: string[], d: DB): string[][]{
    const kyokus: string[][] = []
    let chunk: string[] = []
    while(true){
        const line = ls.shift()
        if (line.match(/---- 試合結果 ----/g)){
            const end: string[] = []
            for (let i = 0; i < 3; i++) {
                end.push(ls[i].split(' ')[3])
            }
            const order = []
            for (let i = 0; i < 3; i++) {
                order.push(end.indexOf(d.PlayerInfo.Name[i]).toString())
            }
            kyokus.push(order)
            break
        }
        if (line===""){
            kyokus.push(chunk)
            chunk = []
        }
        else chunk.push(line)
    } 
    return kyokus
}
function kyoku(ls: string[], id: number, d: DB) {
    const k: Kyoku = {}
    let isDoubleRon = 0
    k.DeltaPt = [0, 0, 0]
    k.EndPt = [0, 0, 0]
    k.EndPt = [0, 0, 0]
    k.Haipai = []
    k.KyokuId = id

    const kyokuInfo = ls[0].split(" ")
    const kyoku = kyokuInfo[2].replace("東", "0").replace("南", "3").replace("西", "6")
    const nums = kyoku.split("")
    k.Kyoku = Number(nums[0]) + Number(nums[1]) - 1
    k.Honba = Number(kyokuInfo[3].match(/\d/g)[0])
    k.Kyotaku = Number(kyokuInfo[3].match(/\d/g)[1])

    if(k.Kyoku === 0) k.InitPt = [350, 350, 350]
    else k.InitPt = d.records[d.records.length-1].EndPt
    
    //Doubleron?
    if(ls[2].match(/[東南西]\d局/g)) isDoubleRon = 1   
    k.HoraData = []
    
    for (let i = 0; i < 1 + isDoubleRon; i++) {
        const hora0 = ls.shift()
        const hora1 = ls.shift()
        const ptChanges = hora0.replace(/.+?\d\)\s/g, '').split(" ")
        ptChanges.shift()//remove ""
        let PID

        const pName = d.PlayerInfo.Name
        while (ptChanges.length) {
            const id = pName.indexOf(ptChanges.shift())
            const del = Number(ptChanges.shift())/100
            k.DeltaPt[id] += del
            if(del>0) PID = id
        }
        
        k.EndType = hora1.split(" ")[4]

        if(!hora1.split(" ")[4].match(/流局/)){
            k.HoraData[i] = {}
            k.HoraData[i].PID = PID
            k.HoraData[i].Oya = isOya(PID, k.Kyoku)
            const yakus = hora1.split(" ")
            if(yakus[4].match("満")) k.HoraData[i].Mangan = mangans(yakus[4])
            else{
                const hd = yakus[4].split(/[符点飜]/)
                k.HoraData[i].Fu  = Number(hd[0])
                k.HoraData[i].Ten = Number(hd[1])
                k.HoraData[i].Han = Number(hd[2])
            }
            k.HoraData[i].Type = yakus[4].match(/ロン|ツモ/)[0]
            k.HoraData[i].Yakus = YakuStrToList(yakus.slice(5).join(' '))
        }
    }
    for (let j = 0; j < 3; j++) k.EndPt[j] = k.InitPt[j] + k.DeltaPt[j]
    for (let j = 0; j < 3; j++) k.Haipai[j] = ls.shift().slice(8)
    const doras = ls.shift().split(/\s\[|\]/)
    k.Dora =    doras[2]
    k.UraDora = doras[4]
    
    k.Plays = ""
    for (let i = 0; i < ls.length; i++) k.Plays += ls[i].replace('    * ', "")   
    
    d.records.push(k)
}

function isOya(PID: number, Kyoku: number){
    return PID === Kyoku%3
}

function mangans(str: string) {
    if(str.match("満貫")) return 1
    if(str.match("跳満")) return 1.5
    if(str.match("倍満")) return 2
    if(str.match("三倍満")) return 3
    if(str.match("役満")) return 4
    throw new Error("Invalid Mangans: " + str);
    
}

function YakuStrToList(str: string): string {
    const YakuList = [
        "立直","断幺九","門前清自摸和","自風東","自風南","自風西","場風東","場風南","場風西","役牌白","役牌發","役牌中","平和","一盃口","槍槓","嶺上開花","海底","河底","一発","ダブル立直","三色同刻","三槓子","対々和","三暗刻","小三元","混老頭","七対子","混全帯幺九","一気通貫","二盃口","純全帯幺九","混一色","清一色","ドラ","赤ドラ","北","裏ドラ","天和","地和","大三元","四暗刻","字一色","緑一色","清老頭","国士無双","小四喜","大四喜","四槓子","九蓮宝燈"]
    const res: number[] = new Array(37).fill(0)
    const y = str.split(" ")
    const hans = str.replaceAll(/\D/g, "").split('').map(n=>Number(n)).reduce((s,e)=>s+e)
    
    
    let yakumanFlg = false
    for (let i = 0; i < y.length; i++) {
        //通常役
        for (let j = 0; j < YakuList.length; j++) {
            if(y[i].match(YakuList[j])) {
                if(y[i].match(/\d/)) res[j] += Number(y[i].match(/\d/)[0])
                else {
                    res[j] = 1 //yakuman
                    yakumanFlg = true
                }
                break
            }
        }
        //風牌
        if(y[i].match(/([自場]風)|役牌/)){
            const type = y[i+1].split("")[0]            
            res[YakuList.indexOf(y[i] + type)] = 1
            i++
        }
    }
    if(!yakumanFlg && hans !== res.reduce((s,e)=>s+e)) throw new Error(`Some Yaku was not recorded: ${str}\n Yaku Array: ${res.join()}`);
    
    return res.join("")
}

function danNameToNum(s:string) {
    switch (s) {
        case "七段": return 7
        case "八段": return 8
        case "九段": return 9
        case "十段": return 10
        case "天鳳": return 11
        default:
            console.dir(s, { depth: null })
            throw new Error("Invalid 段位 " + s);                
    }
}

export function loadGames(srcFilePath: string, LIMIT:number):Promise<string[][]> {
    let rs = fs.createReadStream(srcFilePath, "utf-8");
    let rl = readline.createInterface({input: rs});
  
    return new Promise((resolve, reject) => {
        const lineList:string[] = [];
        rl.on('line', (line) => lineList.push(line))
          .on('close', async () => {
            console.log(srcFilePath.split("/").slice(-1) + " loaded.");
            const txt = await splitByGame(lineList, LIMIT)
            resolve(txt)
        });
    });
}
  
async function splitByGame(ls:string[], LIMIT:number): Promise<string[][]>{
    const games:string[][] = []
    let chunk:string[] = []
    while(ls.length){
        const line = ls.shift()      
        if (line.match(/---- 終了 ----/g)){
            games.push(chunk)
            if(LIMIT && games.length === LIMIT) break
            chunk = []
            ls.shift()
        }
        else chunk.push(line)
    }
    console.log(games.length);
    return games
}