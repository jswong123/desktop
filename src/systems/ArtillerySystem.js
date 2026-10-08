// ========================================

// ArtillerySystem.js

// 台儿庄战役 - 炮兵与火力支援系统

//

// 设计原则：

// 1. 不改变现有 CombatSystem.js 的普通攻击逻辑。

// 2. 继续使用 type === "artillery"，保持现有战术符号。

// 3. 读取单位 JSON 中已有 attack / range / ammo。

// 4. 支持：最小射程、间接射击、观察、弹药、射程衰减、

//    人员杀伤、压制、工事破坏、炮兵行动重置。

// ========================================

 

export class ArtillerySystem {

 

    constructor(world, combatSystem) {

        this.world = world;

        this.combatSystem = combatSystem;

 

        // 每次炮击的基础弹药消耗。

        // 重炮会在 getAmmoCost() 中增加消耗。

        this.baseAmmoCost = 10;

    }

 

 

    // ========================================

    // 基础判断

    // ========================================

 

    isArtillery(unit) {

        return !!unit &&

            unit.type === "artillery" &&

            unit.destroyed !== true &&

            (unit.strength ?? 0) > 0;

    }

 

 

    getDistance(a, b) {

        if (this.combatSystem?.getDistance) {

            return this.combatSystem.getDistance(a, b);

        }

 

        if (!a || !b) return Infinity;

 

        const dq = a.q - b.q;

        const dr = a.r - b.r;

 

        return Math.max(

            Math.abs(dq),

            Math.abs(dr),

            Math.abs(dq + dr)

        );

    }

 

 

    // ========================================

    // 炮种识别

    //

    // 优先根据 attack/range 判断，

    // 因此不需要增加新的战术符号 type。

    // ========================================

 

    getArtilleryClass(unit) {

        const range = Number(

            unit.maxRange ??

            unit.range ??

            3

        );

 

        const attack = Number(

            unit.attack ??

            8

        );

 

        if (range >= 7 || attack >= 12) {

            return "heavy_150";

        }

 

        if (range >= 6 || attack >= 9) {

            return "heavy_105";

        }

 

        if (range >= 5 || attack >= 7) {

            return "field_75";

        }

 

        if (range >= 4 || attack >= 6) {

            return "mountain_75";

        }

 

        if (range >= 3 || attack >= 5) {

            return "mortar_81";

        }

 

        return "infantry_gun_92";

    }

 

 

    getMinRange(unit) {

        if (unit.minRange !== undefined) {

            return Math.max(

                0,

                Number(unit.minRange)

            );

        }

 

        switch (this.getArtilleryClass(unit)) {

            case "heavy_150":

                return 3;

 

            case "heavy_105":

                return 2;

 

            case "field_75":

                return 2;

 

            case "mountain_75":

                return 1;

 

            case "mortar_81":

                return 1;

 

            case "infantry_gun_92":

            default:

                return 0;

        }

    }

 

 

    getMaxRange(unit) {

        return Math.max(

            this.getMinRange(unit),

            Number(

                unit.maxRange ??

                unit.range ??

                3

            )

        );

    }

 

 

    // ========================================

    // 射程衰减

    // ========================================

 

    getRangeModifier(unit, distance) {

        const cls = this.getArtilleryClass(unit);

 

        if (

            distance < this.getMinRange(unit) ||

            distance > this.getMaxRange(unit)

        ) {

            return 0;

        }

 

        switch (cls) {

 

            case "heavy_150":

                if (distance >= 4 && distance <= 5) return 1.00;

                if (distance === 3 || distance === 6) return 0.80;

                if (distance === 7) return 0.60;

                return 0.70;

 

            case "heavy_105":

                if (distance >= 3 && distance <= 4) return 1.00;

                if (distance === 2 || distance === 5) return 0.85;

                if (distance === 6) return 0.65;

                return 0.75;

 

            case "field_75":

                if (distance >= 3 && distance <= 4) return 1.00;

                if (distance === 2) return 0.80;

                if (distance === 5) return 0.60;

                return 0.75;

 

            case "mountain_75":

                if (distance >= 2 && distance <= 3) return 1.00;

                return 0.80;

 

            case "mortar_81":

                if (distance === 2) return 1.00;

                return 0.80;

 

            case "infantry_gun_92":

            default:

                if (distance <= 1) return 1.00;

                return 0.80;

        }

    }

 

 

