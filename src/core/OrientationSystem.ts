import { LatLng } from '../types/core';

/**
 * Unified Orientation System
 * Handles all facing direction logic for game entities (Player, AI, City, NPC).
 * 
 * Rules:
 * 1. Immobile Entities (City, NPC):
 *    - Longitude > 100 (East): Face West (Left)
 *    - Longitude < 100 (West): Face East (Right)
 * 
 * 2. Mobile Entities (Player, AI Army):
 *    - Moving: Face direction of movement.
 *    - Combat: Face the opponent.
 *    - Siege Combat: Attacker faces the city (adhering to city's "front").
 */
export class OrientationSystem {
    // Threshold longitude for East/West division
    private static readonly LONGITUDE_THRESHOLD = 100;

    /**
     * Determines if an entity should face LEFT (West) based on its longitude.
     * Used for Immobile entities (Cities, NPCs) and Siege Defenders.
     * 
     * @param longitude Current longitude
     * @returns true if should face Left, false if Right
     */
    public static getImmobileFacing(longitude: number): boolean {
        // East of 100 (>100) -> Face West (Left) -> true
        // West of 100 (<100) -> Face East (Right) -> false
        return longitude > this.LONGITUDE_THRESHOLD;
    }

    /**
     * Determines facing based on movement.
     * 
     * @param currentLng Current longitude
     * @param lastLng Previous longitude
     * @returns true if moving Left (West), false if Right (East), null if no significant movement
     */
    public static getMovementFacing(currentLng: number, lastLng: number): boolean | null {
        const diff = currentLng - lastLng;
        if (Math.abs(diff) > 0.000001) {
            return diff < 0; // Moving West -> Face Left
        }
        return null; // No change
    }

    /**
     * Determines facing for an attacker in combat.
     * Attacker should face the target.
     * 
     * @param attackerPos Attacker's position
     * @param targetPos Target's position
     * @returns true if attacker should face Left (target is to the West)
     */
    public static getCombatFacing(attackerPos: LatLng, targetPos: LatLng): boolean {
        return targetPos.lng < attackerPos.lng;
    }

    /**
     * Calculates the 8-way direction index (0-7) from a source to a target.
     * 0: South (Down)
     * 1: Southwest
     * 2: West (Left)
     * 3: Northwest
     * 4: North (Up)
     * 5: Northeast
     * 6: East (Right)
     * 7: Southeast
     * 
     * @param from Source position
     * @param to Target position
     */
    public static get8DirectionIndex(from: LatLng, to: LatLng): number {
        const dx = to.lng - from.lng;
        const dy = to.lat - from.lat;

        // Atan2 returns angle in radians from -PI to PI
        // 0 is East (Right), -PI/2 is North (Up), PI/2 is South (Down), PI/-PI is West (Left)
        // Leaflet coords: lat increases UP (North), lng increases RIGHT (East)
        // So dy > 0 is North, dx > 0 is East

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return this.get8DirectionFromAngle(angle);
    }

    /**
     * Converts an angle (degrees) to 0-7 sprite index.
     * Supports full 8-way directional mapping.
     * 
     * Mapped to 8-way Sprite Index:
     * 0: Northeast (Right-Up)
     * 1: East (Right)
     * 2: Southeast (Right-Down)
     * 3: South (Down)
     * 4: Southwest (Left-Down)
     * 5: West (Left)
     * 6: Northwest (Left-Up)
     * 7: North (Up)
     */
    public static get8DirectionFromAngle(angleDeg: number): number {
        // Normalize to 0-360
        let angle = ((angleDeg % 360) + 360) % 360;

        // Split into 8 sectors of 45° each, centered on 0, 45, 90, etc.
        // Sector boundaries are at 22.5°, 67.5°, 112.5°, 157.5°, 202.5°, 247.5°, 292.5°, 337.5°

        // Map angle to sector index (0-7)
        // 0: East (Right)
        // 1: Northeast (Right-Up)
        // 2: North (Up)
        // 3: Northwest (Left-Up)
        // 4: West (Left)
        // 5: Southwest (Left-Down)
        // 6: South (Down)
        // 7: Southeast (Right-Down)

        let sector = Math.floor(((angle + 22.5) % 360) / 45);

        /**
         * Map Sector to Sprite Index (Standardized for S8/Xiyang):
         * Sector 0 (0°)   -> Sprite 1 (East)
         * Sector 1 (45°)  -> Sprite 0 (Northeast)
         * Sector 2 (90°)  -> Sprite 7 (North)
         * Sector 3 (135°) -> Sprite 6 (Northwest)
         * Sector 4 (180°) -> Sprite 5 (West)
         * Sector 5 (225°) -> Sprite 4 (Southwest)
         * Sector 6 (270°) -> Sprite 3 (South)
         * Sector 7 (315°) -> Sprite 2 (Southeast)
         */
        const sectorToSprite = [1, 0, 7, 6, 5, 4, 3, 2];
        return sectorToSprite[sector];
    }

    public static getCityImageTransform(longitude: number): string {
        return 'none';
    }
}
