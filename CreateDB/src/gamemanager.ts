import sqlite3 from 'sqlite3'

export class Game{
    private db: sqlite3.Database
    public data: DB = {}
    private inKyoku = false
    private kyokuChunk: string[] = []
    constructor(id: number){
        this.db = new sqlite3.Database('sanmadb.db')
        this.data.GameId = id
        this.data.RuleName = "三鳳南喰赤"
        this.data.PlayerInfo = {
            Rate: [],
            Name: [],
            Dan: []
        }
        
        this.data.Score = {}
        this.data.records = []
    }
    public add(l: string):void {
        if (l.match(/=====/g)) this.gameStart(l)
        if (l.match(/\s\s.*\[1\]/g)) this.setName(l)
        if (l.match(/  ---- 試合結果 ----/g)) this.end()
        if (l.match(/[東南西]\d局/g)) this.inKyoku = true
        if (l=="") {            
            this.inKyoku = false
            if(this.kyokuChunk.length)
                    this.data.records.push(this.kyoku(this.kyokuChunk, this.data.records.length))
            this.kyokuChunk = []
        }
        if(this.inKyoku) this.kyokuChunk.push(l)
    }

    private gameStart(l: string): void { 
        this.data.PaihuLink = l.split(" ")[6].replaceAll(/.*log=|&tw=0/g, "")
        this.data.Date = new Date(l.split(" ")[5])
        this.data.GameId++
        this.db.run(`INSERT INTO Paihu(GameID, PaihuID) Values(?,?)`,
                    [this.data.GameId, this.data.PaihuLink])
    }
    private setName(l:string): void{        
        const d = l.replaceAll(/.*35000\s|\[\d\]/g, "").split(/\s+/)
        for (let i = 0; i < 3; i++) {
            this.data.PlayerInfo.Rate[i] = Number(d[i*2+1].substring(1))
            const NameDan = d[i*2].split("/")
            NameDan.pop() //男|女
            this.data.PlayerInfo.Dan[i] = this.danNameToNum(NameDan.pop())
            this.data.PlayerInfo.Name[i] = NameDan.join('/')
        }
    }
    private kyoku(l: string[], id:number){        
        const d: Kyoku = {}
        let isDoubleRon = 0
        d.DeltaPt = [0, 0, 0]
        d.EndPt = [0, 0, 0]
        d.EndPt = [0, 0, 0]
        d.Haipai = []
        d.KyokuId = id

        const kyokuInfo = l[0].split(" ")
        const kyoku = kyokuInfo[2].replace("東", "0").replace("南", "3").replace("西", "6")
        const nums = kyoku.split("")
        d.Kyoku = Number(nums[0]) + Number(nums[1]) - 1
        d.Honba = Number(kyokuInfo[3].match(/\d/g)[0])
        d.Kyotaku = Number(kyokuInfo[3].match(/\d/g)[1])

        if(d.Kyoku === 0) d.InitPt = [350, 350, 350]
        else d.InitPt = this.data.records[this.data.records.length-1].EndPt
        
        //Doubleron?
        if(l[2].match(/[東南西]\d局/g)) isDoubleRon = 1   
        d.HoraData = []
        
        for (let i = 0; i < 1 + isDoubleRon; i++) {
            const hora0 = l.shift()
            const hora1 = l.shift()
            const ptChanges = hora0.replace(/.+?\d\)\s/g, '').split(" ")
            ptChanges.shift()//remove ""
            let PID

            const pName = this.data.PlayerInfo.Name
            while (ptChanges.length) {
                const id = pName.indexOf(ptChanges.shift())
                const del = Number(ptChanges.shift())/100
                d.DeltaPt[id] += del
                if(del>0) PID = id
            }
            
            d.EndType = hora1.split(" ")[4]

            if(!hora1.split(" ")[4].match(/流局/)){
                d.HoraData[i] = {}
                d.HoraData[i].PID = PID
                d.HoraData[i].Oya = this.isOya(PID, d.Kyoku)
                const yakus = hora1.split(" ")
                if(yakus[4].match("満")) d.HoraData[i].Mangan = this.Mangans(yakus[4])
                else{
                    const hd = yakus[4].split(/[符点飜]/)
                    d.HoraData[i].Fu  = Number(hd[0])
                    d.HoraData[i].Ten = Number(hd[1])
                    d.HoraData[i].Han = Number(hd[2])
                }
                d.HoraData[i].Type = yakus[4].match(/ロン|ツモ/)[0]
                d.HoraData[i].Yakus = this.YakuStrToList(yakus.slice(5).join(' '))
            }
        }
        for (let j = 0; j < 3; j++) d.EndPt[j] = d.InitPt[j] + d.DeltaPt[j]
        for (let j = 0; j < 3; j++) d.Haipai[j] = l.shift().slice(8)
        const doras = l.shift().split(/\s\[|\]/)
        d.Dora =    doras[2]
        d.UraDora = doras[4]
        
