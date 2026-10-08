// ========================================

// FortificationSystem.js

// 台儿庄战役 - 工事与城市防御系统

//

// 与现有系统的关系：

// 1. 不改变现有战术符号 type。

// 2. 读取 scenario-taierzhuang.json 中的 fortifications。

// 3. 与 CombatSystem.js 配合处理普通攻击防御修正。

// 4. 与 ArtillerySystem.js 配合处理炮击工事破坏。

// 5. 工兵拥有攻坚、爆破与修复优势。

// ========================================

 

export class FortificationSystem {

 

    constructor(world) {

        this.world = world;

    }

 

 

    // ========================================

    // 获取工事列表

    // ========================================

 

    getFortifications() {

        return (

            this.world?.map?.fortifications ??

            this.world?.fortifications ??

            []

        );

    }

 

 

    // ========================================

    // 获取某个六角格上的工事

    // ========================================

 

    getFortificationAt(q, r) {

        return this.getFortifications().find(

            fort =>

                fort.q === q &&

                fort.r === r

        ) ?? null;

    }

 

 

    getUnitFortification(unit) {

        if (!unit) {

            return null;

        }

 

        // 兼容单位自身携带工事等级的情况。

        if (

            Number(

                unit.fortificationLevel ??

                0

            ) > 0

        ) {

            return {

                q: unit.q,

                r: unit.r,

                type:

                    unit.fortificationType ??

                    "field_fortification",

                level:

                    Number(

                        unit.fortificationLevel

                    ),

                maxLevel:

                    Number(

                        unit.maxFortificationLevel ??

                        unit.fortificationLevel

                    ),

                owner:

                    unit.faction,

                embedded: true

            };

        }

 

        return this.getFortificationAt(

            unit.q,

            unit.r

        );

    }

 

 

    // ========================================

    // 工事类型

    // ========================================

 

    getFortificationType(unitOrFort) {

        const fort =

            unitOrFort?.q !== undefined &&

            unitOrFort?.r !== undefined &&

            unitOrFort?.strength !== undefined

                ? this.getUnitFortification(unitOrFort)

                : unitOrFort;

 

        return (

            fort?.type ??

            "none"

        );

    }

 

 

    getLevel(unitOrFort) {

        const fort =

            unitOrFort?.strength !== undefined

                ? this.getUnitFortification(unitOrFort)

                : unitOrFort;

 

        return Math.max(

            0,

            Number(

                fort?.level ??

                0

            )

        );

    }

 

 

    // ========================================

    // 工事参数

    //

    // field_fortification:

    //   野战工事 / 战壕 / 简易掩体

    //

    // fortified_urban:

    //   台儿庄城区坚固阵地

    // ========================================

 

    getProfile(fort) {

        if (!fort) {

            return {

                defenseBonus: 0,

                casualtyReduction: 0,

                suppressionReduction: 0,

                assaultPenalty: 0

            };

        }

 

        const level =

            this.getLevel(fort);

 

        if (

            fort.type ===

            "fortified_urban"

        ) {

            return {

                defenseBonus:

                    0.25 * level,

 

                casualtyReduction:

                    0.16 * level,

 

                suppressionReduction:

                    0.10 * level,

 

                assaultPenalty:

                    0.18 * level

            };

        }

 

        return {

            defenseBonus:

                0.18 * level,

 

            casualtyReduction:

                0.12 * level,

 

            suppressionReduction:

                0.08 * level,

 

            assaultPenalty:

                0.12 * level

        };

    }

 

 

    // ========================================

    // 普通战斗防御修正

    //

    // CombatSystem 在计算 defender defense 后，

    // 可以调用此函数。

    // ========================================

 

    getDefenseModifier(defender) {

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return 1.0;

        }

 

        const profile =

            this.getProfile(fort);

 

