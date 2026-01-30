
import { Army } from './Army';
import { CityManager } from './CityManager';
import { GameMap } from '../map/GameMap';
import { City, LatLng } from '../types/core';
import {
    DISTANCE_THRESHOLDS,
    isAdjacentHex,
    cityToLatLng,
} from './DistanceUtils';
import { GameConfig, GameMode, GameState } from '../config/GameConfig';
import { SpatialRegistry } from './SpatialRegistry';
import { GridSystem } from '../systems/GridSystem';
import { ContactEngine } from './ContactEngine';
import { CombatSystem } from './CombatSystem';
import { HexPathFinder } from './HexPathFinder';
import { HexPathRenderer } from '../map/HexPathRenderer';
import { LegionType } from '../types/UnitTypes';
import { roadRegistry } from './RoadRegistry';
import { FactionManager } from './FactionManager';
import { PerformanceMonitor } from '../debug/PerformanceMonitor'; // [DEBUG]

export class LegionManager {
    private cityManager: CityManager;
    private factionManager: FactionManager;
    private map: GameMap;
    private armies: Army[] = [];
    private spatialRegistry: SpatialRegistry;
    private contactEngine: ContactEngine | null = null;
    private combatSystem: CombatSystem | null = null;
    private hexPathFinder: HexPathFinder;
    private hexPathRenderer: HexPathRenderer;
    private cinematicManager: any | null = null; // [NEW] Injected for auto-follow


    constructor(cityManager: CityManager, map: GameMap, factionManager: FactionManager) {
        this.cityManager = cityManager;
        this.factionManager = factionManager;
        this.map = map;
        this.spatialRegistry = SpatialRegistry.getInstance();
        this.hexPathFinder = new HexPathFinder(this.spatialRegistry);
        this.hexPathRenderer = new HexPathRenderer(map);

        // [HEX GRID] 将所有城市注册为静态障碍物
        this.refreshCityRegistry();

        // [NEW] Subscribe to City Manager updates for physics sync
        // [OPTIMIZATION] If a specific city is passed, only update that one. Otherwise refresh all.
        this.cityManager.setOnCityUpdated((city?) => {
            if (city) {
                this.updateCityInRegistry(city);
            } else {
                this.refreshCityRegistry();
            }
        });

        // [NEW] Subscribe to Road Registry updates
        roadRegistry.onRoadsUpdated(() => this.recalculateAllLegionPaths());
    }

    public setCinematicManager(manager: any): void {
        this.cinematicManager = manager;
    }

    /**
     * [NEW] 将所有城市注册到 SpatialRegistry 作为障碍物
     * 确保军队不能移动到城市格子上.
     * Should be called after cities are loaded or updated.
     */
    public refreshCityRegistry(): void {
        console.time('refreshCityRegistry'); // [DEBUG] Performance Check
        this.spatialRegistry.clearCityRegistry(); // We need this method in SpatialRegistry too
        const cities = this.cityManager.getCities();
        let logCount = 0;
        for (const city of cities) {
            const hex = GridSystem.latLngToAxial(city.latitude, city.longitude);
            this.spatialRegistry.registerCity(hex.q, hex.r, city.factionId || 'neutral', city.id);

            if (logCount < 3) {
                console.log(`[LegionManager] Registering City ${city.name} at (${hex.q},${hex.r})`);
                logCount++;
            }
        }
        console.log(`🏛️ [SpatialRegistry] 已注册 ${cities.length} 个城市格子为障碍物`);
        console.timeEnd('refreshCityRegistry'); // [DEBUG] Performance Check
    }

    /**
     * [OPTIMIZATION] Single City Registry Update
     * Updates physics obstacle for a single city without iterating all cities.
     */
    public updateCityInRegistry(city: City): void {
        const hex = GridSystem.latLngToAxial(city.latitude, city.longitude);
        // [NOTE] registerCity overwrites existing entry for that hex key
        this.spatialRegistry.registerCity(hex.q, hex.r, city.factionId || 'neutral', city.id);
        // console.log(`[LegionManager] Updated Single City Registry: ${city.name}`); // Debug only
    }

    /**
     * Initialize the ContactEngine after CombatSystem is available.
     * Called by GameApp after all systems are constructed.
     */
    public initContactEngine(combatSystem: CombatSystem): void {
        this.combatSystem = combatSystem;
        this.contactEngine = new ContactEngine(this.spatialRegistry, combatSystem);
    }

