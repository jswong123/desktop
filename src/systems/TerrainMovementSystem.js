// ============================================================
// TerrainMovementSystem.js
// 战线 1937-1945
// V0.12.4 杭州完整水系整合版
//
// 直接替换：src/systems/TerrainMovementSystem.js
//
// 规则：
// 1. water 对陆军绝对不可通行。
// 2. 道路/铁路不能再自动把 water 当作桥。
// 3. 杭州 scenario 中指定的 bridges / crossingCells 才是合法桥梁。
// 4. 为兼容旧版杭州地图，钱塘江大桥 (70,52) 内置为后备桥位。
// 5. 西湖、青山湖：water，陆军不可进入。
// 6. 西溪湿地：步兵3、工兵2、炮兵4、骑兵4、车辆不可进入。
// 7. 京杭大运河：若地图已实体化为 water，则只能经指定桥位跨越。
// 8. 舰艇只能在 water 上移动。
// 9. 其他战役继续使用原有普通地形规则。
// ============================================================

export class TerrainMovementSystem {

    constructor(world) {
        this.world = world;
    }


    // ========================================================
    // 基础工具
    // ========================================================

    sameHex(a, q, r) {
        if (!a) return false;

        const aq = Array.isArray(a) ? a[0] : a.q;
        const ar = Array.isArray(a) ? a[1] : a.r;

        return (
            Number(aq) === Number(q) &&
            Number(ar) === Number(r)
        );
    }


    scenarioId() {
        return String(
            this.world?.scenario?.id ??
            this.world?.scenario?.key ??
            this.world?.config?.id ??
            ""
        ).toLowerCase();
    }


    isHangzhouScenario() {
        const id = this.scenarioId();

        return (
            id.includes("hangzhou") ||
            id.includes("hangzhou_1937")
        );
    }


    // ========================================================
    // 道路 / 铁路
    // ========================================================

    isRoadHex(q, r) {

        return (
            this.world?.roads ??
            []
        ).some(
            road =>
                (
                    road.points ??
                    road.path ??
                    []
                ).some(
                    p =>
                        this.sameHex(
                            p,
                            q,
                            r
                        )
                )
        );
    }


    isRailwayHex(q, r) {

        return (
            this.world?.railways ??
            this.world?.rails ??
            []
        ).some(
            railway =>
                (
                    railway.points ??
                    railway.path ??
                    []
                ).some(
                    p =>
                        this.sameHex(
                            p,
                            q,
                            r
                        )
                )
        );
    }


    // ========================================================
    // 桥梁
    //
    // 支持：
    // map.bridges = [
    //   {
    //     id: "...",
    //     q: 70,
    //     r: 52,
    //     status: "intact",
    //     crossingCells: [[70,51],[70,52],[70,53]]
    //   }
    // ]
    //
    // 同时兼容：
    // bridge.hex
    // bridge.cells
    // bridge.points
    // ========================================================

    bridges() {

        const direct =
            this.world?.bridges;

        if (
            Array.isArray(direct)
        ) {
            return direct;
        }


        const configBridges =
            this.world?.config?.bridges;

        if (
            Array.isArray(configBridges)
        ) {
            return configBridges;
        }


        return [];
    }


    isBridgeActive(bridge) {

        if (!bridge) {
            return false;
        }


        const status =
            String(
                bridge.status ??
                "intact"
            ).toLowerCase();


        return ![
            "destroyed",
            "demolished",
            "collapsed",
            "blown",
            "closed"
        ].includes(status);
    }


