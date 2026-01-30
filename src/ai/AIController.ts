import { Army } from '../core/Army';
import { LegionManager } from '../core/LegionManager';
import { CityManager } from '../core/CityManager';
import { FACTIONS } from '../data/factions';

export class AIController {
    private legionManager: LegionManager;
    private cityManager: CityManager;
    private enabled: boolean = false;

    constructor(
        legionManager: LegionManager,
        cityManager: CityManager,
        roadRegistry: any
    ) {
        this.legionManager = legionManager;
        this.cityManager = cityManager;

        console.log('[AIController] AI 重置完毕，等待指令。');
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    private lastUpdateTimestamp: number = 0;

    // [OPTIMIZATION] Time-Slicing State
    private armyUpdateIndex: number = 0;
    private readonly ARMIES_PER_FRAME = 3; // Process ~3 armies per frame (60fps -> 180 checks/sec)

    public update(): void {
        if (!this.enabled) return;

        // [OPTIMIZATION] Time-Slicing Implementation
        // Instead of processing ALL armies every 1000ms (causing stutters),
        // we process a small batch of armies EVERY FRAME.
        // This spreads the computational load evenly.

        const armies = this.legionManager.getArmies();
        if (armies.length === 0) return;

        let processedCount = 0;

        // Loop until we reach our budget or check everyone
        const maxChecks = Math.min(armies.length, this.ARMIES_PER_FRAME);

        for (let i = 0; i < maxChecks; i++) {
            // Safety wrap-around
            if (this.armyUpdateIndex >= armies.length) {
                this.armyUpdateIndex = 0;
            }

            const army = armies[this.armyUpdateIndex];
            this.armyUpdateIndex++;

            if (!army) continue;

            if (army.isDestroyed || army.type !== 'legion') continue;
            // [FIX] 跳过叛军
            if (army.getFactionId() === 'panjun') continue;

            // Process this army
            this.tickArmy(army);
        }
    }

    // [OPTIMIZATION] Pathfinding Blacklist: (ArmyID_CityID) -> ExpirationTime
    private pathfindingBlacklist: Map<string, number> = new Map();

    /**
     * Reports a pathfinding failure for an army to a specific city.
     * Prevents this army from trying to reach this city again for 30 seconds.
     */
    public reportPathfindingFailure(armyId: string, cityId: string): void {
        const key = `${armyId}_${cityId}`;
        this.pathfindingBlacklist.set(key, Date.now() + 30000);
        // Clean up old entries occasionally? For now, we rely on map size being manageable.
    }

    /**
     * 第一步：确定目标
     * 优先级：
     * 1. 救援：如果有己方城市被围攻，去救最近的。
     * 2. 进攻：如果没有敌军围城，就去打最近的敌方城市。
     */
    private determineTarget(army: Army): { type: 'defend' | 'attack'; targetCityId: string } | null {
        const myFaction = army.getFactionId();
        const currentPos = army.getPosition();
        const now = Date.now();

        // [CRITICAL PRIORITY] Retake Capital
        // 如果首都被占领，全员无视距离回防/反攻
        const factionData = FACTIONS.find(f => f.id === myFaction);
        if (factionData && factionData.capitalCityId) {
            const capital = this.cityManager.getCity(factionData.capitalCityId);
            // 如果首都存在，且归属权不属于我
            if (capital && capital.factionId !== myFaction) {
                // 检查是否已经在前往首都或在围攻首都？
                // 简化：直接返回进攻首都没问题，AIController.update 会处理移动
                return { type: 'attack', targetCityId: factionData.capitalCityId };
            }
        }

        // [EXPANSION PRIORITY] Standard Attack (Nearest to Army)
        // 只有首都在手里时，才进行对外扩张
        const siegeManager = this.legionManager.getSiegeManager();
        const activeSieges = siegeManager?.getActiveSiegesMap() || new Map();

        // [OPTIMIZATION] Attack Logic: Zero-Alloc Top 1
        // Always Find Absolute Nearest to Army Position
        let referencePos = currentPos;

        // [REMOVED] Capital-centric check. Army always looks for nearest enemy to ITSELF.

        // 2. Zero-Allocation Search (Find Absolute Nearest)
        // No arrays, no objects created. Pure math.
        let nearestEnemyId: string | null = null;
        let minEnemyDistSq = Infinity; // [OPTIMIZATION] Use Squared Distance

        // [OPTIMIZATION] Avoid array allocation
        const cities = this.cityManager.getCitiesRef();

        for (let i = 0; i < cities.length; i++) {
            const city = cities[i];

            // Skip own cities
            if (city.factionId === myFaction) continue;

            // [OPTIMIZATION] Skip cities already under siege (don't overcrowd)
            if (activeSieges.has(city.id)) continue;

            // Check blacklist
            if (this.pathfindingBlacklist.has(`${army.id}_${city.id}`)) {
                if (now < this.pathfindingBlacklist.get(`${army.id}_${city.id}`)!) {
                    continue;
                } else {
                    this.pathfindingBlacklist.delete(`${army.id}_${city.id}`);
                }
            }

            // Dist check (Squared)
            const dLat = city.latitude - referencePos.lat;
            const dLng = city.longitude - referencePos.lng;
            const distSq = dLat * dLat + dLng * dLng;

            if (distSq < minEnemyDistSq) {
                minEnemyDistSq = distSq;
                nearestEnemyId = city.id;
            }
        }

        if (nearestEnemyId) {
            return { type: 'attack', targetCityId: nearestEnemyId };
        }

        return null;
    }

    private getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
        return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
    }

