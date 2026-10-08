// ============================================================
// main.js
// V1.4 — 玩家控制 / 阶段同步 / 目标胜利 / 存档 / 读取 / 撤销
// ============================================================
import { WorldMap } from "./WorldMap.js";
import { Camera } from "./Camera.js";
import { Renderer } from "./Renderer.js?v=1.4.2";
import { UnitSelection } from "./UnitSelection.js";
import { GameState } from "./GameState.js";
import { FactionSelection } from "./FactionSelection.js";
import { TurnSystem } from "./TurnSystem.js";
import { VictorySystem } from "./systems/VictorySystem.js";
import { MovementSystem } from "./systems/MovementSystem.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { AISystem } from "./systems/AISystem.js";
import { SaveSystem } from "./systems/SaveSystem.js";
import { UndoSystem } from "./systems/UndoSystem.js";
import { pixelToHex, hexToPixel } from "./Hex.js";
import { CampaignSelection } from "./ui/CampaignSelection.js?v=1.4.1";
import { ScenarioManager } from "./scenarios/ScenarioManager.js";
import { FactionSystem } from "./systems/FactionSystem.js?v=0.8.12";
import { ReinforcementSystem } from "./systems/ReinforcementSystem.js";
import { StrategicObjectives } from "./systems/StrategicObjectives.js";
import { EngineerSystem } from "./systems/EngineerSystem.js";
import { EquipmentDeckSystem } from "./systems/EquipmentDeckSystem.js";
import { EQUIPMENT_CARDS, EQUIPMENT_DECKS } from "../data/equipment-cards.js";
import { AIRCRAFT } from "../data/aircraft.js";
import { AIR_SUPPORT_CARDS, AIR_SUPPORT_DECKS } from "../data/air-support-cards.js";
import { AirDefenseSystem } from "./systems/AirDefenseSystem.js";
import { AirSupportSystem } from "./systems/AirSupportSystem.js";
import { FortificationDamageSystem } from "./systems/FortificationDamageSystem.js";
import { FogOfWarSystem } from "./systems/FogOfWarSystem.js";
import { ZoneControlSystem } from "./systems/ZoneControlSystem.js";
import { FieldHospitalSystem } from "./systems/FieldHospitalSystem.js";
import { AirSuperioritySystem } from "./systems/AirSuperioritySystem.js";
import { HexInfoPanel } from "./ui/HexInfoPanel.js";
import { CAMPAIGNS } from "../data/campaigns.js";
import { IntegrityMonitor } from "./systems/IntegrityMonitor.js";
import { ModernLogisticsSystem } from "./systems/ModernLogisticsSystem.js";
import { UnitTransportSystem } from "./systems/UnitTransportSystem.js?v=1.4.5b";
import { CommandDataLogger } from "./systems/CommandDataLogger.js";
// ============================================================
// 多战场战役系统
// ============================================================
let currentScenarioKey = null;
let currentScenarioConfig = null;
let currentDifficulty = { name: "普通", multiplier: 1 };
const campaignSelection = new CampaignSelection();
function getScenarioConfig() {
    return currentScenarioConfig ?? {
        id: currentScenarioKey ?? "dubno",
        name: scenario?.name ?? "战役",
        factions: ["GER", "USSR"],
        start: { year:1941, month:6, day:26, hour:8, minute:0, hoursPerTurn:2, startingPhase:"german" }
    };
}
function showScenarioSelection() {
    const hasActiveBattle = !!currentScenarioKey && Array.isArray(units) && units.length > 0;
    campaignSelection.show(
        async (scenarioId, difficulty) => { currentDifficulty = difficulty ?? { name:"普通", multiplier:1 }; await loadScenario(scenarioId); },
        {
            hasActiveBattle,
            onMainMenu: () => showMainMenu(),
            onReturnToBattle: () => { hideMainMenu(); document.getElementById('pauseMenu')?.setAttribute('hidden',''); render(); }
        }
    );
}
// ============================================================
// DOM
// ============================================================
const canvas =
    document.getElementById("game-canvas");
const mapArea =
    document.getElementById("mapArea");
const unitInfo =
    document.getElementById("unitInfo");
const turnInfo =
    document.getElementById("turnInfo");
const turnNumber =
    document.getElementById("turnNumber");
const turnTime =
    document.getElementById("turnTime");
const turnPhase =
    document.getElementById("turnPhase");
const endPhaseButton =
    document.getElementById("endPhaseButton");
const reinforcementPanel = document.getElementById("reinforcementPanel");
const reinforcementNext = document.getElementById("reinforcementNext");
const reinforcementLog = document.getElementById("reinforcementLog");
const hexInfoElement = document.getElementById("hexInfoPanel");
const engineerActions = document.getElementById("engineerActions");
const buildFortButton = document.getElementById("buildFortButton");
const layMineButton = document.getElementById("layMineButton");
const clearMineButton = document.getElementById("clearMineButton");
const buildFoxholeButton=document.getElementById("buildFoxholeButton");
const buildBunkerButton=document.getElementById("buildBunkerButton");
const buildAA1Button=document.getElementById("buildAA1Button");
const buildAA2Button=document.getElementById("buildAA2Button");
const buildAA3Button=document.getElementById("buildAA3Button");
const buildBridgeButton=document.getElementById("buildBridgeButton");
const repairBridgeButton=document.getElementById("repairBridgeButton");
const demolishBridgeButton=document.getElementById("demolishBridgeButton");
const buildWallButton=document.getElementById("buildWallButton");
const demolishWallButton=document.getElementById("demolishWallButton");
if (!canvas) {
    throw new Error(
        "找不到 #game-canvas，请检查 index.html"
    );
}
// ============================================================
// 游戏核心对象
// ============================================================
const world =
    new WorldMap();
const camera =
    new Camera();
const renderer =
    new Renderer(
        canvas,
        world,
        camera
    );
const integrityMonitor = new IntegrityMonitor(world);
const casualtyState = { sides: {} };
// ============================================================
// 2.5D tabletop view (visual only; rules and hit testing remain Hex based)
// ============================================================
const view25DToggle = document.getElementById("view25d-toggle");
const controlZoneToggle = document.getElementById("control-zone-toggle");
const view25DLeft = document.getElementById("view25d-left");
const view25DRight = document.getElementById("view25d-right");
const view25DDirection = document.getElementById("view25d-direction");
const sandtablePitch = document.getElementById("sandtable-pitch");
const sandtableReset = document.getElementById("sandtable-reset");
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const view25DLabels = { north:"北", east:"东", south:"南", west:"西" };
let view25DEnabled = false;