        d.Plays = ""
        for (let i = 0; i < l.length; i++) d.Plays += l[i].replace('    * ', "")   
        return d
    }
    private end(): void{
        this.data.Score.Pt = this.data.records[this.data.records.length-1].EndPt
        //console.dir(this.data, { depth: null })
        this.addGameToDB()
        this.addKyokuToDB()
    }
    private addGameToDB() {
        this.db.run(`INSERT INTO Game
        (ID, Date, P1, P2, P3, 
        P1Dan, P2Dan, P3Dan, P1R, P2R, P3R) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
            this.data.GameId,
            this.data.Date,
            this.data.PlayerInfo.Name[0],
            this.data.PlayerInfo.Name[1],
            this.data.PlayerInfo.Name[2],
            this.data.PlayerInfo.Dan[0],
            this.data.PlayerInfo.Dan[1],
            this.data.PlayerInfo.Dan[2],
            this.data.PlayerInfo.Rate[0],
            this.data.PlayerInfo.Rate[1],
            this.data.PlayerInfo.Rate[2],
        ],
        (err)=>{
            if(err)(console.error(err))
        });
    }
    private addKyokuToDB() {
        this.db.serialize(() => {
            for (let i = 0; i < this.data.records.length; i++) {
                const d = this.data.records[i]
                this.db.run(
                    `INSERT INTO Kyoku(
                        GameID, ID, Kyoku, Honba, Kyotaku, Oya,
                        InitPt0, InitPt1, InitPt2,
                        DeltaPt0, DeltaPt1, DeltaPt2,
                        EndPt0, EndPt1, EndPt2,
                        Dora, Ura,
                        Haipai0, Haipai1, Haipai2,
                        Plays, Endtype) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [
                        this.data.GameId,
                        d.KyokuId,
                        d.Kyoku,
                        d.Honba,
                        d.Kyotaku,
                        d.Kyoku%3,
                        ...d.InitPt,
                        ...d.DeltaPt,
                        ...d.EndPt,
                        d.Dora,
                        d.UraDora,
                        ...d.Haipai,
                        d.Plays,
                        d.EndType
                    ],
                    (err)=>{
                        if(err){
                            console.log("Kyoku")
                            console.error(err)
                        }
                    });
                this.addHoraToDB(d)
            }
        })
    }
    private addHoraToDB(d: Kyoku) {
        for (let i = 0; i < d.HoraData.length; i++) {
            this.db.run(`INSERT INTO Hora(
                GameID, KyokuID, PID, Oya, EndType, Mangan, Han, Fu, Ten, DeltaPt, Yaku) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                this.data.GameId,
                d.KyokuId,
                d.HoraData[i].PID,
                d.HoraData[i].Oya,
                d.HoraData[i].Type,
                d.HoraData[i].Mangan,
                d.HoraData[i].Han,
                d.HoraData[i].Fu,
                d.HoraData[i].Ten,
                d.DeltaPt[d.HoraData[i].PID],
                d.HoraData[i].Yakus
            ],
            (err)=>{
                if(err){
                console.log("Hora")
                console.error(err)
                }
            })
        }
    }
    private strToPailist(s: string): number[]{
        const jihai = ["東", "南", "西", "北", "白", "発","中"]
        const l: number[] = new Array(29).fill(0)
        const chars = s.split("")
        while (chars.length) {
            let pai = []
            if(chars[0].match(/\d/)) pai = chars.splice(0,2)
            else pai = chars.splice(0,1)
    
            if(pai[0].match(/[東南西北白発中]/)) l[jihai.indexOf(pai[0]) + 22]++
            else if(pai[1] === "m") pai[0]==="1"? l[20]++ : l[21]++
            else if(pai[1] === "P") l[0]++
            else if(pai[1] === "S") l[10]++
            else{
                const type = pai[1]==="p"? 0 : 10
                l[type + Number(pai[0])]++
            }
        }
        return l
    }
    private isOya(PID: number, Kyoku: number){
        return PID === Kyoku%3
    }
    private Mangans(str: string) {
        let m
        if(str.match("満貫")) m = 1
        if(str.match("跳満")) m = 1.5
        if(str.match("倍満")) m = 2
        if(str.match("三倍満")) m = 3
        if(str.match("役満")) m = 4
        return m
    }
    private YakuStrToList(str: string) {
        const YakuList = [
            "立直","断幺九","門前清自摸和","自風東","自風南","自風西","場風東","場風南","場風西"," 役牌白","役牌發","役牌中","平和","一盃口","槍槓","嶺上開花","海底","河底","一発","ダブル立直","三色同刻","三槓子","対々和","三暗刻","小三元","混老頭","七対子","混全帯幺九","一気通貫","二盃口","純全帯幺九","混一色","清一色","ドラ","赤ドラ","北","裏ドラ","天和","地和","大三元","四暗刻","字一色","緑一色","清老頭","国士無双","小四喜","大四喜","四槓子","九蓮宝燈"]
        const res = new Array(37).fill(0)
        const y = str.split(" ")
        
        let MissTestFlg = true
        for (let i = 0; i < y.length; i++) {
            //通常役
            for (let j = 0; j < YakuList.length; j++) {
                if(y[i].match(YakuList[j])) {
                    if(y[i].match(/\d/)) res[j] += Number(y[i].match(/\d/)[0])
                    else res[j] = 1 //yakuman
                    MissTestFlg = false
                    break
                }
            }
            //風牌
            if(y[i].match(/([自場]風)|役牌/)){
                const type = y[i+1].split("")[0]
                res[YakuList.indexOf(y[i] + type)] = 1
                i++
                MissTestFlg = false
            }
            if(MissTestFlg) throw new Error("Unable to detect Yaku: " + y);
        }
        
        return res.join("")
    }
    private danNameToNum(s:string) {
        switch (s) {
            case "七段": return 7
            case "八段": return 8
            case "九段": return 9
            case "十段": return 10
            case "天鳳": return 11
            default:
                console.dir(this.data, { depth: null })
                throw new Error("Invalid 段位 " + s);                
        }
    }
}
