// ========================================
// MovementSystem.js
//
// 单位移动系统
//
// 当前规则：
// 1. 不同兵种拥有不同基础移动点
// 2. 根据地形计算移动范围
// 3. 移动消耗行动点
// 4. 一个六角格只能存在一个存活单位
// 5. 已被摧毁的单位不占据格子
// 6. 玩家与 AI 使用相同的占格规则
// ========================================


import {
    Pathfinding
} from "./Pathfinding.js";


export class MovementSystem {

    constructor(world) {

        this.world =
            world;


        this.pathfinding =
            new Pathfinding(
                world
            );


        this.selectedUnit =
            null;


        this.reachable =
            new Map();


        this.previous =
            new Map();


        // 保存当前单位列表
        // 用于移动时进行占格检查

        this.units =
            [];

    }


    // ========================================
    // 单位基础移动点
    // ========================================

    inferMovementClass(unit) {
        const explicit=String(unit?.movementClass??"").toLowerCase();
        if (["tracked","wheeled","amphibious","foot"].includes(explicit)) return explicit;
        const type=String(unit?.type??unit?.unitType??"").toLowerCase();
        if (["tank","armor","artillery","mechanized_infantry","engineer"].includes(type)) return "tracked";
        if (["wheeled_infantry","motorized_infantry","motorized","headquarters","support","supply","air_defense","recon","reconnaissance"].includes(type)) return "wheeled";
        if (type==="amphibious_armor" || unit?.amphibious===true) return "amphibious";
        return "foot";
    }

    getBaseMovement(unit) {
        // 现代机械化单位燃油耗尽后不能继续机动；徒步单位不受此限制。
        if (unit?.modern && this.inferMovementClass(unit) !== "foot" && Number(unit?.fuel ?? 100) <= 0) return 0;

        const values = {

            infantry: 4,

            motorized: 7,

            armor: 8,

            artillery: 4,

            antitank: 4,

            antiair: 4,

            engineer: 4,

            reconnaissance: 10,

            cavalry: 7,

            headquarters: 5

        };


        return (
            unit.movement ??
            values[unit.type] ??
            4
        );

    }


    // ========================================
    // 判断单位是否仍然存活
    // ========================================

    isUnitAlive(unit) {

        if (!unit) {

            return false;

        }


        if (
            unit.destroyed === true ||
            unit.offMap === true
        ) {

            return false;

        }


        if (
            Number(
                unit.strength ?? 100
            ) <= 0
        ) {

            return false;

        }


        return true;

    }


    // ========================================
    // 检查某格是否已经存在单位
    //
    // 一格只能存在一个存活单位
    // ========================================

    isHexOccupied(
        q,
        r,
        units = this.units,
        movingUnit = null
    ) {

        if (
            !Array.isArray(units)
        ) {

            return false;

        }


        return units.some(
            unit => {

                // ----------------------------
                // 忽略空单位
                // ----------------------------

                if (!unit) {

                    return false;

                }


                // ----------------------------
                // 忽略正在移动的单位自己
                // ----------------------------

                if (
                    unit ===
                    movingUnit
                ) {

                    return false;

                }


                // ----------------------------
                // 已被摧毁的单位不占格
                // ----------------------------

                if (
                    !this.isUnitAlive(
                        unit
                    )
                ) {

                    return false;

                }


                // ----------------------------
                // 检查坐标
                // ----------------------------

                return (
                    Number(unit.q) ===
                        Number(q) &&
                    Number(unit.r) ===
                        Number(r)
                );

            }
        );

    }


    // ========================================
    // 获取某格上的单位
    //
    // 后续战斗、UI、堆叠检测都可以使用
    // ========================================

    getUnitAt(
        q,
        r,
        units = this.units,
        ignoreUnit = null
    ) {

        if (
            !Array.isArray(units)
        ) {

            return null;

        }


        return (
            units.find(
                unit => {

                    if (!unit) {

                        return false;

                    }


                    if (
                        unit ===
                        ignoreUnit
                    ) {

                        return false;

                    }


                    if (
                        !this.isUnitAlive(
                            unit
                        )
                    ) {

                        return false;

                    }


                    return (
                        Number(unit.q) ===
                            Number(q) &&
                        Number(unit.r) ===
                            Number(r)
                    );

                }
            ) ??
            null
        );

    }


    // ========================================
    // 确保单位存在移动状态
    // ========================================

    initializeUnit(unit) {

        if (!unit) {

            return;

        }


        if (
            unit.maxMovementPoints ===
            undefined
        ) {

            unit.maxMovementPoints =
                this.getBaseMovement(
                    unit
                );

        }


        if (
            unit.movementPoints ===
            undefined
        ) {

            unit.movementPoints =
                unit.maxMovementPoints;

        }

    }


    // ========================================
    // 选择移动单位
    // ========================================

    selectUnit(
        unit,
        units = []
    ) {

        this.clear();


        if (!unit) {

            return;

        }


        if (
            !this.isUnitAlive(
                unit
            )
        ) {

            return;

        }


        // ====================================
        // 保存当前完整单位列表
        // ====================================

        if (
            Array.isArray(units)
        ) {

            this.units =
                units;

        }


        this.initializeUnit(
            unit
        );


        this.selectedUnit =
            unit;


        // ====================================
        // 计算基础可移动范围
        // ====================================

        const result =
            this.pathfinding
                .getReachableHexes(

                    unit,

                    unit.movementPoints,

                    units

                );


        this.reachable =
            result.costs;


        this.previous =
            result.previous;


        // ====================================
        // 删除已经被单位占据的目标格
        //
        // 这样这些格子不会显示为
        // “可以移动”的高亮格。
        // ====================================

        for (
            const key
            of Array.from(
                this.reachable.keys()
            )
        ) {

            const parts =
                key.split(",");


            const q =
                Number(
                    parts[0]
                );


            const r =
                Number(
                    parts[1]
                );


            if (
                this.isHexOccupied(
                    q,
                    r,
                    units,
                    unit
                )
            ) {

                this.reachable.delete(
                    key
                );

            }

        }

    }


