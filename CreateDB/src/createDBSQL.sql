CREATE TABLE Hora (
    GameID int,
    KyokuID int,
    PID int,
    Oya int,
    EndType text,
    Mangan number,
    Han int,
    Fu int,
    Ten int,
    DeltaPt int,
    Yaku text,
    foreign key(GameID, KyokuID) references Kyoku(GameID, ID)
);
  
CREATE TABLE Game (
  ID INTEGER PRIMARY KEY,
  Date date,
  P1 text,
  P2 text,
  P3 text,
  P1Dan int,
  P2Dan int,
  P3Dan int,
  P1R int,
  P2R int,
  P3R int,
  Orders text
);

CREATE TABLE Kyoku (
  GameID int,
  ID int,
  Kyoku int,
  Honba int,
  Kyotaku int,
  Oya int,
  InitPt0 int,
  InitPt1 int,
  InitPt2 int,
  DeltaPt0 int,
  Deltapt1 int,
  DeltaPt2 int,
  EndPt0 int,
  EndPt1 int,
  EndPt2 int,
  Dora int,
  Ura int,
  Haipai0 text,
  Haipai1 text,
  Haipai2 text,
  Plays text,
  EndType text,
  foreign key(GameID) references Game(ID)
);

CREATE TABLE Paihu (
  GameID int,
  PaihuID text,
  foreign key(GameID) references Game(ID)
);

-- Delete spell
delete from Game; delete from Kyoku; delete from Hora; delete from Paihu;
