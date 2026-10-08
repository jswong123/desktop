// Normandy campaign extension interfaces v0.15
export class NormandyInterfaceSystem {
  constructor(scenario={}){this.configure(scenario);}
  configure(scenario={}){this.scenario=scenario;this.config=scenario.normandyInterfaces??{};return this;}
  get(name){return this.config?.[name]??null;}
  enabled(name){return this.get(name)?.enabled===true;}
  landingZoneAt(q,r){const zones=this.get('landingZone')?.zones??[];return zones.find(z=>q>=z.qMin&&q<=z.qMax&&(z.beachRows??[]).some((v,i,a)=>a.length===2?r>=a[0]&&r<=a[1]:r===v))??null;}
  disembarkPenalty(unit){const c=this.get('disembarking');if(!c?.enabled||!(unit?.disembarkingTurns>0))return {movement:1,attack:1,defense:1};return {movement:c.movementMultiplier??.5,attack:c.attackMultiplier??.65,defense:c.defenseMultiplier??.8};}
  commandPenalty(){return this.get('commandEffect')?.hqDestroyedPenalty??{};}
  navalSupport(){return this.get('navalSupport')??{enabled:false};}
  controlZone(){return this.get('controlZone')??{enabled:false};}
}
