// ========================================
// UnitSelection.js
//
// 东线 1941
// 单位选择系统
//
// 功能：
// 1. 点击选择单位
// 2. 玩家单位可以操作
// 3. 敌军单位可以查看
// 4. 死亡单位不可选择
// 5. 兵力为 0 的单位不可选择
// 6. 支持六角格单位查找
// ========================================


export class UnitSelection {

    constructor(
        renderer = null,
        gameState = null
    ) {

        this.renderer =
            renderer;

        this.gameState =
            gameState;


        // 当前真正被选择、
        // 可以进行移动/攻击的单位

        this.selectedUnit =
            null;


        // 当前查看的单位
        // 包括敌军

        this.inspectedUnit =
            null;


        // 当前鼠标对应的 Hex

        this.hoveredHex =
            null;

    }


    // ========================================
    // 设置 Renderer
    // ========================================

    setRenderer(renderer) {

        this.renderer =
            renderer;

    }


    // ========================================
    // 设置 GameState
    // ========================================

    setGameState(gameState) {

        this.gameState =
            gameState;

    }


    // ========================================
    // 判断单位是否存活
    // ========================================

    isUnitAlive(unit) {

        if (!unit) {

            return false;

        }


        if (
            unit.destroyed === true
        ) {

            return false;

        }


        const strength =
            Number(
                unit.strength ??
                100
            );


        if (
            !Number.isFinite(
                strength
            )
        ) {

            return false;

        }


        return (
            strength > 0
        );

    }


    // ========================================
    // 获取玩家阵营
    // ========================================

    getPlayerFaction() {

        if (!this.gameState) {

            return null;

        }


        return (

            this.gameState.playerFaction ??

            this.gameState.controlledFaction ??

            this.gameState.currentPlayerFaction ??

            this.gameState.faction ??

            null

        );

    }


    // ========================================
    // 判断是否为玩家单位
    // ========================================

    isPlayerUnit(unit) {

        if (!unit) {

            return false;

        }


        const playerFaction =
            this.getPlayerFaction();


        /*
         * 初始化阶段如果玩家阵营
         * 尚未写入 GameState，
         * 暂时允许选择。
         *
         * 避免出现：
         * 所有单位都无法选择。
         */

        if (!playerFaction) {

            return true;

        }


        return (
            unit.faction ===
            playerFaction
        );

    }


    // ========================================
    // 根据 Hex 查找单位
    // ========================================

    getUnitAtHex(
        q,
        r,
        units = []
    ) {

        if (
            !Array.isArray(units)
        ) {

            return null;

        }


        for (
            let i =
                units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];


            if (
                unit?.offMap === true ||
                !this.isUnitAlive(
                    unit
                )
            ) {

                continue;

            }


            if (
                Number(unit.q) ===
                    Number(q) &&

                Number(unit.r) ===
                    Number(r)
            ) {

                return unit;

            }

        }


