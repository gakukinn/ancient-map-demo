import { INITIAL_PLAYER_CONFIG, getRankByLevel, getRankByMerit, Rank } from '../data/playerData';
import { roadRegistry } from './RoadRegistry';
import { GridSystem } from '../systems/GridSystem';
import { TerrainSpeedSystem, TERRAIN_SPEED_CONFIG } from './TerrainSpeedSystem';
import { IBattleUnit, UnitType } from './CombatSystem';
import { PLAYER_SPEED_TIERS, MAP_CONSTANTS } from '../config/GameConfig';

export interface PlayerPosition {
    latitude: number;
    longitude: number;
}

export class Player implements IBattleUnit {
    public id: string = 'player';
    public name: string = '主公';
    public unitType: UnitType = 'army'; // 新增：玩家作为“军队”类型
    public position: PlayerPosition;
    public troops: number;
    public merit: number;
    public rank: Rank;
    public faction: string | null;
    public isDestroyed: boolean = false;

    private currentSpeedMultiplier: number = 1.0;
    private currentHexKey: string = '';
    private targetPosition: PlayerPosition | null = null;
    private isMoving: boolean = false;
    public isAutoMarching: boolean = false; // True if moving due to faction call to arms
    public isFighting: boolean = false;
    public battleType: 'siege' | 'field' | null = null;
    public battleTarget: { lat: number, lng: number } | null = null; // Position of the opponent in combat

    public isInvincible: boolean = false;

    // [NEW] Morale System (IBattleUnit requirement)
    public morale: number = 100;
    public maxMorale: number = 100;

    // Battle callbacks
    public onBattleEndCallback?: (result: 'victory' | 'defeat', opponent: IBattleUnit) => void;
    public onCombatStateChangeCallback?: (isFighting: boolean, battleType?: 'siege' | 'field') => void;
    public onFactionChangeCallback?: () => void;



    constructor() {
        const config = INITIAL_PLAYER_CONFIG;
        this.position = { ...config.position };
        this.troops = config.troops;
        this.merit = config.merit;
        this.faction = config.faction;

        const initialRank = getRankByLevel(config.rankLevel);
        if (!initialRank) {
            throw new Error('Invalid initial rank level');
        }
        this.rank = initialRank;
        // this.updateTerrainSpeed(); // [SAFETY] Deferred to first update to avoid startup crash
        console.log('👤 玩家已创建:', this.getInfo());
    }

    // IBattleUnit Implementation
    public get factionId(): string | null {
        return this.faction;
    }

    public get maxTroops(): number {
        return this.rank.maxTroops;
    }

    public toggleInvincible(): boolean {
        this.isInvincible = !this.isInvincible;
        console.log(`🛡️ Invincibility toggled: ${this.isInvincible}`);
        return this.isInvincible;
    }

    public destroy(): void {
        // Player cannot be destroyed in the traditional sense
        // Maybe reset to capital?
        console.log('Player defeated!');
    }

    // Battle state
    public onShowDamageCallback?: (damage: number) => void;

    public onBattleStart(opponent: IBattleUnit, battleType: 'siege' | 'field'): void {
        console.log(`Player started battle! Type: ${battleType}`);
        this.isFighting = true;
        this.battleType = battleType;
        // Set battle target to opponent's position for correct facing
        this.battleTarget = opponent.getPosition();
        this.onCombatStateChangeCallback?.(true, battleType);
    }

    public onBattleEnd(result: 'victory' | 'defeat', opponent: IBattleUnit, enemyKilled: number): void {
        console.log(`Player battle ended: ${result}, killed ${enemyKilled} enemy troops`);
        this.isFighting = false;
        this.battleType = null;
        this.battleTarget = null;
        this.onCombatStateChangeCallback?.(false);

        // Add merit equal to enemy troops killed
        if (enemyKilled > 0) {
            this.addMerit(enemyKilled);
            console.log(`🎖️ Gained ${enemyKilled} merit for killing ${enemyKilled} enemy troops (Total: ${this.merit})`);
        }

        // Player defeat: Set troops to 1 (not 0)
        if (result === 'defeat') {
            this.troops = 1;
            console.log('Player defeated! Troops reduced to 1.');
        }

        if (this.onBattleEndCallback) {
            this.onBattleEndCallback(result, opponent);
        }
    }

    public lastDamageTime: number = 0;

    public showDamage(damage: number): void {
        this.lastDamageTime = Date.now();
        if (this.onShowDamageCallback) {
            this.onShowDamageCallback(damage);
        }
    }

    public setCombatState(isFighting: boolean, battleType?: 'siege' | 'field', targetPos?: { lat: number, lng: number }): void {
        this.isFighting = isFighting;
        this.battleType = battleType || null;
        this.battleTarget = targetPos || null;
        if (this.onCombatStateChangeCallback) {
            this.onCombatStateChangeCallback(isFighting, battleType);
        }
    }

    public getPosition(): PlayerPosition & { lat: number, lng: number } {
        // Return object with both latitude/longitude (for existing code) and lat/lng (for IBattleUnit)
        return Object.assign({}, this.position, {
            lat: this.position.latitude,
            lng: this.position.longitude
        });
    }

