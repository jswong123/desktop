// EquipmentDeckSystem v0.22.4
// 通用装备卡组接口：战役/阶段可引用 equipmentDeckId；单位可持有 equipmentCards。
export class EquipmentDeckSystem {
  constructor({cards=[],decks=[]}={}){this.cards=cards;this.decks=decks;}
  card(id){return this.cards.find(c=>String(c.id)===String(id))??null;}
  deck(id){return this.decks.find(d=>String(d.id)===String(id))??null;}
  cardsForDeck(id){const d=this.deck(id);return (d?.cards??[]).map(x=>typeof x==='string'?this.card(x):x).filter(Boolean);}
  cardsForUnit(unit){return (unit?.equipmentCards??[]).map(x=>typeof x==='string'?this.card(x):x).filter(Boolean);}
  applyCard(unit,cardOrId){const c=typeof cardOrId==='string'?this.card(cardOrId):cardOrId;if(!unit||!c)return false;
    unit.equipmentCards=Array.isArray(unit.equipmentCards)?unit.equipmentCards:[];
    if(!unit.equipmentCards.some(x=>(typeof x==='string'?x:x?.id)===c.id))unit.equipmentCards.push(c.id);return true;}
  removeCard(unit,id){if(!Array.isArray(unit?.equipmentCards))return false;unit.equipmentCards=unit.equipmentCards.filter(x=>(typeof x==='string'?x:x?.id)!==id);return true;}
  validateDeck(id,year=null,faction=null){const d=this.deck(id);if(!d)return {ok:false,errors:[`未知卡组 ${id}`]};const errors=[];
    for(const c of this.cardsForDeck(id)){if(year!=null&&c.yearFrom!=null&&year<c.yearFrom)errors.push(`${c.name??c.id} 尚未服役`);if(year!=null&&c.yearTo!=null&&year>c.yearTo)errors.push(`${c.name??c.id} 已超出年代`);if(faction&&Array.isArray(c.factions)&&c.factions.length&&!c.factions.includes(faction))errors.push(`${c.name??c.id} 不属于 ${faction}`);}return {ok:!errors.length,errors};}
}