    private siegeManager: any | null = null; // Use any to avoid circular import type issues if strict

    public setSiegeManager(siegeManager: any): void {
        this.siegeManager = siegeManager;
    }

    public getSiegeManager(): any | null {
        return this.siegeManager;
    }

    public getSpatialRegistry(): SpatialRegistry {
        return this.spatialRegistry;
    }

    public getArmies(): Army[] {
        return this.armies;
    }

    // ==================== [PHASE 2] Single Army / Capital Logic ====================

    /**
     * Check if a sortie is valid (Source is Capital)
     */
    public validateSortie(factionId: string, sourceCityId: string): boolean {
        const capitalId = this.factionManager.getCapital(factionId);
        if (!capitalId) {
            // [FAILSAFE] No capital? Allow validation if it matches ANY city?
            // Or strictly fail. User said "One Capital".
            // If capital not set (initialization issue?), fallback to false to be safe.
            return false;
        }
        return sourceCityId === capitalId;
    }

    /**
     * Check if faction already has an active main legion
     */
    public hasMainLegion(factionId: string): boolean {
        return !!this.factionManager.getMainLegion(factionId);
    }

    public registerMainLegion(factionId: string, armyId: string): void {
        this.factionManager.setMainLegion(factionId, armyId);
        console.log(`🔒 [LegionManager] Registered Main Legion for ${factionId}: ${armyId}`);
    }

    public unregisterMainLegion(factionId: string): void {
        this.factionManager.clearMainLegion(factionId);
        console.log(`🔓 [LegionManager] Unregistered Main Legion for ${factionId}`);
    }

    /**
     * [AI/API] Attempt to mobilize and launch a sortie from the capital.
     * Use this for AI or Player commands to ensure rules (Troops, Capital, Single Army) are met.
     */
    public getFactionManager() {
        return this.factionManager;
    }

    /**
     * [AI/API] Attempt to mobilize and launch a sortie from the capital or specified city.
     * Use this for AI or Player commands to ensure rules (Troops, Capital, Single Army) are met.
     */
    public attemptSortie(factionId: string, targetPos: LatLng, requestedTroops: number, sourceCityId?: string): Army | null {
        // 1. Single Army Rule
        if (this.hasMainLegion(factionId)) {
            console.warn(`[LegionManager] Sortie Denied: ${factionId} already has active legion.`);
            return null;
        }

        // 2. Validate Source (Capital or Specified)
        let actualSourceCityId = sourceCityId;

        if (!actualSourceCityId) {
            // Default to Capital if not specified
            const capitalId = this.factionManager.getCapital(factionId);
            if (!capitalId) {
                console.warn(`[LegionManager] Sortie Denied: ${factionId} has no capital and no source specified.`);
                return null;
            }
            actualSourceCityId = capitalId;
        }

        const sourceCity = this.cityManager.getCityById(actualSourceCityId);
        if (!sourceCity) return null;

        // 3. Mobilize Troops (Global Deduction)
        // Pass cityManager to factionManager (dependency injection effectively)
        const mobilizedTroops = this.factionManager.mobilizeTroops(factionId, requestedTroops, this.cityManager);

        if (mobilizedTroops <= 0) {
            console.warn(`[LegionManager] Sortie Denied: mobilization failed (insufficient troops).`);
            return null;
        }

        // 4. Create Legion
        // Use createLegion to handle physics/placement
        // [NEW] Use specific army name if available
        const factionData = this.factionManager.getFaction(factionId);
        const armyName = factionData?.armyName || `${factionData?.name || factionId} Army`;

        // Source City
        const army = this.createLegion(
            { lat: sourceCity.latitude, lng: sourceCity.longitude },
            mobilizedTroops,
            factionId,
            armyName,
            undefined, // Callback
            factionData?.defaultLegionType || 'mixed', // [NEW] Use faction default type
            sourceCity.id
        );

        // createLegion should handle registration via hook or we do it here?
        // Let's do it here to be explicit for Sorties.
        // But createLegion might be called by events too.
        // I'll update createLegion to Auto-Register if it's the first army.

        return army;
    }

    public getArmiesBySource(sourceCityId: string): Army[] {
        return this.armies.filter(a => a.getSourceCityId() === sourceCityId && !a.isDestroyed);
    }

    public getLegionById(id: string): Army | undefined {
        return this.armies.find(a => a.id === id);
    }