    // ========================================

    // 观察系统

    //

    // 近距离可自行观察。

    // 远距离必须由友军单位观察目标。

    //

    // 当前实现只依赖单位坐标和 faction，

    // 不要求修改现有 Renderer / 战术符号。

    // ========================================

 

    isTargetObserved(attacker, target, units = []) {

        if (!attacker || !target) {

            return false;

        }

 

        const distance =

            this.getDistance(

                attacker,

                target

            );

 

        // 92式步兵炮等近距离火力可以自行瞄准。

        if (distance <= 2) {

            return true;

        }

 

        return units.some(unit => {

 

            if (

                !unit ||

                unit === attacker ||

                unit.destroyed === true ||

                (unit.strength ?? 0) <= 0 ||

                unit.faction !== attacker.faction

            ) {

                return false;

            }

 

            // 前线部队在目标2格内视为完成观察。

            const observerDistance =

                this.getDistance(

                    unit,

                    target

                );

 

            return observerDistance <= 2;

        });

    }

 

 

    // ========================================

    // 弹药

    // ========================================

 

    getAmmoCost(unit) {

        switch (this.getArtilleryClass(unit)) {

            case "heavy_150":

                return 14;

 

            case "heavy_105":

                return 12;

 

            case "field_75":

                return 10;

 

            case "mountain_75":

                return 9;

 

            case "mortar_81":

                return 8;

 

            case "infantry_gun_92":

            default:

                return 7;

        }

    }

 

 

    hasEnoughAmmo(unit) {

        const ammo =

            Number(

                unit?.ammo ??

                100

            );

 

        return ammo >=

            this.getAmmoCost(unit);

    }

 

 

    // ========================================

    // 是否可以炮击

    // ========================================

 

    canBombard(

        attacker,

        target,

        units = []

    ) {

 

        if (

            !this.isArtillery(attacker) ||

            !target

        ) {

            return {

                success: false,

                reason: "该单位无法进行炮击"

            };

        }

 

        if (

            attacker.faction ===

            target.faction

        ) {

            return {

                success: false,

                reason: "不能炮击友军单位"

            };

        }

 

        if (

            target.destroyed === true ||

            (target.strength ?? 0) <= 0

        ) {

            return {

                success: false,

                reason: "目标已经被消灭"

            };

        }

 

        if (

            attacker.hasAttacked === true ||

            attacker.hasBombarded === true

        ) {

            return {

                success: false,

                reason: "该炮兵单位本回合已经行动"

            };

        }

 

        const distance =

            this.getDistance(

                attacker,

                target

            );

 

        const minRange =

            this.getMinRange(attacker);

 

        const maxRange =

            this.getMaxRange(attacker);

 

        if (

            distance < minRange ||

            distance > maxRange

        ) {

            return {

                success: false,

                reason:

                    `目标距离${distance}格，炮兵有效射程为${minRange}-${maxRange}格`

            };

        }

 

        if (!this.hasEnoughAmmo(attacker)) {

            return {

                success: false,

                reason: "炮兵弹药不足"

            };

        }

 

        if (

            !this.isTargetObserved(

                attacker,

                target,

                units

            )

        ) {

            return {

                success: false,

                reason: "目标未被友军观察，无法实施间接射击"

            };

        }

 

        return {

            success: true,

            distance,

            minRange,

            maxRange

        };

    }

 

 

    // ========================================

    // 工事读取

    //

    // 兼容两种情况：

    // 1. defender.fortificationLevel

    // 2. world.map.fortifications / world.fortifications

    // ========================================

 

    getFortificationAt(unit) {

        if (!unit) {

            return null;

        }

 

        if (

            Number(

                unit.fortificationLevel ??

                0

            ) > 0

        ) {

            return {

                level:

                    Number(

                        unit.fortificationLevel

                    ),

                embedded: true

            };

        }

 

        const fortifications =

            this.world?.map?.fortifications ??

            this.world?.fortifications ??

            [];

 

        return fortifications.find(

            fort =>

                fort.q === unit.q &&

                fort.r === unit.r

        ) ?? null;

    }

 

 