    // ========================================
    // 是否可以移动到某格
    // ========================================

    canMoveTo(
        q,
        r,
        units = this.units
    ) {

        if (
            !this.selectedUnit
        ) {

            return false;

        }


        // ====================================
        // 首先必须属于可移动范围
        // ====================================

        if (
            !this.reachable.has(
                `${q},${r}`
            )
        ) {

            return false;

        }


        // ====================================
        // 然后检查目标格是否被占据
        // ====================================

        if (
            this.isHexOccupied(
                q,
                r,
                units,
                this.selectedUnit
            )
        ) {

            return false;

        }


        return true;

    }


    // ========================================
    // 移动成本
    // ========================================

    getMoveCost(q, r) {

        return (
            this.reachable.get(
                `${q},${r}`
            ) ??
            null
        );

    }


    // ========================================
    // 执行移动
    // ========================================

    moveTo(
        q,
        r,
        units = this.units
    ) {

        // ====================================
        // 没有选中单位
        // ====================================

        if (
            !this.selectedUnit
        ) {

            return null;

        }


        const unit =
            this.selectedUnit;


        // ====================================
        // 单位已经被摧毁
        // ====================================

        if (
            !this.isUnitAlive(
                unit
            )
        ) {

            return null;

        }


        // ====================================
        // 再次检查目标格
        //
        // 即使 UI 出现异常，
        // 这里也会阻止单位重叠。
        // ====================================

        if (
            this.isHexOccupied(
                q,
                r,
                units,
                unit
            )
        ) {

            console.log(
                `[移动] 目标格 (${q}, ${r}) 已有单位，禁止进入`
            );


            return {

                success: false,

                reason:
                    "occupied",

                unit,

                q,

                r

            };

        }


        // ====================================
        // 检查是否属于可移动范围
        // ====================================

        if (
            !this.canMoveTo(
                q,
                r,
                units
            )
        ) {

            return null;

        }


        // ====================================
        // 获取移动成本
        // ====================================

        const cost =
            this.getMoveCost(
                q,
                r
            );


        if (
            cost === null
        ) {

            return null;

        }


        // ====================================
        // 构建移动路径
        // ====================================

        const path =
            this.pathfinding
                .buildPath(

                    unit,

                    q,

                    r,

                    this.previous

                );


        if (
            path.length === 0
        ) {

            return null;

        }


        // ====================================
        // 保存移动前位置
        // ====================================

        const from = {

            q:
                unit.q,

            r:
                unit.r

        };


        // ====================================
        // 最后一次占格检查
        //
        // 防止在未来加入动画、
        // AI异步行动等机制后产生重叠。
        // ====================================

        if (
            this.isHexOccupied(
                q,
                r,
                units,
                unit
            )
        ) {

            console.log(
                `[移动] 移动取消：(${q}, ${r}) 已被其他单位占据`
            );


            return {

                success: false,

                reason:
                    "occupied",

                unit,

                from,

                to: {
                    q,
                    r
                }

            };

        }


        // ====================================
        // 正式移动单位
        // ====================================

        unit.q =
            q;


        unit.r =
            r;


        // ====================================
        // 扣除移动点
        // ====================================

        unit.movementPoints =
            Math.max(

                0,

                unit.movementPoints -
                cost

            );


        // ====================================
        // 移动结果
        // ====================================

        const result = {

            success:
                true,

            unit,

            from,

            to: {
                q,
                r
            },

            cost,

            path

        };


        console.log(

            `[移动系统] ${unit.id ?? unit.name ?? unit.type} ` +
            `从 (${from.q}, ${from.r}) ` +
            `移动到 (${q}, ${r}) ` +
            `消耗: ${cost} ` +
            `剩余行动点: ${unit.movementPoints}`

        );


        // ====================================
        // 移动之后重新计算
        // 剩余移动范围
        //
        // 重要：
        // 必须继续传入 units，
        // 否则占格系统会失去其他单位信息。
        // ====================================

        this.selectUnit(
            unit,
            units
        );


        return result;

    }


    // ========================================
    // 清除移动状态
    // ========================================

    clear() {

        this.selectedUnit =
            null;


        this.reachable =
            new Map();


        this.previous =
            new Map();


        // 注意：
        // 不清除 this.units。
        //
        // 因为 this.units 保存的是当前战场
        // 单位列表，后续移动仍然需要它。

    }


    // ========================================
    // 新回合恢复单个单位移动点
    // ========================================

    resetUnit(unit) {

        if (!unit) {

            return;

        }


        // 已被摧毁单位无需恢复行动点

        if (
            !this.isUnitAlive(
                unit
            )
        ) {

            return;

        }


        this.initializeUnit(
            unit
        );


        unit.movementPoints =
            unit.maxMovementPoints;

    }


    // ========================================
    // 新回合恢复整个阵营移动点
    // ========================================

    resetFaction(
        units,
        faction
    ) {

        if (
            !Array.isArray(units)
        ) {

            return;

        }


        // 更新当前战场单位列表

        this.units =
            units;


        for (
            const unit
            of units
        ) {

            if (
                unit.faction ===
                faction
            ) {

                this.resetUnit(
                    unit
                );

            }

        }

    }

}
