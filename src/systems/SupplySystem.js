// ========================================

// SupplySystem.js

// 台儿庄战役 - 补给系统

//

// 功能：

// 1. 补给来源与补给距离

// 2. 道路/铁路/城镇补给节点

// 3. 弹药与一般补给恢复

// 4. 被切断补给后的战斗惩罚

// 5. 与 ArtillerySystem.js 的 ammo 联动

// 6. 为后续增援、AI和胜利系统提供补给状态

// ========================================

 

export class SupplySystem {

 

    constructor(world) {

        this.world = world;

 

        this.config = {

            fullSupplyRange: 12,

            limitedSupplyRange: 20,

 

            normalAmmoRecovery: 18,

            limitedAmmoRecovery: 8,

 

            outOfSupplyAttackModifier: 0.80,

            outOfSupplyDefenseModifier: 0.90,

            outOfSupplyMovementModifier: 0.80,

 

            isolatedAttackModifier: 0.65,

            isolatedDefenseModifier: 0.78,

            isolatedMovementModifier: 0.60

        };

    }

 

 

    // ========================================

    // 六角格距离

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

    // 台儿庄场景补给源

    //

    // 中国军：

    // 徐州方向、运河南岸、韩庄方向

    //

    // 日军：

    // 峄县、临沂方向、北部道路

    // ========================================

 

    getDefaultSupplySources() {

        return [

            {

                id: "CHI_XUZHOU",

                name: "徐州方向补给线",

                faction: "chinese",

                q: 22,

                r: 57,

                capacity: 100,

                active: true

            },

 

            {

                id: "CHI_HANZHUANG",

                name: "韩庄补给节点",

                faction: "chinese",

                q: 76,

                r: 51,

                capacity: 70,

                active: true

            },

 

            {

                id: "JPN_YIXIAN",

                name: "峄县补给基地",

                faction: "japanese",

                q: 46,

                r: 5,

                capacity: 100,

                active: true

            },

 

            {

                id: "JPN_LINYI",

                name: "临沂方向补给线",

                faction: "japanese",

                q: 92,

                r: 12,

                capacity: 80,

                active: true

            }

        ];

    }

 

 

    getSupplySources() {

        return (

            this.world?.supplySources ??

            this.world?.map?.supplySources ??

            this.getDefaultSupplySources()

        );

    }

 

 

    // ========================================

    // 敌军控制检查

    // ========================================

 

    isEnemyNearPoint(point, faction, units = [], radius = 1) {

        return units.some(unit => {

            if (

                !unit ||

                unit.destroyed === true ||

                (unit.strength ?? 0) <= 0 ||

                unit.faction === faction

            ) {

                return false;

            }

 

            return this.getDistance(

                unit,

                point

            ) <= radius;

        });

    }

 

 

    // ========================================

    // 补给源是否有效

    // ========================================

 

    isSourceAvailable(source, units = []) {

        if (!source || source.active === false) {

            return false;

        }

 

        // 敌军直接占据或紧贴补给节点时，

        // 节点暂时失效。

        if (

            this.isEnemyNearPoint(

                source,

                source.faction,

                units,

                0

            )

        ) {

            return false;

        }

 

        return true;

    }

 

 

    // ========================================

    // 寻找最近补给源

    // ========================================

 

    findNearestSupplySource(unit, units = []) {

        if (!unit) return null;

 

        const candidates =

            this.getSupplySources()

                .filter(source =>

                    source.faction === unit.faction &&

                    this.isSourceAvailable(source, units)

                )

                .map(source => ({

                    source,

                    distance:

                        this.getDistance(

                            unit,

                            source

                        )

                }))

                .sort(

                    (a, b) =>

                        a.distance - b.distance

                );

 

        return candidates[0] ?? null;

    }

 

 

    // ========================================

    // 道路/铁路辅助

    //

    // 当前版本不做复杂路径寻路，

    // 只判断单位是否靠近道路或铁路。

    // 后续可升级为真正的补给路径网络。

    // ========================================

 