    getFortificationLevel(unit) {

        const fort =

            this.getFortificationAt(unit);

 

        return Math.max(

            0,

            Number(

                fort?.level ??

                0

            )

        );

    }

 

 

    // ========================================

    // 火炮参数

    // ========================================

 

    getBombardmentProfile(unit) {

        switch (this.getArtilleryClass(unit)) {

 

            case "heavy_150":

                return {

                    casualty: 1.20,

                    suppression: 12,

                    fortDamage: 14

                };

 

            case "heavy_105":

                return {

                    casualty: 1.05,

                    suppression: 9,

                    fortDamage: 9

                };

 

            case "field_75":

                return {

                    casualty: 1.00,

                    suppression: 7,

                    fortDamage: 6

                };

 

            case "mountain_75":

                return {

                    casualty: 0.90,

                    suppression: 6,

                    fortDamage: 5

                };

 

            case "mortar_81":

                return {

                    casualty: 1.05,

                    suppression: 6,

                    fortDamage: 3

                };

 

            case "infantry_gun_92":

            default:

                return {

                    casualty: 0.85,

                    suppression: 3,

                    fortDamage: 5

                };

        }

    }

 

 

    // ========================================

    // 炮击伤害

    // ========================================

 

    calculateBombardment(

        attacker,

        defender

    ) {

 

        const distance =

            this.getDistance(

                attacker,

                defender

            );

 

        const rangeModifier =

            this.getRangeModifier(

                attacker,

                distance

            );

 

        const profile =

            this.getBombardmentProfile(

                attacker

            );

 

        const attack =

            Number(

                attacker.attack ??

                8

            );

 

        const defense =

            Math.max(

                1,

                Number(

                    defender.defense ??

                    this.combatSystem?.getDefense?.(defender) ??

                    5

                )

            );

 

        const strength =

            Math.max(

                1,

                Number(

                    attacker.strength ??

                    100

                )

            );

 

        const maxStrength =

            Math.max(

                1,

                Number(

                    attacker.maxStrength ??

                    strength

                )

            );

 

        // 使用相对编制完整度，而不是固定除以150。

        // 这样炮兵营不会因为人数较大而造成失控伤害。

        const strengthFactor =

            Math.max(

                0.30,

                Math.min(

                    1.00,

                    strength / maxStrength

                )

            );

 

        const fortLevel =

            this.getFortificationLevel(

                defender

            );

 

        // 工事降低人员伤亡，但不能完全免疫炮击。

        const fortProtection =

            Math.max(

                0.45,

                1 - fortLevel * 0.16

            );

 

        const randomFactor =

            0.85 +

            Math.random() * 0.30;

 

        let casualtyDamage =

            14 *

            (attack / defense) *

            strengthFactor *

            rangeModifier *

            profile.casualty *

            fortProtection *

            randomFactor;

 

        // 炮击对装甲目标杀伤降低。

        if (defender.type === "armor") {

            casualtyDamage *= 0.60;

        }

 

        casualtyDamage =

            Math.max(

                1,

                Math.round(casualtyDamage)

            );

 

        let suppressionGain =

            profile.suppression *

            rangeModifier *

            randomFactor;

 

        // 工事中的部队仍会被压制，但效果略低。

        suppressionGain *=

            Math.max(

                0.65,

                1 - fortLevel * 0.08

            );

 

        suppressionGain =

            Math.max(

                1,

                Math.round(suppressionGain)

            );

 

        let fortificationDamage = 0;

 

        if (fortLevel > 0) {

            const fortRoll =

                profile.fortDamage *

                rangeModifier *

                randomFactor;

 

            // 每10点有效破坏值大约有机会削弱一级工事。

            fortificationDamage =

                Math.floor(

                    fortRoll / 10

                );

 

            // 150毫米重炮在命中坚固工事时至少具有破坏机会。

            if (

                this.getArtilleryClass(attacker) === "heavy_150" &&

                fortificationDamage === 0 &&

                fortRoll >= 7

            ) {

                fortificationDamage = 1;

            }

 

            fortificationDamage =

                Math.min(

                    fortLevel,

                    fortificationDamage

                );

        }

 

        return {

            casualtyDamage,

            suppressionGain,

            fortificationDamage,

            distance,

            rangeModifier

        };

    }

 

 

