import { CityManager } from './CityManager';
import { LegionManager } from './LegionManager';
import { CombatSystem, IBattleUnit } from './CombatSystem';
import { Player } from './Player';
import { GameMap } from '../map/GameMap';
import { EventVisualizer } from './EventVisualizer';
import { FieldBattleData, SiegeData } from '../types/core';
import { Army } from './Army';
import { BattleUnitFactory } from './BattleUnitFactory';
import { CombinedBattleUnit } from './CombinedBattleUnit';
import { OrientationSystem } from './OrientationSystem';
import { SiegeManager } from './SiegeManager';
import { GridSystem } from '../systems/GridSystem';
import { MultiLegionFieldBattle } from './MultiLegionFieldBattle';
import { HISTORICAL_LEGIONS } from '../data/legions';
import { LegionType } from '../types/UnitTypes';
import { CombatUtils } from './CombatUtils';

// Constants
const FIELD_BATTLE_TROOPS = 10000;
import { GameConfig, PLAYER_SPEED_TIERS } from '../config/GameConfig';
import { roadRegistry } from './RoadRegistry';
import { getEuclideanDistance } from './DistanceUtils';
const BATTLE_OFFSET = 0.14; // Approx 16.5km
const GRID_SIZE = 34.26;

// ==================== 六边形驻扎系统 ====================
// [REMOVED] HEX_DIRECTIONS and getGarrisonPosition - reverting to direct city garrison

export class FieldBattleManager {
    private cityManager: CityManager;
    private legionManager: LegionManager;
    private combatSystem: CombatSystem;
    private player: Player;
    private map: GameMap;
    private visualizer: EventVisualizer;
    private siegeManager: SiegeManager;
    private multiLegionHandler: MultiLegionFieldBattle;

    constructor(
        cityManager: CityManager,
        legionManager: LegionManager,
        combatSystem: CombatSystem,
        player: Player,
        map: GameMap,
        visualizer: EventVisualizer,
        siegeManager: SiegeManager
    ) {
        this.cityManager = cityManager;
        this.legionManager = legionManager;
        this.combatSystem = combatSystem;
        this.player = player;
        this.map = map;
        this.visualizer = visualizer;
        this.siegeManager = siegeManager;

        // [NEW] 初始化多军团处理器
        this.multiLegionHandler = new MultiLegionFieldBattle(
            this.legionManager,
            this.cityManager,
            this.combatSystem,
            this.player,
            this.visualizer
        );
    }

    public handleFieldBattleEvent(fieldBattleData: FieldBattleData, onBattleComplete?: () => void): void {
        // [UNIFIED] 所有野战事件统一由 MultiLegionFieldBattle 处理
        // 单军团配置会被自动转换为数组格式
        console.log(`[FieldBattle] 统一使用 MultiLegionFieldBattle 处理野战事件`);
        this.multiLegionHandler.handleMultiLegionBattle(fieldBattleData, (winnerFactionId, winningArmies) => {
            console.log(`[FieldBattle] 野战结束，胜者: ${winnerFactionId}`);

            // [RESTORED] Signal event completion immediately when battle ends
            // Post-battle actions run in background without blocking queue
            onBattleComplete?.();

            // [NEW] Check for test mode - pause game after test execution
            if ((window as any)._editorTestExecution) {
                console.log('[FieldBattle] 测试模式：战斗结束，自动暂停游戏');
                (window as any)._editorTestExecution = false;
                const game = (window as any).game;
                if (game?.timeSystem) {
                    game.timeSystem.setPaused(true);
                }
            }

            // Execute after-battle actions in background
            if (winnerFactionId === fieldBattleData.attackerFactionId && winningArmies.length > 0) {
                // [NEW] Check for siegeAfterBattleChain first (for destroy action)
                if (fieldBattleData.siegeAfterBattleChain && fieldBattleData.siegeAfterBattleChain.length > 0) {
                    const firstAction = fieldBattleData.siegeAfterBattleChain[0];
                    if (firstAction.action === 'destroy') {
                        console.log(`[FieldBattle] 攻击方胜利，执行解散 (siegeAfterBattleChain: destroy)`);
                        winningArmies.forEach(army => {
                            console.log(`[FieldBattle] Destroying army ${army.name}`);
                            // [FIX] Call destroy() on the army first to trigger visual cleanup
                            army.destroy();
                            // Then remove from manager
                            this.legionManager.removeArmy(army);
                        });
                        return;
                    }
                }

                // [ORIGINAL] Handle afterBattle action
                if (fieldBattleData.afterBattle) {
                    console.log(`[FieldBattle] 攻击方胜利，执行后续逻辑 (AfterBattle: ${fieldBattleData.afterBattle})`);
                    winningArmies.forEach(army => {
                        this.handleAfterBattle(
                            army,
                            fieldBattleData.attackerFactionId,
                            fieldBattleData.afterBattle,
                            fieldBattleData.location,
                            fieldBattleData.afterBattleTargetCityId,
                            fieldBattleData.siegeAfterBattleChain,
                            fieldBattleData.speedMultiplier
                        );
                    });
                }
            }
        });
    }

