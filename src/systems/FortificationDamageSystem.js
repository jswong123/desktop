// 通用工事损伤系统 v0.24.0
// 航空、炮兵、爆破等系统均可调用；统一处理工事、城墙与桥梁耐久。
export class FortificationDamageSystem {
  constructor(world){this.world=world;}
  defaults(type='fieldworks'){
    const t=String(type).toLowerCase();
    if(t==='foxhole')return {hp:30,armor:.10};
    if(t==='trench')return {hp:60,armor:.25};
    if(t==='strongpoint')return {hp:90,armor:.38};
    if(t==='bunker')return {hp:150,armor:.60};
    if(t==='aa_position_1')return {hp:50,armor:.22};
    if(t==='aa_position_2')return {hp:80,armor:.38};
    if(t==='aa_position_3')return {hp:120,armor:.52};
    if(t.includes('historic_wall'))return {hp:260,armor:.68};
    if(t.includes('wall'))return {hp:110,armor:.48};
    return {hp:75,armor:.30};
  }
  ensureFort(f){const d=this.defaults(f?.type);if(!Number.isFinite(+f.maxHp))f.maxHp=d.hp;if(!Number.isFinite(+f.hp))f.hp=+f.maxHp;if(!Number.isFinite(+f.armor))f.armor=d.armor;this.update(f);return f;}
  update(f){const max=Math.max(1,+f.maxHp||1),hp=Math.max(0,Math.min(max,+f.hp||0));f.hp=hp;f.integrity=Math.round(hp/max*100);f.status=hp<=0?'destroyed':hp/max<=.35?'heavily_damaged':hp/max<.75?'damaged':'intact';return f;}
  damageFort(f,power=0,precision=1){this.ensureFort(f);const raw=Math.max(0,+power||0)*Math.max(.1,+precision||1);const dmg=Math.max(0,Math.round(raw*(1-Math.min(.85,+f.armor||0))));f.hp=Math.max(0,f.hp-dmg);this.update(f);return {damage:dmg,destroyed:f.hp<=0,integrity:f.integrity};}
  fortAt(q,r){return (this.world?.fortifications??[]).find(f=>+f.q===+q&&+f.r===+r&&!['destroyed'].includes(String(f.status)));}
  bridgeAt(q,r){return (this.world?.bridges??[]).find(b=>+b.q===+q&&+b.r===+r||(b.crossingCells??[]).some(c=>+c[0]===+q&&+c[1]===+r));}
  damageBridge(b,power=0,precision=1){if(!b)return {damage:0,destroyed:false};const pontoon=String(b.bridgeClass??'').toLowerCase()==='pontoon';if(!Number.isFinite(+b.maxHp))b.maxHp=pontoon?35:120;if(!Number.isFinite(+b.hp))b.hp=+b.maxHp;const armor=pontoon?.05:.28;const dmg=Math.max(0,Math.round((+power||0)*(+precision||1)*(1-armor)));b.hp=Math.max(0,b.hp-dmg);b.integrity=Math.round(b.hp/b.maxHp*100);const r=b.hp/b.maxHp;b.status=b.hp<=0?'destroyed':r<.40?'heavily_damaged':r<.75?'damaged':'intact';return {damage:dmg,destroyed:b.hp<=0,integrity:b.integrity,status:b.status,hp:b.hp,maxHp:b.maxHp};}
  damageWallsAt(q,r,power=0,precision=1){let total=0,destroyed=0;for(const w of (this.world?.wallEdges??[])){const hit=(+w.from?.q===+q&&+w.from?.r===+r)||(+w.to?.q===+q&&+w.to?.r===+r);if(!hit)continue;const historic=String(w.type??'').includes('historic');if(!Number.isFinite(+w.maxHp))w.maxHp=historic?260:110;if(!Number.isFinite(+w.hp))w.hp=+w.maxHp;const armor=historic?.68:.48;const dmg=Math.round((+power||0)*(+precision||1)*(1-armor));w.hp=Math.max(0,w.hp-dmg);w.integrity=Math.round(w.hp/w.maxHp*100);const ratio=w.hp/w.maxHp;w.status=w.hp<=0?'destroyed':ratio<.40?'heavily_damaged':ratio<.75?'damaged':'intact';w.breach=w.hp<=0;total+=dmg;if(w.hp<=0)destroyed++;}return {damage:total,destroyed};}
  repairFort(f,amount=30){this.ensureFort(f);f.hp=Math.min(f.maxHp,f.hp+Math.max(1,+amount||30));this.update(f);return f;}
}