    public hasMovingLegions(): boolean {
        return this.armies.some(army => !army.isIdle());
    }

    public addArmy(army: Army): void {
        // [FIX] Idempotency: Avoid adding the same army multiple times
        if (this.armies.includes(army)) return;

        this.armies.push(army);
        // Register initial position
        const pos = army.getPosition();
        const hex = GridSystem.latLngToAxial(pos.lat, pos.lng);
        this.spatialRegistry.register(army, hex.q, hex.r);

        // [Phase 2] Auto-Register as Main Legion if slot is empty
        const fid = army.getFactionId();
        if (!this.hasMainLegion(fid)) {
            this.registerMainLegion(fid, army.id);
        } else {
            // If already has main legion, this might be a secondary event army? 
            // Or a bug. Allowed for "History" mode maybe? 
            // Warning for now.
            console.warn(`⚠️ [LegionManager] Faction ${fid} spawned army ${army.id} but MainLegion already exists (${this.factionManager.getMainLegion(fid)}). Mult-Army scenario?`);
        }
    }

    /**
     * [AI] 创建新军团并加入管理器
     * 供 RecruitmentSystem 和其他 AI 模块使用
     */
    public createArmy(config: {
        name: string;
        factionId: string;
        position: { lat: number; lng: number };
        troops: number;
        legionType?: LegionType;
        sourceCityId?: string; // [NEW] Source City
    }): Army {
        const army = new Army(
            this.map,
            { lat: config.position.lat, lng: config.position.lng },
            null, // targetCity
            config.troops,
            config.factionId,
            () => { }, // onArrive callback
            undefined, // onBattleTick
            undefined, // destination
            config.name,
            config.legionType || this.factionManager.getFaction(config.factionId)?.defaultLegionType || 'infantry' // [NEW] Use config > faction default > fallback
        );
        army.type = 'legion';
        army.setSpatialRegistry(this.spatialRegistry); // [NEW] Link registry
        if (config.sourceCityId) {
            army.setSourceCityId(config.sourceCityId);
        }
        this.addArmy(army);
        return army;
    }

    public removeArmy(army: Army): void {
        this.armies = this.armies.filter(a => a !== army);

        // [Phase 2] Unregister Main Legion if this was it
        if (this.hasMainLegion(army.getFactionId())) {
            const currentMain = this.factionManager.getMainLegion(army.getFactionId());
            if (currentMain === army.id) {
                this.unregisterMainLegion(army.getFactionId());
            }
        }

        // Remove from registry
        const pos = army.getPosition();
        const hex = GridSystem.latLngToAxial(pos.lat, pos.lng);
        this.spatialRegistry.unregister(army, hex.q, hex.r);
    }

    private debugUpdateCounter = 0;
    private logicFrameParity = 0; // [OPTIMIZATION] Flip-flop for time slicing

