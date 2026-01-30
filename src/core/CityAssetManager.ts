/**
 * Manages static assets for cities, specifically Flag generation and processing.
 * Isolates image processing logic from game logic.
 */
export class CityAssetManager {
    // Flag asset paths - CLEARED per user request
    private static readonly flagPolePath = ''; // Placeholder

    private static readonly factionFlagMap: { [key: string]: string } = {
        // Cleared /SUCAI/ references
    };

    // NOTE: Cleared text overlay paths
    private static readonly factionFlagTextMap: { [key: string]: string } = {
        // Cleared /SUCAI/ references
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
