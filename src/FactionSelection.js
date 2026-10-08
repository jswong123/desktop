import { FactionSystem } from "./systems/FactionSystem.js";

export class FactionSelection {
    constructor(gameState) { this.gameState = gameState; this.overlay = null; }

    show(onStart = null, options = {}) {
        this.close();
        const scenario = options.scenario ?? {};
        const config = options.config ?? {};
        const factionIds = config.factions ?? Object.keys(this.gameState?.factions ?? {});
        const title = config.name ?? scenario.name ?? scenario.scenario ?? "选择阵营";
        const dateText = config.dateText ?? scenario.date ?? "";
        const modern = config.modernBrigadeSelection === true;
        const cards = factionIds.map(id => this.createFactionCard(id, modern)).join("");

        this.overlay = document.createElement("div");
        Object.assign(this.overlay.style,{position:"fixed",inset:"0",background:"rgba(25,29,24,.96)",zIndex:"9999",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"FangSong,仿宋,SimSun,serif"});
        const panel=document.createElement("div");
        Object.assign(panel.style,{width:"820px",maxWidth:"92vw",color:"#e8e2c8",textAlign:"center"});
        panel.innerHTML=`<div style="font-size:40px;margin-bottom:8px;">${title}</div>
        <div style="font-size:18px;opacity:.7;margin-bottom:32px;">${dateText} · 选择参战阵营</div>
        <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">${cards}</div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:28px;"><button id="observerButton" type="button" style="padding:10px 24px;background:transparent;color:#c9c4ae;border:1px solid #777565;cursor:pointer;font-family:inherit;font-size:15px;">观察员模式</button><button id="developerButton" type="button" style="padding:10px 24px;background:#8d7b4e;color:#fff8dc;border:1px solid #c8b98b;cursor:pointer;font-family:inherit;font-size:15px;font-weight:700;">开发者模式</button></div>`;
        this.overlay.appendChild(panel); document.body.appendChild(this.overlay);

        panel.querySelectorAll("[data-faction]").forEach(button=>button.addEventListener("click",()=>{
            const faction=button.dataset.faction;
            this.gameState.setPlayerFaction(faction); this.close();
            if(typeof onStart==="function") onStart(faction);
        }));
        panel.querySelector("#observerButton")?.addEventListener("click",()=>{
            this.gameState.setObserverMode(); this.close();
            if(typeof onStart==="function") onStart("OBSERVER");
        });
        panel.querySelector("#developerButton")?.addEventListener("click",()=>{
            // 开发者模式密钥门禁。注意：这是前端访问门禁，不等同于服务器级安全认证。
            const key = window.prompt("请输入开发者模式密钥：", "");
            if (key === null) return;
            if (key !== "123456wrx") {
                window.alert("开发者密钥错误，无法进入开发者模式。");
                return;
            }
            this.gameState.setDeveloperMode(); this.close();
            if(typeof onStart==="function") onStart("DEVELOPER");
        });
    }

    createFactionCard(id, modern=false) {
        const f=FactionSystem.getFaction(id);
        const title=modern ? (id === "CHN" ? "红方" : id === "JPN" ? "蓝方" : (f?.name ?? id)) : (f?.name ?? id);
        const fullName=modern ? (id === "CHN" ? "红方合成旅" : id === "JPN" ? "蓝方合成旅" : (f?.fullName ?? title)) : (f?.fullName ?? title);
        const accent={RED:"#b65b55",BLUE:"#667f96",GER:"#8495a5",USSR:"#b75d58",CHN:"#647a55",JPN:"#a86b55",GBR:"#8a8065",ITA:"#7d8065",USA:"#65788a",ROK_GOV:"#667f96",NEWMIL:"#b65b55"}[id] ?? "#777565";
        return `<button type="button" data-faction="${id}" style="width:300px;min-height:210px;padding:28px;background:#ded8bd;border:3px solid ${accent};cursor:pointer;color:#292b25;font-family:inherit;">
        <div style="font-size:30px;margin-bottom:20px;">${title}</div><div style="font-size:18px;margin-bottom:16px;">${fullName}</div><div style="font-size:14px;line-height:1.7;opacity:.75;">以${title}身份进入本战役</div><div style="margin-top:25px;font-size:16px;">选择阵营</div></button>`;
    }

    close(){ if(this.overlay?.parentNode) this.overlay.parentNode.removeChild(this.overlay); this.overlay=null; }
}
