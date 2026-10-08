// 通用多阵营胜利判定系统
// v1.2.9b：现代演习“占领 + 巩固”判定，避免单个高机动单位抢点瞬间获胜。
export class VictorySystem {
    constructor(options={}){this.scenario=options.scenario??{};this.gameOver=false;this.winner=null;this.reason="";this.capturedObjectives=new Map();this.objectiveHold=new Map();}
    normalizeSide(side){const v=String(side??"").trim().toLowerCase();return ({ger:"german",germany:"german",german:"german",axis:"german",ussr:"soviet",soviet:"soviet",redarmy:"soviet",chn:"chinese",china:"chinese",chinese:"chinese",jpn:"japanese",japan:"japanese",japanese:"japanese",allied:"allied",allies:"allied",rok_gov:"rok_government",rok_government:"rok_government",newmil:"new_military",new_military:"new_military",pla:"pla",tw_proxy:"tw_proxy",red:"red",blue:"blue",pla_red:"red",pla_blue:"blue"})[v]??v;}
    getUnitSide(u){return this.normalizeSide(u?.faction??u?.side??u?.camp);}
    isAlive(u){return !!u&&u.destroyed!==true&&u.offMap!==true&&Number(u.strength??u.manpower??1)>0;}
    isCombatUnit(u){const t=String(u?.type??u?.unitType??"").toLowerCase();return this.isAlive(u)&&!t.includes("headquarter")&&!t.includes("hq");}
    getRules(){return this.scenario?.victoryConditions??{};}
    getSides(units=[]){const rules=this.getRules();const ruleSides=Object.keys(rules).filter(k=>!["deadlineTurn","deadlineFailureText","deadlineResolution","disabled"].includes(k)&&typeof rules[k]==='object');if(ruleSides.length>=2)return ruleSides.map(x=>this.normalizeSide(x));return [...new Set(units.filter(u=>this.isAlive(u)).map(u=>this.getUnitSide(u)).filter(Boolean))];}
    hexDistance(aq,ar,bq,br){const dq=Number(aq)-Number(bq),dr=Number(ar)-Number(br);return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
    unitsAtObjective(units,obj,side=null){const rad=Math.max(0,Number(obj?.controlRadius??0));return units.filter(u=>this.isAlive(u)&&(!side||this.getUnitSide(u)===side)&&this.hexDistance(u.q,u.r,obj.q,obj.r)<=rad);}
    captureEligible(u,policy={}){if(!this.isCombatUnit(u))return false;const t=String(u?.type??u?.unitType??'').toLowerCase();if(policy.excludeHQ!==false&&(t.includes('headquarter')||t==='hq'))return false;if(policy.excludeRecon!==false&&(t.includes('recon')||t==='special_forces'))return false;if(['supply','medical','repair','logistics'].some(x=>t.includes(x)))return false;return u?.canCaptureObjective!==false;}
    objectiveKey(side,o,i){return `${side}:${o?.id??`${Number(o?.q)},${Number(o?.r)}:${i}`}`;}
    policy(){return this.scenario?.victoryControlPolicy??{};}
    objectiveSecure(units,side,o,i,state={}){
        const p=this.policy();
        const friendly=this.unitsAtObjective(units,o,side); const enemies=this.unitsAtObjective(units,o).filter(u=>this.getUnitSide(u)!==side);
        const eligible=friendly.filter(u=>this.captureEligible(u,p));
        const pri=String(o?.priority??'secondary').toLowerCase();
        const minUnits=Math.max(1,Number(o?.minCaptureUnits??(pri==='primary'?p.primaryMinUnits:p.secondaryMinUnits)??1));
        const secure=eligible.length>=minUnits && (!(o?.requireUncontested??p.requireUncontested??false)||enemies.length===0);
        const key=this.objectiveKey(side,o,i), turn=Math.max(1,Number(state?.turn??1));
        if(!secure){this.objectiveHold.delete(key);return false;}
        const holdTurns=Math.max(1,Number(o?.holdTurns??p.holdTurns??1));
        if(holdTurns<=1)return true;
        const rec=this.objectiveHold.get(key);
        if(!rec||turn<rec.firstTurn||turn>rec.lastTurn+1)this.objectiveHold.set(key,{firstTurn:turn,lastTurn:turn});
        else if(turn>rec.lastTurn){rec.lastTurn=turn;this.objectiveHold.set(key,rec);}
        const now=this.objectiveHold.get(key);return (now.lastTurn-now.firstTurn+1)>=holdTurns;
    }
    objectivesSatisfied(units,side,capture,{latch=false,state={}}={}){const objs=capture?.objectives??[];if(!objs.length)return false;const p=this.policy();const hits=objs.map((o,i)=>{const key=this.objectiveKey(side,o,i);if(latch&&this.capturedObjectives.get(key)===true)return true;const occupied=p.enabled?this.objectiveSecure(units,side,o,i,state):this.unitsAtObjective(units,o,side).length>0;if(latch&&occupied)this.capturedObjectives.set(key,true);return occupied;});return capture?.mode==="any"?hits.some(Boolean):hits.every(Boolean);}
    finish(winner,reason){this.gameOver=true;this.winner=winner;this.reason=reason;return {gameOver:true,winner,reason};}
    strategicObjectiveScore(units,side,state={}){const all=this.scenario?.strategicObjectives?.[side]??this.scenario?.strategicObjectives?.[Object.keys(this.scenario?.strategicObjectives??{}).find(k=>this.normalizeSide(k)===side)]??[];const objectives=Array.isArray(all)?all:[];let primary=0,total=0,points=0;const completed=[];for(let i=0;i<objectives.length;i++){const o=objectives[i];const ctl=this.policy().enabled?this.objectiveSecure(units,side,o,i,state):this.unitsAtObjective(units,o,side).length>0;if(!ctl)continue;total++;completed.push(o?.id??o?.title??'objective');const pri=String(o?.priority??'secondary').toLowerCase();if(pri==='primary')primary++;points+=Number(o?.victoryPoints??(pri==='primary'?3:pri==='optional'?0.5:1));}return {primary,total,points,completed,count:objectives.length};}
    exerciseScore(units,side,state={}){
        const cfg=this.scenario?.exerciseScoring??{};
        const obj=this.strategicObjectiveScore(units,side,state);
        const friendly=units.filter(u=>this.getUnitSide(u)===side);
        const alive=friendly.filter(u=>this.isAlive(u));
        const ratio=(arr,valueFn,maxFn)=>{let cur=0,max=0;for(const u of arr){const c=Math.max(0,Number(valueFn(u)??0));const m=Math.max(c,Number(maxFn(u)??c));cur+=c;max+=m;}return max>0?Math.max(0,Math.min(1,cur/max)):1;};
        const forceUnits=friendly.filter(u=>this.isCombatUnit(u));
        const forceRatio=ratio(forceUnits,u=>u.strength??u.manpower??u.personnel,u=>u.maxStrength??u.maxManpower??u.maxPersonnel??u.initialStrength??u.strength??u.manpower??u.personnel);
        const hqUnits=friendly.filter(u=>{const t=String(u?.type??u?.unitType??'').toLowerCase();return t.includes('headquarter')||t==='hq'||t.includes('command');});
        const logUnits=friendly.filter(u=>{const t=String(u?.type??u?.unitType??'').toLowerCase();return ['supply','logistics','repair','medical'].some(x=>t.includes(x));});
        const aliveRatio=arr=>arr.length?arr.filter(u=>this.isAlive(u)).length/arr.length:1;
        const forcePts=Math.round(forceRatio*Number(cfg?.forcePreservation?.maxPoints??20)*10)/10;
        const commandPts=Math.round(aliveRatio(hqUnits)*Number(cfg?.commandIntegrity?.maxPoints??10)*10)/10;
        const logisticsPts=Math.round(aliveRatio(logUnits)*Number(cfg?.logisticsIntegrity?.maxPoints??10)*10)/10;
        const objectivePts=Number(obj.points??0);
        return {side,total:Math.round((objectivePts+forcePts+commandPts+logisticsPts)*10)/10,objectivePts,forcePts,commandPts,logisticsPts,primary:obj.primary,secondary:Math.max(0,obj.total-obj.primary)};
    }
    resolveExerciseScore(units,sides,state={}){
        const scores=sides.map(side=>this.exerciseScore(units,side,state)).sort((a,b)=>b.total-a.total);
        if(scores.length<2)return null;const a=scores[0],b=scores[1],margin=Math.round((a.total-b.total)*10)/10;
        const detail=x=>`${this.sideName(x.side)} ${x.total}分（战略${x.objectivePts} / 兵力${x.forcePts} / 指挥${x.commandPts} / 后勤${x.logisticsPts}）`;
        if(Math.abs(margin)<5){this.gameOver=true;this.winner='draw';this.reason=`演习综合评分：${detail(a)}；${detail(b)}。双方差距${Math.abs(margin)}分，判定势均力敌。`;return {gameOver:true,winner:'draw',reason:this.reason,scores};}
        const bands=this.scenario?.exerciseScoring?.resultBands??[];let label='优势';for(const band of bands){if(margin>=Number(band.margin)){label=band.label;break;}}
        const out=this.finish(a.side,`演习综合评分：${detail(a)}；${detail(b)}。${this.sideName(a.side)}领先${margin}分，评定为“${label}”。`);out.scores=scores;return out;
    }
    resolveDeadlineByObjectives(units,sides,rules,state={}){const mode=String(rules?.deadlineResolution?.mode??rules?.deadlineResolution??'primary_then_count').toLowerCase();if(mode==='none'||mode==='disabled')return null;if(mode==='exercise_score')return this.resolveExerciseScore(units,sides,state);const scored=sides.map(side=>({side,...this.strategicObjectiveScore(units,side,state)}));if(!scored.some(x=>x.count>0))return null;let ranked=[...scored];if(mode==='points')ranked.sort((a,b)=>b.points-a.points||b.primary-a.primary||b.total-a.total);else if(mode==='count')ranked.sort((a,b)=>b.total-a.total||b.primary-a.primary||b.points-a.points);else ranked.sort((a,b)=>b.primary-a.primary||b.total-a.total||b.points-a.points);const a=ranked[0],b=ranked[1];if(!a||!b)return null;const tied=mode==='points'?a.points===b.points:(mode==='count'?a.total===b.total:(a.primary===b.primary&&a.total===b.total));if(tied){this.gameOver=true;this.winner='draw';this.reason=`截止回合结束：双方主要任务 ${a.primary}:${b.primary}，完成任务 ${a.total}:${b.total}，判定平局。`;return {gameOver:true,winner:'draw',reason:this.reason};}return this.finish(a.side,`截止回合结束：${this.sideName(a.side)}主要任务完成 ${a.primary} 项、总任务完成 ${a.total} 项；${this.sideName(b.side)}主要任务完成 ${b.primary} 项、总任务完成 ${b.total} 项。`);}
    check(units=[],state={}){if(this.gameOver)return {gameOver:true,winner:this.winner,reason:this.reason};const rules=this.getRules(),sides=this.getSides(units);if(rules?.disabled===true||sides.length<2)return {gameOver:false};for(const side of sides){const enemies=sides.filter(s=>s!==side);const enemyCombat=units.filter(u=>enemies.includes(this.getUnitSide(u))&&this.isCombatUnit(u));const rule=rules[side]??rules[Object.keys(rules).find(k=>this.normalizeSide(k)===side)]??{};if(rule.eliminateEnemy&&enemyCombat.length===0)return this.finish(side,`${this.sideName(side)}消灭了敌方全部有效作战单位。`);}
        for(const side of sides){const rule=rules[side]??rules[Object.keys(rules).find(k=>this.normalizeSide(k)===side)]??{};if(rule.captureObjectives&&this.objectivesSatisfied(units,side,rule.captureObjectives,{state}))return this.finish(side,rule.captureObjectives.successText??`${this.sideName(side)}完成战略目标。`);}
        // 演习脚本直接胜利：达到规定数量的主要/阶段目标即可，不要求清空全部目标。
        const scripted=rules?.scriptedVictory;
        if(scripted){for(const side of sides){const sc=this.strategicObjectiveScore(units,side,state);const secondary=Math.max(0,sc.total-sc.primary);if(sc.primary>=Number(scripted.primaryRequired??Infinity)&&secondary>=Number(scripted.minimumSecondary??0))return this.finish(side,`${this.sideName(side)}已稳定控制 ${sc.primary} 个主要控制区和 ${secondary} 个阶段要点，达成演习直接胜利条件。`);}}
        // 战略目标胜利：玩家侧优先采用 StrategicObjectives 已经计算并显示在 UI 上的状态。
        // v1.2.9b 之前这里又调用 objectiveSecure()，形成第二套独立的“巩固计时器”，
        // 因而会出现右侧三个目标均为“已完成 2/2”，但胜利弹窗不触发。
        for(const side of sides){
            const all=this.scenario?.strategicObjectives?.[side]??this.scenario?.strategicObjectives?.[Object.keys(this.scenario?.strategicObjectives??{}).find(k=>this.normalizeSide(k)===side)]??[];
            const objs=Array.isArray(all)?all:[];
            if(!objs.length)continue;
            const required=objs.filter(o=>String(o?.priority??'secondary').toLowerCase()!=='optional');
            if(!required.length)continue;
            const playerSide=this.normalizeSide(state?.playerSide);
            const uiStates=(side===playerSide&&state?.objectiveStates&&typeof state.objectiveStates==='object')?state.objectiveStates:null;
            let completed=false;
            if(uiStates){
                completed=required.every(o=>uiStates?.[o?.id]?.status==='completed');
            }else{
                completed=required.every((o,i)=>this.policy().enabled?this.objectiveSecure(units,side,o,i,state):this.unitsAtObjective(units,o,side).length>0);
            }
            if(completed)return this.finish(side,`${this.sideName(side)}已完成全部主要及阶段战略任务。`);
        }
        const objectiveDeadlines=[];for(const side of sides){const all=this.scenario?.strategicObjectives?.[side]??this.scenario?.strategicObjectives?.[Object.keys(this.scenario?.strategicObjectives??{}).find(k=>this.normalizeSide(k)===side)]??[];for(const o of(Array.isArray(all)?all:[])){const d=Number(o?.deadlineTurn);if(Number.isFinite(d)&&d>0)objectiveDeadlines.push(d);}}const globalDeadline=Number(rules.deadlineTurn),objectiveDeadline=objectiveDeadlines.length?Math.max(...objectiveDeadlines):NaN;const deadline=(Number.isFinite(objectiveDeadline)&&(!Number.isFinite(globalDeadline)||objectiveDeadline<globalDeadline))?objectiveDeadline:globalDeadline;if(Number.isFinite(deadline)&&Number(state.turn)>deadline){for(const side of sides){const rule=rules[side]??rules[Object.keys(rules).find(k=>this.normalizeSide(k)===side)]??{};const defend=rule.defendObjectivesUntilDeadline;if(defend){const enemy=sides.find(s=>s!==side);if(!this.objectivesSatisfied(units,enemy,{...defend,objectives:defend.objectives},{latch:false,state}))return this.finish(side,defend.successText??rules.deadlineFailureText??`${this.sideName(side)}坚持到规定时间。`);}}const objectiveResult=this.resolveDeadlineByObjectives(units,sides,rules,state);if(objectiveResult)return objectiveResult;}return {gameOver:false};}
    sideName(side){return ({german:"德军",soviet:"苏军",chinese:"中国军",japanese:"日军",british:"英军",italian:"意军",american:"美军",allied:"联军",rok_government:"政府军",new_military:"新军部",pla:"解放军",tw_proxy:"台伪军",red:"红方",blue:"蓝方"})[this.normalizeSide(side)]??side;}
}
