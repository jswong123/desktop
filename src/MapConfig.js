// ============================================================

// MapConfig.js

// 地图系统 V2：战役地图参数

// ============================================================

 

export const MAP_CONFIGS = {

    dubno_1941: {

        id: "dubno_1941",

        name: "杜布诺战役",

        width: 50,

        height: 36,

        hexSize: 24,

        defaultZoom: 1.0,

        minZoom: 0.45,

        maxZoom: 2.2

    },

 

    smolensk_1941: {

        id: "smolensk_1941",

        name: "斯摩棱斯克战役",

        width: 78,

        height: 54,

        hexSize: 32,

        defaultZoom: 0.78,

        minZoom: 0.38,

        maxZoom: 2.4

    }

};

 

export function getMapConfig(id = "smolensk_1941") {

    return MAP_CONFIGS[id] ?? MAP_CONFIGS.smolensk_1941;

}

