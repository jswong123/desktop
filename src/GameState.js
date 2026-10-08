import { FactionSystem, FACTIONS } from "./systems/FactionSystem.js";

export class GameState {
    constructor() {
        this.playerFaction = null;
        this.playerSide = null;
        this.selectedFaction = null;
        this.selectedSide = null;
        this.mode = null;
        this.date = "1941-06-26";
        this.hour = 8;
        this.minute = 0;
        this.turn = 1;
        this.turnMinutes = 15;
        this.factions = { ...FACTIONS };
    }

    setAvailableFactions(factionIds = []) {
        FactionSystem.configureGameState(this, factionIds);
    }

    setPlayerFaction(faction) {
        const id = FactionSystem.normalizeFaction(faction);
        if (!id || !this.factions[id]) throw new Error(`未知阵营：${faction}`);
        const side = FactionSystem.getFaction(id)?.side ?? null;
        this.playerFaction = id;
        this.playerSide = side;
        this.selectedFaction = id;
        this.selectedSide = side;
        this.mode = "PLAYER";
    }

    setObserverMode() {
        this.playerFaction = null;
        this.playerSide = null;
        this.selectedFaction = null;
        this.selectedSide = null;
        this.mode = "OBSERVER";
    }

    setDeveloperMode() {
        this.playerFaction = null; this.playerSide = null; this.selectedFaction = null; this.selectedSide = null; this.mode = "DEVELOPER";
    }

    isObserver() { return String(this.mode).toUpperCase() === "OBSERVER"; }
    isDeveloper() { return String(this.mode).toUpperCase() === "DEVELOPER"; }

    getUnitFaction(unit) { return FactionSystem.getUnitFaction(unit); }
    getUnitSide(unit) { return FactionSystem.getUnitSide(unit); }

    isPlayerUnit(unit) {
        if (this.isObserver()) return true;
        return this.getUnitFaction(unit) === this.playerFaction;
    }

    isEnemyUnit(unit) {
        if (this.isObserver()) return false;
        return !this.isPlayerUnit(unit);
    }

    convertLegacyFaction(side) { return FactionSystem.normalizeFaction(side); }

    getEnemyFaction() {
        if (!this.playerFaction) return null;
        return this.factions[this.playerFaction]?.enemy ?? null;
    }

    nextTurn() {
        this.turn += 1;
        this.minute += this.turnMinutes;
        while (this.minute >= 60) { this.minute -= 60; this.hour += 1; }
    }

    getTimeString() {
        return `${String(this.hour).padStart(2,"0")}:${String(this.minute).padStart(2,"0")}`;
    }
}