        return (

            1.0 +

            profile.defenseBonus

        );

    }

 

 

    getModifiedDefense(

        defender,

        baseDefense

    ) {

        return Math.max(

            1,

            baseDefense *

            this.getDefenseModifier(

                defender

            )

        );

    }

 

 

    // ========================================

    // 人员伤亡修正

    // ========================================

 

    getCasualtyModifier(defender) {

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return 1.0;

        }

 

        const profile =

            this.getProfile(fort);

 

        return Math.max(

            0.45,

            1.0 -

            profile.casualtyReduction

        );

    }

 

 

    // ========================================

    // 压制修正

    // ========================================

 

    getSuppressionModifier(defender) {

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return 1.0;

        }

 

        const profile =

            this.getProfile(fort);

 

        return Math.max(

            0.55,

            1.0 -

            profile.suppressionReduction

        );

    }

 

 

    // ========================================

    // 强攻惩罚

    //

    // 普通步兵攻击坚固阵地时效率下降。

    // 工兵可以大幅减轻这一惩罚。

    // ========================================

 

    getAssaultModifier(

        attacker,

        defender

    ) {

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return 1.0;

        }

 

        const profile =

            this.getProfile(fort);

 

        let penalty =

            profile.assaultPenalty;

 

        if (

            attacker?.type ===

            "engineer"

        ) {

            penalty *= 0.30;

        }

 

        return Math.max(

            0.45,

            1.0 - penalty

        );

    }

 

 

    // ========================================

    // 工兵攻坚加成

    // ========================================

 

    getEngineerAssaultBonus(

        attacker,

        defender

    ) {

        if (

            attacker?.type !==

            "engineer"

        ) {

            return 1.0;

        }

 

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return 1.0;

        }

 

        if (

            fort.type ===

            "fortified_urban"

        ) {

            return 1.35;

        }

 

        return 1.25;

    }

 

 

    // ========================================

    // 是否允许爆破

    // ========================================

 

    canDemolish(

        engineer,

        targetUnit

    ) {

        if (

            !engineer ||

            !targetUnit

        ) {

            return {

                success: false,

                reason: "缺少工兵或目标"

            };

        }

 

        if (

            engineer.type !==

            "engineer"

        ) {

            return {

                success: false,

                reason: "只有工兵单位可以实施爆破"

            };

        }

 

        if (

            engineer.destroyed === true ||

            (engineer.strength ?? 0) <= 0

        ) {

            return {

                success: false,

                reason: "工兵单位已失去战斗能力"

            };

        }
const fort =

            this.getUnitFortification(

                targetUnit

            );

 

        if (

            !fort ||

            this.getLevel(fort) <= 0

        ) {

            return {

                success: false,

                reason: "目标位置没有可爆破工事"

            };

        }

 

        const distance =

            this.getDistance(

                engineer,

                targetUnit

            );

 

        if (distance > 1) {

            return {

                success: false,

                reason: "工兵必须与目标相邻才能实施爆破"

            };

        }

 

        return {

            success: true,

            fort,

            distance

        };

    }

 

 

    getDistance(a, b) {

        if (!a || !b) {

            return Infinity;

        }

 

        const dq =

            a.q - b.q;

 

        const dr =

            a.r - b.r;

 

        return Math.max(

            Math.abs(dq),

            Math.abs(dr),

            Math.abs(dq + dr)

        );

    }

 

 

    // ========================================

    // 工兵爆破

    //

    // 默认：

    // 野战工事更容易被破坏；

    // 坚固城区工事需要更高强度工兵。

    // ========================================

 

    demolish(

        engineer,

        targetUnit

    ) {

        const check =

            this.canDemolish(

                engineer,

                targetUnit

            );

 

        if (!check.success) {

            return check;

        }

 

        const fort =

            check.fort;

 

        const before =

            this.getLevel(fort);

 

        const strength =

            Number(

                engineer.strength ??

                100

            );

 

        const maxStrength =

            Math.max(

                1,

                Number(

                    engineer.maxStrength ??

                    strength

                )

            );

 

        const strengthFactor =

            Math.max(

                0.30,

                Math.min(

                    1.0,

                    strength / maxStrength

                )

            );

 

        let chance =

            0.55 *

            strengthFactor;

 

        if (

            fort.type ===

            "field_fortification"

        ) {

            chance += 0.20;

        }

 

        if (

            fort.type ===

            "fortified_urban"

        ) {

            chance -= 0.10;

        }

 

        chance =

            Math.max(

                0.20,

                Math.min(

                    0.90,

                    chance

                )

            );

 

        const roll =

            Math.random();

 

        let damage = 0;

 

        if (roll <= chance) {

            damage = 1;

        }

 

        // 极佳爆破结果：

        // 有较低概率一次削弱两级。

        if (

            roll <= chance * 0.20 &&

            before >= 2

        ) {

            damage = 2;

        }

 

        const after =

            Math.max(

                0,

                before - damage

            );

 

        this.setFortificationLevel(

            fort,

            targetUnit,

            after

        );
return {

            success: true,

            type: "engineer_demolition",

 

            engineer,

            targetUnit,

 

            chance,

            roll,

 

            before,

            damage,

            after

        };

    }

 

 

    // ========================================

    // 工事等级写入

    // ========================================

 

    setFortificationLevel(

        fort,

        unit,

        level

    ) {

        const value =

            Math.max(

                0,

                Number(level)

            );

 

        if (fort?.embedded) {

            unit.fortificationLevel =

                value;

 

            return;

        }

 

        if (fort) {

            fort.level =

                value;

        }

    }

 

 

    // ========================================

    // 炮击造成的工事破坏

    //

    // ArtillerySystem 已经可以计算

    // fortificationDamage。

    // 此函数负责统一写回。

    // ========================================

 

    applyArtilleryDamage(

        defender,

        amount

    ) {

        const fort =

            this.getUnitFortification(

                defender

            );

 

        if (!fort) {

            return {

                success: false,

                before: 0,

                damage: 0,

                after: 0

            };

        }

 

        const before =

            this.getLevel(fort);

 

        const damage =

            Math.max(

                0,

                Math.min(

                    before,

                    Math.floor(

                        Number(amount) || 0

                    )

                )

            );

 

        const after =

            Math.max(

                0,

                before - damage

            );

 

        this.setFortificationLevel(

            fort,

            defender,

            after

        );

 

        return {

            success: true,

            before,

            damage,

            after

        };

    }

 

 

    // ========================================

    // 修复工事

    //

    // 工兵本回合没有攻击时，

    // 可以修复己方控制位置上的工事。

    // ========================================

 

    canRepair(

        engineer,

        fort

    ) {

        if (

            !engineer ||

            engineer.type !== "engineer"

        ) {

            return {

                success: false,

                reason: "只有工兵可以修复工事"

            };

        }

 

        if (

            engineer.destroyed === true ||

            (engineer.strength ?? 0) <= 0

        ) {

            return {

                success: false,

                reason: "工兵已失去行动能力"

            };

        }
if (!fort) {

            return {

                success: false,

                reason: "当前位置没有工事"

            };

        }

 

        const distance =

            this.getDistance(

                engineer,

                fort

            );

 

        if (distance > 1) {

            return {

                success: false,

                reason: "工兵必须位于工事内或相邻位置"

            };

        }

 

        if (

            fort.owner &&

            fort.owner !==

            engineer.faction

        ) {

            return {

                success: false,

                reason: "不能修复敌方控制的工事"

            };

        }

 

        const level =

            this.getLevel(fort);

 

        const maxLevel =

            Math.max(

                level,

                Number(

                    fort.maxLevel ??

                    (

                        fort.type ===

                        "fortified_urban"

                            ? 2

                            : 1

                    )

                )

            );

 

        if (level >= maxLevel) {

            return {

                success: false,

                reason: "工事已经达到最高等级"

            };

        }

 

        return {

            success: true,

            level,

            maxLevel

        };

    }

 

 

    repair(

        engineer,

        fort

    ) {

        const check =

            this.canRepair(

                engineer,

                fort

            );

 

        if (!check.success) {

            return check;

        }

 

        const before =

            check.level;

 

        const after =

            Math.min(

                check.maxLevel,

                before + 1

            );

 

        fort.level =

            after;

 

        fort.owner =

            engineer.faction;
return {

            success: true,

            type: "fortification_repair",

            engineer,

            fort,

            before,

            after

        };

    }

 

 

    // ========================================

    // 工事控制权

    //

    // 当某阵营单位占领该格时调用。

    // 工事本身不会消失，只改变控制方。

    // ========================================

 

    captureFortification(

        unit

    ) {

        if (!unit) {

            return null;

        }

 

        const fort =

            this.getFortificationAt(

                unit.q,

                unit.r

            );

 

        if (!fort) {

            return null;

        }

 

        const previousOwner =

            fort.owner ??

            null;

 

        fort.owner =

            unit.faction;

 

        return {

            fort,

            previousOwner,

            newOwner:

                unit.faction

        };

    }

 

 

    // ========================================

    // 城市防御状态文本

    // ========================================

 

    getFortificationText(unit) {

        const fort =

            this.getUnitFortification(

                unit

            );

 

        if (!fort) {

            return "无工事";

        }

 

        const level =

            this.getLevel(fort);

 

        if (

            fort.type ===

            "fortified_urban"

        ) {

            return `坚固城区 Lv.${level}`;

        }

 

        return `野战工事 Lv.${level}`;

    }

 

 

    // ========================================

    // 回合重置

    // ========================================

 

    resetUnit(unit) {

        if (!unit) {

            return;

        }

 

        // 当前版本工兵行动与普通攻击共用

        // CombatSystem 的 hasAttacked，

        // 因此这里暂时无需增加额外状态。

    }

}
