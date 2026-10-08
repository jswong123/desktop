export class AirSupportSystem {
  constructor({world,getUnits,getTurn,getPhase,cards,decks,aircraft,airDefense,fortificationDamage,airSuperiority,fogOfWar}){Object.assign(this,{world,getUnits,getTurn,getPhase,cards,decks,aircraft,airDefense,fortificationDamage,airSuperiority,fogOfWar});this.state={};this.cap={};this.scenario=null;}
  configure(scenario){
    this.scenario=scenario;this.state={};
    const cfg=scenario?.airSupport??scenario?.map?.airSupport??{};
    for(const side of ['red','blue','chinese','japanese','german','soviet','american','un','pla','tw_proxy']){
      const s=cfg[side];if(!s?.enabled)continue;
      // 开发者模式可直接把 cards 写入场景 JSON；旧战役仍可继续使用 deckId。
      const deck=this.decks[s.deckId];
      const cardIds=Array.isArray(s.cards)&&s.cards.length?s.cards:(deck?.cards??[]);
      const validIds=cardIds.filter(id=>this.cards[id]);
      if(!validIds.length)continue;
      this.state[side]={deckId:s.deckId??'scenario_custom',points:s.points??99,restrictions:{},nextAvailable:{},cards:Object.fromEntries(validIds.map(id=>[id,Math.max(0,Number(s.uses?.[id]??this.cards[id]?.uses??1))]))};
    }
  }
  turn(){return Math.max(1,Number(this.getTurn?.()??1));}
  grantCards(side, grants={}){
    side=this.normalizeSide(side);
    if(!this.state[side]) this.state[side]={deckId:'captured_airbase',points:99,restrictions:{},nextAvailable:{},cards:{}};
    const st=this.state[side]; let added=0;
    for(const [id,n0] of Object.entries(grants??{})){const n=Math.max(0,Math.floor(Number(n0)||0));if(!n||!this.cards[id])continue;st.cards[id]=Math.max(0,Number(st.cards[id]??0))+n;added+=n;}
    return added;
  }
  normalizeSide(v){const x=String(v??'').trim().toLowerCase();return ({pla:'pla',tw_proxy:'tw_proxy',red:'red',blue:'blue',chn:'chinese',chinese:'chinese',jpn:'japanese',japanese:'japanese',ger:'german',german:'german',ussr:'soviet',soviet:'soviet'})[x]??x;}
  rule(side,id){return this.state[side]?.restrictions?.[id]??{};}
  cardAvailability(side,id){const st=this.state[side],card=this.cards[id];if(!st||!card||!(st.cards[id]>0))return {ok:false,reason:'次数已用完'};return {ok:true};}
  available(side){const s=this.state[side];if(!s)return[];return Object.entries(s.cards).filter(([,n])=>n>0).map(([id,n])=>({...this.cards[id],remaining:n,availability:this.cardAvailability(side,id)}));}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  enemySide(side,enemies){return enemies[0]?this.normalizeSide(enemies[0].faction??enemies[0].side):'';}
  falloff(card,d){if(!card.radius)return 1;return d===0?1:Math.max(.35,1-d/(Number(card.radius)+1)*.6);}
  validateTarget(side,card,target){const r=this.rule(side,card.id),terrain=String(this.world?.terrainAt?.(+target.q,+target.r)??'plain');if(Array.isArray(r.forbiddenTerrain)&&r.forbiddenTerrain.includes(terrain))return {ok:false,message:`${card.name}不能用于${terrain}地形`};if(Array.isArray(r.allowedTerrain)&&!r.allowedTerrain.includes(terrain))return {ok:false,message:`${card.name}仅能用于指定地形`};if(r.friendlyOnly){const own=(this.getUnits?.()??[]).some(u=>u.offMap!==true&&this.normalizeSide(u.faction??u.side)===this.normalizeSide(side)&&+u.q===+target.q&&+u.r===+target.r);if(!own)return {ok:false,message:`${card.name}必须选择己方单位所在格`};}return {ok:true};}
  execute(side,cardId,target){
    const st=this.state[side],card=this.cards[cardId],av=this.cardAvailability(side,cardId);if(!av.ok)return {ok:false,message:`${card?.name??'航空卡'}：${av.reason}`};const tv=this.validateTarget(side,card,target);if(!tv.ok)return tv;
    const plane=this.aircraft[card.aircraft]??{},all=this.getUnits?.()??[],enemies=all.filter(u=>u.offMap!==true&&this.normalizeSide(u.faction??u.side)!==this.normalizeSide(side));
    const defender=this.enemySide(side,enemies),aa=this.airDefense?.threat(target,defender,plane.altitude??'low')??{score:0,sources:[],disruption:0};const air=this.airSuperiority?.enemyPressure(side,target)??{score:0,attackPenalty:0,accuracyPenalty:0,rangePenalty:0,sources:[]};
    const aaPenalty=Math.min(.70,Number(aa.disruption??aa.score/500)),attackFactor=Math.max(.18,(1-aaPenalty)*(1-air.attackPenalty)),accuracyFactor=Math.max(.25,1-air.accuracyPenalty);
    // 支援卡不设冷却、不设可用回合窗口；只消耗剩余使用次数。
    st.cards[cardId]--;
    if(card.missionType==='cap'){this.airSuperiority?.addCAP(side,target,card,plane);this.cap[side]=Number(card.duration??2);return {ok:true,message:`${card.name}已在 (${target.q},${target.r}) 建立制空区，半径${card.controlRadius??plane.controlRadius??8}格，持续${card.duration??2}回合`};}
    if(card.missionType==='recon'){const radius=Math.max(2,Number(card.radius??8)-air.rangePenalty);this.fogOfWar?.reveal(target.q,target.r,radius,2);return {ok:true,message:`${card.name}完成：揭示目标周边${radius}格；敌制空压力${Math.round(air.score)}，防空威胁${Math.round(aa.score)}`};}
    if(card.missionType==='supply'){const u=all.find(x=>this.normalizeSide(x.faction??x.side)===this.normalizeSide(side)&&this.dist(x,target)<=0);if(u){u.ammo=100;u.ammunition=100;if(Number.isFinite(Number(u.fuel)))u.fuel=Math.min(100,Number(u.fuel)+50);let kitText='';if(Number.isFinite(Number(u.maxEngineerKits))){u.engineerKits=Number(u.maxEngineerKits);kitText=`，工兵套件补满 ${u.engineerKits}/${u.maxEngineerKits}`;}u.morale=Math.min(100,Number(u.morale??70)+15);return {ok:true,message:`${card.name}完成：${u.name} 弹药补满${Number.isFinite(Number(u.fuel))?'，油料补充':''}${kitText}，士气恢复`};}return {ok:false,message:`${card.name}必须选择己方单位所在格`,refund:true};}
    if(card.missionType==='paradrop'){const occupied=all.some(x=>x.offMap!==true&&+x.q===+target.q&&+x.r===+target.r),terrain=String(this.world?.terrainAt?.(+target.q,+target.r)??'plain');if(occupied||['water','mountain','swamp'].includes(terrain))return {ok:false,message:'该地形/地块不适合空降（卡牌未消耗）',refund:true};const effective=Math.max(.15,attackFactor*accuracyFactor);const deployedStrength=Math.max(1,Math.round(Number(card.unitStrength??360)*effective));const deployedMax=Math.max(deployedStrength,Number(card.unitMaxStrength??400));all.push({id:`AIRBORNE_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,name:card.unitName??(card.aircraft==='LI2'?'苏军空降兵测试营':'空降兵测试营'),faction:side,side:side,type:'infantry',echelon:'battalion',q:+target.q,r:+target.r,strength:deployedStrength,maxStrength:deployedMax,manpower:deployedStrength,maxManpower:deployedMax,attack:Number(card.unitAttack??8),defense:Number(card.unitDefense??6),movement:Number(card.unitMovement??4),maxMovementPoints:Number(card.unitMovement??4),movementPoints:0,range:1,morale:60,ammo:70,ammunition:70,fuel:100,airborneDisorganized:1,airDropTurn:Number(this.getTurn?.()??1),airborneDeployed:true,persistent:true,temporary:false,offMap:false,destroyed:false,actionPoints:0,maxActionPoints:6,hasActed:true,hasMoved:true,hasAttacked:false});return {ok:true,message:`${plane.name??card.name}空降完成；防空/制空干扰${Math.round((1-effective)*100)}%，部队处于集结状态`};}
    const radius=Number(card.radius??0);let hits=0,total=0,fortDamage=0,fortDestroyed=0,bridgeDamage=0,bridgeDestroyed=0,wallDamage=0;
    for(const u of enemies){const d=this.dist(u,target);if(d>radius)continue;const mult=this.falloff(card,d);let base=Number(plane.groundAttack??50);if(card.missionType==='anti_armor'&&/tank|armor|装甲|坦克/i.test(String(u.type)+' '+String(u.name)))base=Number(plane.armorAttack??base);const dmg=Math.max(1,Math.round(base*attackFactor*mult*.8));const before=Number(u.strength??100);u.strength=Math.max(0,before-dmg);u.morale=Math.max(0,Number(u.morale??70)-Math.round(Number(plane.suppression??40)/5*mult));hits++;total+=before-u.strength;}
    const precision=Number(plane.accuracy??70)/70*accuracyFactor;
    for(const f of (this.world?.fortifications??[])){const d=this.dist(f,target);if(d>radius||String(f.status)==='destroyed')continue;const res=this.fortificationDamage?.damageFort(f,Number(plane.fortificationAttack??0)*attackFactor,this.falloff(card,d)*precision);if(res){fortDamage+=res.damage;if(res.destroyed)fortDestroyed++;}}
    for(const b of (this.world?.bridges??[])){const d=this.dist(b,target);if(d>radius||String(b.status)==='destroyed')continue;const res=this.fortificationDamage?.damageBridge(b,Number(plane.bridgeAttack??plane.fortificationAttack??0)*attackFactor,this.falloff(card,d)*precision);if(res){bridgeDamage+=res.damage;if(res.destroyed)bridgeDestroyed++;}}
    const wr=this.fortificationDamage?.damageWallsAt(+target.q,+target.r,Number(plane.wallAttack??plane.fortificationAttack??0)*attackFactor,precision);if(wr)wallDamage+=wr.damage;
    return {ok:true,message:`${card.name}完成：单位命中${hits}个/损失${total}；工事损伤${fortDamage}${fortDestroyed?`（摧毁${fortDestroyed}）`:''}；桥梁损伤${bridgeDamage}${bridgeDestroyed?`（摧毁${bridgeDestroyed}）`:''}${wallDamage?`；城墙损伤${wallDamage}`:''}；防空威胁${Math.round(aa.score)}；敌制空压力${Math.round(air.score)}${air.sources.length?'（'+air.sources.join('、')+'）':''}`};
  }
}
