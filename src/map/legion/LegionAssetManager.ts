import { AssetLoader } from '../../core/AssetLoader';
import { SPRITE_PATHS } from '../../config/GameConfig';
import { GeneralDrawer } from '../GeneralDrawer';

export class LegionAssetManager {
    // [DYNAMIC ASSET SYSTEM]
    // Key: unitAssetId (e.g. 'huaxia_infantry') -> Local Sprite Cache
    private static unitSpriteCache: Map<string, {
        MOVE: HTMLImageElement[],
        ATTACK: HTMLImageElement[],
        IDLE: HTMLImageElement[],
        DAMAGE: HTMLImageElement[],
        DEATH: HTMLImageElement[],
        SHOOT?: HTMLImageElement[],
        CHARGE?: HTMLImageElement[],
        SECONDARY?: {
            MOVE: HTMLImageElement[],
            ATTACK: HTMLImageElement[],
            IDLE: HTMLImageElement[],
            DAMAGE: HTMLImageElement[],
            DEATH: HTMLImageElement[],
            SHOOT: HTMLImageElement[]
        },
        TERTIARY?: {
            MOVE: HTMLImageElement[],
            ATTACK: HTMLImageElement[],
            IDLE: HTMLImageElement[],
            DAMAGE: HTMLImageElement[],
            DEATH: HTMLImageElement[],
            SHOOT: HTMLImageElement[]
        }
    }> = new Map();

    private static isLoaded = false;

    public static getAssets(key: string) {
        return this.unitSpriteCache.get(key);
    }

    public static hasLoaded(): boolean {
        return this.isLoaded;
    }

