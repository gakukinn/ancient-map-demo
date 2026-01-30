/**
 * Game Configuration
 * Centralized source of truth for game balance constants.
 */

export enum GameMode {
    HISTORICAL = 'HISTORICAL',
    FREE = 'FREE'
}

// Mutable Game State Configuration
export const GameState = {
    mode: GameMode.HISTORICAL
};

export const SIEGES_CONFIG = {
    ENTRY_GIF: '/GIF/hanzhongda (1).gif',
    LOOP_GIF: '/GIF/hanzhongda (2).gif',
    ENTRY_DURATION: 30000, // 30 seconds
    TARGET_CITY_TYPES: [
        'huge_city',
        'capital',

        'hanbei_huge_city',
        'hannan_huge_city',
        'hanhuang_huge_city',
        'hanling_huge_city',
        'west_huge_city',
        'manchu_huge_city',
        'hanchuan_huge_city',
        'dian_huge_city',

    ]
};

export const PLAYER_SPEED_TIERS = {
    // UI Speed Tiers (TimeScale)
    PAUSED: 0,
    SLOW_SPEED: 0.02,
    STANDARD_SPEED: 0.1, // [USER REQUEST] Increased from 0.05 (2026-01-24)
    FAST_SPEED: 0.1,
    ULTRA_SPEED: 0.5,

    // Legacy Weight-Based Speed Props (Required by Army.ts/Player.ts)
    LIGHT_THRESHOLD: 1000,
    LIGHT_SPEED: 0.06, // Reduced
    STANDARD_THRESHOLD: 10000,
    HEAVY_REDUCTION_PER_10K: 0.001,
    HEAVY_MIN_SPEED: 0.02,
};

