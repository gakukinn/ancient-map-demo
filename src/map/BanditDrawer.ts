import { AssetLoader } from '../core/AssetLoader';
import { SPRITE_PATHS } from '../config/GameConfig';

/**
 * Bandit State: Only 3 main states available in assets
 * IDLE uses MOVE frame 0
 */
export type BanditState = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGE' | 'DEATH';

interface SpriteSet {
    move: HTMLImageElement | null;
    attacks: HTMLImageElement[];
    damage: HTMLImageElement | null;
}

/**
 * BanditDrawer
 * Handles rendering for Bandit and Raider style units.
 */
export class BanditDrawer {
    private static sprites: Map<string, SpriteSet> = new Map();
    private static isLoaded = false;

    /**
     * Preloads Bandit and Raider sprites
     */
    public static async preload(): Promise<void> {
        if (this.isLoaded) return;

        const archetypes = [
            { key: 'bandit', paths: SPRITE_PATHS.BANDIT },
            { key: 'raider', paths: SPRITE_PATHS.RAIDER },
            { key: 'outlaw', paths: SPRITE_PATHS.OUTLAW },
            { key: 'rebel', paths: SPRITE_PATHS.REBEL },
            { key: 'barbarian', paths: SPRITE_PATHS.BARBARIAN }
        ];

        try {
            await Promise.all(archetypes.map(async (arch) => {
                const paths: any = arch.paths;
                const attackPaths = Array.isArray(paths.ATTACK) ? paths.ATTACK : [paths.ATTACK];

                const [move, attacks, damage] = await Promise.all([
                    this.loadAndProcess(paths.MOVE),
                    Promise.all(attackPaths.map((p: string) => this.loadAndProcess(p))),
                    this.loadAndProcess(paths.DAMAGE)
                ]);

                this.sprites.set(arch.key, {
                    move,
                    attacks,
                    damage
                });
            }));

            this.isLoaded = true;
            console.log('✅ BanditDrawer: All Archetypes Loaded (Bandit + Raider)');
        } catch (e) {
            console.error("Failed to load bandit/raider assets", e);
        }
    }