// ============================================================
// v1.2.7 Fullscreen / iOS display mode
// Desktop browsers use Fullscreen API. iPhone/iPad Safari versions that do
// not expose it fall back to a fixed "maximized" web-app view.
// ============================================================
function isNativeFullscreen(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function isFullscreenView(){
    return isNativeFullscreen() || document.documentElement.classList.contains("ios-maximized");
}
function refreshFullscreenButton(){
    if(!fullscreenToggle) return;
    const active=isFullscreenView();
    fullscreenToggle.textContent=active ? "退出全屏" : "全屏";
    fullscreenToggle.title=active ? "退出全屏模式" : "进入全屏模式";
    fullscreenToggle.setAttribute("aria-pressed", active ? "true" : "false");
}
async function enterGameFullscreen(){
    const root=document.documentElement;
    try {
        if(root.requestFullscreen) await root.requestFullscreen({navigationUI:"hide"});
        else if(root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
        else root.classList.add("ios-maximized");
    } catch (_) {
        root.classList.add("ios-maximized");
    }
    refreshFullscreenButton();
    setTimeout(()=>window.dispatchEvent(new Event("resize")),50);
}
async function exitGameFullscreen(){
    try {
        if(document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
        else if(document.webkitFullscreenElement && document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch (_) {}
    document.documentElement.classList.remove("ios-maximized");
    refreshFullscreenButton();
    setTimeout(()=>window.dispatchEvent(new Event("resize")),50);
}
fullscreenToggle?.addEventListener("click",()=>{
    if(isFullscreenView()) exitGameFullscreen(); else enterGameFullscreen();
});
document.addEventListener("fullscreenchange",refreshFullscreenButton);
document.addEventListener("webkitfullscreenchange",refreshFullscreenButton);
refreshFullscreenButton();

// ============================================================
// 玩家游戏设置：只绑定现有控区 / 2D-3D / 投影方向 / 俯仰 / 战争迷雾
// ============================================================
const GAME_SETTINGS_KEY = "frontline1937_game_settings_v1";
const DEFAULT_GAME_SETTINGS = Object.freeze({
    controlZone: false,
    mapMode: "2d",
    viewDirection: "south",
    pitch: 52,
    fogOfWar: true
});
function loadGameSettings(){
    try {
        const raw=JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY) || "{}");
        return { ...DEFAULT_GAME_SETTINGS, ...raw };
    } catch (_) { return { ...DEFAULT_GAME_SETTINGS }; }
}
let userGameSettings = loadGameSettings();
function persistGameSettings(){
    try { localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(userGameSettings)); } catch (_) {}
}
function applyGameViewSettings({includeFog=true}={}){
    renderer.showControlZones = userGameSettings.controlZone === true;
    if(controlZoneToggle){
        controlZoneToggle.textContent = renderer.showControlZones ? "控区：开" : "控区：关";
        controlZoneToggle.setAttribute("aria-pressed", renderer.showControlZones ? "true" : "false");
    }
    view25DEnabled = userGameSettings.mapMode === "3d";
    renderer.setView25D(view25DEnabled);
    renderer.setViewDirection(userGameSettings.viewDirection || "south");
    renderer.setViewPitch(Number(userGameSettings.pitch ?? 52));
    if(sandtablePitch) sandtablePitch.value = String(userGameSettings.pitch ?? 52);
    if(includeFog && typeof fogOfWarSystem !== "undefined") fogOfWarSystem.setEnabled(userGameSettings.fogOfWar !== false);
    refreshView25DControls();
}
function refreshView25DControls() {
    if (view25DToggle) {
        view25DToggle.textContent = view25DEnabled ? "立体沙盘" : "二维地图";
        view25DToggle.classList.toggle("active", view25DEnabled);
    }
    if (view25DDirection) view25DDirection.textContent = view25DLabels[renderer.view25D.direction] ?? "南";
}
view25DToggle?.addEventListener("click", () => {
    view25DEnabled = !view25DEnabled;
    renderer.setView25D(view25DEnabled);
    refreshView25DControls();
    render();
});
view25DLeft?.addEventListener("click", () => { renderer.cycleViewDirection(-1); refreshView25DControls(); render(); });
view25DRight?.addEventListener("click", () => { renderer.cycleViewDirection(1); refreshView25DControls(); render(); });
view25DDirection?.addEventListener("click", () => { renderer.cycleViewDirection(1); refreshView25DControls(); render(); });
sandtablePitch?.addEventListener("input", () => {
    renderer.setViewPitch(Number(sandtablePitch.value));
    render();
});
sandtableReset?.addEventListener("click", () => {
    renderer.setViewDirection(userGameSettings.viewDirection || "south");
    renderer.setViewPitch(Number(userGameSettings.pitch ?? 52));
    if (sandtablePitch) sandtablePitch.value = String(userGameSettings.pitch ?? 52);
    refreshView25DControls();
    render();
});
renderer.setViewPitch(Number(userGameSettings.pitch ?? 52));
renderer.setViewDirection(userGameSettings.viewDirection || "south");
view25DEnabled = userGameSettings.mapMode === "3d";
renderer.setView25D(view25DEnabled);
renderer.showControlZones = userGameSettings.controlZone === true;
refreshView25DControls();

const gameState =
    new GameState();
const scenarioManager = new ScenarioManager({ world, gameState });
const selection =
    new UnitSelection(
        renderer,
        gameState
    );
const movementSystem =
    new MovementSystem(
        world
    );
const combatSystem =
    new CombatSystem(
        world
    );
const aiSystem =
    new AISystem(
        movementSystem,
        combatSystem
    );
const factionSelection =
    new FactionSelection(
        gameState
    );
const saveSystem = new SaveSystem({ maxSlots: 3, storagePrefix: "frontline-1937-1945-v0.3" });
const undoSystem = new UndoSystem({ maxHistory: 30 });
const commandDataLogger = new CommandDataLogger();
window.frontlineCommandData = commandDataLogger;
// ============================================================
// 游戏状态
// 必须先声明，再初始化任何会读取 turnSystem / scenario 的系统。
// ============================================================
let scenario = null;
let units = [];
const unitTransportSystem = new UnitTransportSystem();
let turnSystem = null;
let victorySystem = null;
let lastBattleMessage = "";
let selectedUnit = null;
let gameOver = false;
let postBattleViewing = false;
let aiRunning = false;

// 现代后勤按单位能力判定，而不是只依赖“砺剑合成旅选择”场景标记。
function isVehicleInfantry(unit=null){
    if(!unit) return false;
    const type=String(unit.type??unit.unitType??'').toLowerCase();
    if(["mechanized_infantry","wheeled_infantry","motorized_infantry","armored_infantry","high_mobility_infantry"].includes(type)) return true;
    const text=[unit.name,unit.fullName,unit.equipmentName,unit.equipmentType,...(Array.isArray(unit.equipment)?unit.equipment.flatMap(e=>[e?.name,e?.type]):[])].filter(Boolean).join(' ');
    return /机械化步兵|装甲步兵|装步|高机动步兵|摩托化步兵|轮式步兵|步兵战车|装甲输送车|ZBD[- ]?0?4|ZBD[- ]?0?5|ZBL[- ]?0?8|CSK[- ]?181/i.test(text);
}
function usesModernLogistics(unit=null){
    if(unit) return !!unit.modern || isVehicleInfantry(unit) || (["pla","tw_proxy","red","blue"].includes(normalizeSide(unit.faction??unit.side)) && (unit.fuel!==undefined || unit.ammo!==undefined || unit.ammunition!==undefined));
    return currentScenarioConfig?.modernBrigadeSelection===true || currentScenarioConfig?.plaCombinedBrigadeSelection===true || units.some(u=>usesModernLogistics(u));
}

const reinforcementSystem = new ReinforcementSystem(world);
const strategicObjectives = new StrategicObjectives({
    getPlayerFaction: () => getPlayerSide(),
    getTurn: () => turnSystem?.turn ?? 1,
    getUnits: () => units,
    container: document.getElementById("strategicObjectives")
});
// 此时 turnSystem 已经完成声明（初值为 null），因此首次渲染安全回退到第1回合。
strategicObjectives.init();
const engineerSystem = new EngineerSystem(world);
const equipmentDeckSystem = new EquipmentDeckSystem({cards:EQUIPMENT_CARDS,decks:EQUIPMENT_DECKS});
// 预留给开发者模式/战役脚本调用，不改变现有战斗规则。
window.frontlineEquipmentDecks = equipmentDeckSystem;
const airDefenseSystem = new AirDefenseSystem(world,()=>units);
const fortificationDamageSystem = new FortificationDamageSystem(world);
const zoneControlSystem = new ZoneControlSystem(world,()=>units);
const fogOfWarSystem = new FogOfWarSystem(world,()=>units,zoneControlSystem);
const fieldHospitalSystem = new FieldHospitalSystem({world,getUnits:()=>units,getTurn:()=>turnSystem?.getTurnNumber?.()??turnSystem?.turn??1});
const airSuperioritySystem = new AirSuperioritySystem();
const modernLogisticsSystem = new ModernLogisticsSystem({getUnits:()=>units,getTurn:()=>turnSystem?.turn??1});
window.frontlineModernLogistics = modernLogisticsSystem;
const airSupportSystem = new AirSupportSystem({world,getUnits:()=>units,getTurn:()=>turnSystem?.getTurnNumber?.()??turnSystem?.turn??1,getPhase:()=>turnSystem?.phase,cards:AIR_SUPPORT_CARDS,decks:AIR_SUPPORT_DECKS,aircraft:AIRCRAFT,airDefense:airDefenseSystem,fortificationDamage:fortificationDamageSystem,airSuperiority:airSuperioritySystem,fogOfWar:fogOfWarSystem});
renderer.fogOfWar=fogOfWarSystem;
renderer.zoneControl=zoneControlSystem;
renderer.showControlZones = userGameSettings.controlZone === true;
window.frontlineFortificationDamage = fortificationDamageSystem;
window.frontlineAirSupport = airSupportSystem;
window.frontlineFogOfWar = fogOfWarSystem;
window.frontlineZoneControl = zoneControlSystem;
window.frontlineFieldHospital = fieldHospitalSystem;
window.frontlineAirSuperiority = airSuperioritySystem;
let pendingAirCard = null;
// ============================================================
// 砺剑-27：军事保障节点 / 空军基地占领系统
// ============================================================
function processCapturableFacilities(){
    const facilities=scenario?.capturableFacilities;
    if(!Array.isArray(facilities)||!facilities.length)return;
    scenario.facilityState=scenario.facilityState&&typeof scenario.facilityState==='object'?scenario.facilityState:{};
    const aliveAt=(q,r)=>units.filter(u=>u?.offMap!==true&&isUnitAlive(u)&&Number(u.q)===Number(q)&&Number(u.r)===Number(r));
    const grantSupply=(side,node,st)=>{
        const grant=Math.min(Math.max(0,Number(node.captureGrant??300)),Math.max(0,Number(st.remainingStock??node.totalStock??0)));
        if(grant<=0)return 0;
        const friend=units.filter(u=>u?.offMap!==true&&isUnitAlive(u)&&normalizeSide(u.faction??u.side)===side);
        // 保障节点库存按“补给点”抽象分配；优先补充缺口最大的单位，节点总量永久扣减。
        let budget=grant;
        const targets=[...friend].sort((a,b)=>((100-Number(b.supply??100))+(100-Number(b.ammo??100))+(100-Number(b.fuel??100)))-((100-Number(a.supply??100))+(100-Number(a.ammo??100))+(100-Number(a.fuel??100))));
        for(const u of targets){if(budget<=0)break;for(const k of ['supply','ammo','fuel']){if(budget<=0)break;const before=Math.max(0,Math.min(100,Number(u[k]??100))),need=100-before,take=Math.min(need,budget);u[k]=before+take;budget-=take;}}
        const used=grant-budget;st.remainingStock=Math.max(0,Number(st.remainingStock??node.totalStock??0)-used);return used;
    };
    for(const f of facilities){
        const st=scenario.facilityState[f.id]??={owner:f.initialOwner??null,remainingStock:Number(f.totalStock??0),durability:Number(f.initialDurability??f.maxDurability??100),disabled:false,captures:0};
        const here=aliveAt(f.q,f.r), sides=[...new Set(here.map(u=>normalizeSide(u.faction??u.side)).filter(x=>x==='red'||x==='blue'))];
        if(sides.length!==1)continue;
        const side=sides[0];if(st.owner===side)continue;
        st.owner=side;st.captures=Number(st.captures??0)+1;st.lastCaptureTurn=Number(turnSystem?.turn??1);
        if(f.type==='military_logistics'){
            const got=grantSupply(side,f,st);writeBattleMessage(`${side==='red'?'红方':'蓝方'}夺取军事保障节点「${f.name}」，获得 ${got} 点补给；节点库存剩余 ${Math.round(st.remainingStock)}。`);
        }else if(f.type==='military_airfield'){
            const threshold=Number(f.disabledBelow??50);st.disabled=Number(st.durability??100)<threshold;const added=st.disabled?0:airSupportSystem.grantCards(side,f.airSupportGrant??{modern_cap:1,modern_precision:1});
            writeBattleMessage(`${side==='red'?'红方':'蓝方'}夺取空军基地「${f.name}」；机场耐久 ${Math.round(st.durability??100)}/${f.maxDurability??100}${st.disabled?'，当前受损停用':'，航空支援增加 '+added+' 次'}。`);renderAirSupportPanel();
        }
    }
    // 机场恢复：己方工兵在2格内时，每回合恢复耐久；达到阈值后重新开放航空支援。
    for(const f of facilities.filter(x=>x.type==='military_airfield')){
      const st=scenario.facilityState[f.id]; if(!st?.owner||!st.disabled)continue;
      const eng=units.some(u=>u?.offMap!==true&&isUnitAlive(u)&&normalizeSide(u.faction??u.side)===st.owner&&String(u.type??'').includes('engineer')&&Math.max(Math.abs(Number(u.q)-f.q),Math.abs(Number(u.r)-f.r),Math.abs((Number(u.q)-f.q)+(Number(u.r)-f.r)))<=2);
      if(eng){st.durability=Math.min(Number(f.maxDurability??100),Number(st.durability??0)+Number(f.engineerRepairPerTurn??25));if(st.durability>=Number(f.disabledBelow??50)){st.disabled=false;const added=airSupportSystem.grantCards(st.owner,f.airSupportGrant??{});writeBattleMessage(`工兵完成「${f.name}」抢修，机场恢复使用；航空支援增加 ${added} 次。`);renderAirSupportPanel();}}
    }
}
const hexInfoPanel = new HexInfoPanel(hexInfoElement, world);
let selectedHex = null;
renderer.movementSystem =
    movementSystem;
// ============================================================
// 鼠标状态
// ============================================================
let isDragging = false;
let dragMoved = false;
let lastMouseX = 0;
let lastMouseY = 0;
// ============================================================
// Canvas
// ============================================================
function resizeCanvas() {
    const container = mapArea ?? canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Renderer / Camera / 鼠标命中统一使用 CSS 像素。
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
}
// ============================================================
// 渲染
// ============================================================
let _lastFogRenderSignature = '';
function render() {
    // 大地图性能优化：只有阵营、单位位置/生存状态或迷雾开关改变时才重算视野与控制区。
    // 纯拖拽、缩放、打开面板不再重复执行整张144×120地图的侦察计算。
    const fogSig = `${fogOfWarSystem.side}|${fogOfWarSystem.enabled?1:0}|` + units.map(u=>`${u.id}:${u.offMap?1:0}:${u.q},${u.r}:${Math.round(Number(u.strength??0))}`).join(';');
    if (fogSig !== _lastFogRenderSignature) {
        fogOfWarSystem.recompute();
        _lastFogRenderSignature = fogSig;
    }
    const onMap=units.filter(unit => unit.offMap !== true);
    renderer.render(fogOfWarSystem.filterUnits(onMap));
}
if (controlZoneToggle) {
    controlZoneToggle.addEventListener("click", () => {
        renderer.showControlZones = !renderer.showControlZones;
        controlZoneToggle.textContent = renderer.showControlZones ? "控区：开" : "控区：关";
        controlZoneToggle.setAttribute("aria-pressed", renderer.showControlZones ? "true" : "false");
        render();
    });
}

// ============================================================
// 阵营标准化
// ============================================================
function normalizeSide(side) {
    const faction = FactionSystem.getFaction(side);
    if (faction?.side) return faction.side;
    const value = String(side ?? "").trim().toLowerCase();
    const aliases = { red:"red", blue:"blue", pla_red:"red", pla_blue:"blue", "红方":"red", "蓝方":"blue", pla:"pla", "解放军":"pla", "中国人民解放军":"pla", tw_proxy:"tw_proxy", "台伪军":"tw_proxy", chinese:"chinese", china:"chinese", chn:"chinese", japanese:"japanese", japan:"japanese", jpn:"japanese" };
    return aliases[value] ?? value;
}
// ============================================================
// 获取单位阵营
// ============================================================
function getUnitSide(unit) {
    return normalizeSide(
        unit?.faction ??
        unit?.side ??
        unit?.camp
    );
}
// ============================================================
// 玩家阵营
// ============================================================
function getPlayerSide() {
    // FactionSelection / GameState 不同版本可能使用不同字段。
    // 这里统一兼容，避免“界面显示苏军，但控制逻辑仍读取德军”的问题。
    const candidates = [
        gameState.playerFaction,
        gameState.playerSide,
        gameState.selectedFaction,
        gameState.selectedSide,
        gameState.side,
        gameState.faction
    ];
    for (const value of candidates) {
        const side = normalizeSide(value);
        if (["red", "blue", "german", "soviet", "chinese", "japanese", "british", "italian", "american", "allied", "rok_government", "new_military", "pla", "tw_proxy"].includes(side)) {
            return side;
        }
    }
    return "";
}
// ============================================================
// 单位是否存活
// ============================================================
function isUnitAlive(unit) {
    if (!unit) {
        return false;
    }
    if (unit.destroyed === true || unit.offMap === true) {
        return false;
    }
    const strength =
        Number(unit.strength);
    const manpower =
        Number(unit.manpower);
    // 任意一个有效兵力字段 <= 0，都视为阵亡
    if (
        Number.isFinite(strength) &&
        strength <= 0
    ) {
        return false;
    }
    if (
        Number.isFinite(manpower) &&
        manpower <= 0
    ) {
        return false;
    }
    return true;
}
// ============================================================
// 单位名称
// ============================================================
function unitName(unit) {
    return (
        unit?.nameZh ??
        unit?.name ??
        unit?.id ??
        "未命名单位"
    );
}
// ============================================================
// 当前兵力
// ============================================================
function getUnitStrength(unit) {
    // strength 是唯一的实时生命力主字段。
    // manpower 仅作为旧数据兼容回退。
    const value =
        Number(
            unit?.strength ??
            unit?.manpower ??
            100
        );
    return Number.isFinite(value)
        ? value
        : 100;
}
// ============================================================
// 最大兵力
// ============================================================
function getUnitMaxStrength(unit) {
    // maxStrength 是最大生命力主字段。
    // maxManpower 仅作为旧数据兼容回退。
    const value =
        Number(
            unit?.maxStrength ??
            unit?.initialStrength ??
            unit?.maxManpower ??
            100
        );
    return Number.isFinite(value)
        ? value
        : 100;
}
// ============================================================
// 兵力显示
// ============================================================
function getStrengthText(unit) {
    return (
        `${Math.max(0, Math.round(getUnitStrength(unit)))} / ` +
        `${Math.max(1, Math.round(getUnitMaxStrength(unit)))}`
    );
}
// ============================================================
// units.json 单位标准化
// ============================================================
function normalizeUnit(rawUnit) {
 const strength =
    Number(
        rawUnit.strength ??
        rawUnit.manpower ??
        100
    );
const maxStrength =
    Number(
        rawUnit.maxStrength ??
        rawUnit.maxManpower ??
        rawUnit.strength ??
        rawUnit.manpower ??
        100
    );
    const movement =
        Number(
            rawUnit.movement ??
            rawUnit.maxMovementPoints ??
            rawUnit.movementPoints ??
            4
        );
    const faction =
        normalizeSide(
            rawUnit.faction ??
            rawUnit.side ??
            rawUnit.camp
        );
    return {
        ...rawUnit,
        id:
            String(
                rawUnit.id ?? ""
            ),
        name:
            String(
                rawUnit.name ??
                rawUnit.nameZh ??
                rawUnit.id ??
                "未知单位"
            ),
        faction,
        side:
            faction,
        type:
            rawUnit.type ??
            rawUnit.unitType ??
            "infantry",
        q:
            Number(
                rawUnit.q
            ),
        r:
            Number(
                rawUnit.r
            ),
        strength:
            Math.max(
                0,
                strength
            ),
        maxStrength:
            Math.max(
                1,
                maxStrength
            ),
        manpower: Math.max(0, Number(rawUnit.manpower ?? strength)),
        maxManpower: Math.max(1, Number(rawUnit.maxManpower ?? rawUnit.manpower ?? maxStrength)),
        echelon:
            rawUnit.echelon ??
            "battalion",
        minRange:
            Number(
                rawUnit.minRange ??
                (rawUnit.type === "artillery" ? 2 : 1)
            ),
        maxRange:
            Number(
                rawUnit.maxRange ??
                rawUnit.range ??
                1
            ),
        attack:
            Number(
                rawUnit.attack ?? 5
            ),
        defense:
            Number(
                rawUnit.defense ?? 5
            ),
        range:
            Number(
                rawUnit.range ?? 1
            ),
        movement,
        maxMovementPoints:
            movement,
        movementPoints:
            movement,
        destroyed:
            strength <= 0,
        hasAttacked:
            false,
        morale:
            Number(
                rawUnit.morale ?? 80
            ),
        suppression:
            Number(
                rawUnit.suppression ?? 0
            ),
        fatigue:
            Number(
                rawUnit.fatigue ?? 0
            ),
        ammunition:
            Number(
                rawUnit.ammunition ??
                rawUnit.ammo ??
                100
            ),
        ammo: Number(rawUnit.ammo ?? rawUnit.ammunition ?? 100),
        maxAmmo: Number(rawUnit.maxAmmo ?? 100),
        fuel: Number(rawUnit.fuel ?? 100),
        maxFuel: Number(rawUnit.maxFuel ?? 100),
        repairParts: Number(rawUnit.repairParts ?? 20),
        equipment: Array.isArray(rawUnit.equipment) ? rawUnit.equipment.map(e=>({...e})) : rawUnit.equipment
    };
}
// ============================================================
// 加载 units.json
// ============================================================
async function loadUnitsFromJSON(unitsPath = "./data/units.json") {
    console.log(
        `[单位系统] 正在读取 ${unitsPath}`
    );
    const response =
        await fetch(
            unitsPath,
            {
                cache: "no-store"
            }
        );
    if (!response.ok) {
        throw new Error(
            `units.json 加载失败：HTTP ${response.status}`
        );
    }
    const data =
        await response.json();
    if (
        !data ||
        !Array.isArray(
            data.units
        )
    ) {
        throw new Error(
            "units.json 格式错误：找不到 units 数组"
        );
    }
    const loadedUnits =
        data.units.map(
            normalizeUnit
        );
    console.log(
        `[单位系统] units.json 加载成功：${loadedUnits.length} 个单位`
    );
    return loadedUnits;
}
// ============================================================
// 主系统部署安全检查
// - 手工编制冲突：阻止战役启动，避免静默破坏历史部署
// - 系统自动生成单位（AUTO_RECON / AUTO_AA 等）：自动寻找最近合法空格
// ============================================================
function isSystemGeneratedUnit(unit) {
    const id = String(unit?.id ?? "").toUpperCase();
    return id.includes("_AUTO_") || id.startsWith("AUTO_") || unit?.autoGenerated === true || ["GroupArmySystem","ModernBrigadeSystem"].includes(unit?.generatedBy);
}
function deploymentTerrainAllowed(unit, q, r) {
    if (!Number.isFinite(q) || !Number.isFinite(r)) return false;
    if (q < 0 || r < 0 || q >= Number(world?.width ?? 0) || r >= Number(world?.height ?? 0)) return false;
    const terrain = world?.terrainAt?.(q, r) ?? "plain";
    const naval = unit?.domain === "naval" || unit?.unitClass === "naval";
    if (!naval && ["water", "deep_water", "sea", "lake"].includes(terrain)) return false;
    if (naval && !["water", "deep_water", "sea", "lake"].includes(terrain)) return false;
    // 动态训练单位的初始格必须符合其实际地形通行规则；避免“部署合法但一格也走不出去”。
    if (!naval && unit?.autoGenerated === true && movementSystem?.pathfinding) {
        const c = movementSystem.pathfinding.terrainCost(unit, q, r);
        if (!Number.isFinite(c)) return false;
    }
    return true;
}
function findNearestSafeDeployment(unit, occupied, maxRadius = 12) {
    const oq = Number(unit.q), or = Number(unit.r);
    for (let radius = 1; radius <= maxRadius; radius++) {
        const candidates = [];
        for (let dq = -radius; dq <= radius; dq++) {
            for (let dr = -radius; dr <= radius; dr++) {
                const ds = -dq-dr;
                if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) !== radius) continue;
                candidates.push([oq+dq, or+dr]);
            }
        }
        // 固定排序保证每次加载结果一致
        candidates.sort((a,b)=>a[1]-b[1] || a[0]-b[0]);
        for (const [q,r] of candidates) {
            if (occupied.has(`${q},${r}`)) continue;
            if (!deploymentTerrainAllowed(unit,q,r)) continue;
            return {q,r};
        }
    }
    // 局部部署区过密或位于海岸时，继续做全图确定性兜底搜索。
    // 集团军动态生成单位不应仅因初始锚点拥挤而让整场战役加载失败。
    for (let r = 1; r < Number(world?.height ?? 0)-1; r++) {
        for (let q = 1; q < Number(world?.width ?? 0)-1; q++) {
            if (occupied.has(`${q},${r}`)) continue;
            if (!deploymentTerrainAllowed(unit,q,r)) continue;
            return {q,r};
        }
    }
    return null;
}
function runDeploymentSafetyCheck(unitList, { autoRepair = true } = {}) {
    const occupied = new Map();
    const report = { repaired: [], conflicts: [], invalid: [] };
    for (const unit of unitList) {
        if (unit?.offMap === true || !isUnitAlive(unit)) continue;
        const q=Number(unit.q), r=Number(unit.r);
        if (!deploymentTerrainAllowed(unit,q,r)) {
            // 现代旅/系统动态生成单位允许自动迁移到最近合法空格；历史手工部署仍严格报错。
            if (autoRepair && isSystemGeneratedUnit(unit)) {
                const safe=findNearestSafeDeployment(unit,occupied,18);
                if (safe) {
                    const from={q,r}; unit.q=safe.q; unit.r=safe.r;
                    occupied.set(`${safe.q},${safe.r}`,unit);
                    report.repaired.push({id:unit.id,from,to:safe,reason:"非法坐标或地形"});
                    console.warn(`[部署安全] ${unit.id} 从非法部署 (${q}, ${r}) 自动调整到 (${safe.q}, ${safe.r})`);
                    continue;
                }
            }
            report.invalid.push({id:unit.id,q,r,reason:"非法坐标或地形"});
            continue;
        }
        const key=`${q},${r}`;
        if (!occupied.has(key)) { occupied.set(key,unit); continue; }
        const existing=occupied.get(key);
        // 优先移动系统自动生成单位；若先遇到 AUTO 而后遇到历史单位，也移动 AUTO
        let mover = null;
        if (isSystemGeneratedUnit(unit)) mover=unit;
        else if (isSystemGeneratedUnit(existing)) mover=existing;
        if (autoRepair && mover) {
            if (mover === existing) occupied.delete(key);
            const safe=findNearestSafeDeployment(mover,occupied);
            if (safe) {
                const from={q:Number(mover.q),r:Number(mover.r)};
                mover.q=safe.q; mover.r=safe.r;
                occupied.set(`${safe.q},${safe.r}`,mover);
                if (mover !== unit) occupied.set(key,unit);
                report.repaired.push({id:mover.id,from,to:safe,blockedBy:(mover===unit?existing.id:unit.id)});
                console.warn(`[部署安全] ${mover.id} 与 ${mover===unit?existing.id:unit.id} 冲突，已从 (${from.q}, ${from.r}) 自动调整到 (${safe.q}, ${safe.r})`);
                continue;
            }
        }
        report.conflicts.push({a:existing.id,b:unit.id,q,r});
    }
    if (report.repaired.length) console.info(`[部署安全] 已自动修复 ${report.repaired.length} 个系统生成单位部署冲突`);
    if (report.invalid.length) { console.error("[部署安全] 非法部署",report.invalid); report.invalid.forEach(x=>console.error(`[部署安全][非法] ${x.id} @ (${x.q}, ${x.r})：${x.reason}`)); }
    if (report.conflicts.length) console.error("[部署安全] 无法自动修复的部署冲突",report.conflicts);
    return report;
}
// ============================================================
// 单位数据检查
// ============================================================
function validateUnits(
    unitList
) {
    const ids =
        new Set();
    const positions =
        new Map();
    let errors =
        0;
    for (
        const unit
        of unitList
    ) {
        // ----------------------------------------------------
        // ID
        // ----------------------------------------------------
        if (!unit.id) {
            console.error(
                "[单位数据] 存在没有 ID 的单位",
                unit
            );
            errors++;
        }
        else if (
            ids.has(
                unit.id
            )
        ) {
            console.error(
                `[单位数据] 重复单位 ID：${unit.id}`
            );
            errors++;
        }
        else {
            ids.add(
                unit.id
            );
        }
        // ----------------------------------------------------
        // 阵营
        // ----------------------------------------------------
        if (
            !["red", "blue", "german", "soviet", "chinese", "japanese", "british", "italian", "american", "allied", "rok_government", "new_military", "pla", "tw_proxy"].includes(getUnitSide(unit))
        ) {
            console.error(
                `[单位数据] ${unit.id} 阵营错误：${unit.faction}`
            );
            errors++;
        }
        // ----------------------------------------------------
        // 地图外增援单位不参与坐标/占格检查
        // ----------------------------------------------------
        if (unit.offMap === true) {
            continue;
        }
        // ----------------------------------------------------
        // 坐标
        // ----------------------------------------------------
        if (
            !Number.isFinite(
                unit.q
            ) ||
            !Number.isFinite(
                unit.r
            )
        ) {
            console.error(
                `[单位数据] ${unit.id} 坐标无效`
            );
            errors++;
            continue;
        }
        // ----------------------------------------------------
        // 一格一单位
        // ----------------------------------------------------
        if (
            isUnitAlive(unit)
        ) {
            const key =
                `${unit.q},${unit.r}`;
            if (
                positions.has(
                    key
                )
            ) {
                const existing =
                    positions.get(
                        key
                    );
                console.error(
                    `[部署冲突] ${existing.id} 与 ${unit.id} 同时位于 (${unit.q}, ${unit.r})`
                );
                errors++;
            }
            else {
                positions.set(
                    key,
                    unit
                );
            }
        }
    }
    if (
        errors === 0
    ) {
        console.log(
            `[单位系统] 数据检查通过：${unitList.length} 个单位`
        );
        return true;
    }
    console.error(
        `[单位系统] 数据检查失败：发现 ${errors} 个问题`
    );
    return false;
}
// ============================================================
// 初始化单位
// ============================================================
function initializeUnits() {
    for (
        const unit
        of units
    ) {
        const side =
            getUnitSide(
                unit
            );
        unit.side =
            side;
        unit.faction =
            side;
        if (
            unit.strength ==
            null
        ) {
            unit.strength =
                100;
        }
        if (
            unit.maxStrength ==
            null
        ) {
            unit.maxStrength =
                unit.strength;
        }
        if (
            unit.strength <= 0
        ) {
            unit.strength = 0;
            unit.destroyed = true;
        }
        combatSystem.resetUnit(
            unit
        );
        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {
            movementSystem.initializeUnit(
                unit
            );
        }
        if (
            unit.morale ==
            null
        ) {
            unit.morale =
                80;
        }
        if (
            unit.suppression ==
            null
        ) {
            unit.suppression =
                0;
        }
        if (
            unit.fatigue ==
            null
        ) {
            unit.fatigue =
                0;
        }
        if (
            unit.ammunition ==
            null
        ) {
            unit.ammunition =
                unit.ammo ??
                100;
        }
        if (
            unit.ammo ==
            null
        ) {
            unit.ammo =
                unit.ammunition;
        }
    }
}
// ============================================================
// 回合系统
// ============================================================
function initializeTurnSystem() {
    const config = getScenarioConfig();

    // 阵营顺序优先服从实际单位数据。现代红蓝演习若地图/目录仍残留历史阵营配置，
    // 不允许 TurnSystem 回退成“中国军/日军”等旧阶段，否则会造成误判、错误 AI 日志和无法控制。
    const liveSides = [...new Set((units ?? []).filter(isUnitAlive).map(getUnitSide).filter(Boolean))];
    const isRedBlueExercise = liveSides.includes("red") && liveSides.includes("blue");
    const attacker = isRedBlueExercise ? "red" : normalizeSide(
        config?.roles?.attacker ??
        FactionSystem.getFaction(config?.factions?.[0])?.side ??
        "german"
    );

    const defender = isRedBlueExercise ? "blue" : normalizeSide(
        config?.roles?.defender ??
        FactionSystem.getFaction(config?.factions?.[1])?.side ??
        "soviet"
    );

    const startingPhase = normalizeSide(
        config?.start?.startingPhase ?? attacker
    );

    // 当前战役颜色规则同步给 Renderer。
    renderer.setScenarioSides?.(attacker, defender);

    // 行动顺序必须从 startingPhase 开始。
    const phaseOrder = startingPhase === defender
        ? [defender, attacker]
        : [attacker, defender];

    turnSystem = new TurnSystem({
        units,
        year: config.start.year,
        month: config.start.month,
        day: config.start.day,
        hour: config.start.hour,
        minute: config.start.minute,
        hoursPerTurn: config.start.hoursPerTurn,
        startingPhase,
        phaseOrder
    });

    turnSystem.onPhaseChanged = () => {
        clearSelection();
        updateTurnUI();
        render();
    };

    turnSystem.onTurnChanged = () => {
        fogOfWarSystem.advanceTurn();
        airSuperioritySystem.advanceTurn();
        // 空降支援生成的是永久地面单位，不得在换回合时清除。
        // 集结状态仅限制落地当回合；进入下一回合后恢复为普通作战单位。
        for (const u of units) {
            if (u?.airborneDeployed !== true || u.destroyed === true || u.offMap === true) continue;
            u.persistent = true;
            u.temporary = false;
            if (Number(turnSystem?.turn ?? 1) > Number(u.airDropTurn ?? 0)) {
                u.airborneDisorganized = 0;
            }
        }
        // 工程作业无回合冷却：不在换回合时自动推进/锁定工程。
        if (usesModernLogistics()) {
            const lr=modernLogisticsSystem.processTurn();
            if(lr.length) writeBattleMessage(`后勤阶段：${lr.length}个单位完成弹药/燃油补给或装备抢修`);
        }
        processReinforcementsForCurrentTurn();
        updateTurnUI();
        if (!gameOver) checkVictory();
        render();
    };

    turnSystem.onTimeChanged = () => {
        updateTurnUI();
    };

    updateTurnUI();
}
// ============================================================
// 增援 UI
// ============================================================
function updateReinforcementUI() {
    if (!reinforcementPanel || !turnSystem) return;
    const supportsReinforcements = reinforcementSystem.groups.length > 0;
    reinforcementPanel.hidden = !supportsReinforcements;
    if (!supportsReinforcements) return;

    const pending = reinforcementSystem.getPendingGroups(turnSystem.turn, units);
    if (reinforcementNext) {
        if (!pending.length) {
            reinforcementNext.innerHTML = `<div class="reinforcement-empty">暂无待到达增援</div>`;
        } else {
            reinforcementNext.innerHTML = pending.slice(0,4).map(g => `
                <div class="reinforcement-item">
                    <div class="reinforcement-title">第${g.turn}回合 · ${g.name}</div>
                    <div class="reinforcement-detail">${g.detail}</div>
                    <div class="reinforcement-meta">${g.unitCount}个算子 · ${g.turnsRemaining===0?'本回合到达':`还有${g.turnsRemaining}回合`}</div>
                </div>`).join("");
        }
    }
    if (reinforcementLog) {
        const log=reinforcementSystem.getArrivalLog();
        reinforcementLog.innerHTML = log.length
            ? log.slice(0,4).map(x=>`<div class="reinforcement-log-item">第${x.turn}回合：${x.name}（${x.count}个算子）</div>`).join("")
            : `<div class="reinforcement-empty">暂无增援到达</div>`;
    }
}

function processReinforcementsForCurrentTurn() {
    if (!turnSystem || reinforcementSystem.groups.length === 0) return;
    const result=reinforcementSystem.processTurn(turnSystem.turn, units);
    for (const arrival of result.reinforcements ?? []) {
        console.log(`[增援] ${arrival.message}`);
        writeBattleMessage?.(`增援到达：${arrival.message}`);
    }
    applyDifficultyToEnemyUnits();
    updateReinforcementUI();
}

// ============================================================
// 回合 UI
// ============================================================
function updateTurnUI() {
    if (!turnSystem) {
        return;
    }
    updateReinforcementUI();
    strategicObjectives.onTurnChanged();
    if (
        turnInfo &&
        typeof turnSystem.getHeaderText ===
        "function"
    ) {
        turnInfo.textContent = currentScenarioConfig?.modernBrigadeSelection
            ? `${turnSystem.getDateText()} · ${turnSystem.getTimeText()} ｜ 第${turnSystem.getTurnNumber()}回合 ｜ ${factionLabel(turnSystem.phase)}行动`
            : turnSystem.getHeaderText();
    }
    const number =
        typeof turnSystem.getTurnNumber ===
        "function"
            ? turnSystem.getTurnNumber()
            : turnSystem.turn ?? 1;
    if (turnNumber) {
        turnNumber.textContent =
            `第${number}回合`;
    }
    if (
        turnTime &&
        typeof turnSystem.getTurnTimeRange ===
        "function"
    ) {
        turnTime.textContent =
            turnSystem.getTurnTimeRange();
    }
    const phase =
        normalizeSide(
            turnSystem.phase
        );
    const phaseName = `${factionLabel(phase)}行动`;
    if (turnPhase) {
        turnPhase.textContent = currentScenarioConfig?.modernBrigadeSelection
            ? phaseName
            : (typeof turnSystem.getPhaseName === "function" ? turnSystem.getPhaseName() : phaseName);
    }
    if (endPhaseButton) {
        endPhaseButton.textContent = "结束回合";
    }
    updateReinforcementUI();
}
// ============================================================
// 当前行动阶段
// ============================================================
function isUnitActive(unit) {
    if (!unit) {
        return false;
    }
    if (!turnSystem) {
        return true;
    }
    return (
        getUnitSide(unit) ===
        normalizeSide(
            turnSystem.phase
        )
    );
}
// ============================================================
// 玩家能否控制单位
// ============================================================
function playerCanControlUnit(unit) {
    if (!unit || !isUnitAlive(unit) || gameOver || aiRunning) {
        return false;
    }
    if (String(gameState.mode).toLowerCase() === "developer") {
        return true;
    }
    if (String(gameState.mode).toLowerCase() === "observer") {
        return false;
    }
    const unitSide = getUnitSide(unit);
    const playerSide = getPlayerSide();
    const phaseSide = normalizeSide(turnSystem?.phase);
    // 没有明确玩家阵营时，绝不默认允许控制，防止误控 AI 阵营。
    if (!["red", "blue", "german", "soviet", "chinese", "japanese", "british", "italian", "american", "allied", "rok_government", "new_military", "pla", "tw_proxy"].includes(playerSide)) {
        return false;
    }
    // 只能控制玩家自己选择的阵营。
    if (unitSide !== playerSide) {
        return false;
    }
    // 只能在本方行动阶段操作。
    if (turnSystem && phaseSide !== playerSide) {
        return false;
    }
    return true;
}
// ============================================================
// 查看单位
// ============================================================
function playerCanViewUnit(unit) {
    return (
        unit != null &&
        isUnitAlive(unit)
    );
}
// ============================================================
// 清除移动范围
// ============================================================
function clearReachable() {
    if (
        typeof renderer.clearReachable ===
        "function"
    ) {
        renderer.clearReachable();
    }
    if (
        movementSystem.reachable instanceof
        Map
    ) {
        movementSystem.reachable.clear();
    }
}
// ============================================================
// 清除选择
// ============================================================
function clearSelection() {
    // 切换阶段/取消选择时必须释放工程目标状态，避免幽灵锁定。
    pendingEngineeringAction = null;
    pendingEngineeringUnitId = null;
    selectedUnit =
        null;
    if (
        typeof selection.clear ===
        "function"
    ) {
        selection.clear();
    }
    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(
            null
        );
    }
    if (
        typeof movementSystem.clear ===
        "function"
    ) {
        movementSystem.clear();
    }
    clearReachable();
    if (unitInfo) {
        unitInfo.innerHTML =
            '<p class="hint">点击地图上的单位查看详情</p>';
    }
}
// ============================================================
// 单位信息
// ============================================================

