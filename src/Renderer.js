// ============================================================

// Renderer.js

// 东线 1941

//

// 地图渲染系统

// V0.4.3 — 高程沙盘 + 稳定屏幕空间算子选择兼容

//

// 功能：

// - 六角格地图

// - 地形

// - 河流

// - 道路

// - 铁路

// - 城镇

// - 军事单位

// - 单位选中框

// - 移动范围

// ============================================================

import {

    drawHexPath

} from "./Hex.js";

export class Renderer {

    constructor(


        canvas,

        world,

        camera

    ) {

        this.canvas = canvas;

        this.ctx =

            canvas.getContext("2d");

        this.world =

            world;

        this.camera =

            camera;

        // 颜色只表达战役角色：红=进攻方，蓝=防守方
        this.attackerSide = "german";
        this.defenderSide = "soviet";

        // 2.5D tabletop view: visual-only, never changes Hex coordinates or rules.
        this.view25D = { enabled: false, direction: "south", depth: 1.0, pitch: 52 };

        // v0.4.1 性能：地形是绝大多数帧中不变化的静态层。
        // 缓存只包含地形顶面/高程侧壁/微地貌，不缓存单位、工事、迷雾、ZOC、道路等动态/规则层，
        // 因此不会改变既有点击、移动、AI、战斗与工程逻辑。
        this._terrainLayerCache = null;
        this._terrainElevationCache = new Map();

        // ----------------------------------------------------

        // Hex 大小

        // ----------------------------------------------------

        this.hexSize = Number(this.world?.hexSize ?? 24);

        // ----------------------------------------------------

        // 外部系统引用

        // ----------------------------------------------------

        this.selection = null;

        this.movementSystem = null;

        // ----------------------------------------------------

        // 地图颜色

        // ----------------------------------------------------

        this.colors = {

            plain:

                "#b4b28f",

            forest:

                "#65705a",

            hill: "#8f8a68",

            mountain: "#77745f",

            marsh:

                "#87917b",

            wetland:

                "#87917b",

            urban:

                "#aaa184",

            water:

                "#7693a1",

            concession:

                "#d8d2b5",

            grid:

                "#747660",

            road:


                "#a38e69",

            railway:

                "#57564c",

            river:

                "#668ba0"

        };

    }

    setView25D(enabled) {
        this.view25D.enabled = !!enabled;
        this.invalidateTerrainCache();
    }

    setViewPitch(degrees) {
        const p = Math.max(35, Math.min(78, Number(degrees) || 52));
        this.view25D.pitch = p;
        // Lower viewing angles exaggerate relief, like a physical command sand table.
        this.view25D.depth = 0.72 + (78 - p) / 43 * 0.95;
        this.invalidateTerrainCache();
    }

    setViewDirection(direction) {
        if (["north", "east", "south", "west"].includes(direction)) {
            this.view25D.direction = direction;
            this.invalidateTerrainCache();
        }
    }

    cycleViewDirection(step = 1) {
        const dirs = ["north", "east", "south", "west"];
        const i = Math.max(0, dirs.indexOf(this.view25D.direction));
        this.view25D.direction = dirs[(i + step + dirs.length) % dirs.length];
        this.invalidateTerrainCache();
        return this.view25D.direction;
    }

    invalidateTerrainCache() {
        this._terrainLayerCache = null;
        this._terrainElevationCache?.clear?.();
    }

    terrainCacheKey() {
        const c=this.camera ?? {};
        const v=this.view25D ?? {};
        return [
            this.canvas.width,this.canvas.height,
            Number(c.x||0).toFixed(2),Number(c.y||0).toFixed(2),Number(c.zoom||1).toFixed(4),
            v.enabled?1:0,v.direction,Number(v.depth||1).toFixed(4),
            this.world?.width,this.world?.height,this.world?.hexSize
        ].join('|');
    }

    terrainElevation(terrain, q = null, r = null) {
        // 集团军训练场优先读取 scenario 中逐格 elevation；旧战役继续使用地形默认值。
        if (Number.isInteger(q) && Number.isInteger(r)) {
            const ck=q+','+r;
            if(this._terrainElevationCache?.has(ck)) return this._terrainElevationCache.get(ck);
            const explicit = this.world?.elevationAt?.(q, r);
            if (Number.isFinite(explicit)) { this._terrainElevationCache?.set(ck,explicit); return explicit; }
        }
        const t = String(terrain ?? "plain").toLowerCase();
        if (t === "mountain") return 4.2;
        if (t === "hill") return 2.0;
        if (t === "urban" || t === "town" || t === "city") return 0.8;
        if (t === "forest") return 0.65;
        if (t === "water" || t === "river") return -0.45;
        if (t === "marsh" || t === "wetland") return -0.12;
        return 0;
    }

    reliefShade(elevation) {
        const e = Math.max(-1, Math.min(6, Number(elevation) || 0));
        if (e < 0) return `rgba(36,65,74,${Math.min(.24,.10+Math.abs(e)*.10)})`;
        return `rgba(246,238,203,${Math.min(.24,.025+e*.027)})`;
    }

