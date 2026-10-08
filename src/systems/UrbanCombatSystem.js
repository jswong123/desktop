// ========================================

// UrbanCombatSystem.js

// 台儿庄战役 - 城市巷战系统

//

// 功能：

// 1. 识别台儿庄城区/坚固城区

// 2. 城市近战与逐格争夺

// 3. 步兵、机枪、工兵的巷战差异

// 4. 装甲单位在城区受限

// 5. 炮兵近距离火力与重炮破坏后的协同

// 6. 城区控制权、争夺状态和巷战疲劳

// ========================================

 

export class UrbanCombatSystem {

 

    constructor(world, fortificationSystem = null) {

        this.world = world;

        this.fortificationSystem = fortificationSystem;

 

        this.config = {

            urbanAttackModifier: 0.85,

            urbanDefenseModifier: 1.20,

 

            infantryBonus: 1.10,

            machinegunDefenseBonus: 1.18,

            engineerAttackBonus: 1.35,

 

            armorAttackModifier: 0.65,

            armorDefenseModifier: 0.80,

            armorMovementModifier: 0.55,

 

            artilleryDirectFireModifier: 0.75,

 

            fatiguePerAssault: 6,

            fatiguePerDefense: 4,

 

            suppressionCloseCombatBonus: 1.15

        };

    }

 

 

    // ========================================

    // 基础距离

    // ========================================

 

