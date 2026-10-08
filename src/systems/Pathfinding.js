import { TerrainMovementSystem } from "./TerrainMovementSystem.js";
// ========================================
// Pathfinding.js
//
// 六角格寻路系统
//
// V0.5 单位占格规则：
// 1. 一个六角格只能存在一个存活单位
// 2. 己方单位占据的格子不可进入
// 3. 敌方单位占据的格子不可进入
// 4. 存活单位同时构成寻路障碍
// 5. destroyed 或 strength <= 0 的单位不占格
// ========================================


export class Pathfinding {

    constructor(world) {

        this.world = world;

    }


    // ========================================
    // 六方向
    // ========================================

    getNeighbors(q, r) {

        return [

            { q: q + 1, r: r },

            { q: q - 1, r: r },

            { q: q, r: r + 1 },

            { q: q, r: r - 1 },

            { q: q + 1, r: r - 1 },

            { q: q - 1, r: r + 1 }

        ].filter(
            hex =>
                this.isInsideMap(
                    hex.q,
                    hex.r
                )
        );

    }


    // ========================================
    // 地图边界
    // ========================================

    isInsideMap(q, r) {

        return (
            q >= 0 &&
            r >= 0 &&
            q < this.world.width &&
            r < this.world.height
        );

    }


    // ========================================
    // Hex Key
    // ========================================

    key(q, r) {

        return `${q},${r}`;

    }


    // ========================================
    // 判断单位是否存活
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
    // 判断 Hex 是否被单位占据
    // ========================================

    isHexOccupied(
        q,
        r,
        units = [],
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
                // 空单位忽略
                // ----------------------------

                if (!unit) {

                    return false;

                }


                // ----------------------------
                // 忽略正在寻路的单位自己
                // ----------------------------

                if (
                    unit ===
                    movingUnit
                ) {

                    return false;

                }


                // ----------------------------
                // 死亡单位不占格
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
    // ========================================

    getUnitAt(
        q,
        r,
        units = [],
        movingUnit = null
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
                        movingUnit
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
    // 地形移动成本
    // ========================================

    terrainCost(unit, q, r) {
        this.terrainMovement ??= new TerrainMovementSystem(this.world);
        return this.terrainMovement.cost(unit, q, r);
    }


    // 城墙 / 城门边界：
    // 1. map.gates 中开放的城门可直接跨越；
    // 2. wallEdge 自身 status=open/breached/destroyed 也可跨越（兼容旧数据）；
    // 3. 其余完整城墙阻挡移动。
    isBlockedByWall(q1, r1, q2, r2) {
        const same = (p, q, r) =>
            Number(p?.q) === Number(q) && Number(p?.r) === Number(r);

        const gates = this.world?.gates ?? this.world?.config?.gates ?? [];
        if (Array.isArray(gates)) {
            const gate = gates.find(g =>
                g?.open !== false && (
                    (same(g?.from, q1, r1) && same(g?.to, q2, r2)) ||
                    (same(g?.from, q2, r2) && same(g?.to, q1, r1))
                )
            );
            if (gate) return false;
        }

        const edges = this.world?.wallEdges ?? this.world?.config?.wallEdges ?? [];
        if (!Array.isArray(edges) || !edges.length) return false;

        const edge = edges.find(e =>
            (same(e?.from, q1, r1) && same(e?.to, q2, r2)) ||
            (same(e?.from, q2, r2) && same(e?.to, q1, r1))
        );
        if (!edge) return false;

        const hp = Number(edge.hp ?? edge.maxHp ?? 1);
        const status = String(edge.status ?? 'intact').toLowerCase();
        return hp > 0 && !['open', 'breached', 'destroyed'].includes(status);
    }

    // ========================================
    // 查找所有可到达 Hex
    // ========================================

    getReachableHexes(
        unit,
        movementPoints,
        units = []
    ) {

        // ------------------------------------
        // 基础安全检查
        // ------------------------------------

        if (!unit) {

            return {

                costs:
                    new Map(),

                previous:
                    new Map()

            };

        }


        if (
            !this.isUnitAlive(
                unit
            )
        ) {

            return {

                costs:
                    new Map(),

                previous:
                    new Map()

            };

        }


        const startKey =
            this.key(
                unit.q,
                unit.r
            );


        const costs =
            new Map();


        const previous =
            new Map();


        costs.set(
            startKey,
            0
        );


        const queue = [

            {

                q:
                    Number(unit.q),

                r:
                    Number(unit.r),

                cost:
                    0

            }

        ];


        // ====================================
        // Dijkstra
        // ====================================

        while (
            queue.length > 0
        ) {

            queue.sort(
                (a, b) =>
                    a.cost -
                    b.cost
            );


            const current =
                queue.shift();


            const currentKey =
                this.key(
                    current.q,
                    current.r
                );


            if (
                current.cost >
                costs.get(
                    currentKey
                )
            ) {

                continue;

            }


            const neighbors =
                this.getNeighbors(
                    current.q,
                    current.r
                );


            for (
                const neighbor
                of neighbors
            ) {

                // 城防规则：完整城墙是六角格之间的封闭边界，不能通过寻路绕过。
                if (this.isBlockedByWall(current.q, current.r, neighbor.q, neighbor.r)) continue;

                // ====================================
                // 核心规则：
                //
                // 任何存活单位所在格
                // 都不能进入，也不能穿过。
                //
                // 不区分己方 / 敌方。
                // ====================================

                if (
                    this.isHexOccupied(
                        neighbor.q,
                        neighbor.r,
                        units,
                        unit
                    )
                ) {

                    continue;

                }


                // ====================================
                // 地形成本
                // ====================================

                const moveCost =
                    this.terrainCost(
                        unit,
                        neighbor.q,
                        neighbor.r
                    );


                const newCost =
                    current.cost +
                    moveCost;


                // ====================================
                // 超出剩余移动点
                // ====================================

                if (
                    newCost >
                    movementPoints
                ) {

                    continue;

                }


                const neighborKey =
                    this.key(
                        neighbor.q,
                        neighbor.r
                    );


                // ====================================
                // 找到更低成本路径
                // ====================================

                if (
                    !costs.has(
                        neighborKey
                    ) ||
                    newCost <
                    costs.get(
                        neighborKey
                    )
                ) {

                    costs.set(
                        neighborKey,
                        newCost
                    );


                    previous.set(
                        neighborKey,
                        currentKey
                    );


                    queue.push({

                        q:
                            neighbor.q,

                        r:
                            neighbor.r,

                        cost:
                            newCost

                    });

                }

            }

        }


        // ====================================
        // 起点不能作为移动目标
        // ====================================

        costs.delete(
            startKey
        );


        return {

            costs,

            previous

        };

    }


    // ========================================
    // 重建移动路径
    // ========================================

    buildPath(
        unit,
        targetQ,
        targetR,
        previous
    ) {

        if (
            !unit ||
            !previous
        ) {

            return [];

        }


        const startKey =
            this.key(
                unit.q,
                unit.r
            );


        let currentKey =
            this.key(
                targetQ,
                targetR
            );


        if (
            !previous.has(
                currentKey
            )
        ) {

            return [];

        }


        const path = [];


        while (
            currentKey !==
            startKey
        ) {

            const [
                q,
                r
            ] =
                currentKey
                    .split(",")
                    .map(Number);


            path.push({

                q,

                r

            });


            currentKey =
                previous.get(
                    currentKey
                );


            if (
                currentKey ===
                undefined
            ) {

                return [];

            }

        }


        path.reverse();


        return path;

    }

}
