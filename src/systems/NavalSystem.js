// V0.7 海军基础系统：为海军算子提供海域判定、舰炮弹药与港口封锁数据接口。
export class NavalSystem {
  constructor(world){ this.world=world; }
  isNaval(u){ return u?.naval===true || ['battleship','heavy_cruiser','light_cruiser','destroyer','escort','transport','carrier','submarine','landing','lst','landingcraft','minesweeper'].includes(u?.type); }
  canEnter(u,q,r){ return this.isNaval(u) ? (this.world?.terrainAt?.(q,r)==='water') : (this.world?.terrainAt?.(q,r)!=='water'); }
  canBombard(u){ return this.isNaval(u) && u.type!=='transport' && Number(u.ammo??0)>0 && Number(u.strength??0)>0; }
  expendBombardmentAmmo(u){ if(!this.canBombard(u)) return false; u.ammo=Math.max(0,Number(u.ammo)-1); return true; }
  portBlockaded(units,port={q:44,r:36},radius=8){ return units.some(u=>this.isNaval(u)&&u.faction==='japanese'&&u.offMap!==true&&Number(u.strength??0)>0&&Math.abs(u.q-port.q)<=radius&&Math.abs(u.r-port.r)<=radius); }
}
export default NavalSystem;
