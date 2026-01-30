
export interface PlayerSlotInfo {
    state: 'ALIVE' | 'DYING' | 'DEAD';
    stateStartTime: number;
    deathDirection?: number; // 0-7
    deadOffsetX?: number;
    deadOffsetY?: number;
    deadLat?: number;
    deadLng?: number;
}

export interface PlayerUnitState {
    slots: PlayerSlotInfo[];
    maxTroops: number;
    lastTroops: number;
    rows: number; // [NEW] Square Grid
    cols: number; // [NEW] Square Grid
    vitalitySeed: number;
    isFighting: boolean;
}

/**
 * Manages state for PLAYER units only.
 * Simplified: No Archers, No Mixed Types.
 */
export class PlayerPhalanxStateManager {
    private static states: Map<string, PlayerUnitState> = new Map();

    public static getState(unitId: string): PlayerUnitState | undefined {
        return this.states.get(unitId);
    }

    public static reset(unitId: string) {
        this.states.delete(unitId);
    }

    public static update(
        unitId: string,
        troops: number,
        rows: number,
        cols: number,
        count: number,
        direction: number, // Unused for Type, but kept for signature consistency if needed
        tick: number,
        isFighting: boolean,
        center?: { x: number, y: number },
        unprojectFn?: (x: number, y: number) => { lat: number, lng: number },
        getOffsetFn?: (index: number) => { x: number, y: number }
    ): PlayerUnitState {
        let state = this.states.get(unitId);

        // 1. Initialization
        if (!state) {
            const slots: PlayerSlotInfo[] = [];
            for (let i = 0; i < count; i++) {
                slots.push({ state: 'ALIVE', stateStartTime: tick });
            }
            state = {
                slots,
                maxTroops: troops,
                lastTroops: troops,
                rows: rows,
                cols: cols,
                vitalitySeed: Math.floor(Math.random() * 1000),
                isFighting: isFighting
            };
            this.states.set(unitId, state);
            return state;
        }

        // Check Resize
        if (state.rows !== rows || state.cols !== cols) {
            state.rows = rows;
            state.cols = cols;
            // Regenerate
            state.slots = [];
            for (let i = 0; i < count; i++) {
                state.slots.push({ state: 'ALIVE', stateStartTime: tick });
            }
            state.lastTroops = troops;
            state.maxTroops = troops;
            return state;
        }

        // 2. Combat Locking Logic
        if (isFighting && !state.isFighting) {
            state.isFighting = true;
            state.maxTroops = troops;
        } else if (!isFighting && state.isFighting) {
            state.isFighting = false;
        }

        // 3. Erosion Logic (Kill Slots)
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
                candidates.sort((a, b) => b - a); // High to Low

                for (let i = 0; i < candidates.length && killNeeded > 0; i++) {
                    const idx = candidates[i];
                    const slot = state.slots[idx];
                    slot.state = 'DYING';
                    slot.stateStartTime = tick;
                    slot.deathDirection = Math.floor(Math.random() * 8); // Simple random direction

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

    // Check if slot is visual frontline (for animation)
    public static isVisualFrontline(state: PlayerUnitState, index: number, direction: number): boolean {
        // [SIMPLIFIED] Outer 30% are frontline
        const total = state.slots.length;
        return index > total * 0.6;
    }
}