    // ========================================

    // 工事破坏

    // ========================================

 

    applyFortificationDamage(

        defender,

        amount

    ) {

 

        if (amount <= 0) {

            return {

                before: this.getFortificationLevel(defender),

                after: this.getFortificationLevel(defender)

            };

        }

 

        const fort =

            this.getFortificationAt(defender);

 

        if (!fort) {

            return {

                before: 0,

                after: 0

            };

        }

 

        const before =

            Math.max(

                0,

                Number(

                    fort.level ??

                    0

                )

            );

 

        const after =

            Math.max(

                0,

                before - amount

            );

 

        if (fort.embedded) {

            defender.fortificationLevel =

                after;

        } else {

            fort.level =

                after;

        }

 

        return {

            before,

            after

        };

    }

 

 

    // ========================================

    // 执行炮击

    // ========================================

 

    bombard(

        attacker,

        defender,

        units = []

    ) {

 

        const check =

            this.canBombard(

                attacker,

                defender,

                units

            );

 

        if (!check.success) {

            return check;

        }

 

        const beforeStrength =

            Number(

                defender.strength ??

                0

            );

 

        const beforeSuppression =

            Number(

                defender.suppression ??

                0

            );

 

        const result =

            this.calculateBombardment(

                attacker,

                defender

            );

 

        defender.strength =

            Math.max(

                0,

                beforeStrength -

                result.casualtyDamage

            );

 

        defender.suppression =

            Math.min(

                100,

                beforeSuppression +

                result.suppressionGain

            );

 

        const fortification =

            this.applyFortificationDamage(

                defender,

                result.fortificationDamage

            );

 

        const ammoBefore =

            Number(

                attacker.ammo ??

                100

            );

 

        const ammoCost =

            this.getAmmoCost(

                attacker

            );

 

        attacker.ammo =

            Math.max(

                0,

                ammoBefore -

                ammoCost

            );

 

        // 与现有 CombatSystem 共用 hasAttacked，

        // 防止同一回合炮击后再进行普通攻击。

        attacker.hasBombarded = true;

        attacker.hasAttacked = true;

 

        let destroyed = false;

 

        if (defender.strength <= 0) {

            defender.strength = 0;

            defender.destroyed = true;

            destroyed = true;

        }

 

        return {

            success: true,

 

            type: "artillery_bombardment",

 

            attacker,

            defender,

 

            distance:

                result.distance,

 

            rangeModifier:

                result.rangeModifier,

 

            beforeStrength,

            damage:

                result.casualtyDamage,

            afterStrength:

                defender.strength,

 

            beforeSuppression,

            suppressionGain:

                result.suppressionGain,

            afterSuppression:

                defender.suppression,

 

            fortificationBefore:

                fortification.before,

            fortificationDamage:

                result.fortificationDamage,

            fortificationAfter:

                fortification.after,

 

            ammoBefore,

            ammoCost,

            ammoAfter:

                attacker.ammo,

 

            destroyed

        };

    }

 

 

    // ========================================

    // 射程覆盖

    // ========================================

 

    getBombardableUnits(

        attacker,

        units = []

    ) {

        if (!this.isArtillery(attacker)) {

            return [];

        }

 

        return units.filter(

            unit =>

                unit &&

                unit.faction !== attacker.faction &&

                this.canBombard(

                    attacker,

                    unit,

                    units

                ).success

        );

    }

 

 

    // ========================================

    // 回合重置

    // ========================================

 

    resetUnit(unit) {

        if (!unit) return;

 

        unit.hasBombarded = false;

    }

 

 

    resetFaction(

        units,

        faction

    ) {

        for (const unit of units) {

            if (

                unit &&

                unit.faction === faction

            ) {

                this.resetUnit(unit);

            }

        }

    }

}