function hexDistanceSimple(a,b){
    const dq=Number(a.q)-Number(b.q), dr=Number(a.r)-Number(b.r);
    return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));
}
function terrainAtTransport(q,r){return String(world?.terrainAt?.(q,r) ?? world?.getTerrain?.(q,r) ?? 'plain');}
function adjacentFriendlyCargo(carrier){
    const side=getUnitSide(carrier);
    return units.filter(u=>u!==carrier&&u.offMap!==true&&isUnitAlive(u)&&getUnitSide(u)===side&&u.domain!=='naval'&&hexDistanceSimple(carrier,u)<=1&&unitTransportSystem.canEmbark(carrier,u));
}
function adjacentUnloadHexes(carrier){
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]], out=[];
    for(const [dq,dr] of dirs){const q=Number(carrier.q)+dq,r=Number(carrier.r)+dr,t=terrainAtTransport(q,r);if(t==='water')continue;const occ=units.some(u=>u.offMap!==true&&isUnitAlive(u)&&Number(u.q)===q&&Number(u.r)===r);if(!occ)out.push({q,r,t});}
    return out;
}
function addTransportActions(carrier){
    if(!unitInfo||!carrier?.transport||!playerCanControlUnit(carrier))return;
    const cargo=adjacentFriendlyCargo(carrier), manifest=unitTransportSystem.manifest(carrier), rem=unitTransportSystem.remaining(carrier);
    const box=document.createElement('div');box.className='transport-action-box';box.style.cssText='margin:8px 0;padding:8px;border:1px solid #8c8568;background:rgba(235,229,201,.55)';
    box.innerHTML=`<div style="font-weight:700;margin-bottom:5px">载运操作</div><div style="font-size:12px;margin-bottom:6px">剩余：人员${rem?.personnel??0} / 车辆${rem?.vehicle??0} / 重装${rem?.heavy??0}　已载${manifest.length}个单位</div>`;
    if(cargo.length){const sel=document.createElement('select');sel.style.cssText='max-width:70%;font-family:inherit';for(const u of cargo){const o=document.createElement('option');o.value=u.id;o.textContent=`${unitName(u)}（${u.equipmentName??u.equipmentType??u.type??'部队'}）`;sel.appendChild(o);}const b=document.createElement('button');b.textContent='装载相邻部队';b.style.marginLeft='6px';b.onclick=()=>{const u=units.find(x=>String(x.id)===String(sel.value));if(!u||!unitTransportSystem.embark(carrier,u)){writeBattleMessage('装载失败：舱位不足或单位不符合条件');return;}writeBattleMessage(`${unitName(u)} 已装入 ${unitName(carrier)}`);commandDataLogger.transport({carrier,cargo:u,kind:'EMBARK',scenario:getScenarioConfig(),turnSystem,units});showUnitInfo(carrier);render();};box.append(sel,b);}
    else {const h=document.createElement('div');h.style.fontSize='12px';h.textContent='相邻陆地格没有可装载的友方部队';box.appendChild(h);}
    if(manifest.length){const land=adjacentUnloadHexes(carrier);const sel=document.createElement('select');sel.style.cssText='max-width:70%;font-family:inherit;margin-top:6px';for(const u of manifest){const o=document.createElement('option');o.value=u.id;o.textContent=unitName(u);sel.appendChild(o);}const b=document.createElement('button');b.textContent=land.length?'登陆/卸载':'无可用登陆格';b.disabled=!land.length;b.style.marginLeft='6px';b.onclick=()=>{const pos=adjacentUnloadHexes(carrier)[0];if(!pos)return;const u=unitTransportSystem.disembark(carrier,sel.value,pos.q,pos.r);if(!u)return;const old=units.findIndex(x=>String(x.id)===String(u.id));if(old>=0)units[old]=u;else units.push(u);writeBattleMessage(`${unitName(u)} 从 ${unitName(carrier)} 登陆至 ${pos.q},${pos.r}`);commandDataLogger.transport({carrier,cargo:u,kind:'DISEMBARK',target:pos,scenario:getScenarioConfig(),turnSystem,units});showUnitInfo(carrier);render();};box.append(sel,b);}
    const title=unitInfo.querySelector('.unit-title'); if(title?.nextSibling)unitInfo.insertBefore(box,title.nextSibling); else unitInfo.prepend(box);
}

