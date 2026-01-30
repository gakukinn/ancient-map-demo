/**
 * Manages static assets for cities, specifically Flag generation and processing.
 * Isolates image processing logic from game logic.
 */
import { resolvePath } from '../utils/PathUtils';

export class CityAssetManager {
    // Flag asset paths - RESTORED from CityManager.ts.bak
    private static readonly flagPolePath = resolvePath('/SUCAI/S10QZ/1-1.png');

    private static readonly factionFlagMap: { [key: string]: string } = {
        'huaxia': resolvePath('/SUCAI/S10QZ/15-1.png'),
        'zhonghua': resolvePath('/SUCAI/S10QZ/9-1.png'),
        'tianchao': resolvePath('/SUCAI/S10QZ/7-1.png'),
        'chaoxian': resolvePath('/SUCAI/S10QZ/8-1.png'),
        'caowei': resolvePath('/SUCAI/S10QZ/43-1.png'),
        //'tianchao': resolvePath('/SUCAI/S10QZ/43-1.png'),
        //'jin': resolvePath('/SUCAI/S10QZ/7-1.png'),


        'manzhou': resolvePath('/SUCAI/S10QZ/10-1.png'),
        'xiyang': resolvePath('/SUCAI/S10QZ/11-1.png'),
        'xiyu': resolvePath('/SUCAI/S10QZ/12-1.png'),
        'panjun': resolvePath('/SUCAI/S10QZ/13-1.png'),
        'yuenan': resolvePath('/SUCAI/S10QZ/14-1.png'),
        'song': resolvePath('/SUCAI/S10QZ/16-1.png'),

        //'chaoxian': resolvePath('/SUCAI/S10QZ/17-1.png'),
        'qiangzang': resolvePath('/SUCAI/S10QZ/19-1.png'),
        'gan': resolvePath('/SUCAI/S10QZ/20-1.png'),
        'zhou': resolvePath('/SUCAI/S10QZ/21-1.png'),
        'jue': resolvePath('/SUCAI/S10QZ/23-1.png'),
        'dianmian': resolvePath('/SUCAI/S10QZ/24-1.png'),
        //'sui': resolvePath('/SUCAI/S10QZ/25-1.png'),
        //'zhu': resolvePath('/SUCAI/S10QZ/26-1.png'),
        'zang': resolvePath('/SUCAI/S10QZ/27-1.png'),
        'shu': resolvePath('/SUCAI/S10QZ/29-1.png'),
        'qi': resolvePath('/SUCAI/S10QZ/30-1.png'),

        'liang_x': resolvePath('/SUCAI/S10QZ/32-1.png'), // Added liang_x
        'shang': resolvePath('/SUCAI/S10QZ/33-1.png'),
        //'tang': resolvePath('/SUCAI/S10QZ/34-1.png'),
        'e': resolvePath('/SUCAI/S10QZ/38-1.png'),
        'liang': resolvePath('/SUCAI/S10QZ/39-1.png'),

        //'chu': resolvePath('/SUCAI/S10QZ/41-1.png'),
        'riben': resolvePath('/SUCAI/S10QZ/42-1.png'),

        'huihui': resolvePath('/SUCAI/S10QZ/44-1.png'),
        'han_x': resolvePath('/SUCAI/S10QZ/45-1.png'), // Added han_x
        //'yuan': resolvePath('/SUCAI/S10QZ/46-1.png'),

        'tian': resolvePath('/SUCAI/S10QZ/48-1.png'),
        'nan': resolvePath('/SUCAI/S10QZ/49-1.png'),
        'qu': resolvePath('/SUCAI/S10QZ/50-1.png'),
        'shi': resolvePath('/SUCAI/S10QZ/51-1.png'),
        'min': resolvePath('/SUCAI/S10QZ/52-1.png'),
        'yue': resolvePath('/SUCAI/S10QZ/54-1.png'),
        'gao': resolvePath('/SUCAI/S10QZ/55-1.png'),

        'xia': resolvePath('/SUCAI/S10QZ/57-1.png'),



    };

