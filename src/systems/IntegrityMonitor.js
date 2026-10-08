// 主系统完整性监测：单位兵力、阵营编制称谓、城墙公共边与耐久。
export class IntegrityMonitor {
  constructor(world){this.world=world;}
  static dist(a,b){const dq=Number(a?.q)-Number(b?.q),dr=Number(a?.r)-Number(b?.r);return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
  auditScenario(scenario,units=[]){
    const map=scenario?.map??scenario??{}, width=Number(map.width??this.world?.width??0), height=Number(map.height??this.world?.height??0);
    const report={errors:[],warnings:[],repairs:[],walls:0,units:units.length};
    const edges=Array.isArray(map.wallEdges)?map.wallEdges:(Array.isArray(this.world?.wallEdges)?this.world.wallEdges:[]); report.walls=edges.length;
    const seen=new Set();
    for(let i=0;i<edges.length;i++){
      const e=edges[i],a=e?.from,b=e?.to, nums=[a?.q,a?.r,b?.q,b?.r].map(Number);
      if(!nums.every(Number.isFinite)){report.errors.push(`城墙#${i+1} 坐标无效`);continue;}
      const [aq,ar,bq,br]=nums;
      if(width&&height&&(aq<0||ar<0||bq<0||br<0||aq>=width||bq>=width||ar>=height||br>=height))report.errors.push(`城墙#${i+1} 越界 (${aq},${ar})-(${bq},${br})`);
      if(IntegrityMonitor.dist({q:aq,r:ar},{q:bq,r:br})!==1)report.errors.push(`城墙#${i+1} 非相邻格 (${aq},${ar})-(${bq},${br})`);
      const key=[[aq,ar],[bq,br]].sort((x,y)=>x[0]-y[0]||x[1]-y[1]).map(x=>x.join(',')).join('|');
      if(seen.has(key))report.errors.push(`城墙#${i+1} 重复公共边 ${key}`); else seen.add(key);
      const historic=String(e.type??'').includes('historic'), fallback=historic?260:110;
      if(!Number.isFinite(Number(e.maxHp))||Number(e.maxHp)<=0){e.maxHp=fallback;report.repairs.push(`城墙#${i+1} 补全maxHp=${fallback}`);}
      if(!Number.isFinite(Number(e.hp))){e.hp=Number(e.maxHp);report.repairs.push(`城墙#${i+1} 补全hp=${e.hp}`);}
      e.hp=Math.max(0,Math.min(Number(e.maxHp),Number(e.hp))); e.integrity=Math.round(e.hp/Math.max(1,Number(e.maxHp))*100);
    }
    // 城墙拓扑检查：把 wallEdges 看成 Hex 节点之间的墙路图。
    // 度数1=终点，2=正常连续，>2=异常分叉（“花瓣”风险）。同时统计独立墙线数量。
    const graph=new Map();
    const add=(a,b)=>{const ka=`${Number(a.q)},${Number(a.r)}`,kb=`${Number(b.q)},${Number(b.r)}`;if(!graph.has(ka))graph.set(ka,new Set());if(!graph.has(kb))graph.set(kb,new Set());graph.get(ka).add(kb);graph.get(kb).add(ka);};
    for(const e of edges){if(e?.from&&e?.to&&IntegrityMonitor.dist(e.from,e.to)===1)add(e.from,e.to);}
    const branch=[...graph].filter(([,v])=>v.size>2);
    for(const [k,v] of branch)report.warnings.push(`城墙拓扑异常分叉 ${k}（${v.size}方向），存在花瓣状显示风险`);
    let components=0; const visited=new Set();
    for(const k of graph.keys()){if(visited.has(k))continue;components++;const stack=[k];visited.add(k);while(stack.length){const x=stack.pop();for(const y of graph.get(x)??[]){if(!visited.has(y)){visited.add(y);stack.push(y);}}}}
    report.wallComponents=components; report.wallBranches=branch.length;
    for(const u of units){
      const id=u?.id??'(无ID)', s=Number(u?.strength??u?.manpower), max=Number(u?.maxStrength??u?.maxManpower??s);
      if(!Number.isFinite(s)||s<0)report.errors.push(`${id} 当前兵力无效`);
      if(!Number.isFinite(max)||max<=0)report.errors.push(`${id} 最大兵力无效`);
      if(Number.isFinite(s)&&Number.isFinite(max)&&s>max)report.warnings.push(`${id} 当前兵力 ${s} > 最大兵力 ${max}`);
      if(Number.isFinite(s)){u.strength=Math.max(0,s);u.manpower=u.strength;}
      if(Number.isFinite(max)&&max>0){u.maxStrength=max;u.maxManpower=max;}
      if(String(u?.faction??u?.side)==='japanese' && /(?:步兵|攻击|预备|炮兵)营|(?:工兵|机枪|迫击炮|反坦克|突击)连|侦察分队|防空分队/.test(String(u?.name??''))) report.warnings.push(`${id} 日军编制称谓疑似西式：${u.name}`);
    }
    const tag=report.errors.length?'error':report.warnings.length?'warn':'info'; console[tag](`[完整性监测] ${scenario?.name??scenario?.id??'战役'}：${report.units}单位 / ${report.walls}墙段 / ${report.errors.length}错误 / ${report.warnings.length}警告 / ${report.repairs.length}自动修复`,report);
    return report;
  }
}
