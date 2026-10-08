// src/ui/CampaignSelection.js

import { CAMPAIGNS } from "../../data/campaigns.js";

 

export class CampaignSelection {

    constructor() {

        this.overlay = null;

        this.theater = null;

        this.phase = null;

        this.onScenarioSelected = null;
        this.onMainMenu = null;
        this.onReturnToBattle = null;
        this.hasActiveBattle = false;
        this._escHandler = (event) => { if (event.key === "Escape" && this.overlay) this.returnOut(); };
        document.addEventListener("keydown", this._escHandler);
    }

    show(onScenarioSelected, options = {}) {
        this.onScenarioSelected = onScenarioSelected;
        this.onMainMenu = options.onMainMenu ?? null;
        this.onReturnToBattle = options.onReturnToBattle ?? null;
        this.hasActiveBattle = !!options.hasActiveBattle;
        this.renderTheaters();
    }

    returnOut() {
        this.close();
        if (this.hasActiveBattle && this.onReturnToBattle) this.onReturnToBattle();
        else this.onMainMenu?.();
    }

 

    close() {

        this.overlay?.remove();

        this.overlay = null;

    }

 

    ensureOverlay() {

        this.close();

        this.overlay = document.createElement("div");

        this.overlay.id = "campaign-selection";

        Object.assign(this.overlay.style, {

            position: "fixed", inset: "0", zIndex: "100000",

            background: "rgba(28,31,26,.94)",

            display: "flex", alignItems: "center", justifyContent: "center",

            fontFamily: "FangSong, STFangsong, SimSun, serif"

        });

        document.body.appendChild(this.overlay);

        return this.overlay;

    }

 

    shell(title, subtitle, body, back = "") {

        const overlay = this.ensureOverlay();

        overlay.innerHTML = `

            <div style="width:min(980px,calc(100vw - 48px));max-height:90vh;overflow:auto;

                padding:32px 38px;box-sizing:border-box;background:#d6cfb2;color:#24251f;

                border:2px solid #5a5646;outline:1px solid #c6b98b;outline-offset:-8px;">

                <h1 style="margin:0;text-align:center;font-size:34px;letter-spacing:.12em;">${title}</h1>

                <div style="margin:8px 0 28px;text-align:center;color:#666253;">${subtitle}</div>

                ${body}

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;">
                  ${back ? `<button id="campaign-back" style="padding:9px 18px;">← 返回上一级</button>` : ""}
                  <button id="campaign-main" style="padding:9px 18px;">返回主界面</button>
                  ${this.hasActiveBattle ? `<button id="campaign-battle" style="padding:9px 18px;">返回当前战役</button>` : ""}
                </div>
            </div>`;

        if (back) overlay.querySelector("#campaign-back").onclick = back;
        overlay.querySelector("#campaign-main").onclick = () => { this.close(); this.onMainMenu?.(); };
        overlay.querySelector("#campaign-battle")?.addEventListener("click", () => { this.close(); this.onReturnToBattle?.(); });

        return overlay;

    }

 

    renderTheaters() {

        const cards = CAMPAIGNS.filter(Boolean).map(item => `

            <button data-theater="${item.id}" style="min-height:${item.ui?.height ?? 150}px;${item.ui?.width ? `width:${item.ui.width}px;` : ''}padding:20px;

                border:1px solid #696553;background:#c8c1a4;cursor:pointer;font:inherit;text-align:left;">

                <strong style="display:block;font-size:26px;margin-bottom:10px;">${item.name}</strong>

                <span>${item.subtitle}</span>

            </button>`).join("");

 

        const overlay = this.shell(

            "选择战场",

            "1937–1945 主战役 · 特殊战役合集",

            `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">${cards}</div>`

        );

 

        overlay.querySelectorAll("[data-theater]").forEach(button => {

            button.onclick = () => {

                this.rootTheater = null;
                this.theater = CAMPAIGNS.find(x => x?.id === button.dataset.theater);
                if (Array.isArray(this.theater?.subtheaters) && this.theater.subtheaters.length) this.renderSubtheaters();
                else this.renderPhases();

            };

        });

    }

 