    drawTerrainMicroRelief(ctx, q, r, terrain, p, size, elevation) {
        if (!this.view25D?.enabled || size < 7) return;
        const t=String(terrain??'plain').toLowerCase();
        const zoom=this.camera.zoom??1;
        ctx.save();
        ctx.lineCap='round';
        // 山地/丘陵：等高线弧线，强化连续山脊的阅读感。
        if ((t==='mountain'||t==='hill') && elevation>1) {
            ctx.strokeStyle='rgba(48,45,34,.28)';
            ctx.lineWidth=Math.max(.55,.75*zoom);
            for(let i=0;i<2;i++){
                const rr=size*(.30+i*.16);
                ctx.beginPath(); ctx.arc(p.x-size*.06,p.y+size*.06,rr,Math.PI*1.08,Math.PI*1.88); ctx.stroke();
            }
        }
        // 森林：只在较近缩放绘制树冠点，避免集团军大图卡顿。
        if (t==='forest' && size>10) {
            ctx.fillStyle='rgba(38,62,42,.46)';
            const pts=[[-.24,-.08],[.04,-.22],[.25,.05],[-.05,.19]];
            for(const [dx,dy] of pts){ctx.beginPath();ctx.arc(p.x+dx*size,p.y+dy*size,Math.max(1.2,size*.075),0,Math.PI*2);ctx.fill();}
        }
        // 城区：以小型立体建筑块表现街区，不改变六角格命中坐标。
        if ((t==='urban'||t==='city'||t==='town') && size>9) {
            const blocks=[[-.25,-.12,.20,.16],[.05,-.24,.24,.18],[-.02,.08,.27,.18]];
            for(const [dx,dy,bw,bh] of blocks){
                const x=p.x+dx*size,y=p.y+dy*size,w=bw*size,h=bh*size;
                const dv=this.viewDepthVector(Math.max(1.5,size*.09));
                ctx.fillStyle='rgba(77,72,59,.52)'; ctx.fillRect(x+dv.x,y+dv.y,w,h);
                ctx.fillStyle='rgba(210,200,169,.56)'; ctx.fillRect(x,y,w,h);
                ctx.strokeStyle='rgba(62,59,49,.42)'; ctx.lineWidth=Math.max(.5,.65*zoom);ctx.strokeRect(x,y,w,h);
            }
        }
        // 水面/湿地：方向性水纹。
        if ((t==='water'||t==='river'||t==='wetland'||t==='marsh') && size>8){
            ctx.strokeStyle='rgba(224,238,235,.26)';ctx.lineWidth=Math.max(.5,.65*zoom);
            for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(p.x-size*.28,p.y+i*size*.16);ctx.lineTo(p.x+size*.28,p.y+i*size*.16);ctx.stroke();}
        }
        ctx.restore();
    }

    viewDepthVector(scale = 1) {
        const z = (this.camera.zoom ?? 1) * scale;
        const d = this.view25D.direction;
        if (d === "north") return { x: 0, y: -z };
        if (d === "east") return { x: z, y: 0 };
        if (d === "west") return { x: -z, y: 0 };
        return { x: 0, y: z };
    }

    // ========================================================

    // 清空画布

    // ========================================================

    clear() {

        const ctx =

            this.ctx;

        ctx.save();

        ctx.setTransform(

            1,

            0,

            0,

            1,

            0,

            0

        );

        ctx.clearRect(

            0,

            0,

            this.canvas.width,

            this.canvas.height

        );

        ctx.fillStyle =

            "#8f9078";

        ctx.fillRect(

            0,

            0,

            this.canvas.width,

            this.canvas.height

        );

        ctx.restore();

    }

    // ========================================================

    // Hex → 世界坐标

    // ========================================================

    hexToWorld(

        q,

        r

    ) {


        const size =

            this.hexSize;

        return {

            x:

                size *

                Math.sqrt(3) *

                (

                    q +

                    r / 2

                ),

            y:

                size *

                1.5 *

                r

        };

    }

    // ========================================================

    // 世界坐标 → 屏幕坐标

    // ========================================================

    worldPointToScreen(

        x,

        y

    ) {

        return {

            x:

                x *

                this.camera.zoom +

                this.camera.x,

            y:

                y *

                this.camera.zoom +

                this.camera.y

        };

    }

    // ========================================================

    // Hex → 屏幕坐标

    // ========================================================

    worldToScreen(

        q,

        r

    ) {

        const world = this.hexToWorld(q, r);
        const p = this.worldPointToScreen(world.x, world.y);

        // v0.4.0：真正的高程投影。
        // 规则坐标仍然是 (q,r)，只在显示层把地表顶面向上抬升；
        // 因此单位、工事、道路、桥梁等所有调用 worldToScreen 的对象都会贴着地表。
        if (this.view25D?.enabled) {
            const terrain = this.world?.terrainAt?.(+q, +r) ?? 'plain';
            const elevation = this.terrainElevation(terrain, +q, +r);
            const size = this.hexSize * (this.camera?.zoom ?? 1);
            const heightScale = Math.max(3.2, size * 0.34) * (this.view25D.depth ?? 1);
            p.y -= elevation * heightScale;

            // 很轻的观察方向横向偏移，使山脊不是纯粹“上下抬高”的纸片。
            const lateral = elevation * size * 0.045;
            if (this.view25D.direction === 'east') p.x -= lateral;
            else if (this.view25D.direction === 'west') p.x += lateral;
        }
        return p;

    }

    // 平面逻辑位置对应的屏幕坐标；用于绘制山体侧壁底边。
    worldToScreenFlat(q, r) {
        const world = this.hexToWorld(q, r);
        return this.worldPointToScreen(world.x, world.y);
    }

    // ========================================================

    // 地形颜色

    // ========================================================

    terrainColor(

        terrain

    ) {

        return (

            this.colors[terrain] ??

            this.colors.plain

        );

    }

    // ========================================================

    // 绘制基础地图

    // ========================================================

    drawTerrain() {
        const key=this.terrainCacheKey();
        const cached=this._terrainLayerCache;
        if(cached?.key===key && cached.canvas){
            this.ctx.drawImage(cached.canvas,0,0);
            return;
        }

        // 使用离屏 Canvas 生成静态地形层。单位/工事/道路/迷雾等仍由主 Canvas 每帧正常绘制。
        const layer=document.createElement('canvas');
        layer.width=this.canvas.width;
        layer.height=this.canvas.height;
        const mainCtx=this.ctx;
        const layerCtx=layer.getContext('2d',{alpha:true});
        if(!layerCtx){ this._drawTerrainUncached(); return; }
        this.ctx=layerCtx;
        this._drawTerrainUncached();
        this.ctx=mainCtx;
        this._terrainLayerCache={key,canvas:layer};
        mainCtx.drawImage(layer,0,0);
    }

    _drawTerrainUncached() {

        const ctx =

            this.ctx;

        const size =

            this.hexSize *

            this.camera.zoom;

        for (

            let r = 0;

            r < this.world.height;

            r++

        ) {

            for (

                let q = 0;

                q < this.world.width;

                q++

            ) {

                const p =

                    this.worldToScreen(

                        q,

                        r

                    );

                const terrain =

                    this.world.terrainAt(

                        q,

                        r


                    );

                // 视口裁剪：避免沙盘模式反复绘制屏幕外地形。
                const margin=size*4;
                if(p.x < -margin || p.y < -margin || p.x > this.canvas.width+margin || p.y > this.canvas.height+margin) continue;

                const elevation = this.terrainElevation(terrain, q, r);
                if (this.view25D.enabled) {
                    // 顶面 p 已由 worldToScreen 按高程抬升。这里连接到平面底座，形成真正可见的山体侧壁。
                    const flat = this.worldToScreenFlat(q, r);
                    const dy = flat.y - p.y;
                    const dx = flat.x - p.x;
                    if (elevation > 0 && Math.hypot(dx,dy) > 1) {
                        const verts=[];
                        for(let i=0;i<6;i++){
                            const a=Math.PI/180*(60*i-30);
                            verts.push({x:p.x+size*Math.cos(a),y:p.y+size*Math.sin(a)});
                        }
                        // 只画朝观察者的三个侧面，避免整格黑色叠盖。
                        const faces=[[1,2],[2,3],[3,4]];
                        for(const [a,b] of faces){
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(verts[a].x,verts[a].y);
                            ctx.lineTo(verts[b].x,verts[b].y);
                            ctx.lineTo(verts[b].x+dx,verts[b].y+dy);
                            ctx.lineTo(verts[a].x+dx,verts[a].y+dy);
                            ctx.closePath();
                            ctx.fillStyle='rgba(55,52,39,.46)';
                            ctx.fill();
                            ctx.strokeStyle='rgba(30,29,23,.32)';
                            ctx.lineWidth=Math.max(.55,this.camera.zoom*.6);
                            ctx.stroke();
                            ctx.restore();
                        }
                    } else if (elevation < 0) {
                        ctx.save();
                        drawHexPath(ctx,p.x,p.y,size);
                        ctx.fillStyle='rgba(24,46,58,.24)';
                        ctx.fill();
                        ctx.restore();
                    }
                }

                drawHexPath(

                    ctx,

                    p.x,

                    p.y,

                    size

                );

                ctx.fillStyle =

                    this.terrainColor(

                        terrain

                    );

                ctx.fill();

                if (this.view25D.enabled) {
                    ctx.save();
                    drawHexPath(ctx,p.x,p.y,size);
                    ctx.fillStyle=this.reliefShade(elevation);
                    ctx.fill();
                    ctx.restore();
                    // 大地图远景不绘制微地貌纹理，显著降低144×120地图缩放/拖拽开销。
                    if (this.camera.zoom >= 0.72) this.drawTerrainMicroRelief(ctx,q,r,terrain,p,size,elevation);
                }

                // 远景省略逐格网格描边；中近景保持原显示。
                if (this.camera.zoom >= 0.48) {
                    ctx.strokeStyle = this.colors.grid;
                    ctx.lineWidth = Math.max(0.6,this.camera.zoom);
                    ctx.stroke();
                }

            }

        }

    }

    // ========================================================

    // 获取地图要素

    // ========================================================

    getFeatureArray(

        ...names

    ) {

        for (

            const name

            of names

        ) {

            if (

                Array.isArray(

                    this.world[name]

                )

            ) {

                return this.world[name];

            }

        }

        return [];

    }

    // ========================================================

    // 将地图要素节点转换成 Hex


    // ========================================================

    featureHex(

        point

    ) {

        if (!point) {

            return null;

        }

        if (

            Array.isArray(point)

        ) {

            return {

                q: Number(point[0]),

                r: Number(point[1])

            };

        }

        if (

            point.q !== undefined &&

            point.r !== undefined

        ) {

            return {

                q: Number(point.q),

                r: Number(point.r)

            };

        }

        return null;

    }

    // ========================================================

    // 绘制线路

    // ========================================================

    drawFeatureLines(

        features,

        options = {}

    ) {

        const ctx =

            this.ctx;

        const color =

            options.color ??

            "#000000";

        const width =

            options.width ??

            2;

        const dashed =

            options.dashed ??

            false;

        ctx.save();


        ctx.strokeStyle =

            color;

        ctx.lineWidth =

            width *

            this.camera.zoom;

        ctx.lineCap =

            "round";

        ctx.lineJoin =

            "round";

        if (dashed) {

            ctx.setLineDash([

                5 * this.camera.zoom,

                5 * this.camera.zoom

            ]);

        }

        for (

            const feature

            of features

        ) {

            const points =

                feature.points ??

                feature.path ??

                feature.hexes ??

                feature;

            if (

                !Array.isArray(points) ||

                points.length < 2

            ) {

                continue;

            }

            ctx.beginPath();

            let started =

                false;

            for (

                const rawPoint

                of points

            ) {

                const hex =

                    this.featureHex(

                        rawPoint

                    );

                if (!hex) {

                    continue;

                }

                const p =


                    this.worldToScreen(

                        hex.q,

                        hex.r

                    );

                if (!started) {

                    ctx.moveTo(

                        p.x,

                        p.y

                    );

                    started =

                        true;

                }

                else {

                    ctx.lineTo(

                        p.x,

                        p.y

                    );

                }

            }

            if (started) {

                ctx.stroke();

            }

        }

        ctx.restore();

    }

    // ========================================================

    // 河流

    // ========================================================

    drawRivers() {

        const rivers =

            this.getFeatureArray(

                "rivers",

                "riverFeatures"

            );

        this.drawFeatureLines(

            rivers,

            {

                color:

                    this.colors.river,

                width:

                    3.2

            }

        );

    }

    // ========================================================


    // 道路

    // ========================================================

    drawRoads() {

        const roads =

            this.getFeatureArray(

                "roads",

                "roadFeatures"

            );

        this.drawFeatureLines(

            roads,

            {

                color:

                    this.colors.road,

                width:

                    1.8

            }

        );

        // CBD战术地图：在道路本体上绘制街道名称。
        // 标签位置取道路中点，并根据道路方向自动旋转；
        // 道路名称直接以黑色粗体绘制，不使用底幕、边框或阴影。
        const ctx = this.ctx;
        ctx.save();
        for (const road of roads) {
            const pts = road.points ?? road.path ?? [];
            const label = road.nameZh ?? road.name ?? "";
            if (!label || pts.length < 2) continue;

            const midIndex = Math.floor((pts.length - 1) / 2);
            const aRaw = pts[Math.max(0, midIndex - 1)];
            const mRaw = pts[midIndex];
            const bRaw = pts[Math.min(pts.length - 1, midIndex + 1)];
            const qr = (x) => Array.isArray(x) ? { q: x[0], r: x[1] } : x;
            const a = qr(aRaw), m = qr(mRaw), b = qr(bRaw);
            if (m?.q === undefined || m?.r === undefined) continue;

            const p = this.worldToScreen(m.q, m.r);
            const pa = this.worldToScreen(a.q, a.r);
            const pb = this.worldToScreen(b.q, b.r);
            let angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
            // 保持文字从左到右阅读，避免倒置。
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

            const fontSize = Math.max(9, Math.min(14, 11 * this.camera.zoom));
            ctx.font = `600 ${fontSize}px FangSong, STKaiti, serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.translate(p.x, p.y);
            ctx.rotate(angle);
            ctx.font = `700 ${fontSize}px FangSong, STKaiti, serif`;
            ctx.fillStyle = "#171812";
            ctx.fillText(label, 0, 0);
            ctx.rotate(-angle);
            ctx.translate(-p.x, -p.y);
        }
        ctx.restore();

    }

    // ========================================================

    // 铁路

    // ========================================================

    drawRailways() {

        const railways =

            this.getFeatureArray(

                "railways",

                "rails",

                "railwayFeatures"

            );

        this.drawFeatureLines(

            railways,

            {

                color:

                    this.colors.railway,

                width:

                    1.2,

                dashed:

                    true

            }

        );

    }

    // ========================================================
    // 战略要点：直接读取 scenario.strategicObjectives。
    // 红蓝双方共享坐标的目标只绘制一次，保证训练场右侧任务与地图目标点一致。
    // ========================================================
    drawStrategicObjectiveMarkers() {
        const groups=this.world?.scenario?.strategicObjectives??{};
        const all=Object.values(groups).flatMap(v=>Array.isArray(v)?v:[]);
        if(!all.length)return;
        const seen=new Set(), ctx=this.ctx, zoom=this.camera.zoom;
        ctx.save();
        for(const o of all){
            const q=Number(o?.q),r=Number(o?.r);if(!Number.isFinite(q)||!Number.isFinite(r))continue;
            const key=`${q},${r}`;if(seen.has(key))continue;seen.add(key);
            const p=this.worldToScreen(q,r), primary=String(o.priority??'')==='primary';
            const rad=Math.max(8,(primary?12:10)*zoom);
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.font=`${Math.max(14,(primary?20:17)*zoom)}px FangSong, STKaiti, serif`;
            ctx.fillStyle='#8b2f2a';ctx.strokeStyle='rgba(245,236,204,.92)';ctx.lineWidth=Math.max(2,2.5*zoom);
            ctx.strokeText(primary?'★':'◆',p.x,p.y);ctx.fillText(primary?'★':'◆',p.x,p.y);
            const title=String(o.title??o.name??'战略要点').replace(/^(主目标|阶段目标|次要目标)[：:]\s*/, '');
            ctx.font=`${Math.max(9,11*zoom)}px FangSong, STKaiti, serif`;ctx.textBaseline='top';
            ctx.strokeStyle='rgba(235,228,197,.95)';ctx.lineWidth=Math.max(2,3*zoom);ctx.strokeText(title,p.x,p.y+rad);
            ctx.fillStyle='#6f2925';ctx.fillText(title,p.x,p.y+rad);
        }
        ctx.restore();
    }

    // ========================================================

    // 城镇

    // ========================================================

    drawSettlements() {

        const settlements =

            this.getFeatureArray(

                "settlements",

                "cities",


                "towns"

            );

        const ctx =

            this.ctx;

        ctx.save();

        // 地名避让：记录本帧已绘制标签的屏幕矩形。
        const settlementLabelBoxes = [];
        const boxesOverlap=(a,b)=>!(a.x+a.w+3<b.x||b.x+b.w+3<a.x||a.y+a.h+2<b.y||b.y+b.h+2<a.y);

        for (

            const settlement

            of settlements

        ) {

            const q =

                settlement.q;

            const r =

                settlement.r;

            if (

                q === undefined ||

                r === undefined

            ) {

                continue;

            }

            const p =

                this.worldToScreen(

                    q,

                    r

                );

            const radius =

                Math.max(

                    3,

                    4 *

                    this.camera.zoom

                );

            ctx.beginPath();

            ctx.arc(

                p.x,

                p.y,

                radius,

                0,

                Math.PI * 2

            );

            ctx.fillStyle =

                "#34352e";

            ctx.fill();

            ctx.font =

                `${

                    Math.max(

                        10,


                        13 *

                        this.camera.zoom

                    )

                }px FangSong, STKaiti, serif`;

            ctx.fillStyle =

                "#4c493f";

            ctx.textAlign =

                "left";

            ctx.textBaseline =

                "middle";

            const settlementName = settlement.nameZh ?? settlement.name ?? "";
            if (settlement.strategicObjective) {
                ctx.font = `${Math.max(12, 16 * this.camera.zoom)}px FangSong, STKaiti, serif`;
                ctx.fillStyle = "#8b2f2a";
                ctx.textAlign = "center";
                ctx.fillText("★", p.x, p.y - radius - 7);
            }
            // 地名分级：县城 > 镇 > 村，减少浙赣等大地图上的标签拥挤。
            const st=String(settlement.type??'').toLowerCase();
            const base=st==='county'?14:(st==='town'?11:9);
            const dotOffset=st==='county'?7:(st==='town'?5:3);
            ctx.font = `${Math.max(8, base * this.camera.zoom)}px FangSong, STKaiti, serif`;
            ctx.fillStyle = settlement.strategicObjective ? "#6f2925" : "#4c493f";
            const metrics=ctx.measureText(settlementName);
            const tw=Math.max(1,metrics.width), th=Math.max(8,base*this.camera.zoom);
            const gap=radius+dotOffset;
            const candidates=[
                {x:p.x+gap,y:p.y-th/2},{x:p.x-gap-tw,y:p.y-th/2},
                {x:p.x-tw/2,y:p.y-gap-th},{x:p.x-tw/2,y:p.y+gap},
                {x:p.x+gap,y:p.y-gap-th},{x:p.x+gap,y:p.y+gap},
                {x:p.x-gap-tw,y:p.y-gap-th},{x:p.x-gap-tw,y:p.y+gap}
            ];
            let box=candidates.find(c=>!settlementLabelBoxes.some(b=>boxesOverlap({x:c.x,y:c.y,w:tw,h:th},b)));
            for(let ring=2;ring<=5&&!box;ring++){
                const d=gap+ring*th;
                const extra=[{x:p.x+d,y:p.y-th/2},{x:p.x-d-tw,y:p.y-th/2},{x:p.x-tw/2,y:p.y-d-th},{x:p.x-tw/2,y:p.y+d}];
                box=extra.find(c=>!settlementLabelBoxes.some(b=>boxesOverlap({x:c.x,y:c.y,w:tw,h:th},b)));
            }
            box=box??candidates[0];
            settlementLabelBoxes.push({x:box.x,y:box.y,w:tw,h:th});
            ctx.textAlign = "left"; ctx.textBaseline="top";
            ctx.fillText(settlementName, box.x, box.y);

        }

        ctx.restore();

    }

    // ========================================================

    // 移动范围

    // ========================================================

    drawMovementRange() {

        if (

            !this.movementSystem ||

            !this.movementSystem.selectedUnit

        ) {

            return;

        }

        const ctx =

            this.ctx;

        const size =

            this.hexSize *

            this.camera.zoom;

        ctx.save();

        for (

            const [

                key,

                cost

            ]

            of this.movementSystem

                .reachable

                .entries()

        ) {

            const [


                q,

                r

            ] =

                key

                    .split(",")

                    .map(Number);

            const p =

                this.worldToScreen(

                    q,

                    r

                );

            drawHexPath(

                ctx,

                p.x,

                p.y,

                size * 0.92

            );

            ctx.fillStyle =

                "rgba(96, 137, 91, 0.32)";

            ctx.fill();

            ctx.strokeStyle =

                "rgba(65, 103, 65, 0.82)";

            ctx.lineWidth =

                Math.max(

                    1,

                    1.5 *

                    this.camera.zoom

                );

            ctx.stroke();

            // 放大后显示移动成本

            if (

                this.camera.zoom >= 1.15

            ) {

                ctx.fillStyle =

                    "rgba(35, 55, 35, 0.75)";

                ctx.font =

                    `${

                        Math.max(

                            8,

                            9 *

                            this.camera.zoom

                        )

                    }px FangSong, serif`;

                ctx.textAlign =

                    "center";


                ctx.textBaseline =

                    "middle";

                ctx.fillText(

                    String(cost),

                    p.x,

                    p.y

                );

            }

        }

        ctx.restore();

    }

    // ========================================================

    // 单位颜色

    // ========================================================

    normalizeFactionSide(value) {

        const v = String(value ?? "").trim().toLowerCase();

        if (["red","pla_red","红方"].includes(v)) return "red";
        if (["blue","pla_blue","蓝方"].includes(v)) return "blue";
        if (["pla","解放军","中国人民解放军"].includes(v)) return "pla";
        if (["tw_proxy","台伪军"].includes(v)) return "tw_proxy";
        if (["ger", "german", "germany", "axis"].includes(v)) return "german";
        if (["ussr", "soviet", "redarmy", "red_army"].includes(v)) return "soviet";
        if (["chn", "china", "chinese"].includes(v)) return "chinese";
        if (["jpn", "japan", "japanese"].includes(v)) return "japanese";
        if (["gbr", "british", "uk"].includes(v)) return "british";
        if (["ita", "italian", "italy"].includes(v)) return "italian";
        if (["usa", "american", "us"].includes(v)) return "american";
        if (["allied", "allies", "allied_force"].includes(v)) return "allied";
        if (["rok_gov", "rok_government", "government"].includes(v)) return "rok_government";
        if (["newmil", "new_military", "rebel"].includes(v)) return "new_military";

        return v;

    }

    setScenarioSides(attacker, defender) {
        this.attackerSide = this.normalizeFactionSide(attacker);
        this.defenderSide = this.normalizeFactionSide(defender);
    }

    factionColor(faction) {

        const side = this.normalizeFactionSide(faction);

        // 固定阵营色：现代演习 RED 永远红、BLUE 永远蓝；颜色不随玩家/AI身份交换。
        if (side === "red") return "#b65b55";
        if (side === "blue") return "#667f96";
        // 台湾解放系列：解放军固定蓝色，台伪军固定红色。
        if (side === "pla") return "#667f96";
        if (side === "tw_proxy") return "#b65b55";
        // 中国军：蓝；日军：红；苏军：红；德军：灰蓝。
        if (side === "chinese") return "#667f96";
        if (side === "japanese") return "#b65b55";
        if (side === "soviet") return "#b65b55";
        if (side === "german") return "#6f7880";
        if (side === "british") return "#8b7658";
        if (side === "american") return "#6f8267";
        if (side === "italian") return "#9a9272";
        if (side === "allied") return "#667f96";
        if (side === "rok_government") return "#667f96";
        if (side === "new_military") return "#b65b55";

        return "#aaa58f";
    }

    // ========================================================

    // 绘制军事符号

    // ========================================================

    drawMilitarySymbol(unit, x, y, width, height) {

        const ctx = this.ctx;

        const rawType = String(unit.type ?? unit.unitType ?? unit.branch ?? "infantry").toLowerCase();

        const id = String(unit.id ?? "").toUpperCase();

        const name = String(unit.name ?? "");

        const echelon = String(unit.echelon ?? unit.level ?? unit.formation ?? "").toLowerCase();

        const type = rawType.replace(/[ _-]/g, "");

        const isGuard = id.includes("_GUARD") || type.includes("guard") || /警卫/.test(name);

        // HQ 身份与编制层级严格分离：
        // “师团/旅团/联队”出现在普通单位名称中，只表示隶属关系，不能据此画成指挥单位。
        // 只有数据明确标记为 HQ，或 ID 明确以 _HQ 结尾时，才使用指挥旗符号。
        const isHQ = !isGuard && (
            ["headquarters", "hq", "command", "commandpost"].includes(type) ||
            id.endsWith("_HQ")
        );

        const isEngineer = type.includes("engineer") || type.includes("sapper") || /工兵/.test(name);

        const isAT = type.includes("antitank") || type === "at" || /反坦克/.test(name);

        const isRecon = type.includes("recon") || /侦察/.test(name);

        // 装甲抢修单位：装甲椭圆符号 + 右上角独立十字符号。
        // 十字与椭圆保留明显间距，避免缩放后发生交叠。
        const isArmoredRecovery = unit.recoveryVehicle === true
            || String(unit.logisticsRole ?? "").includes("recovery")
            || /装甲抢修|抢修车/.test(name)
            || ["hrec","wrec","lrec","arec"].includes(String(unit.equipmentType ?? unit.chassis ?? "").toLowerCase());

        // 现代陆军战术符号：最终绘制入口统一识别，避免外围映射不生效。
        const identityText = `${rawType} ${unit.unitType ?? ""} ${unit.branch ?? ""} ${unit.equipmentName ?? ""} ${name}`.toLowerCase();
        const isAirDefense = ["airdefense", "antiair", "aa"].includes(type)
            || /air.?defen|anti.?air|防空|高射|地空导弹|防空导弹|自行高炮|高炮/.test(identityText);
        const isMechanizedInfantry = ["mechanizedinfantry", "wheeledinfantry", "motorizedinfantry"].includes(type)
            || /装甲步兵|机械化步兵|轮式装步|两栖装步|装步|步战/.test(identityText);
        const isInfantry = type === "infantry" || /(^|[^装甲机械化轮式两栖])步兵/.test(name);

        const isArmor = isArmoredRecovery || (!isMechanizedInfantry && (type.includes("armor") || type.includes("tank") || /装甲|坦克/.test(name)));

        const isArtillery = type.includes("artillery") || type.includes("gun") || /炮兵|火炮/.test(name);

        const isCavalry = type.includes("cavalry") || /骑兵/.test(name);

        // V0.7.7 独立海军战术符号。保持陆军算子的矩形军棋风格，
        // 但用舰型轮廓/炮塔/飞行甲板等图形与陆军 NATO 符号明确区分。
        const navalType = ({
            aircraftcarrier: "carrier", carrier: "carrier",
            battleship: "battleship", battlecruiser: "battlecruiser",
            heavycruiser: "heavycruiser", lightcruiser: "lightcruiser", cruiser: "lightcruiser",
            destroyer: "destroyer", destroyerescort: "escort", escort: "escort",
            submarine: "submarine", transport: "transport", lst: "landing", landingcraft: "landing",
            minesweeper: "minesweeper", torpedoboat: "torpedoboat"
        })[type] || (unit?.naval === true ? "ship" : null);

        ctx.save();

        ctx.strokeStyle = "#171916";

        ctx.fillStyle = "#171916";

        ctx.lineWidth = Math.max(1.35, 1.8 * this.camera.zoom);

        ctx.lineCap = "round";

        ctx.lineJoin = "round";

        if (navalType) {
            const L=x-width*0.29, R=x+width*0.29, T=y-height*0.19, B=y+height*0.19;
            const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
            const dot=(cx,cy,rr,fill=true)=>{ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);fill?ctx.fill():ctx.stroke();};
            if(navalType === "carrier"){
                ctx.strokeRect(L,T,R-L,B-T); line(x-width*.19,y,x+width*.19,y); line(x+width*.08,T,x+width*.08,B);
            } else if(navalType === "battleship"){
                line(L,y,R,y); dot(x-width*.16,y,height*.10); dot(x+width*.16,y,height*.10); line(x-width*.05,y-height*.15,x+width*.05,y+height*.15);
            } else if(navalType === "battlecruiser"){
                line(L,y,R,y); dot(x-width*.13,y,height*.09); line(x+width*.08,y-height*.12,R,y); line(R,y,x+width*.08,y+height*.12);
            } else if(navalType === "heavycruiser"){
                line(L,y,R,y); dot(x,y,height*.11); line(x-width*.16,y-height*.11,x-width*.16,y+height*.11); line(x+width*.16,y-height*.11,x+width*.16,y+height*.11);
            } else if(navalType === "lightcruiser"){
                line(L,y,R,y); dot(x,y,height*.085,false); line(x-width*.11,y-height*.10,x-width*.11,y+height*.10);
            } else if(navalType === "destroyer"){
                line(L,y,x+width*.15,y); line(x+width*.15,y-height*.14,R,y); line(R,y,x+width*.15,y+height*.14);
            } else if(navalType === "escort"){
                line(L,y,x+width*.12,y); line(x+width*.12,y-height*.11,R,y); line(R,y,x+width*.12,y+height*.11); dot(x-width*.10,y,height*.06,false);
            } else if(navalType === "submarine"){
                line(L,y,R,y); ctx.beginPath();ctx.ellipse(x,y,width*.12,height*.12,0,0,Math.PI*2);ctx.stroke(); line(x,y-height*.12,x,y-height*.24);
            } else if(navalType === "transport"){
                ctx.strokeRect(x-width*.20,y-height*.15,width*.40,height*.30); line(x-width*.26,y+height*.15,x+width*.26,y+height*.15);
            } else if(navalType === "landing"){
                ctx.strokeRect(x-width*.20,y-height*.16,width*.40,height*.25); line(x-width*.13,y+height*.10,x,y+height*.25); line(x,y+height*.25,x+width*.13,y+height*.10);
            } else if(navalType === "minesweeper"){
                line(L,y-height*.10,x-width*.08,y+height*.10); line(x-width*.08,y+height*.10,x+width*.08,y-height*.10); line(x+width*.08,y-height*.10,R,y+height*.10); dot(L,y-height*.10,height*.045); dot(R,y+height*.10,height*.045);
            } else if(navalType === "torpedoboat"){
                line(L,y-height*.10,x,y); line(x,y,R,y-height*.10); line(L,y+height*.10,x,y); line(x,y,R,y+height*.10);
            } else {
                line(L,y,R,y); line(R,y,x+width*.17,y-height*.13); line(R,y,x+width*.17,y+height*.13);
            }
        } else if (isGuard) {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.29, y - height * 0.23);

            ctx.lineTo(x + width * 0.20, y + height * 0.24);

            ctx.moveTo(x + width * 0.20, y - height * 0.23);

            ctx.lineTo(x - width * 0.29, y + height * 0.24);

            ctx.stroke();

            ctx.font = `bold ${Math.max(7, height * 0.23)}px Consolas, monospace`;

            ctx.textAlign = "right";

            ctx.textBaseline = "top";

            ctx.fillText("H", x + width * 0.39, y - height * 0.39);

        } else if (isHQ) {

            const left = x - width * 0.27;

            ctx.beginPath();

            ctx.moveTo(left, y + height * 0.27);

            ctx.lineTo(left, y - height * 0.29);

            ctx.lineTo(x + width * 0.10, y - height * 0.20);

            ctx.lineTo(left, y - height * 0.08);

            ctx.stroke();

            const rankText = `${echelon} ${name}`.toLowerCase();

            // 未识别的基层 HQ 默认无星，避免大队本部等被错误标为一星。
            let stars = 0;

            if (/front|armygroup|方面军|集团军群/.test(rankText)) stars = 4;

            else if (/panzergroup|armoredgroup|装甲集群/.test(rankText)) stars = 3;

            else if (/army|集团军/.test(rankText)) stars = 3;

            else if (/corps|军部|军司令部/.test(rankText)) stars = 2;

            else if (/division|brigade|师部|师司令部|师团|旅团/.test(rankText)) stars = 1;

            else if (/battalion|大队本部|营部/.test(rankText)) stars = 0;
            else if (/regiment|regimental|团部|团司令部|联队/.test(rankText)) stars = 0;

            ctx.font = `${Math.max(7, height * 0.30)}px FangSong, STKaiti, serif`;


            ctx.textAlign = "left";

            ctx.textBaseline = "middle";

            ctx.fillText("★".repeat(stars), x - width * 0.02, y + height * 0.10);

        } else if (isEngineer) {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.25, y + height * 0.22);

            ctx.lineTo(x - width * 0.25, y - height * 0.18);

            ctx.lineTo(x + width * 0.25, y - height * 0.18);

            ctx.lineTo(x + width * 0.25, y + height * 0.22);

            ctx.stroke();

        } else if (isAT) {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.28, y);

            ctx.lineTo(x + width * 0.28, y);

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(x, y, height * 0.12, 0, Math.PI * 2);

            ctx.stroke();

        } else if (isRecon) {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.28, y + height * 0.20);

            ctx.lineTo(x, y - height * 0.22);

            ctx.lineTo(x + width * 0.28, y + height * 0.20);

            ctx.stroke();

        } else if (isAirDefense) {

            // 防空：采用炮兵符号，并在右上角增加独立 F 标志。
            ctx.beginPath();
            ctx.moveTo(x, y - height * 0.30);
            ctx.lineTo(x, y + height * 0.30);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, height * 0.10, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = `bold ${Math.max(8, height * 0.28)}px FangSong, SimSun, serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillText("F", x + width * 0.20, y - height * 0.16);

        } else if (isMechanizedInfantry) {

            // 装甲/机械化步兵：装甲椭圆内部叠加标准步兵 X。
            ctx.beginPath();
            ctx.ellipse(x, y, width * 0.28, height * 0.19, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - width * 0.18, y - height * 0.12);
            ctx.lineTo(x + width * 0.18, y + height * 0.12);
            ctx.moveTo(x + width * 0.18, y - height * 0.12);
            ctx.lineTo(x - width * 0.18, y + height * 0.12);
            ctx.stroke();

        } else if (isInfantry) {

            // 普通步兵：标准 X。
            ctx.beginPath();
            ctx.moveTo(x - width * 0.30, y - height * 0.25);
            ctx.lineTo(x + width * 0.30, y + height * 0.25);
            ctx.moveTo(x + width * 0.30, y - height * 0.25);
            ctx.lineTo(x - width * 0.30, y + height * 0.25);
            ctx.stroke();

        } else if (isArmoredRecovery) {

            // 基础装甲符号。
            ctx.beginPath();
            ctx.ellipse(x - width * 0.035, y + height * 0.015, width * 0.245, height * 0.165, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 抢修十字置于椭圆右上方，并与椭圆边缘留出间隔。
            const crossX = x + width * 0.255;
            const crossY = y - height * 0.245;
            const crossHalf = Math.max(2.2 * this.camera.zoom, Math.min(width, height) * 0.075);
            ctx.beginPath();
            ctx.moveTo(crossX - crossHalf, crossY);
            ctx.lineTo(crossX + crossHalf, crossY);
            ctx.moveTo(crossX, crossY - crossHalf);
            ctx.lineTo(crossX, crossY + crossHalf);
            ctx.stroke();

        } else if (isArmor) {

            ctx.beginPath();

            ctx.ellipse(x, y, width * 0.27, height * 0.18, 0, 0, Math.PI * 2);

            ctx.stroke();

        } else if (isArtillery) {

            ctx.beginPath();

            ctx.moveTo(x, y - height * 0.30);

            ctx.lineTo(x, y + height * 0.30);

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(x, y, height * 0.10, 0, Math.PI * 2);

            ctx.fill();

        } else if (isCavalry) {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.28, y + height * 0.22);

            ctx.lineTo(x + width * 0.22, y - height * 0.22);

            ctx.stroke();

        } else {

            ctx.beginPath();

            ctx.moveTo(x - width * 0.30, y - height * 0.25);

            ctx.lineTo(x + width * 0.30, y + height * 0.25);


            ctx.moveTo(x + width * 0.30, y - height * 0.25);

            ctx.lineTo(x - width * 0.30, y + height * 0.25);

            ctx.stroke();

        }

        ctx.restore();

    }

    // ========================================================

    compactUnitName(name = "") {

        let text = String(name).replace(/\s+/g, "").trim();

        text = text.replace(/第(\d+)(装甲|坦克|摩托化步兵|摩步|步兵|炮兵|反坦克|工兵|骑兵)(师|旅|团|营|连)/g, "$1$2$3");

        text = text.replace(/摩托化步兵/g, "摩步").replace(/机械化步兵/g, "机步");

        text = text.replace(/集团军警卫第(\d+)营/g, "集警$1营").replace(/方面军警卫第(\d+)营/g, "方警$1营");

        text = text.replace(/装甲集群警卫第(\d+)营/g, "装集警$1营");

        text = text.replace(/师部第(\d+)警卫连/g, "师警$1连").replace(/团部警卫连/g, "团警连");

        return text.length > 10 ? `${text.slice(0, 10)}…` : text;

    }

    // ========================================================
    // 城墙边界层
    // ========================================================
    drawWallEdges() {
        const edges = this.world?.wallEdges ?? this.world?.config?.wallEdges ?? [];
        if (!Array.isArray(edges) || !edges.length) return;

        // 城门单独存放在 map.gates 中，不破坏完整的 wallEdges 闭环。
        // gate.open !== false：开放，绘制为真正的城墙缺口；false：关闭，按普通城墙绘制。
        const gates = this.world?.gates ?? this.world?.config?.gates ?? [];
        const sameHex = (p, q) => Number(p?.q) === Number(q?.q) && Number(p?.r) === Number(q?.r);
        const sameBoundary = (a, b, c, d) =>
            (sameHex(a, c) && sameHex(b, d)) || (sameHex(a, d) && sameHex(b, c));
        const openGateAt = (a, b) => Array.isArray(gates) && gates.find(g =>
            g?.open !== false && sameBoundary(a, b, g?.from, g?.to)
        );

        const ctx = this.ctx;
        const size = this.hexSize * this.camera.zoom;

        // pointy-top 六角格六个顶点。与 hexToWorld() 使用同一套几何关系。
        const hexCorners = (q, r) => {

            const c = this.worldToScreen(Number(q), Number(r));
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 180 * (30 + i * 60);
                pts.push({
                    x: c.x + size * Math.cos(angle),
                    y: c.y + size * Math.sin(angle)
                });
            }
            return pts;
        };

        // 找两个相邻六角格真正重合的两个顶点。
        // 这样城墙严格画在公共边上，而不是用“中心点中点+垂线”近似。
        const sharedEdge = (a, b) => {
            const ca = hexCorners(a.q, a.r);
            const cb = hexCorners(b.q, b.r);
            const matches = [];
            const tolerance = Math.max(0.75, size * 0.035);

            for (const pa of ca) {
                for (const pb of cb) {
                    if (Math.hypot(pa.x - pb.x, pa.y - pb.y) <= tolerance) {
                        matches.push({
                            x: (pa.x + pb.x) / 2,
                            y: (pa.y + pb.y) / 2
                        });
                    }
                }
            }

            // 去重
            const unique = [];
            for (const p of matches) {
                if (!unique.some(u => Math.hypot(u.x - p.x, u.y - p.y) < tolerance)) {
                    unique.push(p);
                }
            }
            return unique.length >= 2 ? [unique[0], unique[1]] : null;
        };

        ctx.save();
        ctx.strokeStyle = "#3f3a2d";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.lineWidth = Math.max(2.4, 4.2 * this.camera.zoom);

        for (const e of edges) {
            const a = e?.from ?? {};
            const b = e?.to ?? {};
            const aq = Number(a.q), ar = Number(a.r);
            const bq = Number(b.q), br = Number(b.r);

            if (![aq, ar, bq, br].every(Number.isFinite)) continue;

            // 开放城门：整条公共边不画，从视觉上形成干净、明确的门洞。
            // 寻路系统会对同一条边放行。
            if (openGateAt({ q: aq, r: ar }, { q: bq, r: br })) continue;

            const hp = Number(e.hp ?? e.maxHp ?? 1);
            const status = hp <= 0
                ? "breached"
                : String(e.status ?? "intact").toLowerCase();

            // 已摧毁城墙不绘制。
            if (hp <= 0 || ["breached", "destroyed"].includes(status)) continue;

            const edge = sharedEdge(
                { q: aq, r: ar },
                { q: bq, r: br }
            );

            // wallEdges 正常情况下必须连接两个相邻六角格。
            // 若数据中出现非相邻格，不再画一条错误的孤立斜线。
            if (!edge) {
                console.warn(
                    "[Renderer] 跳过非相邻 wallEdge：",
                    `${aq},${ar} -> ${bq},${br}`
                );
                continue;
            }

            const [p1, p2] = edge;

            const ratio = Math.max(0, Math.min(1, hp / Math.max(1, Number(e.maxHp ?? hp))));
            // 沙盘城墙实体侧面：等级越高墙体越高；受损后侧面透明度下降。
            if(this.view25D?.enabled){
                const wallLevel=Math.max(1,Number(e.level??(String(e.type??'').includes('historic')?3:1)));
                const dv=this.viewDepthVector((2.5+wallLevel*2.2)*this.view25D.depth);
                ctx.save();ctx.globalAlpha=.30+.38*ratio;ctx.strokeStyle='#29261f';ctx.lineWidth=Math.max(3.2,(4.8+wallLevel*1.1)*this.camera.zoom);ctx.beginPath();ctx.moveTo(p1.x+dv.x,p1.y+dv.y);ctx.lineTo(p2.x+dv.x,p2.y+dv.y);ctx.stroke();ctx.restore();
            }
            if (status === "open") {
                const seg = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                ctx.setLineDash([seg * 0.18, seg * 0.64, seg * 0.18]);
            } else if (ratio < .40 || status === "heavily_damaged") {
                ctx.setLineDash([Math.max(2, size*.10), Math.max(3, size*.13)]);
            } else if (ratio < .75 || status === "damaged") {
                ctx.setLineDash([Math.max(5, size*.22), Math.max(2, size*.07)]);
            } else { ctx.setLineDash([]); }
            ctx.globalAlpha = .48 + .52 * ratio;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            ctx.stroke();
        }

        // 连续城墙接缝层：wallEdges 的数据语义是“相邻 Hex 之间存在墙体”。
        // 对同一条防线中连续经过一个 Hex 的两段墙，公共边本身可能不共享顶点；
        // 旧版因此会显示成花瓣/散开的短线。这里在每个度数=2的墙路节点补画最短接缝，
        // 使整条城墙视觉上首尾连续，同时不改变寻路/破坏判定所使用的 wallEdges。
        const incident = new Map();
        const hkey = p => `${Number(p.q)},${Number(p.r)}`;
        const addIncident = (hex, seg) => {
            const k=hkey(hex); if(!incident.has(k)) incident.set(k,[]); incident.get(k).push(seg);
        };
        for (const e of edges) {
            const a=e?.from??{}, b=e?.to??{};
            const aq=Number(a.q),ar=Number(a.r),bq=Number(b.q),br=Number(b.r);
            if(![aq,ar,bq,br].every(Number.isFinite)) continue;
            if(openGateAt({q:aq,r:ar},{q:bq,r:br})) continue;
            const hp=Number(e.hp??e.maxHp??1), status=String(e.status??'intact').toLowerCase();
            if(hp<=0||['breached','destroyed'].includes(status)) continue;
            const seg=sharedEdge({q:aq,r:ar},{q:bq,r:br}); if(!seg) continue;
            const item={e,p1:seg[0],p2:seg[1]}; addIncident({q:aq,r:ar},item); addIncident({q:bq,r:br},item);
        }
        ctx.setLineDash([]); ctx.globalAlpha=1; ctx.strokeStyle='#3f3a2d';
        ctx.lineWidth=Math.max(2.4,4.2*this.camera.zoom); ctx.lineCap='round'; ctx.lineJoin='round';
        for(const segs of incident.values()){
            if(segs.length!==2) continue; // 终点不补；三叉以上交给完整性监测报警，避免花瓣。
            const A=[segs[0].p1,segs[0].p2], B=[segs[1].p1,segs[1].p2];
            let best=null,bd=Infinity;
            for(const a of A)for(const b of B){const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<bd){bd=d;best=[a,b];}}
            if(!best||bd<0.5) continue;
            ctx.beginPath();ctx.moveTo(best[0].x,best[0].y);ctx.lineTo(best[1].x,best[1].y);ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    // ========================================================

    // 防御工事层

    // ========================================================

    drawFortifications() {

        const source = this.world?.fortifications;

        if (!source) return;

        const ctx = this.ctx;

        // 统一转换为 [key, fort]，兼容 Map、Array 和普通 Object。

        let entries = [];

        if (source instanceof Map) {

            entries = Array.from(source.entries());

        } else if (Array.isArray(source)) {

            entries = source.map((fort, index) => [index, fort]);

        } else if (typeof source === "object") {

            entries = Object.entries(source);

        } else {

            return;

        }

        for (const [key, rawFort] of entries) {

            const fort =

                rawFort && typeof rawFort === "object"

                    ? rawFort

                    : {};

            let q;

            let r;

            // 新版格式：工事对象自身保存 q / r。

            if (fort.q !== undefined && fort.r !== undefined) {

                q = Number(fort.q);

                r = Number(fort.r);

            }

            // 兼容旧版 Map/Object："q,r" -> fort。

            else if (typeof key === "string" && key.includes(",")) {

                const parts = key.split(",");

                q = Number(parts[0]);

                r = Number(parts[1]);

            }

            // 兼容 Map 的对象 key：{ q, r }。

            else if (

                key &&

                typeof key === "object" &&

                key.q !== undefined &&

                key.r !== undefined


            ) {

                q = Number(key.q);

                r = Number(key.r);

            }

            // 兼容 Map 的数组 key：[q, r]。

            else if (Array.isArray(key) && key.length >= 2) {

                q = Number(key[0]);

                r = Number(key[1]);

            } else {

                continue;

            }

            if (!Number.isFinite(q) || !Number.isFinite(r)) {

                continue;

            }

            const p = this.worldToScreen(q, r);

            const size = this.hexSize * this.camera.zoom;

            const level = Math.max(1, Math.min(3, Number(fort?.level ?? 1)));

            ctx.save();

            ctx.strokeStyle =

                fort?.owner === "german" ||

                fort?.owner === "GER" ||

                fort?.owner === "Germany"

                    ? "#3e4a42"

                    : "#7b3f36";

            ctx.lineWidth = Math.max(

                1.2,

                (1.3 + level * 0.55) * this.camera.zoom

            );

            ctx.setLineDash([]);

            const fortType=String(fort?.type??"fieldworks").toLowerCase();
            const integrity=Math.max(0,Math.min(100,Number(fort?.integrity??100)));
            // 柏林等高密度城市战：只给关键工事显示名称，避免普通工事文字淹没地图。
            if(fort?.showLabel && this.camera.zoom >= 0.72){
                const label=String(fort?.nameZh??fort?.name??'').trim();
                if(label){
                    ctx.save();
                    ctx.font=`${Math.max(9,11*this.camera.zoom)}px sans-serif`;
                    ctx.textAlign='center'; ctx.textBaseline='bottom';
                    ctx.lineWidth=Math.max(2,3*this.camera.zoom);
                    ctx.strokeStyle='rgba(235,228,196,.92)';
                    ctx.fillStyle='#2b2b24';
                    const ly=p.y-size*.52;
                    ctx.strokeText(label,p.x,ly); ctx.fillText(label,p.x,ly);
                    ctx.restore();
                }
            }
            // 沙盘模式：不同工事拥有不同“实体高度/底座”，一眼区分战壕、碉堡、防空阵地。
            if(this.view25D?.enabled && String(fort?.status)!=='destroyed'){
                const hMap={foxhole:.06,trench:.09,strongpoint:.18,bunker:.34,aa_position_1:.13,aa_position_2:.20,aa_position_3:.28};
                const hh=(hMap[fortType]??.12)*size*this.view25D.depth;
                const dv=this.viewDepthVector(Math.max(2,hh));
                ctx.save();ctx.globalAlpha=.38+.32*(integrity/100);ctx.fillStyle='#332f27';
                if(fortType==='bunker'){ctx.fillRect(p.x-size*.24+dv.x,p.y-size*.04+dv.y,size*.48,size*.32);}
                else if(fortType.startsWith('aa_position')){ctx.beginPath();ctx.arc(p.x+dv.x,p.y+size*.22+dv.y,size*(.20+.035*level),0,Math.PI*2);ctx.fill();}
                else if(fortType==='strongpoint'){ctx.fillRect(p.x-size*.43+dv.x,p.y+size*.20+dv.y,size*.86,Math.max(3,size*.13));}
                else {ctx.beginPath();ctx.ellipse(p.x+dv.x,p.y+size*.28+dv.y,size*.42,Math.max(2,size*.08),0,0,Math.PI*2);ctx.fill();}
                ctx.restore();
            }
            if(integrity<100){const bw=size*.62,bh=Math.max(2,3*this.camera.zoom),bx=p.x-bw/2,by=p.y-size*.48;ctx.save();ctx.globalAlpha=.8;ctx.strokeRect(bx,by,bw,bh);ctx.fillRect(bx,by,bw*(integrity/100),bh);ctx.restore();}
            if(String(fort?.status)==='destroyed'){ctx.save();ctx.lineWidth=Math.max(2,2*this.camera.zoom);ctx.beginPath();ctx.moveTo(p.x-size*.28,p.y-size*.28);ctx.lineTo(p.x+size*.28,p.y+size*.28);ctx.moveTo(p.x+size*.28,p.y-size*.28);ctx.lineTo(p.x-size*.28,p.y+size*.28);ctx.stroke();ctx.restore();continue;}
            // 不同工事使用不同战术符号：散兵坑○、碉堡方框十字、加强阵地双线；战壕沿用折线。
            if(fortType.startsWith("aa_position")){
                const y0=p.y+size*.22, rr=size*.18;
                ctx.beginPath();ctx.arc(p.x,y0,rr,0,Math.PI*2);ctx.moveTo(p.x,y0-rr*1.7);ctx.lineTo(p.x,y0+rr*1.7);ctx.moveTo(p.x-rr*1.35,y0+rr*.9);ctx.lineTo(p.x+rr*1.35,y0-rr*.9);ctx.stroke();
                if(level>=2){ctx.strokeRect(p.x-size*.32,y0-size*.27,size*.64,size*.54);}
                if(level>=3){ctx.strokeRect(p.x-size*.39,y0-size*.34,size*.78,size*.68);}
                ctx.restore();continue;
            }
            if(fortType==="foxhole"){
                ctx.beginPath();
                for(const dx of [-0.28,0,0.28]){ctx.moveTo(p.x+dx*size+size*.09,p.y+size*.30);ctx.arc(p.x+dx*size,p.y+size*.30,size*.09,0,Math.PI*2);}
                ctx.stroke();ctx.restore();continue;
            }
            if(fortType==="bunker"){
                const w=size*.48,h=size*.32,y0=p.y+size*.12;
                ctx.strokeRect(p.x-w/2,y0-h/2,w,h);ctx.beginPath();ctx.moveTo(p.x-w*.28,y0);ctx.lineTo(p.x+w*.28,y0);ctx.moveTo(p.x,y0-h*.28);ctx.lineTo(p.x,y0+h*.28);ctx.stroke();ctx.restore();continue;
            }
            if(fortType==="strongpoint"){
                const y0=p.y+size*.25;ctx.beginPath();ctx.moveTo(p.x-size*.45,y0);ctx.lineTo(p.x+size*.45,y0);ctx.moveTo(p.x-size*.38,y0+size*.13);ctx.lineTo(p.x+size*.38,y0+size*.13);ctx.stroke();ctx.restore();continue;
            }

            // 用短折线表现战壕/加固阵地，不遮盖基础地形。

            const y = p.y + size * 0.28;

            const half = size * 0.48;

            ctx.beginPath();

            ctx.moveTo(p.x - half, y);

            ctx.lineTo(p.x - half * 0.55, y - size * 0.12);

            ctx.lineTo(p.x - half * 0.12, y);

            ctx.lineTo(p.x + half * 0.28, y - size * 0.12);

            ctx.lineTo(p.x + half, y);

            ctx.stroke();

            if (level >= 2) {

                ctx.beginPath();

                ctx.moveTo(p.x - half * 0.72, y + size * 0.13);

                ctx.lineTo(p.x - half * 0.25, y + size * 0.03);

                ctx.lineTo(p.x + half * 0.20, y + size * 0.13);

                ctx.lineTo(p.x + half * 0.68, y + size * 0.03);


                ctx.stroke();

            }

            if (level >= 3) {

                ctx.fillStyle = ctx.strokeStyle;

                ctx.font =

                    `${Math.max(8, 10 * this.camera.zoom)}px Consolas, monospace`;

                ctx.textAlign = "center";

                ctx.textBaseline = "middle";

                ctx.fillText("III", p.x, p.y + size * 0.55);

            }

            ctx.restore();

        }

    }

    // 绘制单位

    // ========================================================

   drawUnits(units = []) {

    const ctx = this.ctx;
    const zoom = Number(this.camera.zoom ?? 1);

    for (const unit of units) {

        if (unit?.offMap === true) {
            continue;
        }

        // 当前兵力
        const current = Number(
            unit?.strength ??

            unit?.manpower ??
            0
        );

        // 已被消灭或兵力无效的单位不绘制
        if (
            unit?.destroyed === true ||
            !Number.isFinite(current) ||
            current <= 0
        ) {
            continue;
        }

        // 没有地图坐标的单位不绘制
        if (unit.q === undefined || unit.r === undefined) {
            continue;
        }


        // ========================================================
        // 单位位置与尺寸
        // ========================================================

        const p = this.worldToScreen(unit.q, unit.r);
        // 大型战役/沙盘视图性能：屏幕外算子不参与绘制。
        const unitMargin=Math.max(80,120*zoom);
        if(p.x < -unitMargin || p.y < -unitMargin || p.x > this.canvas.width+unitMargin || p.y > this.canvas.height+unitMargin) continue;

        const baseW =
            zoom < 0.72 ? 26 :
            zoom < 1.18 ? 32 :
            36;

        const baseH =
            zoom < 0.72 ? 18 :
            zoom < 1.18 ? 22 :
            25;

        const width = baseW * zoom;
        const height = baseH * zoom;


        // ========================================================
        // 被选中单位的黄色边框
        // ========================================================

        const selected =
            this.selection &&

            this.selection.selectedUnit === unit;

        if (selected) {

            ctx.save();

            ctx.strokeStyle = "#e8c85b";
            ctx.lineWidth = Math.max(2, 3 * zoom);

            ctx.strokeRect(
                p.x - width / 2 - 4,
                p.y - height / 2 - 4,
                width + 8,
                height + 8
            );

            ctx.restore();
        }


        // ========================================================
        // 单位算子底色与边框
        // ========================================================

        if (this.view25D.enabled) {
            const v = this.viewDepthVector(Math.max(3.5, 5.5 * zoom));
            ctx.save();
            ctx.fillStyle = "rgba(18,20,17,.62)";
            ctx.strokeStyle = "rgba(12,13,11,.78)";
            ctx.lineWidth = Math.max(1, 1.2 * zoom);
            ctx.fillRect(p.x - width / 2 + v.x, p.y - height / 2 + v.y, width, height);
            ctx.strokeRect(p.x - width / 2 + v.x, p.y - height / 2 + v.y, width, height);
            ctx.restore();
        }

        ctx.save();

        // faction is authoritative; side/camp are compatibility fallbacks.
        ctx.fillStyle = this.factionColor(unit.faction ?? unit.side ?? unit.camp);
        ctx.strokeStyle = "#171916";
        ctx.lineWidth = Math.max(1.3, 1.8 * zoom);

        ctx.fillRect(
            p.x - width / 2,
            p.y - height / 2,
            width,
            height
        );

        ctx.strokeRect(
            p.x - width / 2,
            p.y - height / 2,
            width,
            height
        );

        ctx.restore();



        // ========================================================
        //  军事单位符号
        // ========================================================

        this.drawMilitarySymbol(
            unit,
            p.x,
            p.y,
            width,
            height
        );


        // ========================================================
        // 算子顶部兵力：当前 / 初始（例如 45/100）
        // ========================================================
        const maxStrength = Number(
            unit?.maxStrength ?? unit?.initialStrength ?? unit?.maxManpower ?? current
        );
        ctx.save();
        ctx.fillStyle = "#111";
        ctx.font = `bold ${Math.max(7, 8 * zoom)}px Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const eq0 = Array.isArray(unit?.equipment) ? unit.equipment[0] : null;
        const counterText = unit?.modern && eq0 && Number(eq0.initial)>0
            ? `${Math.max(0,Number(eq0.operational??0))}/${Math.max(1,Number(eq0.initial))}辆`
            : `${Math.max(0, Math.round(current))}/${Math.max(1, Math.round(maxStrength || current || 1))}`;
        ctx.fillText(counterText, p.x, p.y - height / 2 - 2 * zoom);
        ctx.restore();

        // ========================================================
        // 缩放太小时不显示单位名称
        // ========================================================

        if (zoom < 0.72) {
            continue;
        }


        // ========================================================
        // 单位名称
        // ========================================================


        const shortName = this.compactUnitName(
            unit.shortName ??
            unit.name ??
            unit.id ??
            ""
        );

        if (shortName) {

            ctx.save();

            ctx.fillStyle = "#34352f";

            ctx.font =
                `${Math.max(7, 8.5 * zoom)}px FangSong, STKaiti, serif`;

            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            ctx.fillText(
                shortName,
                p.x,
                p.y + height / 2 + 3
            );

            ctx.restore();
        }


        // ========================================================
        // 指挥官信息
        // ========================================================

        const commander = String(
            unit.commander ??
            unit.commanderName ??
            unit.leader ??
            ""
        ).trim();

        const unitType = String(
            unit.type ??
            unit.unitType ??
            unit.branch ??

            ""
        )
            .toLowerCase()
            .replace(/[ _-]/g, "");

        const unitId = String(
            unit.id ?? ""
        ).toUpperCase();

        const unitName = String(
            unit.name ?? ""
        );


        // ========================================================
        // 警卫单位判定
        // ========================================================

        const isGuardUnit =
            unitId.includes("_GUARD") ||
            unitType.includes("guard") ||
            /警卫/.test(unitName);


        // ========================================================
        // 指挥部判定
        // 警卫单位不作为指挥部处理
        // ========================================================

        const isCommandUnit =
            !isGuardUnit &&
            (
                [
                    "headquarters",
                    "hq",
                    "command",
                    "commandpost"
                ].includes(unitType) ||

                unitId.endsWith("_HQ") ||

                /司令部|指挥部|军部|师部|团部/.test(unitName)
            );


        // ========================================================
        // 指挥官姓名
        // ========================================================

        if (
            isCommandUnit &&
            commander &&
            zoom >= 1.0
        ) {

            ctx.save();

            ctx.fillStyle = "#34352f";

            ctx.font =
                `${Math.max(7, 7.5 * zoom)}px FangSong, STKaiti, serif`;

            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            ctx.fillText(
                `指挥官：${commander}`,
                p.x,
                p.y + height / 2 + Math.max(12, 13 * zoom)
            );

            ctx.restore();
        }

    } // ← 关闭 for (const unit of units)

} // ← 关闭 drawUnits()



    drawBridges() {
        const direct=Array.isArray(this.world?.bridges)?this.world.bridges:[];
        const cfg=Array.isArray(this.world?.config?.bridges)?this.world.config.bridges:[];
        const bridges=[...direct,...cfg.filter(x=>!direct.includes(x))];
        const ctx=this.ctx, zoom=this.camera.zoom??1;
        for(const b of bridges){
            const raw=(b.crossingCells??b.cells??[]);
            const cells=raw.length?raw:[b.hex??b];
            const pontoon=String(b.bridgeClass??'').toLowerCase()==='pontoon';const maxHp=Number(b.maxHp??(pontoon?35:120)),hp=Number(b.hp??maxHp),ratio=Math.max(0,Math.min(1,hp/Math.max(1,maxHp)));const status=hp<=0?'destroyed':ratio<.40?'heavily_damaged':ratio<.75?'damaged':String(b.status??'intact').toLowerCase();
            for(const c of cells){
                const q=Number(Array.isArray(c)?c[0]:c?.q),r=Number(Array.isArray(c)?c[1]:c?.r); if(!Number.isFinite(q)||!Number.isFinite(r))continue;
                const p=this.worldToScreen(q,r), size=this.hexSize*zoom;
                // 河流测试图为东西向水带，因此 auto 默认画成南北向跨河桥；scenario 可显式 orientation:'horizontal'。
                const vertical=String(b.orientation??'auto').toLowerCase()!=='horizontal';
                ctx.save();ctx.translate(p.x,p.y);if(vertical)ctx.rotate(Math.PI/2);
                ctx.strokeStyle=status==='destroyed'?'#6b6258':(pontoon?'#17130e':'#2b2118');ctx.globalAlpha=status==='destroyed'?.45:(status==='heavily_damaged'?.58:(status==='damaged'?.76:1));
                ctx.fillStyle=pontoon?'rgba(232,211,151,.96)':'rgba(198,171,119,.96)';ctx.lineWidth=Math.max(2.5,3.4*zoom);ctx.setLineDash([]);
                ctx.beginPath();ctx.moveTo(-size*.50,-size*.15);ctx.lineTo(size*.50,-size*.15);ctx.moveTo(-size*.50,size*.15);ctx.lineTo(size*.50,size*.15);ctx.stroke();
                if(pontoon){for(let i=-3;i<=3;i++){const x=i*size*.14;ctx.beginPath();ctx.ellipse(x,0,size*.06,size*.22,0,0,Math.PI*2);ctx.fill();ctx.stroke();}}
                else {for(let i=-3;i<=3;i++){const x=i*size*.15;ctx.beginPath();ctx.moveTo(x,-size*.20);ctx.lineTo(x,size*.20);ctx.stroke();}}
                if(status==='destroyed'){ctx.beginPath();ctx.moveTo(-size*.22,-size*.30);ctx.lineTo(size*.22,size*.30);ctx.moveTo(size*.22,-size*.30);ctx.lineTo(-size*.22,size*.30);ctx.stroke();}
                ctx.restore();
            }
        }
    }

    drawControlZones(zoneControl) {
        if (!this.showControlZones || !zoneControl) return;
        zoneControl.recompute?.();
        const ctx = this.ctx;
        const size = this.hexSize * this.camera.zoom;
        const attacker = this.normalizeFactionSide(this.attackerSide);
        const defender = this.normalizeFactionSide(this.defenderSide);
        if (!attacker && !defender) return;

        ctx.save();
        for (let r = 0; r < this.world.height; r++) {
            for (let q = 0; q < this.world.width; q++) {
                const a = attacker && zoneControl.isControlledBy(attacker, q, r);
                const d = defender && zoneControl.isControlledBy(defender, q, r);
                if (!a && !d) continue;
                const p = this.worldToScreen(q, r);
                drawHexPath(ctx, p.x, p.y, size * 0.96);
                // 项目统一规则：进攻方红、守方蓝；争夺区紫灰。
                ctx.fillStyle = a && d ? 'rgba(112,72,118,.24)' : a ? 'rgba(178,54,48,.20)' : 'rgba(55,91,158,.20)';
                ctx.fill();
                ctx.strokeStyle = a && d ? 'rgba(105,62,112,.58)' : a ? 'rgba(158,42,38,.52)' : 'rgba(42,73,139,.52)';
                ctx.lineWidth = Math.max(0.8, 1.15 * (this.camera.zoom ?? 1));
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    drawFogOfWar(fog) {
        if(!fog||!fog.side)return; const ctx=this.ctx,size=this.hexSize*this.camera.zoom; ctx.save();
        for(let r=0;r<this.world.height;r++)for(let q=0;q<this.world.width;q++){const state=fog.stateAt(q,r);if(state===2)continue;const p=this.worldToScreen(q,r);const margin=size*2;if(p.x < -margin || p.y < -margin || p.x > this.canvas.width+margin || p.y > this.canvas.height+margin)continue;drawHexPath(ctx,p.x,p.y,size);ctx.fillStyle=state===1?'rgba(27,30,26,.46)':'rgba(12,15,13,.82)';ctx.fill();}
        ctx.restore();
    }

    drawEngineeringTasks(units=[]) {
        const ctx=this.ctx, zoom=this.camera.zoom??1;
        for(const u of units){
            // v1.2.6: destroyed/off-map/zero-strength builders must never leave ghost construction overlays.
            // Completed fortifications are stored in world.fortifications/bridges/etc. and are intentionally untouched.
            const dead = !u || u.destroyed===true || u.offMap===true || Number(u.strength??u.manpower??1)<=0 || (u.manpower!=null && Number(u.manpower)<=0);
            if(dead){ if(u?.engineeringTask) u.engineeringTask=null; continue; }
            const t=u?.engineeringTask;if(!t)continue;const p=this.worldToScreen(+u.q,+u.r), w=30*zoom,h=4*zoom,x=p.x-w/2,y=p.y-this.hexSize*zoom*.72;const ratio=Math.max(0,Math.min(1,(+t.progress||0)/(+t.required||1)));
            ctx.save();ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#e8d7a7';ctx.fillRect(x,y,w*ratio,h);ctx.font=`${Math.max(9,10*zoom)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(`${t.label??'施工'} ${t.progress}/${t.required}`,p.x,y-3*zoom);ctx.restore();
            if(String(t.key??'').startsWith('bridge:')&&Number.isFinite(+t.targetQ)&&Number.isFinite(+t.targetR)){const bp=this.worldToScreen(+t.targetQ,+t.targetR),sz=this.hexSize*zoom;ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#17130e';ctx.lineWidth=Math.max(2,3*zoom);ctx.setLineDash([4*zoom,3*zoom]);ctx.beginPath();ctx.moveTo(bp.x-sz*.46,bp.y-sz*.14);ctx.lineTo(bp.x+sz*.46,bp.y-sz*.14);ctx.moveTo(bp.x-sz*.46,bp.y+sz*.14);ctx.lineTo(bp.x+sz*.46,bp.y+sz*.14);ctx.stroke();ctx.restore();}
        }
    }


    drawMinefields() {
        const mines = this.world?.minefields;
        if (!Array.isArray(mines)) return;
        const ctx=this.ctx; const zoom=this.camera.zoom??1;
        for (const m of mines) {
            const p=this.worldToScreen(Number(m.q),Number(m.r));
            ctx.save(); ctx.strokeStyle=this.factionColor(m.owner); ctx.lineWidth=Math.max(1,1.5*zoom);
            const d=5*zoom; ctx.beginPath(); ctx.moveTo(p.x-d,p.y-d);ctx.lineTo(p.x+d,p.y+d);ctx.moveTo(p.x+d,p.y-d);ctx.lineTo(p.x-d,p.y+d);ctx.stroke(); ctx.restore();
        }
    }


    // Return the exposed outer edges of the actual hex map.
    // Each item is a screen-space segment.  This deliberately follows the
    // hex perimeter instead of drawing a rectangular DOM/canvas frame.
    getMapBoundaryEdges() {
        const size = this.hexSize * (this.camera.zoom ?? 1);
        const dirs = [
            [ 1, 0], [ 0, 1], [-1, 1],
            [-1, 0], [ 0,-1], [ 1,-1]
        ];
        const edges = [];
        const inside = (q,r) => q >= 0 && r >= 0 && q < this.world.width && r < this.world.height;
        const candidates=[];
        for(let q=0;q<this.world.width;q++){candidates.push([q,0]);if(this.world.height>1)candidates.push([q,this.world.height-1]);}
        for(let r=1;r<this.world.height-1;r++){candidates.push([0,r]);if(this.world.width>1)candidates.push([this.world.width-1,r]);}
        for(const [q,r] of candidates){
            const c=this.worldToScreen(q,r);
            for(let i=0;i<6;i++){
                const nq=q+dirs[i][0],nr=r+dirs[i][1];if(inside(nq,nr))continue;
                const a=(60*i-30)*Math.PI/180,b=(60*((i+1)%6)-30)*Math.PI/180;
                edges.push({x1:c.x+size*Math.cos(a),y1:c.y+size*Math.sin(a),x2:c.x+size*Math.cos(b),y2:c.y+size*Math.sin(b)});
            }
        }
        return edges;
    }

    drawSandTableFrame() {
        const ctx=this.ctx;
        const edges=this.getMapBoundaryEdges();
        if (!edges.length) return;
        const zoom=this.camera.zoom??1;

        ctx.save();
        ctx.lineJoin='round';
        ctx.lineCap='round';

        if (this.view25D?.enabled) {
            // 沙盘模式：沿真实 Hex 外缘向观察方向挤出侧壁。
            // 不再使用矩形 fillRect，因此异形地图也会严格贴边。
            const thickness=Math.max(10,Math.min(30,this.hexSize*zoom*.62));
            const v=this.viewDepthVector(thickness);

            // 先画每一段外缘的实体侧壁。
            for (const e of edges) {
                ctx.beginPath();
                ctx.moveTo(e.x1,e.y1);
                ctx.lineTo(e.x2,e.y2);
                ctx.lineTo(e.x2+v.x,e.y2+v.y);
                ctx.lineTo(e.x1+v.x,e.y1+v.y);
                ctx.closePath();
                ctx.fillStyle='rgba(58,51,38,.97)';
                ctx.fill();
                ctx.strokeStyle='rgba(35,31,24,.92)';
                ctx.lineWidth=Math.max(1,1.15*zoom);
                ctx.stroke();
            }

            // 外缘上沿：像木质/金属沙盘桌唇，但完全沿地图实际边界。
            ctx.beginPath();
            for (const e of edges) { ctx.moveTo(e.x1,e.y1); ctx.lineTo(e.x2,e.y2); }
            ctx.strokeStyle='rgba(92,78,55,.98)';
            ctx.lineWidth=Math.max(4,6.2*zoom);
            ctx.stroke();
            ctx.beginPath();
            for (const e of edges) { ctx.moveTo(e.x1,e.y1); ctx.lineTo(e.x2,e.y2); }
            ctx.strokeStyle='rgba(220,203,157,.72)';
            ctx.lineWidth=Math.max(1,1.35*zoom);
            ctx.stroke();
        } else {
            // 二维模式仍保留同一条真实地图包边，但没有任何厚度。
            ctx.beginPath();
            for (const e of edges) { ctx.moveTo(e.x1,e.y1); ctx.lineTo(e.x2,e.y2); }
            ctx.strokeStyle='rgba(73,66,48,.96)';
            ctx.lineWidth=Math.max(2,2.8*zoom);
            ctx.stroke();
            ctx.beginPath();
            for (const e of edges) { ctx.moveTo(e.x1,e.y1); ctx.lineTo(e.x2,e.y2); }
            ctx.strokeStyle='rgba(211,198,157,.58)';
            ctx.lineWidth=Math.max(.7,.85*zoom);
            ctx.stroke();
        }
        ctx.restore();
    }

// ========================================================
// 总渲染
// ========================================================

render(
    units = []
) {

    this.clear();


    // ========================================================
    // 地形
    // ========================================================

    this.drawTerrain();


    // ========================================================
    // 防御工事
    // ========================================================

    this.drawFortifications();
    this.drawWallEdges();

    this.drawMinefields();


    // ========================================================
    // 地理要素
    // ========================================================

    this.drawRoads();

    this.drawRailways();

    this.drawRivers();

    // 桥梁必须在 water / roads / rivers 之后绘制，避免被道路或河流覆盖。
    this.drawBridges();

    this.drawSettlements();
    this.drawStrategicObjectiveMarkers();


    // ========================================================
    // 移动范围
    // 必须位于单位下面

    // ========================================================

    this.drawMovementRange();

    // 控制区：进攻方红、守方蓝；仅改变可视化，不遮挡单位。
    this.drawControlZones(this.zoneControl);


    // ========================================================
    // 单位
    // ========================================================

    this.drawUnits(
        units
    );
    // Fog belongs below active engineering UI. Otherwise the fog overlay darkens
    // the construction label/progress bar and makes "修筑工事" difficult to read.
    this.drawFogOfWar(this.fogOfWar);
    this.drawEngineeringTasks(units);
    this.drawSandTableFrame();

} // ← 关闭 render()


} // ← 关闭 Renderer 类