    private static loadAndProcess(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                // [FIX] Skip processing for modern assets (already transparent, no green screen)
                // This also preserves the .src property for getDimensions()
                if (src.toLowerCase().includes('/assets/')) {
                    resolve(img);
                    return;
                }

                // Apply chroma key (Green removal) for legacy S10 assets
                const processed = await this.processImage(img);
                resolve(processed);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Chroma Key processing (Remove green background)
     */
    private static processImage(img: HTMLImageElement): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            if (!img.complete || img.naturalWidth === 0) {
                resolve(img);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(img);
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Chroma Key: Remove Green (#00FF00)
            // Rule: G > 200 && R < 100 && B < 100
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Green Screen (Stricter to protect green flags)
                if (g > 100 && g > r + 60 && g > b + 60 && (r + b) < 200) {
                    data[i + 3] = 0; // Alpha 0
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.onload = () => resolve(newImg);
            newImg.src = canvas.toDataURL();
        });
    }

    private static getDimensions(sprite: HTMLImageElement): { rows: number, cols: number } {
        // Use source path to determine if it's a legacy S10 sheet or new single asset
        const src = sprite.src.toLowerCase();

        // 1. New NPC assets in /assets/NPC/ are single frames
        if (src.includes('assets/npc')) {
            return { rows: 1, cols: 1 };
        }

        // 2. Standard San10 Sheets (/SUCAI/S10B/) are 8x8
        if (src.includes('/s10b/')) {
            return { rows: 8, cols: 8 };
        }

        const ratio = sprite.width / sprite.height;
        if (ratio > 7) return { rows: 1, cols: 8 };

        return { rows: 1, cols: 1 };
    }

    /**
     * Draw Bandit or Raider Units
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: BanditState,
        direction: number, // 0-7
        scale: number,
        troops: number,
        tick: number = 0,
        unitType: string = 'bandit'
    ): void {
        if (!this.isLoaded) return;

        // Map general "bandit" types to archetypes
        let archetypeKey = 'bandit';
        if (unitType === 'raider') {
            archetypeKey = 'raider';
        } else if (unitType === 'outlaw' || unitType === 'tufei') {
            archetypeKey = 'outlaw';
        } else if (unitType === 'rebel' || unitType === 'panjun') {
            archetypeKey = 'rebel';
        } else if (unitType === 'barbarian' || unitType === 'yizu') {
            archetypeKey = 'barbarian';
        }

        const spriteSet = this.sprites.get(archetypeKey) || this.sprites.get('bandit');
        if (!spriteSet) {
            console.warn(`BanditDrawer: No sprite set for ${archetypeKey}`);
            return;
        }

        // 1. Select Sprite Sheet
        let sprite = spriteSet.move;
        if (state === 'ATTACK') {
            if (spriteSet.attacks.length > 0) {
                const attackIndex = Math.floor(tick / 300) % spriteSet.attacks.length;
                sprite = spriteSet.attacks[attackIndex];
            }
        }
        else if (state === 'DAMAGE' || state === 'DEATH') sprite = spriteSet.damage;

        if (state === 'IDLE') sprite = spriteSet.move;

        if (!sprite) {
            console.warn('BanditDrawer: No sprite selected');
            return;
        }

        // [DEBUG] Trace Draw
        // if (Math.random() < 0.01) console.log('BanditDrawer drawing:', { archetypeKey, state, spriteWidth: sprite.width, spriteHeight: sprite.height });

        // 2. Get Dynamic Dimensions
        const { rows, cols } = this.getDimensions(sprite);

        // 3. Dimensions
        const frameWidth = sprite.width / cols;
        const frameHeight = sprite.height / rows;

        // 4. Source Rect
        // Row = Direction (0-7), but clamp if rows < 8
        const actualRow = Math.min(direction, rows - 1);
        const sy = actualRow * frameHeight;

        // 5. Render Size (Synced with other renderers)
        const baseHeight = 100;
        const unitRatio = 1.0; // Force 1:1
        const renderWidth = baseHeight * unitRatio * scale;
        const renderHeight = baseHeight * scale;

        // 6. Formations
        let formationOffsets: { dx: number, dy: number }[] = [];
        const spacing = 18 * scale; // Slightly wider spacing for squad feel

        if (archetypeKey === 'rebel' || archetypeKey === 'barbarian') {
            // 3x3 Grid (9 people)
            for (let row = -1; row <= 1; row++) {
                for (let col = -1; col <= 1; col++) {
                    formationOffsets.push({ dx: col * spacing * 1.2, dy: row * spacing * 1.2 });
                }
            }
        } else if (archetypeKey === 'raider') {
            // Raider: 2x2 Grid (4 people)
            formationOffsets = [
                { dx: -spacing, dy: -spacing }, { dx: spacing, dy: -spacing },
                { dx: -spacing, dy: spacing }, { dx: spacing, dy: spacing }
            ];
        } else if (archetypeKey === 'outlaw') {
            // Outlaw: 6-man Diamond (菱形)
            // Arrangement: 1-2-2-1
            formationOffsets = [
                { dx: 0, dy: -spacing * 1.8 },          // Top
                { dx: -spacing * 1.0, dy: -spacing * 0.6 }, // Mid-Top Left
                { dx: spacing * 1.0, dy: -spacing * 0.6 },  // Mid-Top Right
                { dx: -spacing * 1.0, dy: spacing * 0.6 },  // Mid-Bottom Left
                { dx: spacing * 1.0, dy: spacing * 0.6 },   // Mid-Bottom Right
                { dx: 0, dy: spacing * 1.8 }           // Bottom
            ];
        } else {
            // Bandit: Triangle (3 people)
            formationOffsets = [
                { dx: 0, dy: -spacing },
                { dx: -spacing * 1.2, dy: spacing },
                { dx: spacing * 1.2, dy: spacing }
            ];
        }

        // 7. Draw Squad Members
        formationOffsets.forEach((offset, i) => {
            const characterTick = tick + (i * 200);
            const characterFrameIndex = state === 'IDLE' ? 0 : Math.floor(characterTick / 150) % cols;
            const characterSX = characterFrameIndex * frameWidth;

            ctx.drawImage(
                sprite,
                characterSX, sy, frameWidth, frameHeight,
                center.x + offset.dx - renderWidth / 2,
                center.y + offset.dy - renderHeight * 0.65, // Anchor lower
                renderWidth,
                renderHeight
            );
        });
    }
}