    isBridgeHex(q, r) {

        const bridges =
            this.bridges();


        for (
            const bridge
            of bridges
        ) {

            if (
                !this.isBridgeActive(
                    bridge
                )
            ) {
                continue;
            }


            // ------------------------------
            // 桥梁中心格
            // ------------------------------

            if (
                this.sameHex(
                    bridge,
                    q,
                    r
                )
            ) {
                return true;
            }


            if (
                this.sameHex(
                    bridge.hex,
                    q,
                    r
                )
            ) {
                return true;
            }


            // ------------------------------
            // 桥梁通行格
            // ------------------------------

            const cells =
                bridge.crossingCells ??
                bridge.cells ??
                bridge.points ??
                [];


            if (
                cells.some(
                    cell =>
                        this.sameHex(
                            cell,
                            q,
                            r
                        )
                )
            ) {
                return true;
            }
        }


        // ====================================================
        // 杭州旧地图兼容
        //
        // 如果 scenario 还没有 bridges 字段，
        // 钱塘江大桥仍允许在 (70,52) 通行。
        //
        // 注意：
        // V2.5 地图本身应把桥梁走廊从 water 中挖出；
        // 这里仅作为旧版 scenario 的保险。
        // ====================================================

        if (
            this.isHangzhouScenario() &&
            Number(q) === 70 &&
            Number(r) === 52
        ) {
            return true;
        }


        return false;
    }


    // ========================================================
    // 单位分类
    // ========================================================

    inferMovementClass(unit) {
        const explicit=String(unit?.movementClass??"").toLowerCase();
        if (["tracked","wheeled","amphibious","foot"].includes(explicit)) return explicit;
        const type=String(unit?.type??unit?.unitType??"").toLowerCase();
        const eq=String(unit?.equipment?.[0]?.type??unit?.equipmentType??unit?.equipment??"").toUpperCase();
        if (unit?.amphibious===true || /ZBD05|ZTD05|AMPHIB/.test(eq+" "+type)) return "amphibious";
        if (/PCL181|ZTL11|ZBL08|CSK181|WHEELED|MOTORIZED|TRUCK/.test(eq+" "+type)) return "wheeled";
        if (/ZTZ|ZBD04|PLZ|TANK|ARMOR|MECHANIZED|ARTILLERY|ENGINEER/.test(eq+" "+type)) return "tracked";
        if (["headquarters","support","supply","air_defense","recon","reconnaissance"].includes(type)) return "wheeled";
        return "foot";
    }

    classOf(unit) {

        // v1.4.5a: naval identity must be resolved BEFORE generic movement inference.
        // inferMovementClass() intentionally falls back to "foot" for unknown land types;
        // doing it first made destroyer/escort/landing units behave like infantry on water.
        const type = String(unit?.type ?? unit?.unitType ?? "").toLowerCase();
        if (
            unit?.naval === true || unit?.domain === "naval" || unit?.unitClass === "naval" ||
            [
                "naval",
                "ship",
                "boat",
                "heavy_cruiser",
                "light_cruiser",
                "destroyer",
                "transport",
                "battleship",
                "carrier",
                "submarine"
            ].includes(type)
        ) {
            return "naval";
        }

        const movementClass = this.inferMovementClass(unit);
        if (["tracked","wheeled","amphibious"].includes(movementClass)) return "vehicle";
        if (movementClass === "foot") return "infantry";

        if (
            [
                "armor",
                "armored",
                "tank",
                "vehicle",
                "truck",
                "motorized",
                "reconnaissance",
                "mechanized_infantry",
                "wheeled_infantry",
                "motorized_infantry",
                "amphibious_armor"
            ].includes(type)
        ) {
            return "vehicle";
        }


        if (
            [
                "artillery",
                "field_artillery",
                "heavy_artillery",
                "antitank",
                "antiair"
            ].includes(type)
        ) {
            return "artillery";
        }


        if (
            type === "cavalry"
        ) {
            return "cavalry";
        }


        if (
            type === "engineer"
        ) {
            return "engineer";
        }


        return "infantry";
    }


    // ========================================================
    // Scenario 自定义规则读取
    // ========================================================

