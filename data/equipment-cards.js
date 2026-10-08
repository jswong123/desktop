// 装备卡组接口 v0.22.4
// 这里只定义接口与示例空卡组；具体历史装备可在后续战役中逐步填充。
export const EQUIPMENT_CARD_TYPES = Object.freeze({
  SMALL_ARMS:"small_arms", SUPPORT:"support", ARTILLERY:"artillery",
  ANTITANK:"antitank", ANTIAIR:"antiair", VEHICLE:"vehicle", TANK:"tank",
  ENGINEERING:"engineering", AIR:"air", NAVAL:"naval", LOGISTICS:"logistics"
});

export const EQUIPMENT_CARDS = [
  // 标准卡结构示例：{id,name,type,yearFrom,yearTo,factions,stats,tags,description}
];

export const EQUIPMENT_DECKS = [
  {id:"pla_civil_war_1946_1947",name:"解放战争·战略防御装备卡组",period:"1946–1947",factions:["PLA"],cards:[]},
  {id:"pla_civil_war_1947_1948",name:"解放战争·战略反攻装备卡组",period:"1947–1948",factions:["PLA"],cards:[]},
  {id:"pla_civil_war_1948_1949",name:"解放战争·战略决战装备卡组",period:"1948–1949",factions:["PLA"],cards:[]},
  {id:"pla_civil_war_1949",name:"解放战争·渡江及全国进军装备卡组",period:"1949",factions:["PLA"],cards:[]},
  {id:"pva_korea_1950_1953",name:"抗美援朝装备卡组",period:"1950–1953",factions:["PVA"],cards:[]}
];
