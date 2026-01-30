import { GeneralDrawer } from '../GeneralDrawer';
import { LegionPhalanxStateManager } from './LegionPhalanxState';
import { LegionType } from '../../types/UnitTypes';
import { SpriteTinter } from '../../systems/tinting/SpriteTinter';
import { LegionAssetManager } from './LegionAssetManager';
import { LegionLayoutSystem } from './LegionLayoutSystem';

export type PhalanxAnimState = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGE' | 'DEATH' | 'CHARGE' | 'SHOOT';

export class LegionPhalanxDrawer {

    // Helper for Object Pooling (to reduce GC)
    private static renderPool: { y: number, drawParams: any }[] = [];
    private static poolIndex = 0;

    // [OPTIMIZATION] Cache parsed numeric IDs to avoid regex/parseInt every frame
    // Map<unitId, numericId>
    private static numericIdCache: Map<string, number> = new Map();

    private static getNumericId(unitId: string): number {
        let val = this.numericIdCache.get(unitId);
        if (val === undefined) {
            // Expensive Parse (Only once per unit)
            val = parseInt(unitId.replace(/\D/g, '')) || 0;
            this.numericIdCache.set(unitId, val);
        }
        return val;
    }

    public static async preload(): Promise<void> {
        await LegionAssetManager.preload();
    }

    public static resetUnit(unitId: string): void {
        LegionPhalanxStateManager.reset(unitId);
    }

    private static getPooledItem(): { y: number, drawParams: any } {
        if (this.poolIndex >= this.renderPool.length) {
            this.renderPool.push({
                y: 0,
                drawParams: {
                    img: null,
                    sx: 0, sy: 0, sw: 0, sh: 0,
                    dx: 0, dy: 0, dw: 0, dh: 0
                }
            });
        }
        return this.renderPool[this.poolIndex++];
    }

    private static resetPool(): void {
        this.poolIndex = 0;
    }

    /**
     * Draw Dispatcher
     */
    public static draw(
        unitId: string,
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: PhalanxAnimState,
        direction: number,
        scale: number,
        troops: number,
        tick: number = 0,
        hasGeneral: boolean = false,
        isFighting: boolean = false,
        projectFn?: (lat: number, lng: number) => { x: number, y: number },
        unprojectFn?: (x: number, y: number) => { lat: number, lng: number },
        legionType: LegionType = 'infantry',
        factionId: string = 'zhonghua',
        unitAssetsId: string = 'huaxia_infantry',
        isPlayer: boolean = false
    ): void {
        const isS8 = unitAssetsId === 'xiyang_legion' || unitAssetsId === 'han_legion' ||
            unitAssetsId === 'yuenan_legion' || unitAssetsId === 'qiangzang_legion' ||
            unitAssetsId === 'zang_legion' || unitAssetsId === 'gao_legion';

        if (isS8) {
            this.drawS8Legion(unitId, ctx, center, state, direction, scale, troops, tick, hasGeneral, isFighting, projectFn, unprojectFn, legionType, factionId, unitAssetsId);
        } else {
            this.drawS10Phalanx(unitId, ctx, center, state, direction, scale, troops, tick, hasGeneral, isFighting, projectFn, unprojectFn, legionType, factionId, unitAssetsId);
        }
    }

    // [OPTIMIZATION] Shared array to prevent GC alloc per legion per frame
    private static sharedActiveItems: { y: number, drawParams: any }[] = [];