    ruleCost(rule, unitClass) {

        if (
            !rule ||
            typeof rule !== "object"
        ) {
            return null;
        }


        const value =
            rule[unitClass];


        if (
            value === false
        ) {
            return Infinity;
        }


        if (
            value === true
        ) {
            return 1;
        }


        if (
            Number.isFinite(
                Number(value)
            )
        ) {
            return Number(value);
        }


        if (
            Number.isFinite(
                Number(
                    rule.movementCost
                )
            )
        ) {
            return Number(
                rule.movementCost
            );
        }


        return null;
    }


    // ========================================================
    // 桥梁移动成本
    // ========================================================

    bridgeCost(unitClass) {

        if (
            unitClass === "vehicle" ||
            unitClass === "artillery"
        ) {
            return 2;
        }


        return 1;
    }


    // ========================================================
    // 水域规则
    // ========================================================

    waterCost(
        unit,
        q,
        r
    ) {

        const unitClass =
            this.classOf(unit);


        // ------------------------------
        // 舰艇
        // ------------------------------

        if (
            unitClass === "naval"
        ) {
            return 1;
        }


        // ------------------------------
        // 现代水上机动分级。
        // float_crossing：有限自行浮渡（如ZBD-04A），速度慢；
        // amphibious_assault：专业两栖突击（如ZBD-05/ZTD-05）；
        // amphibious_support：两栖保障/抢修；
        // 集团军专业浮渡分队也通过 canFloatCross 接入。
        // ------------------------------
        const waterMobility = String(unit?.waterMobility ?? "none").toLowerCase();
        if (waterMobility === "amphibious_assault") return Number(unit?.waterMovementCost ?? 2);
        if (waterMobility === "amphibious_support") return Number(unit?.waterMovementCost ?? 3);
        if (waterMobility === "float_crossing") return Number(unit?.waterMovementCost ?? 4);
        if (waterMobility === "ford" || unit?.canFord === true) return Number(unit?.waterMovementCost ?? 3);
        if (unit?.canFloatCross === true) return Number(unit?.waterMovementCost ?? 3);
        if (String(unit?.movementClass ?? "").toLowerCase() === "amphibious" || unit?.amphibious === true) {
            return Number(unit?.waterMovementCost ?? 2);
        }

        // ------------------------------
        // 指定桥位
        // ------------------------------

        if (
            this.isBridgeHex(
                q,
                r
            )
        ) {
            return this.bridgeCost(
                unitClass
            );
        }


        // ====================================================
        // 核心规则：
        //
        // 陆军不得直接进入 water。
        //
        // 这里故意不检查 road / railway。
        // 道路经过水面 ≠ 自动生成桥梁。
        // ====================================================

        return Infinity;
    }


    // ========================================================
    // 西溪湿地 / 普通湿地
    // ========================================================

    wetlandCost(
        unit,
        rules
    ) {

        const unitClass =
            this.classOf(unit);


        // ------------------------------
        // Scenario 自定义规则优先
        // ------------------------------

        const customCost =
            this.ruleCost(
                rules?.marsh ??
                rules?.wetland,
                unitClass
            );


        if (
            customCost !== null
        ) {
            return customCost;
        }


        // ------------------------------
        // 默认湿地规则
        // ------------------------------

        const table = {

            infantry:
                3,

            engineer:
                2,

            artillery:
                4,

            cavalry:
                4,

            vehicle:
                Infinity

        };


        return (
            table[unitClass] ??
            3
        );
    }


    // ========================================================
    // 主移动成本函数
    // ========================================================

