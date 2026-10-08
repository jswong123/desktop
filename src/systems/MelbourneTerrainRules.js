// MelbourneTerrainRules.js
// Optional hard guard for Melbourne 1943. Import/use from MovementSystem if desired.
export function isNavalUnit(unit) {
  return !!unit?.naval || unit?.echelon === "ship" ||
    ["destroyer","light_cruiser","heavy_cruiser","battleship","transport","submarine"].includes(unit?.type);
}
export function canEnterMelbourneHex(unit, terrainType) {
  const naval = isNavalUnit(unit);
  if (naval) return terrainType === "water" || terrainType === "sea" || terrainType === "coastal_water";
  return !["water","sea","coastal_water"].includes(terrainType);
}