    renderSubtheaters() {
        const rootTheater = this.theater;
        const cards = rootTheater.subtheaters.map(item => `
            <button data-subtheater="${item.id}" style="min-height:${item.ui?.height ?? 150}px;padding:20px;
                border:1px solid #696553;background:#c8c1a4;cursor:pointer;font:inherit;text-align:left;">
                <strong style="display:block;font-size:26px;margin-bottom:10px;">${item.name}</strong>
                <span>${item.subtitle ?? ""}</span>
            </button>`).join("");
        const overlay = this.shell(
            rootTheater.name,
            "选择欧洲战区",
            `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">${cards}</div>`,
            () => { this.theater = rootTheater; this.renderTheaters(); }
        );
        overlay.querySelectorAll("[data-subtheater]").forEach(button => {
            button.onclick = () => {
                const sub = rootTheater.subtheaters.find(x => x.id === button.dataset.subtheater);
                this.rootTheater = rootTheater;
                this.theater = sub;
                this.renderPhases();
            };
        });
    }

    renderPhases() {

        const phases = Array.isArray(this.theater?.phases) ? this.theater.phases : [];
        const cards = phases.filter(Boolean).map(item => `

            <button data-phase="${item.id}" style="min-height:${item.ui?.height ?? 110}px;${item.ui?.width ? `width:${item.ui.width}px;` : ''}padding:18px;

                border:1px solid #696553;background:#c8c1a4;cursor:pointer;font:inherit;text-align:left;">

                <strong style="font-size:21px;">${item.name}</strong>

                <div style="margin-top:10px;color:#625e50;">

                    ${(item.scenarios ?? []).some(s => s?.status === "available") ? "可进入" : ((item.scenarios ?? []).some(s => s?.status === "interface") ? "战役接口已建立" : "尚未开放")}

                </div>

            </button>`).join("");

 

        const overlay = this.shell(

            this.theater.name,

            "选择战役阶段",

            `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;">${cards}</div>`,

            () => {
                if (this.rootTheater?.subtheaters?.includes(this.theater)) {
                    const root = this.rootTheater;
                    this.theater = root;
                    this.rootTheater = null;
                    this.renderSubtheaters();
                } else this.renderTheaters();
            }

        );

 

        overlay.querySelectorAll("[data-phase]").forEach(button => {

            button.onclick = () => {

                this.phase = (this.theater?.phases ?? []).find(x => x?.id === button.dataset.phase);

                this.renderScenarios();

            };

        });

    }

 

    renderScenarios() {

        const scenarios = Array.isArray(this.phase?.scenarios) ? this.phase.scenarios : [];
        const list = scenarios.length

            ? scenarios.filter(Boolean).map(item => {

                let progress = {};
                try { progress = JSON.parse(localStorage.getItem("frontline_campaign_progress") || "{}")[item.id] || {}; } catch {}
                const progressBadge = progress.completed === true
                    ? `<span style="display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid #68705a;background:#d8ddc2;color:#35402f;font-size:13px;">★ 已完成</span>`
                    : progress.lastResult === "defeat"
                        ? `<span style="display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid #8b665f;background:#decac1;color:#5b302b;font-size:13px;">× 曾失败</span>`
                        : "";
                const locked = !["available", "interface"].includes(item.status);
                const interfaceOnly = item.status === "interface" || item.interfaceOnly === true;

                return `<button data-scenario="${item.id}" ${locked ? "disabled" : ""}

                    style="min-height:${item.ui?.height ?? 130}px;${item.ui?.width ? `width:${item.ui.width}px;` : ''}padding:20px;border:1px solid #696553;

                    background:${locked ? "#aaa58f" : "#c8c1a4"};cursor:${locked ? "not-allowed" : "pointer"};

                    font:inherit;text-align:left;opacity:${locked ? ".65" : "1"};">

                    <strong style="display:block;font-size:24px;">${item.name}</strong>

                    ${Array.isArray(item.children) && item.children.length ? `<span style="display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid #817a62;background:#ded7bb;color:#403d32;font-size:13px;">含 ${item.children.length} 个子战役</span>` : ""}
                    ${progressBadge}

                    <span style="display:block;margin-top:8px;">${item.dateText ?? "开发中"}</span>

                    <span style="display:block;margin-top:8px;color:#625e50;">

                        ${locked ? "尚未开放" : (interfaceOnly ? `${item.location ?? ""} · 接口已建立 / 地图与单位待制作` : (item.location ?? "可进入战役"))}

                    </span>

                </button>`;

            }).join("")

            : `<div style="padding:40px;text-align:center;">该阶段战役尚未开放。</div>`;

 

        const overlay = this.shell(

            this.phase.name,

            this.theater.name,

            `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;">${list}</div>`,

            () => this.renderPhases()

        );

 

        overlay.querySelectorAll("[data-scenario]:not([disabled])").forEach(button => {

            button.onclick = () => {
                const item = this.phase.scenarios.find(x => x.id === button.dataset.scenario);
                if (Array.isArray(item?.children) && item.children.length) this.renderScenarioGroup(item);
                else this.renderBriefing(button.dataset.scenario);
            };

        });

    }

 

