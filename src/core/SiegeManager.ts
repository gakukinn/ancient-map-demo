import { CityManager } from './CityManager';
import { LegionManager } from './LegionManager';
import { CombatSystem, IBattleUnit } from './CombatSystem';
import { Player } from './Player';
import { GameMap } from '../map/GameMap';
import { EventVisualizer } from './EventVisualizer';
import { SiegeData } from '../types/core';
import { HISTORICAL_LEGIONS } from '../data/legions';
import { FACTIONS } from '../data/factions'; // [NEW] Import Factions
import { Army } from './Army';
import { BattleUnitFactory } from './BattleUnitFactory';
import { CombinedBattleUnit } from './CombinedBattleUnit';
import { BattleField } from './BattleField';
import { GameConfig } from '../config/GameConfig';
import { getMinGarrison } from '../config/CityConfig';
import { GridSystem } from '../systems/GridSystem';
import { LegionType } from '../types/UnitTypes';
import {
    getHexDistance,
    getEuclideanDistance,
    isNearCity,
    isWithinReinforcementRange,
    cityToLatLng,
    DISTANCE_THRESHOLDS
} from './DistanceUtils';
import { CombatUtils } from './CombatUtils';
import { OrientationSystem } from './OrientationSystem';

export class SiegeManager {
    private cityManager: CityManager;
    private legionManager: LegionManager;
    private combatSystem: CombatSystem;
    private player: Player;
    private map: GameMap;
    private visualizer: EventVisualizer;

    // [新增] 追踪每个城市的活跃战场
    private activeSieges: Map<string, BattleField> = new Map();
    // [新增] 追踪正在前往目标的攻城军团（移动阶段，尚未开战）
    private pendingSieges: Set<string> = new Set(); // armyId -> pending

    public hasActiveSieges(): boolean {
        // [修复] 同时检查进行中的战斗和正在行军的攻城军团
        return this.activeSieges.size > 0 || this.pendingSieges.size > 0;
    }

    /**
     * [NEW] 获取所有活跃攻城战的Map (供AI行为树检测首都/友城告急)
     */
    public getActiveSiegesMap(): Map<string, BattleField> {
        return this.activeSieges;
    }

    public getCityManager(): CityManager {
        return this.cityManager;
    }



    constructor(
        cityManager: CityManager,
        legionManager: LegionManager,
        combatSystem: CombatSystem,
        player: Player,
        map: GameMap,
        visualizer: EventVisualizer
    ) {
        this.cityManager = cityManager;
        this.legionManager = legionManager;
        this.combatSystem = combatSystem;
        this.player = player;
        this.map = map;
        this.visualizer = visualizer;
    }

    /**
     * [NEW] 直接使用指定军团开始攻城战（用于野战后链式攻城）
     * 跳过 findCandidate 逻辑，直接触发战斗
     */
    public startSiegeWithArmy(army: Army, siegeData: SiegeData, onSiegeComplete?: () => void): void {
        const targetCity = this.cityManager.getCity(siegeData.defenderCityId);
        if (!targetCity) {
            console.warn(`[SiegeManager] Target city ${siegeData.defenderCityId} not found.`);
            onSiegeComplete?.();
            return;
        }

        console.log(`[SiegeManager] Starting siege with army ${army.name} against ${targetCity.name}`);
        this.onArmyArrive(army, targetCity, siegeData.attackerFactionId, siegeData, onSiegeComplete);
    }

    /**
     * [NEW] 根据六边形坐标触发攻城战（用于 ContactEngine 拦截敌城时调用）
     */
    public triggerSiegeAtHex(army: Army, hexQ: number, hexR: number): void {
        const targetCity = this.cityManager.getCities().find(c => {
            const cHex = GridSystem.latLngToAxial(c.latitude, c.longitude);
            return cHex.q === hexQ && cHex.r === hexR;
        });

        if (!targetCity) {
            army.setBlocked();
            return;
        }

        console.log(`🏰 [SiegeManager] triggerSiegeAtHex: ${army.name} 攻击 ${targetCity.name}`);

        const siegeData: SiegeData = {
            attackerFactionId: army.getFactionId(),
            defenderCityId: targetCity.id,
            result: 'attacker_win',
        };

        this.onArmyArrive(army, targetCity, army.getFactionId(), siegeData);
    }



