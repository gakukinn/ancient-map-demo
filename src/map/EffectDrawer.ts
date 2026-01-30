
/**
 * EffectDrawer - Handles procedural combat visual effects
 */
export class EffectDrawer {

    /**
     * Draws chaotic combat effects (slashes, sparks) at the given center
     * @param ctx Canvas Context
     * @param center Center point of the effect (midpoint between combatants)
     * @param scale Map scale factor
     * @param time Current timestamp (to drive random seed/animation)
     */
    public static drawCombatEffects(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        scale: number,
        time: number
    ): void {
        // [USER REQUEST] Disable combat visuals
        return;
    }
}
