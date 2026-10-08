// 局部制空 / CAP 系统 v0.24.1
export class AirSuperioritySystem {
  constructor(){this.zones=[];}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  addCAP(side,target,card={},plane={}){this.zones.push({side:String(side),q:+target.q,r:+target.r,radius:Number(card.controlRadius??plane.controlRadius??8),control:Number(card.airControl??plane.airAttack??70),interception:Number(card.interception??plane.airAttack??70),turns:Number(card.duration??2),name:card.name??plane.name??'战斗空中巡逻'});}
  advanceTurn(){for(const z of this.zones)z.turns--;this.zones=this.zones.filter(z=>z.turns>0);}
  enemyPressure(side,target){let score=0,sources=[];for(const z of this.zones){if(z.side===String(side)||this.dist(z,target)>z.radius)continue;const fall=1-this.dist(z,target)/(z.radius+1)*.45;score+=z.control*fall;sources.push(z.name);}const attackPenalty=Math.min(.55,score/260),accuracyPenalty=Math.min(.40,score/340),rangePenalty=Math.min(4,Math.floor(score/70));return {score,attackPenalty,accuracyPenalty,rangePenalty,sources};}
  friendlyControl(side,target){return this.zones.filter(z=>z.side===String(side)&&this.dist(z,target)<=z.radius).reduce((s,z)=>s+z.control,0);}
}
