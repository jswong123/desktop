import { applyModernCombatLoss } from "./ModernLogisticsSystem.js";

// ========================================

// CombatSystem.js

// 战斗系统

// ========================================

 

export class CombatSystem {

 

    constructor(world) {

 

        this.world = world;

 

    }

 

 

    // ========================================

    // 六角格距离

    // ========================================

 

    getDistance(a, b) {

 

        if (!a || !b) {

            return Infinity;

        }

 

 

        const dq =

            a.q - b.q;

 

        const dr =

            a.r - b.r;

 

 

        return Math.max(

 

            Math.abs(dq),

 

            Math.abs(dr),

 

            Math.abs(dq + dr)

 

        );

 

    }

 

 

    // ========================================

    // 单位射程

    // ========================================

 

    getRange(unit) {

 

        if (!unit) {

            return 0;

        }

 

 

        const ranges = {

 

            infantry: 1,

 

            motorized: 1,

 

            armor: 1,

 

            artillery: 3,

 

            antitank: 2,

 

            antiair: 2,

 

            engineer: 1,

 

            reconnaissance: 1,

 

            cavalry: 1,

 

            headquarters: 1,
            tank: 2,
            mechanized_infantry: 1,
            wheeled_infantry: 1,
            motorized_infantry: 1,
            amphibious_armor: 2,
            special_forces: 2,
            support: 1,
            supply: 1,
            air_defense: 3,
            recon: 1

 

        };

 

 

        return (

            unit.maxRange ??

            unit.range ??

            ranges[unit.type] ??

            1

        );

 

    }

 

 

    // ========================================

    // 攻击力

    // ========================================

 

    getAttack(unit) {

 

        const values = {

 

            infantry: 6,

 

            motorized: 7,

 

            armor: 10,

 

            artillery: 8,

 

            antitank: 9,

 

            antiair: 4,

 

            engineer: 6,

 

            reconnaissance: 5,

 

            cavalry: 6,

 

            headquarters: 2,
            tank: 10,
            mechanized_infantry: 8,
            wheeled_infantry: 8,
            motorized_infantry: 7,
            amphibious_armor: 10,
            special_forces: 8,
            support: 3,
            supply: 2,
            air_defense: 5,
            recon: 5

 

        };

 

 

        return (

            unit.attack ??

            values[unit.type] ??

            5

        );

 

    }

 

 

    // ========================================

    // 防御力

    // ========================================

 

    getDefense(unit) {

 

        const values = {

 

            infantry: 6,

 

            motorized: 6,

 

            armor: 9,

 

            artillery: 4,

 

            antitank: 5,

 

            antiair: 4,

 

            engineer: 7,

 

            reconnaissance: 4,

 

            cavalry: 5,

 

            headquarters: 3

 

        };

 

 

        return (

            unit.defense ??

            values[unit.type] ??

            5

        );

 

    }

 

 

    // ========================================

    // 是否为敌对阵营

    // ========================================

 

    normalizeFaction(value) {
        const v = String(value ?? "").trim().toLowerCase();
        const aliases = {
            red:"red", pla_red:"red", "红方":"red",
            blue:"blue", pla_blue:"blue", "蓝方":"blue",
            chn:"chinese", china:"chinese", chinese:"chinese", "中国军":"chinese", "国军":"chinese",
            jpn:"japanese", japan:"japanese", japanese:"japanese", "日军":"japanese",
            ger:"german", germany:"german", german:"german", "德军":"german",
            ussr:"soviet", soviet:"soviet", redarmy:"soviet", "苏军":"soviet", "红军":"soviet",
            usa:"american", american:"american", "美军":"american",
            gbr:"british", british:"british", "英军":"british"
        };
        return aliases[v] ?? v;
    }

    getFaction(unit) {
        return this.normalizeFaction(unit?.faction ?? unit?.side ?? unit?.camp ?? unit?.team);
    }