function showUnitInfo(unit) {
    if (
        !unitInfo ||
        !unit
    ) {
        return;
    }
    const side =
        getUnitSide(
            unit
        );
    const sideName = FactionSystem.getSideName(side) || "未知";
    const name =
        unitName(
            unit
        );
    const type =
        unit.typeZh ??
        unit.type ??
        unit.unitType ??
        "未知";
    const ap =
        unit.movementPoints ??
        unit.actionPoints ??
        unit.ap ??
        "—";
    const maxAP =
        unit.maxMovementPoints ??
        unit.maxActionPoints ??
        unit.maxAP ??
        "—";
    const attackValue =
        combatSystem.getAttack(
            unit
        );
    const defenseValue =
        combatSystem.getDefense(
            unit
        );
    const rangeValue =
        combatSystem.getRange(
            unit
        );
    const active =
        playerCanControlUnit(
            unit
        );
    const isSpecialForcesUnit = String(unit.type ?? unit.unitType ?? "").toLowerCase() === "special_forces";
    const isNavalUnit = unit.naval === true || unit.domain === "naval" || unit.unitClass === "naval";
    if (isNavalUnit) {
        const equipmentName = unit.equipmentName ?? unit.equipmentType ?? unit.equipment?.[0]?.name ?? unit.equipment?.[0]?.type ?? name;
        const navalTypeMap = {carrier:"航空母舰",destroyer:"导弹驱逐舰",escort:"导弹护卫舰",landing:"登陆舰",transport:"勤务/保障舰",submarine:"潜艇"};
        const navalType = navalTypeMap[String(unit.type??"").toLowerCase()] ?? type;
        const transport = unit.transport;
        const sub = unit.submarine;
        unitInfo.classList.remove("special-forces-info");
        unitInfo.innerHTML = `
          <div class="unit-title">${name}</div>
          <div class="unit-row"><span>装备</span><strong>${equipmentName} × ${unit.ships ?? 1}</strong></div>
          <div class="unit-row"><span>舰种</span><strong>${navalType}</strong></div>
          <div class="unit-row"><span>阵营</span><strong>${sideName}</strong></div>
          <div class="unit-row"><span>ID</span><strong>${unit.id}</strong></div>
          <div class="unit-row"><span>行动点</span><strong>${ap} / ${maxAP}</strong></div>
          <div class="unit-row"><span>舰体</span><strong>${Math.round(unit.hull ?? unit.strength ?? 100)} / ${Math.round(unit.maxHull ?? unit.maxStrength ?? 100)}</strong></div>
          <div class="unit-row"><span>弹药 / 燃油</span><strong>${Math.round(unit.ammo ?? 100)}% / ${Math.round(unit.fuel ?? 100)}%</strong></div>
          <div class="unit-row"><span>防空 / 反舰 / 反潜</span><strong>${unit.airDefense ?? 0} / ${unit.antiShip ?? 0} / ${unit.antiSubmarine ?? 0}</strong></div>
          <div class="unit-row"><span>探测</span><strong>${unit.detection ?? 0}</strong></div>
          ${unit.helicopterCapacity ? `<div class="unit-row"><span>舰载航空位</span><strong>${unit.helicopterCapacity}</strong></div>` : ""}
          ${transport ? `<div class="unit-row"><span>运输舱位</span><strong>人员${transport.personnelSlots??0} / 车辆${transport.vehicleSlots??0} / 重装${transport.heavySlots??0} / 坞舱${transport.wellDeckSlots??0}</strong></div>` : ""}
          ${sub?.enabled ? `<div class="unit-row"><span>潜艇状态</span><strong>${sub.defaultMode === "silent" ? "静默潜航" : "潜航"} · 隐蔽 ${unit.stealth??0}</strong></div>` : ""}
          <div class="unit-row"><span>射程</span><strong>${rangeValue}</strong></div>
          <div class="unit-row"><span>位置</span><strong>${unit.q}, ${unit.r}</strong></div>
          <div class="unit-row"><span>状态</span><strong>${active ? "可行动" : "不可行动"}</strong></div>`;
    } else if (isSpecialForcesUnit) {
        // 特战单位使用紧凑信息卡；同时强制继承合成旅步兵的基础野战工程能力。
        unit.engineering = { ...(unit.engineering ?? {}), canEntrench:true, canBuildAA1:true };
        const logistics = unit.modern ? modernLogisticsSystem.summary(unit) : null;
        unitInfo.classList.add("special-forces-info");
        unitInfo.innerHTML = `
            <div class="unit-title">${name}</div>
            <div class="sof-summary-grid">
                <div><span>人员</span><strong>${unit.modern ? `${Math.round(unit.manpower??0)} / ${Math.round(unit.maxManpower??0)}` : getStrengthText(unit)}</strong></div>
                <div><span>行动点</span><strong>${unit.actionPoints ?? "—"} / ${unit.maxActionPoints ?? "—"}</strong></div>
                <div><span>士气</span><strong>${unit.morale ?? "—"}</strong></div>
                <div><span>弹药</span><strong>${Math.round(unit.ammo ?? unit.ammunition ?? 0)}%</strong></div>
                ${unit.modern ? `<div><span>燃油</span><strong>${Math.round(unit.fuel??0)}%</strong></div>` : ""}
                <div><span>状态</span><strong>${active ? "可行动" : "不可行动"}</strong></div>
            </div>
            <div class="sof-combat-line"><span>攻击 <b>${attackValue}</b></span><span>防御 <b>${defenseValue}</b></span><span>射程 <b>${rangeValue}</b></span><span>位置 <b>${unit.q}, ${unit.r}</b></span></div>
            <div class="sof-capabilities"><span>特战能力</span><strong>侦察半径 ${unit.reconRadius??5}格 · 空降作战 · 简易工事 · 一级简易防空</strong></div>
            ${logistics ? `<div class="sof-loss-line">装备 ${logistics.equipment} · 可救治 ${logistics.wounded}人 · 永久损失 ${logistics.permanent}人</div>` : ""}
        `;
    } else {
        unitInfo.classList.remove("special-forces-info");
        unitInfo.innerHTML = `
        <div class="unit-title">
            ${name}
        </div>
        <div class="unit-row">
            <span>指挥官</span>
            <strong class="unit-commander">${unit.commander ?? unit.commanderName ?? "不详"}</strong>
        </div>
        <div class="unit-row">
            <span>隶属</span>
            <strong>${unit.parentFormation ?? unit.parent ?? unit.formation ?? "—"}</strong>
        </div>
        <div class="unit-row">
            <span>ID</span>
            <strong>${unit.id}</strong>
        </div>
        <div class="unit-row">
            <span>阵营</span>
            <strong>${sideName}</strong>
        </div>
        <div class="unit-row">
            <span>兵种</span>
            <strong>${type}</strong>
        </div>
        <div class="unit-row">
            <span>编制</span>
            <strong>${unit.echelon ?? "—"}</strong>
        </div>
        <div class="unit-row">
            <span>行动点</span>
            <strong>${ap} / ${maxAP}</strong>
        </div>
        <div class="unit-row">
            <span>${unit.modern ? "人员" : "兵力"}</span>
            <strong>${unit.modern ? `${Math.round(unit.manpower??0)} / ${Math.round(unit.maxManpower??0)}人` : getStrengthText(unit)}</strong>
        </div>
        ${usesModernLogistics(unit) ? `<div class="unit-row"><span>装备</span><strong>${Array.isArray(unit.equipment)&&unit.equipment.length ? unit.equipment.map(e=>`${e.name??e.type} ${e.operational??e.current??e.count??0}/${e.initial??e.max??e.count??0}`).join("；") : modernLogisticsSystem.summary(unit).equipment}</strong></div><div class="unit-row"><span>弹药</span><strong>${Math.round(unit.ammo ?? unit.ammunition ?? 0)} / ${Math.round(unit.maxAmmo ?? 100)}</strong></div><div class="unit-row"><span>油料</span><strong>${unit.movementClass === "foot" ? "—（徒步单位）" : `${Math.round(unit.fuel??0)} / ${Math.round(unit.maxFuel??100)}`}</strong></div><div class="unit-row"><span>伤员</span><strong>可救治 ${modernLogisticsSystem.summary(unit).wounded}人 / 永久损失 ${modernLogisticsSystem.summary(unit).permanent}人</strong></div>` : ""}
        ${engineerSystem.isEngineer(unit) ? (()=>{const k=engineerSystem.ensureEngineerKits(unit);return `<div class="unit-row"><span>工兵套件</span><strong>${k.current} / ${k.max} 套</strong></div>`;})() : ""}
        <div class="unit-row">
            <span>攻击</span>
            <strong>${attackValue}</strong>
        </div>
        <div class="unit-row">
            <span>防御</span>
            <strong>${defenseValue}</strong>
        </div>
        <div class="unit-row">
            <span>射程</span>
            <strong>${rangeValue}</strong>
        </div>
        <div class="unit-row">
            <span>攻击状态</span>
            <strong>
                ${
                    unit.hasAttacked
                        ? "本阶段已攻击"
                        : "可攻击"
                }
            </strong>
        </div>
        <div class="unit-row">
            <span>士气</span>
            <strong>${unit.morale ?? "—"}</strong>
        </div>
        <div class="unit-row">
            <span>压制</span>
            <strong>${unit.suppression ?? "—"}</strong>
        </div>
        <div class="unit-row">
            <span>疲劳</span>
            <strong>${unit.fatigue ?? "—"}</strong>
        </div>
        ${!usesModernLogistics(unit) ? `<div class="unit-row"><span>弹药</span><strong>${Math.round(unit.ammo ?? unit.ammunition ?? 0)} / ${Math.round(unit.maxAmmo ?? 100)}</strong></div>` : ""}
        ${unit.logisticsStock ? `<div class="unit-row"><span>保障库存</span><strong>弹${Math.round(unit.logisticsStock.ammo)} / 油${Math.round(unit.logisticsStock.fuel)} / 备件${Math.round(unit.logisticsStock.parts)}</strong></div>`:""}
        <div class="unit-row">
            <span>位置</span>
            <strong>${unit.q}, ${unit.r}</strong>
        </div>
        <div class="unit-row">
            <span>状态</span>
            <strong>
                ${
                    active
                        ? "可行动"
                        : "不可行动"
                }
            </strong>
        </div>
    `;
    }
    // v1.2.1：所有特战小组都拥有彼此独立的空降资格。
    // 不再依赖某个模板是否漏写 airDroppable；一支小队完成空降不会影响其他小队。
    if (isSpecialForcesUnit) {
        unit.airDroppable = true;
        unit.airborneCapable = true;
        if (typeof unit.airDropUsed !== "boolean") unit.airDropUsed = false;
    }
    if ((unit.airDroppable || isSpecialForcesUnit) && playerCanControlUnit(unit)) {
        const used = unit.airDropUsed === true;
        const airDropAction = document.createElement("div");
        airDropAction.className = "special-airdrop-action";
        airDropAction.innerHTML = `<div class="special-airdrop-summary"><span>特战任务</span><strong>侦察半径 ${unit.reconRadius??5}格 · 多域作战</strong></div><button id="specialAirDropButton" type="button" ${used ? "disabled" : ""}>${used ? "本小组已完成空降" : "空降至指定位置"}</button>`;
        const title = unitInfo.querySelector(".unit-title");
        if (title?.nextSibling) unitInfo.insertBefore(airDropAction, title.nextSibling);
        else unitInfo.prepend(airDropAction);
        airDropAction.querySelector("#specialAirDropButton")?.addEventListener("click",()=>beginSpecialAirDrop(unit));
    }
    if (isNavalUnit && unit.transport) addTransportActions(unit);
    if (lastBattleMessage) {
        unitInfo.insertAdjacentHTML(
            "beforeend",
            `<hr><div class="battle-message" role="status" aria-live="polite"></div>`
        );
        const messageBox = unitInfo.querySelector(".battle-message");
        if (messageBox) messageBox.textContent = lastBattleMessage;
    }
}
// ============================================================
// 计算移动范围
// ============================================================
function calculateReachable(unit) {
    clearReachable();
    if (
        !unit ||
        !isUnitAlive(unit)
    ) {
        return;
    }
    movementSystem.selectUnit(
        unit,
        units
    );
    if (
        typeof renderer.setReachable ===
        "function"
    ) {
        renderer.setReachable(
            movementSystem.reachable
        );
    }
}
// ============================================================
// 选择单位
// ============================================================
function selectUnit(unit) {
    if (selectedUnit && unit && selectedUnit !== unit) { pendingEngineeringAction=null; pendingEngineeringUnitId=null; }
    if (
        !unit ||
        !isUnitAlive(unit)
    ) {
        return;
    }
    selectedUnit =
        unit;
    if (
        typeof selection.select ===
        "function"
    ) {
        selection.select(
            unit
        );
    }
    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(
            unit
        );
    }
    showUnitInfo(
        unit
    );
    if (
        playerCanControlUnit(
            unit
        )
    ) {
        calculateReachable(
            unit
        );
    }
    else {
        clearReachable();
    }
    render();
}
// ============================================================
// 查找 Hex 上的存活单位
// ============================================================
function unitAtHex(
    q,
    r
) {
    return (
        units.find(
            unit =>
                isUnitAlive(unit) &&
                Number(unit.q) ===
                Number(q) &&
                Number(unit.r) ===
                Number(r)
        ) ?? null
    );
}
// ============================================================
// 屏幕 -> 世界坐标
// ============================================================
function screenToWorld(
    screenX,
    screenY
) {
    const zoom =
        camera.zoom ?? 1;
    const offsetX =
        camera.x ??
        camera.offsetX ??
        0;
    const offsetY =
        camera.y ??
        camera.offsetY ??
        0;
    return {
        x:
            (
                screenX -
                offsetX
            ) / zoom,
        y:
            (
                screenY -
                offsetY
            ) / zoom
    };
}
// ============================================================
// 鼠标 -> Hex
// ============================================================
function mouseToHex(event) {
    const rect =
        canvas.getBoundingClientRect();
    const mouseX =
        event.clientX -
        rect.left;
    const mouseY =
        event.clientY -
        rect.top;
    const worldPosition =
        screenToWorld(
            mouseX,
            mouseY
        );
    const hexSize =
        renderer.hexSize ??
        renderer.size ??
        18;
    const flatHex = pixelToHex(worldPosition.x, worldPosition.y, hexSize);

    // v0.4.0 立体沙盘点击反算：高程会改变屏幕上的顶面位置，
    // 因此在平面估算点附近搜索“视觉中心”离鼠标最近的六角格。
    if (renderer?.view25D?.enabled && flatHex) {
        let best = flatHex;
        let bestD = Infinity;
        const radius = 7;
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dq = -radius; dq <= radius; dq++) {
                const q = Number(flatHex.q) + dq, r = Number(flatHex.r) + dr;
                if (q < 0 || r < 0 || q >= world.width || r >= world.height) continue;
                const p = renderer.worldToScreen(q, r);
                const d = Math.hypot(mouseX - p.x, mouseY - p.y);
                if (d < bestD) { bestD = d; best = { q, r }; }
            }
        }
        if (bestD <= hexSize * (camera.zoom ?? 1) * 1.08) return best;
    }
    return flatHex;
}
// ============================================================
// 点击单位检测
// ============================================================
function findUnitAtMouse(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoom = Number(camera.zoom ?? 1);

    // v0.4.3：算子选择以“实际绘制位置”为第一优先级。
    // 这与 Renderer.drawUnits() 使用同一个 worldToScreen()，因此兼容：
    // 2D/立体沙盘、高程抬升、缩放、拖动、水面浮渡、空降后的单位。
    // 不再先用平面 Hex 反算来决定单位，否则高程较大时会误选相邻格或完全点不中。
    const baseW = zoom < 0.72 ? 26 : (zoom < 1.18 ? 32 : 36);
    const baseH = zoom < 0.72 ? 18 : (zoom < 1.18 ? 22 : 25);
    const halfW = Math.max(14, baseW * zoom * 0.62);
    const halfH = Math.max(11, baseH * zoom * 0.72);

    let bestUnit = null;
    let bestScore = Infinity;
    // 逆序：与后绘制算子优先命中的直觉一致。
    for (let i = units.length - 1; i >= 0; i--) {
        const candidate = units[i];
        if (!candidate || candidate.offMap === true || !isUnitAlive(candidate)) continue;
        if (candidate.q === undefined || candidate.r === undefined) continue;

        const p = renderer.worldToScreen(Number(candidate.q), Number(candidate.r));
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
            // 椭圆归一化距离；重叠时选择鼠标最接近中心的算子。
            const score = (dx * dx) / (halfW * halfW) + (dy * dy) / (halfH * halfH);
            if (score < bestScore) {
                bestScore = score;
                bestUnit = candidate;
            }
        }
    }
    if (bestUnit) return bestUnit;

    // 没点到算子时才回退到 Hex，用于移动、攻击、工程、空降等地块操作。
    const hex = mouseToHex(event);
    if (!hex) return null;
    return unitAtHex(hex.q, hex.r);
}
// ============================================================
// 玩家移动
// ============================================================
function tryMoveSelectedUnit(
    q,
    r
) {
    if (
        !selectedUnit ||
        !playerCanControlUnit(
            selectedUnit
        )
    ) {
        return false;
    }
    // ========================================================
    // 一格一单位
    // ========================================================
    const occupyingUnit =
        unitAtHex(
            q,
            r
        );
    if (
        occupyingUnit &&
        occupyingUnit !==
        selectedUnit
    ) {
        console.log(
            `[移动] Hex (${q}, ${r}) 已被 ${unitName(occupyingUnit)} 占据`
        );
        return false;
    }
    if (
        !movementSystem.canMoveTo(
            q,
            r,
            units
        )
    ) {
        return false;
    }
    undoSystem.push({ units, turnSystem, gameOver }, `移动：${unitName(selectedUnit)}`);
    const moveResult =
        movementSystem.moveTo(
            q,
            r,
            units
        );
    if (
        !moveResult ||
        moveResult.success === false
    ) {
        undoSystem.discardLast();
        return false;
    }
    // 只有这里才是玩家鼠标/触控发出的移动命令。底层 MovementSystem 同时服务 AI，
    // 因此玩家日志在此按 GameState 的实际控制阵营输出。
    console.log(`[玩家][${factionLabel(getPlayerSide())}] 移动 ${selectedUnit?.id ?? unitName(selectedUnit)} → (${q}, ${r})`);
    commandDataLogger.move({unit:selectedUnit,from:moveResult.from,to:moveResult.to,cost:moveResult.cost,path:moveResult.path,scenario:getScenarioConfig(),turnSystem,units});
    if (usesModernLogistics(selectedUnit)) {
        const fuelResult=modernLogisticsSystem.consumeMove(selectedUnit, 1);
        if(selectedUnit.fuel<=0) writeBattleMessage(`${unitName(selectedUnit)} 燃油耗尽，需进入保障范围补给`);
    }
    pendingEngineeringAction=null; pendingEngineeringUnitId=null;
    selectedUnit =
        moveResult.unit ??
        selectedUnit;
    if (
        typeof selection.select ===
        "function"
    ) {
        selection.select(
            selectedUnit
        );
    }
    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(
            selectedUnit
        );
    }
    if (
        typeof renderer.setReachable ===
        "function"
    ) {
        renderer.setReachable(
            movementSystem.reachable
        );
    }
    selectedHex = { q:Number(selectedUnit.q), r:Number(selectedUnit.r) };
    hexInfoPanel.show(selectedHex.q, selectedHex.r);
    refreshEngineerActions();
    showUnitInfo(
        selectedUnit
    );
    render();
    updateSaveControls();
    // 占领战略目标后立即检查胜利，不必等待结束回合。
    if (!gameOver) checkVictory();
    return true;
}
// ============================================================
// 战斗消息
// ============================================================
function writeBattleMessage(
    message
) {
    lastBattleMessage = String(message ?? "");
    console.log(
        "[战斗]",
        lastBattleMessage
    );
    if (unitInfo) {
        const existing = unitInfo.querySelector(".battle-message");
        if (existing) {
            existing.textContent = lastBattleMessage;
        } else {
            unitInfo.insertAdjacentHTML(
                "beforeend",
                `<hr><div class="battle-message" role="status" aria-live="polite"></div>`
            );
            const messageBox = unitInfo.querySelector(".battle-message");
            if (messageBox) messageBox.textContent = lastBattleMessage;
        }
    }
}
// ============================================================
// 死亡单位处理
// ============================================================
function echelonZh(unit){
    const e=String(unit?.echelon??'').toLowerCase();
    const map={team:'小队',squad:'班',platoon:'排',company:'连',battalion:'营',regiment:'团',brigade:'旅',division:'师',corps:'军',army:'集团军'};
    if(String(unit?.faction??unit?.side)==='japanese'){const j={company:'中队',battalion:'大队',regiment:'联队',brigade:'旅团',division:'师团',corps:'军',army:'方面军'};return j[e]??map[e]??(unit?.echelon??'未知');}
    return map[e]??(unit?.echelon??'未知');
}
function isCommandUnit(unit){return unit?.isCommandUnit===true||String(unit?.type??unit?.unitType??'').toLowerCase()==='hq'||/司令部|指挥部|师部|军部/.test(String(unit?.name??''));}
function commandLevelZh(unit){
    const e=String(unit?.commandLevel??unit?.echelon??'').toLowerCase();
    const map={regiment:'团指',brigade:'旅指',division:'师指',corps:'军指',army:'集团军司令部','army_group':'集团军群司令部',front:'方面军司令部'};
    return map[e]??`${echelonZh(unit)}指`;
}
function resetCasualtyState(){
    casualtyState.sides={};
    for(const u of units){
        u._casualtyLastStrength=Math.max(0,Number(u.strength??u.manpower??0));
        u._casualtyDestroyedRecorded=!!u.destroyed;
        u._casualtyCommittedRecorded=false;
        if(u.offMap!==true) ensureCommitted(u);
    }
}
function casualtySide(side){return casualtyState.sides[side]??(casualtyState.sides[side]={losses:0,committed:0,destroyed:{},commandDestroyed:{},commandNames:[]});}
function ensureCommitted(unit){if(!unit||unit.offMap===true||unit._casualtyCommittedRecorded)return;const s=casualtySide(getUnitSide(unit));s.committed+=Math.max(0,Number(unit.maxStrength??unit.maxManpower??unit.strength??unit.manpower??0));unit._casualtyCommittedRecorded=true;}
function recordCasualtyDelta(unit){
    if(!unit)return; ensureCommitted(unit); if(unit.offMap===true)return;
    const now=Math.max(0,Number(unit.strength??unit.manpower??0));
    const prev=Number.isFinite(Number(unit._casualtyLastStrength))?Number(unit._casualtyLastStrength):now;
    if(now<prev) casualtySide(getUnitSide(unit)).losses+=Math.round(prev-now);
    unit._casualtyLastStrength=now;
    if((unit.destroyed===true||now<=0)&&!unit._casualtyDestroyedRecorded){
        const s=casualtySide(getUnitSide(unit));
        // v1.1.5: 指挥机构单独分类，绝不再同时计入普通“营/连”损失。
        if(isCommandUnit(unit)){
            const cz=commandLevelZh(unit);
            s.commandDestroyed[cz]=(s.commandDestroyed[cz]??0)+1;
            s.commandNames.push(String(unit.name??unit.id??cz));
        }else{
            const z=echelonZh(unit);
            s.destroyed[z]=(s.destroyed[z]??0)+1;
        }
        unit._casualtyDestroyedRecorded=true;
    }
}
function casualtyRatioText(){
    const entries=Object.entries(casualtyState.sides);
    if(entries.length<2)return '暂无';
    const [a,b]=entries;
    const al=Math.max(0,Number(a[1].losses||0)), bl=Math.max(0,Number(b[1].losses||0));
    if(al===0&&bl===0)return '0 : 0';
    if(al===0)return `0 : ${bl}`;
    return `1 : ${(bl/al).toFixed(2)}`;
}
function renderCasualtyPanel(){
    const panel=document.getElementById('casualtyPanel');if(!panel)return;const sides=Object.entries(casualtyState.sides);
    if(!sides.length){panel.innerHTML='<h3>战损统计</h3><div class="hint">暂无战损</div>';return;}
    const ratio=sides.length>=2?`<div class="casualty-ratio"><b>战损比：</b>${factionLabel(sides[0][0])||sides[0][0]} : ${factionLabel(sides[1][0])||sides[1][0]} = ${casualtyRatioText()}</div>`:'';
    panel.innerHTML='<h3>战损统计</h3>'+ratio+sides.map(([side,s])=>{
        const rate=s.committed>0?(s.losses/s.committed*100):0;
        const current=Math.max(0,s.committed-s.losses);
        const kills=Object.entries(s.destroyed).filter(([,n])=>n>0).map(([e,n])=>`${e}×${n}`).join(' · ')||'无';
        const cmd=Object.entries(s.commandDestroyed).filter(([,n])=>n>0).map(([e,n])=>`${e}×${n}`).join(' · ')||'无';
        const names=s.commandNames.length?`<div class="casualty-command-names">${s.commandNames.map(x=>`• ${x}`).join('<br>')}</div>`:'';
        return `<div class="casualty-side"><strong>${factionLabel(side)||side}</strong><div>累计投入：${s.committed}</div><div>当前有效兵力：${current}</div><div>累计损失：${s.losses} <b>（${rate.toFixed(1)}%）</b></div><div>作战单位损失：${kills}</div><div class="casualty-command"><b>指挥机构损失：</b>${cmd}${names}</div></div>`;
    }).join('');
}
function syncCasualties(){for(const u of units)recordCasualtyDelta(u);renderCasualtyPanel();}
function removeDestroyedUnits() {
    for (const unit of units) {
        if (!unit) {
            continue;
        }
        // --------------------------------------------------------
        // 同时读取 strength / manpower
        //
        // CombatSystem 的不同版本可能修改其中任意一个字段，
        // 因此不能再只依赖 manpower ?? strength。
        // --------------------------------------------------------
        const strengthValue =
            Number(unit.strength);
        const manpowerValue =
            Number(unit.manpower);
        const strengthDead =
            Number.isFinite(strengthValue) &&
            strengthValue <= 0;
        const manpowerDead =
            Number.isFinite(manpowerValue) &&
            manpowerValue <= 0;
        // --------------------------------------------------------
        // 任意一套兵力系统确认单位死亡，就统一判定阵亡
        // --------------------------------------------------------
        const dead =
            unit.destroyed === true ||
            strengthDead ||
            manpowerDead;
        if (!dead) {
            continue;
        }
        // --------------------------------------------------------
        // 统一死亡状态
        // --------------------------------------------------------
        unit.strength = 0;
        unit.manpower = 0;
        unit.destroyed = true;
        unit.movementPoints = 0;
        unit.actionPoints = 0;
        unit.hasAttacked = true;
        console.log(
            `[单位系统] ${unit.id} 已被消灭，停止显示与行动`
        );
        // --------------------------------------------------------
        // 如果当前选中的正好是阵亡单位
        // --------------------------------------------------------
        if (
            selectedUnit === unit ||
            (
                selectedUnit?.id &&
                unit.id &&
                selectedUnit.id === unit.id
            )
        ) {
            selectedUnit = null;
        }
    }
    // ------------------------------------------------------------
    // 清除死亡单位选择状态
    // ------------------------------------------------------------
    if (
        selectedUnit &&
        !isUnitAlive(selectedUnit)
    ) {
        clearSelection();
    }
    // ------------------------------------------------------------
    // 阵亡单位继续保留在 units 中。
    // VictorySystem 的 HQ 全灭判定仍然需要这些数据。
    // ------------------------------------------------------------
    gameState.units = units;
    syncCasualties();
}
// ============================================================
// 胜负检查
// ============================================================
// ============================================================
// 战役结束弹窗
// ============================================================
function battleResultSummary(result){
    const player=normalizeSide(getPlayerSide());
    const winner=normalizeSide(result?.winner);
    const victory=winner && winner!=='draw' && winner===player;
    const defeat=winner && winner!=='draw' && winner!==player;
    const objectives=(scenario?.strategicObjectives?.[player]??[]);
    let primaryTotal=0,primaryDone=0,totalDone=0;
    for(const o of objectives){
        const done=units.some(u=>isUnitAlive(u)&&getUnitSide(u)===player&&u.offMap!==true&&Math.abs(Number(u.q)-Number(o.q))<=Number(o.controlRadius??0)&&Math.abs(Number(u.r)-Number(o.r))<=Number(o.controlRadius??0));
        if(done)totalDone++; if(String(o.priority??'secondary').toLowerCase()==='primary'){primaryTotal++;if(done)primaryDone++;}
    }
    return {player,winner,victory,defeat,primaryTotal,primaryDone,totalDone,total:objectives.length};
}
function saveCampaignProgress(result){
    try{
        const key=String(currentScenarioKey??scenario?.id??scenario?.key??'unknown');
        const summary=battleResultSummary(result); const turn=Number(turnSystem?.turn??1);
        const all=JSON.parse(localStorage.getItem('frontline_campaign_progress')||'{}');
        const prev=all[key]??{};
        all[key]={...prev,lastResult:summary.victory?'victory':summary.defeat?'defeat':'draw',completed:summary.victory||prev.completed===true,bestTurn:summary.victory?Math.min(Number(prev.bestTurn??Infinity),turn):(prev.bestTurn??null),completedObjectives:summary.totalDone,totalObjectives:summary.total,updatedAt:new Date().toISOString()};
        localStorage.setItem('frontline_campaign_progress',JSON.stringify(all));
    }catch(err){console.warn('[战役进度] 保存失败',err);}
}
function destroyBattleResultUI(){
    document.getElementById('victory-modal')?.remove();
    document.getElementById('post-battle-return')?.remove();
}
function returnToCampaignMenuAfterBattle(){
    // 无论从结算窗口还是战后观察模式退出，都彻底清除战役结束 UI。
    destroyBattleResultUI();
    postBattleViewing = false;
    campaignSelection.onMainMenu=()=>showMainMenu();
    campaignSelection.onReturnToBattle=null;
    campaignSelection.hasActiveBattle=false;
    if(campaignSelection.phase) campaignSelection.renderScenarios();
    else showScenarioSelection();
}
function enterPostBattleView(){
    // “查看战场”必须真正关闭/销毁结算窗口，而不是仅隐藏。
    document.getElementById('victory-modal')?.remove();
    postBattleViewing = true;
    document.getElementById('post-battle-return')?.remove();

    // gameOver 保持 true：允许查看单位/地图，但移动、攻击、工程、支援、结束回合均继续锁定。
    if (endPhaseButton) endPhaseButton.disabled = true;
    clearReachable();

    const btn=document.createElement('button');
    btn.id='post-battle-return';
    btn.type='button';
    btn.innerHTML='<span class="post-battle-status">战役已结束</span><span class="post-battle-exit">退出战役</span>';
    Object.assign(btn.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'99990',padding:'10px 18px',border:'1px solid #4d4b40',background:'#d6cfb2',color:'#24251f',font:'16px FangSong, STFangsong, SimSun, serif',cursor:'pointer',boxShadow:'0 4px 18px rgba(0,0,0,.3)',display:'flex',alignItems:'center',gap:'14px'});
    btn.querySelector('.post-battle-status').style.opacity='.7';
    btn.querySelector('.post-battle-exit').style.fontWeight='700';
    btn.onclick=returnToCampaignMenuAfterBattle;
    document.body.appendChild(btn);
    render();
}
function showVictoryModal(result) {
    postBattleViewing = false;
    syncCasualties(); saveCampaignProgress(result);
    if (!document.getElementById('victory-modal-style')) {const style=document.createElement('style');style.id='victory-modal-style';style.textContent=`#victory-modal{position:fixed;inset:0;z-index:100000;font-family:FangSong,STFangsong,SimSun,serif}#victory-modal .victory-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(18,20,17,.76)}#victory-modal .victory-window{width:min(620px,calc(100vw - 48px));padding:32px 38px;border:2px solid #5a5646;outline:1px solid #c6b98b;outline-offset:-8px;background:#d6cfb2;color:#24251f;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.48)}#victory-modal .victory-title{font-size:44px;font-weight:700;letter-spacing:.12em}#victory-modal .victory-reason{margin:16px 0;line-height:1.6}#victory-modal .victory-details{margin:18px auto;max-width:450px;border-top:1px solid #77715d;border-bottom:1px solid #77715d;padding:10px 0}.victory-detail-row{display:flex;justify-content:space-between;padding:5px}.victory-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}.victory-button{min-width:160px;padding:10px 18px;border:1px solid #4d4b40;background:#666754;color:#f0ecd9;font:inherit;cursor:pointer}`;document.head.appendChild(style);}
    document.getElementById('victory-modal')?.remove();
    const summary=battleResultSummary(result); const turn=Number(turnSystem?.turn??1);
    const title=summary.victory?'战役胜利':summary.defeat?'战役失败':'战斗结束';
    const sides=Object.entries(casualtyState.sides); const ratio=sides.length>=2?`${factionLabel(sides[0][0])||sides[0][0]} : ${factionLabel(sides[1][0])||sides[1][0]} = ${casualtyRatioText()}`:'暂无';
    const cmdLoss=sides.map(([side,x])=>`${factionLabel(side)||side}：${Object.entries(x.commandDestroyed).map(([k,n])=>`${k}×${n}`).join('、')||'无'}`).join('；');
    const modal=document.createElement('div');modal.id='victory-modal';modal.innerHTML=`<div class="victory-overlay"><div class="victory-window"><div class="victory-title">${title}</div><div class="victory-reason">${result?.reason??'战役已经结束'}</div><div class="victory-details"><div class="victory-detail-row"><span>战役回合</span><strong>第${turn}回合</strong></div><div class="victory-detail-row"><span>主要目标</span><strong>${summary.primaryDone}/${summary.primaryTotal}</strong></div><div class="victory-detail-row"><span>全部目标</span><strong>${summary.totalDone}/${summary.total}</strong></div><div class="victory-detail-row"><span>战损比</span><strong>${ratio}</strong></div><div class="victory-detail-row"><span>指挥机构损失</span><strong>${cmdLoss}</strong></div></div><div class="victory-actions"><button class="victory-button" id="victory-view">查看战场</button><button class="victory-button" id="victory-menu">返回战役菜单</button></div></div></div>`;document.body.appendChild(modal);
    modal.querySelector('#victory-view').onclick=enterPostBattleView;
    modal.querySelector('#victory-menu').onclick=returnToCampaignMenuAfterBattle;
}
function checkVictory() {
    // 综合测试场永不触发历史胜负，保证每个版本都可无限结束回合测试。
    const __cfg = getScenarioConfig?.() ?? {};
    const __sid = String(scenario?.id ?? scenario?.key ?? gameState?.scenarioKey ?? "");
    if (__sid === "system_test_range" || scenario?.specialRules?.disableVictory === true || __cfg?.specialRules?.disableVictory === true) {
        gameOver = false;
        if (endPhaseButton) endPhaseButton.disabled = false;
        return false;
    }

    if (
        gameOver ||
        !victorySystem
    ) {
        return gameOver;
    }
    // 清除兵力为 0 / 已摧毁的单位，确保地图和判定同步
  // ============================================================
// 胜负检查时必须保留阵亡单位
// HQ 全灭判定需要知道哪些指挥单位已经被摧毁
// ============================================================
gameState.units =
    units;
    const result =
        victorySystem.check(
            units,
            {
                turn: turnSystem?.turn ?? 1,
                phase: normalizeSide(turnSystem?.phase ?? getScenarioConfig().start.startingPhase),
                playerSide: getPlayerSide(),
                // 使用右侧战略目标面板已经确认的状态作为玩家侧胜利判定唯一事实源。
                // 防止 UI 已完成而 VictorySystem 的独立巩固计时尚未同步。
                objectiveStates: strategicObjectives?.getObjectiveStates?.() ?? {},
                scenario,
                year: turnSystem?.year ?? 1941,
                month: turnSystem?.month ?? 6,
                day: turnSystem?.day ?? 26,
                hour: turnSystem?.hour ?? 8,
                minute: turnSystem?.minute ?? 0
            }
        );
    if (!result.gameOver) {
        return false;
    }
    gameOver = true;
    clearSelection();
    const winnerText = result.winner ? `${FactionSystem.getSideName(result.winner)}胜利` : "战斗结束";
    if (unitInfo) {
        unitInfo.innerHTML = `
            <div class="unit-title">
                战斗结束
            </div>
            <div class="unit-row">
                <strong>
                    ${winnerText}
                </strong>
            </div>
            <div class="unit-row">
                <span>
                    ${result.reason ?? ""}
                </span>
            </div>
        `;
    }
    if (turnInfo) {
        turnInfo.textContent =
            winnerText;
    }
    if (endPhaseButton) {
        endPhaseButton.disabled =
            true;
    }
    console.log(
        "========================================"
    );
    console.log(
        `[胜负系统] ${winnerText}`
    );
    console.log(
        `[胜负系统] ${result.reason ?? ""}`
    );
    console.log(
        "========================================"
    );
    render();
    // 胜负确认后显示中央弹窗。
    // units 不删除阵亡单位，因此 HQ 全灭判定仍保留完整历史状态。
    showVictoryModal(result);
    return true;
}
function modernLossText(result) {
    const loss=result?.modernLoss;
    if(!loss) return "";
    const eq=(loss.equipmentLosses??[]).filter(e=>(e.before??0)!==(e.after??0)).map(e=>`${e.name} ${e.before}→${e.after}（轻修+${e.minor||0} / 中修+${e.medium||0} / 重修+${e.heavy||0} / 损毁+${e.destroyed||0}）`).join("；");
    return `；人员 ${loss.beforeManpower}→${loss.afterManpower}（可救治伤员+${loss.recoverable||0}，永久损失+${loss.permanent||0}）${eq?`；装备 ${eq}`:""}`;
}
// ============================================================
// 玩家攻击
// ============================================================
function performAttack(
    attacker,
    defender,
    {
        ai = false
    } = {}
) {
    if (
        gameOver ||
        !attacker ||
        !defender ||
        !isUnitAlive(attacker) ||
        !isUnitAlive(defender)
    ) {
        return false;
    }
    if (
        !combatSystem.canAttack(
            attacker,
            defender
        )
    ) {
        return false;
    }
    if (!ai) {
        undoSystem.push({ units, turnSystem, gameOver }, `攻击：${unitName(attacker)}`);
    }
    const result =
        combatSystem.attack(
            attacker,
            defender
        );
    if (
        !result?.success
    ) {
        if (!ai) undoSystem.discardLast();
        writeBattleMessage(
            result?.reason ??
            "攻击失败"
        );
        return false;
    }
    if (!ai) commandDataLogger.attack({attacker,defender,result,scenario:getScenarioConfig(),turnSystem,units});
    if (usesModernLogistics(attacker)) {
        // 战损已由 CombatSystem 统一结算到人员 + 实际装备；这里只消耗攻击方弹药。
        modernLogisticsSystem.consumeAttack(attacker);
        result.afterStrength = defender.strength;
        result.destroyed = defender.destroyed===true || defender.strength<=0;
    } else {
        // 历史战役沿用抽象兵力。
        defender.manpower = Math.max(0, Number(defender.strength ?? result.afterStrength ?? 0));
    }
    const sideLabel = FactionSystem.getSideName(getUnitSide(attacker));
    const prefix =
        ai
            ? `${sideLabel} AI：`
            : "";
    const destroyedText =
        result.destroyed
            ? "，目标被消灭"
            : "";
    writeBattleMessage(
        `${prefix}${unitName(attacker)} 攻击 ${unitName(defender)}，` +
        `造成 ${result.damage} 点损失 ` +
        `（${result.beforeStrength}/${getUnitMaxStrength(defender)} → ` +
        `${result.afterStrength}/${getUnitMaxStrength(defender)}）` +
        modernLossText(result) +
        destroyedText
    );
    removeDestroyedUnits();
    // 攻击后立即同步当前被查看单位的数据与右侧信息栏。
    if (selectedUnit) {
        const refreshedSelected = units.find(
            (u) => u === selectedUnit || (u.id && u.id === selectedUnit.id)
        );
        if (refreshedSelected && isUnitAlive(refreshedSelected)) {
            selectedUnit = refreshedSelected;
            showUnitInfo(refreshedSelected);
        } else if (!isUnitAlive(selectedUnit)) {
            clearSelection();
        }
    }
    // 强制重绘，确保地图兵力标签立即反映战损。
    render();
    if (
        !checkVictory()
    ) {
        if (
            selectedUnit &&
            isUnitAlive(
                selectedUnit
            )
        ) {
            showUnitInfo(
                selectedUnit
            );
            calculateReachable(
                selectedUnit
            );
        }
        render();
    }
    updateSaveControls();
    return true;
}
// ============================================================
// 阵营阶段重置
// ============================================================
function resetFactionForPhase(
    faction
) {
    movementSystem.resetFaction?.(
        units,
        faction
    );
    combatSystem.resetFaction?.(
        units,
        faction
    );
}
// ============================================================
// 延时
// ============================================================
function sleep(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}
// ============================================================
// AI 航空支援：敌方使用自己的卡组；只受剩余使用次数限制
// ============================================================
function runAIAirSupport(side) {
    const cards = airSupportSystem.available(side).filter(c=>c.availability?.ok!==false);
    if (!cards.length) return null;
    const own=units.filter(u=>isUnitAlive(u)&&getUnitSide(u)===side);
    const enemy=units.filter(u=>isUnitAlive(u)&&getUnitSide(u)!==side);
    if(!enemy.length)return null;
    const scoreTarget=(u)=>{
        const t=String(u.type??u.unitType??'').toLowerCase();
        const command=/hq|headquarters|command/.test(t)||/司令|指挥部|团部/.test(String(u.name??''));
        const dense=enemy.reduce((n,e)=>n+(combatSystem.getDistance(u,e)<=2?1:0),0);
        return (command?80:0)+dense*8+Number(u.strength??0)/20;
    };
    const target=[...enemy].sort((a,b)=>scoreTarget(b)-scoreTarget(a))[0];
    const ownTarget=[...own].sort((a,b)=>Number(a.strength??0)-Number(b.strength??0))[0];
    // 每个 AI 阶段最多执行一次航空任务，防止一回合瞬间清空整副卡组。
    const priority=[...cards].sort((a,b)=>{const w=x=>x.missionType==='cap'?60:x.missionType==='recon'?50:x.missionType==='supply'?25:70;return w(b)-w(a);});
    for(const c of priority){
        const tgt=c.missionType==='supply'?(ownTarget??target):target;
        const result=airSupportSystem.execute(side,c.id,{q:tgt.q,r:tgt.r});
        if(result?.ok){writeBattleMessage(`${FactionSystem.getSideName(side)} AI航空兵：${c.name} 已出动（剩余 ${airSupportSystem.state?.[side]?.cards?.[c.id]??0} 次）`);return result;}
    }
    return null;
}