    getTransportBonus(unit) {

        if (!unit) return 0;

 

        const roads =

            this.world?.map?.roads ??

            [];

 

        const railways =

            this.world?.map?.railways ??

            [];

 

        let bonus = 0;

 

        const nearPolyline = (lines) => {

            for (const line of lines) {

                for (const point of line.points ?? []) {

                    const p = {

                        q: point[0],

                        r: point[1]

                    };

 

                    if (

                        this.getDistance(

                            unit,

                            p

                        ) <= 1

                    ) {

                        return true;

                    }

                }

            }

 

            return false;

        };

 

        if (nearPolyline(roads)) {

            bonus += 4;

        }

 

        if (nearPolyline(railways)) {

            bonus += 6;

        }

 

        return bonus;

    }

 

 

    // ========================================

    // 补给状态

    //

    // supplied       正常补给

    // limited        有限补给

    // out_of_supply  补给不足

    // isolated       被孤立

    // ========================================

 

    getSupplyState(unit, units = []) {

        if (!unit) {

            return {

                state: "isolated",

                distance: Infinity,

                source: null

            };

        }

 

        const nearest =

            this.findNearestSupplySource(

                unit,

                units

            );

 

        if (!nearest) {

            return {

                state: "isolated",

                distance: Infinity,

                source: null

            };

        }

 

        const transportBonus =

            this.getTransportBonus(unit);

 

        const effectiveFullRange =

            this.config.fullSupplyRange +

            transportBonus;

 

        const effectiveLimitedRange =

            this.config.limitedSupplyRange +

            transportBonus;

 

        if (

            nearest.distance <=

            effectiveFullRange

        ) {

            return {

                state: "supplied",

                distance: nearest.distance,

                source: nearest.source

            };

        }

 

        if (

            nearest.distance <=

            effectiveLimitedRange

        ) {

            return {

                state: "limited",

                distance: nearest.distance,

                source: nearest.source

            };

        }

 

        // 超出常规范围但仍有补给源，

        // 视为补给不足而非完全孤立。

        return {

            state: "out_of_supply",

            distance: nearest.distance,

            source: nearest.source

        };

    }

 

 

    // ========================================

    // 补给状态文本

    // ========================================

 

    getSupplyText(unit, units = []) {

        const info =

            this.getSupplyState(

                unit,

                units

            );

 

        switch (info.state) {

            case "supplied":

                return "补给正常";

 

            case "limited":

                return "有限补给";

 

            case "out_of_supply":

                return "补给不足";

 

            case "isolated":

            default:

                return "被孤立";

        }

    }

 

 

    // ========================================

    // 战斗修正

    // ========================================

 

    getAttackModifier(unit, units = []) {

        const state =

            this.getSupplyState(

                unit,

                units

            ).state;

 

        if (state === "isolated") {

            return this.config.isolatedAttackModifier;

        }

 

        if (state === "out_of_supply") {

            return this.config.outOfSupplyAttackModifier;

        }

 

        if (state === "limited") {

            return 0.92;

        }

 

        return 1.0;

    }

 

 

    getDefenseModifier(unit, units = []) {

        const state =

            this.getSupplyState(

                unit,

                units

            ).state;

 

        if (state === "isolated") {

            return this.config.isolatedDefenseModifier;

        }

 

        if (state === "out_of_supply") {

            return this.config.outOfSupplyDefenseModifier;

        }

 

        if (state === "limited") {

            return 0.96;

        }

 

        return 1.0;

    }

 

 

    getMovementModifier(unit, units = []) {

        const state =

            this.getSupplyState(

                unit,

                units

            ).state;

 

        if (state === "isolated") {

            return this.config.isolatedMovementModifier;

        }

 

        if (state === "out_of_supply") {

            return this.config.outOfSupplyMovementModifier;

        }

 

        if (state === "limited") {

            return 0.90;

        }

 

        return 1.0;

    }

 

 

    // ========================================

    // 弹药恢复

    //

    // 与 ArtillerySystem.js 直接联动。

    // 普通单位也可保留 ammo 字段。

    // ========================================

 

