import L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { LatLng } from '../types/core';
import { GridSystem } from '../systems/GridSystem';
import { TerrainSpeedSystem, TERRAIN_SPEED_CONFIG } from './TerrainSpeedSystem';
import { UnitRenderer } from '../map/UnitRenderer';
import { GameConfig, PLAYER_SPEED_TIERS } from '../config/GameConfig';
import { LegionType, getUnitTypeConfig } from '../types/UnitTypes';

export class Army {
    private map: GameMap;
    private position: LatLng;
    private destination: LatLng;
    private targetCity: any;
    private troops: number;
    private _factionId: string;
    private onArrive: (army: Army) => void;

    // [NEW] Visibility control for siege battles
    public visible: boolean = true;
    public ignoreCityCollision: boolean = false; // [FIX] Prevent accidental siege during field battles
    public siegeMissionData: any = null; // [FIX] Store event data here to persist context through collision

    public setVisible(visible: boolean): void {
        this.visible = visible;
        // [FIX] Also update renderer visibility for GlobalUnitRenderer
        if (this.renderer) {
            this.renderer.setVisible(visible);
        }
    }

    // Path movement
    private pathQueue: LatLng[] = [];

    private marker: L.CircleMarker | L.Polygon | null = null; // [FIX] Allow CircleMarker for hitbox
    private label: L.Marker | null = null;
    private renderer: UnitRenderer | null = null;
    public isDestroyed: boolean = false;
    private currentTerrainMultiplier: number = 1.0;
    private currentHexKey: number = 0; // [FIX] Use integer key
    private spatialRegistry: any = null; // [NEW] Keep reference for unregistration
    private hasArrived: boolean = false;

    // Battles are fully managed by SiegeManager/CombatSystem.
    // Army only holds the visual state flag.
    private isExternalCombat: boolean = false;
    private speedMultiplier: number = 1.0; // [NEW] Event-based speed multiplier

    // [NEW] Blocked state management - prevents crowding behavior
    private blockedUntil: number = 0; // Timestamp when army can retry movement
    private static readonly BLOCKED_RETRY_INTERVAL = 1000; // Reduced from 3000ms for better responsiveness

    // [NEW] IAnimatedUnit Interface Compatibility
    public isAttacking: boolean = false;
    public currentBattleType: 'siege' | 'field' | null = null;
    public targetPos: { lat: number; lng: number } | null = null;
    public lastPosition: { lat: number; lng: number } = { lat: 0, lng: 0 };

    // [NEW] Source City ID (One Legion Per City Rule)
    private sourceCityId: string | null = null;

    public setSourceCityId(cityId: string): void {
        this.sourceCityId = cityId;
    }

    public getSourceCityId(): string | null {
        return this.sourceCityId;
    }

    public setCombatState(isFighting: boolean, battleType?: 'siege' | 'field', targetPos?: { lat: number, lng: number }): void {
        this.isExternalCombat = isFighting;
        this.isAttacking = isFighting; // Sync IAnimatedUnit property
        this.currentBattleType = isFighting ? (battleType || 'field') : null;
        this.targetPos = targetPos || null;

        // [DISABLED] 自动调速功能已禁用
        // const game = (window as any).game;
        // if (game && game.timeSystem) {
        //     if (isFighting) {
        //         console.log(`⏱️ [Auto-Speed] Combat Started -> Set Speed 1.0x`);
        //         game.timeSystem.setSpeed(1.0);
        //     } else {
        //         console.log(`⏱️ [Auto-Speed] Combat Ended -> Set Speed 10.0x`);
        //         game.timeSystem.setSpeed(10.0);
        //     }
        // }

        // Update marker style if exists
        if (this.marker) {
            const element = this.marker.getElement();
            if (element) {
                if (isFighting) {
                    element.classList.add('army-combat');
                } else {
                    element.classList.remove('army-combat');
                }
            }
        }

        // Trigger attack animation
        if (this.renderer) {
            if (isFighting) {
                this.renderer.triggerAttack(battleType, targetPos);
            } else {
                this.renderer.stopAttack();
            }
        }
    }

    public isIdle(): boolean {
        // Army is idle only if not fighting AND has arrived at destination
        return !this.isExternalCombat && this.hasArrived;
    }

    public getIsInCombat(): boolean {
        return this.isExternalCombat;
    }

