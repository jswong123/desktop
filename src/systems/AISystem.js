// ========================================
// AISystem.js
// 敌方 AI
// ========================================

export class AISystem {

    constructor(
        movementSystem,
        combatSystem
    ) {

        this.movementSystem =
            movementSystem;

        this.combatSystem =
            combatSystem;

    }


    // ========================================
    // 六角距离
    // ========================================

    distance(a, b) {

        return (
            this.combatSystem
                .getDistance(
                    a,
                    b
                )
        );

    }


    // ========================================
    // 找最近敌军
    // ========================================

    findNearestEnemy(
        unit,
        units
    ) {

        const enemies =
            units.filter(
                other =>
                    other.faction !==
                        unit.faction &&
                    !other.destroyed &&
                    (other.strength ?? 1) > 0
            );


        if (
            enemies.length === 0
        ) {

            return null;

        }


        enemies.sort(

            (a, b) =>

                this.distance(
                    unit,
                    a
                ) -

                this.distance(
                    unit,
                    b
                )

        );


        return enemies[0];

    }


    // ========================================
    // 找最佳攻击目标
    // ========================================

    findAttackTarget(
        unit,
        units
    ) {

        const targets =
            this.combatSystem
                .getAttackableUnits(
                    unit,
                    units
                );


        if (
            targets.length === 0
        ) {

            return null;

        }


        // 开发者可为增援单位指定攻击目标坐标；进入射程后优先攻击该目标附近敌军。
        if (unit.attackTarget && Number.isFinite(Number(unit.attackTarget.q)) && Number.isFinite(Number(unit.attackTarget.r))) {
            const tq=Number(unit.attackTarget.q), tr=Number(unit.attackTarget.r);
            targets.sort((a,b)=>{
                const da=Math.abs(Number(a.q)-tq)+Math.abs(Number(a.r)-tr);
                const db=Math.abs(Number(b.q)-tq)+Math.abs(Number(b.r)-tr);
                return da-db || (a.strength??100)-(b.strength??100);
            });
            return targets[0];
        }

        // 优先攻击兵力最低的目标

        targets.sort(

            (a, b) =>

                (a.strength ?? 100) -
                (b.strength ?? 100)

        );


        return targets[0];

    }


    // ========================================
    // AI移动
    // ========================================

    moveTowardEnemy(
        unit,
        target,
        units
    ) {

        this.movementSystem
            .selectUnit(
                unit,
                units
            );


        const reachable =
            this.movementSystem
                .reachable;


        if (
            !reachable ||
            reachable.size === 0
        ) {

            return null;

        }


        let bestHex =
            null;

        let bestDistance =
            this.distance(
                unit,
                target
            );


        for (
            const [key, cost]
            of reachable
        ) {

            const parts =
                key.split(",");


            const q =
                Number(parts[0]);

            const r =
                Number(parts[1]);


            const fakePosition = {
                q,
                r
            };


            const distance =
                this.distance(
                    fakePosition,
                    target
                );


            if (
                distance <
                bestDistance
            ) {

                bestDistance =
                    distance;

                bestHex = {
                    q,
                    r,
                    cost
                };

            }

        }


        if (!bestHex) {

            return null;

        }


        return (
            this.movementSystem
                .moveTo(
                    bestHex.q,
                    bestHex.r,
                    units
                )
        );

    }


    isHQ(unit) {
        const t=String(unit?.type??unit?.unitType??unit?.role??'').toLowerCase();
        return /hq|headquarters|command/.test(t) || /司令|指挥部|团部/.test(String(unit?.name??''));
    }

    isGuard(unit) {
        const t=String(unit?.type??unit?.unitType??unit?.role??'').toLowerCase();
        return /guard|security/.test(t) || /警卫|卫队|警备/.test(String(unit?.name??''));
    }

    nearestFriendlyHQ(unit,units){
        return units.filter(x=>x!==unit&&!x.destroyed&&(x.strength??1)>0&&x.faction===unit.faction&&this.isHQ(x))
          .sort((a,b)=>this.distance(unit,a)-this.distance(unit,b))[0]??null;
    }

    moveHQToSafety(unit,units){
        const enemies=units.filter(x=>!x.destroyed&&(x.strength??1)>0&&x.faction!==unit.faction);
        if(!enemies.length)return null;
        const nearest=[...enemies].sort((a,b)=>this.distance(unit,a)-this.distance(unit,b))[0];
        const danger=this.distance(unit,nearest);
        if(danger>4)return null;
        this.movementSystem.selectUnit(unit,units); const reachable=this.movementSystem.reachable; if(!reachable?.size)return null;
        let best=null,bestScore=-Infinity;
        for(const [key,cost] of reachable){const [q,r]=key.split(',').map(Number);const pos={q,r};const enemyDist=Math.min(...enemies.map(e=>this.distance(pos,e)));const escort=units.filter(x=>x!==unit&&!x.destroyed&&x.faction===unit.faction&&!this.isHQ(x)&&this.distance(pos,x)<=2).length;const score=enemyDist*12+escort*5-cost;if(score>bestScore){bestScore=score;best={q,r};}}
        return best?this.movementSystem.moveTo(best.q,best.r,units):null;
    }

    // ========================================
    // 单个 AI 单位行动
    // ========================================

    actUnit(
        unit,
        units
    ) {

        if (
            !unit ||
            unit.destroyed ||
            (unit.strength ?? 1) <= 0
        ) {

            return null;

        }


        // 指挥单位优先保全：敌军进入4格时撤向更安全且有友军掩护的位置。
        if (this.isHQ(unit)) {
            const movement=this.moveHQToSafety(unit,units);
            if(movement)return {type:'hq-retreat',movement};
        }
        // 警卫单位不再盲目追击远处敌军；与最近司令部距离过大时优先回到2格警戒圈。
        if(this.isGuard(unit)){const hq=this.nearestFriendlyHQ(unit,units);if(hq&&this.distance(unit,hq)>2){const movement=this.moveTowardEnemy(unit,hq,units);return {type:'guard-hq',movement};}}

        // ========================================
        // 1. 先检查能否直接攻击
        // ========================================

        let target =
            this.findAttackTarget(
                unit,
                units
            );


        if (target) {

            return {

                type: "attack",

                result:
                    this.combatSystem
                        .attack(
                            unit,
                            target
                        )

            };

        }


        // ========================================
        // 2. 没目标 → 找最近敌人
        // ========================================

        const nearest =
            this.findNearestEnemy(
                unit,
                units
            );


        if (!nearest) {

            return null;

        }


        // ========================================
        // 3. 向最近敌人移动
        // ========================================

        const movement =
            this.moveTowardEnemy(
                unit,
                nearest,
                units
            );


        // ========================================
        // 4. 移动后再次检查攻击
        // ========================================

        target =
            this.findAttackTarget(
                unit,
                units
            );


        if (target) {

            const combat =
                this.combatSystem
                    .attack(
                        unit,
                        target
                    );


            return {

                type:
                    "move-and-attack",

                movement,

                combat

            };

        }


        return {

            type: "move",

            movement

        };

    }


    // ========================================
    // 整个 AI 阵营行动
    // ========================================

    actFaction(
        faction,
        units
    ) {

        const results = [];


        const aiUnits =
            units.filter(
                unit =>
                    unit.faction ===
                        faction &&
                    !unit.destroyed &&
                    (unit.strength ?? 1) > 0
            );


        for (
            const unit
            of aiUnits
        ) {

            const result =
                this.actUnit(
                    unit,
                    units
                );


            if (result) {

                results.push(
                    result
                );

            }

        }


        return results;

    }

}
