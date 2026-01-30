import { SPRITE_PATHS } from '../../config/GameConfig';
import { CityAssetManager } from '../../core/CityAssetManager';
import { FACTIONS } from '../../data/factions';

/**
 * LegionFlagDrawer - Handles rendering of animated flags for AI Legion units
 * Now supports per-faction flags, matching city flag system
 * Composites: Pole + Flag Body + Text Overlay (per faction)
 */
export class LegionFlagDrawer {
    private static pole: HTMLImageElement;
    private static factionFlags: Map<string, HTMLImageElement> = new Map();
    private static factionTexts: Map<string, HTMLImageElement> = new Map();
    private static isLoaded: boolean = false;
    private static FRAME_COLS = 4; // Animation frames
    private static FRAME_ROWS = 8; // Directions

    public static async preload(): Promise<void> {
        if (this.isLoaded) return;

        const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

        try {
            // Load pole (shared by all factions)
            this.pole = this.processImage(await loadImg(SPRITE_PATHS.PHALANX.FLAG.POLE));

            // Ensure CityAssetManager flags are preloaded
            await CityAssetManager.preloadFlags();

            // Load all faction flags
            // [AUTOMATIC] Dynamically load all factions from data definition
            const factions = FACTIONS.map(f => f.id);

            for (const factionId of factions) {
                // Load flag body
                const flagUrl = CityAssetManager.getProcessedFlag(factionId);
                const flagImg = await loadImg(flagUrl);
                this.factionFlags.set(factionId, flagImg);

                // Load flag text (if exists)
                const textUrl = CityAssetManager.getProcessedFlagText(factionId);
                if (textUrl) {
                    const textImg = await loadImg(textUrl);
                    this.factionTexts.set(factionId, textImg);
                }
            }



            this.isLoaded = true;
            console.log('🚩 LegionFlagDrawer: Assets loaded for all factions');
        } catch (e) {
            console.error("Failed to load Legion flag assets", e);
        }
    }

    /**
     * Simple Chroma Key (Green Removal)
     */
    private static processImage(img: HTMLImageElement): HTMLImageElement {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

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
        newImg.src = canvas.toDataURL();
        return newImg;
    }

    /**
     * Draws only the pole (for layering underneath soldiers)
     */
    public static drawPole(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        scale: number,
        factionId: string = 'huaxia'
    ): void {
        if (!this.isLoaded) return;

        const body = this.factionFlags.get(factionId) || this.factionFlags.get('huaxia');
        if (!body) return;

        const baseSize = 60; // Reduced flag size
        const frameWidth = body.width / this.FRAME_COLS;
        const frameHeight = body.height / this.FRAME_ROWS;
        const flagRenderHeight = baseSize * scale;

        const poleRenderHeight = flagRenderHeight * (this.pole.height / frameHeight);
        const poleRenderWidth = poleRenderHeight * (this.pole.width / this.pole.height);

        const poleX = center.x - poleRenderWidth / 2;
        const poleY = center.y - poleRenderHeight;

        ctx.drawImage(
            this.pole,
            poleX, poleY, poleRenderWidth, poleRenderHeight
        );
    }

    /**
     * Draws the flag body and text (for layering on top of soldiers)
     */
    public static drawFlag(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        direction: number, // 0-7
        scale: number,
        tick: number,
        factionId: string = 'huaxia',
        year: number = -999 // [NEW] Year parameter for conditional text
    ): void {
        if (!this.isLoaded) return;

        const body = this.factionFlags.get(factionId) || this.factionFlags.get('huaxia');
        if (!body) return;

        const frameIndex = Math.floor(tick / 150) % this.FRAME_COLS;
        const frameWidth = body.width / this.FRAME_COLS;
        const frameHeight = body.height / this.FRAME_ROWS;
        const baseSize = 60; // Reduced flag size
        const flagRenderHeight = baseSize * scale;
        const flagRenderWidth = flagRenderHeight * (frameWidth / frameHeight);

        const poleRenderHeight = flagRenderHeight * (this.pole.height / frameHeight);
        const poleRenderWidth = poleRenderHeight * (this.pole.width / this.pole.height);
        const poleX = center.x - poleRenderWidth / 2;
        const poleY = center.y - poleRenderHeight;

        // === Draw Flag Body ===
        const facingLeft = direction >= 4 && direction <= 6;
        let flagX: number;
        if (facingLeft) {
            flagX = poleX + poleRenderWidth;
        } else if (direction === 3 || direction === 7) {
            flagX = poleX - flagRenderWidth / 2 + poleRenderWidth / 2;
        } else {
            flagX = poleX - flagRenderWidth;
        }

        let flagY: number;
        if (direction === 2 || direction === 3 || direction === 4) {
            flagY = poleY - flagRenderHeight * 0.3;
        } else {
            flagY = poleY + poleRenderHeight * 0.05;
        }

        const sx = frameIndex * frameWidth;
        const sy = direction * frameHeight;

        ctx.drawImage(
            body,
            sx, sy, frameWidth, frameHeight,
            flagX, flagY, flagRenderWidth, flagRenderHeight
        );

        // === Draw Text Overlay ===
        // [USER REQUEST] Hide text for Huihui faction after -227
        // [USER REQUEST] Hide text for Huaxia faction after -206
        // [USER REQUEST] Hide text for Huaxia faction after -206

        let text = this.factionTexts.get(factionId);



        if (text && direction !== 3 && direction !== 7) {
            const textFrameWidth = text.width / this.FRAME_COLS;
            const textFrameHeight = text.height / 6;

            let textRow = direction;
            if (direction >= 4) textRow = direction - 1;

            const textSx = frameIndex * textFrameWidth;
            const textSy = textRow * textFrameHeight;

            ctx.drawImage(
                text,
                textSx, textSy, textFrameWidth, textFrameHeight,
                flagX, flagY, flagRenderWidth, flagRenderHeight
            );
        }
    }

    public static draw(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        direction: number, // 0-7
        scale: number,
        tick: number,
        factionId: string = 'huaxia',
        year: number = -999 // [NEW] Pass through
    ): void {
        if (!this.isLoaded) return;
        this.drawPole(ctx, center, scale, factionId);
        this.drawFlag(ctx, center, direction, scale, tick, factionId, year);
    }
}
