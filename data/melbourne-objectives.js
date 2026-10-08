// data/melbourne-objectives.js
// Melbourne-only compatibility adapter.
export function getMelbourneObjectives(side, scenario) {
    const key = (side === "allied" || side === "ALLIED") ? "allies" :
                (side === "JPN") ? "japanese" : side;
    return scenario?.strategicObjectives?.[key] || [];
}
export function normalizeMelbourneFaction(side) {
    if (side === "allied" || side === "ALLIED") return "allies";
    if (side === "JPN") return "japanese";
    return side;
}
