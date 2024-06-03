const result_type = /\s{4}(流局|.{1,2}満|\d{2,3}符)/g
const end = /---- 試合結果 ----/g

export class Game{
    private name:   string[] = new Array()
    private sc:     number[] = new Array(3).fill(350)
    private diff:   number[] = new Array(3).fill(1)
    private tmpData: (string | number)[][] = []
    public readonly wData: (string | number)[][] = []
    
    public add(l: string):void {
        if (l.match(/=====/g)) this.gameStart(l)
        else if (l.match(/\s\s.*\[1\]/g)) this.setName(l)
        else if (l.match(/[東南西]\d局/g)) this.result(l)
        else if (l.match(/  ---- 試合結果 ----/g)) this.end()
    }

    private gameStart(l: string): void{
        this.name = new Array()
        this.sc = new Array(3).fill(350)
        this.tmpData = []
    }
    private setName(l:string):void{
        this.name = l.replaceAll(/.*35000\s|\/.*?R\d{4}|\[\d\]/g, "").split(" ")

    }
    private result(l: string): void{
        const kyoku = l.match(/[東南西]\d/g)![0]
            .replace("東", "0")
            .replace("南", "3")
            .replace("西", "6")
        const nums = kyoku.split("")
        const kyokuID = Number(nums[0]) + Number(nums[1]) - 1
        
        const honba = l.match(/\d本場/g)![0]
        const honbaID = honba.split('')[0]
        
        const kyotaku = l.match(/リーチ\d/g)![0]
        const kyotakuID = kyotaku.split("")[3]

        const c = this.findClassifier()
        if (c === -1) throw new Error("Unexpected classifier");
        this.tmpData.push([kyokuID, honbaID, kyotakuID, ...this.sc, parseInt(kyotakuID)*10 + this.sc.reduce(function(s, e){
            return s + e}, 0), c]) // before kyoku starts

        const data = l.replace(/.+?\d\)\s/g, '').split(" ")
        while (data.length > 1) {
            data.shift()
            const id = this.name.indexOf(data.shift()!)
            this.sc[id] += Math.round(Number(data[0])/100)
        }
    }
    private end(): void{
        const c = this.findClassifier()
        if (c === -1) throw new Error("Unexpected classifier");
        
        for (let i = 0; i < this.tmpData.length; i++) {
            this.tmpData[i].push(c)
        }
        this.wData.push(...this.tmpData)

    }
    private findClassifier() {
        let orders: Array<number> = [0, 0]
        const top = this.sc.indexOf(Math.max(...this.sc))
        orders[0] = top
        const las = this.sc.lastIndexOf(Math.min(...this.sc))
        orders[1] = las        
        
        const cls = ["02", "01", "12", "10", "21", "20"]
        return cls.indexOf(orders.join(""))
    }

    private findRank(i: number){
        const top = this.sc.indexOf(Math.max(...this.sc))
        const las = this.sc.lastIndexOf(Math.min(...this.sc))
        if(i == top) return 0
        if(i == las) return 2
        return 1
    }
}
