import { IBattleUnit, BattleType, UnitType } from './CombatSystem';
import { Player } from './Player';

/**
 * CombinedBattleUnit: 组合多个战斗单位（如 AI军队 + 玩家）
 * 统一处理兵力合并、战损分配、战后逻辑
 */
export class CombinedBattleUnit implements IBattleUnit {
    public id: string;
    public name: string;
    public factionId: string | null;
    public isDestroyed: boolean = false;

    // 继承 mainUnit 的 unitType
    public get unitType(): UnitType {
        return this.mainUnit.unitType;
    }

    private mainUnit: IBattleUnit; // 主要单位（Army, City, NPC）
    private player: Player | null = null;
    private playerRatio: number = 0; // 玩家兵力占比

    private initialTotalTroops: number = 0;
    private onVictoryCallback?: () => void;
    private onDefeatCallback?: () => void;

    constructor(
        mainUnit: IBattleUnit,
        options?: {
            player?: Player;
            onVictory?: () => void;
            onDefeat?: () => void;
        }
    ) {
        this.mainUnit = mainUnit;
        this.id = mainUnit.id;
        this.name = mainUnit.name;
        this.factionId = mainUnit.factionId;

        if (options?.player) {
            this.player = options.player;
            const playerTroops = this.player.getTroops();
            const mainTroops = this.mainUnit.troops;
            const total = playerTroops + mainTroops;
            this.playerRatio = total > 0 ? playerTroops / total : 0;
        }

        this.initialTotalTroops = this.troops;
        this.onVictoryCallback = options?.onVictory;
        this.onDefeatCallback = options?.onDefeat;
    }

    // 获取合并后的总兵力
    public get troops(): number {
        const mainTroops = this.mainUnit.troops;
        // [FIX] If main unit has 0 troops, return 0 to trigger battle end
        // Player protection (min 1) should not prevent battle from ending
        if (mainTroops <= 0) {
            return 0;
        }
        if (this.player) {
            return mainTroops + this.player.getTroops();
        }
        return mainTroops;
    }

    public get maxTroops(): number {
        const mainMax = this.mainUnit.maxTroops;
        if (this.player) {
            return mainMax + this.player.getMaxTroops();
        }
        return mainMax;
    }

    // 设置兵力（自动分配给AI和玩家）
    public setTroops(count: number): void {
        if (this.player && this.playerRatio > 0) {
            // 按比例分配兵力
            const playerTroops = Math.floor(count * this.playerRatio);
            const mainTroops = count - playerTroops;

            this.player.setTroops(Math.max(1, playerTroops)); // 玩家最少1兵
            this.mainUnit.setTroops(Math.max(0, mainTroops));
        } else {
            this.mainUnit.setTroops(count);
        }
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.mainUnit.destroy();
    }

    public getPosition(): { lat: number; lng: number } {
        return this.mainUnit.getPosition();
    }

    // [NEW] Store battle info for delayed trigger
    private pendingBattle: { opponent: IBattleUnit; battleType: BattleType } | null = null;
    private battleCheckInterval: number | null = null;
    private static readonly PARTICIPATION_DISTANCE = 1.5;

    public onBattleStart(opponent: IBattleUnit, battleType: BattleType): void {
        // 通知主单位战斗开始
        this.mainUnit.onBattleStart?.(opponent, battleType);

        // 如果玩家参与，检查是否已到达战场
        if (this.player) {
            const opponentPos = opponent.getPosition();
            const playerPos = this.player.getPosition();
            const dist = Math.sqrt(
                Math.pow(playerPos.latitude - opponentPos.lat, 2) +
                Math.pow(playerPos.longitude - opponentPos.lng, 2)
            );

            if (dist < CombinedBattleUnit.PARTICIPATION_DISTANCE) {
                // Player is already near, trigger combat immediately
                this.player.setCombatState(true, battleType, opponentPos);
            } else {
                // Player is still marching, check periodically
                console.log(`[CombinedBattleUnit] Player is ${dist.toFixed(2)} away, waiting for arrival...`);
                this.pendingBattle = { opponent, battleType };
                this.battleCheckInterval = window.setInterval(() => {
                    this.checkPlayerArrival();
                }, 500) as unknown as number;
            }
        }
    }

    private checkPlayerArrival(): void {
        if (!this.player || !this.pendingBattle) return;

        const opponentPos = this.pendingBattle.opponent.getPosition();
        const playerPos = this.player.getPosition();
        const dist = Math.sqrt(
            Math.pow(playerPos.latitude - opponentPos.lat, 2) +
            Math.pow(playerPos.longitude - opponentPos.lng, 2)
        );

        if (dist < CombinedBattleUnit.PARTICIPATION_DISTANCE) {
            console.log(`[CombinedBattleUnit] Player arrived! Triggering combat state.`);
            this.player.setCombatState(true, this.pendingBattle.battleType, opponentPos);
            this.clearBattleCheck();
        }
    }

    private clearBattleCheck(): void {
        if (this.battleCheckInterval !== null) {
            window.clearInterval(this.battleCheckInterval);
            this.battleCheckInterval = null;
        }
        this.pendingBattle = null;
    }

    public onBattleEnd(result: 'victory' | 'defeat', opponent: IBattleUnit, enemyKilled: number): void {
        // Clear any pending battle check
        this.clearBattleCheck();

        // [FIX] Reset player combat state FIRST, before calling mainUnit.onBattleEnd
        // This allows the player to move in the afterBattle chain callbacks
        if (this.player) {
            this.player.setCombatState(false);

            if (result === 'victory') {
                // 玩家获得的功勋 = 总击杀 × 玩家占比
                const playerMerit = Math.floor(enemyKilled * this.playerRatio);
                this.player.addMerit(playerMerit);
                console.log(`🎉 Player Victory! Gained ${playerMerit} merit (Kills: ${enemyKilled}, Ratio: ${this.playerRatio.toFixed(2)})`);
            } else {
                // 战败：玩家兵力降至1（已在setTroops中处理）
                console.log(`💀 Player Defeat! Troops reduced to 1.`);
                this.player.setTroops(1);
            }

            // Note: Don't reset isAutoMarching here - let checkPlayerParticipation set it for chain events
        }

        // 通知主单位战斗结束 (this may trigger afterBattle chain which needs player to be movable)
        this.mainUnit.onBattleEnd?.(result, opponent, enemyKilled);

        // 执行自定义回调
        if (result === 'victory') {
            this.onVictoryCallback?.();
        } else {
            this.onDefeatCallback?.();
        }
    }

    public showDamage?(damage: number): void {
        this.mainUnit.showDamage?.(damage);
    }

    // [NEW] Morale Delegation
    public get morale(): number {
        return this.mainUnit.morale;
    }
    public get maxMorale(): number {
        return this.mainUnit.maxMorale;
    }
    public setMorale(count: number): void {
        this.mainUnit.setMorale(count);
    }
}