    renderScenarioGroup(parent) {
        // 砺剑-27等连续演习可使用一张总态势图作为阶段选择界面。
        // 点击热区使用百分比坐标，因此桌面、iPad和不同窗口尺寸下都会随图片同比缩放。
        if (parent?.stageOverviewImage && Array.isArray(parent.children) && parent.children.length) {
            const hotspots = parent.stageOverviewHotspots ?? {};
            const buttons = parent.children.map((item, index) => {
                const h = hotspots[item.id] ?? {left:index ? 64.2 : 14.0, top:91.0, width:22.0, height:5.3};
                return `<button data-stage-child="${item.id}" aria-label="进入${item.name}" title="进入${item.name}"
                    style="position:absolute;left:${h.left}%;top:${h.top}%;width:${h.width}%;height:${h.height}%;border:0;background:rgba(255,255,255,0.001);cursor:pointer;padding:0;"></button>`;
            }).join("");
            const overlay = this.shell(parent.name, "砺剑-27演习总简报 · 请选择阶段", `
                <div style="padding:10px;background:#101820;border:1px solid #696553;">
                    <div style="position:relative;width:100%;max-width:1536px;margin:0 auto;line-height:0;">
                        <img src="${parent.stageOverviewImage}" alt="砺剑-27 A/B阶段总态势简报" draggable="false"
                            style="display:block;width:100%;height:auto;user-select:none;-webkit-user-drag:none;">
                        ${buttons}
                    </div>
                    <div style="margin-top:8px;text-align:center;color:#d7d0b7;line-height:1.5;font-size:13px;">直接点击图中的“进入砺剑27A”或“进入砺剑27B”按钮查看对应阶段简报。</div>
                </div>`, () => this.renderScenarios());
            overlay.querySelectorAll("[data-stage-child]").forEach(button => {
                button.onclick = () => {
                    const item = parent.children.find(x => x.id === button.dataset.stageChild);
                    if (item) this.renderBriefingObject(item, parent);
                };
            });
            return;
        }
        const entries = [parent, ...(parent.children ?? [])];
        const cards = entries.map((item, index) => {
            const interfaceOnly = item.status === "interface" || item.interfaceOnly === true;
            const label = index === 0 ? (interfaceOnly ? "会战总览接口" : "进入会战主战役") : "子战役";
            return `<button data-child="${item.id}" style="min-height:${item.ui?.height ?? 130}px;${item.ui?.width ? `width:${item.ui.width}px;` : ''}padding:20px;border:1px solid #696553;background:#c8c1a4;cursor:pointer;font:inherit;text-align:left;">
                <strong style="display:block;font-size:24px;">${item.name}</strong>
                <span style="display:block;margin-top:8px;">${item.dateText ?? ""}</span>
                <span style="display:block;margin-top:8px;color:#625e50;">${label} · ${item.location ?? ""}</span>
            </button>`;
        }).join("");
        const overlay = this.shell(parent.name, "会战主战役与所属子战役", `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;">${cards}</div>`, () => this.renderScenarios());
        overlay.querySelectorAll("[data-child]").forEach(button => {
            button.onclick = () => {
                const id = button.dataset.child;
                const item = entries.find(x => x.id === id);
                this.renderBriefingObject(item, parent);
            };
        });
    }