        return null;

    }


    // ========================================
    // 别名：
    // 部分旧 main.js 可能使用 findUnitAtHex
    // ========================================

    findUnitAtHex(
        q,
        r,
        units = []
    ) {

        return this.getUnitAtHex(

            q,

            r,

            units

        );

    }


    // ========================================
    // 检查 Hex 是否被占据
    // ========================================

    isHexOccupied(
        q,
        r,
        units = [],
        ignoredUnit = null
    ) {

        if (
            !Array.isArray(units)
        ) {

            return false;

        }


        for (
            const unit
            of units
        ) {

            if (
                unit ===
                ignoredUnit
            ) {

                continue;

            }


            if (
                unit?.offMap === true ||
                !this.isUnitAlive(
                    unit
                )
            ) {

                continue;

            }


            if (
                Number(unit.q) ===
                    Number(q) &&

                Number(unit.r) ===
                    Number(r)
            ) {

                return true;

            }

        }


        return false;

    }


    // ========================================
    // 选择单位
    // ========================================

    selectUnit(unit) {

        // ========================================
        // 无效 / 死亡单位
        // ========================================

        if (
            !this.isUnitAlive(
                unit
            )
        ) {

            this.clearSelection();

            return null;

        }


        // ========================================
        // 当前查看单位
        // ========================================

        this.inspectedUnit =
            unit;


        // ========================================
        // 敌军：
        // 可以查看
        // 不能作为玩家操作单位
        // ========================================

        if (
            !this.isPlayerUnit(
                unit
            )
        ) {

            this.selectedUnit =
                null;


            return unit;

        }


        // ========================================
        // 玩家单位
        // ========================================

        this.selectedUnit =
            unit;


        return unit;

    }


    // ========================================
    // 通过 Hex 选择单位
    // ========================================

    selectHex(
        q,
        r,
        units = []
    ) {

        const unit =
            this.getUnitAtHex(

                q,

                r,

                units

            );


        if (!unit) {

            this.clearSelection();

            return null;

        }


        return this.selectUnit(
            unit
        );

    }


    // ========================================
    // 兼容接口
    // ========================================

    selectAtHex(
        q,
        r,
        units = []
    ) {

        return this.selectHex(

            q,

            r,

            units

        );

    }


    // ========================================
    // 设置 selectedUnit
    // ========================================

    setSelectedUnit(unit) {

        return this.selectUnit(
            unit
        );

    }


    // ========================================
    // 获取当前选择单位
    // ========================================

    getSelectedUnit() {

        if (
            this.selectedUnit &&
            !this.isUnitAlive(
                this.selectedUnit
            )
        ) {

            this.selectedUnit =
                null;

        }


        return this.selectedUnit;

    }


    // ========================================
    // 获取当前查看单位
    // ========================================

    getInspectedUnit() {

        if (
            this.inspectedUnit &&
            !this.isUnitAlive(
                this.inspectedUnit
            )
        ) {

            this.inspectedUnit =
                null;

        }


        return this.inspectedUnit;

    }


    // ========================================
    // 是否存在玩家选择
    // ========================================

    hasSelection() {

        return (
            this.getSelectedUnit() !==
            null
        );

    }


    // ========================================
    // 清除所有选择
    // ========================================

    clearSelection() {

        this.selectedUnit =
            null;

        this.inspectedUnit =
            null;

        this.hoveredHex =
            null;

    }


    // ========================================
    // 兼容旧版 clear()
    // ========================================

    clear() {

        this.clearSelection();

    }


    // ========================================
    // 只取消操作单位
    // ========================================

    clearSelectedUnit() {

        this.selectedUnit =
            null;

    }


    // ========================================
    // 设置当前 Hover Hex
    // ========================================

    setHoveredHex(
        q,
        r
    ) {

        this.hoveredHex = {

            q:
                Number(q),

            r:
                Number(r)

        };

    }


    // ========================================
    // 清除 Hover
    // ========================================

    clearHoveredHex() {

        this.hoveredHex =
            null;

    }


    // ========================================
    // 清理死亡选择
    // ========================================

    cleanupDeadSelection() {

        if (
            this.selectedUnit &&
            !this.isUnitAlive(
                this.selectedUnit
            )
        ) {

            this.selectedUnit =
                null;

        }


        if (
            this.inspectedUnit &&
            !this.isUnitAlive(
                this.inspectedUnit
            )
        ) {

            this.inspectedUnit =
                null;

        }

    }


    // ========================================
    // 删除 units 数组中的死亡单位
    //
    // strength <= 0
    // 或 destroyed === true
    //
    // 都会真正从数组删除
    // ========================================

    removeDestroyedUnits(
        units = []
    ) {

        if (
            !Array.isArray(units)
        ) {

            return 0;

        }


        let removed =
            0;


        for (
            let i =
                units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];


            if (
                this.isUnitAlive(
                    unit
                )
            ) {

                continue;

            }


            units.splice(
                i,
                1
            );


            removed++;

        }


        this.cleanupDeadSelection();


        return removed;

    }


    // ========================================
    // 获取某阵营存活单位
    // ========================================

    getAliveUnits(
        units = [],
        faction = null
    ) {

        if (
            !Array.isArray(units)
        ) {

            return [];

        }


        return units.filter(

            unit => {

                if (
                    !this.isUnitAlive(
                        unit
                    )
                ) {

                    return false;

                }


                if (
                    faction === null
                ) {

                    return true;

                }


                return (
                    unit.faction ===
                    faction
                );

            }

        );

    }


    // ========================================
    // 获取玩家存活单位
    // ========================================

    getPlayerUnits(
        units = []
    ) {

        const faction =
            this.getPlayerFaction();


        if (!faction) {

            return this.getAliveUnits(
                units
            );

        }


        return this.getAliveUnits(

            units,

            faction

        );

    }


    // ========================================
    // 检查选择状态
    //
    // 每次 render 前调用也没问题
    // ========================================

    update() {

        this.cleanupDeadSelection();

    }


    // ========================================
    // 调试信息
    // ========================================

    debug() {

        console.log(
            "[UnitSelection]",
            {

                playerFaction:
                    this.getPlayerFaction(),

                selectedUnit:
                    this.selectedUnit
                        ?.id ??
                    null,

                inspectedUnit:
                    this.inspectedUnit
                        ?.id ??
                    null,

                hoveredHex:
                    this.hoveredHex

            }
        );

    }

}
