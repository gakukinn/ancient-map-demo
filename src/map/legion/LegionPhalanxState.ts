import { LegionLayoutSystem } from './LegionLayoutSystem';

export interface LegionSlotInfo {
    state: 'ALIVE' | 'DYING' | 'DEAD';
    stateStartTime: number;
    type: 'infantry' | 'archer';
    deathDirection?: number;
    deadOffsetX?: number;
    deadOffsetY?: number;
    deadLat?: number;
    deadLng?: number;
}

export interface LegionUnitState {
    slots: LegionSlotInfo[];
    maxTroops: number;
    lastTroops: number;
    rows: number; // [NEW] Square Grid
    cols: number; // [NEW] Square Grid
    vitalitySeed: number;
    isFighting: boolean;
    lastDirection: number;
    decayStartTime?: number; // [NEW] Time when entire army was defeated (0 troops)
}

/**
 * Manages state for AI LEGIONS.
 * Features: Mixed Formation (Infantry Front / Archer Rear).
 */
export class LegionPhalanxStateManager {
    private static states: Map<string, LegionUnitState> = new Map();

    public static getState(unitId: string): LegionUnitState | undefined {
        return this.states.get(unitId);
    }

    public static reset(unitId: string) {
        this.states.delete(unitId);
    }

    /**
     * Recalculates unit types (Infantry vs Archer).
     * Rule: Low Index (Center) = Archers. High Index (Outer) = Infantry.
     */
    private static recalculateTypes(state: LegionUnitState, totalCount: number) {
        // Inner 30% are archers (Protected in center)
        const archerCount = Math.floor(totalCount * 0.3);

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
        rows: number,
        cols: number,
        count: number,
        direction: number,
        tick: number,
        isFighting: boolean,
        center?: { x: number, y: number },
        unprojectFn?: (x: number, y: number) => { lat: number, lng: number },
        // [OPTIMIZATION] Pass Layout Params directly instead of Callback Closure
        spacingX: number = 0,
        spacingY: number = 0,
        legionType: any = 'infantry'
    ): LegionUnitState {
        let state = this.states.get(unitId);

        if (!state) {
            const slots: LegionSlotInfo[] = [];
            for (let i = 0; i < count; i++) {
                slots.push({ state: 'ALIVE', stateStartTime: tick, type: 'infantry' });
            }
            state = {
                slots,
                maxTroops: troops,
                lastTroops: troops,
                rows: rows,
                cols: cols,
                vitalitySeed: Math.floor(Math.random() * 1000),
                isFighting: isFighting,
                lastDirection: direction
            };
            this.states.set(unitId, state);
            this.recalculateTypes(state, count);
            return state;
        }

        // Check Resize
        if (state.rows !== rows || state.cols !== cols) {
            state.rows = rows;
            state.cols = cols;
            // Regenerate
            state.slots = [];
            for (let i = 0; i < count; i++) {
                state.slots.push({ state: 'ALIVE', stateStartTime: tick, type: 'infantry' });
            }
            state.lastTroops = troops;
            state.maxTroops = troops;
            state.lastDirection = direction;
            this.recalculateTypes(state, count);
            return state;
        }

        if (state.lastDirection !== direction) {
            state.lastDirection = direction;
        }

        if (isFighting && !state.isFighting) {
            state.isFighting = true;
            state.maxTroops = troops;
        } else if (!isFighting && state.isFighting) {
            state.isFighting = false;
        }

        // Erosion Logic
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
                const candidates: number[] = [];
                state.slots.forEach((s, i) => {
                    if (s.state === 'ALIVE') candidates.push(i);
                });
                // [USER REQUEST] Randomize casualties instead of outer ring first
                // candidates.sort((a, b) => b - a); // OLD: High to Low (Outer Ring)
                candidates.sort(() => Math.random() - 0.5); // NEW: Random Shuffle

                for (let i = 0; i < candidates.length && killNeeded > 0; i++) {
                    const idx = candidates[i];
                    const slot = state.slots[idx];
                    slot.state = 'DYING';
                    slot.stateStartTime = tick;
                    slot.deathDirection = Math.floor(Math.random() * 8); // Random death dir

                    // [OPTIMIZATION] Direct Call
                    const offset = LegionLayoutSystem.getFormationOffset(idx, spacingX, spacingY, direction, legionType);
                    slot.deadOffsetX = offset.x; // Value copy
                    slot.deadOffsetY = offset.y;

                    if (center && unprojectFn) {
                        const world = unprojectFn(center.x + offset.x, center.y + offset.y);
                        slot.deadLat = world.lat;
                        slot.deadLng = world.lng;
                    }

                    killNeeded--;
                }
            }
        }

        if (troops <= 0) {
            // [DEFEAT LOGIC] Start 15s decay timer
            if (!state.decayStartTime) {
                state.decayStartTime = tick;
                // Force kill all remaining alive slots immediately
                state.slots.forEach((s, idx) => {
                    if (s.state === 'ALIVE') {
                        s.state = 'DYING';
                        s.stateStartTime = tick + (Math.random() * 500); // Slight stagger
                        s.deathDirection = Math.floor(Math.random() * 8);

                        // [OPTIMIZATION] Direct Call
                        const offset = LegionLayoutSystem.getFormationOffset(idx, spacingX, spacingY, direction, legionType);
                        s.deadOffsetX = offset.x;
                        s.deadOffsetY = offset.y;

                        if (center && unprojectFn) {
                            const world = unprojectFn(center.x + offset.x, center.y + offset.y);
                            s.deadLat = world.lat;
                            s.deadLng = world.lng;
                        }
                    }
                });
            }
        } else {
            state.decayStartTime = undefined; // Reset if resurrected
        }

        state.lastTroops = troops;
        return state;
    }

    public static isVisualFrontline(state: LegionUnitState, index: number, direction: number): boolean {
        // [SIMPLIFIED] Outer 30% are frontline
        const total = state.slots.length;
        return index > total * 0.6;
    }
}
