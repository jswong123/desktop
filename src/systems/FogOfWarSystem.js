// 战争迷雾 / 侦察系统 v0.24.1
export class FogOfWarSystem {
  constructor(world,getUnits,zoneControl=null){this.world=world;this.getUnits=getUnits;this.zoneControl=zoneControl;this.side='';this.enabled=true;this.visible=new Set();this.explored=new Set();this.tempReveal=[];}
  setEnabled(enabled){this.enabled=enabled!==false;this.recompute();}
  isEnabled(){return this.enabled!==false;}
  key(q,r){return `${+q},${+r}`;}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  baseSight(u){const t=String(u?.type??u?.unitType??'').toLowerCase(),n=String(u?.name??'');if(/recon|scout|侦察/.test(t+' '+n))return /arm|装甲/.test(t+' '+n)?7:6;if(/cavalry|骑兵/.test(t+' '+n))return 5;if(/tank|armor|panzer|mechanized|坦克|装甲|机步/.test(t+' '+n))return 4;if(/hq|headquarter|司令|指挥/.test(t+' '+n))return 4;return 3;}
  sight(u){let s=Number(u?.recon?.sight??u?.sight??this.baseSight(u));const terrain=String(this.world?.terrainAt?.(+u.q,+u.r)??'plain');if(['hill','mountain'].includes(terrain))s+=1;return Math.max(1,Math.round(s));}
  setSide(side){this.side=String(side??'');this.recompute();}
  reveal(q,r,radius=8,turns=2){this.tempReveal.push({q:+q,r:+r,radius:Math.max(1,+radius||8),turns:Math.max(1,+turns||2)});this.recompute();}
  advanceTurn(){for(const x of this.tempReveal)x.turns--;this.tempReveal=this.tempReveal.filter(x=>x.turns>0);this.recompute();}
  recompute(){if(!this.side)return;this.visible.clear();this.zoneControl?.recompute?.();const sources=(this.getUnits?.()??[]).filter(u=>u.offMap!==true&&String(u.faction??u.side)===this.side&&Number(u.strength??1)>0);for(const u of sources)this.revealCircle(u.q,u.r,this.sight(u));for(const x of this.tempReveal)this.revealCircle(x.q,x.r,x.radius);for(const k of this.visible)this.explored.add(k);}
  revealCircle(q,r,radius){const w=this.world?.width??0,h=this.world?.height??0,R=Math.max(0,Math.ceil(radius));const q0=Math.max(0,+q-R),q1=Math.min(w-1,+q+R),r0=Math.max(0,+r-R),r1=Math.min(h-1,+r+R);for(let y=r0;y<=r1;y++)for(let x=q0;x<=q1;x++)if(this.dist({q,r},{q:x,r:y})<=radius)this.visible.add(this.key(x,y));}
  stateAt(q,r){if(!this.enabled)return 2;const k=this.key(q,r);if(this.zoneControl?.isControlledBy?.(this.side,q,r))return 2;return this.visible.has(k)?2:this.explored.has(k)?1:0;}
  isVisible(q,r){return this.stateAt(q,r)===2;}
  filterUnits(units=[]){if(!this.enabled||!this.side)return units;return units.filter(u=>String(u.faction??u.side)===this.side||this.isVisible(u.q,u.r));}
}
