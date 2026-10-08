// src/systems/FactionSystem.js

// 通用阵营定义：替代代码中“只认识德军/苏军”的写死逻辑

 

export const FACTIONS = {

    RED: { id:"RED", side:"red", name:"红方", fullName:"红方合成旅", enemy:"BLUE" },
    BLUE: { id:"BLUE", side:"blue", name:"蓝方", fullName:"蓝方合成旅", enemy:"RED" },
    PLA: { id:"PLA", side:"pla", name:"解放军", fullName:"中国人民解放军", enemy:"TW_PROXY" },
    TW_PROXY: { id:"TW_PROXY", side:"tw_proxy", name:"台伪军", fullName:"台伪军", enemy:"PLA" },

    GER: {

        id: "GER", side: "german",

        name: "德军", fullName: "纳粹德国",

        enemy: "USSR"

    },

    USSR: {

        id: "USSR", side: "soviet",

        name: "苏军", fullName: "苏联红军",

        enemy: "GER"

    },

    CHN: {

        id: "CHN", side: "chinese",

        name: "中国", fullName: "中国军队",

        enemy: "JPN"

    },

    JPN: {

        id: "JPN", side: "japanese",

        name: "日军", fullName: "日军",

        enemy: "CHN"

    },

    GBR: {

        id: "GBR", side: "british",

        name: "英军", fullName: "英国陆军",

        enemy: null

    },

    ITA: {

        id: "ITA", side: "italian",

        name: "意军", fullName: "意大利陆军",

        enemy: null

    },

    USA: {

        id: "USA", side: "american",

        name: "美军", fullName: "美国陆军",

        enemy: null

    },

    ALLIED: {
        id: "ALLIED", side: "allied",
        name: "联军", fullName: "墨尔本联合防卫军",
        enemy: "JPN"
    },
    ROK_GOV: {
        id: "ROK_GOV", side: "rok_government",
        name: "政府军", fullName: "大韩民国正规指挥体系",
        enemy: "NEWMIL"
    },
    NEWMIL: {
        id: "NEWMIL", side: "new_military",
        name: "新军部", fullName: "新军部／一心会系部队",
        enemy: "ROK_GOV"
    }

};

 

const ALIASES = {

    RED:"RED", red:"RED", "红方":"RED", PLA_RED:"RED", pla_red:"RED",
    BLUE:"BLUE", blue:"BLUE", "蓝方":"BLUE", PLA_BLUE:"BLUE", pla_blue:"BLUE",
    PLA:"PLA", pla:"PLA", "我军":"PLA", "解放军":"PLA",
    TW_PROXY:"TW_PROXY", tw_proxy:"TW_PROXY", "台伪军":"TW_PROXY",

    GER: "GER", german: "GER", germany: "GER",

    USSR: "USSR", soviet: "USSR", ussr: "USSR",

    CHN: "CHN", chinese: "CHN", china: "CHN",

    JPN: "JPN", japanese: "JPN", japan: "JPN",

    GBR: "GBR", british: "GBR", uk: "GBR",

    ITA: "ITA", italian: "ITA", italy: "ITA",

    USA: "USA", american: "USA",
    ALLIED: "ALLIED", allied: "ALLIED", allies: "ALLIED",
    ROK_GOV: "ROK_GOV", rok_government: "ROK_GOV", government: "ROK_GOV",
    NEWMIL: "NEWMIL", new_military: "NEWMIL", rebel: "NEWMIL"

};

 

export class FactionSystem {

    static normalizeFaction(value) {

        if (!value) return null;

        return ALIASES[String(value)] ?? ALIASES[String(value).toLowerCase()] ?? null;

    }

 

    static getFaction(value) {

        const id = this.normalizeFaction(value);

        return id ? FACTIONS[id] : null;

    }

 

    static getUnitFaction(unit) {

        if (!unit) return null;

        return this.normalizeFaction(unit.faction ?? unit.side);

    }

 

    static getUnitSide(unit) {

        const faction = this.getFaction(this.getUnitFaction(unit));

        return faction?.side ?? null;

    }

 

    static getName(value) {

        return this.getFaction(value)?.name ?? String(value ?? "");

    }

 

    static getSideName(side) {

        const faction = Object.values(FACTIONS).find(item => item.side === side);

        return faction?.name ?? side ?? "";

    }

 

    static configureGameState(gameState, factionIds = []) {

        if (!gameState) return;

        gameState.factions = {};

 

        for (const id of factionIds) {

            const faction = FACTIONS[id];

            if (faction) gameState.factions[id] = { ...faction };

        }

    }

}