    difficultySelector() {
        return `<div style="margin-top:22px;padding:14px;border:1px solid #77715d;background:rgba(255,255,255,.12);">
            <div style="font-weight:700;margin-bottom:10px;">难度选择</div>
            <div class="campaign-difficulty" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                <label><input type="radio" name="campaign-difficulty" value="0.5"> 简单 ×0.5</label>
                <label><input type="radio" name="campaign-difficulty" value="1" checked> 普通 ×1</label>
                <label><input type="radio" name="campaign-difficulty" value="2"> 困难 ×2</label>
                <label><input type="radio" name="campaign-difficulty" value="3"> 试炼 ×3</label>
            </div>
            <div style="margin-top:7px;color:#625e50;font-size:13px;">倍率作用于敌军现有战斗参数；移动力与射程保持原值。</div>
        </div>`;
    }

    selectedDifficulty(overlay) {
        const multiplier = Number(overlay.querySelector('input[name="campaign-difficulty"]:checked')?.value ?? 1);
        const names = {0.5:'简单',1:'普通',2:'困难',3:'试炼'};
        return { multiplier, name:names[multiplier] ?? '普通' };
    }

    renderScenarioPrelude(scenario, parent = null) {
        const b = scenario.preBattleBriefing ?? {};
        const phases = (b.phases ?? []).map((x,i)=>`<div class="brief-phase"><span>${i+1}</span><div><strong>${x.title}</strong><p>${x.text}</p></div></div>`).join("");
        const objectives = (b.objectives ?? []).map(x=>`<div class="brief-objective ${x.side==='red'?'red':x.side==='blue'?'blue':''}"><strong>${x.name}</strong><div>${x.text}</div></div>`).join("");
        const overlay=this.shell(scenario.name, `${scenario.dateText ?? ""} · 战役态势与演习脚本`, `
          <main class="campaign-prelude-full">
            <section class="brief-map-panel">
              <div class="brief-map-frame">${b.image ? `<img src="${b.image}" alt="砺剑-29战役态势图">` : ''}</div>
              <div class="brief-map-note">态势图为游戏演习示意。红蓝兵力、集结地域与作战方向均为《砺剑》游戏设定。</div>
            </section>
            <section class="brief-info-panel">
              <article class="brief-card brief-summary"><h2>${b.heading ?? '导演部通告'}</h2><p>${b.summary ?? scenario.description ?? ''}</p></article>
              <div class="brief-missions">
                <article class="brief-card red"><h3>红方任务</h3><p>${b.redMission ?? ''}</p></article>
                <article class="brief-card blue"><h3>蓝方任务</h3><p>${b.blueMission ?? ''}</p></article>
              </div>
              <div class="brief-lower">
                <article class="brief-card"><h3>演习阶段</h3>${phases}</article>
                <article class="brief-card"><h3>关键任务与判定</h3>${objectives}<p class="brief-victory">${b.victory ?? ''}</p></article>
              </div>
            </section>
          </main>
          <div class="brief-primary-action"><button id="prelude-confirm">进入参演编组 →</button></div>`, ()=>parent?this.renderScenarioGroup(parent):this.renderScenarios());
        overlay.classList.add('campaign-prelude-mode');
        overlay.querySelector('#prelude-confirm').onclick=()=>this.renderBriefingObject({...scenario,preBattleBriefingDone:true},parent);
    }