    public update(deltaTime: number): void {
        this.debugUpdateCounter++;
        this.logicFrameParity = (this.logicFrameParity + 1) % 2; // 0 or 1

        // [PERF-MONITOR] Track Stats
        const monitor = PerformanceMonitor.getInstance();
        let activeCount = 0;
        let idleCount = 0;

        // [OPTIMIZATION] Hoist variables
        let army: Army;
        let oldKey: number;
        let newKey: number;
        let rawPos: LatLng;
        let hex: { q: number, r: number };

        for (let i = 0; i < this.armies.length; i++) {
            army = this.armies[i];

            // Stats
            if (army.isIdle()) idleCount++;
            else activeCount++;

            // 1. VISUAL UPDATE (Runs every frame for smooth animation)
            // This handles sprite interpolation, position lerping, etc.
            if (army.isBlocked()) {
                army.update(deltaTime);
                continue;
            }

            // Capture state BEFORE update
            // [OPTIMIZATION] Use bitwise key directly
            oldKey = (army as any).currentHexKey;

            army.update(deltaTime);

            // [FIX] Instant Boundary Check
            // Calculate new key immediately to catch hex modifications in the same frame.
            // This prevents "Visual Jitter" (Army stepping into city for 1 frame then snapping back).
            const actualNewKey = GridSystem.getHexKeyAtLatLng(army.getRawPosition().lat, army.getRawPosition().lng);

            // 2. HEAVY LOGIC (Runs every OTHER frame - 30Hz)
            // Spatial Registry Sync + Contact Engine + Collision
            // We interleave updates: Evens on Frame 0, Odds on Frame 1
            // [EXCEPTION] If army crossed a hex boundary, FORCE logic update to handle collision immediately.
            if (oldKey === actualNewKey && i % 2 !== this.logicFrameParity) {
                continue; // Skip logic ONLY if staying in same hex
            }

            // Capture state AFTER update
            // We use actualNewKey calculated above
            newKey = actualNewKey;

            if (oldKey !== newKey) {
                // Moved to new hex
                // [OPTIMIZATION] Decode key only when needed
                const oldR = (oldKey & 0xFFFF) << 16 >> 16;
                const oldQ = oldKey >> 16;
                const newR = (newKey & 0xFFFF) << 16 >> 16;
                const newQ = newKey >> 16;

                // [FIX] Physics Sync must happen here because Army.update() manual move doesn't sync Registry
                const endMove = monitor.start('Logic.Legion.Move');
                const success = this.spatialRegistry.move(army, oldQ, oldR, newQ, newR, army.ignoreCityCollision);
                endMove();

                // [FIELD BATTLE] Check engagement
                if (success && this.contactEngine && !army.getIsInCombat()) {
                    const endContact = monitor.start('Logic.Legion.Contact');
                    const engaged = this.contactEngine.checkEngagement(army);
                    endContact();

                    if (engaged) {
                        continue;
                    }
                }

                if (!success) {
                    // [COLLISION] Move failed (Occupied)
                    // Revert visual position to center of Old Hex
                    // We can't easily revert to exact previous sub-hex pixel, but snapping to center is safe.
                    const hexCenter = GridSystem.axialToLatLng(oldQ, oldR);
                    army.setPosition(hexCenter.lat, hexCenter.lng);

                    // NOTE: setPosition WILL call spatialRegistry.move internally!
                    // But since we are moving BACK to oldQ/oldR (where we currently are in Registry),
                    // move(old, old) should be a no-op or return true.

                    // [COLLISION LOGIC] Blocked handling
                    // Check what blocked us
                    const blocker = this.spatialRegistry.getArmyAt(newQ, newR);
                    const isCity = this.spatialRegistry.isCityHex(newQ, newR);

                    if (blocker) {
                        // Try Pass-Through (Retry)
                        const retrySuccess = this.spatialRegistry.move(army, oldQ, oldR, newQ, newR, army.ignoreCityCollision, true);
                        if (retrySuccess) {
                            army.clearBlocked();
                        } else {
                            // [OPTIMIZATION] If 30Hz logic, reduce wait time slightly to compensate? No 500ms is fine.
                            army.setBlocked(500);
                        }
                    } else if (isCity) {
                        const cityFaction = this.spatialRegistry.getCityFaction(newQ, newR);
                        const isHostile = cityFaction && cityFaction !== army.getFactionId();

                        if (isHostile) {
                            if (army.ignoreCityCollision) {
                                this.spatialRegistry.move(army, oldQ, oldR, newQ, newR, true, true);
                            } else {
                                this.triggerSiege(army, newQ, newR);
                            }
                        } else {
                            // Friendly City
                            army.setBlocked(1000);
                        }
                    } else {
                        // Unknown
                        army.setBlocked(1000);
                    }
                }
            }
        }

        monitor.trackValue('Armies Total', this.armies.length);
        monitor.trackValue('Armies Active', activeCount);

        // Cleanup: Remove destroyed armies
        // [Frequency] Run cleanup every 60 frames (1 sec) instead of every frame?
        if (this.debugUpdateCounter % 60 === 0) {
            for (let i = this.armies.length - 1; i >= 0; i--) {
                const army = this.armies[i];
                if (army.isDestroyed) {
                    this.hexPathRenderer.clearPath(army.id);
                    this.removeArmy(army);
                }
            }
        }
    }

