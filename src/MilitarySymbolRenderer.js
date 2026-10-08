// ============================================================
// 
// 东线 1941 - 军事算子绘制系统
//
// 功能：
// 1. 绘制阵营底色
// 2. 绘制步兵 / 装甲 / 炮兵等基础战术符号
// 3. 绘制军 / 师 / 团级指挥机构
// 4. 指挥机构采用 ★ 等级标识
// 5. 指挥机构顶部显示小旗
// 6. 缩小算子尺寸，减少地图拥挤
//
// 注意：
// 本文件只负责视觉显示。
// 不负责：
// - 战斗
// - HQ 判定
// - AI
// - 移动
// - 胜负判定
// ============================================================

export class MilitarySymbolRenderer {

    constructor(ctx) {
        this.ctx = ctx;
    }


    // ========================================================
    // 主绘制函数
    // ========================================================

    draw(unit, x, y, scale = 1, color = "#aaa58f") {

        const ctx = this.ctx;

        // ----------------------------------------------------
        // 算子尺寸
        //
        // 原尺寸：
        // 52 × 38
        //
        // 新尺寸：
        // 44 × 32
        // ----------------------------------------------------

        const width = 44 * scale;
        const height = 32 * scale;

        ctx.save();


        // ====================================================
        // 1. 阵营底色
        // ====================================================

        // 不再按国家写死颜色；颜色由调用方按“攻/防角色”传入。
        ctx.fillStyle = color;


        ctx.strokeStyle = "#1c1c18";
        ctx.lineWidth = 1.8 * scale;


        // ----------------------------------------------------
        // 算子底色
        // ----------------------------------------------------

        ctx.fillRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );


        // ----------------------------------------------------
        // 算子边框
        // ----------------------------------------------------