    renderGroupArmySelection(scenario, parent = null) {
        const types=[
          ["heavy","重型合成旅","ZTZ-99A / ZBD-04A"],["medium","中型合成旅","ZTL-11 / ZBL-08"],
          ["light","轻型合成旅","高机动轻型装备"],["mountain","山地合成旅","山地/复杂地形"],["amphibious","两栖合成旅","ZTD-05 / ZBD-05"],["urban_assault","城市突击合成旅","强化工兵/装甲突击"],["recon_strike","侦察突击合成旅","高侦察/快速机动"]
        ];
        const options=types.map(x=>`<option value="${x[0]}">${x[1]}｜${x[2]}</option>`).join("");
        const side=(id,title,defs)=>`<div style="padding:15px;border:1px solid #756f5c"><strong>${title}集团军</strong>${defs.map((v,i)=>`<label style="display:block;margin-top:9px">第${i+1}合成旅${i>=4?'（增援）':''} <select id="${id}-${i}" style="width:72%;padding:6px">${options}</select></label>`).join("")}</div>`;
        const overlay=this.shell("集团军参演编组",`${scenario.name} · 集团军级综合演习`,
          `<div style="padding:20px;background:#c8c1a4;border:1px solid #696553;line-height:1.6">
           <div style="margin-bottom:12px">每方编组6个合成旅：第1—4旅为初始参演主力，第5—6旅为战役预备队，并自动配属集团军指挥、通信、侦察、炮兵、防空、陆航、特战、工程、勤务保障、装备抢修和卫勤机构；旅、营、连/小队均保留直属指挥关系。</div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${side('ga-red','红方',['heavy','heavy','medium','light','medium','mountain'])}${side('ga-blue','蓝方',['heavy','medium','medium','mountain','heavy','light'])}</div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
             <div>${this.renderSupportQuantityEditor('ga-support-red','红方空地/导弹')}<label style="display:block;margin-top:10px"><input id="ga-rocket-red" type="checkbox" checked> 配属火箭军演习任务分队</label></div>
             <div>${this.renderSupportQuantityEditor('ga-support-blue','蓝方空地/导弹')}<label style="display:block;margin-top:10px"><input id="ga-rocket-blue" type="checkbox" checked> 配属火箭军演习任务分队</label></div>
           </div>
           <div style="margin-top:12px;font-size:13px">固定翼、陆航和导弹支援数量可在此直接选择；机场占领会额外增加固定翼出动批次。编制和装备数量为游戏化抽象。</div>
           <button id="ga-next" style="display:block;margin:20px auto 0;padding:11px 30px;font:inherit">确认集团军编组</button></div>`,()=>parent?this.renderScenarioGroup(parent):this.renderScenarios());
        const rd=['heavy','heavy','medium','light','medium','mountain'],bd=['heavy','medium','medium','mountain','heavy','light'];
        rd.forEach((v,i)=>overlay.querySelector(`#ga-red-${i}`).value=v);bd.forEach((v,i)=>overlay.querySelector(`#ga-blue-${i}`).value=v);
        overlay.querySelector('#ga-next').onclick=()=>{
          const red=rd.map((_,i)=>overlay.querySelector(`#ga-red-${i}`).value),blue=bd.map((_,i)=>overlay.querySelector(`#ga-blue-${i}`).value);
          sessionStorage.setItem('groupArmySelection',JSON.stringify({red,blue}));
          sessionStorage.setItem('groupArmySupportSelection',JSON.stringify({
            red:this.readSupportQuantityEditor(overlay,'ga-support-red'),
            blue:this.readSupportQuantityEditor(overlay,'ga-support-blue'),
            rocketForce:{red:!!overlay.querySelector('#ga-rocket-red')?.checked,blue:!!overlay.querySelector('#ga-rocket-blue')?.checked}
          }));
          this.renderBriefingObject({...scenario,groupArmySelectionDone:true},parent);
        };
    }

    modernSupportCards() {
        return [
            ["modern_cap","歼-20制空巡逻",2],
            ["modern_precision","歼-16精确对地支援",3],
            ["jh7a_strike","JH-7A“飞豹”战术对地支援",4],
            ["helo_antiarmor","直-10反装甲支援",3],
            ["helo_recon","直-19战场侦察",3],
            ["helo_supply","直-20前送补给",2],
            ["helo_z20_air_assault","直-20空中突击分队投送",3],
            ["helo_z8b_air_assault","直-8B空降分队投送",2],
            ["missile_fire_support","导弹部队远程火力支援",2]
        ];
    }

    renderSupportQuantityEditor(prefix, title) {
        return `<div style="margin-top:16px;padding:12px;border:1px solid #817a62">
          <strong>${title}支援卡数量</strong>
          <div style="margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 14px">
          ${this.modernSupportCards().map(([id,name,n])=>`<label style="display:grid;grid-template-columns:1fr 72px;align-items:center;gap:8px"><span>${name}</span><input id="${prefix}-${id}" type="number" min="0" max="99" step="1" value="${n}" style="width:64px;padding:5px"></label>`).join("")}
          </div><div style="margin-top:7px;font-size:12px;color:#625e50">0表示本局不携带该支援卡；选择结果仅作为游戏场景资源数量。</div>
        </div>`;
    }