    /**
     * [NEW] Trigger a siege battle when bumping into a hostile city
     */
    public triggerSiege(army: Army, q: number, r: number): void {
        if (!this.siegeManager) {
            console.warn('[LegionManager] SiegeManager not linked! Cannot trigger siege.');
            return;
        }

        // Find city by hex coords
        const cities = this.cityManager.getCities();
        const targetCity = cities.find(c => {
            const hex = GridSystem.latLngToAxial(c.latitude, c.longitude);
            return hex.q === q && hex.r === r;
        });

        if (!targetCity) {
            console.error(`[LegionManager] Ghost city at (${q},${r})? Registry says yes, but CityManager says no.`);
            return;
        }

        if (army.getIsInCombat()) return; // Already busy

        console.log(`🏰 [LegionManager] Siege Triggered: ${army.name} vs ${targetCity.name}`);

        // [FIX] 不要在这里定位军队！让 SiegeManager.onArmyArrive 统一处理
        // 这样可以保证 army.previousHex 在定位时仍然是准确的"来向"
        // 之前的问题：这里移动军队后，previousHex 被污染，导致 onArmyArrive 使用错误的位置

        // Stop movement to prepare for battle (but don't move position yet!)
        army.stopMovement(true); // Save state just in case

        // Lock army immediately
        army.setCombatState(true, 'siege', { lat: targetCity.latitude, lng: targetCity.longitude });

        // Trigger via SiegeManager
        // Trigger via SiegeManager
        // [FIX] Priority: Use Army's attached mission data if available (preserves afterBattleChain)
        let siegeData: any;

        if (army.siegeMissionData) {
            console.log(`🛡️ [LegionManager] Using attached Mission Data for collision siege:`, army.siegeMissionData);
            // We use the mission data but we might want to flag it as triggered by collision?
            // Actually, if we use the mission data, we want it to behave EXACTLY like the event.
            siegeData = army.siegeMissionData;

            // Still mark as dynamic trigger to distinguish from direct handleSiegeEvent call if needed,
            // but for now, let's keep it clean.
        } else {
            siegeData = { // Use any to bypass strict type check for now if types mismatch
                defenderCityId: targetCity.id,
                attackerFactionId: army.getFactionId(),
                attackerLegionId: army.id,
                year: 0, // Dynamic event, no year
                season: 0,
                // Add a flag to indicate this is a dynamic collision siege
                isDynamic: true
            };
        }

        this.siegeManager.startSiegeWithArmy(army, siegeData);
    }



    public renameLegion(armyIdOrName: string, newName: string): boolean {
        // Find by ID first, then by name
        let army = this.getLegionById(armyIdOrName);
        if (!army) {
            army = this.armies.find(a => a.name === armyIdOrName && !a.isDestroyed);
        }

        if (army) {
            console.log(`📛 [LegionManager] Renaming "${army.name}" → "${newName}"`);
            army.name = newName;
            return true;
        }

        console.warn(`[LegionManager] Cannot rename: Legion "${armyIdOrName}" not found.`);
        return false;
    }




    private handleLegionArrival(army: Army): void {
        console.log(`[LegionManager] Legion ${army.name} arrived at destination.`);

        // [FIX] Proactive Siege Trigger
        // If army stops moving (arrives), check if it is adjacent to a HOSTILE city.
        // If so, trigger siege manually because "collision" might not have happened.

        const armyPos = army.getPosition();
        const armyHex = GridSystem.latLngToAxial(armyPos.lat, armyPos.lng);

        // Check current hex AND neighbors
        const candidates = [armyHex, ...GridSystem.getNeighborAxialCoords(armyHex.q, armyHex.r)];

        for (const hex of candidates) {
            if (this.spatialRegistry.isCityHex(hex.q, hex.r)) {
                const cityId = this.spatialRegistry.getCityId(hex.q, hex.r);
                if (!cityId) continue;

                const city = this.cityManager.getCity(cityId);
                if (city && city.factionId !== army.getFactionId()) {
                    console.log(`⚔️ [LegionManager] Army ${army.name} arrived at gate of ${city.name}. Triggering Siege!`);
                    this.triggerSiege(army, hex.q, hex.r);
                    return; // Trigger once
                }
            }
        }
    }

