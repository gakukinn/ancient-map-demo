import { AssetLoader } from '../core/AssetLoader';
import { SPRITE_PATHS } from '../config/GameConfig';

export type GeneralState = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGE' | 'DEATH';

export class GeneralDrawer {
    private static moveSprite: HTMLImageElement | null = null;
    private static idleSprite: HTMLImageElement | null = null;
    private static attackSprite: HTMLImageElement | null = null; // Reuses IDLE
    private static damageSprite: HTMLImageElement | null = null;
    private static isLoaded = false;

    /**
     * Preload and process
     */
    public static async preload(): Promise<void> {
        if (this.isLoaded) return;

        console.log('🔄 GeneralDrawer: Processing Sprites...');

        const paths = SPRITE_PATHS.GENERAL;

        // Load raw images
        await AssetLoader.preloadImages([
            paths.IDLE,
            paths.MOVE,
            paths.ATTACK,
            paths.DAMAGE
        ]);

        // Process Chroma Key
        this.idleSprite = await this.processImage(AssetLoader.getImage(paths.IDLE));
        this.moveSprite = await this.processImage(AssetLoader.getImage(paths.MOVE));
        this.attackSprite = await this.processImage(AssetLoader.getImage(paths.ATTACK));
        this.damageSprite = await this.processImage(AssetLoader.getImage(paths.DAMAGE));

        this.isLoaded = true;
        console.log('✅ GeneralDrawer: Ready');
    }

    private static processImage(img: HTMLImageElement | undefined): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            if (!img || !img.complete || img.naturalWidth === 0) {
                // Return dummy or resolve original if valid
                resolve(img as HTMLImageElement);
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

            // Chroma Key: Green (#00FF00)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Green Screen (Stricter to protect green flags)
                if (g > 100 && g > r + 60 && g > b + 60 && (r + b) < 200) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.onload = () => resolve(newImg);
            newImg.src = canvas.toDataURL();
        });
    }

    public static draw(
        ctx: CanvasRenderingContext2D,
        center: { x: number, y: number },
        state: GeneralState,
        direction: number, // 0-7
        scale: number,
        tick: number
    ): void {
        if (!this.isLoaded) return;

        let sprite = this.idleSprite;
        if (state === 'MOVE') sprite = this.moveSprite;
        else if (state === 'ATTACK') sprite = this.attackSprite; // Uses IDLE as per config
        else if (state === 'DAMAGE') sprite = this.damageSprite; // Fallback

        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        // 8x8 Grid
        const frameCount = 8;
        const dirCount = 8;
        const frameWidth = sprite.width / frameCount;
        const frameHeight = sprite.height / dirCount;

        // Animation
        const frameIndex = Math.floor(tick / 150) % frameCount;

        // Direction Map (Assuming standard row layout for directions)
        // Usually: 0-7 rows correspond to 8 directions
        // Need to match OrientationSystem indices
        // Assuming standard S10 sprite sheet layout:
        // [S, SW, W, NW, N, NE, E, SE] or similar?
        // Let's assume Standard MapWar mapping (which we used in BanditDrawer)
        // BanditDrawer line 160: const row = direction; 
        // Let's stick to that.

        // Render
        // Base Size similar to Bandit (60)
        const baseHeight = 60;
        const unitRatio = frameWidth / frameHeight;
        const width = baseHeight * unitRatio * scale;
        const height = baseHeight * scale;

        // Anchor: Center Bottom (Feet)
        // Bandit used 0.65 offset. Let's use similar.
        const drawX = center.x - width / 2;
        const drawY = center.y - height * 0.65; // Move up a bit so feet are at center

        // Remap direction: (Input + 1) % 8 -> Sprite Row
        const row = (direction + 1) % 8;

        ctx.drawImage(
            sprite,
            frameIndex * frameWidth, row * frameHeight, frameWidth, frameHeight,
            drawX, drawY,
            width, height
        );
    }
}