    areEnemies(a, b) {
        const fa = this.getFaction(a);
        const fb = this.getFaction(b);
        return !!(a && b && fa && fb && fa !== fb);
    }

    // 返回详细攻击检查结果。UI、玩家和 AI 共用同一套判定，避免“看起来能打但系统拒绝”。
    getAttackEligibility(attacker, defender) {
        if (!attacker || !defender) return { ok:false, code:"missing", reason:"攻击方或目标不存在" };
        if (!this.areEnemies(attacker, defender)) return { ok:false, code:"friendly", reason:"目标不是敌方单位" };
        if (attacker.destroyed === true) return { ok:false, code:"attacker_destroyed", reason:"攻击单位已经被消灭" };
        if (defender.destroyed === true) return { ok:false, code:"defender_destroyed", reason:"目标已经被消灭" };

        const attackerStrength = Number(attacker.strength ?? attacker.manpower ?? 1);
        const defenderStrength = Number(defender.strength ?? defender.manpower ?? 1);
        if (!Number.isFinite(attackerStrength) || attackerStrength <= 0) return { ok:false, code:"no_strength", reason:"攻击单位已无有效兵力" };
        if (!Number.isFinite(defenderStrength) || defenderStrength <= 0) return { ok:false, code:"target_no_strength", reason:"目标已无有效兵力" };

        const attackValue = Number(this.getAttack(attacker));
        if (!Number.isFinite(attackValue) || attackValue <= 0) return { ok:false, code:"no_attack", reason:"该单位没有直接攻击能力" };

        const ammo = Number(attacker?.ammo ?? attacker?.ammunition ?? attacker?.modern?.ammo ?? 100);
        if (attacker?.modern && Number.isFinite(ammo) && ammo <= 0) return { ok:false, code:"no_ammo", reason:"弹药耗尽，无法攻击" };

        if (attacker.hasAttacked === true || attacker.hasBombarded === true) {
            return { ok:false, code:"already_attacked", reason:"该单位本行动阶段已经攻击" };
        }

        const distance = Number(this.getDistance(attacker, defender));
        if (!Number.isFinite(distance)) return { ok:false, code:"bad_position", reason:"单位坐标异常，无法计算射程" };

        // minRange 只在数据明确提供时采用。普通单位默认最小射程为1。
        // 炮兵的最小射程由装载阶段/炮兵系统提供，避免对所有新兵种误套旧规则。
        const rawMin = Number(attacker.minRange);
        const minRange = Number.isFinite(rawMin) && rawMin >= 1 ? rawMin : 1;
        const rawMax = Number(attacker.maxRange ?? attacker.range ?? this.getRange(attacker));
        const maxRange = Math.max(minRange, Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 1);

        if (distance < minRange) return { ok:false, code:"too_close", reason:`目标距离${distance}格，小于最小射程${minRange}格` , distance, minRange, maxRange };
        if (distance > maxRange) return { ok:false, code:"out_of_range", reason:`目标距离${distance}格，超过最大射程${maxRange}格`, distance, minRange, maxRange };

        return { ok:true, code:"ok", reason:"可以攻击", distance, minRange, maxRange, attackValue, ammo };
    }

    canAttack(attacker, defender) {
        return this.getAttackEligibility(attacker, defender).ok;
    }

    // AI / legacy compatibility: return all living enemy units that pass the
    // exact same eligibility check used by the player combat path.
    getAttackableUnits(attacker, units = []) {
        if (!attacker || !Array.isArray(units)) return [];
        return units.filter(defender => {
            if (!defender || defender === attacker) return false;
            if (defender.destroyed === true) return false;
            return this.getAttackEligibility(attacker, defender).ok;
        });
    }

