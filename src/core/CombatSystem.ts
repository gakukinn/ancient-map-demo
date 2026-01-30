import { GameConfig } from '../config/GameConfig';
import { TerrainSpeedSystem } from './TerrainSpeedSystem';

export type BattleType = 'siege' | 'field';

import { getEuclideanDistance } from './DistanceUtils'; // [NEW] Import distance utility


export type UnitType = 'player' | 'legion' | 'city' | 'bandit' | 'army' | 'npc';

export interface IBattleUnit {
    id: string;
    name: string;
    factionId: string | null;
    unitType: UnitType; // Refers to entity type (UnitType)
    legionType?: string; // [NEW] Refers to combat class (infantry, cavalry, etc.)
    troops: number;
    maxTroops: number;
    setTroops(count: number): void;
    isDestroyed: boolean;
    destroy(): void;
    getPosition(): { lat: number, lng: number };
    onBattleStart?(opponent: IBattleUnit, battleType: BattleType): void;
    onBattleEnd?(result: 'victory' | 'defeat', opponent: IBattleUnit, enemyKilled: number): void;
    // Visual feedback
    showDamage?(damage: number): void;
    isInvincible?: boolean;
    playerParticipation?: { ratio: number }; // [ADDED] For player joining battles
    lastDamageTime?: number; // [ADDED] For visual feedback
    // [NEW] Morale System
    morale: number;
    maxMorale: number;
    setMorale(count: number): void;
}

// [REMOVED] Legacy Battle Class (1v1) - Use BattleField instead


// ==================== 导入区域战斗模块 ====================
import { BattleField } from './BattleField';

export class CombatSystem {
    // [REMOVED] battles: Battle[] = [];
    private battleFields: BattleField[] = [];

    /**
     * 启动 1v1 战斗 (向后兼容，内部转为 Regional Battle)
     */
    public startBattle(attacker: IBattleUnit, defender: IBattleUnit, presetResult?: 'attacker_win' | 'defender_win'): void {
        console.log(`⚔️ [CombatSystem] Redirecting 1v1 startBattle to startRegionalBattle`);
        this.startRegionalBattle(
            attacker.factionId || 'unknown',
            [attacker],
            defender.factionId || 'unknown',
            [defender],
            presetResult
        );
    }

    /**
     * 启动区域战斗 (多单位混战)
     * 
     * @param attackerFactionId 攻击方势力ID
     * @param attackerUnits 攻击方单位列表
     * @param defenderFactionId 防守方势力ID
     * @param defenderUnits 防守方单位列表
     * @param presetResult 预设结果（可选）
     * @param customDuration 导演指定战斗时长（可选，秒）
     * @returns 创建的战场对象 (可用于后续添加援军)
     */
    public startRegionalBattle(
        attackerFactionId: string,
        attackerUnits: IBattleUnit[],
        defenderFactionId: string,
        defenderUnits: IBattleUnit[],
        presetResult?: 'attacker_win' | 'defender_win',
        customDuration?: number
    ): BattleField {
        const battleField = new BattleField(
            attackerFactionId,
            attackerUnits,
            defenderFactionId,
            defenderUnits,
            presetResult,
            customDuration
        );
        this.battleFields.push(battleField);
        return battleField;
    }

    /**
     * 查找指定位置附近的活跃战场
     */
    public findBattleFieldNear(pos: { lat: number; lng: number }, radius: number = 0.5): BattleField | null {
        for (const bf of this.battleFields) {
            if (bf.isOver) continue;

            // Check if any unit in this battlefield is nearby
            const allUnits = [...bf.getAttackerUnits(), ...bf.getDefenderUnits()];
            const isNear = allUnits.some(u => {
                const uPos = u.getPosition();
                const dist = getEuclideanDistance({ lat: uPos.lat, lng: uPos.lng }, pos);
                return dist <= radius;
            });

            if (isNear) return bf;
        }
        return null;
    }


    /**
     * 获取所有活跃战场
     */
    public getActiveBattleFields(): BattleField[] {
        return this.battleFields.filter(bf => !bf.isOver);
    }

    public update(deltaTime: number): void {
        // [REMOVED] Legacy 1v1 battle update loop
        // this.battles.forEach(battle => battle.update(deltaTime));

        // Update all regional battles
        this.battleFields.forEach(bf => bf.update(deltaTime));

        // Remove finished battles
        // this.battles = this.battles.filter(battle => !battle.isOver);
        this.battleFields = this.battleFields.filter(bf => !bf.isOver);
    }
}