export const GameConfig = {
    // GAME_MODE removed from here to allow mutation

    COMBAT: {
        // [NOTE] Combat duration is currently hardcoded in BattleField.ts
        // Formula: Duration = TotalTroops / 1000 (Min 5s, Max 30s)

        // [DEPRECATED CONFIG] The following values are NOT currently used:
        /*
        DURATION_BASE: 5.0,
        DURATION_MAX: 20.0,
        MASS_FACTOR: 2.5,
        SIEGE_BONUS: 0.0,
        */

        /** [NEW] Combat Randomness (Variance) */
        // Range: 1.0 +/- VARIANCE
        // e.g. 0.5 means power can fluctuate between 0.5x and 1.5x
        RANDOM_VARIANCE: 0.5,

        /** Ratio of lost troops that recover as "wounded" for the winner */
        WOUNDED_RECOVERY_RATE: 0.3,
        /** Minimum troops required to be considered "alive" in combat */
        MIN_SURVIVAL_TROOPS: 1.0,


        // [REMOVED] Terrain Modifiers & Unit Counters (User Request: System has no archers, remove logic)
        // Power = Troops

    },
    LEGION: {
        /** Standard troop count for a new legion */
        TROOPS_PER_LEGION: 10000,
        /** Minimum troops required for a Valid Sortie (Min Cap) */
        MIN_TROOPS: 10000,
        /** Maximum troops allow for a Sortie (Max Cap) - REMOVED: No limit */
        MAX_TROOPS: Infinity,
        /** Troops recovered per tick/season when near friendly city */
        RECOVERY_RATE: 0.01,
        /** Buffer troops to keep when splitting a legion */
        SPLIT_BUFFER: 5000,
    },
    SIEGE: {
        /** Default troops for a city if not specified */
        DEFAULT_CITY_TROOPS: 10000,
        /** Default troops for a siege attacker if not specified */
        DEFAULT_ATTACKER_TROOPS: 50000,
        /** Max distance from target to consider "nearby" spawn */
        SPAWN_DISTANCE_THRESHOLD: 4.0,
        /** Distance offset for direct spawning */
        SPAWN_OFFSET: 0.5,
        /** [NEW] Defense Multiplier for Passes (0.5 = 50% damage reduction) */
        PASS_DEFENSE_MULTIPLIER: 0.5,
    },


    MORALE: {
        // [SIMPLIFIED] Morale system disabled.
        MAX_MORALE: 100,
    },
    CITY: {
        /** Minimum garrison ratio (percentage of city's maxTroops) */
        MIN_GARRISON_RATIO: 0.1, // 10% of maxTroops
        /** Fallback minimum garrison for cities without maxTroops defined */
        MIN_GARRISON_FALLBACK: 1000,
        /** Distance from capital (in hexes) before recruitment efficiency drops */
        RECRUITMENT_EFFICIENCY_DISTANCE_THRESHOLD: 10,
    },
    ARMY: {
        /** [OPTIMIZED] Base Speed Drastically Reduced */
        SPEED: 0.2, // (Prev 1.5)
        /** [OPTIMIZED] Base Battle Duration Increased */
        BASE_BATTLE_DURATION: 20, // (Prev 5)
        /** Troop thresholds for duration scaling */
        DURATION_TIER_1: 20000,
        DURATION_TIER_2: 30000,
        DURATION_TIER_3: 40000,
    },
    PLAYER: {
        /** Hide Player Sprite for God View Mode */
        VISIBLE: false,
        /** Ratio of troops player contributes to battle when nearby - DISABLED: Set to 0 to prevent interference */
        PARTICIPATION_DISTANCE: 0,
    },
    DISTANCE: {
        /** æˆ˜æ–—å ‚æˆ˜è· ç¦» (Player Participation) - DISABLED: Set to 0 to prevent player interference */
        COMBAT_PARTICIPATION: 0,
        /** è‡ªåŠ¨åŠ å…¥æˆ˜æ–—è· ç¦» (ç•¥å¤§äºŽå ‚æˆ˜è· ç¦») */
        AUTO_JOIN: 2.0,
        /** åˆ°è¾¾ç›®æ ‡è· ç¦» (Tighter threshold: 0.5 -> 0.3) */
        ARRIVAL: 0.3,
        /** åŸŽå¸‚å¢žæ ´èŒƒå›´ (å…­è¾¹å½¢æ•°é‡  approx) */
        REINFORCEMENT: 12,
        /** åŸŽå¸‚é™„è¿‘é˜ˆå€¼ (ç”¨äºŽè‡ªåŠ¨è¡¥ç»™/æ’¤é€€) */
        NEAR_CITY: 2.0,
        /** NPC äº¤äº’/å œæ­¢è· ç¦» */
        INTERACTION: 0.5,
        /** [NEW] æœ€å¤§è‡ªåŠ¨åŠ å…¥è· ç¦» (ç”¨äºŽæ›¿ä»£ç¡¬ç¼–ç  çš„ 9999) */
        MAX_JOIN_DISTANCE: 10000
    },
    SYSTEM: {
        /** Enable/Disable Historical Events by default */
        ENABLE_HISTORICAL_EVENTS: false, // [USER REQUEST] Sandbox Mode: Events Disabled by Default
        /** [DEBUG] Show all unit types/factions for visual verification */
        DEBUG_SHOWCASE_UNITS: true,
        /** [DEPLOYMENT] Map Only Mode (Pure Geographical Map) */
        MAP_ONLY_MODE: true, // [NEW] Set to true for "Map Only" deployment
        /** [DEPLOYMENT] Static Map Scene (Google Maps Style: Top-down, No Tilt, No F8) */
        STATIC_MAP_SCENE: true, // [USER REQUEST] Pure 2D map viewing experience
    },
    PACING: {
        // [NEW] Pacing System - Auto-adjust speed based on events
        /** Speed during war/combat seasons (Normal) */
        WAR_SPEED: 1.0,
        /** Speed during peace/empty seasons (Fast Forward) */
        PEACE_SPEED: 1.0,  // 平时：1倍速（已修改）
    }
} as const;

// ==================== æ¸¸æˆ å¸¸é‡  (Game Constants) ====================
export const GAME_CONSTANTS = {
    /** UI æ›´æ–°é—´éš” (æ¯«ç§’) */
    UI_UPDATE_INTERVAL: 100,
    /** NPC æ€»æ•° */
    TOTAL_NPC_COUNT: 10,
    /** NPC ç‚¹å‡»å œæ­¢è· ç¦» */
    NPC_STOP_DISTANCE: 0.01,
    /** åŸŽå¸‚é™„è¿‘é˜ˆå€¼ (å…­è¾¹å½¢è· ç¦») */
    CITY_NEARBY_THRESHOLD: 1,
    /** æ¯ å­£åº¦è¡¥å……çŽ‡ */
    TROOP_REPLENISH_RATE: 0.1,
} as const;


// ==================== åœ°å›¾å¸¸é‡  (Map Constants) ====================
export const MAP_CONSTANTS = {
    /** åœ°å›¾ä¸­å¿ƒçº¬åº¦ (ç”¨äºŽå…­è¾¹å½¢æŠ•å½±) */
    CENTER_LATITUDE: 34.26,
} as const;


export { SPRITE_PATHS } from './UnitAssets';
