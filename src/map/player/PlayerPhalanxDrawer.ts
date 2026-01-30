import { AssetLoader } from '../../core/AssetLoader';
import { SPRITE_PATHS } from '../../config/GameConfig';
import { GeneralDrawer } from '../GeneralDrawer';
import { PhalanxVitality } from '../PhalanxVitality';
import { PlayerPhalanxStateManager, PlayerUnitState } from './PlayerPhalanxState';

export type PhalanxAnimState = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGE' | 'DEATH';

export class PlayerPhalanxDrawer {
    // Player Sprites
    private static moveSprites: HTMLImageElement[] = [];
    private static attackSprites: HTMLImageElement[] = [];
    private static idleSprites: HTMLImageElement[] = [];
    private static damageSprites: HTMLImageElement[] = [];
    private static deathSprites: HTMLImageElement[] = [];

    private static isLoaded = false;
    private static hasLoggedDraw = false;

    public static async preload(): Promise<void> {
        // [DEBUG] Force reload for testing new assets
        this.isLoaded = false;

        const playerPaths = SPRITE_PATHS.PLAYER_ZHONGHUA;

        const loadBatch = async (sourcePaths: readonly string[], targetArray: HTMLImageElement[]) => {
            await AssetLoader.preloadImages([...sourcePaths]);
            await Promise.all(sourcePaths.map(async (path, index) => {
                const img = AssetLoader.getImage(path);
                if (img) {
                    const processed = await this.processImage(img);
                    targetArray[index] = processed;
                }
            }));
        };

        console.log('🔄 PlayerPhalanxDrawer: Processing 8-Direction Sprites...');
        await Promise.all([
            loadBatch(playerPaths.MOVE, this.moveSprites),
            loadBatch(playerPaths.ATTACK, this.attackSprites),
            loadBatch(playerPaths.IDLE, this.idleSprites),
            loadBatch(playerPaths.DAMAGE, this.damageSprites),
            loadBatch(playerPaths.DEATH, this.deathSprites),
            GeneralDrawer.preload()
        ]);
        this.isLoaded = true;
        console.log('✅ PlayerPhalanxDrawer: Loaded sprites for all states');
    }