        ctx.strokeRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );


        // ====================================================
        // 2. 判断是否为指挥机构
        // ====================================================

        const commandLevel =
            this.getCommandLevel(unit);


        if (commandLevel) {

            // ------------------------------------------------
            // 指挥机构
            // ------------------------------------------------

            this.drawCommandUnit(
                unit,
                x,
                y,
                width,
                height,
                scale,
                commandLevel
            );

        } else {

            // ------------------------------------------------
            // 普通作战单位
            // ------------------------------------------------

            this.drawCombatSymbol(
                unit,
                x,
                y,
                width,
                height,
                scale
            );

        }


        // ====================================================
        // 3. 团级隶属标号
        // ====================================================

        if (unit.regiment !== undefined &&
            unit.regiment !== null &&
            unit.regiment !== "") {

            ctx.font =
                `${8 * scale}px FangSong, serif`;

            ctx.textAlign = "center";

            ctx.textBaseline = "middle";

            ctx.fillStyle = "#111";


            ctx.fillText(
                unit.regiment,
                x - width / 2 + 8 * scale,
                y - height / 2 - 6 * scale
            );

        }


        // ====================================================
        // 4. 普通单位等级
        //
        // 指挥机构已经用 ★ 表示等级，
        // 因此这里不再重复绘制等级符号。
        // ====================================================

        if (!commandLevel) {

            ctx.fillStyle = "#111";

            ctx.font =
                `${9 * scale}px serif`;

            ctx.textAlign = "center";

            ctx.textBaseline = "middle";


            let levelSymbol = "";


            if (unit.level === "company") {

                levelSymbol = "Ⅰ";

            } else if (unit.level === "battalion") {

                levelSymbol = "Ⅱ";

            } else if (unit.level === "regiment") {

                levelSymbol = "Ⅲ";

            }


            if (levelSymbol) {

                ctx.fillText(
                    levelSymbol,
                    x,
                    y - height / 2 - 6 * scale
                );

            }

        }


        // ====================================================
        // 5. 单位名称
        // ====================================================

        ctx.font =
            `${9 * scale}px FangSong, serif`;

        ctx.textAlign = "center";

        ctx.textBaseline = "middle";

        ctx.fillStyle = "#111";


        const displayName =
            unit.shortName ||
            unit.name ||
            "";


        ctx.fillText(
            displayName,
            x,
            y + height / 2 + 10 * scale
        );


        ctx.restore();

    }


    // ========================================================
    // 判断指挥机构等级
    // ========================================================

    getCommandLevel(unit) {

        // ====================================================
        // 1. 先判断“它是不是 HQ”
        //
        // 关键规则：编制名称不等于 HQ 身份。
        // 普通单位名称中即使包含“师团 / 旅团 / 联队”，
        // 也绝不能因此被画成指挥旗。
        // ====================================================

        const id = String(unit.id || "").toUpperCase();
        const type = String(unit.type || unit.unitType || "")
            .toLowerCase()
            .replace(/[ _-]/g, "");

        const isGuard =
            id.includes("_GUARD") ||
            type.includes("guard") ||
            String(unit.name || "").includes("警卫");

        if (isGuard) {
            return null;
        }

        const isHQ =
            ["headquarters", "hq", "command", "commandpost"].includes(type) ||
            id.endsWith("_HQ");

        if (!isHQ) {
            return null;
        }


        // ====================================================
        // 2. 已确认是 HQ 后，再判断指挥层级
        // ====================================================

        const level = String(
            unit.commandLevel ||
            unit.echelon ||
            unit.level ||
            unit.formation ||
            ""
        ).toLowerCase();

        const name = String(unit.name || unit.shortName || "");

        if (/armygroup|front|方面军|集团军群/.test(level + " " + name)) {
            return "armygroup";
        }

        if (/army|集团军/.test(level + " " + name)) {
            return "army";
        }

        if (/corps|军司令部|军部/.test(level + " " + name)) {
            return "corps";
        }

        // 日军师团、旅团均一星；中国军师/旅也沿用一星机制。
        if (/division|师团司令部|师团部|师司令部|师部/.test(level + " " + name)) {
            return "division";
        }

        if (/brigade|旅团司令部|旅团部|旅司令部|旅部/.test(level + " " + name)) {
            return "brigade";
        }

        // 日军联队 / 中国军团级 HQ：无星。
        if (/regiment|联队本部|联队部|团司令部|团部/.test(level + " " + name)) {
            return "regiment";
        }

        // 大队本部 / 营部属于基层 HQ，保留指挥旗，但不加星。
        if (/battalion|大队本部|营部/.test(level + " " + name)) {
            return "battalion";
        }

        // 数据只说明是 headquarters、没有可靠层级时：
        // 仍画 HQ 旗，但不凭空添加星级。
        return "hq";

    }


    // ========================================================
    // 绘制指挥机构
    // ========================================================

    drawCommandUnit(
        unit,
        x,
        y,
        width,
        height,
        scale,
        commandLevel
    ) {

        const ctx = this.ctx;


        // ====================================================
        // 星级
        // ====================================================

        // 默认无星；只有明确达到相应指挥层级才加星。
        let stars = "";


        if (commandLevel === "army") {

            // 军司令部
            stars = "★★★";

        } else if (
            commandLevel === "division" ||
            commandLevel === "brigade"
        ) {

            // 师 / 师团 / 旅 / 旅团：一星
            stars = "★";

        } else if (commandLevel === "regiment") {

            // 团部
            stars = "";

        }


        // ----------------------------------------------------
        // 星级文字
        // ----------------------------------------------------

        ctx.fillStyle = "#111";

        ctx.textAlign = "center";

        ctx.textBaseline = "middle";


        // 军级三星需要稍微小一点
        if (commandLevel === "army") {

            ctx.font =
                `bold ${11 * scale}px serif`;

        } else {

            ctx.font =
                `bold ${12 * scale}px serif`;

        }


        ctx.fillText(
            stars,
            x,
            y + 1 * scale
        );


        // ====================================================
        // 小旗
        // ====================================================

        this.drawCommandFlag(
            x,
            y,
            width,
            height,
            scale
        );

    }


    // ========================================================
    // 绘制指挥旗
    // ========================================================

    drawCommandFlag(
        x,
        y,
        width,
        height,
        scale
    ) {

        const ctx = this.ctx;


        const poleX =
            x - width * 0.20;

        const baseY =
            y - height / 2;


        const poleHeight =
            13 * scale;


        // ----------------------------------------------------
        // 旗杆
        // ----------------------------------------------------

        ctx.strokeStyle = "#111";

        ctx.lineWidth =
            1.4 * scale;


        ctx.beginPath();

        ctx.moveTo(
            poleX,
            baseY
        );

        ctx.lineTo(
            poleX,
            baseY - poleHeight
        );

        ctx.stroke();


        // ----------------------------------------------------
        // 三角旗
        // ----------------------------------------------------

        ctx.beginPath();

        ctx.moveTo(
            poleX,
            baseY - poleHeight
        );

        ctx.lineTo(
            poleX + 9 * scale,
            baseY - poleHeight + 3 * scale
        );

        ctx.lineTo(
            poleX,
            baseY - poleHeight + 6 * scale
        );

        ctx.closePath();


        // 使用当前阵营的底色会受到上下文影响，
        // 因此这里根据单位无法直接判断阵营。
        // 为保持清晰，小旗采用浅色填充。
        ctx.fillStyle = "#d8d2b8";

        ctx.fill();

        ctx.stroke();

    }


    // ========================================================
    // 普通作战单位符号
    // ========================================================

    drawCombatSymbol(
        unit,
        x,
        y,
        width,
        height,
        scale
    ) {

        const ctx = this.ctx;


        ctx.strokeStyle = "#111";
        ctx.fillStyle = "#111";

        ctx.lineWidth =
            1.8 * scale;


        // ====================================================
        // 海军单位（V0.7：巡洋舰/驱逐舰/运输船等）
        // ====================================================
        if (["heavy_cruiser","light_cruiser","destroyer","transport","battleship","carrier","submarine"].includes(unit.type)) {
            ctx.beginPath();
            ctx.moveTo(x - width * 0.32, y + height * 0.12);
            ctx.lineTo(x + width * 0.30, y + height * 0.12);
            ctx.lineTo(x + width * 0.18, y + height * 0.30);
            ctx.lineTo(x - width * 0.22, y + height * 0.30);
            ctx.closePath(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y + height * 0.12); ctx.lineTo(x, y - height * 0.22); ctx.stroke();
            if(unit.type === "transport"){ ctx.strokeRect(x-width*0.12,y-height*0.12,width*0.24,height*0.18); }
            else { ctx.beginPath(); ctx.arc(x, y-height*0.12, 3*scale, 0, Math.PI*2); ctx.stroke(); }
            return;
        }

        // ====================================================
        // 兵种识别：兼容 type / unitType / branch / equipment / 中文名称
        // ====================================================
        const rawType = String(unit?.type ?? unit?.unitType ?? unit?.branch ?? "").toLowerCase();
        const equipmentText = Array.isArray(unit?.equipment)
            ? unit.equipment.map(e => `${e?.name ?? ""} ${e?.type ?? ""}`).join(" ")
            : String(unit?.equipment ?? "");
        const identityText = `${rawType} ${unit?.branch ?? ""} ${unit?.equipmentName ?? ""} ${equipmentText} ${unit?.name ?? ""}`.toLowerCase();
        const isAirDefense = ["air_defense", "anti_air", "antiair", "aa"].includes(rawType) ||
            /防空|高射|地空导弹|防空导弹|自行高炮|高炮|sam\b/.test(identityText);
        const isInfantry = ["infantry", "mechanized_infantry", "wheeled_infantry"].includes(rawType) ||
            /步兵|装步|步战/.test(identityText);

        // 防空：炮兵符号 + 右上角 F。
        if (isAirDefense) {
            const ctx=this.ctx;
            ctx.beginPath(); ctx.moveTo(x,y-height*.30); ctx.lineTo(x,y+height*.30); ctx.stroke();
            ctx.beginPath(); ctx.arc(x,y,height*.10,0,Math.PI*2); ctx.fill();
            ctx.font=`bold ${Math.max(8,height*.28)}px FangSong, SimSun, serif`;
            ctx.textAlign="left"; ctx.textBaseline="bottom"; ctx.fillText("F",x+width*.20,y-height*.16);
            return;
        }

        // 装甲/机械化/轮式装步：装甲椭圆内加步兵 X；普通步兵仍为 X。
        if (["mechanized_infantry","wheeled_infantry"].includes(rawType) || /装甲步兵|机械化步兵|轮式装步|两栖装步|装步|步战/.test(identityText)) {
            const ctx=this.ctx;
            ctx.beginPath(); ctx.ellipse(x,y,width*.28,height*.19,0,0,Math.PI*2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x-width*.18,y-height*.12); ctx.lineTo(x+width*.18,y+height*.12);
            ctx.moveTo(x+width*.18,y-height*.12); ctx.lineTo(x-width*.18,y+height*.12); ctx.stroke();
            return;
        }
        if (isInfantry) { this.drawInfantry(x, y, width, height); return; }


        // ====================================================
        // 摩托化步兵
        // ====================================================

        if (
            unit.type === "motorized" ||
            unit.type === "motorized_infantry"
        ) {

            this.drawInfantry(
                x,
                y,
                width,
                height
            );


            this.drawMotorizedMark(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // 装甲
        // ====================================================

        if (
            unit.type === "armor" ||
            unit.type === "tank"
        ) {

            this.drawArmor(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // 炮兵
        // ====================================================

        if (unit.type === "artillery") {

            this.drawArtillery(
                x,
                y,
                scale
            );

            return;

        }


        // ====================================================
        // 侦察
        // ====================================================

        if (
            unit.type === "recon" ||
            unit.type === "reconnaissance"
        ) {

            this.drawRecon(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // 工兵
        // ====================================================

        if (
            unit.type === "engineer" ||
            unit.type === "engineering"
        ) {

            this.drawEngineer(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // 反坦克
        // ====================================================

        if (
            unit.type === "anti_tank" ||
            unit.type === "antitank"
        ) {

            this.drawAntiTank(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // HQ 警卫单位
        //
        // 注意：
        // HQ 属性不等于指挥机构本部。
        // 警卫营/警卫连仍然可以使用自己的兵种符号。
        // ====================================================

        if (
            unit.type === "guard" ||
            unit.type === "guards"
        ) {

            this.drawInfantry(
                x,
                y,
                width,
                height
            );

            return;

        }


        // ====================================================
        // 未识别类型
        // ====================================================

        this.drawDefaultSymbol(
            x,
            y,
            scale
        );

    }


    // ========================================================
    // 步兵
    // ========================================================

    drawInfantry(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();


        ctx.moveTo(
            x - width * 0.32,
            y - height * 0.30
        );

        ctx.lineTo(
            x + width * 0.32,
            y + height * 0.30
        );


        ctx.moveTo(
            x + width * 0.32,
            y - height * 0.30
        );

        ctx.lineTo(
            x - width * 0.32,
            y + height * 0.30
        );


        ctx.stroke();

    }


    // ========================================================
    // 摩托化标识
    // ========================================================

    drawMotorizedMark(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            Math.min(
                width,
                height
            ) * 0.10,
            0,
            Math.PI * 2
        );

        ctx.stroke();

    }


    // ========================================================
    // 装甲
    // ========================================================

    drawArmor(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();


        ctx.ellipse(
            x,
            y,
            width * 0.30,
            height * 0.22,
            0,
            0,
            Math.PI * 2
        );


        ctx.stroke();

    }


    // ========================================================
    // 炮兵
    // ========================================================

    drawArtillery(
        x,
        y,
        scale = 1
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();


        ctx.arc(
            x,
            y,
            4.2 * scale,
            0,
            Math.PI * 2
        );


        ctx.fill();

    }


    // ========================================================
    // 侦察
    // ========================================================

    drawRecon(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();


        ctx.moveTo(
            x - width * 0.28,
            y + height * 0.25
        );

        ctx.lineTo(
            x,
            y - height * 0.27
        );

        ctx.lineTo(
            x + width * 0.28,
            y + height * 0.25
        );


        ctx.stroke();

    }


    // ========================================================
    // 工兵
    // ========================================================

    drawEngineer(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        const left =
            x - width * 0.24;

        const right =
            x + width * 0.24;

        const top =
            y - height * 0.20;

        const bottom =
            y + height * 0.22;


        ctx.beginPath();


        ctx.moveTo(
            left,
            bottom
        );

        ctx.lineTo(
            left,
            top
        );

        ctx.lineTo(
            right,
            top
        );

        ctx.lineTo(
            right,
            bottom
        );


        ctx.stroke();

    }


    // ========================================================
    // 反坦克
    // ========================================================

    drawAntiTank(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();


        ctx.moveTo(
            x - width * 0.27,
            y + height * 0.24
        );

        ctx.lineTo(
            x,
            y - height * 0.26
        );

        ctx.lineTo(
            x + width * 0.27,
            y + height * 0.24
        );

        ctx.closePath();


        ctx.stroke();

    }


    // ========================================================
    // 默认符号
    // ========================================================

    // ========================================================
    // 野战防空：拱形防空罩 + 向上拦截箭头
    // 与步兵、装甲、炮兵符号明确区分。
    // ========================================================
    drawAirDefense(x, y, width, height, scale = 1) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y + height * 0.18, width * 0.24, Math.PI, 0, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + height * 0.18);
        ctx.lineTo(x, y - height * 0.24);
        ctx.moveTo(x, y - height * 0.24);
        ctx.lineTo(x - width * 0.09, y - height * 0.10);
        ctx.moveTo(x, y - height * 0.24);
        ctx.lineTo(x + width * 0.09, y - height * 0.10);
        ctx.stroke();
    }

    drawDefaultSymbol(
        x,
        y,
        scale = 1
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            3.5 * scale,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}