    public static async preload(): Promise<void> {
        if (this.isLoaded) return;

        const loadBatch = async (sourcePaths: readonly string[], targetArray: HTMLImageElement[]) => {
            await AssetLoader.preloadImages([...sourcePaths]);
            await Promise.all(sourcePaths.map(async (path, index) => {
                const img = AssetLoader.getImage(path);
                if (img) {
                    // [OPTIMIZATION] Skip processing for standard PNGs (already transparent)
                    if (path.includes('/assets/')) {
                        targetArray[index] = img;
                    } else {
                        const processed = await this.processImage(img);
                        targetArray[index] = processed;
                    }
                }
            }));
        };

        console.log('🔄 LegionAssetManager: Processing Dynamic Unit Assets...');

        // Load Granular Unit Assets from GameConfig.UNIT_ASSETS
        if (SPRITE_PATHS.UNIT_ASSETS) {
            for (const [key, assets] of Object.entries(SPRITE_PATHS.UNIT_ASSETS)) {
                const config = assets as any;
                const cacheEntry = {
                    MOVE: [] as HTMLImageElement[],
                    ATTACK: [] as HTMLImageElement[],
                    IDLE: [] as HTMLImageElement[],
                    DAMAGE: [] as HTMLImageElement[],
                    DEATH: [] as HTMLImageElement[],
                    SHOOT: [] as HTMLImageElement[],  // For mounted archers
                    CHARGE: [] as HTMLImageElement[], // For cavalry charge animation
                    SECONDARY: config.SECONDARY ? {
                        MOVE: [] as HTMLImageElement[],
                        ATTACK: [] as HTMLImageElement[],
                        IDLE: [] as HTMLImageElement[],
                        DAMAGE: [] as HTMLImageElement[],
                        DEATH: [] as HTMLImageElement[],
                        SHOOT: [] as HTMLImageElement[],
                        CHARGE: [] as HTMLImageElement[]
                    } : undefined,
                    TERTIARY: config.TERTIARY ? {
                        MOVE: [] as HTMLImageElement[],
                        ATTACK: [] as HTMLImageElement[],
                        IDLE: [] as HTMLImageElement[],
                        DAMAGE: [] as HTMLImageElement[],
                        DEATH: [] as HTMLImageElement[],
                        SHOOT: [] as HTMLImageElement[]
                    } : undefined
                };

                const promises = [
                    loadBatch(assets.MOVE, cacheEntry.MOVE),
                    loadBatch(assets.ATTACK, cacheEntry.ATTACK),
                    loadBatch(assets.IDLE, cacheEntry.IDLE),
                    loadBatch(assets.DAMAGE, cacheEntry.DAMAGE),
                    loadBatch(assets.DEATH, cacheEntry.DEATH),
                ];

                if (config.SHOOT) {
                    promises.push(loadBatch(config.SHOOT, cacheEntry.SHOOT));
                }
                if (config.CHARGE) {
                    promises.push(loadBatch(config.CHARGE, cacheEntry.CHARGE));
                }

                if (config.SECONDARY && cacheEntry.SECONDARY) {
                    promises.push(loadBatch(config.SECONDARY.MOVE, cacheEntry.SECONDARY.MOVE));
                    promises.push(loadBatch(config.SECONDARY.ATTACK, cacheEntry.SECONDARY.ATTACK));
                    promises.push(loadBatch(config.SECONDARY.IDLE, cacheEntry.SECONDARY.IDLE));
                    promises.push(loadBatch(config.SECONDARY.DAMAGE, cacheEntry.SECONDARY.DAMAGE));
                    promises.push(loadBatch(config.SECONDARY.DEATH, cacheEntry.SECONDARY.DEATH));
                    if (config.SECONDARY.SHOOT) {
                        promises.push(loadBatch(config.SECONDARY.SHOOT, cacheEntry.SECONDARY.SHOOT));
                    }
                    if (config.SECONDARY.CHARGE) {
                        promises.push(loadBatch(config.SECONDARY.CHARGE, cacheEntry.SECONDARY.CHARGE));
                    }
                }

                if (config.TERTIARY && (cacheEntry as any).TERTIARY) {
                    const tert = (cacheEntry as any).TERTIARY;
                    promises.push(loadBatch(config.TERTIARY.MOVE, tert.MOVE));
                    promises.push(loadBatch(config.TERTIARY.ATTACK, tert.ATTACK));
                    promises.push(loadBatch(config.TERTIARY.IDLE, tert.IDLE));
                    promises.push(loadBatch(config.TERTIARY.DAMAGE, tert.DAMAGE));
                    promises.push(loadBatch(config.TERTIARY.DEATH, tert.DEATH));
                    if (config.TERTIARY.SHOOT) {
                        promises.push(loadBatch(config.TERTIARY.SHOOT, tert.SHOOT));
                    }
                }

                await Promise.all(promises);
                this.unitSpriteCache.set(key, cacheEntry);
                console.log(`   Detailed asset loaded: ${key}`);
            }
        }

        // [Xiyang Legion] Manual Load Hook
        if (SPRITE_PATHS.UNIT_ASSETS['xiyang_legion']) {
            // Load S8YD (Movement - Stitched)
            await this.loadS8YDAssets('xiyang_legion', 1);
            // Load S8GJ (Attack/Idle/Charge - Pre-stitched Strips)
            await this.loadS8GJAssets('xiyang_legion');
        }

        // [NEW] Manually load PLAYER_GENERAL assets
        if ((SPRITE_PATHS as any).PLAYER_GENERAL) {
            const assets = (SPRITE_PATHS as any).PLAYER_GENERAL;
            const cacheEntry = {
                MOVE: [] as HTMLImageElement[],
                ATTACK: [] as HTMLImageElement[],
                IDLE: [] as HTMLImageElement[],
                DAMAGE: [] as HTMLImageElement[],
                DEATH: [] as HTMLImageElement[],
            };
            const promises = [
                loadBatch(assets.MOVE, cacheEntry.MOVE),
                loadBatch(assets.ATTACK, cacheEntry.ATTACK),
                loadBatch(assets.IDLE, cacheEntry.IDLE),
                loadBatch(assets.DAMAGE, cacheEntry.DAMAGE),
                loadBatch(assets.DEATH, cacheEntry.DEATH),
            ];
            await Promise.all(promises);
            this.unitSpriteCache.set('player_general', cacheEntry);
            console.log('   Stats: Loaded special PLAYER_GENERAL assets.');
        }

        // [Han Legion] Load S8YD (81-160)
        // Check if defined in config or forced (since we implemented it manually)
        if ((SPRITE_PATHS.UNIT_ASSETS as any)['han_legion']) {
            await this.loadS8YDAssets('han_legion', 81);
            await this.loadS8GJAssets('han_legion');
        }

        // [Yuenan Legion] Load S8YD (161-240)
        if ((SPRITE_PATHS.UNIT_ASSETS as any)['yuenan_legion']) {
            await this.loadS8YDAssets('yuenan_legion', 161);
            await this.loadS8GJAssets('yuenan_legion');
        }

        // [Quizngzang Legion] Load S8YD (241-320)
        if ((SPRITE_PATHS.UNIT_ASSETS as any)['qiangzang_legion']) {
            await this.loadS8YDAssets('qiangzang_legion', 241);
            await this.loadS8GJAssets('qiangzang_legion');
        }

        // [Zang Legion] Load S8YD (401-480)
        if ((SPRITE_PATHS.UNIT_ASSETS as any)['zang_legion']) {
            await this.loadS8YDAssets('zang_legion', 401);
            await this.loadS8GJAssets('zang_legion');
        }

        // [Gao Legion] Load S8YD (321-400)
        if ((SPRITE_PATHS.UNIT_ASSETS as any)['gao_legion']) {
            await this.loadS8YDAssets('gao_legion', 321);
            await this.loadS8GJAssets('gao_legion');
        }

        await GeneralDrawer.preload();
        this.isLoaded = true;
        console.log('✅ LegionAssetManager: All dynamic unit assets loaded.');
    }

