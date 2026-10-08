// V1.4.3 潜艇隐蔽接口：默认潜航不可被普通水面视野直接揭示。
export class SubmarineStealthSystem{
 isSubmarine(u){return u?.type==='submarine'||u?.submarine?.enabled===true;}
 ensure(u){if(!this.isSubmarine(u))return u;u.depthState??=u.submarine?.defaultDepthState??'submerged';u.submarineMode??=u.submarine?.defaultMode??'silent';u.detectionState??='hidden';u.attackExposureTurns??=0;return u;}
 signature(u){this.ensure(u);let s=Number(u?.submarine?.baseSignature??1);if(u.submarineMode==='high_speed')s+=4;if(u.submarineMode==='active_search')s+=3;if((u.attackExposureTurns??0)>0)s+=4;return s;}
 canBeAutoSeen(u){return !this.isSubmarine(u)||u.depthState==='surfaced';}
 detectionScore(detector,target,distance=1){if(!this.isSubmarine(target))return Infinity;const asw=Number(detector?.antiSubmarine??detector?.antiSubDetection??0);if(asw<=0)return -Infinity;return asw*2+this.signature(target)-Math.max(0,distance)*2;}
 contactLevel(detector,target,distance=1){const x=this.detectionScore(detector,target,distance);if(x<3)return 'hidden';if(x<7)return 'suspected';if(x<11)return 'confirmed';return 'localized';}
 markAttack(u){this.ensure(u);u.attackExposureTurns=Number(u?.submarine?.attackExposureTurns??2);u.detectionState='suspected';}
 endTurn(u){if(!this.isSubmarine(u))return;if((u.attackExposureTurns??0)>0)u.attackExposureTurns--;if(u.attackExposureTurns<=0&&u.submarineMode==='silent')u.detectionState='hidden';}
}
export default SubmarineStealthSystem;
