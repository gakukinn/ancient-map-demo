
import { Army } from './Army';
import { SpatialRegistry } from './SpatialRegistry';
import { GridSystem } from '../systems/GridSystem';
import { CombatSystem } from './CombatSystem';
import { BattleUnitFactory } from './BattleUnitFactory';
import { SiegeManager } from './SiegeManager';
import { BattleField } from './BattleField';
import { FACTIONS } from '../data/factions';

/**
 * ContactEngine
 * 
 * Handles "Contact Engagement" logic.
 * When armies move into hexes adjacent to enemy armies, battles are triggered.
 */
export class ContactEngine {
    private spatialRegistry: SpatialRegistry;
    private combatSystem: CombatSystem;
    private siegeManager?: SiegeManager;

    // Track ongoing engagements to prevent duplicate triggers
    private activeEngagements: Set<string> = new Set();

    constructor(spatialRegistry: SpatialRegistry, combatSystem: CombatSystem, siegeManager?: SiegeManager) {
        this.spatialRegistry = spatialRegistry;
        this.combatSystem = combatSystem;
        this.siegeManager = siegeManager;
    }

    public setSiegeManager(siegeManager: SiegeManager): void {
        this.siegeManager = siegeManager;
    }

    /**
     * Check if an army should engage enemies after moving.
     */
    // [OPTIMIZATION] Static neighbor offsets to avoid allocation
    private static readonly NEIGHBOR_OFFSETS = [
        { q: 1, r: 0 },   // East
        { q: 0, r: 1 },   // South-East
        { q: -1, r: 1 },  // South-West
        { q: -1, r: 0 },  // West
        { q: 0, r: -1 },  // North-West
        { q: 1, r: -1 }   // North-East
    ];

    /**
     * Check if an army should engage enemies after moving.
     * [OPTIMIZATION] Zero-Allocation Implementation
     */
    public checkEngagement(army: Army): boolean {
        // 1. Fast Checks
        if (army.isDestroyed || army.getIsInCombat()) return false;

        const pos = army.getRawPosition(); // Use raw position (no clone)
        const currentHex = GridSystem.latLngToAxial(pos.lat, pos.lng);

        const offsets = ContactEngine.NEIGHBOR_OFFSETS;
        let engaged = false;

        // 2. Unrolled Loop (No Closures, No Callbacks)
        for (let i = 0; i < 6; i++) {
            const offset = offsets[i];
            const nq = currentHex.q + offset.q;
            const nr = currentHex.r + offset.r;

            // --- Logic Copied from previous callback ---

            // A. Check for Hostile Armies
            const occupier = this.spatialRegistry.getArmyAt(nq, nr);

            if (occupier && !occupier.isDestroyed) {
                if (occupier.getIsInCombat()) {
                    // Check reinforcements
                    const nearbyBattle = this.combatSystem.findBattleFieldNear(occupier.getPosition());
                    if (nearbyBattle) {
                        const armyFaction = army.getFactionId();
                        const isAttacker = nearbyBattle.getAttackerFaction() === armyFaction;
                        const isDefender = nearbyBattle.getDefenderUnits().some(u => u.factionId === armyFaction);

                        if (isAttacker || isDefender) {
                            console.log(`📯 [ContactEngine] ${army.name} joining ongoing battle!`);

                            const adapter = BattleUnitFactory.createAdapter(
                                army.id, army.name || 'Reinforcement', armyFaction, army, 'legion', army.getTroops(),
                                () => { army.setCombatState(false); }
                            );

                            nearbyBattle.addReinforcement(adapter, isAttacker);
                            army.stopMovement(true);
                            engaged = true;
                            break; // Stop checking other neighbors
                        }
                    }
                    continue; // Skip to next neighbor
                }

                if (this.isHostile(army, occupier)) {
                    // [OPTIMIZATION] Fast check key without full string alloc?
                    // activeEngagements uses string key. We must alloc string here.
                    // But only if hostile.
                    if (this.activeEngagements.has(this.getEngagementKey(army, occupier))) continue;

                    console.log(`⚔️ [ContactEngine] ${army.name} contacts ${occupier.name}!`);
                    this.startContactBattle(army, occupier);
                    engaged = true;
                    break;
                }
            }

            // B. Check for Hostile Strongholds (ZOC)
            const cityFaction = this.spatialRegistry.getCityFaction(nq, nr);
            if (cityFaction && cityFaction !== army.getFactionId() && cityFaction !== 'neutral') {
                const targetCity = army.getTargetCity();
                if (targetCity) {
                    const targetHex = GridSystem.latLngToAxial(targetCity.latitude, targetCity.longitude);
                    if (nq === targetHex.q && nr === targetHex.r) {
                        continue; // Let onArrive handle it
                    }
                }

                // Normal ZOC Interception
                console.log(`🛑 [ContactEngine] ${army.name} intercepted by Stronghold!`);
                army.stopMovement(true);

                if (this.siegeManager) {
                    this.siegeManager.triggerSiegeAtHex(army, nq, nr);
                } else {
                    army.setBlocked();
                }

                engaged = true;
                break;
            }
        } // End Loop

        return engaged;
    }

