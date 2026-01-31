import * as L from 'leaflet';
import HillshadeWorker from '../workers/HillshadeWorker?worker'; // Vite Worker Import
import { HillshadeRequest, HillshadeResponse } from '../workers/HillshadeWorker';

interface HillshadeOptions extends L.GridLayerOptions {
    azimuth?: number;
    altitude?: number;
    zFactor?: number;
    shadowOpacity?: number;
    useElevationColor?: boolean;
}

export class HillshadeLayer extends L.GridLayer {
    private zFactor: number;
    private shadowOpacity: number;
    private useElevationColor: boolean;

    private worker: Worker;
    private msgIdCounter: number = 0;
    private pendingTiles: Map<number, { ctx: CanvasRenderingContext2D, tile: HTMLElement, done: L.DoneCallback }> = new Map();

    constructor(options?: HillshadeOptions) {
        super({
            tileSize: 256,
            opacity: 1.0,
            zIndex: 2,
            azimuth: 315,
            altitude: 40,
            ...options
        });

        this.zFactor = options?.zFactor ?? 25.0;
        this.shadowOpacity = options?.shadowOpacity ?? 0.9;
        this.useElevationColor = options?.useElevationColor ?? true;

        // Initialize Worker
        this.worker = new HillshadeWorker();
        this.worker.onmessage = this.handleWorkerMessage.bind(this);

        console.log(`HillshadeLayer: Initialized with Web Worker (z=${this.zFactor})`);
    }

    private handleWorkerMessage(e: MessageEvent<HillshadeResponse>) {
        const { id, data } = e.data;
        const task = this.pendingTiles.get(id);

        if (task) {
            const { ctx, tile, done } = task;
            // Create ImageData from buffer
            // [FIX] Ensure it is treated as Uint8ClampedArray for TS compatibility
            const validData = data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);
            const imgData = new ImageData(validData as any, 256, 256); // Assuming standard tile size
            ctx.putImageData(imgData, 0, 0);

            // Mark Leaflet tile as done
            done(undefined, tile);
            this.pendingTiles.delete(id);
        }
    }

    public setParams(params: { zFactor?: number; shadowOpacity?: number; altitude?: number; useElevationColor?: boolean }) {
        let changed = false;
        if (params.zFactor !== undefined && params.zFactor !== this.zFactor) {
            this.zFactor = params.zFactor;
            changed = true;
        }
        if (params.shadowOpacity !== undefined && params.shadowOpacity !== this.shadowOpacity) {
            this.shadowOpacity = params.shadowOpacity;
            changed = true;
        }
        if (params.altitude !== undefined && params.altitude !== (this.options as HillshadeOptions).altitude) {
            (this.options as HillshadeOptions).altitude = params.altitude;
            changed = true;
        }
        if (params.useElevationColor !== undefined && params.useElevationColor !== this.useElevationColor) {
            this.useElevationColor = params.useElevationColor;
            changed = true;
        }

        if (changed) {
            // Cancel pending? Not strictly necessary, just redraw.
            this.redraw();
        }
    }

    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
        const tile = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;
        tile.style.pointerEvents = 'none';

        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;

        const ctx = tile.getContext('2d');
        if (!ctx) {
            done(new Error("Canvas context missing"), tile);
            return tile;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${coords.x}/${coords.y}.png`;
        img.src = url;

        img.onload = () => {
            // [OPTIMIZATION] Use createImageBitmap to avoid main thread decoding & canvas read
            createImageBitmap(img).then(bitmap => {
                // Prepare Worker Request
                const reqId = this.msgIdCounter++;
                const request: HillshadeRequest = {
                    id: reqId,
                    width: size.x,
                    height: size.y,
                    // data: null, // Will be handled via bitmap in worker
                    bitmap: bitmap, // Pass Bitmap
                    params: {
                        azimuth: (this.options as HillshadeOptions).azimuth || 315,
                        altitude: (this.options as HillshadeOptions).altitude || 40,
                        zFactor: this.zFactor,
                        opacity: this.shadowOpacity,
                        useElevationColor: this.useElevationColor
                    }
                };

                // Store callback info
                this.pendingTiles.set(reqId, { ctx, tile, done });

                // [PERF] Zero-Copy Transfer: Transfer ownership of Bitmap to Worker
                this.worker.postMessage(request, [bitmap]);

            }).catch(err => {
                console.error('Bitmap creation failed:', err);
                done(undefined, tile);
            });
        };

        img.onerror = () => {
            done(undefined, tile);
        };

        return tile;
    }

    // Cleanup if layer removed
    onRemove(map: L.Map): this {
        // We could terminate worker, but if layer is re-added, we'd need to re-init.
        // For now keep it alive or minimal cleanup.
        return super.onRemove(map);
    }
}
