
import * as L from 'leaflet';
import { roadRegistry } from '../core/RoadRegistry';
import { GridSystem } from '../systems/GridSystem';
import * as RegionSystem from '../systems/RegionSystem';
import { MAP_LAYER_ZINDEX } from '../config/MapLayers';

/**
 * RoadLayer - High Performance Canvas Overlay
 * 
 * 使用单一的全屏 Canvas 覆盖层来绘制道路。
 * 相比 DOM 方案：大幅减少 DOM 节点，提高性能。
 * 相比 GridLayer 方案：避免复杂的瓦片坐标投影问题，直接使用 Leaflet 的 latLngToLayerPoint。
 */
export class RoadLayer extends L.Layer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    // @ts-ignore: Leaflet internal property
    protected _map: L.Map;

    // 纹理缓存
    private static textureCache: Record<string, HTMLCanvasElement[]> = {};
    private static isInitialized = false;
    private static initPromise: Promise<void> | null = null;

    // 原始纹理配置
    private static readonly ROAD_TEXTURES = {
        central: ['/daolu/road_central.png'],
        desert: ['/daolu/road_desert.png'],
        south: ['/daolu/road_south.png'],
        steppe: ['/daolu/road_steppe.png'],
        snow: ['/daolu/road_snow.png']
    };

    constructor(options?: L.LayerOptions) {
        super(options);
        this.canvas = L.DomUtil.create('canvas', 'road-layer-canvas');
        this.ctx = this.canvas.getContext('2d')!;
    }

    public onAdd(map: L.Map): this {
        this._map = map;

        // 确保 Pane 存在
        if (!map.getPane('roadPane')) {
            map.createPane('roadPane');
            const pane = map.getPane('roadPane');
            if (pane) {
                pane.style.zIndex = MAP_LAYER_ZINDEX.CONNECTIONS.toString();
                pane.style.pointerEvents = 'none';
            }
        }

        // 添加 Canvas 到 Pane
        map.getPane('roadPane')?.appendChild(this.canvas);

        // 绑定事件
        map.on('moveend zoomend resize viewreset', this._update, this);

        // 如果纹理未初始化，先初始化
        if (!RoadLayer.isInitialized) {
            RoadLayer.initTextures().then(() => {
                this._update();
            });
        } else {
            this._update();
        }

        return this;
    }

    public onRemove(map: L.Map): this {
        map.getPane('roadPane')?.removeChild(this.canvas);
        map.off('moveend zoomend resize viewreset', this._update, this);
        // @ts-ignore
        this._map = null;
        return this;
    }

    // 公开方法：强制重绘
    public redraw(): void {
        this._update();
    }

    private _update(): void {
        if (!this._map) return;

        const map = this._map;
        const size = map.getSize();
        const pixelOrigin = map.getPixelOrigin();
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        // [USER REQUEST] Hide roads at zoom 4 and below (World View)
        // Zoom 5+ = Roads visible
        if (zoom < 5) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        // 调整 Canvas 大小以匹配视口
        // 注意：这里简单处理，每次都重设大小会清空画布
        if (this.canvas.width !== size.x || this.canvas.height !== size.y) {
            this.canvas.width = size.x;
            this.canvas.height = size.y;
            this.canvas.style.width = `${size.x}px`;
            this.canvas.style.height = `${size.y}px`;
        } else {
            this.ctx.clearRect(0, 0, size.x, size.y);
        }

        // 设置 Canvas 位置 (对于 Pane 里的绝对定位 Canvas)
        L.DomUtil.setPosition(this.canvas, map.containerPointToLayerPoint([0, 0]));

        if (!RoadLayer.isInitialized) return;

        // 开始绘制
        const customHexes = roadRegistry.getCustomRoadHexes();
        const drawnConnections = new Set<string>();

        // 性能统计
        // console.time('RoadDraw');
        let drawCount = 0;
        const paddedBounds = bounds.pad(0.1); // Cache bounds

        // [OPTIMIZED] Spatial Query - Iterate viewport bounds instead of all roads
        // This changes complexity from O(TotalRoads) to O(VisibleHexes)
        // Eliminates O(N) string splitting and float parsing per frame.

        const nw = bounds.getNorthWest();
        const se = bounds.getSouthEast();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        // Convert viewport corners to Axial Coords
        const c1 = GridSystem.latLngToAxial(nw.lat, nw.lng);
        const c2 = GridSystem.latLngToAxial(se.lat, se.lng);
        const c3 = GridSystem.latLngToAxial(ne.lat, ne.lng);
        const c4 = GridSystem.latLngToAxial(sw.lat, sw.lng);

        // Calculate bounding box in Q,R space
        // Add padding to ensure we catch segments crossing the edge
        const PADDING = 2;
        const qMin = Math.min(c1.q, c2.q, c3.q, c4.q) - PADDING;
        const qMax = Math.max(c1.q, c2.q, c3.q, c4.q) + PADDING;
        const rMin = Math.min(c1.r, c2.r, c3.r, c4.r) - PADDING;
        const rMax = Math.max(c1.r, c2.r, c3.r, c4.r) + PADDING;

        // Iterate potential hexes in view
        for (let q = qMin; q <= qMax; q++) {
            for (let r = rMin; r <= rMax; r++) {
                const key = `${q},${r}`;

                // Fast lookup - O(1)
                if (!roadRegistry.isOnRoad(key)) continue;

                // [OPTIMIZATION] Calculate LatLng only for visible roads
                const currentLatLng = GridSystem.axialToLatLng(q, r);


                const neighbors = GridSystem.getNeighborAxialCoords(q, r);

                for (const neighbor of neighbors) {
                    const nKey = `${neighbor.q},${neighbor.r}`;

                    if (customHexes.has(nKey)) {
                        // 确保每段路只画一次
                        const segmentKey = key < nKey ? `${key}-${nKey}` : `${nKey}-${key}`;
                        if (drawnConnections.has(segmentKey)) continue;
                        drawnConnections.add(segmentKey);

                        const neighborLatLng = GridSystem.axialToLatLng(neighbor.q, neighbor.r);

                        // Note: Since currentLatLng is inside bounds (checked above), at least one point is visible.
                        // So we draw any connected segment rooted in visible area.

                        // 稳定的方向计算 (保证纹理方向一致)
                        const isOrdered = Math.abs(currentLatLng.lng - neighborLatLng.lng) > 0.0001
                            ? currentLatLng.lng < neighborLatLng.lng
                            : currentLatLng.lat < neighborLatLng.lat;

                        const startLatLng = isOrdered ? currentLatLng : neighborLatLng;
                        const endLatLng = isOrdered ? neighborLatLng : currentLatLng;

                        // [FIX] Use Layer Points relative to Canvas Origin (TopLeft)
                        // This is more robust than latLngToContainerPoint which can drift from map pane transforms
                        const topLeft = map.containerPointToLayerPoint([0, 0]);
                        const p1Layer = map.latLngToLayerPoint(startLatLng);
                        const p2Layer = map.latLngToLayerPoint(endLatLng);

                        // Subtract TopLeft to get coordinates relative to the canvas
                        const p1 = p1Layer.subtract(topLeft);
                        const p2 = p2Layer.subtract(topLeft);

                        // 绘制参数
                        const dist = p1.distanceTo(p2);
                        const LENGTH = dist * 1.3;
                        const BASE_THICKNESS = 100;
                        const zoomScale = Math.pow(1.5, zoom - 11);
                        const THICKNESS = BASE_THICKNESS * zoomScale;

                        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

                        // 纹理选择
                        const midLat = (startLatLng.lat + endLatLng.lat) / 2;
                        const midLng = (startLatLng.lng + endLatLng.lng) / 2;
                        const region = this.getRegion(midLat, midLng);
                        const textures = RoadLayer.textureCache[region];

                        if (!textures || textures.length === 0) return;

                        let hash = 0;
                        for (let i = 0; i < segmentKey.length; i++) {
                            hash = ((hash << 5) - hash) + segmentKey.charCodeAt(i);
                            hash |= 0;
                        }
                        const texIndex = Math.abs(hash) % textures.length;
                        const texture = textures[texIndex];

                        // 绘制到 Canvas
                        this.ctx.save();
                        const midX = (p1.x + p2.x) / 2;
                        const midY = (p1.y + p2.y) / 2;

                        this.ctx.translate(midX, midY);
                        this.ctx.rotate(angle);

                        // 翻转处理 (防止文字倒置，虽然这里是路纹理，但保持一致性)
                        const angleDeg = angle * 180 / Math.PI;
                        if (Math.abs(angleDeg) > 90) this.ctx.scale(1, -1);

                        this.ctx.drawImage(texture, -LENGTH / 2, -THICKNESS / 2, LENGTH, THICKNESS);
                        this.ctx.restore();

                        drawCount++;
                    }
                }
            }
        }
        // console.timeEnd('RoadDraw');
        // console.log(`[RoadLayer] Drew ${drawCount} segments`);
    }

    // ================== Texture Initialization & Helpers ==================
    // (这是从之前的代码复制过来的逻辑，稍微整理)

    // ================== Texture Initialization & Helpers ==================

    public static async initTextures(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        console.time('RoadLayer_InitTextures');
        const regions = Object.keys(this.ROAD_TEXTURES) as Array<keyof typeof this.ROAD_TEXTURES>;

        this.initPromise = (async () => {
            // [OPTIMIZATION-CACHE] Try loading from IndexedDB first
            const cachedTextures = await this.loadFromCache(regions);
            if (cachedTextures) {
                this.textureCache = cachedTextures;
                this.isInitialized = true;
                console.timeEnd('RoadLayer_InitTextures');
                console.log('🛣️ [RoadLayer] Loaded textures from IndexedDB cache!');
                return;
            }

            console.log('⚙️ [RoadLayer] Building texture cache (First Run)...');

            // 1. Load all images first (Parallel IO)
            const loadedImages: { region: string, index: number, img: HTMLImageElement }[] = [];

            await Promise.all(regions.flatMap(region =>
                this.ROAD_TEXTURES[region].map(async (url, index) => {
                    const img = await this.loadImage(url);
                    loadedImages.push({ region: region as string, index, img });
                })
            ));

            // 2. Bake sequentially with yields
            for (const item of loadedImages) {
                await new Promise(resolve => requestAnimationFrame(resolve));
                const baked = this.bakeTexture(item.img, item.region);
                if (!this.textureCache[item.region]) this.textureCache[item.region] = [];
                this.textureCache[item.region][item.index] = baked;
            }

            // [OPTIMIZATION-CACHE] Save to IndexedDB
            this.saveToCache(this.textureCache);

            this.isInitialized = true;
            console.timeEnd('RoadLayer_InitTextures');
            console.log(`[RoadLayer] Baked textures for ${regions.length} regions.`);
        })();

        return this.initPromise;
    }

    // --- IndexedDB Cache System ---
    private static DB_NAME = 'MapWarCache';
    private static STORE_NAME = 'RoadTextures';
    private static DB_VERSION = 1;

    private static openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME); // Key-Value store
                }
            };
        });
    }

    private static async loadFromCache(regions: string[]): Promise<typeof this.textureCache | null> {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);

            const cacheObj: typeof this.textureCache = {};
            let missing = false;

            const promises = regions.map(region => new Promise<void>((resolve) => {
                const req = store.get(region);
                req.onsuccess = async () => {
                    const blobs: Blob[] = req.result;
                    if (!blobs || !Array.isArray(blobs)) {
                        missing = true;
                        resolve();
                        return;
                    }
                    // Convert Blobs back to Canvases
                    cacheObj[region] = await Promise.all(blobs.map(blob => this.blobToCanvas(blob)));
                    resolve();
                };
                req.onerror = () => { missing = true; resolve(); };
            }));

            await Promise.all(promises);
            return missing ? null : cacheObj;
        } catch (e) {
            console.warn('[RoadLayer] Cache load failed:', e);
            return null;
        }
    }

    private static async saveToCache(cache: typeof this.textureCache): Promise<void> {
        try {
            // [FIX] Convert to Blobs BEFORE opening transaction
            // Async operations (toBlob) inside a transaction cause it to auto-commit/close
            const regionBlobs: Record<string, Blob[]> = {};

            console.log('[RoadLayer] Preparing textures for cache...');

            for (const region in cache) {
                const canvases = cache[region];
                const blobs = await Promise.all(canvases.map(c => new Promise<Blob | null>(resolve => c.toBlob(resolve))));
                regionBlobs[region] = blobs.filter(b => b !== null) as Blob[];
            }

            const db = await this.openDB();
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            // Execute all puts synchronously within the transaction
            for (const region in regionBlobs) {
                store.put(regionBlobs[region], region);
            }

            return new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('[RoadLayer] Texture cache saved successfully.');
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.warn('[RoadLayer] Cache save failed:', e);
        }
    }

    private static async blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
        // [OPTIMIZATION-CACHE] Use createImageBitmap (Worker Thread) instead of new Image (Main Thread)
        // This is significantly faster and doesn't block the UI
        try {
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close(); // Release memory
            return canvas;
        } catch (e) {
            console.warn('[RoadLayer] Bitmap creation failed, falling back to Image:', e);
            // Fallback for older browsers (unlikely needed for this project but safe)
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(img.src);
                    resolve(canvas);
                };
                img.src = URL.createObjectURL(blob);
            });
        }
    }

    private static loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    private static bakeTexture(img: HTMLImageElement, region: string): HTMLCanvasElement {
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        // 1. Filter
        let filter = 'brightness(1.0)';
        if (region === 'desert') filter = 'sepia(0.8) saturate(1.2) brightness(0.9) contrast(1.1)';
        else if (region === 'steppe') filter = 'sepia(0.6) saturate(0.6) brightness(1.1)';
        else if (region === 'south') filter = 'sepia(0.3) saturate(1.0) hue-rotate(-10deg) brightness(1.05) contrast(0.9)';
        else if (region === 'central') filter = 'sepia(0.2) saturate(0.9) brightness(1.05)';

        ctx.filter = filter;
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = 'none';

        // 2. Mask (Fade edges)
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d')!;

        const gW = mCtx.createLinearGradient(0, 0, w, 0);
        gW.addColorStop(0, 'rgba(0,0,0,0)');
        gW.addColorStop(0.15, 'rgba(0,0,0,1)');
        gW.addColorStop(0.85, 'rgba(0,0,0,1)');
        gW.addColorStop(1, 'rgba(0,0,0,0)');

        const gH = mCtx.createLinearGradient(0, 0, 0, h);
        gH.addColorStop(0, 'rgba(0,0,0,0)');
        gH.addColorStop(0.5, 'rgba(0,0,0,1)');
        gH.addColorStop(1, 'rgba(0,0,0,0)');

        mCtx.fillStyle = gW;
        mCtx.fillRect(0, 0, w, h);
        mCtx.globalCompositeOperation = 'destination-in';
        mCtx.fillStyle = gH;
        mCtx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);

        return canvas;
    }

    private getTextureKeyForRegion(region: string): string {
        switch (region) {
            case 'TIBET':
            case 'NORTHEAST':
            case 'SIBERIA':      // [NEW] Siberia uses Snow
                return 'snow';
            case 'WESTERN':
            case 'NORTHWEST':
            case 'CENTRAL_WORLD': // [NEW] Central World uses Desert
                return 'desert';
            case 'NOMADIC':
                return 'steppe';

            case 'SOUTH':
            case 'LINGNAN':
            case 'CHU_SHU':
            case 'TROPICS':       // [NEW] Tropics uses South (Green)
                return 'south';
            case 'CENTRAL':
            case 'NORTH':
            case 'KOREA':
            case 'JAPAN':
            case 'WEST_WORLD':    // [NEW] West World uses Central (Yellow)
            case 'NEW_WORLD':
            case 'SOUTH_HEMISPHERE':
            default:
                return 'central';
        }
    }

    private getRegion(lat: number, lng: number): string {
        // [REFACTOR] Use centralized RegionSystem
        // Map high-level region types to texture keys
        const regionType = RegionSystem.getRegion(lat, lng);
        return this.getTextureKeyForRegion(regionType);
    }
}