    readSupportQuantityEditor(overlay, prefix) {
        const uses={};
        for(const [id,,def] of this.modernSupportCards()) {
            const el=overlay.querySelector(`#${prefix}-${id}`);
            uses[id]=Math.max(0,Math.min(99,Math.floor(Number(el?.value ?? def) || 0)));
        }
        return uses;
    }

    renderModernBrigadeSelection(scenario, parent = null) {
        const types = [
            ["heavy","重型合成旅","ZTZ-99A / ZBD-04A / PLZ-05","火力、防护强；后勤压力高"],
            ["medium","中型合成旅","ZTL-11 / ZBL-08 / PCL-181","轮式高速机动；综合均衡"],
            ["light","轻型合成旅","CSK-181 / PCL-181","高机动；正面装甲对抗较弱"],
            ["mountain","山地合成旅","CSK-181 / PCL-181 / 无人侦察","复杂地形机动与步兵作战强化"],
            ["amphibious","两栖合成旅","ZTD-05 / ZBD-05 / PLZ-05","适合渡河、滨海和水网地形"],
            ["urban_assault","城市突击合成旅","ZTZ-99A / ZBD-04A / 工程保障","3支工兵；城市攻坚强化；野外机动较慢"],
            ["recon_strike","侦察突击合成旅","ZTL-11 / ZBL-08 / 无人侦察","3支特战小队；侦察与快速机动强化"],
            ["rocket_force","火箭军综合测试旅","DF系列 / CJ-10 / 指挥保障","多型号远程火力、要地防空、工程与综合保障；游戏化测试编制"]
        ];
        const opts = types.map(([id,n,e])=>`<option value="${id}">${n}｜${e}</option>`).join("");
        const trainingName = scenario.trainingMap ? `${scenario.name} · ${({small:"小型",medium:"中型",large:"大型"}[scenario.trainingMap.size]??scenario.trainingMap.size)}训练场` : (scenario.name ?? "现代合成旅红蓝对抗");
        const overlay=this.shell("选择红蓝双方参演旅编制",trainingName,
          `<div style="padding:22px;background:#c8c1a4;border:1px solid #696553;line-height:1.7">
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
               <label><strong>红方旅型</strong><br><select id="modern-red" style="width:100%;padding:10px;margin-top:8px">${opts}</select></label>
               <label><strong>蓝方旅型</strong><br><select id="modern-blue" style="width:100%;padding:10px;margin-top:8px">${opts}</select></label>
             </div>
             <div style="margin-top:16px;padding:12px;border:1px solid #817a62">
               <strong>战役级火箭军支援旅</strong>
               <div style="margin-top:9px;display:grid;grid-template-columns:1fr 1fr;gap:12px 18px">
                 <label><input id="rocket-support-red" type="checkbox"> 红方使用火箭军支援旅</label>
                 <label><input id="rocket-support-blue" type="checkbox"> 蓝方使用火箭军支援旅</label>
               </div>
               <div style="margin-top:7px;font-size:12px;color:#625e50">勾选后，火箭军支援旅部署到本方地图后方预留地域；不勾选则该地域保持为空。火箭军支援旅与主战合成旅同时存在。</div>
             </div>
             ${this.renderSupportQuantityEditor("support-red","红方")}
             ${this.renderSupportQuantityEditor("support-blue","蓝方")}
             <div id="modern-preview" style="margin-top:18px;padding:14px;border:1px solid #817a62"></div>
             <button id="modern-next" style="display:block;margin:22px auto 0;padding:11px 30px;font:inherit">确认编组</button>
           </div>`,()=>parent?this.renderScenarioGroup(parent):this.renderScenarios());
        const red=overlay.querySelector("#modern-red"), blue=overlay.querySelector("#modern-blue"), preview=overlay.querySelector("#modern-preview");
        blue.value="medium";
        const info=()=>{const get=v=>types.find(x=>x[0]===v);const a=get(red.value),b=get(blue.value);
          preview.innerHTML=`<strong>红方：</strong>${a[1]} · ${a[2]}<br>${a[3]}<br><br><strong>蓝方：</strong>${b[1]} · ${b[2]}<br>${b[3]}<br><br><span style="font-size:13px">同一训练场可自由组合双方旅型；确认后将按所选编制动态生成全部算子。装备数量与性能数值为游戏化抽象。</span>`;};
        red.onchange=info;blue.onchange=info;info();
        overlay.querySelector("#modern-next").onclick=()=>{
          sessionStorage.setItem("modernBrigadeSelection",JSON.stringify({red:red.value,blue:blue.value}));
          sessionStorage.setItem("modernRocketSupportSelection",JSON.stringify({red:!!overlay.querySelector("#rocket-support-red")?.checked,blue:!!overlay.querySelector("#rocket-support-blue")?.checked}));
          sessionStorage.setItem("modernSupportSelection",JSON.stringify({red:this.readSupportQuantityEditor(overlay,"support-red"),blue:this.readSupportQuantityEditor(overlay,"support-blue")}));
          this.renderBriefingObject({...scenario,modernSelectionDone:true},parent);
        };
    }

