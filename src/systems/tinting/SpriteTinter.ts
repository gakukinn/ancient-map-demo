/**
 * SpriteTinter.ts
 * 
 * Canvas精灵染色处理器。
 * 使用Canvas 2D API对精灵图应用颜色染色。
 */

import { TintColor, FactionTintSystem } from './FactionTintSystem';

/**
 * 精灵染色器
 */
export class SpriteTinter {
    // 缓存染色后的精灵图，避免每帧重复处理
    // Key: `${originalSrc}_${factionId}`
    private static tintedSpriteCache: Map<string, HTMLImageElement> = new Map();

    // 临时Canvas用于染色处理
    private static tempCanvas: HTMLCanvasElement | null = null;
    private static tempCtx: CanvasRenderingContext2D | null = null;

    /**
     * 获取染色后的精灵图
     * @param originalSprite 原始精灵图
     * @param factionId 势力ID
     * @returns 染色后的精灵图（如果不需要染色则返回原图）
     */
    public static getTintedSprite(
        originalSprite: HTMLImageElement,
        factionId: string
    ): HTMLImageElement {
        // 检查是否需要染色
        if (!FactionTintSystem.shouldTint(factionId)) {
            return originalSprite;
        }

        const tintColor = FactionTintSystem.getTintColor(factionId);
        if (!tintColor) {
            return originalSprite;
        }

        // 检查缓存
        const cacheKey = `${originalSprite.src}_${factionId}`;
        const cached = this.tintedSpriteCache.get(cacheKey);
        if (cached && cached.complete) {
            return cached;
        }

        // 如果原图未加载完成，返回原图
        if (!originalSprite.complete || originalSprite.naturalWidth === 0) {
            return originalSprite;
        }

        // 创建染色后的精灵
        const tintedSprite = this.applyTint(originalSprite, tintColor);
        this.tintedSpriteCache.set(cacheKey, tintedSprite);

        return tintedSprite;
    }

    /**
     * 应用染色到精灵图
     */
    private static applyTint(
        sprite: HTMLImageElement,
        tint: TintColor
    ): HTMLImageElement {
        // 初始化临时Canvas
        if (!this.tempCanvas) {
            this.tempCanvas = document.createElement('canvas');
            this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        }

        const canvas = this.tempCanvas!;
        const ctx = this.tempCtx!;

        canvas.width = sprite.width;
        canvas.height = sprite.height;

        // 1. 绘制原始图像
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sprite, 0, 0);

        // 2. 获取图像数据并应用染色
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha === 0) continue; // 跳过透明像素

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 计算染色颜色的亮度
            const tintBrightness = 0.299 * tint.r + 0.587 * tint.g + 0.114 * tint.b;
            // [优化] 阈值从 150 降至 20
            // 除了纯黑(秦)之外，所有彩色(蓝/红/绿等)都应视为"亮色"，
            // 从而走下方"阴影保护"逻辑，避免把黑色阴影染成彩色而丢失轮廓。
            const isLightTint = tintBrightness > 20;

            // [选择性染色]
            // 计算像素亮度 (0-255)
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            // 1. 保护高光区域（武器/金属光泽）
            // 保持原样，否则金属会看起来很假
            const highlightThreshold = 180;
            if (brightness > highlightThreshold) {
                continue;
            }

            // 2. 保护深色轮廓线 (Outline Preservation)
            // 如果是深色像素，且我们正在染浅色(如白色)，则必须保护轮廓
            // 否则黑色轮廓变成白色，单位就"隐身"了
            const outlineThreshold = 60;
            if (isLightTint && brightness < outlineThreshold) {
                // 如果是轮廓线，且染浅色，几乎不染色，保持原黑
                continue;
            }

            // 3. 计算自适应强度
            let adjustedIntensity = tint.intensity;

            if (isLightTint) {
                // [优化] 针对浅色(白/黄/粉)的阴影保护算法
                // 问题：染白色会把深灰色的阴影提亮变成浅灰，导致立体感丢失
                // 解决：根据像素亮度决定染色强度。越暗的像素，染色强度越低（保留原始黑色）

                // 归一化亮度 (0-1)
                const nBrightness = brightness / 255;

                // 使用幂函数曲线 (Power 1.5) 让暗部衰减得更快
                // 例如：亮度0.2(阴影) -> 强度系数 0.08 (几乎不染)
                //      亮度0.8(高光) -> 强度系数 0.71 (正常染)
                adjustedIntensity = tint.intensity * Math.pow(nBrightness, 1.5);

            } else {
                // 染深色时(如秦军黑)：
                // 越暗的地方染越少(本来就黑)
                // 越亮的地方染越多(把它变黑)
                // 原逻辑保持不变
                adjustedIntensity = tint.intensity * (1 - brightness / highlightThreshold * 0.7);
            }

            // 混合原始颜色和染色颜色
            // [Fix] 使用 brightness (灰度) 代替 r/g/b 进行混合
            // 这样可以去除原始素材的底色（蓝色），确保染色纯正
            // 例如：蓝底 + 红染 = 紫色 (旧) -> 灰底 + 红染 = 红色 (新)
            data[i] = Math.round(brightness * (1 - adjustedIntensity) + tint.r * adjustedIntensity);     // R
            data[i + 1] = Math.round(brightness * (1 - adjustedIntensity) + tint.g * adjustedIntensity); // G
            data[i + 2] = Math.round(brightness * (1 - adjustedIntensity) + tint.b * adjustedIntensity); // B
            // Alpha 保持不变
        }

        ctx.putImageData(imageData, 0, 0);

        // 3. 创建新的Image对象
        const tintedImage = new Image();
        tintedImage.src = canvas.toDataURL('image/png');

        return tintedImage;
    }

    /**
     * 清除缓存（当势力颜色改变时调用）
     */
    public static clearCache(): void {
        this.tintedSpriteCache.clear();
        console.log('🎨 [SpriteTinter] Cache cleared');
    }

    /**
     * 预处理特定势力的精灵图
     * 在游戏开始时调用以避免运行时延迟
     */
    public static async preloadTintedSprites(
        sprites: HTMLImageElement[],
        factionIds: string[]
    ): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const sprite of sprites) {
            for (const factionId of factionIds) {
                promises.push(new Promise<void>((resolve) => {
                    const tinted = this.getTintedSprite(sprite, factionId);
                    if (tinted.complete) {
                        resolve();
                    } else {
                        tinted.onload = () => resolve();
                        tinted.onerror = () => resolve();
                    }
                }));
            }
        }

        await Promise.all(promises);
        console.log('🎨 [SpriteTinter] Preloaded tinted sprites for', factionIds.length, 'factions');
    }
}