    // ========================================
    // 伤害计算（玩家与 AI 共用）
    // ========================================
    calculateDamage(attacker, defender) {
        if (!attacker || !defender) return 0;

        const attack = Math.max(0, Number(this.getAttack(attacker)) || 0);
        const defense = Math.max(1, Number(this.getDefense(defender)) || 1);
        const strengthRatio = Math.max(0.15, Math.min(1.25,
            (Number(attacker.strength ?? attacker.manpower ?? 100) || 100) /
            Math.max(1, Number(attacker.maxStrength ?? attacker.maxManpower ?? 100) || 100)
        ));
        const moraleFactor = Math.max(0.55, Math.min(1.15, (Number(attacker.morale ?? 80) || 80) / 80));
        const distance = Math.max(1, Number(this.getDistance(attacker, defender)) || 1);
        const range = Math.max(1, Number(this.getRange(attacker)) || 1);
        const rangeFactor = distance >= range ? 0.88 : 1.0;

        // 保持原项目“兵力点”尺度：一次常规攻击通常造成个位数到十余点损失，
        // 现代单位随后由 applyModernCombatLoss 拆分为人员与装备损失。
        const base = (attack * 1.55) / Math.max(0.70, Math.sqrt(defense));
        const deterministic = 0.92 + (((String(attacker.id ?? attacker.name ?? '').length * 17 +
            String(defender.id ?? defender.name ?? '').length * 11 + distance * 7) % 17) / 100);
        let damage = Math.round(base * strengthRatio * moraleFactor * rangeFactor * deterministic);
        damage = Math.max(1, damage);

        const defenderStrength = Math.max(1, Number(defender.strength ?? 100) || 100);
        return Math.min(damage, Math.max(1, Math.ceil(defenderStrength * 0.45)));
    }

    // ========================================

    // 执行攻击

    // ========================================

 

    attack(

        attacker,

        defender

    ) {

 

        if (

            !this.canAttack(

                attacker,

                defender

            )

        ) {

 

            const eligibility = this.getAttackEligibility(attacker, defender);
            return {
                success: false,
                reason: eligibility.reason ?? "当前无法攻击",
                code: eligibility.code ?? "blocked",
                eligibility
            };

 

        }

 

 

        const beforeStrength =

            defender.strength ??

            100;

 

 

        const damage =

            this.calculateDamage(

                attacker,

                defender

            );

 

 

        let modernLoss = null;
        if (defender?.modern) {
            modernLoss = applyModernCombatLoss(defender, damage);
        } else {
            defender.strength = Math.max(0, beforeStrength - damage);
        }

 

 

        attacker.hasAttacked =

            true;

 

 

        let destroyed =

            false;

 

 

        if (

            defender.strength <= 0

        ) {

 

            defender.destroyed =

                true;

            // v1.2.6: cancel unfinished engineering work when its builder is destroyed.
            // Finished structures live in the world arrays and remain on the battlefield.
            if (defender.engineeringTask) defender.engineeringTask = null;

 

            destroyed =

                true;

 

        }

 

 

        return {

 

            success: true,

 

            attacker,

 

            defender,

 

            damage,

 

            beforeStrength,

 

            afterStrength: defender.strength,
            modernLoss,
            personnelLoss: modernLoss?.personnelLoss ?? 0,
            equipmentLosses: modernLoss?.equipmentLosses ?? [],

            destroyed,

 

            distance:

                this.getDistance(

                    attacker,

                    defender

                )

 

        };

 

    }

 

 

    // ========================================

    // 新行动阶段重置攻击状态

    // ========================================

 

    resetUnit(unit) {

 

        if (!unit) {

            return;

        }

 

 

        unit.hasAttacked = false;
        // 炮击标记也属于阶段性状态；若不清除，炮兵会在后续回合永久失去攻击资格。
        unit.hasBombarded = false;

 

    }

 

 

    resetFaction(

        units,

        faction

    ) {

 

        for (

            const unit

            of units

        ) {

 

            if (this.getFaction(unit) === this.normalizeFaction(faction)) {

 

                this.resetUnit(

                    unit

                );

 

            }

 

        }

 

    }

 

}