// ============================================================
// AI 阶段
// ============================================================
async function runAIPhase() {
    if (
        aiRunning ||
        gameOver ||
        !turnSystem ||
        String(gameState.mode).toLowerCase() === "developer"
    ) {
        return;
    }
    const currentSide =
        normalizeSide(
            turnSystem.phase
        );
    const playerSide =
        getPlayerSide();
    if (
        !currentSide ||
        currentSide ===
        playerSide
    ) {
        return;
    }
    undoSystem.clear();
    aiRunning =
        true;
    if (endPhaseButton) {
        endPhaseButton.disabled =
            true;
    }
    try {
        resetFactionForPhase(
            currentSide
        );
        const aiUnits =
            units.filter(
                unit =>
                    getUnitSide(unit) ===
                        currentSide &&
                    isUnitAlive(unit)
            );
        const passiveAI = String(getScenarioConfig()?.aiMode ?? scenario?.aiMode ?? "").toLowerCase() === "passive";
        const sideLabel = `${FactionSystem.getSideName(currentSide)} AI`;
        // 综合测试场使用被动 AI：敌军保留在地图上用于射程、工事、战斗等测试，
        // 但不会自行移动或攻击；其阶段仍会自动结束，避免测试流程卡死。
        const unitsToAct = passiveAI ? [] : aiUnits;
        if (!passiveAI) { try { runAIAirSupport(currentSide); } catch(e) { console.warn('[AI航空] 跳过本阶段航空行动',e); } }
        for (
            const unit
            of unitsToAct
        ) {
            if (gameOver) {
                break;
            }
            if (
                !isUnitAlive(
                    unit
                )
            ) {
                continue;
            }
            const result =
                aiSystem.actUnit(
                    unit,
                    units
                );
            if (
                result?.type ===
                    "attack" &&
                result.result?.success
            ) {
                const combat =
                    result.result;
                writeBattleMessage(
                    `${sideLabel}：${unitName(combat.attacker)} 攻击 ${unitName(combat.defender)}，` +
                    `造成 ${combat.damage} 点损失 ` +
                    `（${combat.beforeStrength}/${getUnitMaxStrength(combat.defender)} → ` +
                    `${combat.afterStrength}/${getUnitMaxStrength(combat.defender)}）` +
                    modernLossText(combat) +
                    `${combat.destroyed ? "，目标被消灭" : ""}`
                );
            }
            if (
                result?.type ===
                    "move-and-attack" &&
                result.combat?.success
            ) {
                const combat =
                    result.combat;
                writeBattleMessage(
                    `${sideLabel}：${unitName(combat.attacker)} 移动后攻击 ${unitName(combat.defender)}，` +
                    `造成 ${combat.damage} 点损失 ` +
                    `（${combat.beforeStrength}/${getUnitMaxStrength(combat.defender)} → ` +
                    `${combat.afterStrength}/${getUnitMaxStrength(combat.defender)}）` +
                    modernLossText(combat) +
                    `${combat.destroyed ? "，目标被消灭" : ""}`
                );
            }
            removeDestroyedUnits();
            render();
            if (
                checkVictory()
            ) {
                break;
            }
            await sleep(
                220
            );
        }
        if (
            !gameOver &&
            normalizeSide(
                turnSystem.phase
            ) ===
                currentSide
        ) {
            clearSelection();
            turnSystem.endPhase?.();
            processCapturableFacilities();
            const nextSide =
                normalizeSide(
                    turnSystem.phase
                );
            resetFactionForPhase(
                nextSide
            );
            updateTurnUI();
            render();
            if (
                !gameOver &&
                nextSide &&
                nextSide !==
                    getPlayerSide()
            ) {
                setTimeout(
                    () => {
                        runAIPhase();
                    },
                    250
                );
            }
        }
    }
    catch (error) {
        console.error(
            "AI 行动失败：",
            error
        );
        if (unitInfo) {
            unitInfo.innerHTML = `
                <div class="unit-title">
                    AI 行动失败
                </div>
                <div>
                    ${error?.message ?? error}
                </div>
            `;
        }
    }
    finally {
        aiRunning =
            false;
        if (
            endPhaseButton &&
            !gameOver
        ) {
            endPhaseButton.disabled =
                false;
        }
    }
}
// ============================================================
// 鼠标按下
// ============================================================
canvas.addEventListener(
    "mousedown",
    event => {
        if (
            event.button !==
            0
        ) {
            return;
        }
        isDragging =
            true;
        dragMoved =
            false;
        lastMouseX =
            event.clientX;
        lastMouseY =
            event.clientY;
    }
);
// ============================================================
// 拖动地图
// ============================================================
window.addEventListener(
    "mousemove",
    event => {
        if (!isDragging) {
            return;
        }
        const dx =
            event.clientX -
            lastMouseX;
        const dy =
            event.clientY -
            lastMouseY;
        if (
            Math.abs(dx) > 2 ||
            Math.abs(dy) > 2
        ) {
            dragMoved =
                true;
        }
        if (
            typeof camera.pan ===
            "function"
        ) {
            camera.pan(
                dx,
                dy
            );
        }
        else {
            if (
                Number.isFinite(
                    camera.x
                )
            ) {
                camera.x +=
                    dx;
            }
            if (
                Number.isFinite(
                    camera.y
                )
            ) {
                camera.y +=
                    dy;
            }
            if (
                Number.isFinite(
                    camera.offsetX
                )
            ) {
                camera.offsetX +=
                    dx;
            }
            if (
                Number.isFinite(
                    camera.offsetY
                )
            ) {
                camera.offsetY +=
                    dy;
            }
        }
        lastMouseX =
            event.clientX;
        lastMouseY =
            event.clientY;
        render();
    }
);
// ============================================================
// 鼠标释放
// ============================================================
window.addEventListener(
    "mouseup",
    () => {
        isDragging =
            false;
    }
);
// ============================================================
// 地块与工程行动
// ============================================================
function refreshEngineerActions(){
    if(!engineerActions) return;
    // 主系统工兵状态看门狗：目标模式引用的单位不存在/已切换/已阵亡时立即释放锁。
    if(pendingEngineeringAction && (!selectedUnit || !isUnitAlive(selectedUnit) || (pendingEngineeringUnitId!=null && String(pendingEngineeringUnitId)!==String(selectedUnit.id??selectedUnit.name??'')))) {
        pendingEngineeringAction=null; pendingEngineeringUnitId=null;
    }
    const p=selectedUnit?engineerSystem.profile(selectedUnit):null;
    const canWork=!!(selectedUnit&&engineerSystem.canWork(selectedUnit));
    const q=Number(selectedUnit?.q),r=Number(selectedUnit?.r);
    const mine=selectedUnit?engineerSystem.getMinefield(q,r):null;
    const canEngineer=!!(p&&(p.canEntrench||p.canLayMines||p.canClearMines||p.canBuildBridge));
    engineerActions.hidden=!canEngineer;
    if(buildFortButton)buildFortButton.disabled=!(p?.canEntrench&&canWork);
    if(layMineButton)layMineButton.disabled=!(p?.canLayMines&&canWork);
    if(clearMineButton)clearMineButton.disabled=!(p?.canClearMines&&canWork&&mine);
    // 工程按钮按“能力”而不是按单位ID/是否工兵统一锁定。
    // 这样营属/旅属工兵只要还有行动点就能持续施工；普通步兵可修简单工事和一级简易防空阵地。
    if(buildFoxholeButton) buildFoxholeButton.disabled=!(p?.canEntrench&&canWork);
    if(buildBunkerButton) buildBunkerButton.disabled=!(p?.canBuildAdvanced&&canWork);
    if(buildAA1Button) buildAA1Button.disabled=!(p?.canBuildAA1&&canWork);
    if(buildAA2Button) buildAA2Button.disabled=!(p?.canBuildAA2&&canWork);
    if(buildAA3Button) buildAA3Button.disabled=!(p?.canBuildAA3&&canWork);
    [buildBridgeButton,repairBridgeButton,demolishBridgeButton,buildWallButton,demolishWallButton].forEach(b=>{if(b)b.disabled=!(engineerSystem.isEngineer(selectedUnit)&&canWork);});
}
function selectHexAtEvent(event){const h=mouseToHex(event);if(!h)return null;selectedHex=h;hexInfoPanel.show(h.q,h.r);return h;}
let pendingSpecialAirDropUnitId = null;

function airDropMapSize(){
    return {
        width:Number(currentScenarioConfig?.trainingMap?.width ?? world?.width ?? 60),
        height:Number(currentScenarioConfig?.trainingMap?.height ?? world?.height ?? 40)
    };
}
function airDropTerrain(q,r){
    return String(world?.terrainAt?.(q,r) ?? world?.getTerrain?.(q,r) ?? "plain");
}
function validateSpecialAirDropTarget(unit,q,r){
    const {width,height}=airDropMapSize();
    q=Number(q); r=Number(r);
    if(!Number.isFinite(q)||!Number.isFinite(r)||q<0||r<0||q>=width||r>=height) return {ok:false,message:"目标超出训练场范围"};
    const terrain=airDropTerrain(q,r);
    if(["water","steepMountain","marsh","wetland"].includes(terrain)) return {ok:false,message:`${terrain} 地形不适合特战小队空降`};
    const occupied=units.some(x=>x!==unit&&x.offMap!==true&&isUnitAlive(x)&&Number(x.q)===q&&Number(x.r)===r);
    if(occupied) return {ok:false,message:"目标格已有单位，不能实施空降"};
    return {ok:true,terrain};
}
function buildSpecialAirDropHighlights(unit){
    const {width,height}=airDropMapSize();
    const targets=new Map();
    for(let q=0;q<width;q++) for(let r=0;r<height;r++){
        if(validateSpecialAirDropTarget(unit,q,r).ok) targets.set(`${q},${r}`,0);
    }
    return targets;
}
function beginSpecialAirDrop(unit){
    if(!unit||!isUnitAlive(unit)||!(unit.airDroppable||String(unit.type??unit.unitType??"").toLowerCase()==="special_forces")){writeBattleMessage("当前单位不具备空降能力");return;}
    if(unit.airDropUsed){writeBattleMessage("该特战小队本场演习已经执行过空降任务");return;}
    if(!playerCanControlUnit(unit)){writeBattleMessage("当前不能指挥该特战小队");return;}
    pendingSpecialAirDropUnitId=unit.id;
    clearReachable();
    const targets=buildSpecialAirDropHighlights(unit);
    if(typeof renderer.setReachable==="function") renderer.setReachable(targets);
    writeBattleMessage(`${unitName(unit)}：空降模式已开启，绿色区域为合法落点；点击目标格实施投送，按 ESC 取消`);
    render();
}
function cancelSpecialAirDrop(message="已取消特战小队空降目标选择"){
    pendingSpecialAirDropUnitId=null; clearReachable(); writeBattleMessage(message); render();
}

let pendingEngineeringAction = null;
let pendingEngineeringUnitId = null;
const ENGINEER_TARGET_ACTIONS = new Set(['bridge','repairBridge','demolishEngineering','wall','demolishWall']);
function engineerActionLabel(kind){ return ({bridge:'架设浮桥',repairBridge:'修复桥梁',demolishEngineering:'爆破工事',wall:'建设防御墙',demolishWall:'拆毁墙体'})[kind] ?? '工程作业'; }
function beginEngineerTargeting(kind){
    if(!selectedUnit){writeBattleMessage('请先选择工兵单位');return;}
    if(!engineerSystem.isEngineer(selectedUnit)){writeBattleMessage('当前单位不是工兵，不能执行该工程');return;}
    if(!engineerSystem.canWork(selectedUnit)){writeBattleMessage('该工兵当前没有可用行动点');refreshEngineerActions();return;}
    const check=engineerSystem.validateAction(selectedUnit,kind,null);
    if(!check.ok){writeBattleMessage(check.message);refreshEngineerActions();return;}
    pendingEngineeringAction=kind;
    pendingEngineeringUnitId=selectedUnit.id??selectedUnit.name??null;
    writeBattleMessage(`${engineerActionLabel(kind)}：请在地图上点击合法目标格；按 ESC 可取消`);
    render();
}
function doEngineerAction(kind){
    if(!selectedUnit)return;
    const own={q:Number(selectedUnit.q),r:Number(selectedUnit.r)};
    const target=(['bridge','repairBridge','demolishEngineering','wall','demolishWall'].includes(kind)&&selectedHex)?selectedHex:own;
    const validation=engineerSystem.validateAction(selectedUnit,kind,target);
    if(!validation.ok){writeBattleMessage(validation.message);refreshEngineerActions();render();return;}
    let result;
    if(kind==='fort')result=engineerSystem.entrench(selectedUnit,own.q,own.r);
    if(kind==='foxhole')result=engineerSystem.buildFortification(selectedUnit,own.q,own.r,'foxhole');
    if(kind==='bunker')result=engineerSystem.buildFortification(selectedUnit,own.q,own.r,'bunker');
    if(kind==='aa1')result=engineerSystem.buildAAPosition(selectedUnit,own.q,own.r,1);
    if(kind==='aa2')result=engineerSystem.buildAAPosition(selectedUnit,own.q,own.r,2);
    if(kind==='aa3')result=engineerSystem.buildAAPosition(selectedUnit,own.q,own.r,3);
    if(kind==='lay')result=engineerSystem.layMine(selectedUnit,own.q,own.r);
    if(kind==='clear')result=engineerSystem.clearMine(selectedUnit,own.q,own.r);
    if(kind==='bridge')result=engineerSystem.buildBridge(selectedUnit,target.q,target.r,true);
    if(kind==='repairBridge')result=engineerSystem.repairBridge(selectedUnit,target.q,target.r);
    if(kind==='demolishEngineering')result=engineerSystem.demolishEngineering(selectedUnit,target.q,target.r);
    if(kind==='wall')result=engineerSystem.buildWall(selectedUnit,target.q,target.r);
    if(kind==='demolishWall')result=engineerSystem.demolishWall(selectedUnit,target.q,target.r);
    if(result?.message)writeBattleMessage(result.message);
    commandDataLogger.engineer({unit:selectedUnit,kind,target:{q:target.q,r:target.r},result,scenario:getScenarioConfig(),turnSystem,units});
    hexInfoPanel.show(target.q,target.r);refreshEngineerActions();showUnitInfo(selectedUnit);render();updateSaveControls();
}
buildFortButton?.addEventListener('click',()=>doEngineerAction('fort'));
buildFoxholeButton?.addEventListener('click',()=>doEngineerAction('foxhole'));
buildBunkerButton?.addEventListener('click',()=>doEngineerAction('bunker'));
buildAA1Button?.addEventListener('click',()=>doEngineerAction('aa1'));
buildAA2Button?.addEventListener('click',()=>doEngineerAction('aa2'));
buildAA3Button?.addEventListener('click',()=>doEngineerAction('aa3'));
layMineButton?.addEventListener('click',()=>doEngineerAction('lay'));
clearMineButton?.addEventListener('click',()=>doEngineerAction('clear'));
buildBridgeButton?.addEventListener('click',()=>beginEngineerTargeting('bridge'));
repairBridgeButton?.addEventListener('click',()=>beginEngineerTargeting('repairBridge'));
demolishBridgeButton?.addEventListener('click',()=>beginEngineerTargeting('demolishEngineering'));
buildWallButton?.addEventListener('click',()=>beginEngineerTargeting('wall'));
demolishWallButton?.addEventListener('click',()=>beginEngineerTargeting('demolishWall'));

// ============================================================
// 点击地图
// ============================================================
canvas.addEventListener(
    "click",
    event => {
        if (
            gameOver ||
            aiRunning
        ) {
            return;
        }
        if (dragMoved) {
            dragMoved =
                false;
            return;
        }
        const clickedUnit =
            findUnitAtMouse(
                event
            );
        const clickedHex = selectHexAtEvent(event);
        if(pendingSpecialAirDropUnitId && clickedHex){
            const u=units.find(x=>String(x.id)===String(pendingSpecialAirDropUnitId));
            if(!u||!isUnitAlive(u)||!(u.airDroppable||String(u.type??u.unitType??"").toLowerCase()==="special_forces")||u.airDropUsed){cancelSpecialAirDrop('空降任务已失效');return;}
            const check=validateSpecialAirDropTarget(u,clickedHex.q,clickedHex.r);
            if(!check.ok){writeBattleMessage(`无法空降：${check.message}；请重新选择绿色合法落点，按 ESC 取消`);return;}
            pendingSpecialAirDropUnitId=null; clearReachable();
            const airDropFrom={q:Number(u.q),r:Number(u.r)};
            u.q=Number(clickedHex.q); u.r=Number(clickedHex.r); u.airDropUsed=true; u.actionPoints=0; u.movementPoints=0; u.hasActed=true; u.hasAttacked=true;
            u.engineering={...(u.engineering??{}),canEntrench:true,canBuildAA1:true}; // 空降后仍保留简易野战工程能力
            u.morale=Math.max(45,Number(u.morale??82)-8); u.airborneDisorganized=1; u.airDropTurn=Number(turnSystem?.turn??0);
            selectedUnit=u; selectedHex={q:u.q,r:u.r};
            fogOfWarSystem?.reveal?.(u.q,u.r,Number(u.reconRadius??5),2);
            writeBattleMessage(`${unitName(u)} 已空降至 (${u.q},${u.r})，本回合进入集结状态；侦察半径 ${u.reconRadius??5} 格`);
            commandDataLogger.airdrop({unit:u,from:airDropFrom,to:{q:u.q,r:u.r},scenario:getScenarioConfig(),turnSystem,units});
            showUnitInfo(u); render(); return;
        }
        if(pendingAirCard && clickedHex){
            const card=pendingAirCard; pendingAirCard=null;
            const side=getPlayerSide(); const result=airSupportSystem.execute(side,card,clickedHex);
            commandDataLogger.airSupport({card,target:{q:clickedHex.q,r:clickedHex.r},result,scenario:getScenarioConfig(),turnSystem,units});
            if(result?.refund&&airSupportSystem.state?.[side]?.cards?.[card]!=null){airSupportSystem.state[side].cards[card]++;delete airSupportSystem.state[side].nextAvailable?.[card];}
            if(result?.message)writeBattleMessage(result.message);
            if(!result?.refund && scenario?.capturableFacilities){const f=scenario.capturableFacilities.find(x=>x.type==='military_airfield'&&Number(x.q)===Number(clickedHex.q)&&Number(x.r)===Number(clickedHex.r));if(f){const st=scenario.facilityState?.[f.id]??(scenario.facilityState[f.id]={owner:f.initialOwner??null,durability:Number(f.initialDurability??100),disabled:false,captures:0});const dmg=Number(f.airstrikeDamage??35);st.durability=Math.max(0,Number(st.durability??100)-dmg);st.disabled=st.durability<Number(f.disabledBelow??50);writeBattleMessage(`空袭波及「${f.name}」：机场耐久 -${dmg}，现为 ${Math.round(st.durability)}/${f.maxDurability??100}${st.disabled?'，机场停用，需工兵抢修':''}。`);}}
            renderAirSupportPanel(); render(); return;
        }
        if(pendingEngineeringAction && selectedUnit && clickedHex){
            const action=pendingEngineeringAction;
            const expected=pendingEngineeringUnitId;
            pendingEngineeringAction=null; pendingEngineeringUnitId=null;
            if(expected!=null && String(expected)!==String(selectedUnit.id??selectedUnit.name??'')){writeBattleMessage('工程单位已改变，已取消本次工程选择');render();return;}
            selectedHex=clickedHex;
            doEngineerAction(action);
            return;
        }
        if (String(gameState.mode).toLowerCase() === "developer" && developerEditorHandleClick(event, clickedUnit, clickedHex)) { return; }
        // ====================================================
        // 点击了单位
        // ====================================================
        if (clickedUnit) {
            // ------------------------------------------------
            // 已选择玩家单位 + 点击敌军
            // = 尝试攻击
            // ------------------------------------------------
            if (
                selectedUnit &&
                playerCanControlUnit(
                    selectedUnit
                ) &&
                getUnitSide(
                    clickedUnit
                ) !==
                getUnitSide(
                    selectedUnit
                )
            ) {
                if (
                    performAttack(
                        selectedUnit,
                        clickedUnit
                    )
                ) {
                    return;
                }
                const attackCheck = combatSystem.getAttackEligibility?.(selectedUnit, clickedUnit);
                writeBattleMessage(
                    `无法攻击 ${unitName(clickedUnit)}：` +
                    `${attackCheck?.reason ?? "攻击条件不满足"}`
                );
                render();
                return;
            }
            if (
                playerCanViewUnit(
                    clickedUnit
                )
            ) {
                selectUnit(
                    clickedUnit
                );
                selectedHex = { q:Number(clickedUnit.q), r:Number(clickedUnit.r) };
                hexInfoPanel.show(selectedHex.q, selectedHex.r);
                refreshEngineerActions();
            }
            return;
        }
        // ====================================================
        // 点击空格 = 尝试移动
        // ====================================================
        if (selectedUnit) {
            const hex =
                mouseToHex(
                    event
                );
            if (
                hex &&
                tryMoveSelectedUnit(
                    hex.q,
                    hex.r
                )
            ) {
                return;
            }
        }
        clearSelection();
        selectedUnit = null;
        refreshEngineerActions();
        render();
    }
);
// ============================================================
// iPad / 触屏：单指拖动、轻触选择、双指缩放
// ============================================================
let touchMoved = false;
let touchStartX = 0, touchStartY = 0;
let touchLastX = 0, touchLastY = 0;
let pinchStartDistance = 0, pinchStartZoom = 1;

function touchDistance(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
function setCameraZoomAt(clientX, clientY, newZoom){
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const oldZoom = camera.zoom ?? 1;
    const minZoom = camera.minZoom ?? 0.35, maxZoom = camera.maxZoom ?? 3;
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (typeof camera.zoomAt === 'function') camera.zoomAt(x,y,newZoom);
    else {
        const oldX = camera.x ?? camera.offsetX ?? 0, oldY = camera.y ?? camera.offsetY ?? 0;
        const worldX=(x-oldX)/oldZoom, worldY=(y-oldY)/oldZoom;
        const nx=x-worldX*newZoom, ny=y-worldY*newZoom;
        camera.zoom=newZoom;
        if('x' in camera) camera.x=nx; if('y' in camera) camera.y=ny;
        if('offsetX' in camera) camera.offsetX=nx; if('offsetY' in camera) camera.offsetY=ny;
    }
}
canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    touchMoved=false;
    if(e.touches.length===1){
        const t=e.touches[0]; touchStartX=touchLastX=t.clientX; touchStartY=touchLastY=t.clientY;
    } else if(e.touches.length===2){
        pinchStartDistance=touchDistance(e.touches[0],e.touches[1]);
        pinchStartZoom=camera.zoom ?? 1; touchMoved=true;
    }
},{passive:false});
canvas.addEventListener('touchmove', e=>{
    e.preventDefault();
    if(e.touches.length===1){
        const t=e.touches[0], dx=t.clientX-touchLastX, dy=t.clientY-touchLastY;
        if(Math.hypot(t.clientX-touchStartX,t.clientY-touchStartY)>7) touchMoved=true;
        if(touchMoved){
            if(typeof camera.pan==='function') camera.pan(dx,dy);
            else { if(Number.isFinite(camera.x))camera.x+=dx; if(Number.isFinite(camera.y))camera.y+=dy; if(Number.isFinite(camera.offsetX))camera.offsetX+=dx; if(Number.isFinite(camera.offsetY))camera.offsetY+=dy; }
            render();
        }
        touchLastX=t.clientX; touchLastY=t.clientY;
    } else if(e.touches.length===2 && pinchStartDistance>0){
        const a=e.touches[0], b=e.touches[1], d=touchDistance(a,b);
        const cx=(a.clientX+b.clientX)/2, cy=(a.clientY+b.clientY)/2;
        setCameraZoomAt(cx,cy,pinchStartZoom*(d/pinchStartDistance)); touchMoved=true; render();
    }
},{passive:false});
canvas.addEventListener('touchend', e=>{
    e.preventDefault();
    if(e.touches.length===0){
        if(!touchMoved && e.changedTouches.length){
            const t=e.changedTouches[0];
            canvas.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY,bubbles:true}));
        }
        pinchStartDistance=0;
    } else if(e.touches.length===1){
        touchLastX=e.touches[0].clientX; touchLastY=e.touches[0].clientY;
        pinchStartDistance=0; touchMoved=true;
    }
},{passive:false});
canvas.addEventListener('touchcancel',()=>{pinchStartDistance=0;touchMoved=false;},{passive:false});