    private onArmyArrive(
        army: Army,
        targetCity: any,
        attackerFactionId: string,
        siegeData: SiegeData,
        onSiegeComplete?: () => void
    ): void {
        // 1. Cleanup pending state
        this.pendingSieges.delete(army.id);

        // 2. Validate Target
        const city = this.cityManager.getCity(targetCity.id);
        if (!city) {
            army.setCombatState(false);
            onSiegeComplete?.();
            return;
        }

        // 3. Friendly Check
        if (city.factionId === army.getFactionId()) {
            console.log(`[SiegeManager] Friendly city. Aborting.`);
            army.setCombatState(false);
            army.stopMovement();
            onSiegeComplete?.();
            return;
        }

        // 4. Active Battle Check
        const activeBattle = this.activeSieges.get(city.id);
        if (activeBattle && !activeBattle.isOver) {
            this.handleJoinSiege(army, city, activeBattle, onSiegeComplete);
            return;
        }

        // 5. Start New Siege
        this.initiateNewSiege(army, city, attackerFactionId, siegeData);
    }

    private handleJoinSiege(army: Army, city: any, activeBattle: BattleField, onSiegeComplete?: () => void): void {
        // [UPGRADE] Check if we can join this siege as reinforcements
        const armyFaction = army.getFactionId();
        const isJoiningAttacker = activeBattle.getAttackerFaction() === armyFaction;
        const isJoiningDefender = city.factionId === armyFaction;

        if (isJoiningAttacker || isJoiningDefender) {
            console.log(`📯 [SiegeManager] ${army.name} joining ongoing siege at ${city.name} as ${isJoiningAttacker ? 'Attacker' : 'Defender'}`);

            const adapter = BattleUnitFactory.createAdapter(
                army.id, army.name || 'Reinforcement', armyFaction, army, 'legion', army.getTroops(),
                () => { army.setCombatState(false); }
            );

            activeBattle.addReinforcement(adapter, isJoiningAttacker);
            army.stopMovement(true);
            onSiegeComplete?.();
            return;
        }

        console.log(`⏳ [SiegeManager] ${army.name} blocked by active siege at ${city.name} (Not member of fighting factions)`);
        army.setCombatState(false);
        army.stopMovement();
        army.setBlocked(9000); // 9s check interval
        onSiegeComplete?.();
    }

    private initiateNewSiege(army: Army, city: any, attackerFactionId: string, siegeData: SiegeData): void {
        console.log(`[SiegeManager] Battle START: ${army.name} vs ${city.name}`);

        // [FIX] Create Adapters & Start Battle
        const attackerAdapter = BattleUnitFactory.createAdapter(
            army.id,
            army.name || 'Attacker',
            attackerFactionId,
            army,
            'legion',
            army.getTroops(),
            () => {
                // [FIX] Reset combat state on victory
                army.setCombatState(false);
            },
            () => {
                // [NEW] Attacker Completely Destroyed Logic (On Death)
                // This callback is triggered when troops reach 0

                // Get Faction Chinese Name
                const attackerFaction = FACTIONS.find(f => f.id === attackerFactionId);
                const attackerName = attackerFaction ? attackerFaction.name : attackerFactionId;

                window.dispatchEvent(new CustomEvent('chronicle-log', {
                    detail: {
                        type: 'siege', // Reuse siege type icon
                        description: `<span style="font-size: 0.85em;">${attackerName}军于${city.name}城外全军覆没</span>`
                    }
                }));
            }
        );

        const defenderAdapter = BattleUnitFactory.createAdapter(
            city.id,
            city.name,
            city.factionId,
            city,
            'city',
            city.troops,
            () => {
                // [FIX] Defense Victory Cleanup
                console.log(`🛡️ [SiegeManager] ${city.name} repelled the siege.`);
                this.activeSieges.delete(city.id);
                this.cityManager.stopSiegeEffect(city.id);
            },
            () => {
                // [FIX] City Fallen Logic
                console.log(`🚩 [SiegeManager] ${city.name} FALLEN to ${attackerFactionId}!`);
                this.activeSieges.delete(city.id);
                this.cityManager.stopSiegeEffect(city.id);

                this.cityManager.updateCity(city.id, {
                    factionId: attackerFactionId,
                    troops: getMinGarrison(city.type)
                });

                // [AUTO-CHRONICLE] City Capture Log (Capitals Only)
                if (this.cityManager.isAnyFactionCapital(city.id)) {
                    // Get Faction Chinese Name
                    const attackerFaction = FACTIONS.find(f => f.id === attackerFactionId);
                    const attackerName = attackerFaction ? attackerFaction.name : attackerFactionId;

                    // Style: 0.85em, Semi-Classical
                    // Format: "XX军攻克XX" (Active Voice)
                    // Colors: REMOVED (User request: hard to read) - Use default text color

                    window.dispatchEvent(new CustomEvent('chronicle-log', {
                        detail: {
                            type: 'siege',
                            description: `<span style="font-size: 0.85em;">${attackerName}军攻克${city.name}</span>`
                        }
                    }));
                }
            },
            undefined, // playerParticipation
            (newTroops) => {
                // [FIX] Sync visual label with data
                this.cityManager.updateCityLabel(city.id);
            }
        );

        const defenderUnits: IBattleUnit[] = [defenderAdapter];

        // [NEW] ⚡ Initial Defensive Rally (初始防御吸纳)
        this.rallyDefenders(city, army, defenderUnits);

        const battleField = this.combatSystem.startRegionalBattle(
            attackerFactionId,
            [attackerAdapter],
            city.factionId,
            defenderUnits, // Use the list with reinforcements
            siegeData.result
        );

        // [NEW] 关隘防御加成 (大幅减伤)
        if (city.type === 'pass') {
            battleField.setDefenderDamageMultiplier(GameConfig.SIEGE.PASS_DEFENSE_MULTIPLIER);
        }

        this.activeSieges.set(city.id, battleField);
        // [FIX] Play visual effect
        this.cityManager.playSiegeEffect(city.id);
    }