    private pathQueue: PlayerPosition[] = [];

    public moveTo(latitude: number, longitude: number, onArrive?: () => void, isAutoMarching: boolean = false): void {
        if (this.isFighting) {
            console.log('⚔️ 战斗中无法移动！');
            return;
        }

        // [FIX] Use road-based pathfinding
        const currentPos = { lat: this.position.latitude, lng: this.position.longitude };
        const targetPos = { lat: latitude, lng: longitude };

        const path = roadRegistry.findPathOnRoad(currentPos, targetPos);

        if (path && path.length > 0) {
            // Convert LatLng[] to PlayerPosition[]
            const playerPath: PlayerPosition[] = path.map(p => ({
                latitude: p.lat,
                longitude: p.lng
            }));
            this.moveAlongPath(playerPath, onArrive, isAutoMarching);
            console.log(`🛤️ [Player] 沿道路移动，路径长度: ${path.length}`);
        } else {
            // No road path found - fallback to direct movement (for short distances or off-road areas)
            console.warn(`[Player] 未找到道路路径，直线移动到目标`);
            this.pathQueue = [];
            this.targetPosition = { latitude, longitude };
            this.isMoving = true;
            this.isAutoMarching = isAutoMarching;
            (this as any).onArriveCallback = onArrive;
        }
    }

    public moveAlongPath(path: PlayerPosition[], onArrive?: () => void, isAutoMarching: boolean = false): void {
        if (this.isFighting) {
            console.log('⚔️ 战斗中无法移动！');
            return;
        }
        if (path.length === 0) return;

        this.pathQueue = [...path];
        // Start moving to the first point immediately
        const firstPoint = this.pathQueue.shift();
        if (firstPoint) {
            this.targetPosition = firstPoint;
            this.isMoving = true;
            this.isAutoMarching = isAutoMarching;
            (this as any).onArriveCallback = onArrive;
        }
    }

    public update(deltaTime: number = 0): void {
        if (!this.isMoving || !this.targetPosition) return;

        this.updateTerrainSpeed();
        const dx = this.targetPosition.longitude - this.position.longitude;
        const dy = this.targetPosition.latitude - this.position.latitude;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.001) {
            // Arrived at current target
            this.position = { ...this.targetPosition };

            // Check if there are more points in the path queue
            if (this.pathQueue.length > 0) {
                const nextPoint = this.pathQueue.shift();
                if (nextPoint) {
                    this.targetPosition = nextPoint;
                    return; // Continue moving to next point next frame
                }
            }

            // Totally arrived
            // [HEX SNAP] 到达时吸附到六边形中心
            const finalHex = GridSystem.latLngToAxial(this.position.latitude, this.position.longitude);
            const hexCenter = GridSystem.axialToLatLng(finalHex.q, finalHex.r);
            this.position.latitude = hexCenter.lat;
            this.position.longitude = hexCenter.lng;

            this.isMoving = false;
            this.isAutoMarching = false;
            this.targetPosition = null;

            // Trigger arrival callback if exists
            if ((this as any).onArriveCallback) {
                (this as any).onArriveCallback();
                (this as any).onArriveCallback = undefined;
            }
            return;
        }

        const baseSpeed = this.getSpeed();
        const actualSpeed = baseSpeed * this.currentSpeedMultiplier;

        // [CRITICAL FIX] Apply game timeScale to movement
        const timeScale = (window as any).game?.timeSystem?.timeScale || 1.0;
        const scaledDeltaTime = deltaTime * timeScale;
        const moveDistance = actualSpeed * scaledDeltaTime;
        const ratio = Math.min(moveDistance / distance, 1);

