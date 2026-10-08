// 野战医院 / 卫生连接口 v0.14.0
// 当前只建立统一接口；战役可通过 unit.medical 或 type=field_hospital/medical_company 启用。
export class FieldHospitalSystem {
  constructor({world,getUnits,getTurn}={}){Object.assign(this,{world,getUnits,getTurn});this.log=[];}
  alive(u){return !!u&&u.offMap!==true&&u.destroyed!==true&&Number(u.strength??u.manpower??1)>0;}
  sideOf(u){return String(u?.side??u?.faction??u?.camp??'');}
  dist(a,b){const aq=+a.q,ar=+a.r,bq=+b.q,br=+b.r;return (Math.abs(aq-bq)+Math.abs(aq+ar-bq-br)+Math.abs(ar-br))/2;}
  isMedical(u){const s=`${u?.type??''} ${u?.unitType??''} ${u?.name??''}`.toLowerCase();return u?.medical===true||!!u?.medical?.capacity||/field.?hospital|medical|medic|野战医院|卫生连|救护/.test(s);}
  profile(u){const hospital=/hospital|野战医院/.test(`${u?.type??''} ${u?.name??''}`.toLowerCase());return {radius:Number(u?.medical?.radius??u?.medicalRadius??(hospital?3:2)),capacity:Number(u?.medical?.capacity??u?.medicalCapacity??(hospital?80:30)),rate:Number(u?.medical?.rate??u?.medicalRate??(hospital?0.12:0.06))};}
  facilities(side){return (this.getUnits?.()??[]).filter(u=>this.alive(u)&&this.isMedical(u)&&(!side||this.sideOf(u)===String(side)));}
  wounded(unit){return Math.max(0,Number(unit?.maxStrength??unit?.maxManpower??0)-Number(unit?.strength??unit?.manpower??0));}
  canTreat(facility,unit){if(!this.alive(facility)||!this.alive(unit)||!this.isMedical(facility)||this.sideOf(facility)!==this.sideOf(unit))return false;return this.dist(facility,unit)<=this.profile(facility).radius&&this.wounded(unit)>0;}
  treat(facility,unit,{amount}={}){if(!this.canTreat(facility,unit))return {ok:false,restored:0,message:'不满足医疗补充条件'};const p=this.profile(facility),missing=this.wounded(unit),base=Math.max(1,Math.round(Number(unit.maxStrength??unit.maxManpower??100)*p.rate)),restored=Math.min(missing,p.capacity,Math.max(0,Number(amount??base)));unit.strength=Math.min(Number(unit.maxStrength??unit.strength),Number(unit.strength??0)+restored);if(Number.isFinite(Number(unit.manpower)))unit.manpower=unit.strength;this.log.push({turn:this.getTurn?.()??1,facilityId:facility.id,unitId:unit.id,restored});return {ok:true,restored,message:`补充兵力 ${restored}`};}
  getInterfaceState(side){return {facilities:this.facilities(side).map(u=>({id:u.id,name:u.name,q:u.q,r:u.r,...this.profile(u)})),log:[...this.log]};}
}
