export class AirDefenseSystem {
  constructor(world,getUnits){this.world=world;this.getUnits=getUnits;}
  isAA(u){const t=String(u?.type??'').toLowerCase();return ['anti_air','antiair','aa','air_defense'].includes(t)||/防空|高射/.test(String(u?.name??''));}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  positionAt(q,r){return (this.world?.fortifications??[]).find(f=>+f.q===+q&&+f.r===+r&&String(f.type??'').startsWith('aa_position'));}
  threat(target,defenderSide,altitude='low'){
    let score=0,sources=[];const alt=String(altitude).toLowerCase();
    for(const u of (this.getUnits?.()??[])){
      if(u.offMap===true||!this.isAA(u)||String(u.faction??u.side)!==String(defenderSide)||Number(u.strength??1)<=0)continue;
      const ad=u.airDefense??{},range=Number(ad.range??u.range??4);if(this.dist(u,target)>range)continue;
      let atk=Number(ad.firepower??ad.attack??Math.max(35,Number(u.attack??5)*9));
      const valid=Array.isArray(ad.altitude)?ad.altitude.map(x=>String(x).toLowerCase()):null;
      if(valid&&!valid.includes(alt))atk*=.28;else if(alt==='high'&&!ad.highAltitude&&!valid)atk*=.35;
      atk*=Number(ad.accuracy??.62);atk*=1+Math.min(.5,Number(ad.disruption??35)/200);
      const pos=this.positionAt(u.q,u.r);if(pos){const level=Math.min(3,+pos.level||1),integrity=Math.max(0,Math.min(1,Number(pos.integrity??100)/100));atk*=1+[0,.15,.32,.52][level];atk*=.35+.65*integrity;}
      score+=atk;sources.push(u.name);
    }
    const killChance=Math.min(.35,score/900),disruption=Math.min(.60,score/420);
    return {score,sources,killChance,disruption};
  }
}
