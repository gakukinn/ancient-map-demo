import { Faction } from '../types/core';
import { GameConfig } from '../config/GameConfig';
import { getMinGarrison } from '../config/CityConfig';
import type { CityManager } from './CityManager';

export class FactionManager {
    private factions: Map<string, Faction> = new Map();

    public addFaction(faction: Faction): void {
        this.factions.set(faction.id, faction);
    }

    public getFaction(id: string): Faction | undefined {
        return this.factions.get(id);
    }

    public getFactionColor(id: string): string {
        const faction = this.factions.get(id);
        return faction ? faction.color : '#999999'; // Default grey
    }

    public getFactions(): Faction[] {
        return Array.from(this.factions.values());
    }

    // ==================== Capital Management ====================

    public setCapital(factionId: string, cityId: string): void {
        const faction = this.factions.get(factionId);
        if (faction) {
            faction.capitalCityId = cityId;
        }
    }

    public getCapital(factionId: string): string | undefined {
        return this.factions.get(factionId)?.capitalCityId;
    }

    // ==================== Main Legion Management ====================

    public setMainLegion(factionId: string, legionId: string): void {
        const faction = this.factions.get(factionId);
        if (faction) {
            faction.mainLegionId = legionId;
        }
    }

    public getMainLegion(factionId: string): string | undefined {
        return this.factions.get(factionId)?.mainLegionId;
    }

    public clearMainLegion(factionId: string): void {
        const faction = this.factions.get(factionId);
        if (faction) {
            faction.mainLegionId = undefined;
        }
    }

    // ==================== Troop Mobilization ====================

    /**
     * Attempts to mobilize troops from all cities of a faction.
     * Deducts troops evenly from available surplus (troops - MIN_GARRISON).
     * @param factionId The faction mobilizing
     * @param requestedAmount Desired troop count
     * @param cityManager Reference to CityManager to access/update cities
     * @returns The actual amount of troops mobilized (0 if failed)
     */
    public mobilizeTroops(factionId: string, requestedAmount: number, cityManager: CityManager): number {
        // [FIX] Explicit type for cityManager
        const cities = cityManager.getCitiesByFaction(factionId);
        if (cities.length === 0) return 0;

        // 1. Calculate Total Surplus
        const MIN_SORTIE = GameConfig.LEGION.MIN_TROOPS;
        const MAX_SORTIE = GameConfig.LEGION.MAX_TROOPS;

        let totalSurplus = 0;
        cities.forEach((c: any) => {
            // Calculate minimum garrison based on city type (10% of maxTroops)
            const minGarrison = getMinGarrison(c.type);
            const surplus = Math.max(0, (c.troops || 0) - minGarrison);
            totalSurplus += surplus;
        });

        if (totalSurplus < MIN_SORTIE) {
            // [LOG REDUCTION] Too noisy
            // console.warn(`[FactionManager] Mobilization Failed for ${factionId}: Insufficient surplus (${totalSurplus} < ${MIN_SORTIE})`);
            return 0;
        }

        // 2. Determine Actual Amount
        const actualAmount = Math.min(requestedAmount, totalSurplus, MAX_SORTIE);

        // 3. Deduct Troops (Iterative/Proportional)
        // Simple strategy: Deduct proportionally to surplus to be fair? 
        // User requested "Average" (Average from all cities). 
        // But if we deduct Average `C/N`, small cities might break MIN_GARRISON.
        // So we interpret "Average" as "Shared Burden".

        let remainingToDeduct = actualAmount;

        // Round 1: Try deduct evenly
        let deductPerCity = Math.ceil(remainingToDeduct / cities.length);

        // We might need a more robust generic distribution, but for now:
        // Let's just deduct proportionally to *surplus*? 
        // "From all cities average deduction" -> implies they pay equal amount if possible.
        // Let's do a multi-pass approach.

        // Pass 1: Calculate "Ideal Average"
        // If City A has 1000 surplus, City B has 90000 surplus. Target 10000.
        // Average = 5000. City A can only pay 1000. Deficit 4000 passed to B.

        // Sort cities by surplus (ascending) to handle poor cities first? 
        // No, handling poor cities first ensures we cap them and pass debt to rich ones.

        const citiesWithSurplus = cities.map((c: any) => {
            const minGarrison = getMinGarrison(c.type);
            return {
                city: c,
                surplus: Math.max(0, (c.troops || 0) - minGarrison)
            };
        }).sort((a: any, b: any) => a.surplus - b.surplus);

        let activeContributors = citiesWithSurplus.length;

        for (const entry of citiesWithSurplus) {
            if (remainingToDeduct <= 0) break;

            // How much should this city pay? 
            // Ideally: remaining / activeContributors
            const fairShare = Math.ceil(remainingToDeduct / activeContributors);

            // Can it pay?
            const contribution = Math.min(entry.surplus, fairShare);

            // Deduct
            entry.city.troops -= contribution;
            remainingToDeduct -= contribution;

            // This city is processed for this round (effectively it paid what it could)
            activeContributors--;
        }

        console.log(`[FactionManager] Mobilized ${actualAmount} troops for ${factionId} from ${cities.length} cities.`);
        return actualAmount;
    }
}
