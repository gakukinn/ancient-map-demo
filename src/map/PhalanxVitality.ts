
export class PhalanxVitality {
    /**
     * Calculates the staggered animation frame index for a soldier.
     */
    public static getFrameIndex(
        baseFrame: number,
        frameCount: number,
        seed: number,
        row: number,
        col: number
    ): number {
        const slotSeed = (seed + row * 11 + col * 7) % 1000;
        const stagger = Math.floor(slotSeed / 200); // 0-4 frames offset
        return (baseFrame + stagger) % frameCount;
    }

    /**
     * Calculates the breathing scale for the entire formation.
     */
    public static getBreathingScale(
        tick: number,
        isFighting: boolean,
        state: string
    ): number {
        // Breathing Settings
        // Factor 200 => Period = ~1.25 seconds (1256ms)
        const frequencyFactor = 400;
        const amplitude = 0.01;

        return 1.0 + Math.sin(tick / frequencyFactor) * amplitude;
        return 1.0;
    }

    /**
     * Determines if a soldier is in the "Frontline" based on formation direction.
     * Frontline = Soldiers visually closest to the enemy (Anchor).
     * 
     * MAPPING FIX: Matches PhalanxDrawer visual mapping:
     * 0(S)->Visual NE, 1(SW)->Visual E, 2(W)->Visual SE, 3(NW)->Visual S
     * 4(N)->Visual SW, 5(NE)->Visual W, 6(E)->Visual NW, 7(SE)->Visual N
     */
    public static isFrontlineSoldier(
        row: number,
        col: number,
        direction: number,
        maxRows: number,
        maxCols: number
    ): boolean {
        // Depth = 1 is usually enough for "Front Row Only"
        const depth = 1;

        const lastRow = maxRows - 1;
        const lastCol = maxCols - 1;

        switch (direction) {
            case 0: // Code S -> Visual NE (Front: Top & Right)
                return row < depth || col >= lastCol - (depth - 1);
            case 1: // Code SW -> Visual E (Front: Right)
                return col >= lastCol - (depth - 1);
            case 2: // Code W -> Visual SE (Front: Bottom & Right)
                return row >= lastRow - (depth - 1) || col >= lastCol - (depth - 1);
            case 3: // Code NW -> Visual S (Front: Bottom)
                return row >= lastRow - (depth - 1);
            case 4: // Code N -> Visual SW (Front: Bottom & Left)
                return row >= lastRow - (depth - 1) || col < depth;
            case 5: // Code NE -> Visual W (Front: Left)
                return col < depth;
            case 6: // Code E -> Visual NW (Front: Top & Left)
                return row < depth || col < depth;
            case 7: // Code SE -> Visual N (Front: Top)
                return row < depth;
        }
        return false;
    }

    /**
     * Calculates individual soldier undulation (wave effect) without random shaking.
     */
    public static getIndividualUndulation(
        tick: number,
        seed: number,
        row: number,
        col: number,
        width: number,
        height: number
    ): { x: number, y: number } {
        const slotSeed = (seed + row * 11 + col * 7) % 1000;
        // Low-frequency sine wave (Undulation)
        // No Random Math.random() here!
        const x = Math.sin(tick / 300 + slotSeed) * (width * 0.02);
        const y = Math.cos(tick / 300 + slotSeed) * (height * 0.02);
        return { x, y };
    }
}