    // [FIX] Handle Battle End Signal (Stop Visuals)
    public onBattleEnd(result: 'victory' | 'defeat', opponent: any, enemyKilled: number): void {
        // console.log(`⚔️ [Army] Battle Ended for ${this.name}: ${result}`);
        // Stop combat state immediately (stops projectile spawning)
        this.setCombatState(false);
    }

    // [NEW] Blocked state management
    public setBlocked(durationMs: number = Army.BLOCKED_RETRY_INTERVAL): void {
        this.blockedUntil = Date.now() + durationMs;
        // Only log if it's a significant wait
        if (durationMs >= Army.BLOCKED_RETRY_INTERVAL) {
            console.log(`⏸️ [Army] ${this.name} blocked. Waiting ${durationMs}ms before retry.`);
        }
    }

    public isBlocked(): boolean {
        return Date.now() < this.blockedUntil;
    }

    public clearBlocked(): void {
        this.blockedUntil = 0;
    }

    public getMaxTroops(): number {
        return this.initialTroops;
    }

    public addTroops(amount: number): void {
        // [USER REQUIREMENT] Cap recovery at initial formation size
        // If it's a 50k legion, it can't grow beyond 50k via recovery
        const space = this.initialTroops - this.troops;
        const actualAdd = Math.min(amount, space);

        if (actualAdd > 0) {
            this.troops += actualAdd;
        }
    }
    private initialTroops: number = 0;

    public id: string;
    public type: string = 'army';
    public legionType: LegionType = 'infantry'; // [UNIT SYSTEM] 兵种类型
    public name?: string; // [NEW] Legion name

    // [NEW] Public getter for IAnimatedUnit interface compatibility
    public get factionId(): string {
        return this._factionId;
    }