    getDistance(a, b) {

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

    // 地形读取

    // ========================================

 

    getTerrainAt(q, r) {

        const terrain =

            this.world?.map?.terrain ??

            [];

 

        return terrain.find(

            hex =>

                hex.q === q &&

                hex.r === r

        ) ?? null;

    }

 

 

    getSettlementAt(q, r) {

        const settlements =

            this.world?.map?.settlements ??

            [];

 

        return settlements.find(

            place =>

                place.q === q &&

                place.r === r

        ) ?? null;

    }

 

 

    // ========================================

    // 是否为城区

    // ========================================

 

    isUrbanHex(q, r) {

        const terrain =

            this.getTerrainAt(q, r);

 

        if (

            terrain?.type === "urban"

        ) {

            return true;

        }

 

        const fort =

            this.world?.map?.fortifications

                ?.find(

                    item =>

                        item.q === q &&

                        item.r === r

                );

 

        if (

            fort?.type ===

            "fortified_urban"

        ) {

            return true;

        }

 

        const settlement =

            this.getSettlementAt(q, r);

 

        return (

            settlement?.type === "major_city"

        );

    }

 

 

    isUnitInUrban(unit) {

        if (!unit) return false;

 

        return this.isUrbanHex(

            unit.q,

            unit.r

        );

    }

 

 

    // ========================================

    // 台儿庄核心城区

    // ========================================

 

    isTaierzhuangCore(q, r) {

        const center = {

            q: 48,

            r: 35

        };

 

        return (

            this.getDistance(

                { q, r },

                center

            ) <= 3

        );

    }

 

 

    // ========================================

    // 城市攻击修正

    // ========================================

 

    getAttackModifier(attacker, defender) {

 

        if (

            !attacker ||

            !defender ||

            !this.isUnitInUrban(defender)

        ) {

            return 1.0;

        }

 

        let modifier =

            this.config.urbanAttackModifier;

 

        switch (attacker.type) {

 

            case "infantry":

                modifier *=

                    this.config.infantryBonus;

                break;

 

            case "engineer":

                modifier *=

                    this.config.engineerAttackBonus;

                break;

 

            case "armor":

                modifier *=

                    this.config.armorAttackModifier;

                break;

 

            case "artillery":

                modifier *=

                    this.config.artilleryDirectFireModifier;

                break;

 

            default:

                break;

        }

 

        // 工兵攻击坚固城区时，

        // 再给予小幅攻坚优势。

        if (

            attacker.type === "engineer" &&

            this.fortificationSystem

        ) {

            modifier *=

                this.fortificationSystem

                    .getEngineerAssaultBonus(

                        attacker,

                        defender

                    );

        }

 

        return Math.max(

            0.35,

            modifier

        );

    }

 

 

    // ========================================

    // 城市防御修正

    // ========================================

 

    getDefenseModifier(defender) {

 

        if (

            !defender ||

            !this.isUnitInUrban(defender)

        ) {

            return 1.0;

        }

 

        let modifier =

            this.config.urbanDefenseModifier;

 

        if (

            defender.type ===

            "machinegun"

        ) {

            modifier *=

                this.config

                    .machinegunDefenseBonus;

        }

 

        if (

            defender.type ===

            "armor"

        ) {

            modifier *=

                this.config

                    .armorDefenseModifier;

        }

 

        return modifier;

    }

 

 

    // ========================================

    // 城区移动修正

    // ========================================

 

    getMovementModifier(unit, q, r) {

 

        if (

            !unit ||

            !this.isUrbanHex(q, r)

        ) {

            return 1.0;

        }

 

        if (

            unit.type === "armor"

        ) {

            return this.config

                .armorMovementModifier;

        }

 

        if (

            unit.type === "artillery"

        ) {

            return 0.75;

        }

 

        return 0.90;

    }

 

 

    // ========================================

    // 巷战是否允许

    //

    // 只有相邻攻击才视为真正的城市近战。

    // ========================================

 

    canUrbanAssault(attacker, defender) {

 

        if (!attacker || !defender) {

            return {

                success: false,

                reason: "缺少攻击单位或目标"

            };

        }

 

        if (

            attacker.faction ===

            defender.faction

        ) {

            return {

                success: false,

                reason: "不能攻击友军"

            };

        }

 

        if (

            !this.isUnitInUrban(defender)

        ) {

            return {

                success: false,

                reason: "目标不在城区"

            };

        }

 

        const distance =

            this.getDistance(

                attacker,

                defender

            );

 

        if (distance > 1) {

            return {

                success: false,

                reason: "巷战必须攻击相邻城区"

            };

        }

 

        if (

            attacker.destroyed === true ||

            (attacker.strength ?? 0) <= 0

        ) {

            return {

                success: false,

                reason: "攻击单位已失去战斗能力"

            };

        }

 

        if (

            defender.destroyed === true ||

            (defender.strength ?? 0) <= 0

        ) {

            return {

                success: false,

                reason: "目标已经被消灭"

            };

        }

 

        return {

            success: true,

            distance

        };

    }

 

 

    // ========================================

    // 城市近战伤害修正

    //

    // 本系统不取代 CombatSystem，

    // 而是提供最终倍率。

    // ========================================

 

    getCloseCombatDamageModifier(

        attacker,

        defender

    ) {

        const check =

            this.canUrbanAssault(

                attacker,

                defender

            );

 

        if (!check.success) {

            return 1.0;

        }

 

        let modifier =

            this.getAttackModifier(

                attacker,

                defender

            );

 

        modifier /=

            this.getDefenseModifier(

                defender

            );

 

        // 已被严重压制的守军在近战中更脆弱。

        const suppression =

            Number(

                defender.suppression ??

                0

            );

 

        if (suppression >= 50) {

            modifier *=

                this.config

                    .suppressionCloseCombatBonus;

        }

 

        return Math.max(

            0.30,

            modifier

        );

    }

 

 

    // ========================================

    // 巷战后的疲劳

    // ========================================

 

    applyUrbanFatigue(

        attacker,

        defender

    ) {

 

        if (

            !this.isUnitInUrban(defender)

        ) {

            return;

        }

 

        attacker.fatigue =

            Math.min(

                100,

                Number(

                    attacker.fatigue ??

                    0

                ) +

                this.config

                    .fatiguePerAssault

            );

 

        defender.fatigue =

            Math.min(

                100,

                Number(

                    defender.fatigue ??

                    0

                ) +

                this.config

                    .fatiguePerDefense

            );

    }

 

 

    // ========================================

    // 巷战额外压制

    // ========================================

 

    applyUrbanSuppression(

        attacker,

        defender,

        baseDamage = 0

    ) {

 

        if (

            !this.isUnitInUrban(defender)

        ) {

            return 0;

        }

 

        let gain =

            Math.max(

                2,

                Math.round(

                    baseDamage * 0.20

                )

            );

 

        if (

            attacker.type === "machinegun"

        ) {

            gain += 4;

        }

 

        if (

            attacker.type === "engineer"

        ) {

            gain += 3;

        }

 

        defender.suppression =

            Math.min(

                100,

                Number(

                    defender.suppression ??

                    0

                ) + gain

            );

 

        return gain;

    }

 

 

    // ========================================

    // 装甲单位城区限制

    // ========================================

 

    getArmorUrbanStatus(unit) {

 

        if (

            !unit ||

            unit.type !== "armor"

        ) {

            return null;

        }

 

        if (

            !this.isUnitInUrban(unit)

        ) {

            return {

                restricted: false,

                text: "装甲单位处于开阔地形"

            };

        }

 

        return {

            restricted: true,

            attackModifier:

                this.config

                    .armorAttackModifier,

 

            defenseModifier:

                this.config

                    .armorDefenseModifier,

 

            movementModifier:

                this.config

                    .armorMovementModifier,

 

            text:

                "装甲单位在城区受到机动与战斗限制"

        };

    }

 

 

    // ========================================

    // 城区控制

    // ========================================

 

    getHexControl(

        q,

        r,

        units = []

    ) {

 

        const occupying =

            units.filter(

                unit =>

                    unit &&

                    unit.offMap !== true &&

                    unit.destroyed !== true &&

                    (unit.strength ?? 0) > 0 &&

                    unit.q === q &&

                    unit.r === r

            );

 

        const factions =

            new Set(

                occupying.map(

                    unit =>

                        unit.faction

                )

            );

 

        if (factions.size === 0) {

            return "neutral";

        }

 

        if (factions.size > 1) {

            return "contested";

        }

 

        return [

            ...factions

        ][0];

    }

 

 

    // ========================================

    // 台儿庄城区总体控制率

    //

    // 以核心区半径3格内的urban格为统计对象。

    // ========================================

 

    getTaierzhuangControl(units = []) {

 

        const urbanHexes = [];

 

        for (

            let q = 44;

            q <= 52;

            q++

        ) {

            for (

                let r = 32;

                r <= 38;

                r++

            ) {

                if (

                    this.isUrbanHex(q, r) &&

                    this.isTaierzhuangCore(

                        q,

                        r

                    )

                ) {

                    urbanHexes.push(

                        { q, r }

                    );

                }

            }

        }

 

        let chinese = 0;

        let japanese = 0;

        let contested = 0;

        let neutral = 0;

 

        for (const hex of urbanHexes) {

 

            const control =

                this.getHexControl(

                    hex.q,

                    hex.r,

                    units

                );

 

            if (

                control === "chinese"

            ) {

                chinese++;

            } else if (

                control === "japanese"

            ) {

                japanese++;

            } else if (

                control === "contested"

            ) {

                contested++;

            } else {

                neutral++;

            }

        }

 

        const total =

            Math.max(

                1,

                urbanHexes.length

            );

 

        return {

            total,

            chinese,

            japanese,

            contested,

            neutral,

 

            chinesePercent:

                Math.round(

                    chinese /

                    total *

                    100

                ),

 

            japanesePercent:

                Math.round(

                    japanese /

                    total *

                    100

                )

        };

    }

 

 

    // ========================================

    // 城市争夺状态

    // ========================================

 

    getTaierzhuangStatus(units = []) {

 

        const control =

            this.getTaierzhuangControl(

                units

            );

 

        if (

            control.japanesePercent >= 70

        ) {

            return {

                state: "japanese_dominant",

                text: "日军已控制台儿庄大部"

            };

        }

 

        if (

            control.chinesePercent >= 70

        ) {

            return {

                state: "chinese_dominant",

                text: "中国军仍牢固控制台儿庄"

            };

        }

 

        if (

            control.japanese > 0 &&

            control.chinese > 0

        ) {

            return {

                state: "heavy_fighting",

                text: "台儿庄城区正在激烈争夺"

            };

        }

 

        return {

            state: "unstable",

            text: "台儿庄城区控制状态不稳定"

        };

    }

 

 

    // ========================================

    // 占领城区后的工事控制权

    // ========================================

 

    captureUrbanHex(unit) {

 

        if (

            !unit ||

            !this.isUnitInUrban(unit)

        ) {

            return null;

        }

 

        if (

            this.fortificationSystem

        ) {

            return this

                .fortificationSystem

                .captureFortification(

                    unit

                );

        }

 

        return null;

    }

 

 

    // ========================================

    // 战斗日志文本

    // ========================================

 

    getCombatText(

        attacker,

        defender

    ) {

 

        if (

            !this.isUnitInUrban(defender)

        ) {

            return "普通野战";

        }

 

        if (

            attacker?.type === "engineer"

        ) {

            return "工兵攻坚";

        }

 

        if (

            attacker?.type === "armor"

        ) {

            return "装甲部队进入城区作战";

        }

 

        if (

            attacker?.type === "machinegun"

        ) {

            return "城区机枪火力压制";

        }

 

        return "城市巷战";

    }

}
