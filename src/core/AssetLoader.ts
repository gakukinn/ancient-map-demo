/**
 * AssetLoader - 资源预加载器
 * 用于在游戏开始前预加载图片资源，防止白框闪烁
 */

export class AssetLoader {
    private static loadedImages: Map<string, HTMLImageElement> = new Map();
    private static loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

    /**
     * 预加载单张图片
     * @param url 图片 URL
     * @returns 加载完成的 HTMLImageElement
     */
    public static loadImage(url: string): Promise<HTMLImageElement> {
        // 如果已加载，直接返回
        const cached = this.loadedImages.get(url);
        if (cached) {
            return Promise.resolve(cached);
        }

        // 如果正在加载，返回现有 Promise
        const loading = this.loadingPromises.get(url);
        if (loading) {
            return loading;
        }

        // 创建新的加载 Promise
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages.set(url, img);
                this.loadingPromises.delete(url);
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(`[AssetLoader] ❌ 加载失败: ${url}`, err);
                this.loadingPromises.delete(url);
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });

        this.loadingPromises.set(url, promise);
        return promise;
    }

    /**
     * 批量预加载图片
     * @param urls 图片 URL 数组
     * @returns 全部加载完成的 Promise
     */
    public static async preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
        const promises = urls.map(url => this.loadImage(url).catch(() => null));
        const results = await Promise.all(promises);
        // 过滤掉加载失败的
        return results.filter((img): img is HTMLImageElement => img !== null);
    }

    /**
     * 获取已加载的图片
     * @param url 图片 URL
     * @returns HTMLImageElement 或 undefined
     */
    public static getImage(url: string): HTMLImageElement | undefined {
        return this.loadedImages.get(url);
    }

    /**
     * 检查图片是否已加载
     * @param url 图片 URL
     */
    public static isLoaded(url: string): boolean {
        return this.loadedImages.has(url);
    }

    /**
     * 清理所有缓存
     */
    public static clearCache(): void {
        this.loadedImages.clear();
        this.loadingPromises.clear();
    }
}
