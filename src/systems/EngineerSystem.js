// 通用工兵工程系统 v0.22
// 适用于全部战役：工事、雷区、桥梁、城墙。工程按回合累计；工兵可建设/拆除桥梁和墙体。
export class EngineerSystem {
  constructor(world){
    this.world=world;
    if(!Array.isArray(world.minefields)) world.minefields=[];
    if(!Array.isArray(world.fortifications)) world.fortifications=[];
    if(!Array.isArray(world.wallEdges)) world.wallEdges=[];
    if(!world.config) world.config={};
    // 桥梁只保留一个权威数组：优先沿用 WorldMap/scenario 的 bridges。
    const existing=Array.isArray(world.bridges)?world.bridges:(Array.isArray(world.config.bridges)?world.config.bridges:[]);
    world.bridges=existing; world.config.bridges=existing;
  }
  isEngineer(u){const t=String(u?.type??u?.unitType??'').toLowerCase(),b=String(u?.branch??u?.unitClass??'').toLowerCase(),x=u?.engineering??{};return t==='engineer'||t==='engineering'||b==='engineer'||b==='engineering'||x.canBuildAdvanced===true||x.canBuildBridge===true||/工兵/.test(String(u?.name??''));}
  isInfantry(u){const t=String(u?.type??u?.unitType??'').toLowerCase(),b=String(u?.branch??u?.unitClass??'').toLowerCase();return ['infantry','mechanized_infantry','wheeled_infantry','motorized_infantry','special_forces'].includes(t)||b==='infantry';}
  profile(u){const x=u?.engineering??{},e=this.isEngineer(u),i=this.isInfantry(u);return {
    canEntrench:e||i||x.canEntrench===true, canBuildAdvanced:e,
    canLayMines:e||x.canLayMines===true, canClearMines:e||x.canClearMines===true,
    canBuildBridge:e||x.canBuildBridge===true, canDemolishBridge:e||x.canDemolishBridge===true, canBuildWall:e||x.canBuildWall===true, canDemolishWall:e||x.canDemolishWall===true, canBuildAA1:e||i||x.canBuildAA1===true, canBuildAA2:e||x.canBuildAA2===true, canBuildAA3:e||x.canBuildAA3===true,
    fortificationPower:Number(x.fortificationPower??(e?50:i?25:0)), mineLaying:Number(x.mineLaying??(e?50:0)), mineClearing:Number(x.mineClearing??(e?50:0))};}
  // 工兵套件：专业工兵的可消耗工程资源。默认10套；旧存档/旧场景首次使用时自动补齐。
  ensureEngineerKits(u){
    if(!this.isEngineer(u)) return null;
    const fallback=Math.max(1,Number(u?.maxEngineerKits??10)||10);
    if(!Number.isFinite(Number(u.maxEngineerKits))) u.maxEngineerKits=fallback;
    if(!Number.isFinite(Number(u.engineerKits))) u.engineerKits=Number(u.maxEngineerKits);
    u.engineerKits=Math.max(0,Math.min(Number(u.maxEngineerKits),Number(u.engineerKits)));
    return {current:Number(u.engineerKits),max:Number(u.maxEngineerKits)};
  }
  hasEngineerKits(u,cost=1){const k=this.ensureEngineerKits(u);return !!k&&k.current>=Math.max(0,Number(cost)||0);}
  consumeEngineerKits(u,cost=1){const n=Math.max(0,Number(cost)||0);if(!this.hasEngineerKits(u,n))return false;u.engineerKits=Math.max(0,Number(u.engineerKits)-n);return true;}
  canWork(u){
    // v1.0.7：工程行动只看“单位有效 + 剩余行动点”。
    // 不读取 hasActed / hasMoved / hasAttacked / 历史建造次数，也不设置工程次数上限。
    if(!u || u.offMap===true || Number(u.strength??u.maxStrength??1)<=0) return false;
    const ap=(u.actionPoints==null)?Number(u.maxActionPoints??0):Number(u.actionPoints);
    return Number.isFinite(ap) && ap>0;
  }
  resetInvalidTask(u){
    if(!u?.engineeringTask)return false;
    const t=u.engineeringTask;
    if(!Number.isFinite(Number(t.required))||Number(t.required)<=0||!String(t.key??'')){u.engineeringTask=null;return true;}
    return false;
  }
  validateAction(u,kind,target=null){
    if(!u)return {ok:false,message:'未选择单位'};
    this.resetInvalidTask(u);
    if(!this.isEngineer(u)&&['bridge','repairBridge','demolishBridge','wall','demolishWall','bunker','aa3'].includes(kind))return {ok:false,message:'该工程必须由工兵执行'};
    if(!this.canWork(u))return {ok:false,message:'该单位本回合没有可用行动点'};
    if(target&&['bridge','repairBridge','demolishBridge','wall','demolishWall'].includes(kind)){
      if(!this.same(u,target)&&!this.adjacent(u,target))return {ok:false,message:'工程目标必须位于工兵所在格或相邻格'};
      if(kind==='wall'&&this.same(u,target))return {ok:false,message:'防御墙建在六角格边上：请选择一个相邻地块'};
      if(kind==='wall'&&this.wallBetween({q:+u.q,r:+u.r},target))return {ok:false,message:'这条边已经存在墙体'};
      if(kind==='demolishWall'&&!this.wallBetween({q:+u.q,r:+u.r},target))return {ok:false,message:'工兵与目标格之间没有墙体'};
      if(kind==='bridge'&&String(this.world?.terrainAt?.(+target.q,+target.r)??'').toLowerCase()!=='water')return {ok:false,message:'浮桥只能架设在相邻 water 水域格'};
      if((kind==='repairBridge'||kind==='demolishBridge')&&!this.bridgeAt(target.q,target.r))return {ok:false,message:'目标位置没有桥梁'};
    }
    return {ok:true,message:''};
  }
  same(a,b){return Number(a?.q)===Number(b?.q)&&Number(a?.r)===Number(b?.r);}
  adjacent(a,b){const dq=Number(b.q)-Number(a.q),dr=Number(b.r)-Number(a.r);return [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]].some(([x,y])=>x===dq&&y===dr);}
  getFortification(q,r){return (this.world.fortifications??[]).find(f=>Number(f.q)===+q&&Number(f.r)===+r)??null;}
  getMinefield(q,r){return (this.world.minefields??[]).find(m=>Number(m.q)===+q&&Number(m.r)===+r)??null;}
  bridges(){
    const a=Array.isArray(this.world?.bridges)?this.world.bridges:null;
    const b=Array.isArray(this.world?.config?.bridges)?this.world.config.bridges:null;
    if(a&&b&&a!==b){for(const x of b)if(!a.includes(x))a.push(x);this.world.config.bridges=a;return a;}
    return a??b??[];
  }
  bridgeAt(q,r){return this.bridges().find(b=>this.same(b,{q,r})||this.same(b.hex,{q,r})||(b.cells??b.crossingCells??[]).some(c=>Array.isArray(c)?(+c[0]===+q&&+c[1]===+r):this.same(c,{q,r})))??null;}
  consume(u,cost=1){
    // 工程作业按行动点逐次消耗，不再把整回合行动点一次清零。
    // 只要仍有行动点，工兵就可以继续施工/爆破；不存在累计建造次数上限。
    const ap=Math.max(0,Number(u?.actionPoints??0));
    u.actionPoints=Math.max(0,ap-Math.max(1,Number(cost)||1));
    // 工程作业绝不写入 hasActed/hasAttacked/冷却标记。
    // 是否还能继续施工只由剩余行动点与目标合法性决定。
  }
  task(u,key,turns,onComplete,label){
    if(!this.canWork(u)) return {ok:false,message:'该单位本回合无法进行工程作业'};
    let t=u.engineeringTask;
    if(!t||t.key!==key){t=u.engineeringTask={key,label,progress:0,required:turns};const m=String(key).match(/:(-?\d+),(-?\d+)$/);if(m){t.targetQ=+m[1];t.targetR=+m[2];}}
    t.progress=Math.min(t.required,t.progress+1);this.consume(u);
    if(t.progress>=t.required){onComplete();u.engineeringTask=null;return {ok:true,completed:true,message:`${label}完成`};}
    return {ok:true,completed:false,message:`${label}：工程进度 ${t.progress}/${t.required}`};
  }
  buildFortification(u,q,r,type='foxhole'){
    const p=this.profile(u); if(!p.canEntrench)return {ok:false,message:'该单位没有构筑能力'};
    if(!this.same(u,{q,r}))return {ok:false,message:'工事只能修筑在单位所在格'};
    const cfg={foxhole:{turns:1,name:'散兵坑',level:1},trench:{turns:2,name:'战壕',level:2},strongpoint:{turns:3,name:'加强阵地',level:3},bunker:{turns:4,name:'碉堡',level:3}}[type]??{turns:2,name:'野战工事',level:1};
    if(type!=='foxhole'&&!this.isEngineer(u)&&type!=='trench')return {ok:false,message:'只有工兵可以修筑该类工事'};
    return this.task(u,`fort:${type}:${q},${r}`,cfg.turns,()=>{let f=this.getFortification(q,r);if(!f){f={q:+q,r:+r};this.world.fortifications.push(f);}Object.assign(f,{type,level:cfg.level,owner:u.faction??u.side,progress:100});const hp={foxhole:30,trench:60,strongpoint:90,bunker:150}[type]??75;f.maxHp=hp;f.hp=hp;f.integrity=100;f.status='intact';},`修筑${cfg.name}`);
  }
  entrench(u,q,r){return this.buildFortification(u,q,r,'trench');}
  buildAAPosition(u,q,r,level=1){
    const p=this.profile(u); level=Math.max(1,Math.min(3,Number(level)||1));
    if(level===1&&!p.canBuildAA1||level===2&&!p.canBuildAA2||level===3&&!p.canBuildAA3)return {ok:false,message:'该单位不能修筑此等级防空阵地'};
    if(!this.same(u,{q,r}))return {ok:false,message:'防空阵地只能修筑在单位所在格'};
    const turns=this.isEngineer(u)?[0,1,2,4][level]:[0,2,4,999][level];
    return this.task(u,`fort:aa_position_${level}:${q},${r}`,turns,()=>{let f=this.getFortification(q,r);if(!f){f={q:+q,r:+r};this.world.fortifications.push(f);}Object.assign(f,{type:`aa_position_${level}`,level,owner:u.faction??u.side,progress:100,airDefensePosition:true,protection:[0,.10,.25,.40][level],accuracyBonus:[0,.05,.10,.15][level],maxHp:[0,50,80,120][level],hp:[0,50,80,120][level],integrity:100,status:'intact'});},`修筑${level}级防空阵地`);
  }
  layMine(u,q,r){const p=this.profile(u);if(!p.canLayMines||!this.same(u,{q,r}))return {ok:false,message:'只有工兵可在自身所在格布雷'};return this.task(u,`mine:${q},${r}`,2,()=>{let m=this.getMinefield(q,r);if(!m){m={q:+q,r:+r,owner:u.faction??u.side,strength:100,discoveredBy:[u.faction??u.side]};this.world.minefields.push(m);}else m.strength=100;},'布设雷区');}
  clearMine(u,q,r){const p=this.profile(u),m=this.getMinefield(q,r);if(!p.canClearMines||!m)return {ok:false,message:'没有可排除的雷区'};if(!this.same(u,{q,r}))return {ok:false,message:'工兵必须进入雷区才能排雷'};return this.task(u,`clearMine:${q},${r}`,2,()=>{this.world.minefields=this.world.minefields.filter(x=>x!==m);},'排除雷区');}
  buildBridge(u,q,r,pontoon=true){
    if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以架桥'};
    if(!this.same(u,{q,r})&&!this.adjacent(u,{q,r}))return {ok:false,message:'桥位必须位于工兵所在格或相邻格'};
    if(pontoon&&String(this.world?.terrainAt?.(+q,+r)??'').toLowerCase()!=='water')return {ok:false,message:'浮桥只能架设在 water 水域格：点击“架设浮桥”后，再点击工兵相邻的蓝色水域格'};
    const kitCost=pontoon?2:3, key=`bridge:${q},${r}`;
    // 套件只在一项新架桥工程启动时扣除一次；连续推进同一工程不会重复扣除。
    if(u?.engineeringTask?.key!==key){if(!this.hasEngineerKits(u,kitCost))return {ok:false,message:`工兵套件不足：${pontoon?'架设浮桥':'建造桥梁'}需要 ${kitCost} 套`};this.consumeEngineerKits(u,kitCost);}
    let b=this.bridgeAt(q,r);const turns=pontoon?2:3;
    const result=this.task(u,key,turns,()=>{if(!b){b={id:`bridge_${q}_${r}`,q:+q,r:+r,name:pontoon?'工兵浮桥':'工兵桥梁',bridgeClass:pontoon?'pontoon':'field',capacity:pontoon?'light':'heavy',orientation:'auto',crossingCells:[[+q,+r]]};this.bridges().push(b);}b.status='intact';b.constructedBy=u.id??u.name;},pontoon?'架设浮桥':'建造桥梁');
    if(result?.ok) result.message+=`（工兵套件 ${u.engineerKits}/${u.maxEngineerKits}）`; return result;
  }
  demolishBridge(u,q,r){if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以爆破桥梁'};const b=this.bridgeAt(q,r);if(!b)return {ok:false,message:'目标位置没有桥梁'};if(!this.same(u,{q,r})&&!this.adjacent(u,{q,r}))return {ok:false,message:'工兵必须靠近桥梁'};return this.task(u,`demolishBridge:${b.id??q+','+r}`,2,()=>{b.status='destroyed';},'爆破桥梁');}
  demolishEngineering(u,q,r){
    if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以实施工程爆破'};
    const target={q:+q,r:+r}, own={q:+u.q,r:+u.r};
    if(!this.same(own,target)&&!this.adjacent(own,target))return {ok:false,message:'爆破目标必须位于工兵所在格或相邻格'};
    const bridge=this.bridgeAt(q,r);
    const fort=this.getFortification(q,r);
    const wall=this.wallBetween(own,target);
    if(!bridge&&!fort&&!wall)return {ok:false,message:'目标位置没有可爆破的桥梁、堡垒、工事或防御墙'};
    const targetType=bridge?'桥梁':wall?'防御墙':(fort?.name??({bunker:'碉堡',strongpoint:'加强阵地',trench:'战壕',foxhole:'散兵坑'}[fort?.type]??'工事'));
    return this.task(u,`demolishEngineering:${q},${r}`,2,()=>{
      const b=this.bridgeAt(q,r); if(b)b.status='destroyed';
      const f=this.getFortification(q,r); if(f)this.world.fortifications=this.world.fortifications.filter(x=>x!==f);
      const w=this.wallBetween(own,target); if(w)this.world.wallEdges=this.world.wallEdges.filter(x=>x!==w);
    },`爆破${targetType}`);
  }
  repairBridge(u,q,r){
    if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以修复桥梁'};const b=this.bridgeAt(q,r);if(!b)return {ok:false,message:'目标位置没有桥梁'};
    const key=`repairBridge:${b.id??q+','+r}`,kitCost=1;
    if(u?.engineeringTask?.key!==key){if(!this.hasEngineerKits(u,kitCost))return {ok:false,message:'工兵套件不足：修复桥梁需要 1 套'};this.consumeEngineerKits(u,kitCost);}
    const result=this.task(u,key,2,()=>{b.status='intact';},'修复桥梁');if(result?.ok)result.message+=`（工兵套件 ${u.engineerKits}/${u.maxEngineerKits}）`;return result;
  }
  wallBetween(a,b){return (this.world.wallEdges??[]).find(e=>(this.same(e.from,a)&&this.same(e.to,b))||(this.same(e.from,b)&&this.same(e.to,a)))??null;}
  buildWall(u,q,r){if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以建设防御墙'};const target={q:+q,r:+r};if(!this.adjacent(u,target))return {ok:false,message:'先点击工兵相邻地块，指定要建设的墙边'};const a={q:+u.q,r:+u.r};return this.task(u,`wall:${a.q},${a.r}:${target.q},${target.r}`,4,()=>{if(!this.wallBetween(a,target))this.world.wallEdges.push({from:a,to:target,type:'field_wall',name:'野战防御墙',owner:u.faction??u.side,hp:110,maxHp:110,integrity:100,status:'intact',breach:false,constructedBy:u.id??u.name});},'建设防御墙');}
  demolishWall(u,q,r){if(!this.isEngineer(u))return {ok:false,message:'只有工兵可以拆毁墙体'};const target={q:+q,r:+r};const w=this.wallBetween({q:+u.q,r:+u.r},target);if(!w)return {ok:false,message:'工兵与目标格之间没有墙体'};return this.task(u,`demolishWall:${q},${r}`,3,()=>{this.world.wallEdges=this.world.wallEdges.filter(x=>x!==w);},'拆毁墙体');}
  completeStoredTask(u,t){
    const key=String(t?.key??'');
    let m;
    if((m=key.match(/^fort:([^:]+):(-?\d+),(-?\d+)$/))){
      const [,type,q,r]=m; const cfg={foxhole:{level:1},trench:{level:2},strongpoint:{level:3},bunker:{level:3}}[type]??{level:1};
      let f=this.getFortification(+q,+r); if(!f){f={q:+q,r:+r};this.world.fortifications.push(f);} Object.assign(f,{type,level:cfg.level,owner:u.faction??u.side,progress:100}); return true;
    }
    if((m=key.match(/^wall:(-?\d+),(-?\d+):(-?\d+),(-?\d+)$/))){
      const a={q:+m[1],r:+m[2]},b={q:+m[3],r:+m[4]};
      if(!this.wallBetween(a,b))this.world.wallEdges.push({from:a,to:b,type:'field_wall',name:'野战防御墙',owner:u.faction??u.side,hp:110,maxHp:110,integrity:100,status:'intact',breach:false,constructedBy:u.id??u.name});
      return true;
    }
    if((m=key.match(/^demolishWall:(-?\d+),(-?\d+)$/))){const b={q:+m[1],r:+m[2]},a={q:+u.q,r:+u.r},w=this.wallBetween(a,b);if(w)this.world.wallEdges=this.world.wallEdges.filter(x=>x!==w);return !!w;}
    if((m=key.match(/^bridge:(-?\d+),(-?\d+)$/))){const q=+m[1],r=+m[2];let b=this.bridgeAt(q,r);if(!b){b={id:`bridge_${q}_${r}`,q,r,name:'工兵浮桥',bridgeClass:'pontoon',capacity:'light',orientation:'auto',crossingCells:[[q,r]]};this.bridges().push(b);}Object.assign(b,{status:'intact',constructedBy:u.id??u.name});return true;}
    if((m=key.match(/^mine:(-?\d+),(-?\d+)$/))){const q=+m[1],r=+m[2];let x=this.getMinefield(q,r);if(!x){x={q,r,owner:u.faction??u.side,strength:100,discoveredBy:[u.faction??u.side]};this.world.minefields.push(x);}return true;}
    if((m=key.match(/^clearMine:(-?\d+),(-?\d+)$/))){const q=+m[1],r=+m[2];this.world.minefields=this.world.minefields.filter(x=>!(+x.q===q&&+x.r===r));return true;}
    if((m=key.match(/^demolishEngineering:(-?\d+),(-?\d+)$/))){
      const q=+m[1],r=+m[2],target={q,r},own={q:+u.q,r:+u.r}; let done=false;
      const b=this.bridgeAt(q,r);if(b){b.status='destroyed';done=true;}
      const f=this.getFortification(q,r);if(f){this.world.fortifications=this.world.fortifications.filter(x=>x!==f);done=true;}
      const w=this.wallBetween(own,target);if(w){this.world.wallEdges=this.world.wallEdges.filter(x=>x!==w);done=true;}
      return done;
    }
    if((m=key.match(/^demolishBridge:(.+)$/))){const b=this.bridges().find(x=>String(x.id)===m[1]);if(b)b.status='destroyed';return !!b;}
    if((m=key.match(/^repairBridge:(.+)$/))){const b=this.bridges().find(x=>String(x.id)===m[1]);if(b)b.status='intact';return !!b;}
    return false;
  }
  repairFortification(u,q,r){
    const f=this.getFortification(q,r);if(!f)return {ok:false,message:'目标格没有可修复工事'};
    const p=this.profile(u);if(!p.canEntrench)return {ok:false,message:'该单位没有工事维修能力'};
    if(!this.same(u,{q,r}))return {ok:false,message:'单位必须位于工事所在格才能维修'};
    const advanced=['bunker','aa_position_3'].includes(String(f.type));if(advanced&&!this.isEngineer(u))return {ok:false,message:'高级工事只能由工兵维修'};
    const max=Number(f.maxHp??({foxhole:30,trench:60,strongpoint:90,bunker:150,aa_position_1:50,aa_position_2:80,aa_position_3:120}[f.type]??75));
    f.maxHp=max;if(!Number.isFinite(+f.hp))f.hp=max;const amount=this.isEngineer(u)?30:15;f.hp=Math.min(max,+f.hp+amount);f.integrity=Math.round(f.hp/max*100);f.status=f.hp>=max?'intact':f.hp/max<=.35?'heavily_damaged':'damaged';this.consume(u);return {ok:true,message:`维修${f.type}：完整度 ${f.integrity}%`};
  }

  advanceAllTasks(units=[]){
    // v1.1.1：工程进度不再随“回合冷却/等待”自动推进。
    // 玩家可在同一回合反复下达同一工程命令，每次仅消耗行动点并推进1段进度；
    // 只要行动点仍足够，就可连续施工。跨回合仅保留已完成的进度，不设置任何冷却。
    return [];
  }

}