// ============================================================
// 滚轮缩放
// ============================================================
canvas.addEventListener(
    "wheel",
    event => {
        event.preventDefault();
        const rect =
            canvas.getBoundingClientRect();
        const mouseX =
            event.clientX -
            rect.left;
        const mouseY =
            event.clientY -
            rect.top;
        const oldZoom =
            camera.zoom ?? 1;
        const factor =
            event.deltaY < 0
                ? 1.1
                : 0.9;
        const minZoom =
            camera.minZoom ??
            0.35;
        const maxZoom =
            camera.maxZoom ??
            3;
        const newZoom =
            Math.max(
                minZoom,
                Math.min(
                    maxZoom,
                    oldZoom *
                    factor
                )
            );
        if (
            typeof camera.zoomAt ===
            "function"
        ) {
            camera.zoomAt(
                mouseX,
                mouseY,
                newZoom
            );
            render();
            return;
        }
        const oldX =
            camera.x ??
            camera.offsetX ??
            0;
        const oldY =
            camera.y ??
            camera.offsetY ??
            0;
        const worldX =
            (
                mouseX -
                oldX
            ) /
            oldZoom;
        const worldY =
            (
                mouseY -
                oldY
            ) /
            oldZoom;
        const newX =
            mouseX -
            worldX *
            newZoom;
        const newY =
            mouseY -
            worldY *
            newZoom;
        camera.zoom =
            newZoom;
        if (
            "x" in camera
        ) {
            camera.x =
                newX;
        }
        if (
            "y" in camera
        ) {
            camera.y =
                newY;
        }
        if (
            "offsetX" in camera
        ) {
            camera.offsetX =
                newX;
        }
        if (
            "offsetY" in camera
        ) {
            camera.offsetY =
                newY;
        }
        render();
    },
    {
        passive: false
    }
);
// ============================================================
// 结束当前阶段
// ============================================================
function endCurrentPhase() {
    // 综合测试场：敌军为静态靶标。一次“结束回合”直接跳过被动 AI 阶段，
    // 回到玩家下一回合，避免按钮被 AI 锁定或胜负系统误禁用。
    const __testId = String(scenario?.id ?? scenario?.key ?? gameState?.scenarioKey ?? "");
    if (__testId === "system_test_range" && turnSystem && !aiRunning) {
        gameOver = false;
        saveSystem.autoSave({ units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
        undoSystem.clear(); clearSelection();
        const __player = getPlayerSide();
        let __guard = 0;
        do {
            turnSystem.endPhase?.();
            __guard++;
        } while (__guard < 8 && normalizeSide(turnSystem.phase) !== __player);
        resetFactionForPhase(normalizeSide(turnSystem.phase));
        processReinforcementsForCurrentTurn();
        if (endPhaseButton) endPhaseButton.disabled = false;
        updateTurnUI(); render();
        return;
    }
    if (
        gameOver ||
        aiRunning ||
        !turnSystem
    ) {
        return;
    }
    const currentSide =
        normalizeSide(
            turnSystem.phase
        );
    const playerSide =
        getPlayerSide();
    if (String(gameState.mode).toLowerCase() === "developer") {
        saveSystem.autoSave({ units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
        undoSystem.clear(); clearSelection(); turnSystem.endPhase?.();
        resetFactionForPhase(normalizeSide(turnSystem.phase)); updateTurnUI(); render(); updateDeveloperPanel();
        return;
    }
    if (
        playerSide &&
        currentSide !==
            playerSide
    ) {
        runAIPhase();
        return;
    }
    commandDataLogger.turnSnapshot({scenario:getScenarioConfig(),turnSystem,units,playerSide:getPlayerSide()});
    commandDataLogger.endPhase({scenario:getScenarioConfig(),turnSystem,units,side:currentSide});
    saveSystem.autoSave({ units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
    undoSystem.clear();
    clearSelection();
    turnSystem.endPhase?.();
    processCapturableFacilities();
    const nextSide =
        normalizeSide(
            turnSystem.phase
        );
    resetFactionForPhase(
        nextSide
    );
    if (nextSide === getPlayerSide()) {
        saveSystem.autoSave({ units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
    }
    updateTurnUI();
    render();
    if (
        !gameOver &&
        nextSide &&
        nextSide !==
            getPlayerSide()
    ) {
        setTimeout(
            () => {
                runAIPhase();
            },
            250
        );
    }
}
// ============================================================
// 存档 / 读取 / 撤销
// ============================================================
function applySnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.units)) return false;
    units = JSON.parse(JSON.stringify(snapshot.units));
    gameState.units = units;
    gameOver = snapshot.gameOver === true;
    if (snapshot.playerFaction) {
        gameState.playerFaction = snapshot.playerFaction;
        gameState.playerSide = snapshot.playerFaction;
        gameState.selectedFaction = snapshot.playerFaction;
        gameState.selectedSide = snapshot.playerFaction;
    }
    if (snapshot.mode) gameState.mode = snapshot.mode;
    if (snapshot.world) {
        world.fortifications = JSON.parse(JSON.stringify(snapshot.world.fortifications ?? []));
        world.minefields = JSON.parse(JSON.stringify(snapshot.world.minefields ?? []));
        if (Array.isArray(snapshot.world.wallEdges)) world.wallEdges = JSON.parse(JSON.stringify(snapshot.world.wallEdges));
    }
    if (snapshot.reinforcements) {
        reinforcementSystem.arrivedGroups = new Set(snapshot.reinforcements.arrivedGroups ?? []);
        reinforcementSystem.arrivalLog = JSON.parse(JSON.stringify(snapshot.reinforcements.arrivalLog ?? []));
    }
    reinforcementSystem.initialize(units, snapshot.turn?.turn ?? 1);
    const t = snapshot.turn ?? {};
    if (turnSystem) {
        for (const key of ["turn", "phase", "year", "month", "day", "hour", "minute"]) {
            if (t[key] != null) turnSystem[key] = t[key];
        }
        if (Array.isArray(t.units)) turnSystem.units = units;
    }
    clearSelection();
    removeDestroyedUnits();
    updateTurnUI();
    render();
    return true;
}
function saveGame(slot = 1) {
    if (aiRunning) return false;
    saveSystem.save(slot, { units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
    updateSaveControls();
    console.log(`[存档] 槽位 ${slot} 保存成功`);
    return true;
}
function loadGame(slot = 1) {
    if (aiRunning) return false;
    const snapshot = saveSystem.load(slot);
    if (!snapshot) return false;
    undoSystem.clear();
    applySnapshot(snapshot);
    updateSaveControls();
    console.log(`[存档] 槽位 ${slot} 读取成功`);
    return true;
}
function undoLastAction() {
    if (aiRunning || gameOver) return false;
    const entry = undoSystem.undo();
    if (!entry) return false;
    applySnapshot(entry.snapshot);
    updateSaveControls();
    console.log(`[撤销] ${entry.label}`);
    return true;
}
function ensureSaveControls() {
    const slotSelect = document.getElementById("save-slot-select");
    const saveButton = document.getElementById("save-game-button");
    const loadButton = document.getElementById("load-game-button");
    const undoButton = document.getElementById("undo-game-button");
    if (!slotSelect || !saveButton || !loadButton || !undoButton) {
        console.error("[存档系统] index.html 缺少存档/读取/撤销控件");
        return;
    }
    const selectedSlot = () => Number(slotSelect.value ?? 1);
    saveButton.addEventListener("click", () => {
        saveGame(selectedSlot());
    });
    loadButton.addEventListener("click", () => {
        if (!loadGame(selectedSlot())) {
            alert("该槽位没有可读取的存档。");
        }
    });
    undoButton.addEventListener("click", () => {
        undoLastAction();
    });
    slotSelect.addEventListener("change", updateSaveControls);
    updateSaveControls();
}
function updateSaveControls() {
    const slot = Number(document.getElementById("save-slot-select")?.value ?? 1);
    const loadButton = document.getElementById("load-game-button");
    const undoButton = document.getElementById("undo-game-button");
    if (loadButton) loadButton.disabled = aiRunning || !saveSystem.has(slot);
    if (undoButton) undoButton.disabled = aiRunning || gameOver || !undoSystem.canUndo();
}
// ============================================================
// 结束行动按钮
// ============================================================
endPhaseButton?.addEventListener(
    "click",
    () => {
        endCurrentPhase();
    }
);
// ============================================================
// 键盘
// ============================================================
window.addEventListener(
    "keydown",
    event => {
        if (event.ctrlKey && event.key.toLowerCase() === "s") { event.preventDefault(); saveGame(Number(document.getElementById("save-slot-select")?.value ?? 1)); return; }
        if (event.ctrlKey && event.key.toLowerCase() === "z") { event.preventDefault(); undoLastAction(); return; }
        if (
            event.key ===
            "Escape"
        ) {
            clearSelection();
            render();
            return;
        }
        if (
            event.key.toLowerCase() ===
            "e"
        ) {
            endCurrentPhase();
        }
    }
);
// ============================================================
// 玩家选择阵营之后
// ============================================================
function applyDifficultyToEnemyUnits() {
    const playerSide = getPlayerSide();
    const factor = Number(currentDifficulty?.multiplier ?? gameState.difficultyMultiplier ?? 1);
    gameState.difficultyName = currentDifficulty?.name ?? gameState.difficultyName ?? "普通";
    gameState.difficultyMultiplier = factor;
    for (const unit of units) {
        if (!unit || unit.offMap === true || getUnitSide(unit) === playerSide || unit._difficultyApplied === factor) continue;
        // 只缩放战斗参数；不改变移动力、射程、弹药，避免改变地图节奏。
        for (const key of ["strength","maxStrength","attack","defense","morale"]) {
            if (Number.isFinite(Number(unit[key]))) unit[key] = Math.max(1, Math.round(Number(unit[key]) * factor));
        }
        unit.difficultyMultiplier = factor;
        unit._difficultyApplied = factor;
    }
}

function startGame() {
    ensureSaveControls();
    saveSystem.autoSave({ units, turnSystem, gameState, gameOver, scenario, world, reinforcementSystem });
    updateSaveControls();
    console.log(
        "玩家阵营：",
        getPlayerSide()
    );
    console.log(
        "游戏模式：",
        gameState.mode
    );
    clearSelection();
    fogOfWarSystem.setEnabled(userGameSettings.fogOfWar !== false);
    fogOfWarSystem.setSide(getPlayerSide());
    renderFogToggle();
    updateTurnUI();
    resizeCanvas();
    render();
    const currentSide =
        normalizeSide(
            turnSystem?.phase
        );
    const playerSide =
        getPlayerSide();
    // 把最终选择结果同步回所有常见字段，确保其它系统读取到同一阵营。
    if (playerSide) {
        const id = FactionSystem.normalizeFaction(playerSide);
        gameState.playerFaction = id ?? gameState.playerFaction;
        gameState.playerSide = playerSide;
        gameState.selectedFaction = id ?? gameState.selectedFaction;
        gameState.selectedSide = playerSide;
    }
    applyDifficultyToEnemyUnits();
    strategicObjectives.onFactionChanged();
    updateDeveloperPanel();
    renderAirSupportPanel();
    devSupportRender();
    console.log("[控制系统] 玩家阵营已统一为：", playerSide);
    console.log("[控制系统] 当前行动方：", currentSide);
    commandDataLogger.battleStart({scenario:getScenarioConfig(),turnSystem,units,playerSide,difficulty:currentDifficulty?.name??null,width:world?.width??scenario?.width??null,height:world?.height??scenario?.height??null});
    // ========================================================
    // 如果开局行动方不是玩家
    // AI 自动行动
    // ========================================================
    if (
        gameState.mode !==
            "observer" &&
        String(gameState.mode).toLowerCase() !== "developer" &&
        currentSide &&
        playerSide &&
        currentSide !==
            playerSide
    ) {
        setTimeout(
            () => {
                runAIPhase();
            },
            250
        );
    }
}
// ============================================================
// 战争迷雾开关（战役内）
// ============================================================
function ensureFogToggle(){
    let box=document.getElementById('fogToggleBox'); if(box)return box;
    box=document.createElement('div'); box.id='fogToggleBox'; box.style.cssText='margin:10px 0;padding:9px;border:1px solid #aaa;font-size:13px';
    const casualty=document.getElementById('casualtyPanel');
    if(casualty?.parentNode) casualty.parentNode.insertBefore(box,casualty);
    else document.getElementById('operationPanel')?.appendChild(box);
    return box;
}
function renderFogToggle(){
    const box=ensureFogToggle(); if(!box)return;
    const supported=scenario?.fogOfWar?.enabled!==false;
    if(!supported){box.hidden=true;fogOfWarSystem.setEnabled(false);return;}
    box.hidden=false; const on=fogOfWarSystem.isEnabled();
    box.innerHTML=`<strong>战争迷雾</strong><button id="fog-toggle-btn" style="float:right;font-family:inherit;padding:3px 10px">${on?'开启':'关闭'}</button><div style="clear:both;font-size:11px;margin-top:5px">可在本战役中随时切换显示。</div>`;
    box.querySelector('#fog-toggle-btn').onclick=()=>{fogOfWarSystem.setEnabled(!fogOfWarSystem.isEnabled());renderFogToggle();render();};
}

// ============================================================
// 航空支援卡组 UI
// ============================================================
function ensureAirSupportPanel(){
    let panel=document.getElementById('airSupportPanel');if(panel)return panel;
    panel=document.createElement('div');panel.id='airSupportPanel';panel.style.cssText='margin:14px 0;padding:12px 0;border-top:1px solid #aaa;border-bottom:1px solid #aaa;font-size:13px';
    const casualty=document.getElementById('casualtyPanel');
    if(casualty?.parentNode) casualty.parentNode.insertBefore(panel,casualty);
    else document.getElementById('operationPanel')?.appendChild(panel);
    return panel;
}
function renderAirSupportPanel(){
    const panel=ensureAirSupportPanel();if(!panel)return;const side=getPlayerSide();const cards=airSupportSystem.available(side);
    if(!cards.length){panel.innerHTML='';panel.hidden=true;return;}panel.hidden=false;
    panel.innerHTML='<h3 style="margin:0 0 6px">航空与陆航支援</h3><div style="font-size:11px;margin-bottom:8px">选择支援卡后点击地图目标格；只受剩余使用次数限制</div>';
    const groups=[['空军支援',cards.filter(c=>!String(c.id).startsWith('helo_')&&!String(c.id).startsWith('missile_'))],['直升机支援',cards.filter(c=>String(c.id).startsWith('helo_'))],['导弹部队',cards.filter(c=>String(c.id).startsWith('missile_'))]];
    for(const [label,list] of groups){if(!list.length)continue;const h=document.createElement('div');h.textContent=label;h.style.cssText='font-weight:700;margin:7px 0 4px';panel.appendChild(h);for(const c of list){const b=document.createElement('button');b.type='button';b.style.cssText='width:100%;margin:2px 0;padding:6px;text-align:left;font-family:inherit';const ok=c.availability?.ok!==false;b.disabled=!ok;b.title=ok?'选择后点击地图目标格':c.availability?.reason??'';const model=AIRCRAFT[c.aircraft]?.name??c.aircraft??'未指定机型';b.textContent=`${c.name}｜机型：${model}｜剩余${c.remaining}次${ok?'':` · ${c.availability?.reason??'暂不可用'}`}`;b.onclick=()=>{pendingAirCard=c.id;writeBattleMessage(`${c.name}：请点击地图目标格；ESC取消`);};panel.appendChild(b);}}
}

// ============================================================
// 加载游戏数据
// ============================================================
function applyPreBattleSupportSelection(scenario, config){
    if(!scenario || !config) return;
    const ids=['modern_cap','modern_precision','jh7a_strike','helo_antiarmor','helo_recon','helo_supply','helo_z20_air_assault','helo_z8b_air_assault','missile_fire_support'];
    const parse=(key)=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}};
    scenario.airSupport = (scenario.airSupport && typeof scenario.airSupport==='object') ? scenario.airSupport : {};
    const setSide=(side,uses,deckId)=>{
        if(!uses || typeof uses!=='object') return;
        let cards=ids.filter(id=>Number(uses[id]??0)>0);
        if(scenario?.requiresAirfieldForAirSupport===true) cards=cards.filter(id=>String(id).startsWith('helo_')||String(id).startsWith('missile_'));
        scenario.airSupport[side]={...(scenario.airSupport[side]??{}),enabled:cards.length>0,deckId:deckId??'scenario_custom',cards,uses:Object.fromEntries(cards.map(id=>[id,Math.max(0,Math.floor(Number(uses[id]??0)))]))};
    };
    if(config.marineSupportSelection===true || scenario?.marineSupportSelection===true){
        const sel=parse('marineSupportSelection');
        if(sel){setSide('red',sel.red,'marine_red');setSide('blue',sel.blue,'marine_blue');}
    }
    if(config.modernBrigadeSelection===true){
        const sel=parse('modernSupportSelection');
        if(sel){setSide('red',sel.red,'modern_red');setSide('blue',sel.blue,'modern_blue');}
    }
    if(config.groupArmySelection===true){
        const sel=parse('groupArmySupportSelection');
        const base={modern_cap:1,modern_precision:2,jh7a_strike:1,helo_antiarmor:2,helo_recon:2,helo_supply:2,helo_z20_air_assault:1,helo_z8b_air_assault:1,missile_fire_support:2};
        setSide('red',sel?.red??base,'group_army_red');
        setSide('blue',sel?.blue??base,'group_army_blue');
    }
    if(config.plaCombinedBrigadeSelection===true){
        const sel=parse('plaSupportSelection');
        if(sel)setSide('pla',sel,'pla_modern_2026');
    }
}

async function loadScenario(scenarioKey = "dubno", resumeSnapshot = null) {
    try {
        currentScenarioKey = scenarioKey; gameOver=false; aiRunning=false; clearSelection(); undoSystem.clear?.();
        const loaded = await scenarioManager.load(scenarioKey);
        currentScenarioConfig = loaded.config; scenario = loaded.scenario; units = loaded.units;
        // 现代红蓝演习采用“夺取后巩固”判定：单个高机动单位冲入目标区不会立即获胜。
        // 场景可通过 victoryControlPolicy 覆盖这些默认值。
        const loadedSides=[...new Set((units??[]).map(u=>normalizeSide(u?.faction??u?.side??u?.camp)).filter(Boolean))];
        if (loadedSides.includes("red") && loadedSides.includes("blue")) {
            scenario.victoryControlPolicy = {
                enabled:true, holdTurns:2, primaryMinUnits:2, secondaryMinUnits:1,
                requireUncontested:true, excludeRecon:true, excludeHQ:true,
                ...(scenario.victoryControlPolicy ?? {})
            };
        }
        strategicObjectives.setScenario(scenario);
        // 战役 JSON 的时间参数优先于战役目录默认值，避免 hoursPerTurn=24 时钟永远显示同一小时。
        currentScenarioConfig.start = { ...(currentScenarioConfig.start ?? {}) };
        if (Number.isFinite(Number(scenario?.hoursPerTurn))) currentScenarioConfig.start.hoursPerTurn = Number(scenario.hoursPerTurn);
        if (typeof scenario?.startTime === "string" && /^\d{1,2}:\d{2}$/.test(scenario.startTime)) {
            const [h,m] = scenario.startTime.split(":").map(Number); currentScenarioConfig.start.hour=h; currentScenarioConfig.start.minute=m;
        }
        applyPreBattleSupportSelection(scenario, currentScenarioConfig);
        airSupportSystem.configure(scenario);
        processCapturableFacilities();
        console.log(`[战役系统] ${loaded.theater.name} / ${loaded.phase.name} / ${loaded.config.name}`);
        initializeUnits();
        const integrityReport = integrityMonitor.auditScenario(scenario, units);
        if (integrityReport.errors.length) throw new Error(`主系统完整性检查失败：发现 ${integrityReport.errors.length} 个严重问题，请查看控制台 [完整性监测]`);
        resetCasualtyState(); renderCasualtyPanel();
        reinforcementSystem.arrivedGroups.clear();
        reinforcementSystem.arrivalLog.length = 0;
        reinforcementSystem.initialize(units, 1);
        units = units.filter(unit => unit.offMap === true || isUnitAlive(unit));
        // 部署安全自动修复仅用于动态集团军/现代旅系统。
        // 历史战役（如墨尔本）包含合法的海军水面部署、特殊地形部署和手工编制，
        // 不得套用现代陆战动态生成器的地形过滤，否则 NAV_* 舰艇会被误判。
        const usesDynamicDeploymentSafety = loaded.config.groupArmySelection === true || loaded.config.modernBrigadeSelection === true;
        if (usesDynamicDeploymentSafety) {
            runDeploymentSafetyCheck(units, { autoRepair: true });
            // 自动修复后重新审计最终状态；初次报告中的已修复冲突不应阻止战役启动。
            const finalDeploymentReport = runDeploymentSafetyCheck(units, { autoRepair: true });
            if (finalDeploymentReport.invalid.length || finalDeploymentReport.conflicts.length) {
                throw new Error(`${loaded.config.groupArmySelection?"集团军动态编组":"现代旅动态编组"} 主系统部署安全检查失败，请查看浏览器控制台`);
            }
        }
        if(!validateUnits(units)) throw new Error(`${loaded.config.unitsPath} 单位数据检查失败，请查看浏览器控制台`);
        const counts={}; for(const unit of units){const side=getUnitSide(unit);counts[side]=(counts[side]??0)+1;}
        console.log("[单位系统] 战斗序列加载完成", counts);
        gameState.units=units; gameState.scenarioKey=loaded.config.id; gameState.scenarioName=loaded.config.name;
        gameState.setAvailableFactions?.(loaded.config.factions ?? []);
        initializeTurnSystem(); victorySystem=new VictorySystem({scenario});
        if(typeof camera.reset==="function") camera.reset();
        if(typeof camera.centerOnMap==="function") camera.centerOnMap(world,canvas,renderer);
        resizeCanvas(); render();
        if (resumeSnapshot) {
            currentDifficulty = { name: resumeSnapshot.difficultyName ?? "普通", multiplier: Number(resumeSnapshot.difficultyMultiplier ?? 1) };
            applySnapshot(resumeSnapshot);
            document.getElementById("mainMenu")?.setAttribute("hidden", "");
            startGame();
        } else {
            factionSelection.show(startGame,{scenario,config:loaded.config});
        }
        console.log(`战役已启动：${loaded.config.name}`);
    } catch(error) {
        console.error("游戏初始化失败：",error);
        if(unitInfo){unitInfo.innerHTML=`<strong>游戏数据加载失败</strong><br><br>${error.message}<br><br><button id="return-scenario-selection" type="button">返回战役选择</button>`;document.getElementById("return-scenario-selection")?.addEventListener("click",showScenarioSelection);} else showScenarioSelection();
    }
}

// ============================================================
// V0.3.1 主界面 / 存档槽 UI
// ============================================================
function factionLabel(side){ const v=normalizeSide(side); if(['red','blue'].includes(v)) return v==='red'?'红方':'蓝方'; if(currentScenarioConfig?.modernBrigadeSelection||currentScenarioConfig?.groupArmySelection)return v==='red'?'红方':v==='blue'?'蓝方':(side??''); return v==='pla'?'解放军':v==='tw_proxy'?'台伪军':v==='chinese'?'中国军':v==='japanese'?'日军':v==='german'?'德军':v==='soviet'?'苏军':v==='rok_government'?'政府军':v==='new_military'?'新军部':(side??''); }
function showMainMenu(){ document.getElementById('pauseMenu')?.setAttribute('hidden',''); document.getElementById('mainMenu')?.removeAttribute('hidden'); updateMainMenu(); }
function hideMainMenu(){ document.getElementById('mainMenu')?.setAttribute('hidden',''); }
function updateMainMenu(){ const b=document.getElementById('menuContinue'); if(b)b.disabled=!(saveSystem.hasResume()||saveSystem.hasAutoSave()); }
function openSaveModal(mode='load'){
  const modal=document.getElementById('saveLoadModal'), box=document.getElementById('saveSlotCards'), title=document.getElementById('saveModalTitle'); if(!modal||!box)return;
  title.textContent=mode==='save'?'保存游戏':'读取存档'; box.innerHTML='';
  const auto=saveSystem.getAutoSummary(); if(mode==='load') box.appendChild(makeSlotCard('自动存档',auto,'auto',mode));
  for(let i=1;i<=3;i++) box.appendChild(makeSlotCard(`存档 ${i}`,saveSystem.getSummary(i),i,mode));
  modal.dataset.mode=mode; modal.removeAttribute('hidden');
}
function makeSlotCard(label,summary,slot,mode){
  const d=document.createElement('div');d.className='save-slot-card'; const when=summary?.savedAt?new Date(summary.savedAt).toLocaleString():'空';
  d.innerHTML=`<div class="save-slot-title">${label}</div><div class="save-slot-meta">${summary?`${summary.scenarioName} · ${factionLabel(summary.playerFaction)} · 第${summary.turn}回合 · ${when}`:'空槽位'}</div><div class="save-slot-buttons"></div>`;
  const row=d.querySelector('.save-slot-buttons');
  if(mode==='save'&&slot!=='auto'){const b=document.createElement('button');b.textContent=summary?'覆盖保存':'保存';b.onclick=()=>{saveGame(slot);openSaveModal('save');};row.appendChild(b);}
  if(mode==='load'&&summary){const b=document.createElement('button');b.textContent='读取';b.onclick=async()=>{const snap=slot==='auto'?saveSystem.loadAutoSave():saveSystem.load(slot);document.getElementById('saveLoadModal')?.setAttribute('hidden','');await resumeFromSnapshot(snap);};row.appendChild(b);}
  if(summary&&slot!=='auto'){const ex=document.createElement('button');ex.textContent='导出';ex.onclick=()=>saveSystem.exportSlot(slot);row.appendChild(ex);const del=document.createElement('button');del.textContent='删除';del.onclick=()=>{if(confirm(`删除${label}？`)){saveSystem.remove(slot);openSaveModal(mode);updateMainMenu();}};row.appendChild(del);}
  return d;
}
async function resumeFromSnapshot(snapshot){ if(!snapshot)return false; const key=snapshot.scenarioKey ?? snapshot.scenario?.id ?? 'wanjialing'; hideMainMenu(); await loadScenario(key,snapshot); return true; }
function openGameSettings(){
  const modal=document.getElementById('settingsModal'); if(!modal)return;
  document.getElementById('settingControlZone').value=userGameSettings.controlZone!==false?'on':'off';
  document.getElementById('settingFogOfWar').value=userGameSettings.fogOfWar!==false?'on':'off';
  document.getElementById('settingMapMode').value=userGameSettings.mapMode==='3d'?'3d':'2d';
  document.getElementById('settingViewDirection').value=userGameSettings.viewDirection||'south';
  document.getElementById('settingPitch').value=String(userGameSettings.pitch??52);
  document.getElementById('settingPitchValue').textContent=String(userGameSettings.pitch??52);
  modal.removeAttribute('hidden');
}
function bindGameSettingsUI(){
  const modal=document.getElementById('settingsModal');
  const pitch=document.getElementById('settingPitch');
  pitch?.addEventListener('input',()=>{const o=document.getElementById('settingPitchValue');if(o)o.textContent=pitch.value;});
  document.getElementById('settingsClose')?.addEventListener('click',()=>modal?.setAttribute('hidden',''));
  document.getElementById('settingsReset')?.addEventListener('click',()=>{
    userGameSettings={...DEFAULT_GAME_SETTINGS}; persistGameSettings(); openGameSettings(); applyGameViewSettings(); renderFogToggle(); render();
  });
  document.getElementById('settingsSave')?.addEventListener('click',()=>{
    userGameSettings={
      controlZone:document.getElementById('settingControlZone')?.value!=='off',
      fogOfWar:document.getElementById('settingFogOfWar')?.value!=='off',
      mapMode:document.getElementById('settingMapMode')?.value==='3d'?'3d':'2d',
      viewDirection:document.getElementById('settingViewDirection')?.value||'south',
      pitch:Number(document.getElementById('settingPitch')?.value||52)
    };
    persistGameSettings(); applyGameViewSettings(); renderFogToggle(); render(); modal?.setAttribute('hidden','');
  });
}

function initializeMainMenu(){
  const main=document.getElementById('mainMenu'); main?.removeAttribute('hidden'); updateMainMenu();
  document.getElementById('menuNewGame')?.addEventListener('click',()=>{hideMainMenu();showScenarioSelection();});
  document.getElementById('menuContinue')?.addEventListener('click',()=>resumeFromSnapshot(saveSystem.loadResume() ?? saveSystem.loadAutoSave()));
  document.getElementById('menuDeveloper')?.addEventListener('click',openMainDeveloperEditor);
  document.getElementById('menuLoad')?.addEventListener('click',()=>openSaveModal('load'));
  document.getElementById('menuSettings')?.addEventListener('click',openGameSettings);
  document.getElementById('menuAbout')?.addEventListener('click',()=>document.getElementById('aboutModal')?.removeAttribute('hidden'));
  document.getElementById('closeAboutModal')?.addEventListener('click',()=>document.getElementById('aboutModal')?.setAttribute('hidden',''));
  document.getElementById('menu-game-button')?.addEventListener('click',()=>document.getElementById('pauseMenu')?.removeAttribute('hidden'));
  document.getElementById('pauseResume')?.addEventListener('click',()=>document.getElementById('pauseMenu')?.setAttribute('hidden',''));
  document.getElementById('pauseSave')?.addEventListener('click',()=>{document.getElementById('pauseMenu')?.setAttribute('hidden','');openSaveModal('save');});
  document.getElementById('pauseLoad')?.addEventListener('click',()=>{document.getElementById('pauseMenu')?.setAttribute('hidden','');openSaveModal('load');});
  document.getElementById('pauseRestart')?.addEventListener('click',async()=>{
    if(!currentScenarioKey){ alert('当前没有正在进行的战役。'); return; }
    const ok=confirm('确定重新开始当前对局吗？\n\n当前回合、战损、移动、工事变化、弹药/燃油消耗、支援卡使用次数、控制点与战争迷雾进度都会清除。\n\n已选择的合成旅卡组将保留。');
    if(!ok)return;
    document.getElementById('pauseMenu')?.setAttribute('hidden','');
    // 清除自动恢复快照，防止刷新后又回到重新开始前的局面；手动存档不受影响。
    saveSystem.clearResume?.();
    try{ if(saveSystem.autoKey) localStorage.removeItem(saveSystem.autoKey); }catch(e){ console.warn('[重新开始] 清除自动存档失败',e); }
    pendingAirCard=null; gameOver=false; aiRunning=false; clearSelection(); undoSystem.clear?.();
    await loadScenario(currentScenarioKey, null);
  });
  document.getElementById('pauseMain')?.addEventListener('click',()=>{document.getElementById('pauseMenu')?.setAttribute('hidden','');showMainMenu();});
  document.getElementById('closeSaveModal')?.addEventListener('click',()=>document.getElementById('saveLoadModal')?.setAttribute('hidden',''));
  document.getElementById('importSaveButton')?.addEventListener('click',()=>document.getElementById('importSaveFile')?.click());
  document.getElementById('importSaveFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await saveSystem.importFile(file,1);alert('已导入到存档1。');openSaveModal('load');updateMainMenu();}catch(err){alert(`导入失败：${err.message}`);}e.target.value='';});
}

// ============================================================
// 开发者模式控制面板（与普通战役完全隔离）
// ============================================================
function updateDeveloperPanel(){
  const panel=document.getElementById('developerPanel'); if(!panel)return;
  const dev=String(gameState.mode).toLowerCase()==='developer'; panel.hidden=!dev;
  if(dev){const input=document.getElementById('devTurnInput');if(input&&turnSystem)input.value=turnSystem.turn??1;}
}
function developerAdvanceFullTurn(){
  if(String(gameState.mode).toLowerCase()!=='developer'||!turnSystem)return;
  const start=Number(turnSystem.turn??1); let guard=0;
  do{turnSystem.endPhase?.();resetFactionForPhase(normalizeSide(turnSystem.phase));guard++;}while(Number(turnSystem.turn??1)===start&&guard<10);
  clearSelection();updateTurnUI();render();updateDeveloperPanel();
}
function developerSetTurn(){
  if(String(gameState.mode).toLowerCase()!=='developer'||!turnSystem)return;
  const n=Math.max(1,Math.floor(Number(document.getElementById('devTurnInput')?.value)||1));
  turnSystem.turn=n; reinforcementSystem.processTurn?.(n,units); strategicObjectives.onTurnChanged?.(); updateTurnUI();render();updateDeveloperPanel();
}
document.getElementById('devEndPhase')?.addEventListener('click',endCurrentPhase);
document.getElementById('devNextTurn')?.addEventListener('click',developerAdvanceFullTurn);
document.getElementById('devSetTurn')?.addEventListener('click',developerSetTurn);

// ============================================================
// 窗口变化
// ============================================================
window.addEventListener(
    "resize",
    () => {
        resizeCanvas();
        render();
    }
);
window.addEventListener("orientationchange", () => {
    setTimeout(() => { resizeCanvas(); render(); }, 180);
});

// ============================================================
// v0.20 主界面开发者编辑器
// ============================================================
let mainDevSelection=null;
function mainDevKey(){return 'frontline_campaign_editor_v020';}
function mainDevClone(x){return JSON.parse(JSON.stringify(x));}
function mainDevLoadDraft(){try{const d=JSON.parse(localStorage.getItem(mainDevKey())||'null');if(Array.isArray(d)){CAMPAIGNS.splice(0,CAMPAIGNS.length,...d);}}catch(e){}}
function mainDevUIData(){return {tagline:document.getElementById('mainMenuTagline')?.textContent?.trim()??'',version:document.getElementById('mainMenuVersion')?.textContent?.trim()??'',updateTitle:document.getElementById('mainUpdateTitle')?.textContent?.trim()??'',updateDetail:document.getElementById('mainUpdateDetail')?.textContent?.trim()??'',about:(document.getElementById('aboutContent')?.innerText??'').trim()};}
function mainDevApplyUIData(d={}){const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.textContent=v};set('mainMenuTagline',d.tagline);set('mainMenuVersion',d.version);set('mainUpdateTitle',d.updateTitle);set('mainUpdateDetail',d.updateDetail);const a=document.getElementById('aboutContent');if(a&&d.about!=null)a.innerText=d.about;}
function mainDevFillContent(){const d=mainDevUIData(), map={mainDevTagline:d.tagline,mainDevVersionText:d.version,mainDevUpdateTitle:d.updateTitle,mainDevUpdateDetail:d.updateDetail,mainDevAbout:d.about};for(const [id,v] of Object.entries(map)){const e=document.getElementById(id);if(e)e.value=v;}}
function openMainDeveloperEditor(){const key=window.prompt('请输入开发者模式密钥：','');if(key!=='123456wrx'){if(key!==null)alert('开发者密钥错误。');return;}mainDevLoadDraft();try{const ui=JSON.parse(localStorage.getItem('frontline_main_ui_v021')||'null');if(ui)mainDevApplyUIData(ui);}catch(e){}document.getElementById('mainDeveloperEditor')?.removeAttribute('hidden');mainDevFillContent();renderMainDevTree();}
function renderMainDevTree(){const box=document.getElementById('mainDevTree');if(!box)return;box.innerHTML='';CAMPAIGNS.forEach((t,ti)=>{const tb=document.createElement('button');tb.style.cssText='width:100%;text-align:left;margin:2px 0;font-weight:700';tb.textContent=`▾ ${t.name}`;tb.onclick=()=>selectMainDev('theater',ti);box.appendChild(tb);(t.phases||[]).forEach((ph,pi)=>{const pb=document.createElement('button');pb.style.cssText='width:calc(100% - 14px);margin-left:14px;text-align:left;margin-top:2px';pb.textContent=`└ ${ph.name}`;pb.onclick=()=>selectMainDev('phase',ti,pi);box.appendChild(pb);(ph.scenarios||[]).forEach((sc,si)=>{const sb=document.createElement('button');sb.style.cssText='width:calc(100% - 30px);margin-left:30px;text-align:left;margin-top:2px';sb.textContent=`• ${sc.name}`;sb.onclick=()=>selectMainDev('scenario',ti,pi,si);box.appendChild(sb);});});});}
function selectMainDev(type,ti,pi=null,si=null){mainDevSelection={type,ti,pi,si};const obj=type==='theater'?CAMPAIGNS[ti]:type==='phase'?CAMPAIGNS[ti].phases[pi]:CAMPAIGNS[ti].phases[pi].scenarios[si];const props=document.getElementById('mainDevProps');const common=`<label>名称</label><input id="mdName" value="${String(obj.name??'').replaceAll('"','&quot;')}" style="width:100%"><label>副标题/说明</label><input id="mdSubtitle" value="${String(obj.subtitle??'').replaceAll('"','&quot;')}" style="width:100%"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>模块宽度(px)<input id="mdWidth" type="number" value="${obj.ui?.width??''}" style="width:100%"></label><label>模块高度(px)<input id="mdHeight" type="number" value="${obj.ui?.height??''}" style="width:100%"></label></div>`;let extra='';if(type==='scenario')extra=`<label>日期</label><input id="mdDate" value="${obj.dateText??''}" style="width:100%"><label>地点</label><input id="mdLocation" value="${obj.location??''}" style="width:100%"><label>Scenario路径</label><input id="mdScenarioPath" value="${obj.scenarioPath??''}" style="width:100%"><label>Units路径</label><input id="mdUnitsPath" value="${obj.unitsPath??''}" style="width:100%"><label>状态</label><select id="mdStatus"><option value="available">available</option><option value="interface">interface</option><option value="locked">locked</option></select><label>移动到阶段</label><select id="mdParent"></select>`;props.innerHTML=`<h3>${type==='theater'?'战场':type==='phase'?'阶段':'战役'}属性</h3>${common}${extra}<div style="display:flex;gap:8px;margin-top:12px"><button id="mdApply">应用</button><button id="mdDelete">删除</button></div>`;if(type==='scenario'){document.getElementById('mdStatus').value=obj.status??'available';const sel=document.getElementById('mdParent');CAMPAIGNS.forEach((t,a)=>(t.phases||[]).forEach((ph,b)=>{const o=document.createElement('option');o.value=`${a}:${b}`;o.textContent=`${t.name} / ${ph.name}`;if(a===ti&&b===pi)o.selected=true;sel.appendChild(o);}));}document.getElementById('mdApply').onclick=applyMainDev;document.getElementById('mdDelete').onclick=deleteMainDev;}
function applyMainDev(){if(!mainDevSelection)return;let {type,ti,pi,si}=mainDevSelection;const obj=type==='theater'?CAMPAIGNS[ti]:type==='phase'?CAMPAIGNS[ti].phases[pi]:CAMPAIGNS[ti].phases[pi].scenarios[si];obj.name=document.getElementById('mdName').value;obj.subtitle=document.getElementById('mdSubtitle').value;obj.ui=obj.ui||{};const w=Number(document.getElementById('mdWidth').value),h=Number(document.getElementById('mdHeight').value);if(w)obj.ui.width=w;else delete obj.ui.width;if(h)obj.ui.height=h;else delete obj.ui.height;if(type==='scenario'){obj.dateText=document.getElementById('mdDate').value;obj.location=document.getElementById('mdLocation').value;obj.scenarioPath=document.getElementById('mdScenarioPath').value;obj.unitsPath=document.getElementById('mdUnitsPath').value;obj.status=document.getElementById('mdStatus').value;const [nti,npi]=document.getElementById('mdParent').value.split(':').map(Number);if(nti!==ti||npi!==pi){CAMPAIGNS[ti].phases[pi].scenarios.splice(si,1);CAMPAIGNS[nti].phases[npi].scenarios.push(obj);mainDevSelection=null;document.getElementById('mainDevProps').textContent='战役已移动。';}}renderMainDevTree();}
function deleteMainDev(){if(!mainDevSelection||!confirm('确定删除这个目录项目？'))return;const {type,ti,pi,si}=mainDevSelection;if(type==='scenario')CAMPAIGNS[ti].phases[pi].scenarios.splice(si,1);else if(type==='phase')CAMPAIGNS[ti].phases.splice(pi,1);else CAMPAIGNS.splice(ti,1);mainDevSelection=null;renderMainDevTree();document.getElementById('mainDevProps').textContent='已删除。';}
function addMainDev(kind){if(kind==='theater'){CAMPAIGNS.push({id:`theater_${Date.now()}`,name:'新战场',subtitle:'',phases:[]});}else if(kind==='phase'){const ti=mainDevSelection?.ti??0;if(!CAMPAIGNS[ti])return alert('请先选择战场。');CAMPAIGNS[ti].phases.push({id:`phase_${Date.now()}`,name:'新阶段',scenarios:[]});}else{const ti=mainDevSelection?.ti??0,pi=mainDevSelection?.pi??0;if(!CAMPAIGNS[ti]?.phases?.[pi])return alert('请先选择阶段。');CAMPAIGNS[ti].phases[pi].scenarios.push({id:`scenario_${Date.now()}`,name:'新战役',dateText:'',location:'',status:'interface',scenarioPath:'./data/scenario-new.json',unitsPath:'./data/units-new.json'});}renderMainDevTree();}
document.getElementById('mainDevClose')?.addEventListener('click',()=>document.getElementById('mainDeveloperEditor')?.setAttribute('hidden',''));document.getElementById('mainDevAddTheater')?.addEventListener('click',()=>addMainDev('theater'));document.getElementById('mainDevAddPhase')?.addEventListener('click',()=>addMainDev('phase'));document.getElementById('mainDevAddScenario')?.addEventListener('click',()=>addMainDev('scenario'));
document.getElementById('mainDevApplyContent')?.addEventListener('click',()=>{const d={tagline:document.getElementById('mainDevTagline')?.value??'',version:document.getElementById('mainDevVersionText')?.value??'',updateTitle:document.getElementById('mainDevUpdateTitle')?.value??'',updateDetail:document.getElementById('mainDevUpdateDetail')?.value??'',about:document.getElementById('mainDevAbout')?.value??''};mainDevApplyUIData(d);localStorage.setItem('frontline_main_ui_v021',JSON.stringify(d));alert('主界面内容已应用并保存为浏览器草稿。');});
document.getElementById('mainDevSave')?.addEventListener('click',()=>{localStorage.setItem(mainDevKey(),JSON.stringify(CAMPAIGNS));localStorage.setItem('frontline_main_ui_v021',JSON.stringify(mainDevUIData()));alert('主界面编辑草稿已保存。');});document.getElementById('mainDevExport')?.addEventListener('click',()=>devDownload('campaigns.json',{campaigns:CAMPAIGNS}));document.getElementById('mainDevExportUI')?.addEventListener('click',()=>devDownload('main-ui.json',mainDevUIData()));document.getElementById('mainDevReset')?.addEventListener('click',()=>{localStorage.removeItem(mainDevKey());localStorage.removeItem('frontline_main_ui_v021');location.reload();});

// ============================================================
// 启动：先选择战役，再选择阵营
// ============================================================
resizeCanvas();
render();
bindGameSettingsUI();
initializeMainMenu();

// V0.3 刷新恢复：游戏进行中每10秒保存当前快照，并在页面离开前再写一次。
setInterval(()=>{try{if(turnSystem&&Array.isArray(units)&&units.length&&currentScenarioKey)saveSystem.saveResume({units,turnSystem,gameState,gameOver,scenario,world});}catch(e){}},10000);
window.addEventListener('beforeunload',()=>{try{if(turnSystem&&Array.isArray(units)&&units.length&&currentScenarioKey)saveSystem.saveResume({units,turnSystem,gameState,gameOver,scenario,world});}catch(e){}});


// ============================================================
// 开发者地图编辑器 v0.15
// 正式数据通过“导出战役 JSON / 导出单位 JSON”更新，不直接写源文件。
// ============================================================
let devWallStart = null;
let devUnitToMove = null;
function devStatus(text){const e=document.getElementById('devEditorStatus');if(e)e.textContent=text;}
function devHexKey(q,r){return `${Number(q)},${Number(r)}`;}
function devAdjacent(a,b){const dq=Number(b.q)-Number(a.q),dr=Number(b.r)-Number(a.r);return [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].some(d=>d[0]===dq&&d[1]===dr);}
function devSameEdge(e,a,b){const f=e?.from??{},t=e?.to??{};return (Number(f.q)===Number(a.q)&&Number(f.r)===Number(a.r)&&Number(t.q)===Number(b.q)&&Number(t.r)===Number(b.r))||(Number(f.q)===Number(b.q)&&Number(f.r)===Number(b.r)&&Number(t.q)===Number(a.q)&&Number(t.r)===Number(a.r));}
// ============================================================
// 开发者模式：空军 / 直升机 / 导弹支援卡组编辑器
// 写入 scenario.airSupport，导出战役 JSON 后永久保存。
// ============================================================
function devSupportGroup(id){
    id=String(id??'');
    if(id.startsWith('missile_'))return '导弹支援';
    if(id.startsWith('helo_'))return '直升机支援';
    return '空军支援';
}
function devSupportEnsureScenario(){
    scenario.airSupport=scenario.airSupport&&typeof scenario.airSupport==='object'?scenario.airSupport:{};
    return scenario.airSupport;
}
function devSupportRender(){
    const box=document.getElementById('devSupportCards');if(!box)return;
    const side=document.getElementById('devSupportSide')?.value??'red';
    const cfg=scenario?.airSupport?.[side]??{};
    const deck=AIR_SUPPORT_DECKS[cfg.deckId];
    const selected=new Set(Array.isArray(cfg.cards)?cfg.cards:(deck?.cards??[]));
    const groups=['空军支援','直升机支援','导弹支援'];
    box.innerHTML='';
    for(const group of groups){
      const ids=Object.keys(AIR_SUPPORT_CARDS).filter(id=>devSupportGroup(id)===group);
      if(!ids.length)continue;
      const title=document.createElement('div');title.textContent=group;title.style.cssText='font-weight:700;margin:5px 0';box.appendChild(title);
      for(const id of ids){
        const c=AIR_SUPPORT_CARDS[id], row=document.createElement('label');row.style.cssText='display:grid;grid-template-columns:22px 1fr 64px;gap:4px;align-items:center;margin:3px 0';
        const checked=selected.has(id)?'checked':'';const uses=Math.max(0,Number(cfg.uses?.[id]??c.uses??1));
        row.innerHTML=`<input type="checkbox" data-support-card="${id}" ${checked}><span>${c.name}</span><input type="number" min="0" max="99" value="${uses}" data-support-uses="${id}" title="可用次数">`;
        box.appendChild(row);
      }
    }
}
function devSupportSave(){
    const side=document.getElementById('devSupportSide')?.value??'red', root=devSupportEnsureScenario();
    const checks=[...document.querySelectorAll('#devSupportCards [data-support-card]')];
    const cards=checks.filter(x=>x.checked).map(x=>x.dataset.supportCard),uses={};
    for(const id of cards){const el=document.querySelector(`#devSupportCards [data-support-uses="${id}"]`);uses[id]=Math.max(0,Number(el?.value??AIR_SUPPORT_CARDS[id]?.uses??1));}
    root[side]={...(root[side]??{}),enabled:cards.length>0,deckId:'scenario_custom',cards,uses};
    airSupportSystem.configure(scenario);renderAirSupportPanel();devStatus(`已保存 ${side} 支援卡组：${cards.length} 张卡。导出战役JSON即可永久保存。`);
}
function devSupportClear(){
    const side=document.getElementById('devSupportSide')?.value??'red', root=devSupportEnsureScenario();
    root[side]={enabled:false,deckId:'scenario_custom',cards:[],uses:{}};
    airSupportSystem.configure(scenario);devSupportRender();renderAirSupportPanel();devStatus(`已清空 ${side} 支援卡组。`);
}
document.getElementById('devSupportSide')?.addEventListener('change',devSupportRender);
document.getElementById('devSupportLoad')?.addEventListener('click',devSupportRender);
document.getElementById('devSupportSave')?.addEventListener('click',devSupportSave);
document.getElementById('devSupportClear')?.addEventListener('click',devSupportClear);

function devSyncMap(){
 const map=scenario?.map ?? world?.scenario?.map; if(!map)return null;
 map.terrain=Array.from(world.specialTerrain?.entries?.()??[]).map(([k,type])=>{const [q,r]=k.split(',').map(Number);return {q,r,type};}).filter(x=>x.type!=='plain');
 map.settlements=JSON.parse(JSON.stringify(world.settlements??map.settlements??[]));
 // Developer editor persistence: export every runtime engineering layer, not only forts/walls.
 map.fortifications=JSON.parse(JSON.stringify(world.fortifications??[]));
 map.minefields=JSON.parse(JSON.stringify(world.minefields??[]));
 map.bridges=JSON.parse(JSON.stringify(world.bridges??world?.config?.bridges??map.bridges??[]));
 map.wallEdges=JSON.parse(JSON.stringify(world.wallEdges??[]));
 map.gates=JSON.parse(JSON.stringify(world.gates??[]));
 // Keep runtime references aligned with the just-synchronised scenario map so subsequent
 // add/remove operations and repeated exports always operate on the same bridge arrays.
 world.bridges=map.bridges;
 world.minefields=map.minefields;
 return map;
}
function devPrompt(label,value=''){const v=window.prompt(label,String(value??''));return v===null?null:v.trim();}
function devPickSide(current='red'){const raw=devPrompt('阵营：red / blue / chinese / japanese / soviet / german / allied / rok_government / new_military',current);return raw||null;}
function devRefreshScenarioUI(){devSyncMap();strategicObjectives.setScenario(scenario);reinforcementSystem.initialize(units,turnSystem?.turn??1);updateReinforcementUI();render();}
function devSettlementAt(hex){return (world.settlements??[]).find(x=>Number(x.q)===Number(hex.q)&&Number(x.r)===Number(hex.r));}
function devEditPlaceName(hex){
 world.settlements=Array.isArray(world.settlements)?world.settlements:[]; let x=devSettlementAt(hex);
 if(x){const name=devPrompt('地名（留空并确认可删除该地名）：',x.nameZh??x.name??'');if(name===null)return;if(!name){if(confirm('删除这个地名？'))world.settlements=world.settlements.filter(v=>v!==x);else return;}else{x.name=name;x.nameZh=name;const type=devPrompt('类型：city / town / village / hill / station / port',x.type??'town');if(type!==null&&type)x.type=type;}}
 else {const name=devPrompt(`在 (${hex.q}, ${hex.r}) 新建地名：`,'');if(!name)return;const type=devPrompt('类型：city / town / village / hill / station / port','town')||'town';world.settlements.push({id:`place_${hex.q}_${hex.r}`,name,nameZh:name,q:Number(hex.q),r:Number(hex.r),type});}
 devSyncMap();devStatus(`已更新 (${hex.q}, ${hex.r}) 地名。`);render();
}
function devEditNode(hex){
 world.settlements=Array.isArray(world.settlements)?world.settlements:[]; let x=devSettlementAt(hex);
 if(!x){const name=devPrompt(`重要节点名称 (${hex.q}, ${hex.r})：`,'重要节点');if(!name)return;x={id:`node_${hex.q}_${hex.r}`,name,nameZh:name,q:Number(hex.q),r:Number(hex.r),type:'objective'};world.settlements.push(x);}
 const action=devPrompt('重要节点：输入 on 标记，off 取消；也可直接修改名称',x.strategicObjective?'on':'on');if(action===null)return;
 if(action.toLowerCase()==='off'){x.strategicObjective=false;devStatus(`${x.nameZh??x.name} 已取消重要节点标记。`);}else{x.strategicObjective=true;if(action&&action.toLowerCase()!=='on'){x.name=action;x.nameZh=action;}devStatus(`${x.nameZh??x.name} 已设为重要节点。`);}devSyncMap();render();
}
function devEditObjective(hex){
 scenario.strategicObjectives=scenario.strategicObjectives&&typeof scenario.strategicObjectives==='object'?scenario.strategicObjectives:{};
 const side=devPickSide('chinese');if(!side)return;scenario.strategicObjectives[side]=Array.isArray(scenario.strategicObjectives[side])?scenario.strategicObjectives[side]:[];
 const arr=scenario.strategicObjectives[side];let o=arr.find(x=>Number(x.q)===Number(hex.q)&&Number(x.r)===Number(hex.r));
 if(o&&confirm(`这里已有目标“${o.title??o.name??o.id}”。确定=编辑，取消=删除/退出选择。` )===false){if(confirm('删除这个战术目标？'))arr.splice(arr.indexOf(o),1);else return;devRefreshScenarioUI();devStatus('已删除战术目标。');return;}
 const title=devPrompt('战术目标标题：',o?.title??'');if(!title)return;const description=devPrompt('目标说明：',o?.description??'')??(o?.description??'');const priority=devPrompt('优先级：primary / secondary / optional',o?.priority??'secondary')||'secondary';const action=devPrompt('行动：capture / defend / survive',o?.action??(side==='chinese'?'defend':'capture'))||'capture';const dl=devPrompt('截止回合（留空=无截止）：',o?.deadlineTurn??'');
 const data={...(o??{}),id:o?.id??`dev_obj_${side}_${Date.now()}`,title,description,priority,action,q:Number(hex.q),r:Number(hex.r)};if(dl)data.deadlineTurn=Math.max(1,Number(dl)||1);else delete data.deadlineTurn;if(o)Object.assign(o,data);else arr.push(data);devRefreshScenarioUI();devStatus(`已更新${side}战术目标：${title}`);
}
let devReinfEditingUnit=null, devReinfClickedHex=null, devUnitInitialMode=false;
const DEV_UNIT_TEMPLATES={
 infantry:{strength:500,attack:60,defense:55,movement:4,range:1,morale:70,ammo:100},guard:{strength:600,attack:72,defense:70,movement:4,range:1,morale:85,ammo:100},engineer:{strength:350,attack:52,defense:58,movement:4,range:1,morale:75,ammo:90},machinegun:{strength:220,attack:68,defense:72,movement:3,range:2,morale:72,ammo:100},artillery:{strength:300,attack:90,defense:30,movement:3,range:4,morale:70,ammo:80},antitank:{strength:220,attack:82,defense:42,movement:3,range:2,morale:72,ammo:80},anti_air:{strength:200,attack:55,defense:38,movement:3,range:3,morale:70,ammo:85},recon:{strength:180,attack:38,defense:35,movement:7,range:1,morale:75,ammo:85},cavalry:{strength:420,attack:58,defense:45,movement:7,range:1,morale:72,ammo:90},motorized:{strength:500,attack:68,defense:55,movement:7,range:1,morale:75,ammo:95},armor:{strength:300,attack:88,defense:82,movement:6,range:2,morale:80,ammo:85},tank:{strength:320,attack:96,defense:88,movement:6,range:2,morale:82,ammo:85},headquarters:{strength:180,attack:20,defense:38,movement:5,range:1,morale:85,ammo:70}
};
function devNum(id,fallback=0){const n=Number(document.getElementById(id)?.value);return Number.isFinite(n)?n:fallback;}
function devApplyUnitTemplate(){const t=DEV_UNIT_TEMPLATES[document.getElementById('devReinfType')?.value]??DEV_UNIT_TEMPLATES.infantry;for(const [id,k] of [['devReinfStrength','strength'],['devReinfMaxStrength','strength'],['devReinfAttack','attack'],['devReinfDefense','defense'],['devReinfMovement','movement'],['devReinfRange','range'],['devReinfMorale','morale'],['devReinfAmmo','ammo']]){const e=document.getElementById(id);if(e)e.value=t[k];}}
document.getElementById('devReinfType')?.addEventListener('change',devApplyUnitTemplate);document.getElementById('devReinfDefaults')?.addEventListener('click',devApplyUnitTemplate);
function devObjectiveChoices(){
 const out=[['nearest_enemy','最近敌军']]; const so=scenario?.strategicObjectives??{};
 for(const [side,arr] of Object.entries(so)) if(Array.isArray(arr)) for(const o of arr) if(o?.q!=null) out.push([`hex:${o.q},${o.r}`,`${o.title??o.name??o.id} (${o.q},${o.r})`]);
 for(const x of (world?.settlements??[])) out.push([`hex:${x.q},${x.r}`,`${x.nameZh??x.name??'地名/节点'} (${x.q},${x.r})`]);
 return out;
}
function devOpenReinforcementEditor(clickedUnit,hex,initialMode=false){
 const panel=document.getElementById('devReinforcementEditor'); if(!panel)return; devUnitInitialMode=initialMode;
 devReinfEditingUnit=clickedUnit??null; devReinfClickedHex=hex?{q:Number(hex.q),r:Number(hex.r)}:null;
 const u=clickedUnit??{}; const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
 document.getElementById('devUnitEditorTitle').textContent=initialMode?'正面战场单位编辑器':'战术增援单位编辑器';
 set('devReinfName',u.name??u.fullName??(initialMode?'新部署单位':'新增援单位'));set('devReinfType',u.type??'infantry');set('devReinfScale',u.scale??u.unitScale??'battalion');set('devReinfCommander',u.commander?.name??u.commanderName??'');set('devReinfCommanderRank',u.commander?.rank??u.commanderRank??'');set('devReinfFaction',u.faction??'chinese');
 if(clickedUnit){set('devReinfStrength',u.strength??100);set('devReinfMaxStrength',u.maxStrength??u.strength??100);set('devReinfAttack',u.attack??10);set('devReinfDefense',u.defense??10);set('devReinfMovement',u.movement??4);set('devReinfRange',u.range??1);set('devReinfMorale',u.morale??80);set('devReinfAmmo',u.ammo??100);}else devApplyUnitTemplate();
 set('devReinfTurn',initialMode?1:(u.reinforcementTurn??Math.max(2,(turnSystem?.turn??1)+1)));set('devReinfEntry',u.entryPoint?'point':(u.entryZone??'AUTO'));set('devReinfMission',u.mission??u.orderType??'attack');set('devReinfGroupName',u.reinforcementName??'战术增援');set('devReinfDetail',u.reinforcementDetail??'');
 const sel=document.getElementById('devReinfTarget');sel.innerHTML='';for(const [v,t] of devObjectiveChoices()){const o=document.createElement('option');o.value=v;o.textContent=t;sel.appendChild(o);} const target=u.missionTarget??u.attackTarget;if(target?.q!=null){const v=`hex:${target.q},${target.r}`;if(![...sel.options].some(o=>o.value===v)){const o=document.createElement('option');o.value=v;o.textContent=`指定目标 (${target.q},${target.r})`;sel.appendChild(o);}sel.value=v;}else sel.value='nearest_enemy';
 panel.hidden=false;devStatus(clickedUnit?`正在编辑单位：${unitName(clickedUnit)}`:`在 (${hex.q}, ${hex.r}) 新建${initialMode?'正面战场':'增援'}单位。`);
}
function devSaveReinforcementEditor(){
 let u=devReinfEditingUnit; if(!u){u={id:`DEV_UNIT_${Date.now()}`,q:devReinfClickedHex?.q??1,r:devReinfClickedHex?.r??1,suppression:0,fatigue:0};units.push(u);gameState.units=units;}
 const val=id=>document.getElementById(id)?.value;u.name=val('devReinfName')||'单位';u.fullName=u.name;u.type=val('devReinfType')||'infantry';u.scale=val('devReinfScale')||'battalion';u.unitScale=u.scale;u.commander={name:val('devReinfCommander')||'',rank:val('devReinfCommanderRank')||''};u.faction=val('devReinfFaction')||'chinese';u.strength=Math.max(1,devNum('devReinfStrength',100));u.maxStrength=Math.max(u.strength,devNum('devReinfMaxStrength',u.strength));u.attack=Math.max(0,devNum('devReinfAttack',10));u.defense=Math.max(0,devNum('devReinfDefense',10));u.movement=Math.max(0,devNum('devReinfMovement',4));u.movementPoints=u.movement;u.maxMovementPoints=u.movement;u.range=Math.max(1,devNum('devReinfRange',1));u.morale=Math.max(0,Math.min(100,devNum('devReinfMorale',80)));u.ammo=Math.max(0,Math.min(100,devNum('devReinfAmmo',100)));u.mission=val('devReinfMission')||'attack';
 const target=val('devReinfTarget');if(target?.startsWith('hex:')){const [q,r]=target.slice(4).split(',').map(Number);u.missionTarget={q,r};if(u.mission==='attack')u.attackTarget={q,r};else delete u.attackTarget;}else{delete u.missionTarget;delete u.attackTarget;}
 const arrival=Math.max(1,devNum('devReinfTurn',1)); if(arrival<=1){for(const k of ['reinforcementGroup','reinforcementTurn','reinforcementName','reinforcementDetail','entryZone','entryPoint','entryRadius','requiresFriendlyAt'])delete u[k];u.offMap=false;if(devReinfClickedHex){u.q=devReinfClickedHex.q;u.r=devReinfClickedHex.r;}}
 else{u.reinforcementGroup=u.reinforcementGroup||`DEV_REINF_${Date.now()}`;u.reinforcementTurn=arrival;u.reinforcementName=val('devReinfGroupName')||'战术增援';u.reinforcementDetail=val('devReinfDetail')||'';const entry=val('devReinfEntry')||'AUTO';if(entry==='point'){u.entryPoint={...(devReinfClickedHex??{q:u.q,r:u.r})};delete u.entryZone;}else{u.entryZone=entry;delete u.entryPoint;}u.offMap=Number(turnSystem?.turn??1)<arrival;}
 reinforcementSystem.initialize(units,turnSystem?.turn??1);updateReinforcementUI();document.getElementById('devReinforcementEditor').hidden=true;devStatus(`已保存：${u.name}；出现回合 ${arrival}；任务 ${u.mission}。`);render();
}
function devDeleteReinforcementEditor(){const u=devReinfEditingUnit;if(u){const i=units.indexOf(u);if(confirm(`删除单位“${unitName(u)}”？`)&&i>=0)units.splice(i,1);}document.getElementById('devReinforcementEditor').hidden=true;reinforcementSystem.initialize(units,turnSystem?.turn??1);updateReinforcementUI();render();}
document.getElementById('devReinfClose')?.addEventListener('click',()=>document.getElementById('devReinforcementEditor').hidden=true);document.getElementById('devReinfSave')?.addEventListener('click',devSaveReinforcementEditor);document.getElementById('devReinfDelete')?.addEventListener('click',devDeleteReinforcementEditor);
function devEditReinforcement(clickedUnit,hex){devOpenReinforcementEditor(clickedUnit,hex,false);}

function developerEditorHandleClick(event,clickedUnit,clickedHex){
 const tool=document.getElementById('devTool')?.value??'unit'; const hex=clickedHex??mouseToHex(event); if(!hex)return false;
 if(tool==='deployment'){devOpenReinforcementEditor(clickedUnit,hex,true);return true;} if(tool==='placename'){devEditPlaceName(hex);return true;} if(tool==='node'){devEditNode(hex);return true;} if(tool==='objective'){devEditObjective(hex);return true;} if(tool==='reinforcement'){devEditReinforcement(clickedUnit,hex);return true;}
 if(tool==='unit'){if(clickedUnit){devUnitToMove=clickedUnit;selectUnit(clickedUnit);devStatus(`已选择 ${unitName(clickedUnit)}；点击任意空格直接移动。`);render();return true;}if(devUnitToMove){const occupied=unitAtHex(hex.q,hex.r);if(occupied&&occupied!==devUnitToMove){devStatus('目标格已有单位。');return true;}devUnitToMove.q=Number(hex.q);devUnitToMove.r=Number(hex.r);selectedHex={q:Number(hex.q),r:Number(hex.r)};devStatus(`${unitName(devUnitToMove)} → (${hex.q}, ${hex.r})`);showUnitInfo(devUnitToMove);render();return true;}devStatus('先点击任意一方算子，再点击目标格。');return true;}
 if(tool==='terrain'){const type=document.getElementById('devTerrain')?.value??'plain';if(type==='plain')world.specialTerrain.delete(devHexKey(hex.q,hex.r));else world.specialTerrain.set(devHexKey(hex.q,hex.r),type);devSyncMap();devStatus(`(${hex.q}, ${hex.r}) 地形 → ${type}`);render();return true;}
 if(tool==='fort'){
  world.fortifications=Array.isArray(world.fortifications)?world.fortifications:[];
  world.minefields=Array.isArray(world.minefields)?world.minefields:[];
  const q=Number(hex.q),r=Number(hex.r),type=document.getElementById('devFortType')?.value??'foxhole';
  const fortIndex=world.fortifications.findIndex(f=>Number(f.q)===q&&Number(f.r)===r);
  const mineIndex=world.minefields.findIndex(f=>Number(f.q)===q&&Number(f.r)===r);
  if(type==='delete'){
    if(fortIndex>=0)world.fortifications.splice(fortIndex,1);
    if(mineIndex>=0)world.minefields.splice(mineIndex,1);
    const bridges=(world.bridges??world.scenario?.map?.bridges??scenario?.map?.bridges);if(Array.isArray(bridges)){for(let i=bridges.length-1;i>=0;i--)if(Number(bridges[i].q)===q&&Number(bridges[i].r)===r)bridges.splice(i,1);}
    devStatus(`已删除 (${q}, ${r}) 的工事/雷区/浮桥。`);devSyncMap();render();return true;
  }
  if(type==='minefield'){
    if(mineIndex>=0)world.minefields.splice(mineIndex,1);else world.minefields.push({q,r,owner:null,strength:100,discoveredBy:[]});
    devStatus(`${mineIndex>=0?'删除':'布设'} (${q}, ${r}) 雷区`);devSyncMap();render();return true;
  }
  if(type==='pontoon'){
    const terrain=String(world?.terrainAt?.(q,r)??'').toLowerCase();if(terrain!=='water'){devStatus('浮桥只能直接放置在 water 水域格。');return true;}
    const bridges=world.bridges??world.scenario?.map?.bridges??scenario?.map?.bridges??[];if(!world.bridges)world.bridges=bridges;
    const i=bridges.findIndex(b=>Number(b.q)===q&&Number(b.r)===r);if(i>=0){bridges.splice(i,1);devStatus(`已删除 (${q}, ${r}) 浮桥。`);}else{bridges.push({id:`dev_pontoon_${q}_${r}`,q,r,name:'开发者浮桥',bridgeClass:'pontoon',capacity:'light',orientation:'auto',crossingCells:[[q,r]],status:'intact',constructedBy:'developer'});devStatus(`已在 (${q}, ${r}) 架设浮桥。`);}devSyncMap();render();return true;
  }
  if(type==='field_wall'){
    if(!devWallStart){devWallStart={q,r};devStatus(`野战防御墙起点 (${q}, ${r})；再点一个相邻格。`);return true;}
    const a=devWallStart,b={q,r};devWallStart=null;if(!devAdjacent(a,b)){devStatus('两格不相邻，未修建防御墙。');return true;}
    world.wallEdges=Array.isArray(world.wallEdges)?world.wallEdges:[];const i=world.wallEdges.findIndex(e=>devSameEdge(e,a,b));if(i>=0){world.wallEdges.splice(i,1);devStatus('已删除野战防御墙。');}else{world.wallEdges.push({from:a,to:b,type:'field_wall',name:'野战防御墙',owner:null,hp:110,maxHp:110,integrity:100,status:'intact',breach:false,constructedBy:'developer'});devStatus('已修建野战防御墙。');}devSyncMap();render();return true;
  }
  const cfg={foxhole:{name:'散兵坑',level:1,hp:30},trench:{name:'战壕',level:2,hp:60},strongpoint:{name:'加强阵地',level:3,hp:90},bunker:{name:'碉堡',level:3,hp:150},aa_position_1:{name:'一级防空阵地',level:1,hp:50,aa:1},aa_position_2:{name:'二级防空阵地',level:2,hp:80,aa:2},aa_position_3:{name:'三级防空阵地',level:3,hp:120,aa:3}}[type]??{name:'野战工事',level:Math.max(1,Math.min(3,Number(document.getElementById('devFortLevel')?.value)||1)),hp:75};
  if(fortIndex>=0)world.fortifications.splice(fortIndex,1);
  const f={q,r,type,level:cfg.level,progress:100,owner:null,maxHp:cfg.hp,hp:cfg.hp,integrity:100,status:'intact'};
  if(cfg.aa){f.airDefensePosition=true;f.protection=[0,.10,.25,.40][cfg.aa];f.accuracyBonus=[0,.05,.10,.15][cfg.aa];}
  world.fortifications.push(f);devStatus(`已在 (${q}, ${r}) 建立${cfg.name}。`);devSyncMap();render();return true;
 }
 if(tool==='wall'||tool==='gate'){if(!devWallStart){devWallStart={q:Number(hex.q),r:Number(hex.r)};devStatus(`起点 (${hex.q}, ${hex.r})；再点一个相邻格。`);return true;}const a=devWallStart,b={q:Number(hex.q),r:Number(hex.r)};devWallStart=null;if(!devAdjacent(a,b)){devStatus('两格不相邻，未修改。');return true;}world.wallEdges=Array.isArray(world.wallEdges)?world.wallEdges:[];world.gates=Array.isArray(world.gates)?world.gates:[];if(tool==='wall'){const i=world.wallEdges.findIndex(e=>devSameEdge(e,a,b));if(i>=0){world.wallEdges.splice(i,1);world.gates=world.gates.filter(g=>!devSameEdge(g,a,b));devStatus('已删除城墙边。');}else{world.wallEdges.push({from:a,to:b});devStatus('已建立城墙边。');}}else{if(!world.wallEdges.some(e=>devSameEdge(e,a,b)))world.wallEdges.push({from:a,to:b});const i=world.gates.findIndex(g=>devSameEdge(g,a,b));if(i>=0){world.gates.splice(i,1);devStatus('城门关闭：恢复城墙。');}else{const name=devPrompt('城门名称：','城门')||'城门';world.gates.push({id:`gate_${a.q}_${a.r}_${b.q}_${b.r}`,name,nameZh:name,from:a,to:b,open:true,type:'gate'});devStatus(`城门开放：${name}`);}}devSyncMap();render();return true;}
 return false;
}
function devDownload(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);}
function devDraftKey(){return `frontline_dev_${currentScenarioKey??scenario?.id??'scenario'}`;}
function devSnapshot(){devSyncMap();return {scenario:JSON.parse(JSON.stringify(scenario)),units:JSON.parse(JSON.stringify(units))};}
function devApplyDraft(d){if(!d?.scenario||!Array.isArray(d.units))return false;scenario=d.scenario;units=d.units;gameState.units=units;world.loadScenario?.(scenario);strategicObjectives.setScenario(scenario);reinforcementSystem.initialize(units,turnSystem?.turn??1);updateReinforcementUI();clearSelection();devUnitToMove=null;devWallStart=null;render();return true;}
document.getElementById('devTool')?.addEventListener('change',()=>{devWallStart=null;devUnitToMove=null;devStatus('工具已切换。');});
document.getElementById('devExitMode')?.addEventListener('click',()=>{document.getElementById('devReinforcementEditor')?.setAttribute('hidden','');gameState.setObserverMode();clearSelection();devUnitToMove=null;devWallStart=null;updateDeveloperPanel();render();});
document.getElementById('devSaveDraft')?.addEventListener('click',()=>{localStorage.setItem(devDraftKey(),JSON.stringify(devSnapshot()));devStatus('编辑已保存为浏览器草稿。正式更新请导出 JSON。');});
document.getElementById('devLoadDraft')?.addEventListener('click',()=>{try{const d=JSON.parse(localStorage.getItem(devDraftKey())||'null');devStatus(devApplyDraft(d)?'已读取开发者编辑。':'没有找到编辑存档。');}catch(e){devStatus('读取失败：'+e.message);}});
document.getElementById('devExportScenario')?.addEventListener('click',()=>{devSyncMap();devDownload(`scenario-${currentScenarioKey??scenario?.id??'edited'}.json`,scenario);devStatus('已导出战役 JSON（含地名、重要节点、战术目标、地形、工事、城墙/城门）。');});
document.getElementById('devExportUnits')?.addEventListener('click',()=>{devDownload(`units-${currentScenarioKey??scenario?.id??'edited'}.json`,units);devStatus('已导出单位 JSON（含单位位置与战术增援设置）。');});

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingEngineeringAction){pendingEngineeringAction=null;pendingEngineeringUnitId=null;writeBattleMessage('已取消工程目标选择');refreshEngineerActions();render();}});

window.addEventListener("keydown",e=>{if(e.key==="Escape"&&pendingSpecialAirDropUnitId){cancelSpecialAirDrop();}});

// AI 数据实验室：长期采集/导出玩家指挥行为
(function installAIDataLab(){
  const btn=document.createElement('button'); btn.id='ai-data-lab-button'; btn.textContent='AI数据'; btn.title='查看/导出指挥训练数据';
  Object.assign(btn.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:9999,padding:'9px 14px',background:'#26352c',color:'#f4efd8',border:'1px solid #b8ad83',cursor:'pointer'});
  btn.onclick=()=>{const st=commandDataLogger.stats();const text=`AI指挥学习记录 v2\n\n记录：${st.records}\n会话：${st.sessions}\n移动：${st.byAction.MOVE||0}\n攻击：${st.byAction.ATTACK||0}\n工程：${st.byAction.ENGINEER||0}\n空中/导弹支援：${st.byAction.AIR_SUPPORT||0}\n空降：${st.byAction.AIRDROP||0}\n运输：${st.byAction.TRANSPORT||0}\n回合快照：${st.byAction.TURN_SNAPSHOT||0}\n\n确定：导出训练 JSONL\n取消：继续游戏`;if(confirm(text))commandDataLogger.download();};
  document.body.appendChild(btn);
})();