    private rallyDefenders(city: any, attackerArmy: Army, defenderUnits: IBattleUnit[]): void {
        // 扫描城市周围 1 格内的所有友军，直接拉入战斗防御方
        const cityPos = { lat: city.latitude, lng: city.longitude };
        const reinforcements = this.legionManager.getArmiesInRadius(cityPos, DISTANCE_THRESHOLDS.REINFORCEMENT_RANGE);

        reinforcements.forEach(ally => {
            // 1. Must be same faction
            if (ally.getFactionId() !== city.factionId) return;
            // 2. Must be idle (not already fighting)
            if (ally.getIsInCombat()) return;
            // 3. Must not be the attacker (unlikely but safe)
            if (ally.id === attackerArmy.id) return;
            // 4. Must not be blocked (maybe? actually if they are blocked by this siege, they SHOULD join)

            console.log(`🛡️ [SiegeManager] Reinforcement Rallied: ${ally.name} joins defense of ${city.name}!`);

            // Create Adapter for Ally
            const allyAdapter = BattleUnitFactory.createAdapter(
                ally.id,
                ally.name || 'Reinforcement',
                ally.getFactionId(),
                ally,
                'legion', // reinforcements are legions
                ally.getTroops(),
                () => { ally.setCombatState(false); }
            );

            // Add to defender list
            defenderUnits.push(allyAdapter);

            // Set Ally State
            ally.setCombatState(true);
            ally.stopMovement();
            // Optional: Teleport ally to city center? 
            // - No, keep them where they are visually (surrounding the city).
            // - But logically they are in the battle.
        });
    }

    private alignArmyToCity(army: Army, targetCity: any) {
        const cityHex = GridSystem.latLngToAxial(targetCity.latitude, targetCity.longitude);
        const armyPos = army.getPosition();
        const armyHex = GridSystem.latLngToAxial(armyPos.lat, armyPos.lng);
        const adjacentHexes = GridSystem.getNeighborAxialCoords(cityHex.q, cityHex.r);

        const isAdjacent = adjacentHexes.some(h => h.q === armyHex.q && h.r === armyHex.r);

        if (isAdjacent) {
            const center = GridSystem.axialToLatLng(armyHex.q, armyHex.r);
            army.setPosition(center.lat, center.lng);
            army.lastDirection = OrientationSystem.get8DirectionIndex(center, { lat: targetCity.latitude, lng: targetCity.longitude });
        } else {
            // Force snap to nearest valid if not adjacent (Fail-safe)
            // Logic omitted for brevity as standard movement handles this usually.
            // Leaving as-is is safer than unverified teleport logic.
        }
    }








    /**
     * 获取城市的活跃战场 (可用于外部查询)
     */
    public getActiveSiege(cityId: string): BattleField | undefined {
        const battle = this.activeSieges.get(cityId);
        return battle && !battle.isOver ? battle : undefined;
    }


}
