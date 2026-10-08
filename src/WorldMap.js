import { MapFeatures } from "./MapFeatures.js";

 

export class WorldMap {

 

    constructor() {

 

        // ====================================================

        // 地图尺寸

        // ====================================================

 

        this.width = 50;

        this.height = 36;

 

 

        // ====================================================

        // 地形

        // ====================================================

 

        this.specialTerrain = new Map();
        // 每格高程/地表元数据，仅用于视觉沙盘和后续视线规则。
        this.elevationMap = new Map();
        this.surfaceLayerMap = new Map();

 

 

        // ====================================================

        // 地图要素

        // ====================================================

 

        this.features = new MapFeatures();

 

 

        /*

         * 关键：

         *

         * Renderer.js 读取的是：

         *

         * world.rivers

         * world.roads

         * world.railways

         * world.settlements

         *

         * 因此这里把 MapFeatures 中的数据

         * 暴露给 WorldMap。

         */

 

        this.rivers =

            this.features.rivers;

 

        this.roads =

            this.features.roads;

 

        this.railways =

            this.features.railways;

 

        this.settlements =

            this.features.settlements;

 

 

        // ====================================================

        // 创建地图

        // ====================================================

 

        this.createTerrain();

 

        this.createFeatures();

    }

 

 

    // ========================================================

    // Hex Key

    // ========================================================

 

    key(q, r) {

 

        return `${q},${r}`;

 

    }

 

 

    // ========================================================

    // 获取地形

    // ========================================================

 

    terrainAt(q, r) {

 

        return this.specialTerrain.get(

            this.key(q, r)

        ) ?? "plain";

 

    }

 

 

    elevationAt(q, r) {
        const v = this.elevationMap?.get?.(this.key(q, r));
        return Number.isFinite(Number(v)) ? Number(v) : null;
    }

    surfaceLayerAt(q, r) {
        return this.surfaceLayerMap?.get?.(this.key(q, r)) ?? null;
    }

    // ========================================================

    // 创建地形

    // ========================================================

 

    createTerrain() {

 

        // ----------------------------------------------------

        // 西北森林

        // ----------------------------------------------------

 

        for (

            let r = 7;

            r <= 11;

            r++

        ) {

 

            for (

                let q = 7;

                q <= 15;

                q++

            ) {

 

                if (

                    (q + r) % 5 !== 0

                ) {

 

                    this.specialTerrain.set(

                        this.key(q, r),

                        "forest"

                    );

 

                }

 

            }

 

        }

 

 

        // ----------------------------------------------------

        // 中部森林

        // ----------------------------------------------------

 

        for (

            let r = 17;

            r <= 22;

            r++

        ) {

 

            for (

                let q = 19;

                q <= 25;

                q++

            ) {

 

                if (

                    (q * r) % 4 !== 0

                ) {

 

                    this.specialTerrain.set(

                        this.key(q, r),

                        "forest"

                    );

 

                }

 

            }

 

        }

 

 

        // ----------------------------------------------------

        // 东南湿地

        // ----------------------------------------------------

 

        for (

            let r = 24;

            r <= 29;

            r++

        ) {

 

            for (

                let q = 31;

                q <= 37;

                q++

            ) {

 

                if (

                    (q + r) % 3 === 0

                ) {

 

                    this.specialTerrain.set(

                        this.key(q, r),

                        "marsh"

                    );

 

                }

 

            }

 

        }

 

    }

 

 

    // ========================================================

    // 创建地图要素

    // ========================================================

 

