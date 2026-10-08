// AI 指挥学习记录系统 v1.0
// 目标：记录“战场状态 -> 候选行动 -> 玩家选择 -> 行动结果”，供后续行为克隆/风格建模使用。
export class CommandDataLogger {
  constructor({storageKey='frontline-ai-command-learning-v2',maxRecords=120000}={}){
    this.storageKey=storageKey; this.maxRecords=maxRecords; this.enabled=true;
    this.records=this._load(); this.sessionId=this._newSessionId(); this.seq=this.records.length;
  }
  _newSessionId(){return `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
  _load(){try{const x=JSON.parse(localStorage.getItem(this.storageKey)||'[]');return Array.isArray(x)?x:[];}catch{return[];}}
  _save(){try{if(this.records.length>this.maxRecords)this.records=this.records.slice(-this.maxRecords);localStorage.setItem(this.storageKey,JSON.stringify(this.records));}catch(e){console.warn('[AI学习记录] 保存失败',e);}}
  side(u){return u?.side??u?.faction??u?.camp??null;}
  alive(u){return !!u&&!u.destroyed&&Number(u.strength??u.manpower??1)>0&&u.offMap!==true;}
  dist(a,b){if(!a||!b)return null;const dq=Number(a.q)-Number(b.q),dr=Number(a.r)-Number(b.r);return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
  unitState(u){if(!u)return null;return{id:u.id??null,name:u.name??null,type:u.type??u.unitType??null,side:this.side(u),q:Number(u.q),r:Number(u.r),strength:Number(u.strength??0),manpower:Number(u.manpower??u.personnel??0),maxManpower:Number(u.maxManpower??u.initialManpower??0),ammo:Number(u.ammo??u.ammunition??0),maxAmmo:Number(u.maxAmmo??0),fuel:Number(u.fuel??0),maxFuel:Number(u.maxFuel??0),engineerKits:Number(u.engineerKits??0),maxEngineerKits:Number(u.maxEngineerKits??0),morale:Number(u.morale??0),fatigue:Number(u.fatigue??0),actionPoints:Number(u.actionPoints??0),movementPoints:Number(u.movementPoints??0),hasActed:!!u.hasActed,hasAttacked:!!u.hasAttacked,parentHQ:u.parentHQ??null,equipment:(u.equipment??[]).map(e=>({name:e.name??e.type??null,operational:Number(e.operational??0),initial:Number(e.initial??0),damaged:Number(e.damaged??0),destroyed:Number(e.destroyed??0)}))};}
  candidates(actor,units=[]){if(!actor)return[];const out=[];if(Number(actor.movementPoints??actor.actionPoints??0)>0)out.push('MOVE');const enemies=units.filter(u=>this.alive(u)&&this.side(u)!==this.side(actor));if(enemies.some(e=>this.dist(actor,e)<=Number(actor.attackRange??actor.range??1)))out.push('ATTACK');const t=String(actor.type??actor.unitType??'').toLowerCase();if(t.includes('engineer')||actor.engineering)out.push('ENGINEER');if(['supply','support'].includes(t)||actor.logisticsProvider)out.push('LOGISTICS');if(actor.airDroppable||t==='special_forces')out.push('AIRDROP');out.push('HOLD');return [...new Set(out)];}
  context({scenario,turnSystem,units=[],actor,objectives}={}){const enemies=units.filter(u=>this.alive(u)&&u!==actor&&this.side(u)!==this.side(actor));const friends=units.filter(u=>this.alive(u)&&this.side(u)===this.side(actor));let nearest=null;if(actor&&enemies.length)nearest=Math.min(...enemies.map(e=>this.dist(actor,e)));return{scenarioId:scenario?.id??scenario?.key??null,scenarioName:scenario?.name??null,turn:Number(turnSystem?.turn??turnSystem?.getTurnNumber?.()??0),phase:turnSystem?.phase??null,date:turnSystem?.getDateText?.()??null,time:turnSystem?.getTimeText?.()??null,nearestEnemyDistance:Number.isFinite(nearest)?nearest:null,visibleEnemyCount:enemies.filter(e=>e.visible!==false).length,ownAlive:friends.length,enemyAlive:enemies.length,objectiveState:objectives??null,candidates:this.candidates(actor,units)};}
  log(action,payload={},ctx={}){if(!this.enabled)return null;const rec={schema:'frontline.command.learning.v2',sessionId:this.sessionId,seq:++this.seq,ts:new Date().toISOString(),action,...ctx,...payload};this.records.push(rec);this._save();if(window.frontlineDesktop?.appendAIRecord){window.frontlineDesktop.appendAIRecord(rec).catch(e=>console.warn('[AI学习记录] 桌面数据写入失败',e));}return rec;}
  battleStart(x={}){return this.log('BATTLE_START',{difficulty:x.difficulty??null,playerSide:x.playerSide??null,map:{width:x.width??null,height:x.height??null}},this.context(x));}
  turnSnapshot(x={}){const us=x.units??[];return this.log('TURN_SNAPSHOT',{playerSide:x.playerSide??null,units:us.filter(u=>this.alive(u)).map(u=>this.unitState(u))},this.context(x));}
  move(x){return this.log('MOVE',{actor:this.unitState(x.unit),chosenAction:'MOVE',from:x.from,to:x.to,cost:x.cost??null,pathLength:x.path?.length??null},this.context({...x,actor:x.unit}));}
  attack(x){return this.log('ATTACK',{actor:this.unitState(x.attacker),target:this.unitState(x.defender),chosenAction:'ATTACK',damage:x.result?.damage??null,destroyed:!!x.result?.destroyed,result:x.result?.success===false?'failed':'success'},this.context({...x,actor:x.attacker}));}
  engineer(x){return this.log('ENGINEER',{actor:this.unitState(x.unit),chosenAction:'ENGINEER',engineeringAction:x.kind,target:x.target??null,result:x.result?.message??null,success:x.result?.success!==false},this.context({...x,actor:x.unit}));}
  airSupport(x){return this.log('AIR_SUPPORT',{chosenAction:'AIR_SUPPORT',card:x.card??null,target:x.target??null,success:x.result?.ok!==false&&x.result?.refund!==true,result:x.result?.message??null},this.context(x));}
  airdrop(x){return this.log('AIRDROP',{actor:this.unitState(x.unit),chosenAction:'AIRDROP',from:x.from??null,to:x.to??null},this.context({...x,actor:x.unit}));}
  transport(x){return this.log('TRANSPORT',{actor:this.unitState(x.carrier),chosenAction:'TRANSPORT',transportAction:x.kind,cargo:this.unitState(x.cargo),target:x.target??null},this.context({...x,actor:x.carrier}));}
  logistics(x){return this.log('LOGISTICS',{actor:this.unitState(x.provider),target:this.unitState(x.target),chosenAction:'LOGISTICS',result:x.result??null},this.context({...x,actor:x.provider}));}
  endPhase(x){return this.log('END_PHASE',{side:x.side,unitCount:(x.units||[]).length,chosenAction:'END_PHASE'},this.context(x));}
  note(label,data={},x={}){return this.log('NOTE',{label,data},this.context(x));}
  stats(){const by={};for(const r of this.records)by[r.action]=(by[r.action]||0)+1;const sessions=new Set(this.records.map(r=>r.sessionId)).size;return{records:this.records.length,sessions,byAction:by};}
  exportJSONL(){return this.records.map(r=>JSON.stringify(r)).join('\n');}
  exportJSON(){return JSON.stringify({schema:'frontline.command.dataset.v2',exportedAt:new Date().toISOString(),stats:this.stats(),records:this.records},null,2);}
  _download(text,name,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
  download(){this._download(this.exportJSONL(),`Frontline-AI-Learning-${new Date().toISOString().slice(0,10)}.jsonl`,'application/x-ndjson;charset=utf-8');}
  downloadJSON(){this._download(this.exportJSON(),`Frontline-AI-Learning-${new Date().toISOString().slice(0,10)}.json`,'application/json;charset=utf-8');}
  clear(){this.records=[];this.seq=0;this.sessionId=this._newSessionId();this._save();}
}