    private static processImage(img: HTMLImageElement): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            if (!img.complete || img.naturalWidth === 0) { resolve(img); return; }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(img); return; }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 1] > 200 && data[i] < 100 && data[i + 2] < 100) data[i + 3] = 0;
            }
            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.onload = () => resolve(newImg);
            newImg.src = canvas.toDataURL();
        });
    }

    // [NEW] Static Spiral Table (Indices 0-60 for Radius 4)
    // [NEW] Square Grid Offset Calculation
    private static getSquareOffset(index: number, rows: number, cols: number, spacingX: number, spacingY: number, direction: number): { x: number, y: number } {
        // Calculate row and col
        const r = Math.floor(index / cols);
        const c = index % cols;

        if (r >= rows) return { x: 0, y: 0 };

        // Center the grid
        const centerX = (cols - 1) / 2;
        const centerY = (rows - 1) / 2;

        const originalX = (c - centerX) * spacingX;
        const originalY = (r - centerY) * spacingY;

        // [ROTATION]
        // Rotate the formation based on direction
        // 0(NE) -> 45 deg, 1(E) -> 90 deg, ...
        // Angle in radians = (direction + 1) * 45 * Math.PI / 180
        const angle = (direction + 1) * Math.PI / 4;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return {
            x: originalX * cos - originalY * sin,
            y: originalX * sin + originalY * cos
        };
    }

    public static resetUnit(unitId: string): void {
        PlayerPhalanxStateManager.reset(unitId);
    }

    public static draw(
        unitId: string,
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: PhalanxAnimState,
        direction: number,
        scale: number,
        troops: number,
        tick: number = 0,
        hasGeneral: boolean = true, // Player always has general?
        isFighting: boolean = false,
        projectFn?: (lat: number, lng: number) => { x: number, y: number },
        unprojectFn?: (x: number, y: number) => { lat: number, lng: number }
    ): void {
        if (!this.isLoaded) return;

        // [USER REQUEST] Fixed 10 units
        // Dynamic Formation: 
        // - Horizontal (E, W): 2 rows x 5 cols (Wide Front)
        // - Vertical/Diagonal: 5 rows x 2 cols (Deep Column) for better propertion
        // [USER REQUEST] Fixed 3x3 Phalanx
        // Dynamic Formation: 3 rows x 3 cols
        const count = 9;
        const rows = 3;
        const cols = 3;

        // [3x3 is square, no need for directional reshaping]

        // [NEW 8-DIRECTION SYSTEM]
        // Game Direction: 0:NE, 1:E, 2:SE, 3:S, 4:SW, 5:W, 6:NW, 7:N
        // Asset Direction (User Specified): 0:NE (460), 1:E, 2:SE, 3:S, 4:SW, 5:W, 6:NW, 7:N
        // The mapping is 1:1.

        const assetDirIndex = direction;

        // [DEBUG] Log first draw call
        if (!this.hasLoggedDraw) {
            console.log('🎨 PlayerPhalanxDrawer.draw:', { direction, assetDirIndex });
            this.hasLoggedDraw = true;
        }

        const infAttackSprite = this.attackSprites[assetDirIndex] || this.attackSprites[0];
        const infIdleSprite = this.idleSprites[assetDirIndex] || this.idleSprites[0];
        const infMoveSprite = this.moveSprites[assetDirIndex] || this.moveSprites[0];
        const infDamageSprite = this.damageSprites[assetDirIndex] || this.damageSprites[0];
        const infDeathSprite = this.deathSprites[assetDirIndex] || this.deathSprites[0];

        // Determine Base Sprite for sizing
        let baseSprite = infIdleSprite;

        // Update State
        // Use a base size for spacing calculation even if sprite not loaded yet
        // Update State
        // [FIX] Unified Base Height (80px)
        // [FIX] Unified Base Height (100px) - Synced with LegionPhalanxDrawer
        const baseHeight = 100;

        // [FORCE UNIFORMITY]
        // Force Square Aspect Ratio (1.0)
        const frameWidthRatio = 1.0;

        // PLAYER BREATHING = ENABLED
        let breathingScale = 1.0;
        if (isFighting && state === 'ATTACK') {
            breathingScale = 1.0 + Math.sin(tick / 200) * 0.05;
        }

        const widthMultiplier = 1.0;
        // Adjust spacing calculation to be more robust
        const renderH = baseHeight * scale;
        const renderW = renderH * frameWidthRatio;

        const spacingX = renderW * widthMultiplier * 0.4 * breathingScale;
        const spacingY = renderH * 0.3 * breathingScale;

        const currentState = PlayerPhalanxStateManager.update(
            unitId, troops, rows, cols, count, direction, tick, isFighting, center, unprojectFn,
            (idx) => this.getSquareOffset(idx, rows, cols, spacingX, spacingY, direction)
        );

        const vitalitySeed = currentState.vitalitySeed || 0;

        // Draw Loop
        interface RenderItem { y: number; draw: () => void; }
        const renderList: RenderItem[] = [];
        const totalSlots = currentState.slots.length;

        for (let i = 0; i < totalSlots; i++) {
            const slot = currentState.slots[i];

            let drawX: number, drawY: number;
            if ((slot.state === 'DEAD' || slot.state === 'DYING') && slot.deadLat && slot.deadLng && projectFn) {
                const proj = projectFn(slot.deadLat, slot.deadLng);
                drawX = proj.x;
                drawY = proj.y;
            } else {
                const offset = this.getSquareOffset(i, rows, cols, spacingX, spacingY, direction);
                drawX = center.x + offset.x;
                drawY = center.y + offset.y;
            }

            let currentSprite = infIdleSprite;

            // Determine sprite based on slot state and high-level state
            if (slot.state === 'DEAD' || slot.state === 'DYING') {
                // Death override
                const dDir = slot.deathDirection ?? direction;
                // Map death direction similarly if needed, or just use current assetDirIndex if direction didn't change much
                // For simplicity, re-map if we stored raw direction
                let dAssetIndex = 0;
                switch (dDir) {
                    case 3: dAssetIndex = 0; break;
                    case 4: dAssetIndex = 1; break;
                    case 5: dAssetIndex = 2; break;
                    case 6: dAssetIndex = 3; break;
                    case 7: dAssetIndex = 4; break;
                    case 0: dAssetIndex = 5; break;
                    case 1: dAssetIndex = 6; break;
                    case 2: dAssetIndex = 7; break;
                }
                currentSprite = this.deathSprites[dAssetIndex] || this.deathSprites[0];
            } else if (state === 'DAMAGE') {
                // Global damage state
                currentSprite = infDamageSprite;
            } else {
                // Alive and normal state
                if (isFighting && state === 'ATTACK') {
                    currentSprite = infAttackSprite;
                } else if (state === 'MOVE') {
                    currentSprite = infMoveSprite;
                } else {
                    currentSprite = infIdleSprite;
                }
            }

            if (!currentSprite || !currentSprite.complete) continue;

            // [8-Frame Standard vs Single Frame] 
            // Dynamic check for S10DB (Single Frame) vs Old assets
            let totalFrames = 8;
            if (currentSprite.width / currentSprite.height < 2) {
                totalFrames = 1;
            }

            const spriteW = currentSprite.width / totalFrames;
            const spriteH = currentSprite.height;

            // Calculate Frame Index
            let finalFrameIndex = 0;

            if (slot.state === 'DEAD' || slot.state === 'DYING') {
                if (totalFrames === 1) {
                    finalFrameIndex = 0;
                } else {
                    const timeDead = tick - slot.stateStartTime;
                    const deathFrame = Math.floor(timeDead / 150);
                    finalFrameIndex = Math.min(deathFrame, totalFrames - 1);
                }
                if (finalFrameIndex >= totalFrames - 1) slot.state = 'DEAD';
            } else {
                if (state === 'MOVE' || state === 'ATTACK') {
                    const stagger = i * 2;
                    finalFrameIndex = Math.floor((tick / 150) + stagger) % totalFrames;
                } else {
                    // IDLE: Force Frame 0
                    finalFrameIndex = 0;
                }
            }

            const frameCol = finalFrameIndex;

            // [FIX] Standardize Size to match Legion (100px base)
            // [FIX] Already defined above as 80
            // const baseHeight = 80; 
            const unitRatio = spriteW / spriteH;

            const renderH = baseHeight * scale;

            // [DYNAMIC RENDERING]
            // [VISUAL BALANCE] Match LegionPhalanxDrawer scaling
            // Front/Mid (0-5) = 1.2 (Melee focus)
            // Back (6-8) = 0.9 (Perspective/Ranged feel)
            let scalingFactor = 1.2;
            if (i >= 6) {
                scalingFactor = 0.9;
            }

            // Calculate Render Width based on ACTUAL sprite aspect ratio.
            const currentRatio = spriteW / spriteH;

            // Apply Scaling Factor to Height
            const scaledRenderH = renderH * scalingFactor;
            const currentRenderW = scaledRenderH * currentRatio; // No forced 1:1

            renderList.push({
                y: drawY + renderH / 2, // Sort by original base line for consistent Z-order
                draw: () => {
                    ctx.save();
                    ctx.translate(drawX, drawY);

                    ctx.drawImage(
                        currentSprite,
                        frameCol * spriteW, 0, spriteW, spriteH,
                        -currentRenderW / 2, -scaledRenderH / 2, currentRenderW, scaledRenderH
                    );
                    ctx.restore();
                }
            });
        }

        renderList.sort((a, b) => a.y - b.y);
        renderList.forEach(item => item.draw());
    }
}
