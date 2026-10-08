// 现代合成旅后勤/维修/救护系统 v1.2
// 游戏化抽象：人员分为在位、可救治伤员、永久损失；装备分为可用、轻/中/重度待修、损毁。
export function applyModernCombatLoss(u, damage) {
  if (!u) return null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const maxS=Math.max(1,Number(u.maxStrength??100)), frac=clamp(Math.max(0,Number(damage||0))/maxS,0,1);
  const pmax=Math.max(1,Number(u.maxManpower??u.manpower??100)), beforeManpower=Math.max(0,Number(u.manpower??pmax));
  const pf={tank:.34,amphibious_armor:.36,mechanized_infantry:.55,wheeled_infantry:.58,motorized_infantry:.68,infantry:.78,special_forces:.62,artillery:.45,air_defense:.42,recon:.52,engineer:.62,support:.55,supply:.50,headquarters:.38}[u.type]??.60;
  let personnelLoss=damage>0?Math.max(1,Math.round(pmax*frac*pf)):0; personnelLoss=Math.min(beforeManpower,personnelLoss);
  const recoverable=Math.min(personnelLoss,Math.round(personnelLoss*.62));
  const permanent=personnelLoss-recoverable;
  u.manpower=Math.max(0,beforeManpower-personnelLoss); u.woundedRecoverable=Number(u.woundedRecoverable??0)+recoverable; u.permanentCasualties=Number(u.permanentCasualties??0)+permanent;

  const equipmentLosses=[];
  for(const e of (Array.isArray(u.equipment)?u.equipment:[])){
    e.repairQueue??={minor:0,medium:0,heavy:0};
    const initial=Math.max(0,Number(e.initial??e.operational??0)), before=Math.max(0,Number(e.operational??0));
    if(!initial||!before||damage<=0){equipmentLosses.push({name:e.name??e.type,before,after:before,damaged:0,destroyed:0});continue;}
    const raw=initial*frac*.82; let hits=Math.floor(raw); const rem=raw-hits;
    const key=String(u.id??u.name??'unit'),hash=[...key].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0),threshold=((hash+Math.round(damage*17)+before*13)%100)/100;
    if(rem>threshold)hits++; if(!hits&&frac>=.18)hits=1; hits=Math.min(before,Math.max(0,hits));
    const destroyed=Math.min(hits,Math.max(0,Math.round(hits*.38))), repairable=hits-destroyed;
    let minor=0,medium=0,heavy=0;
    for(let i=0;i<repairable;i++){const roll=(hash+Math.round(damage*11)+i*29)%100;if(roll<38)minor++;else if(roll<78)medium++;else heavy++;}
    e.operational=before-hits; e.destroyed=Number(e.destroyed??0)+destroyed; e.damaged=Number(e.damaged??0)+repairable;
    e.repairQueue.minor+=minor;e.repairQueue.medium+=medium;e.repairQueue.heavy+=heavy;
    equipmentLosses.push({name:e.name??e.type,before,after:e.operational,damaged:repairable,destroyed,minor,medium,heavy});
  }
  const eq=u.equipment??[], ei=eq.reduce((n,e)=>n+Number(e.initial??0),0), eo=eq.reduce((n,e)=>n+Number(e.operational??0),0);
  u.strength=Math.max(0,Math.round(maxS*Math.min(u.manpower/pmax,ei?eo/ei:1)));
  if(u.manpower<=0||(ei>0&&eo<=0)){u.strength=0;u.destroyed=true;if(u.engineeringTask)u.engineeringTask=null;}
  return {personnelLoss,recoverable,permanent,beforeManpower,afterManpower:u.manpower,equipmentLosses,afterStrength:u.strength,destroyed:u.destroyed===true};
}

