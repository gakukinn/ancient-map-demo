
export interface PhalanxStyleConfig {
    /** Base height of the unit sprint in pixels */
    baseSize: number;
    /** 'player' uses PLAYER_PHALANX sprites, 'legion' uses AI_PHALANX & AI_ARCHER */
    spriteSet: 'player' | 'legion';

    /** Start index of sprite frames (usually 0) */
    frameStart: number;

    // --- VITALITY & ANIMATION ---
    /** Enable "Breathing" size fluctuation during combat */
    enableBreathing: boolean;
    /** Enable random time-offsets for animations to prevent robotic sync */
    enableStagger: boolean;

    // --- FORMATION ---
    /** Enable mixed unit types (e.g. Archer rows at back) */
    enableMixedTypes: boolean;

    /** Scale factor for spacing between soldiers */
    spacingScale: number;
}

/**
 * Configuration for Player-controlled units.
 * Features: Larger size, Breathing effects, Pure Infantry.
 */
export const PLAYER_PHALANX_STYLE: PhalanxStyleConfig = {
    baseSize: 100,
    spriteSet: 'player',
    frameStart: 0,
    enableBreathing: true,
    enableStagger: true,
    enableMixedTypes: false,
    spacingScale: 1.0
};

/**
 * Configuration for AI/NPC Legions.
 * Features: Standard size, No breathing (stable), Mixed Infants/Archers.
 */
export const LEGION_PHALANX_STYLE: PhalanxStyleConfig = {
    baseSize: 80,
    spriteSet: 'legion',
    frameStart: 0,
    enableBreathing: false, // Strict requirement: No size fluctuation
    enableStagger: true,
    enableMixedTypes: true, // Mixed formation enabled
    spacingScale: 1.0
};
