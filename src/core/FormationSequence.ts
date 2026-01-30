/**
 * FormationSequence
 * -----------------
 * Generates and manages the "Perfect Formation" sequence.
 * 
 * Sequence Rule:
 * We alternate between Perfect Squares (n*n) and Perfect Rectangles (n*(n+1)).
 * 
 * 1 (1x1)
 * 2 (1x2)
 * 4 (2x2)
 * 6 (2x3)
 * 9 (3x3)
 * 12 (3x4)
 * 16 (4x4)
 * 20 (4x5)
 * ...
 * 
 * This ensures every formation has complete rows/cols, eliminating "jagged" edges.
 */
export class FormationSequence {
    // Cache the sequence for fast lookup
    private static readonly SEQUENCE: number[] = [];
    // Map count -> Config {rows, cols}
    private static readonly CONFIG_MAP: Map<number, { rows: number, cols: number }> = new Map();

    private static initialized = false;

    public static getSequence(): number[] {
        if (!this.initialized) this.initialize();
        return this.SEQUENCE;
    }

    public static initialize(maxVal: number = 200) {
        if (this.initialized) return;

        let n = 1;
        while (true) {
            // 1. Square: n * n
            const sq = n * n;
            if (sq > maxVal) break;
            this.SEQUENCE.push(sq);
            this.CONFIG_MAP.set(sq, { rows: n, cols: n });

            // 2. Rectangle: n * (n + 1) -> n rows, n+1 cols (Wide)
            // Or (n+1) rows, n cols (Tall) ? 
            // Usually phalanx is wider or square. Let's prefer standard orientation.
            // FormationSystem usually adjusts rows/cols, but here we define the 'base' shape.
            // Let's define it as Width > Height (Cols > Rows) for standard look.
            const rect = n * (n + 1);
            if (rect > maxVal) break;
            this.SEQUENCE.push(rect);
            this.CONFIG_MAP.set(rect, { rows: n, cols: n + 1 });

            n++;
        }

        // Sort just in case (though loop produces sorted)
        this.SEQUENCE.sort((a, b) => a - b);
        this.initialized = true;
    }

    /**
     * Findings the largest perfect number <= visibleCount.
     * e.g. input 18 -> returns 16.
     */
    public static getPerfectCount(rawCount: number): number {
        if (!this.initialized) this.initialize();

        // Binary search or linear search (sequence is small ~20 items for 200 max)
        // Linear is fine.
        for (let i = this.SEQUENCE.length - 1; i >= 0; i--) {
            if (this.SEQUENCE[i] <= rawCount) {
                return this.SEQUENCE[i];
            }
        }
        return 1; // Minimum
    }

    public static getConfig(count: number): { rows: number, cols: number } | undefined {
        if (!this.initialized) this.initialize();
        return this.CONFIG_MAP.get(count);
    }
}