    /**
     * Try to reroute an army around a friendly blocker.
     * Called when collision with a same-faction unit is detected.
     */
    private tryReroute(army: Army, currentPos: LatLng): void {
        // [STRICT ROAD MODE] Rerouting off-road is DISABLED.
        // If blocked by friendly unit on road, just wait.
        console.log(`⏳ [LegionManager] ${army.name} blocked by friendly. Waiting (Road Mode).`);
        army.setBlocked();

        /* [DEPRECATED] Off-road reroute logic
        // Get original destination
        const target = army.getTargetCity();
        if (!target) {
            // No destination set, just stop
            army.stopMovement();
            return;
        }
    
        const goalLatLng: LatLng = { lat: target.latitude, lng: target.longitude };
    
        // Find new path avoiding the blocker
        const newPath = this.hexPathFinder.findPath(currentPos, goalLatLng, army.id, false, army.getFactionId());
    
        if (newPath && newPath.length > 1) {
            // Found a valid reroute
            console.log(`🔄 [LegionManager] ${army.name} rerouting around friendly. New path length: ${newPath.length}`);
            army.moveAlongPath(newPath.slice(1)); // Skip current position
        } else {
            // No path found, just wait
            console.log(`⏳ [LegionManager] ${army.name} waiting for friendly to move.`);
            army.setBlocked(); // Wait and retry
        }
        */
    }

    /**
     * Move a legion to a destination using hex-based pathfinding.
     * This is the preferred way to issue move commands, as it calculates
     * the path upfront using A* and avoids obstacles.
     * 
     * @param army The army to move
     * @param destination Target coordinates
     * @param targetCity Optional city target for the army to reference
     * @param ignoreRoads Force off-road movement
     * @param autoFollow Enable camera auto-follow (default: true)
     * @returns true if path was found and movement started, false otherwise
     */
    public moveLegionTo(army: Army, destination: LatLng, targetCity?: any, ignoreRoads: boolean = false, autoFollow: boolean = true): boolean {
        // [STRICT ROAD MODE]
        // This method relies on HexPathFinder (A*), which allows off-road movement.
        // In strict mode, we should discourage this unless it's a very short tactical move 
        // or if we explicitly allow "Direct Move" fallback.
        // For consistency, we'll block long-distance off-road moves if RoadRegistry is active.

        if (!ignoreRoads && roadRegistry.isInitialized()) {
            // Check if destination is on road or city
            const hex = GridSystem.latLngToAxial(destination.lat, destination.lng);
            // TODO: Update RoadRegistry to use numbers? For now, we manually convert for it
            const key = `${hex.q},${hex.r}`;
            if (!roadRegistry.isOnRoad(key) && !this.spatialRegistry.isCityHex(hex.q, hex.r)) {
                console.warn(`[LegionManager] Blocked off-road move for ${army.name} to non-road hex ${key}.`);
                return false;
            }
        }

        const currentPos = army.getPosition();

        // Calculate path using A*
        const path = this.hexPathFinder.findPath(
            currentPos,
            destination,
            army.id,
            false,
            army.getFactionId(),
            ignoreRoads // [NEW] Pass flag
        );

        if (!path || path.length < 2) {
            console.warn(`[LegionManager] No path found for ${army.name} to destination`);
            return false;
        }

        // Set target city if provided
        if (targetCity) {
            army.setTargetCity(targetCity);
        }

        // Render path visualization
        this.hexPathRenderer.renderPath(army.id, path);

        // Start movement along the calculated path
        console.log(`🗺️ [LegionManager] ${army.name} starting hex-path movement. Path length: ${path.length}`);
        army.moveAlongPath(path.slice(1)); // Skip current position

        // [USER REQUEST] Move camera to army once, then release (no continuous follow)
        // [OPTIMIZATION] REMOVED (User Request)
        // if (autoFollow && this.cinematicManager) {
        //     const pos = army.getPosition();
        //     this.cinematicManager.flyTo({ lat: pos.lat, lng: pos.lng }, 1.0);
        // }

        return true;
    }

    /**
     * Get the HexPathFinder instance for external use.
     */
    public getHexPathFinder(): HexPathFinder {
        return this.hexPathFinder;
    }

