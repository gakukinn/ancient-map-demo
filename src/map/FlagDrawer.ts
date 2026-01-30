import { SPRITE_PATHS } from '../config/GameConfig';

/**
 * FlagDrawer - Handles rendering of animated flags
 * Composites: Pole + Flag Body + Text Overlay
 */
export class FlagDrawer {
    private static pole: HTMLImageElement;
    private static body: HTMLImageElement;
    private static text: HTMLImageElement;
    private static isLoaded: boolean = false;

    // Dimensions
    private static FRAME_COLS = 4; // Animation frames
    private static FRAME_ROWS = 8; // Directions

    public static async preload(): Promise<void> {
        if (this.isLoaded) return;

        const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            // Chroma Key handling could be added here if needed, 
            // but usually flags transparent or we reuse processImage logic if generic
            img.src = src;
        });

        try {
            // Parallel load
            const [pole, body, text] = await Promise.all([
                loadImg(SPRITE_PATHS.PHALANX.FLAG.POLE),
                loadImg(SPRITE_PATHS.PHALANX.FLAG.BODY),
                loadImg(SPRITE_PATHS.PHALANX.FLAG.TEXT)
            ]);

            this.pole = this.processImage(pole); // Remove green bg
            this.body = this.processImage(body); // Remove green bg if any
            this.text = this.processImage(text); // Remove green bg
            this.isLoaded = true;
        } catch (e) {
            console.error("Failed to load flag assets", e);
        }
    }

    /**
     * Simple Chroma Key (Green Removal)
     * Copied/Adapted from PhalanxDrawer for consistency
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
        scale: number
    ): void {
        if (!this.isLoaded) return;

        const baseSize = 60; // Reduced flag size
        const frameWidth = this.body.width / this.FRAME_COLS;
        const frameHeight = this.body.height / this.FRAME_ROWS;
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
        direction: number,
        scale: number,
        tick: number
    ): void {
        if (!this.isLoaded) return;

        const frameIndex = Math.floor(tick / 150) % this.FRAME_COLS;
        const frameWidth = this.body.width / this.FRAME_COLS;
        const frameHeight = this.body.height / this.FRAME_ROWS;
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
            this.body,
            sx, sy, frameWidth, frameHeight,
            flagX, flagY, flagRenderWidth, flagRenderHeight
        );

        // === Draw Text Overlay ===
        if (this.text && direction !== 3 && direction !== 7) {
            const textFrameWidth = this.text.width / this.FRAME_COLS;
            const textFrameHeight = this.text.height / 6;

            let textRow = direction;
            if (direction >= 4) textRow = direction - 1;

            const textSx = frameIndex * textFrameWidth;
            const textSy = textRow * textFrameHeight;

            ctx.drawImage(
                this.text,
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
        tick: number
    ): void {
        if (!this.isLoaded) return;
        this.drawPole(ctx, center, scale);
        // Soldiers would be drawn here in between
        this.drawFlag(ctx, center, direction, scale, tick);
    }
}
