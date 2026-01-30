import L from 'leaflet';

import { GameMap } from '../map/GameMap';
import { getTilePath, latLngToTile, TILE_CONFIG } from './TileMapConfig';

/**
 * 地图颜色采样器
 * 从纯瓦片图层读取真实颜色
 */
export class MapColorSampler {
    private map: any;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private imageCache: Map<string, HTMLImageElement> = new Map();

    // [CACHE] 缓存已加载瓦片的 ImageData，避免重复调用 getImageData (性能杀手)
    // [CACHE] 缓存已加载瓦片的 ImageData，避免重复调用 getImageData (性能杀手)
    // null value indicates a persistent failure (e.g. CORS tainted)
    private tileDataCache: Map<string, ImageData | null> = new Map();

    constructor(gameMap: GameMap) {
        this.map = gameMap.getLeafletMap();
        this.initCanvas();
    }

    private initCanvas(): void {
        this.canvas = document.createElement('canvas');
        // 默认大小，后续会动态调整但尽量复用
        this.canvas.width = TILE_CONFIG.TILE_SIZE;
        this.canvas.height = TILE_CONFIG.TILE_SIZE;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    // [NEW] Static flag to prevent log spam
    private static hasLoggedSecurityError = false;

    /**
     * 获取指定瓦片的像素数据 (带缓存)
     */
    private getTileImageData(img: HTMLImageElement, url: string): ImageData | null {
        if (this.tileDataCache.has(url)) {
            return this.tileDataCache.get(url) ?? null;
        }

        if (!this.canvas || !this.ctx) return null;

        try {
            // 调整 canvas 大小以匹配图片 (通常是 512x512)
            if (this.canvas.width !== img.width || this.canvas.height !== img.height) {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);

            const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
            this.tileDataCache.set(url, imageData);
            return imageData;
        } catch (e) {
            if (!MapColorSampler.hasLoggedSecurityError) {
                console.warn('Failed to extract image data (SecurityError). This is likely due to CORS issues with map tiles. Further errors will be suppressed.', e);
                MapColorSampler.hasLoggedSecurityError = true;
            }
            // [OPTIMIZATION] Blacklist this URL so we don't spam try-catch
            this.tileDataCache.set(url, null);
            return null;
        }
    }

    /**
     * 异步获取指定坐标的颜色（支持未加载的瓦片）
     * 用于全图扫描 (Bake)
     */
    public async getColorAtAsync(lat: number, lng: number): Promise<{ r: number; g: number; b: number; variance: number } | null> {
        // 使用默认本地瓦片
        return this.getColorAtAsyncFromUrl(lat, lng);
    }

    /**
     * 从指定 URL 模板异步获取颜色
     * @param urlTemplate 瓦片URL模板，例如 'https://.../tile/{z}/{y}/{x}'
     */
    public async getColorAtAsyncFromUrl(
        lat: number,
        lng: number,
        urlTemplate?: string,
        targetZoom: number = 9,
        customTileSize?: number
    ): Promise<{ r: number; g: number; b: number; variance: number } | null> {
        try {
            // 1. 计算所属瓦片
            const zoom = targetZoom;
            const tile = latLngToTile(lat, lng, zoom);

            // 2. 获取瓦片路径
            let url: string | null;
            if (urlTemplate) {
                // 使用外部 URL 模板
                url = urlTemplate
                    .replace('{z}', String(zoom))
                    .replace('{y}', String(tile.y))
                    .replace('{x}', String(tile.x));
            } else {
                // 使用本地路径
                url = getTilePath(zoom, tile.x, tile.y);
            }
            if (!url) return null;

            // 3. 加载图片 (带缓存)
            let img = this.imageCache.get(url);
            if (!img) {
                try {
                    img = await this.loadImage(url);
                    this.imageCache.set(url, img);
                } catch (e) {
                    // 图片加载失败 (海洋等)
                    return null;
                }
            }

            // 4. 计算瓦片内的局部坐标
            // 瓦片大小 512 (但Leaflet显示为256，这里我们加载的是原图512)
            // 需要重新计算像素坐标
            const tileSize = customTileSize || (urlTemplate ? 256 : TILE_CONFIG.TILE_SIZE);

            // 计算该点在世界坐标系下的像素位置 (at zoom 9)
            // 公式: pixelX = ((lng + 180) / 360) * 2^zoom * tileSize
            const n = Math.pow(2, zoom);
            const x = ((lng + 180) / 360) * n * tileSize;

            const latRad = lat * Math.PI / 180;
            const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * tileSize;

            // 局部坐标 = 全局像素 % 瓦片大小
            const localX = Math.floor(x % tileSize);
            const localY = Math.floor(y % tileSize);

            return this.sampleImageColor(img, localX, localY, url);

        } catch (error) {
            // console.warn(`Async sampling failed for [${lat}, ${lng}]:`, error);
            return null;
        }
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // 尝试跨域，虽然本地可能不需要
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }

    public getColorAt(lat: number, lng: number): { r: number; g: number; b: number; variance: number } | null {
        try {
            const point = this.map.latLngToContainerPoint([lat, lng]);
            const mapContainer = this.map.getContainer();
            const tilePane = mapContainer.querySelector('.leaflet-tile-pane');

            if (!tilePane) return null;

            const tiles = tilePane.querySelectorAll('img.leaflet-tile');
            if (tiles.length === 0) return null;

            for (const tile of Array.from(tiles)) {
                const img = tile as HTMLImageElement;
                const rect = img.getBoundingClientRect();
                const containerRect = mapContainer.getBoundingClientRect();

                const relativeX = point.x;
                const relativeY = point.y;
                const tileX = rect.left - containerRect.left;
                const tileY = rect.top - containerRect.top;

                if (relativeX >= tileX && relativeX < tileX + rect.width &&
                    relativeY >= tileY && relativeY < tileY + rect.height) {

                    // 注意：DOM中的img可能是缩放过的 (256px)，而原图是 512px
                    // 需要根据比例转换坐标
                    const scaleX = img.naturalWidth / rect.width;
                    const scaleY = img.naturalHeight / rect.height;

                    const localX = (relativeX - tileX) * scaleX;
                    const localY = (relativeY - tileY) * scaleY;

                    return this.sampleImageColor(img, localX, localY, img.src);
                }
            }

            return null;
        } catch (error) {
            console.error('❌ 颜色采样失败:', error);
            return null;
        }
    }

    private sampleImageColor(img: HTMLImageElement, x: number, y: number, urlKey: string): { r: number; g: number; b: number; variance: number } | null {
        // [OPTIMIZATION] 使用缓存的 ImageData，避免同步 Canvas 读取
        const imageData = this.getTileImageData(img, urlKey);
        if (!imageData) return null;

        try {
            // [OPTIMIZATION] Reduced sample size from 100 to 12 (144 pixels vs 10,000 pixels)
            const sampleSize = 12; // 采样区域大小
            const halfSize = sampleSize / 2;
            const imgWidth = imageData.width;
            const imgHeight = imageData.height;

            // 确保采样中心不越界
            // 注意：x, y 是中心点
            let startX = Math.floor(x - halfSize);
            let startY = Math.floor(y - halfSize);

            // 边界截断
            if (startX < 0) startX = 0;
            if (startY < 0) startY = 0;
            if (startX + sampleSize > imgWidth) startX = imgWidth - sampleSize;
            if (startY + sampleSize > imgHeight) startY = imgHeight - sampleSize;

            // 安全检查：如果图片比采样框还小
            if (startX < 0 || startY < 0) return null;

            const data = imageData.data;
            let totalR = 0, totalG = 0, totalB = 0;
            let totalBrightness = 0;
            const brightnessList: number[] = [];

            // 遍历采样区域
            // data是平铺数组: [r, g, b, a, r, g, b, a, ...]
            for (let dy = 0; dy < sampleSize; dy++) {
                const rowOffset = (startY + dy) * imgWidth;
                for (let dx = 0; dx < sampleSize; dx++) {
                    const colOffset = startX + dx;
                    const index = (rowOffset + colOffset) * 4;

                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    // const a = data[index + 3]; 忽略透明度

                    totalR += r;
                    totalG += g;
                    totalB += b;

                    const brightness = (r + g + b) / 3;
                    totalBrightness += brightness;
                    brightnessList.push(brightness);
                }
            }

            const pixelCount = sampleSize * sampleSize;
            const avgR = Math.round(totalR / pixelCount);
            const avgG = Math.round(totalG / pixelCount);
            const avgB = Math.round(totalB / pixelCount);
            const avgBrightness = totalBrightness / pixelCount;

            // 计算方差
            let sumSquaredDiff = 0;
            for (const b of brightnessList) {
                const diff = b - avgBrightness;
                sumSquaredDiff += diff * diff;
            }
            const variance = Math.sqrt(sumSquaredDiff / pixelCount);

            return { r: avgR, g: avgG, b: avgB, variance };
        } catch (error) {
            console.warn('⚠️ 无法读取图片颜色', error);
            return null;
        }
    }
    /**
     * 清空图片缓存 (用于批量处理时释放内存)
     */
    public clearCache(): void {
        this.imageCache.clear();
        this.tileDataCache.clear();
    }
}