export class ModernLogisticsSystem{
 constructor({getUnits,getTurn}={}){this.getUnits=getUnits??(()=>[]);this.getTurn=getTurn??(()=>1);this.log=[];}
 dist(a,b){const dq=+a.q-+b.q,dr=+a.r-+b.r;return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
 alive(u){return !!u&&u.destroyed!==true&&u.offMap!==true&&Number(u.manpower??u.strength??1)>0;}
 side(u){
  if(!u)return '';
  // Modern exercise/scenario side is authoritative. National faction is only a legacy fallback.
  for(const raw of [u.side,u.team,u.camp,u.playerSide]){
   const v=String(raw??'').trim().toLowerCase();
   if(v==='red'||v==='红方')return 'red';
   if(v==='blue'||v==='蓝方')return 'blue';
  }
  const faction=String(u.faction??'').trim().toLowerCase();
  const legacy={red:'red',blue:'blue',chn:'red',jpn:'blue',china:'red',japan:'blue',chinese:'red',japanese:'blue'};
  return legacy[faction]??faction;
 }
 sameSide(a,b){const x=this.side(a),y=this.side(b);return !!x&&!!y&&x===y;}
 isProvider(u){return this.alive(u)&&(['supply','support'].includes(u.type)||u.logisticsProvider===true);}
 ensure(u){if(!u)return u;u.maxAmmo=Math.max(1,Number(u.maxAmmo??100));u.maxFuel=Math.max(1,Number(u.maxFuel??100));u.ammo=Math.max(0,Math.min(u.maxAmmo,Number(u.ammo??u.ammunition??u.maxAmmo)));u.ammunition=u.ammo;u.fuel=Math.max(0,Math.min(u.maxFuel,Number(u.fuel??u.maxFuel)));
  // 所有依赖机动车辆的步兵统一进入油弹体系；按类型、装备和名称三重识别，避免场景模板漏字段。
  const mechText=[u.type,u.unitType,u.equipmentType,u.equipmentName,u.name,u.fullName,...(Array.isArray(u.equipment)?u.equipment.flatMap(e=>[e?.name,e?.type]):[])].filter(Boolean).join(' ');
  const vehicleInfantry=/mechanized_infantry|wheeled_infantry|motorized_infantry|armored_infantry|high_mobility_infantry|机械化步兵|装甲步兵|装步|高机动步兵|摩托化步兵|轮式步兵|步兵战车|装甲输送车|ZBD[- ]?0?4|ZBD[- ]?0?5|ZBL[- ]?0?8|CSK[- ]?181/i.test(mechText);
  if(vehicleInfantry && !u.modern) u.modern={c2:100,intelLevel:0,supply:Number(u.supply??100),ammo:u.ammo,fuel:u.fuel,parentHQ:u.parentHQ??null};
  if(/两栖|ZBD[- ]?0?5/i.test(mechText)){u.movementClass='amphibious';u.amphibious=true;}
  else if(/wheeled_infantry|motorized_infantry|high_mobility_infantry|高机动步兵|摩托化步兵|轮式步兵|ZBL[- ]?0?8|CSK[- ]?181/i.test(mechText))u.movementClass='wheeled';
  else if(vehicleInfantry&&u.movementClass!=='amphibious')u.movementClass='tracked';
  u.woundedRecoverable=Math.max(0,Number(u.woundedRecoverable??0));u.permanentCasualties=Math.max(0,Number(u.permanentCasualties??0));
  for(const e of (u.equipment??[])){e.repairQueue??={minor:Number(e.damaged??0),medium:0,heavy:0};e.damaged=Number(e.repairQueue.minor||0)+Number(e.repairQueue.medium||0)+Number(e.repairQueue.heavy||0);}
  if(this.isProvider(u)){const brigade=u.type==='supply'||u.repairLevel>=3;u.repairLevel??=brigade?3:2;u.medicalCapacity??=brigade?12:6;u.logisticsCapacity??={ammo:brigade?320:180,fuel:brigade?380:220,parts:brigade?180:90,medical:brigade?80:40,engineerKits:brigade?60:30};u.logisticsCapacity.engineerKits??=brigade?60:30;u.logisticsStock??={...u.logisticsCapacity};u.logisticsStock.medical??=u.logisticsCapacity.medical;u.logisticsStock.engineerKits??=u.logisticsCapacity.engineerKits;u.logisticsRadius??=brigade?5:3;} return u;}
 crewPerEquipment(u,e){const n=String(e?.name??e?.type??'').toLowerCase();if(u?.type==='tank'||/坦克|突击车/.test(n))return 4;if(/步兵战车|装甲车|输送/.test(n))return 7;if(u?.type==='artillery'||/榴弹炮|火炮/.test(n))return 5;if(u?.type==='air_defense'||/防空/.test(n))return 4;if(/无人机/.test(n))return 3;if(['support','supply','engineer','headquarters','recon'].includes(u?.type))return 3;return 2;}
 crewableOperational(u,e){const op=Math.max(0,Number(e?.operational??0)),crew=this.crewPerEquipment(u,e),available=Math.max(0,Number(u?.manpower??0));return Math.min(op,Math.floor(available/Math.max(1,crew)));}
 equipmentRatio(u){const es=u?.equipment??[];if(!es.length)return 1;const m=es.reduce((s,e)=>s+Number(e.initial??0),0),o=es.reduce((s,e)=>s+this.crewableOperational(u,e),0);return m?o/m:1;}
 syncCombatStrength(u){if(!u)return;const pm=Math.max(1,+u.maxManpower||100),p=Math.max(0,+u.manpower||0);for(const e of (u.equipment??[])){e.crewedOperational=this.crewableOperational(u,e);e.uncrewed=Math.max(0,Number(e.operational??0)-e.crewedOperational);}const er=this.equipmentRatio(u),ratio=Math.min(p/pm,er);u.strength=Math.round((+u.maxStrength||100)*ratio);if(p<=0||er<=0){u.strength=0;u.destroyed=true;if(u.engineeringTask)u.engineeringTask=null;}}
 consumeMove(u,cost=1){this.ensure(u);if(!u||u.movementClass==='foot')return{ok:true,used:0};const rate={tracked:4.8,wheeled:3.2,amphibious:5.6}[u.movementClass]??2.4,used=Math.max(2,Math.round((+cost||1)*rate));u.fuel=Math.max(0,u.fuel-used);return{ok:u.fuel>0,used};}
 consumeAttack(u){this.ensure(u);const used=u.type==='artillery'?28:(['tank','amphibious_armor'].includes(u.type)?16:10);u.ammo=Math.max(0,u.ammo-used);u.ammunition=u.ammo;return used;}
 canOperate(u){this.ensure(u);if(u.ammo<=0)return{ok:false,reason:'弹药耗尽'};if(u.movementClass!=='foot'&&u.fuel<=0)return{ok:false,reason:'燃油耗尽'};return{ok:true};}
 applyLoss(u,d){this.ensure(u);return applyModernCombatLoss(u,d);}
 providersFor(u){const targetSide=this.side(u);if(!targetSide)return[];return this.getUnits().filter(x=>x!==u&&this.isProvider(x)&&this.side(x)===targetSide).map(x=>({u:x,d:this.dist(x,u)})).filter(x=>x.d<=Number(x.u.logisticsRadius??3)).sort((a,b)=>a.d-b.d);}
 selfRepair(u){let repaired=0;for(const e of (u.equipment??[])){const q=e.repairQueue??{};const n=Math.min(Number(q.minor||0),1);if(n){q.minor-=n;e.damaged-=n;e.operational=Number(e.operational||0)+n;repaired+=n;}}this.syncCombatStrength(u);return repaired;}
 repairWith(provider,u){if(!this.sameSide(provider,u))return{repaired:0,partsUsed:0,blocked:true,reason:'禁止维修敌方单位'};this.ensure(provider);this.ensure(u);const stock=provider.logisticsStock,level=Number(provider.repairLevel??2);let repaired=0,partsUsed=0;for(const e of (u.equipment??[])){const q=e.repairQueue??{};for(const [sev,cost,needLevel,cap] of [['minor',2,1,3],['medium',6,2,2],['heavy',14,3,1]]){if(level<needLevel)continue;const available=Number(q[sev]||0),n=Math.min(available,cap,Math.floor(Number(stock.parts||0)/cost));if(n>0){q[sev]-=n;e.damaged=Math.max(0,Number(e.damaged||0)-n);e.operational=Number(e.operational||0)+n;stock.parts-=n*cost;partsUsed+=n*cost;repaired+=n;}}}this.syncCombatStrength(u);return{repaired,partsUsed};}
 treatWounded(provider,u){if(!this.sameSide(provider,u))return 0;this.ensure(provider);this.ensure(u);const stock=provider.logisticsStock,capacity=Math.max(0,Number(provider.medicalCapacity??0));const n=Math.min(Number(u.woundedRecoverable||0),capacity,Math.floor(Number(stock.medical||0)/2));if(n<=0)return 0;u.woundedRecoverable-=n;u.manpower=Math.min(Number(u.maxManpower||u.manpower+n),Number(u.manpower||0)+n);stock.medical-=n*2;this.syncCombatStrength(u);return n;}
 service(provider,u){if(!this.sameSide(provider,u))return{ammo:0,fuel:0,engineerKits:0,repaired:0,partsUsed:0,treated:0,blocked:true,reason:'禁止保障敌方单位'};this.ensure(provider);this.ensure(u);const st=provider.logisticsStock;let ammo=Math.min(Math.max(0,u.maxAmmo-u.ammo),24,st.ammo),fuel=Math.min(Math.max(0,u.maxFuel-u.fuel),30,st.fuel);u.ammo+=ammo;u.ammunition=u.ammo;st.ammo-=ammo;u.fuel+=fuel;st.fuel-=fuel;let engineerKits=0;if(Number.isFinite(Number(u.maxEngineerKits))){u.engineerKits=Math.max(0,Number(u.engineerKits??u.maxEngineerKits));engineerKits=Math.min(Math.max(0,Number(u.maxEngineerKits)-u.engineerKits),6,Number(st.engineerKits??0));u.engineerKits+=engineerKits;st.engineerKits-=engineerKits;}const rr=this.repairWith(provider,u),treated=this.treatWounded(provider,u);return{ammo,fuel,engineerKits,repaired:rr.repaired,partsUsed:rr.partsUsed,treated};}
 processTurn(){const us=this.getUnits();us.forEach(u=>this.ensure(u));const reports=[];for(const u of us){if(!this.alive(u)||this.isProvider(u))continue;const self=this.selfRepair(u);const providers=this.providersFor(u);const p=providers[0]?.u;let r={ammo:0,fuel:0,repaired:0,treated:0};if(p)r=this.service(p,u);const rp=providers.map(x=>x.u).sort((a,b)=>Number(b.repairLevel??0)-Number(a.repairLevel??0))[0];let deepRepair=0;if(rp&&rp!==p&&Number(rp.repairLevel??0)>Number(p?.repairLevel??0)){deepRepair=this.repairWith(rp,u).repaired;}if(self||r.ammo||r.fuel||r.engineerKits||r.repaired||r.treated||deepRepair)reports.push({unit:u,provider:p,repairProvider:rp,selfRepaired:self,deepRepair,...r});}
  for(const p of us.filter(x=>this.isProvider(x))){this.ensure(p);const c=p.logisticsCapacity,s=p.logisticsStock;s.ammo=Math.min(c.ammo,s.ammo+35);s.fuel=Math.min(c.fuel,s.fuel+45);s.parts=Math.min(c.parts,s.parts+15);s.medical=Math.min(c.medical,s.medical+10);s.engineerKits=Math.min(c.engineerKits,s.engineerKits+8);}this.log.push({turn:this.getTurn(),reports});return reports;}
 summary(u){this.ensure(u);const eq=(u.equipment??[]).map(e=>{const q=e.repairQueue??{};const unit=/炮|榴弹/.test(e.name??'')?'门':(/套件|无人机/.test(e.name??'')?'套':'辆');return`${e.name??e.type} ${e.crewedOperational??e.operational??0}/${e.initial??0}${unit}${Number(e.uncrewed??0)>0?`（待配员${e.uncrewed}）`:''}（轻修${q.minor||0}·中修${q.medium||0}·重修${q.heavy||0}·损毁${e.destroyed??0}）`;}).join('；');return{equipment:eq||'—',ammo:Math.round(u.ammo),maxAmmo:Math.round(u.maxAmmo??100),fuel:Math.round(u.fuel),maxFuel:Math.round(u.maxFuel??100),wounded:Math.round(u.woundedRecoverable||0),permanent:Math.round(u.permanentCasualties||0),stock:u.logisticsStock};}
}
