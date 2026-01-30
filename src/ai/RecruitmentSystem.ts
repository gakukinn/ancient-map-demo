import { City, CityType } from '../types/core';
import { CityManager } from '../core/CityManager';
import { LegionManager } from '../core/LegionManager';
import { GridSystem } from '../systems/GridSystem';
import { LegionType, getUnitTypeConfig } from '../types/UnitTypes';

import { RoadRegistry } from '../core/RoadRegistry';
import { GameConfig } from '../config/GameConfig';
import { CITY_CONFIG, getMinGarrison } from '../config/CityConfig';

export interface RecruitmentConfig {
    /** 募兵冷却时间 (秒) */
    cooldown: number;
    /** 兵力阈值 (只有城市兵力达到此值才生成) */
    spawnThreshold: number;
    /** 生成军团的兵力 */
    spawnTroops: number;
    /** 是否可以募兵 */
    canRecruit: boolean;
}

/** 根据城市类型返回募兵配置 */
function getRecruitmentConfig(cityType: CityType): RecruitmentConfig {
    // 统一规则：阈值 = 最低守军 + 生成兵力
    // 关隘和小城不产兵
    const isPass = cityType === 'pass' || cityType === 'ferry';
    const isSmallCity = cityType === 'small_city';

    const spawnTroops = 20000;
    // Use dynamic garrison based on city type (10% of maxTroops)
    const minGarrison = getMinGarrison(cityType);
    return {
        cooldown: 10, // Check regularly, but rely on troop count mainly
        spawnThreshold: minGarrison + spawnTroops,
        spawnTroops: spawnTroops,
        canRecruit: !isPass && !isSmallCity
    };
}



export class RecruitmentSystem {
    private cityManager: CityManager;
    private legionManager: LegionManager;
    private roadRegistry: RoadRegistry;


    /** 记录每座城市的募兵冷却倒计时 (秒) */
    private cooldownTimers: Map<string, number> = new Map();

    /** 系统是否启用 */
    private enabled: boolean = true;

