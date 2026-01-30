// import { FormationSequence } from './FormationSequence';

export interface FormationConfig {
    rows: number;
    cols: number;
    count: number;
}

export class FormationSystem {
    private static readonly TROOPS_PER_SOLDIER = 500; // Legacy ref

    // [NEW] Square Phalanx Tiers (Rows x Cols)
    private static readonly TIER_LIST = [
        { minTroops: 50000, rows: 10, cols: 10, count: 100 },
        { minTroops: 45000, rows: 9, cols: 10, count: 90 },
        { minTroops: 40000, rows: 9, cols: 9, count: 81 },
        { minTroops: 35000, rows: 8, cols: 9, count: 72 },
        { minTroops: 30000, rows: 8, cols: 8, count: 64 },
        { minTroops: 25000, rows: 7, cols: 8, count: 56 },
        { minTroops: 20000, rows: 7, cols: 7, count: 49 },
        { minTroops: 15000, rows: 6, cols: 7, count: 42 },
        { minTroops: 10000, rows: 6, cols: 6, count: 36 }, // Standard Legion
        { minTroops: 9000, rows: 5, cols: 6, count: 30 },
        { minTroops: 8000, rows: 5, cols: 5, count: 25 },
        { minTroops: 7000, rows: 5, cols: 4, count: 20 },
        { minTroops: 6000, rows: 4, cols: 4, count: 16 },
        { minTroops: 5000, rows: 4, cols: 3, count: 12 },
        { minTroops: 4000, rows: 3, cols: 3, count: 9 },
        { minTroops: 3000, rows: 3, cols: 2, count: 6 },
        { minTroops: 2000, rows: 2, cols: 2, count: 4 },
        { minTroops: 1000, rows: 3, cols: 1, count: 3 }, // Special 1x3 vertical
        { minTroops: 500, rows: 2, cols: 1, count: 2 },
        { minTroops: 0, rows: 1, cols: 1, count: 1 }
    ];

    public static getFormationConfig(troops: number): FormationConfig {
        for (const tier of this.TIER_LIST) {
            if (troops >= tier.minTroops) {
                return {
                    rows: tier.rows,
                    cols: tier.cols,
                    count: tier.count
                };
            }
        }
        return { rows: 1, cols: 1, count: 1 };
    }

    public static getTroopsPerSoldier(): number {
        return this.TROOPS_PER_SOLDIER;
    }
}