    /**
     * S8 Logic: Stitched Assets, 1x5 Row, No Death Anim
     */
    private static drawS8Legion(
        unitId: string,
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: PhalanxAnimState,
        direction: number,
        scale: number,
        troops: number,
        tick: number,
        hasGeneral: boolean,
        isFighting: boolean,
        projectFn: ((lat: number, lng: number) => { x: number, y: number }) | undefined,
        unprojectFn: ((x: number, y: number) => { lat: number, lng: number }) | undefined,
        legionType: LegionType,
        factionId: string,
        unitAssetsId: string
    ): void {
        const count = 5; // Fixed 5 for S8
        const rows = 1;
        const cols = 5;

        let assets = LegionAssetManager.getAssets(unitAssetsId);
        if (!assets) return;

        // Base Setup
        const baseHeight = 100;
        const estRatio = 0.8;
        const renderH = baseHeight * scale;
        const estRenderW = renderH * estRatio;
        const spacingX = estRenderW * 0.55;
        const spacingY = renderH * 0.35;

        // State Update
        const currentState = LegionPhalanxStateManager.update(
            unitId, troops, rows, cols, count, direction, tick, isFighting, center, unprojectFn,
            spacingX, spacingY, legionType
        );

        this.resetPool();
        // [OPTIMIZATION] Reuse static array, explicit clear
        this.sharedActiveItems.length = 0;
        const activeItems = this.sharedActiveItems;

        for (let i = 0; i < currentState.slots.length; i++) {
            const slot = currentState.slots[i];

            // [S8 SPECIFIC] Check Rendering Mode
            // Move: Only Render Index 1 (Center), Scale 2.2
            // Combat/Idle: Render All 5, Scale 1.0
            let scalingFactor = 1.0;
            let drawX: number, drawY: number;

            // [MODIFIED] Use Single Mode for IDLE (Non-Combat) to match MOVE
            const useSingleMode = state === 'MOVE' || (state === 'IDLE' && !isFighting);

            if (useSingleMode) {
                if (i !== 1) continue; // Only center
                scalingFactor = 2.2;
                drawX = center.x; // Force center
                drawY = center.y;
            } else {
                const baseOffset = LegionLayoutSystem.getFormationOffset(i, spacingX, spacingY, direction, legionType);
                drawX = center.x + baseOffset.x;
                drawY = center.y + baseOffset.y;
            }

            // [S8 SPECIFIC] No Death Animation -> Instant Disappear
            if (troops <= 0 || slot.state === 'DEAD') {
                slot.state = 'DEAD';
                continue; // Skip rendering
            }
            if (slot.state === 'DYING') {
                slot.state = 'DEAD';
                continue;
            }

            // Determine Sprite
            let rawSprite: HTMLImageElement | undefined;
            // [S8 SPECIFIC] Randomized Combat Animation Logic
            if (state === 'ATTACK') {
                const blockId = Math.floor(tick / 3000);
                const unitNumericId = this.getNumericId(unitId);
                const seed = blockId + i + unitNumericId;
                const choice = seed % 4;

                if (choice === 0) rawSprite = assets.ATTACK[direction];
                else if (choice === 1) rawSprite = (assets as any).SHOOT?.[direction];
                else if (choice === 2) rawSprite = assets.SECONDARY?.ATTACK?.[direction];
                else rawSprite = (assets as any).CHARGE?.[direction];

                if (!rawSprite) rawSprite = assets.ATTACK[direction];
            } else if (useSingleMode) {
                // [MODIFIED] Use MOVE sprite for both MOVE and IDLE (Single Mode)
                rawSprite = assets.MOVE[direction];
            } else if (state === 'DAMAGE') {
                rawSprite = assets.DAMAGE[direction];
            } else {
                rawSprite = assets.IDLE[direction];
            }

            // Fallback
            if (!rawSprite) rawSprite = assets.IDLE[direction] || assets.IDLE[0];
            if (!rawSprite) continue;

            const tintedSprite = SpriteTinter.getTintedSprite(rawSprite, factionId);
            if (!tintedSprite) continue;

            // Frame Calc (S8 strip is usually 1 frame unless it's S8GJ which might have more)
            // But code says "S8GJ often needs transparency processing" and loaded as strip?
            // LegionLayoutSystem.getFrameCount covers this. 
            const spriteTotalFrames = LegionLayoutSystem.getFrameCount(tintedSprite);
            let currentFrameIndex = 0;

            if (state === 'MOVE' || state === 'ATTACK' || useSingleMode) {
                const stagger = i * 2;
                // [MODIFIED] Faster Attack Animation (100ms vs 150ms)
                const speed = (state === 'ATTACK') ? 100 : 150;
                currentFrameIndex = Math.floor((tick / speed) + stagger) % spriteTotalFrames;
            }

            // Prepare Draw
            const frameW = tintedSprite.width / spriteTotalFrames;
            const frameH = tintedSprite.height;
            const item = this.getPooledItem();

            const scaledRenderH = renderH * scalingFactor;
            const currentRatio = frameW / frameH;
            const scaledRenderW = scaledRenderH * currentRatio;

            item.y = drawY + renderH / 2;
            item.drawParams.img = tintedSprite;
            item.drawParams.sx = currentFrameIndex * frameW;
            item.drawParams.sy = 0;
            item.drawParams.sw = frameW;
            item.drawParams.sh = frameH;

            // Center Align
            item.drawParams.dx = drawX - scaledRenderW / 2;

            // Anchor Calc: S8 Move needs 0.75, others 0.9
            // Anchor Calc: S8 Move/IdleSingle needs 0.75, others 0.9
            const anchorY = (useSingleMode) ? 0.75 : 0.90;
            item.drawParams.dy = drawY - scaledRenderH * anchorY;

            item.drawParams.dw = scaledRenderW;
            item.drawParams.dh = scaledRenderH;

            activeItems.push(item);
        }

        // Flush
        activeItems.sort((a, b) => a.y - b.y);
        for (const item of activeItems) {
            const p = item.drawParams;
            ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh);
        }
    }

    /**
     * S10 Logic: Standard Phalanx, Death Anim, Crowding
     */
    private static drawS10Phalanx(
        unitId: string,
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: PhalanxAnimState,
        direction: number,
        scale: number,
        troops: number,
        tick: number,
        hasGeneral: boolean,
        isFighting: boolean,
        projectFn: ((lat: number, lng: number) => { x: number, y: number }) | undefined,
        unprojectFn: ((x: number, y: number) => { lat: number, lng: number }) | undefined,
        legionType: LegionType,
        factionId: string,
        unitAssetsId: string
    ): void {
        const count = LegionLayoutSystem.getUnitCount(legionType);
        const rows = 3;
        const cols = 3;

        let assets = LegionAssetManager.getAssets(unitAssetsId);
        // Fallbacks
        if (!assets) assets = LegionAssetManager.getAssets(legionType);
        if (!assets) {
            const baseType = legionType.replace(/^(huaxia|zhonghua)_/, '');
            assets = LegionAssetManager.getAssets(`huaxia_${baseType}`);
        }
        if (!assets) assets = LegionAssetManager.getAssets('huaxia_infantry');
        if (!assets) return;

        const baseHeight = 100;
        const estRatio = 0.8;
        const renderH = baseHeight * scale;
        const estRenderW = renderH * estRatio;
        const spacingX = estRenderW * 0.55;
        const spacingY = renderH * 0.35;

        const currentState = LegionPhalanxStateManager.update(
            unitId, troops, rows, cols, count, direction, tick, isFighting, center, unprojectFn,
            spacingX, spacingY, legionType
        );

        this.resetPool();
        // [OPTIMIZATION] Reuse static array, explicit clear
        this.sharedActiveItems.length = 0;
        const activeItems = this.sharedActiveItems;

        for (let i = 0; i < currentState.slots.length; i++) {
            const slot = currentState.slots[i];
            let drawX: number, drawY: number;
            let dynamicScale = 1.0;

            const baseOffset = LegionLayoutSystem.getFormationOffset(i, spacingX, spacingY, direction, legionType);
            drawX = center.x + baseOffset.x;
            drawY = center.y + baseOffset.y;

            // 1. Dead Position Project
            if ((slot.state === 'DEAD' || slot.state === 'DYING') && slot.deadLat && slot.deadLng && projectFn) {
                const proj = projectFn(slot.deadLat, slot.deadLng);
                drawX = proj.x;
                drawY = proj.y;
            }
            // 2. Combat Crowding / Charge
            else if (isFighting) {
                const isMixed = legionType.includes('mixed');
                const isCavalry = legionType.includes('cavalry');

                // Infantry Crowding
                if (!isMixed && !isCavalry) {
                    let target1Idx = -1, target2Idx = -1;
                    if (i === 3) { target1Idx = 0; target2Idx = 1; }
                    else if (i === 5) { target1Idx = 1; target2Idx = 2; }

                    if (target1Idx !== -1) {
                        const p1 = LegionLayoutSystem.getFormationOffset(target1Idx, spacingX, spacingY, direction, legionType);
                        const p2 = LegionLayoutSystem.getFormationOffset(target2Idx, spacingX, spacingY, direction, legionType);
                        drawX += ((p1.x + p2.x) / 2 - baseOffset.x) * 0.8;
                        drawY += ((p1.y + p2.y) / 2 - baseOffset.y) * 0.8;
                    }
                }

                // Cavalry/Front-line Charge
                if (isCavalry || (isMixed && i >= 2 && i < 5) || legionType === 'riben_infantry') {
                    const cycleDur = 2000;
                    const phase = ((tick + (i * 350)) % cycleDur) / cycleDur;
                    const chargeAngle = ((direction + 1) * Math.PI / 4) - Math.PI / 2;

                    let rankMultiplier = 0.5;
                    if (isCavalry) {
                        if (i === 0) rankMultiplier = 0.3;
                        else if (i >= 1 && i <= 2) rankMultiplier = 1.2;
                        else rankMultiplier = 2.0;
                    }
                    const surgeFactor = Math.sin(phase * Math.PI * 2);
                    const actualSurge = (surgeFactor < 0 ? surgeFactor * 0.2 : surgeFactor);
                    const range = spacingY * 1.2 * rankMultiplier;

                    drawX += Math.cos(chargeAngle) * (actualSurge * range);
                    drawY += Math.sin(chargeAngle) * (actualSurge * range);

                    if (actualSurge > 0) dynamicScale = 1.0 + (actualSurge * 0.15);
                }

                // Jitter
                const rnd = ((i * 9301 + 49297) % 233280) / 233280.0;
                const jitterAmt = 8 * (spacingX / 35);
                drawX += (rnd - 0.5) * jitterAmt;
                drawY += ((1.0 - rnd) - 0.5) * jitterAmt;
            }

            // 3. Asset Selection (Secondary/Tertiary)
            let currentSet = assets;
            const isMixed = legionType.includes('mixed');

            if (isMixed) {
                if (i >= 2 && i < 5) currentSet = assets.SECONDARY || assets;
                else if (i >= 5) currentSet = (assets as any).TERTIARY || assets.SECONDARY || assets;
            } else if (assets.SECONDARY && i >= 6) {
                currentSet = assets.SECONDARY;
            }
            if ((legionType.includes('tujue') || legionType.includes('tian') || legionType.includes('xiyu')) && assets.SECONDARY && i >= 3) {
                currentSet = assets.SECONDARY;
            }

            // General Override
            let isGeneralPos = false;
            if (isMixed) { if (i === 3) isGeneralPos = true; }
            else if (legionType.includes('cavalry')) { if (i === 0) isGeneralPos = true; }
            else { if (i === 4) isGeneralPos = true; }

            if (isGeneralPos) {
                const genAssets = LegionAssetManager.getAssets('player_general');
                if (genAssets) currentSet = genAssets;
            }

            // 4. State & Sprite
            let rawSprite: HTMLImageElement | undefined;
            let animState = state;

            if (slot.state === 'DYING' || slot.state === 'DEAD') {
                const deathDir = slot.deathDirection ?? direction;
                rawSprite = currentSet.DEATH[deathDir] || currentSet.DEATH[0];
                animState = 'DEATH';
            } else if (state === 'DAMAGE') {
                rawSprite = currentSet.DAMAGE[direction];
            } else if (state === 'ATTACK') {
                // [S10 UPGRADE] Randomized Attacks for Mounted Archers / Archers
                // If unit HAS Shoot capability, cycle between Shoot, Attack, and Charge
                if ((currentSet as any).SHOOT?.length > 0) {
                    const blockId = Math.floor(tick / 3000); // 3s Cycle
                    const unitNumericId = this.getNumericId(unitId);
                    // Seed: Combine Block, UnitID, and SoldierIndex to desync soldiers
                    const seed = blockId + i + unitNumericId;
                    const choice = seed % 3; // 0, 1, 2

                    if (choice === 0) {
                        // 1. Shoot (Default)
                        rawSprite = (currentSet as any).SHOOT[direction];
                    } else if (choice === 1) {
                        // 2. Charge (If available, else Shoot)
                        // Note: Some archers might not have specific Charge, fallback to Shoot or Attack?
                        if ((currentSet as any).CHARGE?.length > 0) {
                            rawSprite = (currentSet as any).CHARGE[direction];
                        } else {
                            rawSprite = (currentSet as any).SHOOT[direction];
                        }
                    } else {
                        // 3. Melee Attack (If available, else Shoot)
                        rawSprite = currentSet.ATTACK[direction];
                    }
                    // Final Safety
                    if (!rawSprite) rawSprite = (currentSet as any).SHOOT[direction];

                } else {
                    // Standard Melee Unit
                    rawSprite = currentSet.ATTACK[direction];
                }
            } else if (state === 'MOVE') {
                rawSprite = currentSet.MOVE[direction];
            } else {
                rawSprite = currentSet.IDLE[direction];
            }
            if (!rawSprite) rawSprite = currentSet.IDLE[direction] || currentSet.IDLE[0];
            if (!rawSprite) continue;

            const tintedSprite = SpriteTinter.getTintedSprite(rawSprite, factionId);
            if (!tintedSprite) continue;

            // 5. Animation Frame
            const spriteTotalFrames = LegionLayoutSystem.getFrameCount(tintedSprite);
            let currentFrameIndex = 0;

            if (slot.state === 'ALIVE') {
                if (animState === 'MOVE' || animState === 'ATTACK') {
                    const stagger = i * 2;
                    currentFrameIndex = Math.floor((tick / 150) + stagger) % spriteTotalFrames;
                }
            } else {
                // Death Animation Logic
                // [FIX] Corpse Persistence: Do NOT skip DEAD state. Keep rendering last frame.
                if (spriteTotalFrames === 1) currentFrameIndex = 0;
                else {
                    const timeDead = tick - slot.stateStartTime;
                    const deathFrame = Math.floor(timeDead / 150);
                    currentFrameIndex = Math.min(deathFrame, spriteTotalFrames - 1);
                }

                if (currentFrameIndex >= spriteTotalFrames - 1) {
                    slot.state = 'DEAD';
                    currentFrameIndex = spriteTotalFrames - 1;
                }
            }

            // 6. Draw Item
            const frameW = tintedSprite.width / spriteTotalFrames;
            const frameH = tintedSprite.height;

            // S10 Scaling Logic
            let s10Scale = 1.2;
            const isInfL = legionType.includes('infantry');
            if (isMixed && i >= 5) s10Scale = 0.9;
            else if (isInfL && i >= 6) s10Scale = 0.9;
            // Mixed custom scaling
            if ((unitAssetsId === 'yuenan_infantry' || unitAssetsId === 'dianmian_infantry') && i < 6) s10Scale = 1.0;
            if ((unitAssetsId.startsWith('song_') || unitAssetsId.startsWith('e_') || unitAssetsId.startsWith('shu_') || unitAssetsId.startsWith('yue_')) && i < 6) s10Scale = 0.9;
            if ((unitAssetsId === 'riben_infantry') || unitAssetsId === 'dianmian_infantry') s10Scale = 1.0;

            // [FIX] Force General Scale to 1.2 (for 3x3 and 2-3-2)
            // Ensure the commander stands out even if the rest of the unit is scaled down
            if (isGeneralPos) s10Scale = 1.2;

            s10Scale *= dynamicScale;

            const scaledRenderH = renderH * s10Scale;
            const currentRatio = frameW / frameH;
            const scaledRenderW = scaledRenderH * currentRatio;

            const item = this.getPooledItem();
            item.y = drawY + renderH / 2;
            item.drawParams.img = tintedSprite;
            item.drawParams.sx = currentFrameIndex * frameW;
            item.drawParams.sy = 0;
            item.drawParams.sw = frameW;
            item.drawParams.sh = frameH;
            item.drawParams.dx = drawX - scaledRenderW / 2;
            item.drawParams.dy = drawY - scaledRenderH * 0.90; // Standard Anchor
            item.drawParams.dw = scaledRenderW;
            item.drawParams.dh = scaledRenderH;

            activeItems.push(item);
        }

        activeItems.sort((a, b) => a.y - b.y);
        for (const item of activeItems) {
            const p = item.drawParams;
            ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh);
        }
    }

    public static getGeneralOffset(legionType: LegionType, direction: number, scale: number): { x: number, y: number } {
        const baseHeight = 100;
        const estRatio = 0.8;
        const renderH = baseHeight * scale;
        const estRenderW = renderH * estRatio;
        const spacingX = estRenderW * 0.55;
        const spacingY = renderH * 0.35;

        let index = 4;
        const type = legionType;
        if (type.includes('mixed')) index = 3;
        else if (type.includes('cavalry')) index = 0;
        else if (type === 'xiyang_legion' || type === 'han_legion' || type === 'yuenan_legion' || type === 'qiangzang_legion' || type === 'zang_legion' || type === 'gao_legion') index = 1; // [FIX] Visual Center for 1x5 line is Index 1

        const offset = LegionLayoutSystem.getFormationOffset(index, spacingX, spacingY, direction, type);
        const headOffset = renderH * 0.15;
        return { x: offset.x, y: offset.y - headOffset };
    }
}