    cost(
        unit,
        q,
        r
    ) {

        const terrain =
            this.world?.terrainAt?.(
                q,
                r
            ) ??
            "plain";


        const unitClass =
            this.classOf(
                unit
            );

        const modernVehicle = unitClass === "vehicle" && (Boolean(unit?.modern) || Boolean(unit?.autoGenerated) || ["tracked","wheeled","amphibious"].includes(this.inferMovementClass(unit)));
        const movementClass = this.inferMovementClass(unit);

        // 碉堡是实体阻塞型工事：任何单位都不能进入碉堡所在 Hex。
        // 已在碉堡格上的施工工兵仍可向外移动，因为这里只检查目标格。
        const blockingBunker=(this.world?.fortifications??[]).some(f=>
            Number(f?.q)===Number(q)&&Number(f?.r)===Number(r)&&
            String(f?.type??'').toLowerCase()==='bunker'&&String(f?.status??'intact').toLowerCase()!=='destroyed'
        );
        if(blockingBunker) return Infinity;

        const rules =
            this.world?.waterRules ??
            this.world?.config?.waterRules ??
            this.world?.config?.movementRules ??
            null;


        // ====================================================
        // 1. 舰艇
        //
        // 舰艇只能进入水域。
        // ====================================================

        if (
            unitClass === "naval"
        ) {

            if (
                terrain === "water"
            ) {
                return 1;
            }


            return Infinity;
        }


        // ====================================================
        // 2. 水域
        //
        // 必须放在道路/铁路判断之前。
        //
        // 钱塘江
        // 西湖
        // 青山湖
        // 京杭大运河
        // 以及其他 scenario 的实体 water
        // 均受此规则约束。
        // ====================================================

        if (
            terrain === "water"
        ) {

            return this.waterCost(
                unit,
                q,
                r
            );
        }


        // ====================================================
        // 3. 湿地
        //
        // 西溪湿地：
        // 步兵 3
        // 工兵 2
        // 炮兵 4
        // 骑兵 4
        // 车辆禁止
        // ====================================================

        if (
            terrain === "marsh" ||
            terrain === "wetland"
        ) {

            return this.wetlandCost(
                unit,
                rules
            );
        }


        // ====================================================
        // 4. 租界
        // ====================================================

        if (
            terrain === "concession"
        ) {

            const side =
                String(
                    unit?.faction ??
                    unit?.side ??
                    ""
                ).toLowerCase();


            if (
                side === "japanese"
            ) {
                return Infinity;
            }


            return 1;
        }


        // ====================================================
        // 5. 道路 / 铁路
        //
        // 注意：
        // 到这里时已经确认 terrain !== water。
        // 所以 road / railway 永远不能绕过水域封锁。
        // ====================================================

        const road =
            this.isRoadHex(
                q,
                r
            );


        const railway =
            this.isRailwayHex(
                q,
                r
            );


        if (
            road ||
            railway
        ) {

            if (
                terrain === "steepMountain"
            ) {

                if (
                    unitClass === "vehicle" ||
                    unitClass === "artillery"
                ) {
                    return Infinity;
                }


                return 2;
            }


            if (
                unitClass === "vehicle" ||
                unitClass === "artillery"
            ) {
                return 2;
            }


            return 1;
        }


        // ====================================================
        // 6. 普通地形
        // ====================================================

        const table = {

            plain: {

                infantry:
                    1,

                engineer:
                    1,

                artillery:
                    2,

                cavalry:
                    1,

                vehicle:
                    1
            },


            hill: {

                infantry:
                    2,

                engineer:
                    2,

                artillery:
                    3,

                cavalry:
                    2,

                vehicle:
                    3
            },


            forest: {
                infantry:2, engineer:2, artillery:3, cavalry:3,
                // 现代履带/轮式车辆可在林地低速通行，避免训练场生成后整支装甲分队被锁死。
                vehicle: modernVehicle ? (movementClass === "tracked" || movementClass === "amphibious" ? 2 : 3) : Infinity
            },


            mountain: {
                infantry:3, engineer:3, artillery:4, cavalry:4,
                // 现代履带车辆允许有限山地机动；轮式车辆仍需道路。
                vehicle: modernVehicle ? (movementClass === "tracked" || movementClass === "amphibious" ? 3 : 4) : Infinity
            },


            steepMountain: {

                infantry:
                    4,

                engineer:
                    4,

                artillery:
                    Infinity,

                cavalry:
                    Infinity,

                vehicle:
                    Infinity
            }

        };


        return (
            table[terrain]?.[
                unitClass
            ] ??
            1
        );
    }
}
