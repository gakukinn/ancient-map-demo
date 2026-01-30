export type SlotState = 'ALIVE' | 'DYING' | 'DEAD';

export interface SlotInfo {
    state: SlotState;
    type: 'infantry' | 'archer';
    stateStartTime: number;
    deadOffsetX?: number;
    deadOffsetY?: number;
    deadLat?: number;
    deadLng?: number;
    deathDirection?: number;
}

export interface UnitState {
    slots: SlotInfo[];
    maxTroops: number;
    lastTroops: number;
    radius: number; // [NEW] Hex Radius
    vitalitySeed: number;
    isFighting: boolean;
    lastDirection: number;
}

export class PhalanxStateManager {
    private static states: Map<string, UnitState> = new Map();

    public static getState(unitId: string): UnitState | undefined {
        return this.states.get(unitId);
    }

    public static reset(unitId: string) {
        this.states.delete(unitId);
    }

    /**
     * Re-calculates unit types (Infantry vs Archer).
     * Rule: Low Index (Center) = Archers. High Index (Outer) = Infantry.
     */
    private static recalculateTypes(state: UnitState, totalCount: number) {
        // Simple logic: Inner 30% are archers?
        // Or if Radius > 2, Ring 0 and 1 are Archers?

        // For now, let's keep it simple: No specialized per-soldier type logic based on direction.
        // Just Center = Archers.
        const archerCount = Math.floor(totalCount * 0.3); // 30% Archers

        state.slots.forEach((slot, index) => {
            if (index < archerCount) {
                slot.type = 'archer';
            } else {
                slot.type = 'infantry';
            }
        });
    }

    public static update(
        unitId: string,
        troops: number,
        radius: number, // [NEW] Input is Radius
        count: number,  // [NEW] Input is Count
        direction: number,
        tick: number,
        isFighting: boolean,
        center?: { x: number, y: number },
        unprojectFn?: (x: number, y: number) => { lat: number, lng: number },
        // Helper to calc offsets for dead bodies
        getOffsetFn?: (index: number) => { x: number, y: number }
    ): UnitState {
        let state = this.states.get(unitId);

        // 1. Initialization
        if (!state) {
            const slots: SlotInfo[] = [];
            for (let i = 0; i < count; i++) {
                slots.push({ state: 'ALIVE', stateStartTime: tick, type: 'infantry' });
            }
            state = {
                slots,
                maxTroops: troops,
                lastTroops: troops,
                radius: radius,
                vitalitySeed: Math.floor(Math.random() * 1000),
                isFighting: isFighting,
                lastDirection: direction
            };
            this.states.set(unitId, state);
            this.recalculateTypes(state, count);
            return state;
        }

        // Check Resize
        if (state.radius !== radius) {
            state.radius = radius;
            // Regenerate
            state.slots = [];
            for (let i = 0; i < count; i++) {
                state.slots.push({ state: 'ALIVE', stateStartTime: tick, type: 'infantry' });
            }
            state.lastTroops = troops;
            state.maxTroops = troops;
            this.recalculateTypes(state, count);
            return state;
        }

        // Combat State Toggle
        if (isFighting && !state.isFighting) {
            state.isFighting = true;
            state.maxTroops = troops;
        } else if (!isFighting && state.isFighting) {
            state.isFighting = false;
        }

        // 3. Erosion Logic
        if (state.isFighting && troops < state.lastTroops) {
            const healthRatio = Math.max(0, troops / Math.max(1, state.maxTroops));
            const totalSlots = state.slots.length;
            const targetAlive = Math.ceil(totalSlots * healthRatio);

            let currentAlive = 0;
            state.slots.forEach(s => { if (s.state === 'ALIVE') currentAlive++; });

            let killNeeded = currentAlive - targetAlive;
            const frameCap = Math.max(1, Math.floor(totalSlots * 0.05));
            if (killNeeded > frameCap) killNeeded = frameCap;

            if (killNeeded > 0) {
                // Kill Outer Ring First (High Index)
                // Filter ALIVE and sort by Index Descending
                const candidates: number[] = [];
                state.slots.forEach((s, i) => {
                    if (s.state === 'ALIVE') candidates.push(i);
                });
                candidates.sort((a, b) => b - a); // High to Low

                for (let i = 0; i < candidates.length && killNeeded > 0; i++) {
                    const idx = candidates[i];
                    const slot = state.slots[idx];
                    slot.state = 'DYING';
                    slot.stateStartTime = tick;
                    slot.deathDirection = Math.floor(Math.random() * 8);

                    // Freeze Position using callbacks
                    if (getOffsetFn) {
                        const offset = getOffsetFn(idx);
                        slot.deadOffsetX = offset.x;
                        slot.deadOffsetY = offset.y;
                        if (center && unprojectFn) {
                            const world = unprojectFn(center.x + offset.x, center.y + offset.y);
                            slot.deadLat = world.lat;
                            slot.deadLng = world.lng;
                        }
                    }
                    killNeeded--;
                }
            }
        }

        state.lastTroops = troops;
        return state;
    }

    public static isVisualFrontline(state: UnitState, index: number, direction: number): boolean {
        // [SIMPLIFIED] For Spiral, anyone in the outer 30% of indices is "Front"
        // Or strictly based on Ring calculation?
        // Let's assume High Index = Front/Outer
        const total = state.slots.length;
        return index > total * 0.6;
    }
}