    renderPlaCombinedBrigadeSelection(scenario, parent = null) {
        const types = [
            ["heavy","重型合成旅","ZTZ-99A / ZBD-04A / PLZ-05"],
            ["medium","中型合成旅","ZTL-11 / ZBL-08 / PCL-181"],
            ["light","轻型合成旅","CSK-181 / PCL-181"],
            ["mountain","山地合成旅","复杂地形机动强化"],
            ["amphibious","两栖合成旅","ZTD-05 / ZBD-05 / PLZ-05"],
            ["urban_assault","城市突击合成旅","装甲突击 / 3支工兵"],
            ["recon_strike","侦察突击合成旅","快速装步 / 3支特战"]
        ];
        const opts=types.map(([id,n,e])=>`<option value="${id}">${n}｜${e}</option>`).join("");
        const overlay=this.shell("解放军合成旅卡组",scenario.name,`<div style="padding:22px;background:#c8c1a4;border:1px solid #696553;line-height:1.7">
          <div>选择本关投入的解放军合成旅模板。台伪军仍使用关卡预设守军。</div>
          <label style="display:block;margin-top:16px"><strong>解放军合成旅</strong><br><select id="pla-brigade" style="width:100%;padding:10px;margin-top:8px">${opts}</select></label>
          <div style="margin-top:12px;font-size:13px">编制与性能均为游戏化抽象；将调用现有现代合成旅生成器。</div>
          ${this.renderSupportQuantityEditor("support-pla","解放军")}
          <button id="pla-brigade-next" style="display:block;margin:22px auto 0;padding:11px 30px;font:inherit">确认卡组</button></div>`,()=>parent?this.renderScenarioGroup(parent):this.renderScenarios());
        overlay.querySelector('#pla-brigade').value='heavy';
        overlay.querySelector('#pla-brigade-next').onclick=()=>{
          sessionStorage.setItem('plaCombinedBrigadeSelection',overlay.querySelector('#pla-brigade').value);
          sessionStorage.setItem('plaSupportSelection',JSON.stringify(this.readSupportQuantityEditor(overlay,'support-pla')));
          this.renderBriefingObject({...scenario,plaCombinedBrigadeSelectionDone:true},parent);
        };
    }

