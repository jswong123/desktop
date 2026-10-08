// ============================================================

// SmolenskMap.js

// 斯摩棱斯克战役 1941 - Map System V2

// 大型地图 / 多格城区 / 工事层

// ============================================================

 

import { getMapConfig } from "./MapConfig.js";

 

export class SmolenskMap {

    constructor() {

        const config = getMapConfig("smolensk_1941");

 

        this.id = config.id;

        this.name = config.name;

        this.width = config.width;

        this.height = config.height;

        this.hexSize = config.hexSize;

        this.defaultZoom = config.defaultZoom;

        this.minZoom = config.minZoom;

        this.maxZoom = config.maxZoom;

 

        this.specialTerrain = new Map();

        this.fortifications = new Map();

 

        this.rivers = [];

        this.roads = [];

        this.railways = [];

        this.settlements = [];

 

        this.createTerrain();

        this.createFeatures();

        this.createFortifications();

    }

 

    key(q, r) {

        return `${q},${r}`;

    }

 

    inBounds(q, r) {

        return q >= 0 && r >= 0 && q < this.width && r < this.height;

    }

 

    terrainAt(q, r) {

        return this.specialTerrain.get(this.key(q, r)) ?? "plain";

    }

 

    setTerrain(q, r, terrain) {

        if (!this.inBounds(q, r)) return;

        this.specialTerrain.set(this.key(q, r), terrain);

    }

 

    fortificationAt(q, r) {

        return this.fortifications.get(this.key(q, r)) ?? null;

    }

 

    setFortification(q, r, fortification) {

        if (!this.inBounds(q, r)) return false;

 

        if (!fortification || Number(fortification.level ?? 0) <= 0) {

            this.fortifications.delete(this.key(q, r));

            return true;

        }

 

        this.fortifications.set(this.key(q, r), {

            type: fortification.type ?? "fieldworks",

            level: Math.max(1, Math.min(3, Number(fortification.level ?? 1))),

            owner: fortification.owner ?? null,

            progress: Number(fortification.progress ?? 0)

        });

 

        return true;

    }

 

    exportMapState() {

        return {

            fortifications: Array.from(this.fortifications.entries())

        };

    }

 

    importMapState(state) {

        if (!state?.fortifications) return;

        this.fortifications = new Map(state.fortifications);

    }

 

    fillEllipse(centerQ, centerR, radiusQ, radiusR, terrain, density = 1) {

        for (let r = Math.floor(centerR - radiusR); r <= Math.ceil(centerR + radiusR); r++) {

            for (let q = Math.floor(centerQ - radiusQ); q <= Math.ceil(centerQ + radiusQ); q++) {

                if (!this.inBounds(q, r)) continue;

 

                const dx = (q - centerQ) / Math.max(1, radiusQ);

                const dy = (r - centerR) / Math.max(1, radiusR);

 

                if (dx * dx + dy * dy <= 1) {

                    if (density >= 1 || ((q * 17 + r * 31) % 100) / 100 < density) {

                        this.setTerrain(q, r, terrain);

                    }

                }

            }

        }

    }

 

    createTerrain() {

        // 北部与西北部森林带

        this.fillEllipse(16, 10, 12, 7, "forest", 0.72);

        this.fillEllipse(31, 8, 10, 6, "forest", 0.62);

 

        // 中南部森林与湿地

        this.fillEllipse(22, 37, 11, 7, "forest", 0.58);

        this.fillEllipse(57, 39, 10, 7, "marsh", 0.48);

 

        // 斯摩棱斯克多格城区：不是单一城市点

        const urbanHexes = [

            [40,24],[41,24],[42,24],[43,24],

            [39,25],[40,25],[41,25],[42,25],[43,25],[44,25],

            [39,26],[40,26],[41,26],[42,26],[43,26],[44,26],

            [40,27],[41,27],[42,27],[43,27]

        ];

 

        for (const [q, r] of urbanHexes) {

            this.setTerrain(q, r, "urban");

        }

 

        // 其他城镇的城市化核心

        for (const [q, r] of [[15,16],[28,18],[57,17],[62,31],[29,42]]) {

            this.setTerrain(q, r, "urban");

        }

    }

 

    createFeatures() {

        // 第聂伯河：横贯斯摩棱斯克城区

        this.rivers.push({

            id: "dnieper",

            name: "Dnieper",

            nameZh: "第聂伯河",

            width: 7,

            points: [

                [3,19],[9,20],[15,20],[21,21],[27,22],[33,23],

                [38,24],[42,25],[47,25],[53,24],[59,23],[66,22],[74,21]

            ]

        });

 

        // 西德维纳河方向

        this.rivers.push({

            id: "western_dvina",

            name: "Western Dvina",

            nameZh: "西德维纳河",

            width: 6,

            points: [[7,5],[14,6],[21,7],[28,8],[35,10],[42,11],[50,12],[58,13]]

        });

 

        // 主要公路

        this.roads.push({

            id: "minsk_smolensk_moscow",

            nameZh: "明斯克-斯摩棱斯克-莫斯科公路",

            importance: "main",

            points: [[1,29],[8,28],[15,28],[22,27],[30,27],[36,26],[42,26],[49,26],[57,25],[66,24],[76,23]]

        });

 

        this.roads.push({

            id: "vitebsk_smolensk",

            nameZh: "维捷布斯克-斯摩棱斯克公路",

            importance: "main",

            points: [[14,2],[17,7],[21,12],[26,16],[31,20],[36,23],[42,26]]

        });

 

        this.roads.push({

            id: "smolensk_roslavl",

            nameZh: "斯摩棱斯克-罗斯拉夫尔公路",

            importance: "main",

            points: [[42,26],[41,31],[39,35],[36,39],[33,43],[29,48],[27,53]]

        });

 

        // 铁路

        this.railways.push({

            id: "smolensk_rail",

            nameZh: "明斯克-斯摩棱斯克铁路",

            points: [[2,31],[10,30],[18,29],[26,28],[34,27],[42,27],[51,27],[60,26],[69,25],[77,25]]

        });

 

        // 城镇

        this.settlements.push(

            { id:"smolensk", name:"Smolensk", nameZh:"斯摩棱斯克", q:42, r:26, type:"major_city" },

            { id:"vitebsk", name:"Vitebsk", nameZh:"维捷布斯克", q:15, r:16, type:"city" },

            { id:"orsha", name:"Orsha", nameZh:"奥尔沙", q:28, r:18, type:"city" },

            { id:"yartsevo", name:"Yartsevo", nameZh:"亚尔采沃", q:57, r:17, type:"town" },

            { id:"yelna", name:"Yelnya", nameZh:"叶利尼亚", q:62, r:31, type:"town" },

            { id:"roslavl", name:"Roslavl", nameZh:"罗斯拉夫尔", q:29, r:42, type:"city" }

        );

    }

 

    createFortifications() {

        // 斯摩棱斯克城区苏军预设防御阵地

        const urbanDefence = [

            [40,24],[42,24],[39,25],[41,25],[43,25],

            [40,26],[42,26],[44,26],[41,27],[43,27]

        ];

 

        for (const [q, r] of urbanDefence) {

            this.setFortification(q, r, {

                type: "fortified_urban",

                level: 2,

                owner: "soviet"

            });

        }

 

        // 城市西侧与南侧野战阵地

        const fieldworks = [

            [34,23],[35,23],[36,24],[36,25],

            [37,29],[38,30],[39,31],[40,32]

        ];

 

        for (const [q, r] of fieldworks) {

            this.setFortification(q, r, {

                type: "fieldworks",

                level: 1,

                owner: "soviet"

            });

        }

    }

}

