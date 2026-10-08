// ============================================================

// UndoSystem.js

// 东线 1941 V1.4

// 玩家行动撤销系统

// ============================================================

export class UndoSystem {

    constructor({ maxHistory = 30 } = {}) {

        this.maxHistory = maxHistory;

        this.history = [];

    }

 

    clone(value) {

        return JSON.parse(JSON.stringify(value));

    }

 

    createSnapshot({ units, turnSystem, gameOver }) {

        return {

            units: this.clone(units ?? []),

            gameOver: gameOver === true,

            turn: {

                turn: turnSystem?.turn ?? turnSystem?.getTurnNumber?.() ?? 1,

                phase: turnSystem?.phase ?? "german",

                year: turnSystem?.year ?? 1941,

                month: turnSystem?.month ?? 6,

                day: turnSystem?.day ?? 26,

                hour: turnSystem?.hour ?? 8,

                minute: turnSystem?.minute ?? 0

            }

        };

    }

 

    push(state, label = "玩家行动") {

        this.history.push({

            label,

            createdAt: Date.now(),

            snapshot: this.createSnapshot(state)

        });

 

        while (this.history.length > this.maxHistory) {

            this.history.shift();

        }

    }

 

    discardLast() {

        return this.history.pop() ?? null;

    }

 

    undo() {

        return this.history.pop() ?? null;

    }

 

    canUndo() {

        return this.history.length > 0;

    }

 

    clear() {

        this.history.length = 0;

    }

}
