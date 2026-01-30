import { Army } from './Army';
import { IBattleUnit, UnitType } from './CombatSystem';


export class BattleUnitFactory {
    /**
     * Create a universal Battle Unit Adapter that wraps various game entities for CombatSystem.
     * 
     * 支持四大核心单位类型:
     * - 'player': 玩家
     * - 'legion' / 'army': AI军团
     * - 'city': 城市
     * - 'bandit' / 'npc': 土匪/野外敌对单位
     */
    public static createAdapter(
        id: string,
        name: string,
        factionId: string,
        entity: Army | any, // 实体对象 (Army, City, Player, NPC)
        unitType: UnitType, // [CHANGED] 使用明确的单位类型替代 isCity 布尔值
        maxTroops: number,
        onVictory?: () => void,
        onDefeat?: () => void,
        playerParticipation?: { ratio: number },
        onTroopsChange?: (newTroops: number) => void
    ): IBattleUnit {

        // State closure

        // State closure
        let currentTroops = maxTroops;
        let _cachedTroops = maxTroops;

        // [NEW] Morale State
        let currentMorale = (entity.morale !== undefined) ? entity.morale : 100;
        let _cachedMorale = currentMorale;

        let state = { isDestroyed: false };

        // 判断单位类型特性
        const isCity = unitType === 'city';
        const isLegion = unitType === 'legion' || unitType === 'army';
        const isPlayer = unitType === 'player';
        const isBandit = unitType === 'bandit' || unitType === 'npc';
        // 可移动单位 (军团、玩家、土匪)
        const isMobile = !isCity;

        return {
            id,
            name,
            get factionId() {
                if (isCity) return entity.factionId;
                if (isMobile && entity.getFactionId) return entity.getFactionId();
                if (isPlayer && entity.getFaction) return entity.getFaction();
                return factionId; // Fallback to initial value
            },
            unitType,

            maxTroops,

            get troops() {
                return _cachedTroops;
            },

            setTroops(count: number) {
                _cachedTroops = count;
                currentTroops = count;

                // Sync back to Real Object
                if (isCity) {
                    entity.troops = count;
                } else if (isMobile && entity.setTroops) {
                    entity.setTroops(count);
                }

                if (onTroopsChange) {
                    onTroopsChange(count);
                }
            },

            get isDestroyed() {
                return state.isDestroyed;
            },

            destroy: () => {
                state.isDestroyed = true;

                if (isLegion) {
                    // 军团持久化逻辑：有兵力则保留，无兵力则销毁
                    const army = entity as Army;
                    const troopsLeft = army.getTroops();
                    console.log(`[BattleUnitFactory] destroy() for Legion ${army.name || army.id}, troops: ${troopsLeft}`);

                    if (army.type === 'legion' && troopsLeft > 0) {
                        console.log(`[BattleUnitFactory] Legion ${army.name} persists with ${troopsLeft} troops.`);
                        army.setCombatState(false);
                    } else {
                        console.log(`[BattleUnitFactory] Destroying ${army.name || army.id}`);
                        army.destroy();
                    }
                } else if (isBandit && entity.destroy) {
                    // 土匪直接销毁
                    entity.destroy();
                }
                // 城市和玩家不在此处销毁
            },

            getPosition: () => {
                if (isCity) {
                    return { lat: entity.latitude, lng: entity.longitude };
                } else if (entity.getPosition) {
                    const pos = entity.getPosition();
                    return { lat: pos.lat ?? pos.latitude, lng: pos.lng ?? pos.longitude };
                }
                return { lat: 0, lng: 0 };
            },

            onBattleStart: (opponent: IBattleUnit, battleType: 'siege' | 'field') => {
                // [DEBUG] Trace Battle Start
                if (isMobile && entity.setCombatState) {
                    const opponentPos = opponent.getPosition();
                    console.log(`⚔️ [BattleUnitFactory] onBattleStart for ${name}: vs ${opponent.name}, targetPos:`, opponentPos);

                    if (!opponentPos || (opponentPos.lat === 0 && opponentPos.lng === 0)) {
                        console.warn(`⚠️ [BattleUnitFactory] Invalid opponent position for ${name}! Animation may fail.`);
                    }

                    entity.setCombatState(true, battleType, opponentPos);
                    // Stop movement
                    if (entity.moveAlongPath) {
                        entity.moveAlongPath([]);
                    }
                }
            },

            onBattleEnd: (result, opponent, enemyKilled) => {
                // [FIX] Do NOT automatically reset combat state here.
                // Let the managers (SiegeManager, ContactEngine) decide whenever to release the unit.
                // This enables post-battle wait times (freezing).

                if (result === 'victory') {
                    if (onVictory) onVictory();
                } else if (result === 'defeat') {
                    if (onDefeat) onDefeat();
                }
            },

            playerParticipation,

            // [NEW] Morale Implementation
            get morale() {
                return _cachedMorale;
            },
            get maxMorale() {
                return 100; // Default max
            },
            setMorale(count: number) {
                _cachedMorale = count;
                currentMorale = count;
                // Sync back
                if (isMobile && entity.setMorale) {
                    entity.setMorale(count);
                }
            }
        };
    }
}