    constructor(
        map: GameMap,
        startPos: LatLng,
        targetCity: any,
        troops: number,
        factionId: string,
        onArrive: (army: Army) => void,
        onBattleTick?: (army: Army, deltaTime: number) => void,
        destination?: LatLng, // Optional custom destination
        name?: string, // [NEW] Optional name
        legionType?: LegionType // [UNIT SYSTEM] 兵种类型
    ) {
        this.map = map;
        this.position = { ...startPos };
        this.targetCity = targetCity;
        // If destination is provided, use it; otherwise default to city location
        this.destination = destination || (targetCity ? { lat: targetCity.latitude, lng: targetCity.longitude } : startPos);
        this.troops = troops;
        this.initialTroops = troops;
        this._factionId = factionId;
        this.onArrive = onArrive;

        this.id = `army_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        if (legionType) this.legionType = legionType;

        this.createMarker();
        this.updateTerrainSpeed();

        // Initialize renderer with faction ID
        this.renderer = new UnitRenderer(map, this, '999', this.factionId);

        // [NEW] Cache initial hex key
        const hex = GridSystem.latLngToAxial(this.position.lat, this.position.lng);
        this.currentHexKey = (hex.q << 16) | (hex.r & 0xFFFF); // Use manual bitshift or import SpatialRegistry static method?
        // Since we can't easily import static SpatialRegistry here without circular deps if not careful (Army imports Map imports...), 
        // we'll use the injected registry if available, or just replicate the bitshift logic since it's simple.
        // Actually, Army.ts doesn't import SpatialRegistry class, so we can't use static method easily unless we import it.
        // Let's rely on manual bit packing for now or add the method to GridSystem? 
        // Better: just assume inject registry has a helper or just do the bitshift: (q<<16)|(r&0xFFFF)

        // [FIX] Let's try to import SpatialRegistry type-only or use the standard bitshift
        // But to be safe and consistent, let's just use the bitshift directly as it is defined in SpatialRegistry
        this.currentHexKey = (hex.q << 16) | (hex.r & 0xFFFF);

        // [FIX] Initialize lastPosition to prevent jump
        this.lastPosition = { ...startPos };
    }

    public setSpatialRegistry(registry: any): void {
        this.spatialRegistry = registry;
    }

    public getPosition(): LatLng {
        return { ...this.position };
    }

    // [OPTIMIZATION] Zero-allocation access for Physics Engine
    public getRawPosition(): LatLng {
        return this.position;
    }

    private createMarker(): void {
        // [FIX] Create invisible interactive hitbox for clicks/hover
        // UnitRenderer handles visuals (Canvas), this handles interaction (DOM)
        this.marker = L.circleMarker([this.position.lat, this.position.lng], {
            radius: 20, // Hitbox size
            color: 'transparent',
            fillColor: '#fff',
            fillOpacity: 0,
            opacity: 0,
            className: 'army-hitbox',
            interactive: true,
            pane: 'markerPane' // Standard pane for interaction
        });

        this.marker.addTo(this.map.getLeafletMap());

        // Bind Events
        this.marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // Prevent map click
            console.log(`🎯 [Army] Clicked: ${this.name || this.id}`);

            // [TODO] Trigger selection logic via GameUIManager or similar?
            // For now, we mainly fix the interaction availability.
            // Dispatch a custom event on the map container for managers to listen?
            // Or just console log for now as requested by user plan.
            const mapContainer = this.map.getLeafletMap().getContainer();
            const event = new CustomEvent('legion-click', {
                detail: { army: this, id: this.id }
            });
            mapContainer.dispatchEvent(event);
        });

        // Debug Tooltip
        // this.marker.bindTooltip(`${this.name} (${Math.floor(this.troops)})`, { 
        //     permanent: false, 
        //     direction: 'top',
        //     offset: [0, -20]
        // });
    }

    private formatTroops(troops: number): string {
        return Math.floor(troops).toString();
    }

    private debugFrameCount: number = 0;

    public update(deltaTime: number): void {
        if (this.isDestroyed) return;
        if (this.pathQueue.length === 0 && this.hasArrived) return;
        if (this.isBlocked()) return;

        this.updateTerrainSpeed();

        const currentPos = this.position;
        const dest = this.destination;
        const targetLat = dest.lat;
        const targetLng = dest.lng;

        const dx = targetLat - currentPos.lat;
        const dy = targetLng - currentPos.lng;
        const distance = Math.sqrt(dx * dx + dy * dy);



        // If externally managed combat is active, do not move
        if (this.isExternalCombat) {
            return;
        }

        const baseSpeed = this.getSpeed();
        const finalSpeed = baseSpeed * this.currentTerrainMultiplier;

        // [CRITICAL FIX] Apply game timeScale to movement
        // Without this, army moves in real-time while season runs in game-time, causing desync
        const timeScale = (window as any).game?.timeSystem?.timeScale || 1.0;
        const scaledDeltaTime = deltaTime * timeScale;
        const moveDist = finalSpeed * scaledDeltaTime;

        if (this.hasArrived) return;

        // [FIX] Relax arrival threshold for Siege/Event triggering (0.2 degree ~ 20km)
        // This allows armies to trigger "Arrived" state without needing to pixel-perfectly snap to center
        const ARRIVAL_THRESHOLD = 0.2;

        if (distance <= moveDist || (this.pathQueue.length === 0 && distance < ARRIVAL_THRESHOLD)) {
            this.position.lat = targetLat;
            this.position.lng = targetLng;

            // [FIX] REMOVED incorrect usage here.
            // lastPosition should be updated ONLY when we START a segment, not when we finish it.

            // Check if there are more points in the path
            if (this.pathQueue.length > 0) {
                // [FIX] We are at a waypoint, about to move to next.
                // Record CURRENT position (Waypoint A) as lastPosition before moving to Waypoint B.
                this.lastPosition = { lat: this.position.lat, lng: this.position.lng };

                this.destination = this.pathQueue.shift()!;
                this.updateMarkerPosition();
                // We consumed this frame's movement to reach the waypoint.
            } else {
                // [HEX SNAP] 到达最终目的地时，确保吸附到六边形中心
                const finalHex = GridSystem.latLngToAxial(this.position.lat, this.position.lng);
                const hexCenter = GridSystem.axialToLatLng(finalHex.q, finalHex.r);
                this.position.lat = hexCenter.lat;
                this.position.lng = hexCenter.lng;

                this.updateMarkerPosition();
                this.hasArrived = true;
                const callback = this.onArrive;
                this.onArrive = () => { }; // Clear callback after use
                if (typeof callback === 'function') {
                    callback(this);
                }
            }
        } else {
            const ratio = moveDist / distance;
            this.position.lat += dx * ratio;
            this.position.lng += dy * ratio;
            this.updateMarkerPosition();
        }
    }

    // [NEW] Deterministic Grid Tracking for Siege Positioning
    public previousHex: { q: number, r: number } | null = null;
    public lastDirection: number = 0;

    // [OPTIMIZATION] Cache Terrain Type to avoid expensive DOM sampling every frame
    private currentTerrainType: string = 'NORMAL';

    private updateTerrainSpeed(): void {
        const key = GridSystem.getHexKeyAtLatLng(this.position.lat, this.position.lng);
        // const hex = GridSystem.latLngToAxial(this.position.lat, this.position.lng);
        // const key = (hex.q << 16) | (hex.r & 0xFFFF);

        if (key !== this.currentHexKey) {
            // [FIX] Valid Hex Transition: Record previous hex
            if (this.currentHexKey !== 0) {
                const oldR = (this.currentHexKey & 0xFFFF) << 16 >> 16;
                const oldQ = this.currentHexKey >> 16;
                this.previousHex = { q: oldQ, r: oldR };
            }

            this.currentHexKey = key;

            // [NEW] Road Priority: If on road, ignore underlying terrain (Ferry/Bridge over Ocean)
            const roadRegistry = (window as any).roadRegistry;
            const isOnRoad = roadRegistry && roadRegistry.isPositionOnRoad(this.position.lat, this.position.lng);

            if (isOnRoad) {
                // On road: Always passable, usage standard speed (Road mod applied in getSpeed)
                this.currentTerrainMultiplier = 1.0;
                this.currentTerrainType = 'NORMAL';
            } else {
                // [NEW] Get Base Terrain Type
                const terrainType = TerrainSpeedSystem.getHexSpeed({ lat: this.position.lat, lng: this.position.lng });
                this.currentTerrainType = terrainType;

                // [PHYSICS] Ocean Death Check
                if (terrainType === 'OCEAN') {
                    // [FIX] DISABLED Auto-Destroy on Ocean.
                    // This was causing units to vanish when crossing deep water on Ferry routes (Roads).
                    // Now they will simply rely on the Speed verification (if off-road, speed is 0 or low).
                    const q_debug = key >> 16;
                    const r_debug = (key & 0xFFFF) << 16 >> 16;
                    console.warn(`🌊 [Army] ${this.name || this.id} is in DEEP SEA at (${q_debug},${r_debug}). NOT destroying (Safety).`);
                    // this.destroy();
                    // return;
                }

                const config = TERRAIN_SPEED_CONFIG[terrainType];
                this.currentTerrainMultiplier = config ? config.multiplier : 1.0;
            }
        }
    }

    public setPosition(lat: number, lng: number): void {
        const oldKey = this.currentHexKey;
        this.position.lat = lat;
        this.position.lng = lng;

        const newHex = GridSystem.latLngToAxial(lat, lng);
        const newKey = (newHex.q << 16) | (newHex.r & 0xFFFF);

        // [FIX] Sync with physics & Update Trace
        if (oldKey !== newKey) {
            if (oldKey !== 0) {
                const oldR = (oldKey & 0xFFFF) << 16 >> 16;
                const oldQ = oldKey >> 16;
                this.previousHex = { q: oldQ, r: oldR };
            }

            if (this.spatialRegistry) {
                const oldR = (oldKey & 0xFFFF) << 16 >> 16;
                const oldQ = oldKey >> 16;
                this.spatialRegistry.move(this, oldQ, oldR, newHex.q, newHex.r);
            }
        }
        this.currentHexKey = newKey;

        this.updateMarkerPosition();
    }

    private getSpeed(): number {
        const tiers = PLAYER_SPEED_TIERS;

        // [SIMPLIFICATION] Event-controlled armies bypass troop penalties for precise timing
        if (this.speedMultiplier !== 1.0) {
            return tiers.STANDARD_SPEED * this.speedMultiplier;
        }

        let baseSpeed: number = tiers.STANDARD_SPEED;
        const terrainType = this.currentTerrainType; // [OPTIMIZATION] Use Cached Terrain Type

        // [Logic] 1. Unit Type Modifier
        let unitMod = 1.0;
        const isCavalry = this.legionType.includes('cavalry') || this.legionType.includes('huihui');

        // Cavalry: Fast on Plains (2.0), Slower on Water (1.5)
        // Infantry: Fast on Water (2.0), Slower on Plains (1.5)
        if (isCavalry) {
            if (terrainType === 'NORMAL') unitMod = 2.0;
            else if (terrainType === 'WATER') unitMod = 1.5;
        } else {
            // Infantry / Mixed
            if (terrainType === 'NORMAL') unitMod = 1.5;
            else if (terrainType === 'WATER') unitMod = 2.0;
        }

        // [Logic] 2. Road Modifier
        // "Armies ONLY move on roads" -> implied x2.0 if on road.
        // If strict movement logic works, we are always on road when moving.
        let roadMod = 1.0;
        const roadRegistry = (window as any).roadRegistry;
        if (roadRegistry && roadRegistry.isPositionOnRoad(this.position.lat, this.position.lng)) {
            roadMod = 1.5;
        } else {
            // Off-road penalty (if they somehow get here) - User said "Only move on road", so this is a fallback
            roadMod = 0.2;
        }

        // Final: Base * Terrain(0.1/1.0) * Unit(0.5/1.5) * Road(2.0)
        // Note: this.currentTerrainMultiplier is set in updateTerrainSpeed using TerrainSpeedSystem

        return baseSpeed * this.currentTerrainMultiplier * unitMod * roadMod;
    }

    public setSpeedMultiplier(multiplier: number): void {
        this.speedMultiplier = multiplier || 1.0;
        console.log(`[Army] ${this.name || this.id} speed multiplier set to: ${this.speedMultiplier}`);
    }

    private lastMarkerUpdate: number = 0;

    // [OPTIMIZATION] Throttle DOM updates to prevent layout thrashing
    // Canvas renderer handles smooth 60fps visuals. This is just for the invisible hitbox/label.
    private updateMarkerPosition(): void {
        const now = Date.now();
        if (now - this.lastMarkerUpdate < 100) return; // Limit to 10Hz
        this.lastMarkerUpdate = now;

        // Update invisible hitbox position
        if (this.marker) {
            const newLatLng = new L.LatLng(this.position.lat, this.position.lng);
            (this.marker as L.CircleMarker).setLatLng(newLatLng);

            // Update label tooltip if exists
            if (this.marker.getTooltip()) {
                this.marker.setTooltipContent(`${this.name || 'Army'} (${Math.floor(this.troops)})`);
            }
        }

        if (this.renderer) {
            // Renderer handles its own render loop
        }
    }

    private rotatePoint(x: number, y: number, angle: number): { lat: number, lng: number } {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return {
            lat: y * cos - x * sin,
            lng: y * sin + x * cos
        };
    }

    public split(amount: number): Army | null {
        if (amount <= 0 || amount >= this.troops) {
            console.warn(`[Army] Invalid split amount: ${amount} (Current: ${this.troops})`);
            return null;
        }

        // Deduct troops
        this.troops -= amount;

        // Create new army (clone properties)
        const newPos = { ...this.position }; // Clone position
        const newArmy = new Army(
            this.map,
            newPos,
            null, // No target initially
            amount,
            this.factionId,
            () => { }, // Dummy onArrive
            undefined, // onBattleTick
            undefined, // destination
            this.name // [USER REQUEST] Keep same name, no suffix
        );
        newArmy.type = this.type; // Inherit type (legion/army)

        console.log(`[Army] Splitting ${amount} from ${this.id}. Remaining: ${this.troops}. New Army: ${newArmy.id}`);
        return newArmy;
    }

    public destroy(): void {
        this.setCombatState(false); // 必须：立即停止射箭状态
        this.isDestroyed = true;    // 必须：标记死亡，通知管理器在下一帧移除它


        // [CRITICAL] Unregister from physics engine to prevent "Ghost Residue"
        if (this.spatialRegistry && this.currentHexKey !== 0) { // 0 is technically 0,0 but usually safe check
            const r = (this.currentHexKey & 0xFFFF) << 16 >> 16;
            const q = this.currentHexKey >> 16;
            console.log(`[Army] Destroying ${this.name || this.id}. Unregistering from hex (${q},${r})`);
            this.spatialRegistry.unregister(this, q, r);
        }

        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.label) {
            this.label.remove();
            this.label = null;
        }
        if (this.renderer) {
            // [USER REQUEST] Persistent Corpses: Delay unregistration by 15s to show corpse
            const rendererRef = this.renderer;
            setTimeout(() => {
                rendererRef.destroy();
            }, 15000);
            this.renderer = null; // Detach immediately to prevent double-destroy
        }
    }

    public getFactionId(): string {
        return this._factionId;
    }

    public getTargetCity(): any {
        return this.targetCity;
    }

    public getTroops(): number {
        return this.troops;
    }

    public getInitialTroops(): number {
        return this.initialTroops;
    }

    public setTroops(troops: number): void {
        this.troops = troops;
        if (this.label) {
            // Label update logic...
            // Kept for minimizing diff but practically unused if label is null
        }
    }

    public setOnArriveCallback(callback: (army: Army) => void): void {
        this.onArrive = callback;
        this.hasArrived = false;
    }

    public moveTo(newDestination: LatLng): void {
        // [OPTIMIZATION] 拦截 moveTo 并尝试使用道路系统
        // 导入全局注册表（在 GameApp 中挂载在 window 上）
        const roadRegistry = (window as any).roadRegistry;
        if (roadRegistry && roadRegistry.isInitialized()) {
            const currentPos = this.getPosition();
            const path = roadRegistry.findPathOnRoad(currentPos, newDestination);

            if (path && path.length > 0) {
                this.moveAlongPath(path);
                return;
            }
        }

        // [FALLBACK] Direct Movement (Off-Road)
        // [MODIFIED] 用户需求：这是一个地图，不是游戏，允许自由移动。
        // 如果没有找到道路路径，直接进行直线移动。
        console.log(`[Army] ⚠️ [Path Info] No road path found for ${this.name || this.id}. Falling back to direct movement (Map Mode).`);

        // Create a direct path (Current -> Target)
        this.moveAlongPath([newDestination]);
    }

    // [NEW] Resume Logic
    private savedPathQueue: LatLng[] = [];
    private savedDestination: LatLng | null = null;
    private savedTargetCity: any = null;

    /**
     * Immediately stop all movement and clear the path queue.
     * Used by ContactEngine when combat is triggered.
     * [HEX SNAP] 停止时吸附到最近的六边形中心
     * [NEW] Save state for potential resume
     */
    public stopMovement(saveState: boolean = false): void {
        if (saveState) {
            this.savedPathQueue = [...this.pathQueue];
            this.savedDestination = this.destination ? { ...this.destination } : null;
            this.savedTargetCity = this.targetCity;
            console.log(`[Army] Stopped movement and SAVED state. Path length: ${this.savedPathQueue.length}`);
        } else {
            this.savedPathQueue = [];
            this.savedDestination = null;
            this.savedTargetCity = null;
        }

        this.pathQueue = [];
        const oldKey = this.currentHexKey;

        // 吸附到当前位置所在的六边形中心
        const currentHex = GridSystem.latLngToAxial(this.position.lat, this.position.lng);
        const hexCenter = GridSystem.axialToLatLng(currentHex.q, currentHex.r);

        this.position.lat = hexCenter.lat;
        this.position.lng = hexCenter.lng;
        this.destination = { ...this.position };
        this.hasArrived = true;

        const newKey = (currentHex.q << 16) | (currentHex.r & 0xFFFF);

        // [FIX] Synchronize physics registry with snapped position
        if (this.spatialRegistry && oldKey !== newKey) {
            const oldR = (oldKey & 0xFFFF) << 16 >> 16;
            const oldQ = oldKey >> 16;
            this.spatialRegistry.move(this, oldQ, oldR, currentHex.q, currentHex.r);
        }
        this.currentHexKey = newKey;

        this.updateMarkerPosition();
    }

    /**
     * [NEW] Resume movement from saved state (if any)
     * Returns true if resumed, false if no saved state
     */
    public resumeMovement(): boolean {
        if (this.savedDestination) {
            console.log(`[Army] Resuming movement...`);
            this.destination = this.savedDestination;
            this.pathQueue = this.savedPathQueue;
            this.targetCity = this.savedTargetCity;
            this.hasArrived = false;

            // Clear saved
            this.savedDestination = null;
            this.savedPathQueue = [];
            this.savedTargetCity = null;

            this.updateMarkerPosition();
            return true;
        }
        return false;
    }

    public moveAlongPath(path: LatLng[]): void {
        if (path.length === 0) return;

        // clone to avoid side effects
        const newPath = [...path];

        // [FIX] Record start of trajectory
        this.lastPosition = { lat: this.position.lat, lng: this.position.lng };

        this.destination = newPath.shift()!;
        this.pathQueue = newPath;
        this.hasArrived = false;

        // Update marker rotation immediately
        this.updateMarkerPosition();
    }

    public getRenderer() {
        return this.renderer;
    }

    public setTargetCity(city: any): void {
        this.targetCity = city;
    }
}