    /**
     * [NEW] 通过道路系统移动军团到目标城市
     * 这是新版的推荐移动方式 - 军队只能沿着预定义的道路移动
     * 
     * @param army 要移动的军队
     * @param targetCityId 目标城市ID
     * @param sourceCityId 可选的起始城市ID（如果不提供则自动检测）
     * @param autoFollow 是否自动跟随镜头 (默认: true)
     * @returns true 如果成功开始移动，false 如果没有找到道路
     */
    public moveLegionToCity(army: Army, targetCityId: string, sourceCityId?: string, autoFollow: boolean = true): boolean {
        if (!roadRegistry.isInitialized()) {
            console.warn('[LegionManager] RoadRegistry 尚未初始化，回退到传统寻路');
            const targetCity = this.cityManager.getCities().find(c => c.id === targetCityId);
            if (targetCity) {
                // [FIX] Pass autoFollow to prevent camera hijacking when falling back
                // moveLegionTo signature: (army, dest, targetCity, ignoreRoads, autoFollow)
                return this.moveLegionTo(army, { lat: targetCity.latitude, lng: targetCity.longitude }, targetCity, false, autoFollow);
            }
            return false;
        }

        const currentPos = army.getPosition();

        // 获取从当前位置到目标城市的完整六边格路径
        const path = roadRegistry.getFullPathToCity(currentPos, targetCityId, sourceCityId);
        if (!path || path.length < 2) {
            console.warn(`[LegionManager] 无法找到 ${army.name} 到城市 ${targetCityId} 的道路`);
            // [FIX] Cool down AI to prevent log spam and infinite loop
            army.setBlocked(2000);
            return false;
        }

        // 设置目标城市
        const targetCity = this.cityManager.getCities().find(c => c.id === targetCityId);
        if (targetCity) {
            army.setTargetCity(targetCity);
        }

        // 渲染路径可视化
        this.hexPathRenderer.renderPath(army.id, path);

        // 开始沿道路移动
        console.log(`🛤️ [LegionManager] ${army.name} 沿道路行军至 ${targetCityId}. 路径长度: ${path.length}`);
        army.moveAlongPath(path.slice(1)); // 跳过当前位置

        // [USER REQUEST] Move camera to army once, then release (no continuous follow)
        // [OPTIMIZATION] REMOVED (User Request)
        // if (autoFollow && this.cinematicManager) {
        //     const pos = army.getPosition();
        //     this.cinematicManager.flyTo({ lat: pos.lat, lng: pos.lng }, 1.0);
        // }

        return true;
    }

    /**
     * Find a suitable legion for an event.
     * Logic:
     * 1. If name provided, find EXACT match (Global).
     * 2. If no name, find CLOSEST idle legion (Global).
     */
    public findCandidate(allArmies: Army[], factionId: string, targetPos: LatLng, name?: string): Army | null {
        // Filter valid candidates (Same faction, Legion type, Not destroyed, Idle)
        let candidates = allArmies.filter(a =>
            a.getFactionId() === factionId &&
            a.type === 'legion' &&
            !a.isDestroyed &&
            a.isIdle()
        );

        // 1. Name Match (Strict Faction + !Destroyed)
        if (name) {
            // [OPTIMIZATION] If name is specified, prioritize exact match even if NOT idle (e.g. marching)
            // But exclude if already in combat.
            const namedCandidates = allArmies.filter(a =>
                a.getFactionId() === factionId &&
                a.name === name &&
                !a.isDestroyed &&
                !a.getIsInCombat()
            );

            if (namedCandidates.length > 0) {
                return namedCandidates[0]; // Return first match
            }
            // If name specified but not found -> Return null (Force Create New)
            return null;
        }

        // 2. Closest Match (Global)
        if (candidates.length === 0) return null;

        let closest: Army | null = null;
        let minDist = Infinity;

        candidates.forEach(legion => {
            const pos = legion.getPosition();

            // Hex distance is better for "Strategic" closeness, but Euclidean is fine for "Global" check
            const d = Math.sqrt(Math.pow(pos.lat - targetPos.lat, 2) + Math.pow(pos.lng - targetPos.lng, 2));

            if (d < minDist) {
                minDist = d;
                closest = legion;
            }
        });

        return closest;
    }

    /**
     * Split a legion if it has enough troops.
     * Returns the NEW split-off army, or null if failed.
     */
    public splitLegion(parentLegion: Army, requestedTroops: number, newName?: string): Army | null {
        // Buffer to keep parent meaningful
        if (requestedTroops >= (parentLegion.getTroops() - GameConfig.LEGION.SPLIT_BUFFER)) {
            return null; // Cannot split
        }

        const newArmy = parentLegion.split(requestedTroops);
        if (newArmy) {
            newArmy.legionType = parentLegion.legionType; // [FIX] Inherit type
            if (newName) {
                newArmy.name = newName;
            }
        }
        return newArmy;
    }

    /**
     * [AI HELPER] 获取指定位置周围的军团
     * 用于威胁评估和战场扫描
     */
    public getArmiesInRadius(center: LatLng, radius: number): Army[] {
        const hexes = GridSystem.getHexagonsInRadius(center, radius);
        const armies: Army[] = [];

        for (const hexPos of hexes) {
            const hex = GridSystem.latLngToAxial(hexPos.lat, hexPos.lng);
            const army = this.spatialRegistry.getArmyAt(hex.q, hex.r);
            if (army && !army.isDestroyed) {
                armies.push(army);
            }
        }
        return armies;
    }

