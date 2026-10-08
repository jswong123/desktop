// src/ui/HexInfoPanel.js v0.24.1
export class HexInfoPanel {
  constructor(element,world){this.el=element;this.world=world;this.selected=null;}
  terrainName(t){return ({plain:'平地',forest:'森林',hill:'丘陵',mountain:'山地',urban:'城镇',marsh:'沼泽',water:'水域',concession:'公共租界（中立区）'}[t]??t??'平地');}
  findNamed(q,r){return (this.world.settlements??[]).find(x=>Number(x.q)===Number(q)&&Number(x.r)===Number(r));}
  wallEdgesAt(q,r){return (this.world?.wallEdges??this.world?.config?.wallEdges??[]).filter(e=>[e?.from,e?.to].some(p=>Number(p?.q)===Number(q)&&Number(p?.r)===Number(r)));}
  fortificationName(f){
    if(!f)return '无';
    const t=String(f.type??'fieldworks').toLowerCase();
    const names={foxhole:'散兵坑',trench:'战壕',strongpoint:'加强阵地',bunker:'碉堡',aa_position_1:'一级防空阵地',aa_position_2:'二级防空阵地',aa_position_3:'三级加强防空阵地',permanent_fortress:'永固工事',fortified_building:'坚固建筑工事',urban_barricade:'城市街垒',fieldworks:'野战工事'};
    return f.nameZh??f.name??names[t]??'工事';
  }
  bridgeAt(q,r){return (this.world?.bridges??this.world?.config?.bridges??[]).find(b=>Number(b.q)===q&&Number(b.r)===r||(b.crossingCells??b.cells??[]).some(c=>Number(Array.isArray(c)?c[0]:c?.q)===q&&Number(Array.isArray(c)?c[1]:c?.r)===r));}
  state(hp,max,status){const r=Math.max(0,+hp||0)/Math.max(1,+max||1),s=String(status??'').toLowerCase();if(r<=0||['breached','destroyed'].includes(s))return '摧毁/缺口';if(r<.40)return '严重受损';if(r<.75)return '受损';return '完整';}
  show(q,r){this.selected={q,r};const t=this.world.terrainAt(q,r),place=this.findNamed(q,r),f=(this.world.fortifications??[]).find(x=>Number(x.q)===q&&Number(x.r)===r),m=(this.world.minefields??[]).find(x=>Number(x.q)===q&&Number(x.r)===r),walls=this.wallEdgesAt(q,r),bridge=this.bridgeAt(q,r);
    const wallHtml=walls.length?`<div style="margin-top:7px;padding-top:6px;border-top:1px solid #77715d"><strong>城墙状态</strong>${walls.map((w,i)=>{const max=Math.max(1,Number(w.maxHp??(String(w.type).includes('historic')?260:110))),hp=Math.max(0,Number(w.hp??max)),state=this.state(hp,max,w.status);return `<br>${walls.length>1?`第${i+1}段 · `:''}${w.section??'城墙'}<br>耐久：${Math.round(hp)} / ${Math.round(max)}（${Math.round(hp/max*100)}%）<br>状态：${state}<br>通行：${hp<=0?'可通过':'禁止'}`;}).join('')}</div>`:'';
    const bridgeHtml=bridge?(()=>{const pontoon=String(bridge.bridgeClass??'').toLowerCase()==='pontoon',max=Math.max(1,Number(bridge.maxHp??(pontoon?35:120))),hp=Math.max(0,Number(bridge.hp??max)),state=this.state(hp,max,bridge.status);return `<div style="margin-top:7px;padding-top:6px;border-top:1px solid #77715d"><strong>${pontoon?'浮桥':'桥梁'}</strong><br>耐久：${Math.round(hp)} / ${Math.round(max)}（${Math.round(hp/max*100)}%）<br>状态：${state}<br>通行：${hp<=0?'禁止':'允许'}</div>`;})():'';
    this.el.hidden=false;this.el.innerHTML=`<div class="hex-info-title">地块信息</div>${place?`<strong>${place.nameZh??place.name}</strong><br>`:''}<span>坐标：${q}, ${r}</span><br><span>地形：${this.terrainName(t)}</span><br><span>工事：${f?`${this.fortificationName(f)} · ${f.level??1}级（${Math.round(f.progress??100)}%）`:'无'}</span>${f?`<br><span>工事耐久：${Math.round(Number(f.hp??f.maxHp??0))} / ${Math.round(Number(f.maxHp??f.hp??0))} · ${this.state(f.hp??f.maxHp??1,f.maxHp??f.hp??1,f.status)}</span>`:''}<br><span>地雷：${m?`${m.owner==='chinese'?'中国军':'日军'}雷区 ${Math.round(m.strength??0)}/100`:'无'}</span>${bridgeHtml}${wallHtml}`;
  }
}