    renderMarineSupportSelection(scenario, parent = null) {
        const overlay=this.shell("海军陆战队演习支援编组",scenario.name,`<div style="padding:22px;background:#c8c1a4;border:1px solid #696553;line-height:1.7">
          <div>双方地面、岸防、海军和特战编制使用本关固定大型编制；在进入战场前选择本局空军、陆航和远程火力支援次数。</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
            <div>${this.renderSupportQuantityEditor("marine-support-red","红方")}</div>
            <div>${this.renderSupportQuantityEditor("marine-support-blue","蓝方")}</div>
          </div>
          <div style="margin-top:12px;font-size:13px">特战编制已恢复：红方包含3个营属特战小队和2个旅特战小队；蓝方包含岸防旅及中央岛守备特战分队。特战单位保留独立空降资格。</div>
          <button id="marine-support-next" style="display:block;margin:22px auto 0;padding:11px 30px;font:inherit">确认支援编组</button>
        </div>`,()=>parent?this.renderScenarioGroup(parent):this.renderScenarios());
        overlay.querySelector('#marine-support-next').onclick=()=>{
          sessionStorage.setItem('marineSupportSelection',JSON.stringify({red:this.readSupportQuantityEditor(overlay,'marine-support-red'),blue:this.readSupportQuantityEditor(overlay,'marine-support-blue')}));
          this.renderBriefingObject({...scenario,marineSupportSelectionDone:true},parent);
        };
    }

    renderBriefingObject(scenario, parent = null) {
        if (scenario.preBattleBriefing && !scenario.preBattleBriefingDone) { this.renderScenarioPrelude(scenario, parent); return; }
        if (scenario.marineSupportSelection && !scenario.marineSupportSelectionDone) { this.renderMarineSupportSelection(scenario, parent); return; }
        if (scenario.plaCombinedBrigadeSelection && !scenario.plaCombinedBrigadeSelectionDone) { this.renderPlaCombinedBrigadeSelection(scenario, parent); return; }
        if (scenario.groupArmySelection && !scenario.groupArmySelectionDone) { this.renderGroupArmySelection(scenario, parent); return; }
        if (scenario.modernBrigadeSelection && !scenario.modernSelectionDone) { this.renderModernBrigadeSelection(scenario, parent); return; }
        const overlay = this.shell(
            scenario.name, `${scenario.dateText ?? ""} · ${scenario.location ?? ""}`,
            `<div style="padding:24px;background:#c8c1a4;border:1px solid #696553;line-height:1.8;">
                ${parent && parent.id !== scenario.id ? `<div><strong>所属会战：</strong>${parent.name}</div>` : ""}
                <div><strong>战场：</strong>${this.rootTheater ? `${this.rootTheater.name} · ${this.theater.name}` : this.theater.name}</div><div><strong>阶段：</strong>${this.phase.name}</div>
                <div><strong>战役：</strong>${scenario.name}</div><div><strong>规模：</strong>营 / 连级战术单位</div>
                ${scenario.urbanDefense ? `<div><strong>城市防御：</strong>启用分段城墙系统（独立耐久 / 0耐久形成缺口 / 完整城墙禁止绕行）</div>` : ""}
                ${scenario.interfaceOnly ? `<div style="margin-top:18px;padding:12px;border:1px dashed #696553;"><strong>开发状态：</strong>战役接口已建立；地图、单位与具体任务数据将在后续版本制作。</div>` : ""}
                ${scenario.interfaceOnly ? "" : this.difficultySelector()}
                <button id="campaign-start" ${scenario.interfaceOnly ? "disabled" : ""} style="display:block;margin:28px auto 0;padding:12px 34px;font:inherit;font-size:18px;cursor:${scenario.interfaceOnly ? "not-allowed" : "pointer"};opacity:${scenario.interfaceOnly ? ".55" : "1"};">${scenario.interfaceOnly ? "接口已建立 · 待制作" : "开始战役"}</button>
            </div>`, () => parent ? this.renderScenarioGroup(parent) : this.renderScenarios());
        if (!scenario.interfaceOnly) overlay.querySelector("#campaign-start").onclick = () => { this.close(); this.onScenarioSelected?.(scenario.id, this.selectedDifficulty(overlay)); };
    }

    renderBriefing(id) {
        const parent = this.phase.scenarios.find(x => x.id === id || x.children?.some(c => c.id === id));
        const scenario = parent?.id === id ? parent : parent?.children?.find(c => c.id === id);
        if (!scenario) return;
        // 所有战役统一经过 renderBriefingObject。旧版这里复制了一套 briefing UI，
        // 导致 modernBrigadeSelection / groupArmySelection / plaCombinedBrigadeSelection 被绕过。
        return this.renderBriefingObject(scenario, parent?.id !== id ? parent : null);
    }


}