    /**
     * Create a completely new Legion.
     */
    public createLegion(
        pos: LatLng,
        troops: number,
        factionId: string,
        name?: string,
        onArrive?: (army: Army) => void,
        legionType?: LegionType, // [UNIT SYSTEM] 兵种类型
        sourceCityId?: string // [NEW] Source City
    ): Army {
        // [PHYSICS] Ensure we don't spawn on top of another unit
        let spawnPos = pos;
        const startHex = GridSystem.latLngToAxial(pos.lat, pos.lng);
        if (this.spatialRegistry.isOccupied(startHex.q, startHex.r)) {
            console.log(`[LegionManager] Spawn hex (${startHex.q},${startHex.r}) occupied. Searching for empty space...`);
            // [FIX] Spiral search for empty hex - Radius increased to 5 for large event spawns
            let found = false;
            for (let r = 1; r <= 5; r++) {
                const neighbors = GridSystem.getHexagonsInRadius(pos, r);
                for (const potentialPos of neighbors) {
                    const pHex = GridSystem.latLngToAxial(potentialPos.lat, potentialPos.lng);
                    // Use isBlocked to check both cities and armies
                    if (!this.spatialRegistry.isBlocked(pHex.q, pHex.r)) {
                        spawnPos = potentialPos;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                console.warn(`[LegionManager] CRITICAL: Could not find empty hex for spawn near startHex! Spawning anyway (Force Stack).`);
            }
        }

        const army = new Army(
            this.map,
            spawnPos,
            null,
            troops,
            factionId,
            onArrive || ((a) => this.handleLegionArrival(a)),
            undefined,
            undefined,
            name,
            legionType // [NEW] Pass Type
        );
        army.type = 'legion';
        army.setSpatialRegistry(this.spatialRegistry); // [NEW] Link registry
        if (sourceCityId) {
            army.setSourceCityId(sourceCityId);
        }

        console.log(`[LegionManager] Created New Legion: ${name || army.id} (${legionType || 'mixed'}) with ${troops} troops at (${spawnPos.lat.toFixed(2)}, ${spawnPos.lng.toFixed(2)})`);

        // [CRITICAL FIX] Ensure created army is registered in the manager and physics system
        this.addArmy(army);

        return army;
    }



    /**
     * [NEW] 当道路网变更时（用户编辑路网），强制刷新所有移动中的军团路径
     * 这确保任何新的“断路”或“新路”都能立即反映在行军中
     */
    private recalculateAllLegionPaths(): void {
        console.log('🔄 [LegionManager] 收到路网更新通知，正在重算所有军团路径...');
        let updateCount = 0;

        this.armies.forEach(army => {
            // 仅处理: 
            // 1. 军团 (Legion)
            // 2. 正在移动且未到达 (!hasArrived)
            // 3. 不在战斗中 (!isInCombat)
            // 4. 有明确目标城市 (意味着是在走公路)
            if (army.type === 'legion' && !army.isIdle() && !army.getIsInCombat() && army.getTargetCity()) {
                const targetCity = army.getTargetCity();

                // 暂时停止以便重置状态 (保留当前位置)
                // army.stopMovement(); // 不需要完全停止，因为 moveLegionToCity 会重置 pathQueue

                // 重新下达移动指令 -> 这会触发 RoadRegistry.getFullPathToCity
                const success = this.moveLegionToCity(army, targetCity.id, army.getSourceCityId() || undefined);

                if (success) {
                    console.log(`✅ [LegionManager] 已更新 ${army.name} 的路径 (当前位置 -> ${targetCity.name})`);
                    updateCount++;
                } else {
                    console.warn(`⛔ [LegionManager] 道路中断！${army.name} 无法前往 ${targetCity.name}，被迫原地待命。`);
                    army.stopMovement();
                    // 这里可以添加逻辑：如果路断了，尝试回城或寻找最近城市？
                    // 暂时只需停止，避免穿墙
                }
            }
        });

        if (updateCount > 0) {
            console.log(`🔄 [LegionManager] 共更新了 ${updateCount} 个军团的行军路线。`);
        }
    }
}
