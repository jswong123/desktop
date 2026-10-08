// src/scenarios/ScenarioManager.js

import { findScenarioById } from "../../data/campaigns.js";

import { FactionSystem } from "../systems/FactionSystem.js";
import { ModernBrigadeSystem } from "../systems/ModernBrigadeSystem.js";
import { GroupArmySystem } from "../systems/GroupArmySystem.js";

 

export class ScenarioManager {

    constructor({ world, gameState }) {

        this.world = world;

        this.gameState = gameState;

        this.current = null;

    }

 

    getScenarioConfig(id) {

        return findScenarioById(id);

    }

 

    async load(id) {

        const found = this.getScenarioConfig(id);

        if (!found) throw new Error(`未知战役：${id}`);

 

        const { theater, phase, scenario: config } = found;

        if (config.status === "locked") throw new Error(`${config.name} 尚未开放`);

 

        const isGroupArmy = GroupArmySystem.isGroupArmy(config);
        const isModern = ModernBrigadeSystem.isModern(config) || isGroupArmy;
        const scenarioResponse = await fetch(config.scenarioPath, { cache: "no-store" });
        const plaDeck = config?.plaCombinedBrigadeSelection === true;
        const unitsResponse = (isModern && !plaDeck) ? null : await fetch(config.unitsPath, { cache: "no-store" });

 

        if (!scenarioResponse.ok) {

            throw new Error(`${config.name} 地图加载失败：HTTP ${scenarioResponse.status}`);

        }

        if ((!isModern || plaDeck) && !unitsResponse.ok) {
            throw new Error(`${config.name} 单位加载失败：HTTP ${unitsResponse.status}`);
        }

 

        const scenarioData = await scenarioResponse.json();

        let units;
        if (plaDeck) {
            const rawUnits = await unitsResponse.json();
            const preset = Array.isArray(rawUnits) ? rawUnits : (rawUnits.units ?? []);
            const defenders = preset.filter(u=>String(u.faction??u.side).toLowerCase()==='tw_proxy');
            const type = sessionStorage.getItem('plaCombinedBrigadeSelection') || 'heavy';
            sessionStorage.setItem('modernBrigadeSelection', JSON.stringify({red:type,blue:'medium'}));
            const W=Number(scenarioData?.map?.width??60), H=Number(scenarioData?.map?.height??40);
            const generated = ModernBrigadeSystem.generate({...config,modernBrigadeSelection:true,plaCombinedBrigadeDeck:true,trainingMap:{width:W,height:H}}).filter(u=>u.faction==='RED');
            for (const u of generated) {
                u.faction='pla'; u.side='pla';
                u.id='PLA_'+String(u.id).replace(/^RED_?/,'');
                if(u.parentHQ)u.parentHQ='PLA_'+String(u.parentHQ).replace(/^RED_?/,'');
                u.name=String(u.name).replace(/红方/g,'解放军');
                u.fullName=String(u.fullName??'').replace(/红方/g,'解放军');
                u.formation=String(u.formation??'').replace(/红方/g,'解放军');
                // 解放军合成旅步兵类单位具备基础野战构筑能力。
                // 仅允许修筑散兵坑/战壕；碉堡、桥梁、墙体、雷区等高级工程仍由工兵承担。
                if (['infantry','mechanized_infantry','wheeled_infantry','motorized_infantry','special_forces'].includes(String(u.type??'').toLowerCase())) {
                    u.engineering = { ...(u.engineering ?? {}), canEntrench: true, fortificationPower: Math.max(25, Number(u.engineering?.fortificationPower ?? 0)) };
                }
            }
            units=[...generated,...defenders];
        } else if (isModern) {
            units = isGroupArmy ? GroupArmySystem.generate(config) : ModernBrigadeSystem.generate(config);
        } else {
            const rawUnits = await unitsResponse.json();
            units = Array.isArray(rawUnits) ? rawUnits : (rawUnits.units ?? []);
        }

 

        scenarioData.key = scenarioData.key ?? config.id;

        scenarioData.name = scenarioData.name ?? config.name;

 

        this.applyScenarioToWorld(scenarioData);

        FactionSystem.configureGameState(this.gameState, config.factions);

 

        this.current = {

            theater,

            phase,

            config,

            scenario: scenarioData,

            units

        };

 

        return this.current;

    }

 

    applyScenarioToWorld(data) {

        if (!data || !this.world) return;

 

        if (typeof this.world.loadScenario === "function") {

            this.world.loadScenario(data);

            return;

        }

        if (typeof this.world.applyScenario === "function") {

            this.world.applyScenario(data);

            return;

        }

        if (typeof this.world.loadMap === "function" && data.map) {

            this.world.loadMap(data.map);

            return;

        }

 

        const map = data.map ?? data.world ?? data;

        if (Number.isFinite(Number(map.width))) this.world.width = Number(map.width);

        if (Number.isFinite(Number(map.height))) this.world.height = Number(map.height);

 

        if (Array.isArray(map.terrain)) this.world.terrain = map.terrain;

 

        for (const key of [

            "roads", "railways", "rails", "rivers",

            "settlements", "cities", "towns", "fortifications"

        ]) {

            if (Array.isArray(map[key])) this.world[key] = map[key];

        }

 

        this.world.config = map;

        this.world.mapConfig = map;

    }

}