    constructor(
        cityManager: CityManager,
        legionManager: LegionManager,
        roadRegistry: RoadRegistry
    ) {
        this.cityManager = cityManager;
        this.legionManager = legionManager;
        this.roadRegistry = roadRegistry;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        console.log(`[RecruitmentSystem] ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * 每帧调用，检查是否需要为某个派系发动出击。
     * [REFACTORED] Capital-Centric: Faction-level sortie, not city-level.
     * @param deltaTime 距离上一帧经过的游戏时间 (秒) [SCALED TIME]
     */
    // [OPTIMIZATION] Time-Slicing State
    private factionUpdateIndex: number = 0;
    private readonly FACTIONS_PER_FRAME = 2; // Process 2 factions per frame

    public update(deltaTime: number): void {
        if (!this.enabled) return;

        // [OPTIMIZATION] Time-Slicing: 
        // Instead of processing ALL factions every 1.0s (causing spikes if they sync up),
        // we process a few factions EVERY FRAME.
        // This spreads the load perfectly evenly.

        // Decrement cooldowns for ALL factions (cheap operation)
        // We can do this because it's just a map iteration of scalars.
        // Actually, we can just check Date.now() or maintain a separate timer?
        // Let's stick to deltaTime decrement for consistency, but only for the processed factions?
        // NO. Cooldown memory needs to be consistent. 
        // Better: Use Date.now() for cooldowns to avoid per-frame decrement loop.
        // But to minimize changes, let's keep the scalar decrement but apply it only when visiting the faction.
        // This means 'cooldown' becomes "time since last check".

        // Let's use the standard "Process N items" loop
        const factions = this.cityManager.getAllFactionIds();
        if (factions.length === 0) return;

        const count = Math.min(factions.length, this.FACTIONS_PER_FRAME);

        for (let i = 0; i < count; i++) {
            if (this.factionUpdateIndex >= factions.length) {
                this.factionUpdateIndex = 0;
            }

            const factionId = factions[this.factionUpdateIndex];
            this.factionUpdateIndex++;

            // Tick Logic for this Faction
            this.processFaction(factionId, deltaTime);
        }

        // [NEW] Check for Faction Revival (Once per Year)
        // This is fast enough to run every frame (it has internal year check).
        this.checkFactionRevival();
    }

    private processFaction(factionId: string, deltaTime: number): void {
        // [LOGIC] Restored from original update loop

        // Skip neutral/player/rebels
        if (factionId === 'neutral' || factionId === 'panjun') return;

        // [SINGLE ARMY] Skip if faction already has an active legion
        if (this.legionManager.hasMainLegion(factionId)) {
            this.lastActiveYear.set(factionId, this.cityManager.getCurrentYear());
            return;
        }

        // Update Cooldown
        // Since we visit this faction less frequently (e.g. once every 10 frames),
        // we should conceptually decay the timer by the interval since last visit.
        // But simpler: just decay by fixed amount since we want "real time" delay?
        // If we want 30s delay, and we visit every 0.1s...
        // Let's convert cooldownTimers to TIMESTAMP based to be frame-rate independent and simple.

        const now = Date.now();
        const readyTime = this.cooldownTimers.get(factionId) || 0;

        if (now < readyTime) {
            return;
        }

        // [NEW] Check Force Minimum (At least 20,000 available troops required)
        const factionCities = this.cityManager.getCitiesByFaction(factionId);
        let totalAvailable = 0;
        for (const city of factionCities) {
            const minGarrison = getMinGarrison(city.type);
            totalAvailable += Math.max(0, city.troops - minGarrison);
        }

        if (totalAvailable < 20000) {
            // Not enough troops. Check again in 10s.
            this.cooldownTimers.set(factionId, now + 10000);
            return;
        }

        const targetCity = this.findTargetCity(factionId);
        if (!targetCity) return;

        const targetPos = { lat: targetCity.latitude, lng: targetCity.longitude };
        const requestedTroops = GameConfig.LEGION.MAX_TROOPS;

        const spawnCity = this.findSpawnCity(factionId);
        if (!spawnCity) {
            this.cooldownTimers.set(factionId, now + 60000); // 60s
            return;
        }

        const army = this.legionManager.attemptSortie(factionId, targetPos, requestedTroops, spawnCity.id);
        if (army) {
            console.log(`🚀 [RecruitmentSystem] ${factionId} launched sortie: ${army.name} (${army.getTroops()} troops) from ${spawnCity.name} towards ${targetCity.name}`);
            this.legionManager.moveLegionToCity(army, targetCity.id, undefined, false);
            this.cooldownTimers.set(factionId, now + 60000); // 60s
            this.lastActiveYear.set(factionId, this.cityManager.getCurrentYear());
        } else {
            // Sortie failed
            this.cooldownTimers.set(factionId, now + 30000); // 30s
        }
    }

    /** Last year a revival was triggered */
    private lastRevivalYear: number | null = null;

    /** Track the last year a faction had an active army. */
    private lastActiveYear: Map<string, number> = new Map();

    /**
     * [NEW] Check if any eliminated faction should be revived.
     * Rule: Once per year, 100% chance, max 1 faction.
     * Condition: Lost Capital AND Inactive for > 2 Years.
     */
    private checkFactionRevival(): void {
        const currentYear = this.cityManager.getCurrentYear?.() || 0;

        // Run only if year changed and we haven't revived anyone this year yet
        if (this.lastRevivalYear !== null && currentYear <= this.lastRevivalYear) return;

        // Perform the check
        this.lastRevivalYear = currentYear; // Mark this year as checked

        console.log(`🔄 [RecruitmentSystem] Checking for faction revivals in Year ${currentYear}...`);

        const factionManager = this.legionManager.getFactionManager();
        const allFactions = factionManager.getFactions();

        // 1. Identify Candidates
        const candidates = allFactions.filter(faction => {
            if (faction.id === 'neutral' || faction.id === 'panjun') return false;

            // Check Condition 1: Lost Capital
            const capitalId = faction.capitalCityId;
            if (!capitalId) return false;

            const capitalCity = this.cityManager.getCityById(capitalId);
            if (!capitalCity || capitalCity.factionId === faction.id) return false;

            // Check Condition 2: Inactive for > 2 Years
            const lastActive = this.lastActiveYear.get(faction.id) ?? currentYear;

            // "2年没有产生" -> if gap > 2 (e.g. active 190, current 193 -> 3 years gap).
            // Logic: inactive 191, 192... revive in 193.
            if (currentYear - lastActive < 2) return false;

            // Double check: Does this faction currently have ANY army?
            if (this.legionManager.hasMainLegion(faction.id)) {
                this.lastActiveYear.set(faction.id, currentYear);
                return false;
            }

            return true;
        });

        if (candidates.length === 0) return;

        // 2. Pick One
        const winnerIndex = Math.floor(Math.random() * candidates.length);
        const revivedFaction = candidates[winnerIndex];
        const capitalId = revivedFaction.capitalCityId!;

        // 3. Execute Revival
        const capitalCity = this.cityManager.getCityById(capitalId);
        if (!capitalCity) return;

        console.log(`🔥 [RecruitmentSystem] FACTION REVIVAL: ${revivedFaction.name} has risen in ${capitalCity.name}!`);

        this.cityManager.updateCity(capitalId, {
            factionId: revivedFaction.id,
            troops: 30000
        });

        // [FIX] Force Clear Main Legion status to ensure RecruitmentSystem doesn't skip
        // This handles cases where faction died but legion ref lingered
        this.legionManager.unregisterMainLegion(revivedFaction.id);

        // [AUTO-CHRONICLE] Faction Revival Log
        // Style: 0.85em, Plain (No bold/color), Active Voice
        // Template: "XX军于XX复国"
        const factionName = revivedFaction.name;
        const cityName = capitalCity.name;

        window.dispatchEvent(new CustomEvent('chronicle-log', {
            detail: {
                type: 'narrative', // Reuse narrative or maybe siege icon? Narrative '📜' fits.
                description: `<span style="font-size: 0.85em;">${factionName}军于${cityName}复国</span>`
            }
        }));

        this.lastActiveYear.set(revivedFaction.id, currentYear);
    }

    /**
     * Find best city to spawn army from.
     * Priority: Imperial/Huge > Large > Medium > Small
     * [USER REQUEST] Strict prioritization by city size.
     */
    private findSpawnCity(factionId: string): City | null {
        const cities = this.cityManager.getCitiesByFaction(factionId);
        if (cities.length === 0) return null;

        // Size Priority Map
        const getPriority = (type: CityType): number => {
            if (type === 'huge_city') return 4;
            if (type === 'large_city') return 3;
            if (type.includes('medium')) return 2; // Fuzzy match for custom mediums
            return 1; // Small/Pass/Other
        };

        // Sort descending by priority
        cities.sort((a, b) => {
            const pA = getPriority(a.type);
            const pB = getPriority(b.type);
            if (pA !== pB) return pB - pA; // Higher priority first

            // Tie-breaker 1: Capital? (Optional, but good for stability)
            const capId = this.legionManager.getFactionManager().getCapital(factionId);
            if (a.id === capId) return -1;
            if (b.id === capId) return 1;

            // Tie-breaker 2: Troops? (More troops = better source)
            return (b.troops || 0) - (a.troops || 0);
        });

        // Return the best candidate (must be able to spawn, effectively not a pass if possible, but RecruitmentConfig handles logic)
        // Note: Passes have priority 1. If only passes exist, it will pick one. 
        // But logic in spawn check (canRecruit) prevents passes from recruiting anyway.
        // We should filter for recruitment capability here too?
        // getRecruitmentConfig(type).canRecruit

        for (const city of cities) {
            const config = getRecruitmentConfig(city.type);
            // Reuse the helper or duplicated logic? 
            // The helper is local function 'getRecruitmentConfig'.
            // Accessing module scope function.
            if (config.canRecruit) {
                return city;
            }
        }

        return null;
    }

    /**
     * Find a suitable target city for AI sortie.
     * Simple heuristic: nearest enemy city that is NOT a pass.
     */
    private findTargetCity(factionId: string): City | null {
        // Source reference for distance check
        const sourceCity = this.findSpawnCity(factionId);
        if (!sourceCity) return null;

        const cities = this.cityManager.getCities();
        let nearestEnemy: City | null = null;
        let minDist = Infinity;

        for (const city of cities) {
            if (!city.factionId || city.factionId === factionId) continue;
            // [USER REQUEST] Do not skip passes/fortresses
            // if (city.type.includes('pass') || city.type.includes('fortress')) continue; // Skip passes

            const dist = Math.sqrt(
                Math.pow(city.latitude - sourceCity.latitude, 2) +
                Math.pow(city.longitude - sourceCity.longitude, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                nearestEnemy = city;
            }
        }

        return nearestEnemy;
    }

    /**
     * 在指定城市的相邻空闲格子生成一个新军团
     * [STRICT] 必须生成在城市连接道路的第一个格子上
     */
    private spawnLegion(city: City, troops: number): boolean {
        // [UNIT SYSTEM] 根据城市决定兵种
        const legionType = 'infantry';
        const legionName = `${city.name}军`;

        // 1. 获取城市连接的道路
        const spatialRegistry = this.legionManager.getSpatialRegistry();

        // TODO: Import roadRegistry directly or pass it in? 
        // For now, assume global access or improved LegionManager spatial query
        // But actually, we need a valid Road start point.

        // Let's use GridSystem to find neighbors, then check if they are on a Road.
        // This is a robust way without needing RoadRegistry instance here if unavailable.
        // BUT user requirement: "Generate on the first grid of the connecting road".

        const cityHex = GridSystem.latLngToAxial(city.latitude, city.longitude);
        const neighbors = GridSystem.getNeighborAxialCoords(cityHex.q, cityHex.r);

        // [FIX] Use injected roadRegistry
        let spawnHex: { q: number; r: number } | null = null;

        if (this.roadRegistry && this.roadRegistry.isInitialized()) {
            for (const neighbor of neighbors) {
                const roadKey = `${neighbor.q},${neighbor.r}`;
                // Must be on road AND empty
                // Note: roadRegistry still uses string keys. spatialRegistry uses q,r args.
                if (this.roadRegistry.isOnRoad(roadKey) && !spatialRegistry.isOccupied(neighbor.q, neighbor.r)) {
                    spawnHex = neighbor;
                    break;
                }
            }
        } else {
            // Fallback: any empty neighbor (shouldn't happen if road registry is vital)
            for (const neighbor of neighbors) {
                if (!spatialRegistry.isOccupied(neighbor.q, neighbor.r)) {
                    spawnHex = neighbor;
                    break;
                }
            }
        }

        if (!spawnHex) {
            // No valid spawn point (blocked or no road)
            return false;
        }

        // 获取生成位置的经纬度
        const spawnPos = GridSystem.axialToLatLng(spawnHex.q, spawnHex.r);

        console.log(`🏰 [RecruitmentSystem] ${city.name} 募兵: ${legionName} (${troops}人). 剩余: ${city.troops - troops}`);

        // 使用 LegionManager 的 API 生成军团
        this.legionManager.createArmy({
            name: legionName,
            factionId: city.factionId!,
            position: { lat: spawnPos.lat, lng: spawnPos.lng },
            troops: troops,
            legionType: legionType,
            sourceCityId: city.id
        });

        return true;
    }
}