    /**
     * AI 核心思考逻辑
     * 1. 如果正在战斗 -> 验证是否真的在打（防止卡住）
     * 2. 如果空闲 -> 确定目标并移动
     * 3. 到达目标后 -> 如果1v1战斗正在进行，等待(排队)
     */
    private tickArmy(army: Army): void {
        // This method is no longer called directly by update due to time-slicing.
        // Its logic has been integrated into the new update method.
        // Keeping it here for reference or if it's called elsewhere.

        // [SIMPLIFY] Removed aggressive 'Zombie State' check that was breaking valid wait times.
        // Trust the Combat System to manage state.

        // [SIMPLIFY] 战后休整 / 寻路冷却：Blocked 状态下不执行任何逻辑
        if (army.isBlocked()) {
            return;
        }

        // 已经在移动中，继续走
        if (!army.isIdle()) return;

        // 空闲状态：需要决策
        const decision = this.determineTarget(army);
        if (!decision) return; // 没有目标（天下太平?）

        const targetCity = this.cityManager.getCity(decision.targetCityId);
        if (!targetCity) return;

        // 检查目标城市是否正在进行战斗（1v1排队机制）
        const siegeManager = this.legionManager.getSiegeManager();
        if (siegeManager) {
            const activeSieges = siegeManager.getActiveSiegesMap();
            if (activeSieges.has(decision.targetCityId)) {
                // 目标城市正在打仗，往那里走，到了之后会自动排队等待
                // （ContactEngine 或 SiegeManager 会处理到达后的逻辑）
            }
        }

        // 执行移动
        const success = this.legionManager.moveLegionToCity(army, decision.targetCityId);
        if (success) {
            console.log(`[AI] ${army.name} ${decision.type === 'defend' ? '🛡️救援' : '⚔️进攻'} -> ${targetCity.name}`);
        } else {
            // [OPTIMIZATION] Pathfinding failed (e.g. disconnected road).
            // Blacklist this target temporarily to prevent infinite retry loops.
            this.reportPathfindingFailure(army.id, decision.targetCityId);
        }
    }

    // =====================
    // 兼容旧接口
    // =====================
    public cleanup(armyId: string): void { }
    public getState(armyId: string): string { return 'IDLE'; }
    public setState(armyId: string, state: string): void { }
}
