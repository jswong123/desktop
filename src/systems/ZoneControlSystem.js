// 控制区系统接口 v0.14.0
// 规则：作战单位向相邻六角格投射 ZOC；己方 ZOC 内地图无战争迷雾。
// 后续可在此接入：敌 ZOC 移动惩罚、包围、补给线、前线生成。
export class ZoneControlSystem {
  constructor(world,getUnits){this.world=world;this.getUnits=getUnits;this.bySide=new Map();this.contested=new Set();}
  key(q,r){return `${+q},${+r}`;}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  sideOf(u){return String(u?.side??u?.faction??u?.camp??'');}
  alive(u){return !!u&&u.offMap!==true&&u.destroyed!==true&&Number(u.strength??u.manpower??1)>0;}
  radius(u){
    if(Number.isFinite(Number(u?.zocRadius))) return Math.max(0,Number(u.zocRadius));
    const s=`${u?.type??''} ${u?.unitType??''} ${u?.name??''}`.toLowerCase();
    if(/hospital|medical|medic|field hospital|野战医院|卫生连|救护/.test(s)) return 0;
    if(/artillery|炮兵|anti.?air|防空|supply|补给/.test(s)) return 0;
    if(/hq|headquarter|司令|指挥部|师部|军部/.test(s)) return 0;
    return 1;
  }
  recompute(){
    this.bySide.clear();this.contested.clear();
    const units=(this.getUnits?.()??[]).filter(u=>this.alive(u));
    for(const u of units){const side=this.sideOf(u);if(!side)continue;const set=this.bySide.get(side)??new Set();this.bySide.set(side,set);const R=this.radius(u);for(let r=Math.max(0,+u.r-R);r<=Math.min((this.world?.height??1)-1,+u.r+R);r++)for(let q=Math.max(0,+u.q-R);q<=Math.min((this.world?.width??1)-1,+u.q+R);q++)if(this.dist(u,{q,r})<=R)set.add(this.key(q,r));set.add(this.key(u.q,u.r));}
    const owners=new Map();for(const [side,set] of this.bySide)for(const k of set){const a=owners.get(k)??[];a.push(side);owners.set(k,a);}for(const [k,a] of owners)if(new Set(a).size>1)this.contested.add(k);
    return this;
  }
  isControlledBy(side,q,r){return this.bySide.get(String(side??''))?.has(this.key(q,r))??false;}
  isContested(q,r){return this.contested.has(this.key(q,r));}
  stateAt(side,q,r){if(this.isContested(q,r))return 'contested';return this.isControlledBy(side,q,r)?'controlled':'uncontrolled';}
  controlledKeys(side){return new Set(this.bySide.get(String(side??''))??[]);}
}
