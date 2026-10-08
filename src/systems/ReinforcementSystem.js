export class ReinforcementSystem {
  constructor(world){this.world=world;this.arrivedGroups=new Set();this.arrivalLog=[];this.groups=[];}
  initialize(units,currentTurn=1){
    this.groups=[]; const map=new Map();
    for(const u of units){
      if(!u.reinforcementGroup||!Number.isFinite(Number(u.reinforcementTurn))) continue;
      if(Number(currentTurn)<Number(u.reinforcementTurn)) u.offMap=true;
      const id=u.reinforcementGroup;
      if(!map.has(id)) map.set(id,{id,turn:Number(u.reinforcementTurn),faction:u.faction,name:(u.reinforcementName||this.groupName(id,u)),detail:(u.reinforcementDetail||'战役增援部队'),entryZone:u.entryZone??'AUTO',entryPoint:u.entryPoint??null,entryRadius:Number(u.entryRadius??4),requiresFriendlyAt:u.requiresFriendlyAt??null});
    }
    this.groups=[...map.values()].sort((a,b)=>a.turn-b.turn);
  }
  groupName(id,u){if(id.startsWith('WAN_CHI'))return `中国军第${u.reinforcementTurn}回合增援`;if(id.startsWith('WAN_JPN'))return `日军第${u.reinforcementTurn}回合接应部队`;if(id.startsWith('HY_CHI'))return `衡阳守军第${u.reinforcementTurn}回合增援`;if(id.startsWith('HY_JPN'))return `日军第${u.reinforcementTurn}回合增援`;const side=({chinese:'中国军',japanese:'日军',soviet:'苏军',german:'德军',rok_government:'政府军',new_military:'新军部'})[u?.faction]??'作战部队';return `${side}第${u.reinforcementTurn}回合增援部队`; }
  processTurn(turn,units){const reinforcements=[];for(const g of this.groups){if(this.arrivedGroups.has(g.id)||Number(turn)<g.turn)continue;if(g.requiresFriendlyAt&&Number(turn)>=g.turn&&!this.hasFriendlyNear(g,units)){this.arrivedGroups.add(g.id);this.arrivalLog.unshift({turn:Number(turn),name:g.name,detail:'港口未受我方有效控制，本批海运援军取消',count:0});continue;}const x=this.deployGroup(g,units);if(x.success){this.arrivedGroups.add(g.id);this.arrivalLog.unshift({turn:Number(turn),name:g.name,detail:g.detail,count:x.units.length});reinforcements.push(x);}}return{reinforcements,events:[]};}
  deployGroup(g,units){const list=units.filter(u=>u.reinforcementGroup===g.id&&u.offMap===true);if(!list.length)return{success:false,units:[]};const occupied=new Set(units.filter(u=>u.offMap!==true&&this.isAlive(u)).map(u=>`${u.q},${u.r}`));const cand=this.candidates(g,units);let i=0;const deployed=[];for(const u of list){while(i<cand.length&&occupied.has(`${cand[i].q},${cand[i].r}`))i++;if(i>=cand.length)break;const h=cand[i++];u.q=h.q;u.r=h.r;u.offMap=false;u.actionPoints=0;u.movementPoints=0;u.hasMoved=true;occupied.add(`${h.q},${h.r}`);deployed.push(u);}return{success:deployed.length>0,type:'reinforcement',groupId:g.id,faction:g.faction,name:g.name,message:`${g.name}进入战场`,units:deployed,partial:deployed.length!==list.length};}
  hasFriendlyNear(g,units){const c=g.requiresFriendlyAt;if(!c)return true;const rad=Number(c.radius??1);return units.some(u=>u.offMap!==true&&this.isAlive(u)&&u.faction===g.faction&&Math.abs(Number(u.q)-Number(c.q))<=rad&&Math.abs(Number(u.r)-Number(c.r))<=rad);}
  candidates(g){const w=this.world?.width??84,h=this.world?.height??56,out=[];
    if(g.entryPoint){const cq=Number(g.entryPoint.q),cr=Number(g.entryPoint.r),rad=Math.max(1,Number(g.entryRadius||4));for(let d=0;d<=rad;d++)for(let dq=-d;dq<=d;dq++)for(let dr=-d;dr<=d;dr++){const q=cq+dq,r=cr+dr;if(q>=1&&r>=1&&q<w-1&&r<h-1)out.push({q,r});}return out;}
    if(g.entryZone==='port'){for(let r=34;r<=38;r++)for(let q=41;q<=47;q++)out.push({q,r});return out;}
    // 指定增援入口：四行仓库等战术关卡可精确限定方向。
    if(g.entryZone==='concession'){for(let r=h-2;r>=Math.max(0,h-7);r--)for(let q=Math.max(2,Math.floor(w/2)-7);q<=Math.min(w-3,Math.floor(w/2)+7);q++)out.push({q,r});return out;}
    if(g.entryZone==='north'){for(let r=2;r<Math.min(8,h-2);r++)for(let q=5;q<w-5;q++)out.push({q,r});return out;}
    if(g.entryZone==='east'){for(let q=w-2;q>=Math.max(2,w-8);q--)for(let r=5;r<h-8;r++)out.push({q,r});return out;}
    if(g.entryZone==='west'){for(let q=2;q<Math.min(8,w-2);q++)for(let r=5;r<h-8;r++)out.push({q,r});return out;}
    if(g.entryZone==='south'){for(let r=h-2;r>=Math.max(2,h-8);r--)for(let q=25;q<w-20;q++)out.push({q,r});return out;}
    if(g.faction==='japanese'||g.faction==='german'){for(let q=w-2;q>=w-10;q--)for(let r=15;r<h-10;r++)out.push({q,r});}else{const mode=g.turn%4; if(mode===0){for(let r=h-2;r>=h-10;r--)for(let q=8;q<w-15;q++)out.push({q,r});}else if(mode===1){for(let q=2;q<12;q++)for(let r=8;r<h-8;r++)out.push({q,r});}else if(mode===2){for(let r=2;r<10;r++)for(let q=8;q<w-15;q++)out.push({q,r});}else{for(let q=2;q<15;q++)for(let r=20;r<h-5;r++)out.push({q,r});}}return out;}
  isAlive(u){return !!u&&u.destroyed!==true&&Number(u.strength??0)>0;}
  getPendingGroups(turn=1,units=[]){return this.groups.filter(g=>!this.arrivedGroups.has(g.id)&&units.some(u=>u.reinforcementGroup===g.id&&u.offMap===true)).map(g=>({...g,turnsRemaining:Math.max(0,g.turn-Number(turn)),unitCount:units.filter(u=>u.reinforcementGroup===g.id&&u.offMap===true).length}));}
  getArrivalLog(){return[...this.arrivalLog];} getMapUnits(units=[]){return units.filter(u=>u.offMap!==true);}
}
