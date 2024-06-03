interface DB
{
    GameId?:     number
    PaihuLink?:  string
    RuleId?:     number
    RuleName?:   string
    AvgRate?:    number
    Date?:       Date
    PlayerInfo?:
    {
        Name?:   string[]
        Dan?:    number[]
        Rate?:   number[]
    }
    Score?:{
        Order?:  string
        Pt?:     number[]
    }
    records?: Kyoku[]
}

interface Kyoku
{
    KyokuId?:    number
    Kyoku?:      number
    Honba?:      number
    Kyotaku?:    number
    InitPt?:     number[]
    DeltaPt?:    number[]
    EndPt?:      number[]
    Dora?:       string
    UraDora?:    string
    EndType?:    string
    HoraData?:
    {
        PID?: number
        Oya?: boolean
        Mangan?: number
        Han?:    number
        Fu?:     number
        Ten?:   number
        Type?:   string
        Yakus?: string
    }[]
    Haipai?: string[]
    Plays?:  string
    Kawa?:   string[]
    TehaiOnEnd?: string[]
    EndJun?: number
}