    private static processImage(img: HTMLImageElement): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            if (!img.complete || img.naturalWidth === 0) {
                img.onload = () => this.processAndResolve(img, resolve);
                img.onerror = () => resolve(img);
            } else {
                this.processAndResolve(img, resolve);
            }
        });
    }

    private static processAndResolve(img: HTMLImageElement, resolve: (val: HTMLImageElement) => void) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(img); return; }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // [USER REQUEST] Green screen removal (Chroma Key)
        const rKey = data[0], gKey = data[1], bKey = data[2];
        const tolerance = 15;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (Math.abs(r - rKey) <= tolerance && Math.abs(g - gKey) <= tolerance && Math.abs(b - bKey) <= tolerance) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const out = new Image();
        out.onload = () => resolve(out);
        out.onerror = () => resolve(out);
        out.src = canvas.toDataURL();
    }

    /**
     * [S8YD Special Loader]
     * Loads raw frames (1.png...80.png) and stitches them into directional strips.
     * baseId: Starting ID for Group 0 (Default 1 for Xiyang, 81 for Han)
     */
    private static async loadS8YDAssets(key: string, baseId: number = 1) {
        const cacheEntry = this.unitSpriteCache.get(key) || {
            MOVE: [], ATTACK: [], IDLE: [], DAMAGE: [], DEATH: []
        };
        this.unitSpriteCache.set(key, cacheEntry); // Ensure set

        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                    console.warn(`Failed to load S8YD frame: ${src}`);
                    resolve(new Image()); // Fallback empty
                };
                img.src = src;
            });
        };

        const stitchStrip = async (startId: number, count: number): Promise<HTMLImageElement> => {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < count; i++) {
                frames.push(await loadImage(`/SUCAI/S8YD/${startId + i}-1.png`));
            }

            // Wait for all to load
            const loadedFrames = frames;

            // Check first frame for dimensions
            const w = loadedFrames[0].width;
            const h = loadedFrames[0].height;
            if (w === 0 || h === 0) return loadedFrames[0]; // Empty if failed

            const canvas = document.createElement('canvas');
            canvas.width = w * count;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                loadedFrames.forEach((frame, idx) => {
                    ctx.drawImage(frame, idx * w, 0);
                });

                // 2. Chroma Key Transparency (S8 Fix)
                // Assuming Top-Left pixel (0,0) is background color
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const rKey = data[0];
                const gKey = data[1];
                const bKey = data[2];

                const tolerance = 10; // Slight variance allowed

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    if (Math.abs(r - rKey) <= tolerance &&
                        Math.abs(g - gKey) <= tolerance &&
                        Math.abs(b - bKey) <= tolerance) {
                        data[i + 3] = 0; // Set Alpha to 0 (Transparent)
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
            const finalImg = new Image();
            return new Promise((resolve) => {
                finalImg.onload = () => resolve(finalImg);
                finalImg.onerror = () => resolve(finalImg);
                finalImg.src = canvas.toDataURL();
            });
        };

        const mapGroupToDir = [0, 1, 2, 3, 4, 5, 6, 7]; // All S8YD follow Xiyang standard

        for (let group = 0; group < 8; group++) {
            const startId = (group * 10) + baseId; // 1, 11, 21... or 81, 91...
            const strip = await stitchStrip(startId, 10);
            const gameDir = mapGroupToDir[group];
            cacheEntry.MOVE[gameDir] = strip;
        }

        // For now, reuse MOVE strips for other states to avoid blanks
        if (key === 'yuenan_legion' || key === 'qiangzang_legion' || key === 'zang_legion' || key === 'gao_legion') {
            cacheEntry.IDLE = [...cacheEntry.MOVE];
            cacheEntry.ATTACK = [...cacheEntry.MOVE];
            cacheEntry.DEATH = [...cacheEntry.MOVE];
            cacheEntry.DAMAGE = [...cacheEntry.MOVE];
        } else {
            // cacheEntry.IDLE = [...cacheEntry.MOVE]; // Overwritten by S8GJ
            // cacheEntry.ATTACK = [...cacheEntry.MOVE]; // Overwritten by S8GJ
            cacheEntry.DEATH = [...cacheEntry.MOVE]; // Still reuse MOVE for Death (or maybe Damage?)
            // cacheEntry.DAMAGE = [...cacheEntry.MOVE]; // Overwritten by S8GJ
        }
    }

    /**
     * [Han Legion S8GJ Loader]
     * Loads specific S8GJ ranges for Han Legion Combat.
     */
    private static async loadS8GJAssets_Han(key: string) {
        const cacheEntry = this.unitSpriteCache.get(key);
        if (!cacheEntry) return;

        // Helper: Process single strip
        const loadAndProcess = async (id: number): Promise<HTMLImageElement> => {
            const src = `/SUCAI/S8GJ/${id}-1.bmp`;
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = async () => {
                    // S8GJ often needs transparency processing
                    const processed = await this.processImage(img);
                    resolve(processed);
                };
                img.onerror = () => {
                    console.warn(`Failed to load S8GJ frame: ${src}`);
                    resolve(new Image());
                };
                img.src = src;
            });
        };

        const loadRange = async (startId: number, count: number, targetArray: HTMLImageElement[]) => {
            // User: Start=NE (User 0), Next=E (User 1)...
            // System: 3=NE, 2=E...
            const mapFileIdxToDir = [3, 2, 1, 0, 7, 6, 5, 4];
            for (let i = 0; i < count; i++) {
                const fileId = startId + i;
                const img = await loadAndProcess(fileId);
                const dir = mapFileIdxToDir[i];
                if (dir !== undefined) targetArray[dir] = img;
            }
        };

        // 1. Attack 1 (71-78) -> ATTACK & IDLE (Reuse)
        await loadRange(71, 8, cacheEntry.ATTACK);
        await loadRange(71, 8, cacheEntry.IDLE); // Reuse Attack for Idle (Stand ready)

        // 2. Attack 2 (79-86) -> SHOOT
        if (!cacheEntry.SHOOT) cacheEntry.SHOOT = [];
        await loadRange(79, 8, cacheEntry.SHOOT);

        // 3. Attack 3 (103-110) -> SECONDARY.ATTACK
        if (!cacheEntry.SECONDARY) {
            cacheEntry.SECONDARY = {
                MOVE: [], ATTACK: [], IDLE: [], DAMAGE: [], DEATH: [], SHOOT: []
            };
        }
        await loadRange(103, 8, cacheEntry.SECONDARY.ATTACK);

        // 4. Charge (111-118) -> CHARGE
        if (!cacheEntry.CHARGE) cacheEntry.CHARGE = [];
        await loadRange(111, 8, cacheEntry.CHARGE);

        console.log('✅ Han Legion S8GJ Assets Loaded');
    }

    /**
     * [S8GJ Loader]
     * Loads pre-stitched strips (10 or 20 frames) for Attack, Idle, Damage, Charge.
     * NOW SUPPORTS BOTH XIYANG AND HAN LEGIONS.
     */
    private static async loadS8GJAssets(key: string) {
        const cacheEntry = this.unitSpriteCache.get(key);
        if (!cacheEntry) return;

        // [CONFIG] Define ID Ranges and Mappings
        const CONFIG = {
            'xiyang_legion': {
                // Files: 7=Attack1, 31=Idle1, 23=Dmg1, 15=Attack2(Shoot), 47=Charge, 39=Attack3(Sec), 63=Idle2
                ranges: {
                    ATTACK: 7,
                    IDLE: 31,
                    DAMAGE: 23,
                    SHOOT: 15,
                    CHARGE: 47,
                    SEC_ATTACK: 39,
                    SEC_IDLE: 63
                },
                // Standard System Mapping (0=S...7=SW) ?? Actually Xiyang uses 0=NE? 
                // Wait, previous code said Xiyang used [0,1,2,3...] and it worked.
                // Assuming Xiyang files are ordered matching Game Directions.
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            'han_legion': {
                // Files (User): 71=Attack1, 79=Attack2(Shoot), 103=Attack3(Sec), 111=Charge
                ranges: {
                    ATTACK: 71,
                    IDLE: 71, // Reuse Attack
                    DAMAGE: -1,
                    SHOOT: 79,
                    CHARGE: 111,
                    SEC_ATTACK: 103, // Attack 3
                    SEC_IDLE: -1
                },
                // User Files: Now assumed to follow Xiyang standard [0=S, 1=SE...]
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            'yuenan_legion': {
                // Files (User): 135=Attack1, 143=Attack2(Shoot), 167=Attack3(Sec), 175=Charge
                ranges: {
                    ATTACK: 135,
                    IDLE: 135, // Reuse Attack
                    DAMAGE: -1,
                    SHOOT: 143,
                    CHARGE: 175,
                    SEC_ATTACK: 167,
                    SEC_IDLE: -1
                },
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            'qiangzang_legion': {
                // Files (User): 199=Attack1, 207=Attack2(Shoot), 231=Attack3(Sec), 239=Charge
                ranges: {
                    ATTACK: 199,
                    IDLE: 199, // Reuse Attack
                    DAMAGE: -1,
                    SHOOT: 207,
                    CHARGE: 239,
                    SEC_ATTACK: 231,
                    SEC_IDLE: -1
                },
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            'gao_legion': {
                // Files (User): 263=Attack1, 271=Attack2(Shoot), 295=Attack3(Sec), 303=Charge
                ranges: {
                    ATTACK: 263,
                    IDLE: 263, // Reuse Attack
                    DAMAGE: -1,
                    SHOOT: 271,
                    CHARGE: 303,
                    SEC_ATTACK: 295,
                    SEC_IDLE: -1
                },
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            'zang_legion': {
                // Files (User): 327=Attack1, 335=Attack2(Shoot), 359=Attack3(Sec), 367=Charge
                ranges: {
                    ATTACK: 327,
                    IDLE: 327, // Reuse Attack
                    DAMAGE: -1,
                    SHOOT: 335,
                    CHARGE: 367,
                    SEC_ATTACK: 359,
                    SEC_IDLE: -1
                },
                mapping: [0, 1, 2, 3, 4, 5, 6, 7]
            }
        };

        const cfg = (CONFIG as any)[key];
        if (!cfg) return;

        // Helper: Process single strip (Load -> ChromaKey -> Return)
        const loadAndProcess = async (id: number): Promise<HTMLImageElement> => {
            const src = `/SUCAI/S8GJ/${id}-1.bmp`;
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = async () => {
                    const processed = await this.processImage(img);
                    resolve(processed);
                };
                img.onerror = () => {
                    console.warn(`Failed to load S8GJ frame: ${src}`);
                    resolve(new Image());
                };
                img.src = src;
            });
        };

        const loadRange = async (startId: number, count: number, targetArray: HTMLImageElement[]) => {
            if (startId === -1) return; // Skip if disable

            const mapFileIdxToDir = cfg.mapping;

            for (let i = 0; i < count; i++) {
                const fileId = startId + i;
                const img = await loadAndProcess(fileId);
                const dir = mapFileIdxToDir[i];
                if (dir !== undefined) {
                    targetArray[dir] = img;
                }
            }
        };

        // 1. Attack / Idle / Damage
        await loadRange(cfg.ranges.ATTACK, 8, cacheEntry.ATTACK);
        await loadRange(cfg.ranges.IDLE, 8, cacheEntry.IDLE);
        await loadRange(cfg.ranges.DAMAGE, 8, cacheEntry.DAMAGE);

        // 2. Shoot
        if (!cacheEntry.SHOOT) cacheEntry.SHOOT = [];
        await loadRange(cfg.ranges.SHOOT, 8, cacheEntry.SHOOT);

        // 3. Charge
        if (!cacheEntry.CHARGE) cacheEntry.CHARGE = [];
        await loadRange(cfg.ranges.CHARGE, 8, cacheEntry.CHARGE);

        // 4. Secondary
        if (cfg.ranges.SEC_ATTACK > 0 || cfg.ranges.SEC_IDLE > 0) {
            if (!cacheEntry.SECONDARY) {
                cacheEntry.SECONDARY = {
                    MOVE: [], ATTACK: [], IDLE: [], DAMAGE: [], DEATH: [], SHOOT: []
                };
            }
            if (cfg.ranges.SEC_ATTACK > 0) await loadRange(cfg.ranges.SEC_ATTACK, 8, cacheEntry.SECONDARY.ATTACK);
            if (cfg.ranges.SEC_IDLE > 0) await loadRange(cfg.ranges.SEC_IDLE, 8, cacheEntry.SECONDARY.IDLE);
        }

        console.log(`✅ S8GJ Assets Loaded for ${key}`);
    }
}