    recoverAmmo(unit, units = []) {

        if (!unit) {

            return null;

        }

 

        const info =

            this.getSupplyState(

                unit,

                units

            );

 

        const before =

            Number(

                unit.ammo ??

                100

            );

 

        let recovery = 0;

 

        if (info.state === "supplied") {

            recovery =

                this.config.normalAmmoRecovery;

        }

 

        if (info.state === "limited") {

            recovery =

                this.config.limitedAmmoRecovery;

        }

 

        // 补给不足或孤立：

        // 不恢复弹药。

        const after =

            Math.min(

                100,

                before + recovery

            );

 

        unit.ammo = after;

 

        return {

            state: info.state,

            source: info.source,

            before,

            recovery,

            after

        };

    }

 

 

    // ========================================

    // 补给消耗

    //

    // 当前版本用 supply 表示一般补给。

    // 炮兵额外消耗 ammo。

    // ========================================

 

    consumeSupply(unit, amount = 5) {

        if (!unit) return null;

 

        const before =

            Number(

                unit.supply ??

                100

            );

 

        const after =

            Math.max(

                0,

                before - amount

            );

 

        unit.supply = after;

 

        return {

            before,

            consumed: amount,

            after

        };

    }

 

 

    // ========================================

    // 每回合补给阶段

    // ========================================

 

    processUnitSupply(unit, units = []) {

        if (

            !unit ||

            unit.destroyed === true ||

            (unit.strength ?? 0) <= 0

        ) {

            return null;

        }

 

        const info =

            this.getSupplyState(

                unit,

                units

            );

 

        unit.supplyState =

            info.state;

 

        unit.supplySourceId =

            info.source?.id ??

            null;

 

        if (

            unit.supply === undefined

        ) {

            unit.supply = 100;

        }

 

        // 正常/有限补给恢复一般补给。

        if (info.state === "supplied") {

            unit.supply =

                Math.min(

                    100,

                    unit.supply + 15

                );

        }

 

        if (info.state === "limited") {

            unit.supply =

                Math.min(

                    100,

                    unit.supply + 6

                );

        }

 

        // 补给不足和孤立会逐渐消耗库存。

        if (info.state === "out_of_supply") {

            unit.supply =

                Math.max(

                    0,

                    unit.supply - 8

                );

        }

 

        if (info.state === "isolated") {

            unit.supply =

                Math.max(

                    0,

                    unit.supply - 14

                );

        }

 

        const ammoResult =

            this.recoverAmmo(

                unit,

                units

            );

 

        return {

            unit,

            state: info.state,

            source: info.source,

            distance: info.distance,

            supply: unit.supply,

            ammo: ammoResult

        };

    }

 

 

    processFactionSupply(units, faction) {

        const results = [];

 

        for (const unit of units) {

            if (

                unit &&

                unit.faction === faction

            ) {

                const result =

                    this.processUnitSupply(

                        unit,

                        units

                    );

 

                if (result) {

                    results.push(result);

                }

            }

        }

 

        return results;

    }

 

 

    // ========================================

    // 单位是否可实施高消耗行动

    // ========================================

 

    canPerformHeavyAction(unit, units = []) {

        const info =

            this.getSupplyState(

                unit,

                units

            );

 

        const supply =

            Number(

                unit?.supply ??

                100

            );

 

        if (info.state === "isolated") {

            return {

                success: false,

                reason: "单位被孤立，无法实施高消耗行动"

            };

        }

 

        if (supply < 20) {

            return {

                success: false,

                reason: "一般补给不足"

            };

        }

 

        return {

            success: true,

            state: info.state,

            supply

        };

    }

 

 

    // ========================================

    // AI用：补给危险程度

    // ========================================

 

    getSupplyRisk(unit, units = []) {

        const info =

            this.getSupplyState(

                unit,

                units

            );

 

        switch (info.state) {

            case "supplied":

                return 0;

 

            case "limited":

                return 1;

 

            case "out_of_supply":

                return 2;

 

            case "isolated":

            default:

                return 3;

        }

    }

}