    // NOTE: Only 'huaxia' has a text overlay in the original
    private static readonly factionFlagTextMap: { [key: string]: string } = {
        'zhonghua': resolvePath('/SUCAI/S10QZ/240-1.png'),
        'yuan': resolvePath('/SUCAI/S10QZ/yuan-2.png'),
        'tianchao': resolvePath('/SUCAI/S10QZ/241-1.png'),
        'chaoxian': resolvePath('/SUCAI/S10QZ/239-1.png'),
        'huihui': resolvePath('/SUCAI/S10QZ/171-1.png'),
        'caowei': resolvePath('/SUCAI/S10QZ/89-1.png'),
        'qiangzang': resolvePath('/SUCAI/S10QZ/81-1.png'),
        'yuenan': resolvePath('/SUCAI/S10QZ/243-1.png'),

        'tian': resolvePath('/SUCAI/S10QZ/tian-2.png'),
        //'zhu': resolvePath('/SUCAI/S10QZ/129-1.png'),
        'liang_x': resolvePath('/SUCAI/S10QZ/226-1.png'),
        //'han_x': resolvePath('/SUCAI/S10QZ/81-1.png'),
        'huaxia': resolvePath('/SUCAI/S10QZ/352-1.png'),
        'manzhou': resolvePath('/SUCAI/S10QZ/100-1.png'),
        //'zhonghua': resolvePath('/SUCAI/S10QZ/258-1.png'),
        //'tianchao': resolvePath('/SUCAI/S10QZ/106-1.png'),
        //'qiangzang': resolvePath('/SUCAI/S10QZ/236-1.png'),
        //'yuenan': resolvePath('/SUCAI/S10QZ/235-1.png'),
        //'jin': resolvePath('/SUCAI/S10QZ/244-1.png'),
        //'tang': resolvePath('/SUCAI/S10QZ/183-1.png'),
        'song': resolvePath('/SUCAI/S10QZ/159-1.png'),
        'riben': resolvePath('/SUCAI/S10QZ/234-1.png'),
        'xia': resolvePath('/SUCAI/S10QZ/78-1.png'),
        'shang': resolvePath('/SUCAI/S10QZ/259-1.png'),
        'zhou': resolvePath('/SUCAI/S10QZ/131-1.png'),
        'shu': resolvePath('/SUCAI/S10QZ/233-1.png'),
        //'qi': resolvePath('/SUCAI/S10QZ/240-1.png'),
        //'chu': resolvePath('/SUCAI/S10QZ/241-1.png'),
        'liang': resolvePath('/SUCAI/S10QZ/242-1.png'),
        //'sui': resolvePath('/SUCAI/S10QZ/261-1.png'),
        'dianmian': resolvePath('/SUCAI/S10QZ/411-1.png'),
        'xiyu': resolvePath('/SUCAI/S10QZ/317-1.png'),
        'xiyang': resolvePath('/SUCAI/S10QZ/148-1.png'),
        'zang': resolvePath('/SUCAI/S10QZ/160-1.png'),
        'jue': resolvePath('/SUCAI/S10QZ/60-1.png'),
        'nan': resolvePath('/SUCAI/S10QZ/238-1.png'),
        'e': resolvePath('/SUCAI/S10QZ/74-1.png'),
        'qu': resolvePath('/SUCAI/S10QZ/448-1.png'),
        'shi': resolvePath('/SUCAI/S10QZ/253-1.png'),
        'min': resolvePath('/SUCAI/S10QZ/270-1.png'),
        'gan': resolvePath('/SUCAI/S10QZ/85-1.png'),
        //'yue': resolvePath('/SUCAI/S10QZ/243-1.png'),
        'gao': resolvePath('/SUCAI/S10QZ/109-1.png'),
    };

    // Cache for processed images (Blob URLs)
    private static processedFlagCache: Map<string, string> = new Map();
    private static flagsLoaded = false;



    /**
     * Preload and process all flag images with chroma key (green removal).
     * Optimized: Only process needed factions to reduce startup lag.
     */
    public static async preloadFlags(neededFactions?: string[]): Promise<void> {
        if (this.flagsLoaded) return;

        console.log(`🚩 [CityAssetManager] Preloading flags... Filter: ${neededFactions ? neededFactions.length + ' factions' : 'ALL'}`);

        // Include flag pole (always needed)
        const flagPaths = [this.flagPolePath];



        // Core factions that should always be loaded (e.g. rebels, common ones)
        const coreFactions = ['panjun'];

        // Determine which factions to load
        const factionsToLoad = new Set<string>(coreFactions);
        if (neededFactions) {
            neededFactions.forEach(f => factionsToLoad.add(f));
        } else {
            // If no filter, load all keys
            Object.keys(this.factionFlagMap).forEach(f => factionsToLoad.add(f));
        }

        // Collect paths
        factionsToLoad.forEach(factionId => {
            if (this.factionFlagMap[factionId]) {
                flagPaths.push(this.factionFlagMap[factionId]);
            }
            if (this.factionFlagTextMap[factionId]) {
                flagPaths.push(this.factionFlagTextMap[factionId]);
            }
        });

        // Unique paths only
        const uniquePaths = [...new Set(flagPaths)];
        console.log(`🚩 [CityAssetManager] Processing ${uniquePaths.length} unique flag assets...`);

        const startTime = performance.now();
        await Promise.all(uniquePaths.map(async (path) => {
            try {
                const dataUrl = await this.chromaKeyImage(path);
                this.processedFlagCache.set(path, dataUrl);
            } catch (e) {
                console.error(`Failed to process flag: ${path}`, e);
                // Fallback to original if processing fails
                this.processedFlagCache.set(path, path);
            }
        }));

        const duration = performance.now() - startTime;
        this.flagsLoaded = true;
        console.log(`🚩 [CityAssetManager] Flag assets processed in ${duration.toFixed(0)}ms`);
    }

    /**
     * Get processed flag data URL for a faction.
     */
    public static getProcessedFlag(factionId: string): string {
        const path = this.factionFlagMap[factionId] || this.factionFlagMap['panjun'];
        return this.processedFlagCache.get(path) || path;
    }

    /**
     * Get processed flag TEXT data URL for a faction (optional).
     */
    public static getProcessedFlagText(factionId: string): string | null {
        const path = this.factionFlagTextMap[factionId];
        if (!path) return null;
        return this.processedFlagCache.get(path) || path;
    }

    /**
     * Get processed pole image.
     */
    public static getProcessedPole(): string {
        return this.processedFlagCache.get(this.flagPolePath) || this.flagPolePath;
    }

    /**
     * Apply chroma key to remove green background from image.
     */
    private static async chromaKeyImage(src: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
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

                    // Green Screen (Modified to be much stricter)
                    // Target: Bright digital green background (approx 0,255,0)
                    // Avoid removing actual green flag colors (usually darker or less saturated)
                    if (g > 220 && (g - r) > 100 && (g - b) > 100) {
                        data[i + 3] = 0; // Alpha 0
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = src;
        });
    }
}
