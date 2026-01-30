import { CityType } from '../types/core';

export interface CityTypeConfig {
    name: string;
    maxTroops: number;
    initialTroops: number;
    growthRate: number; // 0.01 = 1%
}

// [OPTIMIZATION] Define standard scales based on user requirement
// Giant: 40k / 1%
// Big: 30k / 1%
// Medium: 20k / 1%
// Small: 10k / 1%
const SCALES = {
    giant: { maxTroops: 40000, initialTroops: 4000, growthRate: 0.03 },
    big: { maxTroops: 30000, initialTroops: 3000, growthRate: 0.03 },
    medium: { maxTroops: 20000, initialTroops: 2000, growthRate: 0.03 },
    small: { maxTroops: 10000, initialTroops: 1000, growthRate: 0.03 }
};

// [FIX] Use Partial to allow optional entries for regional variants
// Regional city types will fallback to base types at runtime
export const CITY_CONFIG: Partial<Record<CityType, CityTypeConfig>> = {
    // ==================== Big (30k) ====================
    huge_city: { name: '大城', ...SCALES.big },

    // ==================== Medium (20k) ====================
    large_city: { name: '中城', ...SCALES.medium },

    // ==================== Small (10k) ====================
    small_city: { name: '小城', ...SCALES.small },

    // ==================== Pass/Fortress (10k) ====================
    pass: { name: '关隘', ...SCALES.small },

    // ==================== Ferry (10k) ====================
    ferry: { name: '渡口', ...SCALES.small }
};

// [NEW] Helper to get config with fallback to small_city
export function getCityConfig(type: CityType): CityTypeConfig {
    return CITY_CONFIG[type] || CITY_CONFIG['small_city'] || { name: '未知', ...SCALES.small };
}

/**
 * Calculate minimum garrison for a city based on its type.
 * Returns 10% of the city's maxTroops.
 * @param type City type
 * @returns Minimum garrison troops
 */
export function getMinGarrison(type: CityType): number {
    const config = getCityConfig(type);
    return Math.floor(config.maxTroops * 0.1); // 10% of maxTroops
}
