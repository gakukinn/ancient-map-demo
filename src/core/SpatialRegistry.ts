import { Army } from './Army';

/**
 * SpatialRegistry
 * 
 * Manages the "Physics" of the strategy map.
 * Enforces:
 * 1. One Unit Per Hex (Unit Collision)
 * 2. Spatial Indexing (O(1) lookup for interactions)
 * 3. City Blocking (Cities occupy hexes as static obstacles)
 * 
 * [OPTIMIZATION] Uses 32-bit integer keys ((q << 16) | (r & 0xFFFF)) instead of strings.
 */
export class SpatialRegistry {
    // Key: (q << 16) | (r & 0xFFFF)
    private occupancy: Map<number, Army> = new Map();
    private cityHexes: Map<number, { id: string, factionId: string }> = new Map();

    private static instance: SpatialRegistry;

    public static getInstance(): SpatialRegistry {
        if (!SpatialRegistry.instance) {
            SpatialRegistry.instance = new SpatialRegistry();
        }
        return SpatialRegistry.instance;
    }

    /**
     * Converts Axial coordinates q,r to a unique 32-bit integer key.
     * Supports negative coordinates via 16-bit masking.
     */
    public static getSpatialKey(q: number, r: number): number {
        return (q << 16) | (r & 0xFFFF);
    }

    /**
     * Decodes key back to q,r.
     */
    public static getCoordsFromKey(key: number): { q: number, r: number } {
        const r = (key & 0xFFFF) << 16 >> 16; // Sign extend
        const q = key >> 16;
        return { q, r };
    }

    public clear(): void {
        this.occupancy.clear();
    }

    public clearCityRegistry(): void {
        this.cityHexes.clear();
        console.log('[SpatialRegistry] Cleared city registry.');
    }

    public registerCity(q: number, r: number, factionId: string, cityId: string): void {
        const key = SpatialRegistry.getSpatialKey(q, r);
        this.cityHexes.set(key, { id: cityId, factionId: factionId });
    }

    public isCityHex(q: number, r: number): boolean {
        return this.cityHexes.has(SpatialRegistry.getSpatialKey(q, r));
    }

    public getCityFaction(q: number, r: number): string | null {
        const city = this.cityHexes.get(SpatialRegistry.getSpatialKey(q, r));
        return city ? city.factionId : null;
    }

    public getCityId(q: number, r: number): string | null {
        const city = this.cityHexes.get(SpatialRegistry.getSpatialKey(q, r));
        return city ? city.id : null;
    }

    public isBlocked(q: number, r: number): boolean {
        const key = SpatialRegistry.getSpatialKey(q, r);
        return this.cityHexes.has(key) || this.occupancy.has(key);
    }

    public register(army: Army, q: number, r: number): boolean {
        const key = SpatialRegistry.getSpatialKey(q, r);

        if (this.cityHexes.has(key)) {
            const city = this.cityHexes.get(key);
            // Allow Friendly City (Pass-through/Garrison)
            if (city && army.getFactionId() === city.factionId) {
                // OK
            } else {
                return false;
            }
        }

        if (this.occupancy.has(key)) {
            const occupier = this.occupancy.get(key);
            if (occupier && occupier !== army && !occupier.isDestroyed) {
                return false;
            }
        }

        this.occupancy.set(key, army);
        return true;
    }

    public unregister(army: Army, q: number, r: number): void {
        const key = SpatialRegistry.getSpatialKey(q, r);
        if (this.occupancy.get(key) === army) {
            this.occupancy.delete(key);
        }
    }

    public move(army: Army, oldQ: number, oldR: number, newQ: number, newR: number, ignoreCityCollision: boolean = false, ignoreUnitCollision: boolean = false): boolean {
        if (oldQ === newQ && oldR === newR) return true;

        const newKey = SpatialRegistry.getSpatialKey(newQ, newR);

        // 1. Check City Block
        if (!ignoreCityCollision && this.cityHexes.has(newKey)) {
            const city = this.cityHexes.get(newKey);
            if (!city || city.factionId !== army.getFactionId()) {
                return false;
            }
        }

        // 2. Check Army Block
        // [FIX] Allow bypassing unit physics if ignoreUnitCollision is true
        if (!ignoreUnitCollision && this.occupancy.has(newKey)) {
            const occupier = this.occupancy.get(newKey);
            if (occupier && occupier !== army && !occupier.isDestroyed) {
                return false;
            }
        }

        // 3. Commit
        // Note: We unregister from OLD key.
        const oldKey = SpatialRegistry.getSpatialKey(oldQ, oldR);
        if (this.occupancy.get(oldKey) === army) {
            this.occupancy.delete(oldKey);
        }

        this.occupancy.set(newKey, army);
        return true;
    }

    public getArmyAt(q: number, r: number): Army | undefined {
        return this.occupancy.get(SpatialRegistry.getSpatialKey(q, r));
    }

    public isOccupied(q: number, r: number): boolean {
        return this.occupancy.has(SpatialRegistry.getSpatialKey(q, r));
    }

    public getAllOccupiedKeys(): number[] {
        return Array.from(this.occupancy.keys());
    }

    public getAllCityHexes(): number[] {
        return Array.from(this.cityHexes.keys());
    }

    public debugPrint(): void {
        console.log(`[SpatialRegistry] Tracking ${this.occupancy.size} units, ${this.cityHexes.size} city hexes.`);
    }
}