        this.position.longitude += dx * ratio;
        this.position.latitude += dy * ratio;
    }

    /**
     * [HEX SNAP] 立即停止移动并吸附到最近的六边形中心
     */
    public stopMovement(): void {
        this.pathQueue = [];

        // 吸附到当前位置所在的六边形中心
        const currentHex = GridSystem.latLngToAxial(this.position.latitude, this.position.longitude);
        const hexCenter = GridSystem.axialToLatLng(currentHex.q, currentHex.r);

        this.position.latitude = hexCenter.lat;
        this.position.longitude = hexCenter.lng;

        this.isMoving = false;
        this.isAutoMarching = false;
        this.targetPosition = null;
    }

    private getSpeed(): number {
        const troops = Math.max(1, this.troops);
        const tiers = PLAYER_SPEED_TIERS;

        // Tier 1: 轻装 (< LIGHT_THRESHOLD)
        if (troops < tiers.LIGHT_THRESHOLD) {
            return tiers.LIGHT_SPEED;
        }
        // Tier 2: 标准 (LIGHT_THRESHOLD - STANDARD_THRESHOLD)
        else if (troops <= tiers.STANDARD_THRESHOLD) {
            return tiers.STANDARD_SPEED;
        }
        // Tier 3: 重装 (> STANDARD_THRESHOLD)
        else {
            const extraTenThousands = Math.floor((troops - tiers.STANDARD_THRESHOLD) / tiers.STANDARD_THRESHOLD);
            const reduction = extraTenThousands * tiers.HEAVY_REDUCTION_PER_10K;
            return Math.max(tiers.HEAVY_MIN_SPEED, tiers.STANDARD_SPEED - reduction);
        }
    }

    private updateTerrainSpeed(): void {
        const centerLat = MAP_CONSTANTS.CENTER_LATITUDE;
        const hex = GridSystem.latLngToAxial(this.position.latitude, this.position.longitude);
        const key = `${hex.q},${hex.r}`;
        const lat = this.position.latitude;
        const lng = this.position.longitude;

        // Check if we moved to a new hex or just updating
        // We update speed multiplier every frame or less frequently depending on call
        // But here we rely on key change for cache. 
        // Note: Road check needs exact position sometimes? 
        // RoadRegistry checks by Hex. So hex key change is enough.

        if (key !== this.currentHexKey) {
            this.currentHexKey = key;
            const terrainMult = TerrainSpeedSystem.getSpeedMultiplier({ lat, lng });

            // [ROAD BONUS] 道路行军加成 (针对玩家)
            // 如果在道路上，且非深海，速度 +50%
            // RoadRegistry.isPositionOnRoad converts lat/lng to hex, so it matches.
            const isOnRoad = roadRegistry.isPositionOnRoad(lat, lng);

            if (isOnRoad && terrainMult > 0) {
                this.currentSpeedMultiplier = terrainMult * 1.5;
                // console.log('🛣️ On Road! Speed Bonus Active.');
            } else {
                this.currentSpeedMultiplier = terrainMult;
            }
        }
    }

    public addMerit(amount: number): void {
        this.merit += amount;
        const newRank = getRankByMerit(this.merit);

        // Ensure we don't downgrade to Civilian (Level 14) if we have a faction
        if (this.faction && newRank.level === 14) return;

        if (newRank.level < this.rank.level) {
            this.rank = newRank;
            console.log(`🎖️ 晋升为: ${this.rank.name}`);
        }
    }

    public recruitTroops(amount: number): boolean {
        const newTotal = Math.min(this.troops + amount, this.rank.maxTroops);
        this.troops = newTotal;
        return true;
    }

    public joinFaction(factionId: string): void {
        this.faction = factionId;
        this.merit = 0;
        // Join as Recruit (Level 13 = 新兵)
        const recruitRank = getRankByLevel(13);
        if (recruitRank) {
            this.rank = recruitRank;
        }
        this.troops = 10; // Initial troops for recruit

        // Notify faction change
        if (this.onFactionChangeCallback) {
            this.onFactionChangeCallback();
        }
    }

    public leaveFaction(): void {
        this.faction = null;
        // Reset to Civilian (Level 14 = 平民)
        const civilianRank = getRankByLevel(14);
        if (civilianRank) {
            this.rank = civilianRank;
        }
        this.troops = 1;
        this.merit = 0;

        // Notify faction change
        if (this.onFactionChangeCallback) {
            this.onFactionChangeCallback();
        }
    }

    public resign(): void {
        this.leaveFaction();
    }

    private updateRank(): void {
        // If no faction, stay as Civilian
        if (!this.faction) return;

        const newRank = getRankByMerit(this.merit);
        // Ensure we don't downgrade to Civilian (Level 14) if we have a faction
        if (newRank.level === 14) return;

        // Only promote if level decreases (1 is highest)
        if (newRank.level < this.rank.level) {
            this.rank = newRank;
            console.log(`🎖️ 晋升为: ${this.rank.name}`);
        }
    }

    public getInfo(): any {
        return {
            position: this.position,
            troops: this.troops,
            maxTroops: this.rank.maxTroops,
            merit: this.merit,
            rank: this.rank.name,
            rankLevel: this.rank.level,
            faction: this.faction || '未选择',
            isMoving: this.isMoving,
            isFighting: this.isFighting,
            currentSpeed: this.currentSpeedMultiplier
        };
    }

    public getIsMoving(): boolean {
        return this.isMoving;
    }

    public getTargetPosition(): PlayerPosition | null {
        return this.targetPosition ? { ...this.targetPosition } : null;
    }

    public getTroops(): number {
        return this.troops;
    }

    public setTroops(value: number): void {
        if (this.isInvincible && value < this.troops) {
            console.log('🛡️ Player is invincible, troops not reduced.');
            return;
        }
        const oldTroops = this.troops;
        // Don't clamp to maxTroops here - only recruitTroops enforces the limit
        this.troops = Math.max(0, value);
    }

    // [NEW] IBattleUnit requirement
    public setMorale(value: number): void {
        this.morale = Math.max(0, Math.min(this.maxMorale, value));
    }

    public getMaxTroops(): number {
        return this.rank.maxTroops;
    }

    public getMerit(): number {
        return this.merit;
    }

    public getRank(): Rank {
        return { ...this.rank };
    }

    public getFaction(): string | null {
        return this.faction;
    }

    public getSpeedMultiplier(): number {
        return this.currentSpeedMultiplier;
    }
}