    createFeatures() {

 

        // ====================================================

        // 河流

        // ====================================================

 

        this.features.addRiver(

            "Ikva",

            [

                [27, 2],

                [27, 5],

                [28, 8],

                [27, 11],

                [28, 14],

                [29, 17],

                [29, 20],

                [30, 23],

                [31, 27],

                [31, 31]

            ],

            {

                width: 6

            }

        );

 

 

        this.features.addRiver(

            "Styr",

            [

                [12, 1],

                [13, 4],

                [14, 7],

                [14, 10],

                [15, 13],

                [16, 16]

            ],

            {

                width: 7

            }

        );

 

 

        // ====================================================

        // 城市

        // ====================================================

 

        this.features.addSettlement({

            id: "lutsk",

            name: "Lutsk",

            nameZh: "卢茨克",

            q: 13,

            r: 6,

            type: "city"

        });

 

 

        this.features.addSettlement({

            id: "dubno",

            name: "Dubno",

            nameZh: "杜布诺",

            q: 28,

            r: 16,

            type: "city"

        });

 

 

        this.features.addSettlement({

            id: "brody",

            name: "Brody",

            nameZh: "布罗迪",

            q: 22,

            r: 29,

            type: "town"

        });

 

 

        this.features.addSettlement({

            id: "rivne",

            name: "Rivne",

            nameZh: "里夫内",

            q: 41,

            r: 10,

            type: "city"

        });

 

 

        // ====================================================

        // 公路

        // ====================================================

 

        this.features.addRoad(

            "Lutsk-Dubno",

            [

                [13, 6],

                [16, 8],

                [19, 10],

                [22, 12],

                [25, 14],

                [28, 16]

            ],

            {

                importance: "main"

            }

        );

 

 

        this.features.addRoad(

            "Dubno-Rivne",

            [

                [28, 16],

                [31, 14],

                [34, 13],

                [37, 11],

                [41, 10]

            ],

            {

                importance: "main"

            }

        );

 

 

        this.features.addRoad(

            "Dubno-Brody",

            [

                [28, 16],

                [27, 20],

                [25, 23],

                [24, 26],

                [22, 29]

            ],

            {

                importance: "main"

            }

        );

 

 

        // ====================================================

        // 铁路

        // ====================================================

 

        this.features.addRailway(

            "Rivne-Dubno-Brody",

            [

                [41, 11],

                [37, 13],

                [33, 15],

                [28, 17],

                [26, 21],

                [24, 25],

                [22, 29]

            ]

        );

 

    }

 

 

    // ========================================================

    // 战役地图加载接口

    // main.js 的 applyScenarioToWorld() 会优先调用本方法。

    // ========================================================

    loadScenario(data) {

        const map = data?.map ?? data?.world ?? null;

 

        // 旧杜布诺 scenario.json 没有 map 字段时，恢复原版地图。

        if (!map) {

            this.width = 50;

            this.height = 36;

            this.specialTerrain = new Map();
        this.elevationMap = new Map();
        this.surfaceLayerMap = new Map();

            this.features = new MapFeatures();

            this.rivers = this.features.rivers;

            this.roads = this.features.roads;

            this.railways = this.features.railways;

            this.settlements = this.features.settlements;

            this.fortifications = [];

            this.createTerrain();

            this.createFeatures();

            return;

        }

 

        const width = Number(map.width);

        const height = Number(map.height);

        if (Number.isFinite(width) && width > 0) this.width = width;

        if (Number.isFinite(height) && height > 0) this.height = height;

 

        // 每次切换战役都清空旧地图，避免杜布诺地形残留到斯摩棱斯克。

        this.specialTerrain = new Map();

 

        // 支持 [{q,r,type}] 与 [[q,r,type]] 两种 terrain 写法。

        const terrain = Array.isArray(map.terrain) ? map.terrain : [];

        for (const cell of terrain) {

            let q, r, type;

            if (Array.isArray(cell)) {

                [q, r, type] = cell;

            } else if (cell && typeof cell === "object") {

                q = cell.q;

                r = cell.r;

                type = cell.type ?? cell.terrain;

            }

            q = Number(q);

            r = Number(r);

            if (

                Number.isInteger(q) &&

                Number.isInteger(r) &&

                q >= 0 && r >= 0 &&

                q < this.width && r < this.height &&

                typeof type === "string"

            ) {

                const key = this.key(q, r);
                this.specialTerrain.set(key, type);
                if (!Array.isArray(cell)) {
                    const elevation = Number(cell.elevation);
                    if (Number.isFinite(elevation)) this.elevationMap.set(key, elevation);
                    if (cell.surfaceLayer != null) this.surfaceLayerMap.set(key, String(cell.surfaceLayer));
                }

            }

        }

 

        this.rivers = Array.isArray(map.rivers) ? map.rivers : [];

        this.roads = Array.isArray(map.roads) ? map.roads : [];

        this.railways = Array.isArray(map.railways)

            ? map.railways

            : (Array.isArray(map.rails) ? map.rails : []);

        this.settlements = Array.isArray(map.settlements)

            ? map.settlements

            : (Array.isArray(map.cities) ? map.cities : []);

        this.fortifications = Array.isArray(map.fortifications)

            ? map.fortifications

            : [];

        this.minefields = Array.isArray(map.minefields) ? map.minefields : [];
        this.bridges = Array.isArray(map.bridges) ? map.bridges : [];
        this.wallEdges = Array.isArray(map.wallEdges) ? map.wallEdges : [];
        // 城门：from/to 必须对应一条 wallEdge。open !== false 时允许通行并在城墙上留出缺口。
        this.gates = Array.isArray(map.gates) ? map.gates : [];
        this.waterRules = (map.waterRules && typeof map.waterRules === "object") ? map.waterRules : null;

 

        this.config = map;

        this.scenario = data;

    }

 

}