    // [REMOVED] Old single-legion logic path (lines 92-297) has been deleted
    // All field battles now go through MultiLegionFieldBattle for unified behavior





    // [NEW] Handle after-battle actions (e.g., return to city)
    private handleAfterBattle(
        army: Army,
        factionId: string,
        action: string | undefined,
        battleLocation: { lat: number, lng: number },
        targetCityId?: string,
        siegeAfterBattleChain?: Array<{ action: 'garrison' | 'move_to_city' | 'attack_city' | 'destroy'; targetCityId?: string, speedMultiplier?: number }>,
        speedMultiplier?: number,
        onActionComplete?: () => void // [NEW] Completion Callback
    ): void {
        if (!action) {
            onActionComplete?.();
            return;
        }

        console.log(`[FieldBattle] Army ${army.name} executing action: ${action}`);
        army.setCombatState(false);

        // [SPEED OPTIMIZATION] Apply speed multiplier
        army.setSpeedMultiplier(speedMultiplier || 1.0);

        if (action === 'siege') {
            if (!targetCityId) {
                console.warn(`[FieldBattle] Siege action requested but no target city ID provided.`);
                return;
            }

            const targetCity = this.cityManager.getCity(targetCityId);
            if (!targetCity) {
                console.warn(`[FieldBattle] Target city ${targetCityId} not found for siege.`);
                return;
            }

            console.log(`[FieldBattle] Army ${army.name} marching to SIEGE ${targetCity.name}`);

            // [FIX] 直接让军团移动到目标城市，到达后触发攻城战
            // 而不是调用 handleSiegeEvent，避免 findCandidate 重复选择同一军团
            const siegeData: SiegeData = {
                attackerFactionId: factionId,
                defenderCityId: targetCityId,
                legionName: army.name,
                attackerTroops: army.getTroops(),
                afterBattleChain: siegeAfterBattleChain
            };

            // 设置到达回调：到达后触发攻城战
            army.setOnArriveCallback(() => {
                console.log(`[FieldBattle->Siege] Army ${army.name} arrived at ${targetCity.name}, starting siege...`);
                // [FIX] 使用 startSiegeWithArmy 直接开始攻城，跳过 findCandidate
                // AND chain the completion callback
                this.siegeManager.startSiegeWithArmy(army, siegeData, onActionComplete);
            });

            // 移动到目标城市
            army.setTargetCity(targetCity);
            this.legionManager.moveLegionToCity(army, targetCity.id, undefined, false); // [CAMERA FIX] No post-battle follow
            return;
        }

        if (action === 'move_to_city') { // [NEW] 移动至指定城市
            if (!targetCityId) {
                console.warn(`[FieldBattle] move_to_city action requested but no target city ID provided.`);
                onActionComplete?.();
                return;
            }

            const targetCity = this.cityManager.getCity(targetCityId);
            if (!targetCity) {
                console.warn(`[FieldBattle] Target city ${targetCityId} not found for move_to_city.`);
                onActionComplete?.();
                return;
            }

            console.log(`[FieldBattle] Army ${army.name} moving to ${targetCity.name}`);
            army.setCombatState(false);

            army.setOnArriveCallback(() => {
                console.log(`[FieldBattle] Army ${army.name} arrived at ${targetCity.name}.`);
                onActionComplete?.();
            });
            this.legionManager.moveLegionToCity(army, targetCity.id, undefined, false); // [CAMERA FIX] No post-battle follow
        } else if (action === 'garrison') {
            // [FIX] 统一与 SiegeManager 的 garrison 逻辑：驻扎 = 军团保留
            console.log(`[FieldBattle] Army ${army.name} is now garrisoning at battle location.`);
            army.stopMovement();
            army.setTargetCity(null);
            army.setOnArriveCallback(() => { });
            // 标记为事件控制，防止 AI 接管
            (army as any)._isEventControlled = true;
            onActionComplete?.();
        } else if (action === 'destroy') {
            // 解散 = 军团销毁
            console.log(`[FieldBattle] Army ${army.name} executing destroy (Immediate Disband).`);
            army.destroy();
            this.legionManager.removeArmy(army);
            onActionComplete?.();
        } else {
            // Unknown action
            console.warn(`[FieldBattle] Unknown action: ${action}`);
            onActionComplete?.();
        }
    }
}
