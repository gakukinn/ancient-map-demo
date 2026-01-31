import L from 'leaflet';

/**
 * RiverOverlayLayer - 基于 Canvas 的河流滤镜图层
 * 同时加载 ESRI 和本地 Google Terrain 瓦片，提取蓝色水域并叠加
 * 
 * [OPTIMIZED] 使用 Web Worker 进行像素处理，避免阻塞主线程。
 */

// Worker Interface
interface RiverWorkerResponse {
    id: number;
    data: Uint8ClampedArray;
}

export class RiverOverlayLayer extends L.GridLayer {
    private esriUrl: string;
    private localUrlZoom9: string;
    private localUrlZoom11: string;

    private worker: Worker;
    private msgIdCounter: number = 0;
    private pendingTiles: Map<number, { ctx: CanvasRenderingContext2D, tile: HTMLElement, done: L.DoneCallback }> = new Map();

    constructor(options?: L.GridLayerOptions) {
        super({
            tileSize: 256,
            pane: 'riverPane',
            zIndex: 340, // 位于领土/道路(350)之下
            opacity: 0.8,
            ...options
        });

        // Initialize Worker
        this.worker = new Worker(new URL('../workers/RiverWorker.ts', import.meta.url), { type: 'module' });

        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        console.log('💧 [RiverOverlayLayer] Web Worker Initialized.');

        // ESRI World Shaded Relief URL (256px tiles)
        this.esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}';

        // 本地 Google Terrain 瓦片 (512px tiles)
        this.localUrlZoom9 = '/9dixingtu/terrain_512/{x}/{y}.jpg';
        this.localUrlZoom11 = '/11dixingtu/Google Terrain Maps without labels  roads and POI  512px/terrain_512/{x}/{y}.jpg';
    }

    private handleWorkerMessage(e: MessageEvent<RiverWorkerResponse>) {
        const { id, data } = e.data;
        const task = this.pendingTiles.get(id);

        if (task) {
            const { ctx, tile, done } = task;

            // Create ImageData
            // [FIX] Cast to any to avoid strict "ArrayBufferLike vs ArrayBuffer" TS error
            const imgData = new ImageData(data as any, 256, 256);
            ctx.putImageData(imgData, 0, 0);

            // Mark done
            done(undefined, tile);
            this.pendingTiles.delete(id);
        }
    }

    // [OPTIMIZATION] Shared Canvas for image data extraction
    private static sharedCanvas: HTMLCanvasElement | null = null;
    private static sharedCtx: CanvasRenderingContext2D | null = null;

    /**
     * 创建瓦片
     */
    protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const tile = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;
        tile.style.pointerEvents = 'none';

        const ctx = tile.getContext('2d');
        if (!ctx) {
            done(undefined, tile);
            return tile;
        }

        // 构造 ESRI 瓦片 URL
        const esriTileUrl = this.esriUrl
            .replace('{z}', coords.z.toString())
            .replace('{y}', coords.y.toString())
            .replace('{x}', coords.x.toString());

        // 加载图片
        const esriImg = new Image();
        esriImg.crossOrigin = 'Anonymous';

        esriImg.onload = () => {
            // [OPTIMIZATION] Use createImageBitmap to avoid main thread canvas read
            createImageBitmap(esriImg).then(bitmap => {
                const reqId = this.msgIdCounter++;

                // Store callback info
                this.pendingTiles.set(reqId, { ctx, tile, done });

                // Send to worker with bitmap transfer
                this.worker.postMessage({
                    id: reqId,
                    width: size.x,
                    height: size.y,
                    bitmap: bitmap // Pass bitmap instead of raw data
                }, [bitmap]); // Transfer ownership

            }).catch(err => {
                console.error('River bitmap creation failed:', err);
                done(undefined, tile);
            });
        };

        esriImg.onerror = () => {
            done(undefined, tile);
        };

        esriImg.src = esriTileUrl;

        return tile;
    }

    public addTo(map: L.Map): this {
        // @ts-ignore
        if (!map.getPane(this.options.pane)) {
            // @ts-ignore
            map.createPane(this.options.pane);
            // @ts-ignore
            map.getPane(this.options.pane).style.zIndex = this.options.zIndex;
        }
        return super.addTo(map);
    }

    public onRemove(map: L.Map): this {
        // Optional: terminate worker to save memory if layer is destroyed
        // this.worker.terminate();
        return super.onRemove(map);
    }
}
