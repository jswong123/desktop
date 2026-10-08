// V1.4.3 中国海军通用舰艇模板库
// 游戏平衡数据：不对应现实舰艇精确武器性能、载荷、部署或战备状态。
const ship=(id,name,type,role,stats={})=>({
 id,name,domain:'naval',naval:true,type,role,echelon:'ship',ships:1,
 hull:100,maxHull:100,ammo:100,fuel:100,actionPoints:stats.actionPoints??6,
 detection:stats.detection??6,airDefense:stats.airDefense??4,antiShip:stats.antiShip??4,
 antiSubmarine:stats.antiSubmarine??3,landAttack:stats.landAttack??0,electronicWarfare:stats.electronicWarfare??2,
 command:stats.command??2,stealth:stats.stealth??2,helicopterCapacity:stats.helicopterCapacity??0,
 range:stats.range??3,maxRange:stats.maxRange??stats.range??3,
 canEnterWater:true,canEnterLand:false,canCaptureLandObjective:false,
 transport:stats.transport??null,carrierAir:stats.carrierAir??null,
 submarine:stats.submarine??null,logistics:stats.logistics??null,
 notes:stats.notes??''
});

export const PLAN_NAVAL_UNITS={
 PLAN_CV_LIAONING:ship('PLAN_CV_LIAONING','辽宁舰型航空母舰','carrier','舰载航空/编队指挥',{actionPoints:5,detection:9,airDefense:9,antiShip:3,antiSubmarine:4,command:10,helicopterCapacity:4,carrierAir:{enabled:true,airWingSlots:8,sortieCapacity:6}}),
 PLAN_CV_SHANDONG:ship('PLAN_CV_SHANDONG','山东舰型航空母舰','carrier','舰载航空/编队指挥',{actionPoints:5,detection:9,airDefense:9,antiShip:3,antiSubmarine:4,command:10,helicopterCapacity:4,carrierAir:{enabled:true,airWingSlots:9,sortieCapacity:7}}),
 PLAN_CV_FUJIAN:ship('PLAN_CV_FUJIAN','福建舰型航空母舰','carrier','弹射航空/预警/编队核心',{actionPoints:5,detection:10,airDefense:9,antiShip:3,antiSubmarine:4,electronicWarfare:8,command:10,helicopterCapacity:4,carrierAir:{enabled:true,catapult:true,airWingSlots:10,sortieCapacity:8}}),
 PLAN_DDG_055:ship('PLAN_DDG_055','055型导弹驱逐舰','destroyer','大型防空/编队指挥',{range:9,detection:10,airDefense:10,antiShip:9,antiSubmarine:7,landAttack:6,electronicWarfare:7,command:9,helicopterCapacity:1}),
 PLAN_DDG_052D:ship('PLAN_DDG_052D','052D型导弹驱逐舰','destroyer','通用驱逐舰',{range:8,detection:9,airDefense:9,antiShip:8,antiSubmarine:7,landAttack:5,electronicWarfare:6,command:7,helicopterCapacity:1}),
 PLAN_DDG_052C:ship('PLAN_DDG_052C','052C型导弹驱逐舰','destroyer','区域防空',{range:8,detection:8,airDefense:8,antiShip:7,antiSubmarine:5,landAttack:3,electronicWarfare:5,command:6,helicopterCapacity:1}),
 PLAN_FFG_054B:ship('PLAN_FFG_054B','054B型导弹护卫舰','escort','通用护卫/反潜',{range:7,detection:8,airDefense:7,antiShip:6,antiSubmarine:9,electronicWarfare:5,helicopterCapacity:1}),
 PLAN_FFG_054A:ship('PLAN_FFG_054A','054A型导弹护卫舰','escort','护航/反潜',{range:7,detection:7,airDefense:7,antiShip:6,antiSubmarine:8,electronicWarfare:4,helicopterCapacity:1}),
 PLAN_FFL_056A:ship('PLAN_FFL_056A','056A型护卫舰','escort','近海警戒/反潜',{range:5,actionPoints:7,detection:6,airDefense:4,antiShip:5,antiSubmarine:7,stealth:4}),
 PLAN_LHA_075:ship('PLAN_LHA_075','075型两栖攻击舰','landing','垂直/水平两栖登陆',{range:4,actionPoints:5,detection:7,airDefense:7,antiShip:2,antiSubmarine:4,command:7,helicopterCapacity:8,transport:{personnelSlots:10,vehicleSlots:6,heavySlots:3,wellDeckSlots:2,aviationSlots:8,embarkedUnits:[]},carrierAir:{enabled:true,rotaryWingOnly:true,airWingSlots:8,sortieCapacity:6}}),
 PLAN_LPD_071:ship('PLAN_LPD_071','071型船坞登陆舰','landing','船坞登陆/重装备运输',{range:4,actionPoints:5,detection:6,airDefense:5,antiShip:1,antiSubmarine:2,helicopterCapacity:4,transport:{personnelSlots:10,vehicleSlots:8,heavySlots:5,wellDeckSlots:4,aviationSlots:4,embarkedUnits:[]}}),
 PLAN_LST_072:ship('PLAN_LST_072','072系列登陆舰','landing','近岸登陆/车辆运输',{range:3,actionPoints:5,detection:4,airDefense:3,antiShip:1,antiSubmarine:1,transport:{personnelSlots:6,vehicleSlots:6,heavySlots:4,wellDeckSlots:0,aviationSlots:0,embarkedUnits:[]}}),
 PLAN_AOR_901:ship('PLAN_AOR_901','901型综合补给舰','transport','高速综合补给',{range:1,actionPoints:6,detection:4,airDefense:3,antiShip:0,antiSubmarine:1,logistics:{fuelStock:1000,ammoStock:1000,aviationFuelStock:700,replenishRadius:1}}),
 PLAN_AOR_903A:ship('PLAN_AOR_903A','903A型综合补给舰','transport','通用海上补给',{range:1,actionPoints:5,detection:4,airDefense:3,antiShip:0,antiSubmarine:1,logistics:{fuelStock:900,ammoStock:900,aviationFuelStock:500,replenishRadius:1}}),
 PLAN_ASR_926:ship('PLAN_ASR_926','926型援潜救生船','transport','援潜救生/海上保障',{actionPoints:5,detection:6,airDefense:1,antiShip:0,antiSubmarine:4,logistics:{rescue:true,repairSupport:true}}),
 PLAN_SSN:ship('PLAN_SSN','核动力攻击潜艇','submarine','远海水下作战',{range:7,actionPoints:7,detection:7,airDefense:0,antiShip:9,antiSubmarine:9,landAttack:3,stealth:10,submarine:{enabled:true,defaultDepthState:'submerged',defaultMode:'silent',baseSignature:1,attackExposureTurns:2,contactDecayTurns:2}}),
 PLAN_SSB:ship('PLAN_SSB','常规动力潜艇','submarine','近海伏击/封锁',{range:6,actionPoints:6,detection:6,airDefense:0,antiShip:8,antiSubmarine:7,stealth:10,submarine:{enabled:true,defaultDepthState:'submerged',defaultMode:'silent',baseSignature:1,attackExposureTurns:2,contactDecayTurns:2}}),
 PLAN_SSBN:ship('PLAN_SSBN','战略核潜艇','submarine','战略平台（普通战役锁定）',{actionPoints:5,detection:5,airDefense:0,antiShip:5,antiSubmarine:5,stealth:10,submarine:{enabled:true,strategic:true,selectableInNormalScenario:false,defaultDepthState:'submerged',defaultMode:'silent',baseSignature:1,attackExposureTurns:2,contactDecayTurns:3}})
};

export const PLAN_NAVAL_UNIT_LIST=Object.values(PLAN_NAVAL_UNITS);
export function getPlanNavalTemplate(id){return PLAN_NAVAL_UNITS[id]??null;}
export function instantiatePlanNavalUnit(id,overrides={}){
 const t=getPlanNavalTemplate(id); if(!t) return null;
 return JSON.parse(JSON.stringify({...t,...overrides,id:overrides.id??`${id}_${Date.now()}`}));
}
export default PLAN_NAVAL_UNITS;
