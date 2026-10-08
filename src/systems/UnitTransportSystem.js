// V1.4.5b 通用载运系统：海运先启用，接口同时为运输机/直升机预留。
export class UnitTransportSystem {
  capacity(carrier){ return carrier?.transport ?? null; }
  cost(unit){ return unit?.transportCost ?? {personnel:1,vehicle:0,heavy:0}; }
  manifest(carrier){ const c=this.capacity(carrier); if(!c) return []; c.embarkedUnits ??= []; return c.embarkedUnits; }
  used(carrier){ return this.manifest(carrier).reduce((a,u)=>{const c=this.cost(u);a.personnel+=c.personnel||0;a.vehicle+=c.vehicle||0;a.heavy+=c.heavy||0;return a;},{personnel:0,vehicle:0,heavy:0}); }
  remaining(carrier){ const c=this.capacity(carrier),u=this.used(carrier); if(!c)return null; return {personnel:(c.personnelSlots||0)-u.personnel,vehicle:(c.vehicleSlots||0)-u.vehicle,heavy:(c.heavySlots||0)-u.heavy}; }
  canEmbark(carrier,unit){ if(!carrier||!unit||unit===carrier||unit.offMap===true)return false; const c=this.capacity(carrier); if(!c)return false; const u=this.used(carrier),x=this.cost(unit); return u.personnel+(x.personnel||0)<=Number(c.personnelSlots||0)&&u.vehicle+(x.vehicle||0)<=Number(c.vehicleSlots||0)&&u.heavy+(x.heavy||0)<=Number(c.heavySlots||0); }
  embark(carrier,unit){ if(!this.canEmbark(carrier,unit))return false; this.manifest(carrier).push(JSON.parse(JSON.stringify(unit))); unit.embarked=true;unit.embarkedOn=carrier.id;unit.offMap=true;unit.q=-1;unit.r=-1; return true; }
  disembark(carrier,unitId,q,r){ const a=this.manifest(carrier);const i=a.findIndex(u=>String(u.id)===String(unitId));if(i<0)return null;const [snap]=a.splice(i,1);snap.embarked=false;delete snap.embarkedOn;snap.offMap=false;snap.q=q;snap.r=r;snap.landingDeploymentTurns=1;snap.actionPoints=Math.min(Number(snap.actionPoints??0),1);snap.movementPoints=Math.min(Number(snap.movementPoints??snap.actionPoints??0),1);return snap; }
  // 后续空运复用：carrier.transportMode = sea | fixedWing | rotaryWing
  mode(carrier){ return carrier?.transportMode ?? (carrier?.domain==='naval'?'sea':'generic'); }
}
export default UnitTransportSystem;