    private startContactBattle(attacker: Army, defender: Army): void {
        const engagementKey = this.getEngagementKey(attacker, defender);
        this.activeEngagements.add(engagementKey);

        attacker.setCombatState(true);
        defender.setCombatState(true);
        attacker.stopMovement(true);
        defender.stopMovement(true);

        const attackerAdapter = BattleUnitFactory.createAdapter(
            attacker.id, attacker.name || 'Attacker', attacker.getFactionId(), attacker, 'legion', attacker.getTroops(),
            () => this.onBattleEnd(attacker, defender, 'attacker_win'),
            () => this.onBattleEnd(attacker, defender, 'defender_win')
        );

        const defenderAdapter = BattleUnitFactory.createAdapter(
            defender.id, defender.name || 'Defender', defender.getFactionId(), defender, 'legion', defender.getTroops(),
            () => this.onBattleEnd(attacker, defender, 'defender_win'),
            () => this.onBattleEnd(attacker, defender, 'attacker_win')
        );

        this.combatSystem.startBattle(attackerAdapter, defenderAdapter);

        // [AUTO-CHRONICLE] Field Battle Log (DISABLED: Too spammy)
        // window.dispatchEvent(new CustomEvent('chronicle-log', {
        //     detail: { 
        //         type: 'field_battle', 
        //         description: `[野战] <span style="color:${attacker.getFactionId() === 'qin' ? '#ff0000' : '#ffff00'}">${attacker.name}</span> 遭遇了 <span style="color:#ffffff">${defender.name}</span>！` 
        //     }
        // }));
    }

    private onBattleEnd(attacker: Army, defender: Army, result: string): void {
        const engagementKey = this.getEngagementKey(attacker, defender);

        // [FIX] Prevent duplicate calls (e.g. from simultaneous callback triggers)
        if (!this.activeEngagements.has(engagementKey)) return;

        this.activeEngagements.delete(engagementKey);

        const winner = result === 'attacker_win' ? attacker : defender;
        const loser = result === 'attacker_win' ? defender : attacker;

        console.log(`🏁 [ContactEngine] Winner: ${winner.name}`);

        if (!winner.isDestroyed) {
            // [WAIT LOGIC] 2 Seconds Freeze
            // Keep combat state TRUE for 2 seconds so nothing else touches it
            setTimeout(() => {
                if (!winner.isDestroyed) {
                    winner.setCombatState(false);
                }
            }, 2000);
        }

        if (loser.isDestroyed) {
            // [AUTO-CHRONICLE] Field Annhilation Log
            const winnerFaction = FACTIONS.find(f => f.id === winner.getFactionId());
            const winnerName = winnerFaction ? winnerFaction.name : winner.getFactionId();

            const loserFaction = FACTIONS.find(f => f.id === loser.getFactionId());
            const loserName = loserFaction ? loserFaction.name : loser.getFactionId();

            window.dispatchEvent(new CustomEvent('chronicle-log', {
                detail: {
                    type: 'field_battle',
                    description: `<span style="font-size: 0.85em;">${winnerName}军全歼${loserName}军</span>`
                }
            }));

            loser.destroy(); // Ensure destruction
            return;
        }

        // Retreat Logic Removed (Loser is destroyed by BattleField)
        if (!winner.isDestroyed) {
            winner.setCombatState(false);
        }
    }

    private isHostile(a: Army, b: Army): boolean {
        return a.getFactionId() !== b.getFactionId();
    }

    private getEngagementKey(a: Army, b: Army): string {
        const ids = [a.id, b.id].sort();
        return `${ids[0]}_vs_${ids[1]}`;
    }

    public reset(): void {
        this.activeEngagements.clear();
    }
}
