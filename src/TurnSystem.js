// 通用多阵营回合系统
export class TurnSystem {
    constructor(options={}) {
        this.year=options.year??1941; this.month=options.month??6; this.day=options.day??26;
        this.hour=options.hour??8; this.minute=options.minute??0; this.hoursPerTurn=options.hoursPerTurn??2; this.turn=options.turn??1;
        this.units=options.units??[];
        this.phaseOrder=(options.phaseOrder?.length?options.phaseOrder:[options.startingPhase??"german", options.startingPhase==="japanese"?"chinese":"soviet"]).map(x=>this.normalizeSide(x));
        this.phase=this.normalizeSide(options.startingPhase??this.phaseOrder[0]);
        if(!this.phaseOrder.includes(this.phase)) this.phaseOrder.unshift(this.phase);
        this.defaultActionPoints={infantry:6,armor:8,artillery:5,reconnaissance:9,headquarters:5,default:6};
        this.onPhaseChanged=null; this.onTurnChanged=null; this.onTimeChanged=null; this.initializeUnits();
    }
    normalizeSide(side){
        const v=String(side??"").trim().toLowerCase();
        const map={red:"red",blue:"blue","红方":"red","蓝方":"blue",pla_red:"red",pla_blue:"blue",ger:"german",germany:"german",german:"german",axis:"german","德军":"german",ussr:"soviet",soviet:"soviet",redarmy:"soviet","苏军":"soviet","红军":"soviet",chn:"chinese",china:"chinese",chinese:"chinese","中国军":"chinese","国军":"chinese",rok_gov:"rok_government",rok_government:"rok_government",newmil:"new_military",new_military:"new_military",pla:"pla",tw_proxy:"tw_proxy",jpn:"japanese",japan:"japanese",japanese:"japanese","日军":"japanese"};
        return map[v]??v;
    }
    getSideName(side){ return ({red:"红方",blue:"蓝方",german:"德军",soviet:"苏军",chinese:"中国军",japanese:"日军",british:"英军",italian:"意军",american:"美军",rok_government:"政府军",new_military:"新军部",pla:"解放军",tw_proxy:"台伪军"})[this.normalizeSide(side)]??String(side??""); }
    initializeUnits(){ for(const u of this.units){const m=this.getUnitMaxAP(u);u.maxActionPoints=m;if(u.actionPoints==null)u.actionPoints=m;const mm=this.getUnitMaxMovement(u);u.maxMovementPoints=mm;if(u.movementPoints==null||!Number.isFinite(Number(u.movementPoints)))u.movementPoints=mm;u.hasMoved=false;u.hasAttacked=false;} }
    getUnitMaxMovement(u){ const vals={infantry:4,motorized:7,armor:8,tank:8,artillery:4,antitank:4,antiair:4,air_defense:4,engineer:4,reconnaissance:10,recon:10,cavalry:7,headquarters:5,support:5,supply:5,mechanized_infantry:5,wheeled_infantry:6,motorized_infantry:6,amphibious_armor:6,special_forces:7};const t=String(u?.type??u?.unitType??'').toLowerCase();const n=Number(u?.movement??u?.maxMovementPoints??vals[t]??4);return Number.isFinite(n)&&n>0?n:4; }
    getUnitMaxAP(u){ if(Number.isFinite(u.maxActionPoints)&&u.maxActionPoints>0)return u.maxActionPoints;if(Number.isFinite(u.maxAP)&&u.maxAP>0)return u.maxAP;const t=String(u.type??u.unitType??u.branch??"").toLowerCase();if(/tank|armor|panzer|mechanized/.test(t))return 8;if(/artillery|gun/.test(t))return 5;if(/recon|scout/.test(t))return 9;if(/hq|headquarter/.test(t))return 5;return 6; }
    isUnitActive(u){return !!u&&this.normalizeSide(u.side??u.faction??u.camp)===this.phase;}
    canUnitAct(u){return this.isUnitActive(u)&&(u.actionPoints??0)>0;}
    canSpendAP(u,c){return this.canUnitAct(u)&&(Number(u.actionPoints)||0)>=Math.max(0,Number(c)||0);}
    spendAP(u,c){const n=Math.max(0,Number(c)||0);if(!this.canSpendAP(u,n))return false;u.actionPoints=Math.max(0,u.actionPoints-n);return true;}
    registerMove(u,c){if(!this.spendAP(u,c))return false;u.hasMoved=true;return true;}
    registerAttack(u,c=2){if(!this.spendAP(u,c))return false;u.hasAttacked=true;return true;}
    getPhaseName(){return `${this.getSideName(this.phase)}行动`;}
    getTurnNumber(){return this.turn;}
    getDateText(){return `${this.year}年${this.month}月${this.day}日`;}
    getTimeText(){return `${String(Math.floor(this.hour)).padStart(2,"0")}:${String(Math.floor(this.minute)).padStart(2,"0")}`;}
    getHeaderText(){return `${this.getDateText()} · ${this.getTimeText()} ｜ 第${this.turn}回合 ｜ ${this.getPhaseName()}`;}
    getTurnTimeRange(){let total=Math.round(this.hour*60+this.minute+this.hoursPerTurn*60),d=this.day;while(total>=1440){total-=1440;d++;}const h=Math.floor(total/60),m=total%60;const end=`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;return d!==this.day?`${this.getTimeText()}—次日${end}`:`${this.getTimeText()}—${end}`;}
    endPhase(){const i=this.phaseOrder.indexOf(this.phase);if(i>=0&&i<this.phaseOrder.length-1){this.phase=this.phaseOrder[i+1];this.resetActionPointsForSide(this.phase);this.emitPhaseChanged();}else this.finishTurn();}
    finishTurn(){this.advanceTime(this.hoursPerTurn);this.turn++;this.phase=this.phaseOrder[0];this.resetActionPointsForSide(this.phase);if(typeof this.onTurnChanged==="function")this.onTurnChanged(this);this.emitPhaseChanged();}
    advanceTime(hours){let total=Math.round(this.hour*60+this.minute+Number(hours||0)*60);while(total>=1440){total-=1440;this.advanceDay();}this.hour=Math.floor(total/60);this.minute=total%60;if(typeof this.onTimeChanged==="function")this.onTimeChanged(this);}
    advanceDay(){const dim=new Date(this.year,this.month,0).getDate();this.day++;if(this.day>dim){this.day=1;this.month++;if(this.month>12){this.month=1;this.year++;}}}
    resetActionPointsForSide(side){const s=this.normalizeSide(side);for(const u of this.units){if(this.normalizeSide(u.side??u.faction??u.camp)!==s)continue;u.actionPoints=this.getUnitMaxAP(u);u.maxMovementPoints=this.getUnitMaxMovement(u);u.movementPoints=u.maxMovementPoints;u.hasMoved=false;u.hasAttacked=false;u.hasBombarded=false;u.hasActed=false;}}
    emitPhaseChanged(){if(typeof this.onPhaseChanged==="function")this.onPhaseChanged(this);}
    getState(){return {turn:this.turn,phase:this.phase,phaseOrder:[...this.phaseOrder],year:this.year,month:this.month,day:this.day,hour:this.hour,minute:this.minute};}
    setState(s={}){for(const k of ["turn","year","month","day","hour","minute"])if(Number.isFinite(Number(s[k])))this[k]=Number(s[k]);if(s.phase)this.phase=this.normalizeSide(s.phase);if(Array.isArray(s.phaseOrder)&&s.phaseOrder.length)this.phaseOrder=s.phaseOrder.map(x=>this.normalizeSide(x));this.emitPhaseChanged();}
}
