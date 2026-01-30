import L from 'leaflet';

import { GameMap } from '../map/GameMap';
import { GridSystem, Hex } from '../systems/GridSystem';
import { TerrainSpeedSystem, TerrainSpeed } from '../core/TerrainSpeedSystem';
import { TerrainOverrideManager } from '../core/TerrainOverrideManager';
import { MapColorSampler } from '../map/MapColorSampler';
import { latLngToTile } from './TileMapConfig';

interface HistoryEntry {
    changes: Map<string, TerrainSpeed | null>;
    timestamp: number;
}

export type ToolType = 'paint-normal' | 'paint-slow' | 'paint-water' | 'paint-ocean' | 'eraser';
export type BrushSize = 1 | 7 | 19;

export class SpeedOverlayRenderer {
    private map: L.Map;
    private layerGroup: any;
    private highlightLayer: any;
    private canvasRenderer: L.Canvas; // [OPTIMIZATION] Shared Canvas Renderer
    private isVisible: boolean = false;
    private centerPoint = { lat: 34.26, lng: 108.94 };

    private isEditMode: boolean = false;
    private toolType: ToolType = 'paint-normal';
    private brushSize: BrushSize = 1;

    private overrideManager: TerrainOverrideManager;
    private colorSampler: MapColorSampler;

    public getOverrideManager(): TerrainOverrideManager {
        return this.overrideManager;
    }

    private history: HistoryEntry[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 50;

    constructor(gameMap: GameMap, overrideManager: TerrainOverrideManager, colorSampler: MapColorSampler) {
        this.map = gameMap.getLeafletMap();
        this.overrideManager = overrideManager;
        this.colorSampler = colorSampler;
        this.layerGroup = L.layerGroup();
        this.highlightLayer = L.layerGroup();

        // [OPTIMIZATION] Use Canvas renderer for thousands of polygons
        this.canvasRenderer = L.canvas({ padding: 0.5 });

        // [FIX] Continuous painting support (like Road Editor)
        let isPainting = false;
        let lastPaintedHex: string | null = null;

        this.map.on('mousedown', (e: any) => {
            if (!this.isEditMode) return;
            isPainting = true;
            lastPaintedHex = null;
            this.map.dragging.disable(); // Disable map panning while painting
            this.handlePaint(e.latlng);
            lastPaintedHex = `${GridSystem.latLngToAxial(e.latlng.lat, e.latlng.lng).q},${GridSystem.latLngToAxial(e.latlng.lat, e.latlng.lng).r}`;
        });

        this.map.on('mousemove', (e: any) => {
            if (this.isEditMode) {
                this.showHoverPreview(e);
                // Continuous painting while dragging
                if (isPainting) {
                    const hex = GridSystem.latLngToAxial(e.latlng.lat, e.latlng.lng);
                    const hexKey = `${hex.q},${hex.r}`;
                    if (hexKey !== lastPaintedHex) {
                        this.handlePaint(e.latlng);
                        lastPaintedHex = hexKey;
                    }
                }
            }
        });

        this.map.on('mouseup', () => {
            if (isPainting) {
                isPainting = false;
                if (this.isEditMode) {
                    // Re-enable dragging only if NOT in edit mode
                    // Actually in edit mode we keep dragging disabled
                } else {
                    this.map.dragging.enable();
                }
            }
        });

        // Also handle mouse leaving the map container
        this.map.on('mouseout', () => {
            isPainting = false;
        });

        console.log('🎨 SpeedOverlayRenderer 已初始化 (支持连续绑制)');
    }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.setVisible(this.isVisible);
    }

    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        if (this.isVisible) {
            this.render();
            // 确保图层被添加到地图
            if (!this.map.hasLayer(this.layerGroup)) {
                this.map.addLayer(this.layerGroup);
            }
            console.log('🗺️ 速度覆盖层: 开启');
        } else {
            if (this.map.hasLayer(this.layerGroup)) {
                this.map.removeLayer(this.layerGroup);
            }
            console.log('🗺️ 速度覆盖层: 关闭');
        }
    }

    public toggleEditMode(): boolean {
        this.setEditMode(!this.isEditMode);
        return this.isEditMode;
    }

    public setEditMode(enable: boolean): void {
        if (this.isEditMode === enable) return;

        this.isEditMode = enable;
        if (this.isEditMode) {
            this.map.addLayer(this.highlightLayer);
            if (!this.isVisible) {
                // Determine if we should force toggle visibility? 
                // Usually yes for editing.
                this.setVisible(true);
            }
        } else {
            this.map.dragging.enable();
            this.map.removeLayer(this.highlightLayer);
            this.clearHoverPreview();
        }
    }

    public get isEditing(): boolean {
        return this.isEditMode;
    }

    public isShowing(): boolean {
        return this.isVisible;
    }

    public setToolType(type: ToolType): void {
        this.toolType = type;
        console.log(`🛠️ 工具类型: ${type}`);
    }

    public setBrushSize(size: BrushSize): void {
        this.brushSize = size;
        console.log(`🖌️ 画笔大小: ${size}`);
    }

    public getToolType(): ToolType {
        return this.toolType;
    }

    public getBrushSize(): BrushSize {
        return this.brushSize;
    }

    public setToolMode(mode: 'pan' | 'paint'): void {
        if (mode === 'pan') {
            this.map.dragging.enable();
        }
        console.log(`🛠️ 工具模式: ${mode}`);
    }

    public exportData(): void {
        const data = this.overrideManager.exportData();
        console.log('📋 地形覆盖数据导出:', data);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapwar_terrain_save_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    public importData(file: File): void {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                this.overrideManager.loadData(data);
                this.overrideManager.save(); // Also save to local storage
                this.render();
                alert(`✅ 成功读取存档！\n共加载了 ${Object.keys(data).length} 个地形修改数据。`);
            } catch (error) {
                console.error('Import failed:', error);
                alert('❌ 读取存档失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
    }

    public exportAllTerrain(): void {
        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        const centerLat = 34.26;

        const result: any = {};
        const minQ = -50;
        const maxQ = 50;
        const minR = -50;
        const maxR = 50;

        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const center = GridSystem.axialToLatLng(q, r);
                const speedType = TerrainSpeedSystem.getHexSpeed({ lat: center.lat, lng: center.lng }, { q, r });
                const key = `${q},${r}`;
                result[key] = speedType;
            }
        }

        const dataStr = JSON.stringify(result, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terrain_full_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('🗺️ 完整地形导出完成');
    }

    public save(): void {
        this.overrideManager.save();
        alert(`✅ 保存成功！\n\n已保存 ${this.overrideManager.getOverrideCount()} 个地形修改记录到浏览器缓存。\n下次刷新页面时会自动加载。`);
    }

    public saveQuietly(): void {
        this.overrideManager.save();
        console.log('💾 退出编辑模式，自动保存数据');
    }

    public async autoIdentifyVisibleArea(): Promise<void> {
        const bounds = this.map.getBounds();
        const hexCenters = GridSystem.getHexesInBounds(bounds, this.centerPoint);

        console.log(`🌍 开始全球海陆二分类识别 - ${hexCenters.length} 个区域...`);
        let changesCount = 0;

        // Batch process
        for (const center of hexCenters) {
            const hex = GridSystem.latLngToAxial(center.lat, center.lng);
            const detectedSpeed = await TerrainSpeedSystem.getHexSpeedAsync(center, hex);

            // [USER REQUEST] Binary Classification: Water vs Land
            // If it's water (Ocean/River) -> Set Water
            // If it's NOT water -> Force Set Plain (Normal)
            let finalSpeed: TerrainSpeed = TerrainSpeed.NORMAL;

            if (detectedSpeed === TerrainSpeed.WATER || detectedSpeed === TerrainSpeed.OCEAN) {
                finalSpeed = detectedSpeed;
            }

            this.overrideManager.setOverride(hex, finalSpeed);
            changesCount++;
        }

        console.log(`✅ 识别完成，更新了 ${changesCount} 个区域`);
        this.render();
        this.saveQuietly();
    }

    public update(): void {
        if (this.isVisible) {
            this.render();
        }
    }

    private render(): void {
        this.layerGroup.clearLayers();

        const zoom = this.map.getZoom();
        if (zoom < 4) {
            console.log('⚠️ 缩放级别过低，请放大地图');
            return;
        }

        const bounds = this.map.getBounds();
        const hexCenters = GridSystem.getHexesInBounds(bounds, this.centerPoint);

        if (hexCenters.length > 8000) {
            console.warn('⚠️ 视野内六边形过多，请继续放大地图');
            return;
        }

        // console.log(`🎨 开始渲染 ${hexCenters.length} 个六边形`);

        let greenCount = 0, orangeCount = 0, blueCount = 0, darkBlueCount = 0;

        hexCenters.forEach(center => {
            const hex = GridSystem.latLngToAxial(center.lat, center.lng);
            const speed = TerrainSpeedSystem.getHexSpeed(center, hex);

            let hexColor = '#00FF00';
            if (speed === TerrainSpeed.NORMAL) {
                hexColor = '#00FF00';
                greenCount++;
            } else if (speed === TerrainSpeed.WATER) {
                hexColor = '#0088FF';
                blueCount++;
            } else if (speed === TerrainSpeed.OCEAN) {
                hexColor = '#00008B';
                darkBlueCount++;
            } else {
                hexColor = '#FF8800';
                orangeCount++;
            }

            const polygon = L.polygon(
                GridSystem.getHexagonCorners(center).map((c: any) => [c.lat, c.lng]),
                {
                    color: '#000000',
                    weight: 0.5,
                    fillColor: hexColor,
                    fillOpacity: 0.25,
                    opacity: 0.3,
                    interactive: false, // [OPTIMIZATION] Make non-interactive to let events pass to Map
                    renderer: this.canvasRenderer // [OPTIMIZATION] Bind to canvas
                }
            );

            // [REMOVED] Polygon click listener - replaced by global map drag/click
            polygon.addTo(this.layerGroup);
        });

        // console.log(`✅ 渲染完成 - 绿:${greenCount} | 橙:${orangeCount} | 蓝:${blueCount}`);
    }

    // [REMOVED] handleMapClick - unified into handlePaint


    /**
     * Handle paint from latlng directly (for continuous painting)
     */
    private handlePaint(latlng: { lat: number; lng: number }): void {
        const hex = GridSystem.latLngToAxial(latlng.lat, latlng.lng);
        this.applyOverride(hex);
    }

    private applyOverride(centerHex: Hex): void {
        const affectedHexes = this.getAffectedHexes(centerHex);
        const changes = new Map<string, TerrainSpeed | null>();

        affectedHexes.forEach(hex => {
            const hexKey = `${hex.q},${hex.r}`;
            const currentOverride = this.overrideManager.getOverride(hex);

            if (this.toolType === 'eraser') {
                if (currentOverride !== null) {
                    this.overrideManager.clearOverride(hex);
                    changes.set(hexKey, null);
                }
            } else if (this.toolType === 'paint-normal') {
                if (currentOverride !== TerrainSpeed.NORMAL) {
                    this.overrideManager.setOverride(hex, TerrainSpeed.NORMAL);
                    changes.set(hexKey, TerrainSpeed.NORMAL);
                }
            } else if (this.toolType === 'paint-slow') {
                if (currentOverride !== TerrainSpeed.SLOW) {
                    this.overrideManager.setOverride(hex, TerrainSpeed.SLOW);
                    changes.set(hexKey, TerrainSpeed.SLOW);
                }
            } else if (this.toolType === 'paint-water') {
                if (currentOverride !== TerrainSpeed.WATER) {
                    this.overrideManager.setOverride(hex, TerrainSpeed.WATER);
                    changes.set(hexKey, TerrainSpeed.WATER);
                }
            } else if (this.toolType === 'paint-ocean') {
                if (currentOverride !== TerrainSpeed.OCEAN) {
                    this.overrideManager.setOverride(hex, TerrainSpeed.OCEAN);
                    changes.set(hexKey, TerrainSpeed.OCEAN);
                }
            }

            // [FIX] Invalidate cache for this hex so the new override takes effect immediately
            const center = GridSystem.axialToLatLng(hex.q, hex.r);
            TerrainSpeedSystem.clearCache(center.lat, center.lng, hex);
        });

        if (changes.size > 0) {
            this.addToHistory({ changes, timestamp: Date.now() });
        }
        this.render();
    }

    private getAffectedHexes(centerHex: Hex): Hex[] {
        if (this.brushSize === 1) {
            return [centerHex];
        } else if (this.brushSize === 7) {
            return [
                centerHex,
                { q: centerHex.q + 1, r: centerHex.r - 1 },
                { q: centerHex.q + 1, r: centerHex.r },
                { q: centerHex.q, r: centerHex.r + 1 },
                { q: centerHex.q - 1, r: centerHex.r + 1 },
                { q: centerHex.q - 1, r: centerHex.r },
                { q: centerHex.q, r: centerHex.r - 1 }
            ];
        } else {
            return [
                centerHex,
                { q: centerHex.q + 1, r: centerHex.r - 1 },
                { q: centerHex.q + 1, r: centerHex.r },
                { q: centerHex.q, r: centerHex.r + 1 },
                { q: centerHex.q - 1, r: centerHex.r + 1 },
                { q: centerHex.q - 1, r: centerHex.r },
                { q: centerHex.q, r: centerHex.r - 1 },
                { q: centerHex.q + 2, r: centerHex.r - 2 },
                { q: centerHex.q + 2, r: centerHex.r - 1 },
                { q: centerHex.q + 2, r: centerHex.r },
                { q: centerHex.q + 1, r: centerHex.r + 1 },
                { q: centerHex.q, r: centerHex.r + 2 },
                { q: centerHex.q - 1, r: centerHex.r + 2 },
                { q: centerHex.q - 2, r: centerHex.r + 2 },
                { q: centerHex.q - 2, r: centerHex.r + 1 },
                { q: centerHex.q - 2, r: centerHex.r },
                { q: centerHex.q - 1, r: centerHex.r - 1 },
                { q: centerHex.q, r: centerHex.r - 2 },
                { q: centerHex.q + 1, r: centerHex.r - 2 }
            ];
        }
    }

    private showHoverPreview(e: any): void {
        this.clearHoverPreview();
        const { lat, lng } = e.latlng;
        const centerHex = GridSystem.latLngToAxial(lat, lng);
        const affectedHexes = this.getAffectedHexes(centerHex);

        affectedHexes.forEach(hex => {
            const center = GridSystem.axialToLatLng(hex.q, hex.r);
            const corners = GridSystem.getHexagonCorners(center);

            let color = '#FFFF00';
            if (this.toolType === 'paint-normal') color = '#00FF00';
            else if (this.toolType === 'paint-slow') color = '#FF8800';
            else if (this.toolType === 'paint-water') color = '#0088FF';
            else if (this.toolType === 'paint-ocean') color = '#00008B';
            else if (this.toolType === 'eraser') color = '#FF0000';

            const polygon = L.polygon(
                corners.map((c: any) => [c.lat, c.lng]),
                { color, weight: 2, fillColor: color, fillOpacity: 0.2, opacity: 0.8, interactive: false }
            );
            polygon.addTo(this.highlightLayer);
        });
    }

    private clearHoverPreview(): void {
        this.highlightLayer.clearLayers();
    }

    private addToHistory(entry: HistoryEntry): void {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(entry);
        this.historyIndex++;
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    public undo(): boolean {
        if (this.historyIndex < 0) return false;
        const entry = this.history[this.historyIndex];
        entry.changes.forEach((newValue, hexKey) => {
            const [q, r] = hexKey.split(',').map(Number);
            const hex = { q, r };
            if (newValue === null) {
                this.overrideManager.setOverride(hex, TerrainSpeed.NORMAL);
            } else {
                this.overrideManager.clearOverride(hex);
            }
        });
        this.historyIndex--;
        this.render();
        return true;
    }

    public redo(): boolean {
        if (this.historyIndex >= this.history.length - 1) return false;
        this.historyIndex++;
        const entry = this.history[this.historyIndex];
        entry.changes.forEach((newValue, hexKey) => {
            const [q, r] = hexKey.split(',').map(Number);
            const hex = { q, r };
            if (newValue !== null) {
                this.overrideManager.setOverride(hex, newValue);
            } else {
                this.overrideManager.clearOverride(hex);
            }
        });
        this.render();
        return true;
    }

    public canUndo(): boolean {
        return this.historyIndex >= 0;
    }

    public canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    public getModifiedCount(): number {
        return this.overrideManager.getOverrideCount();
    }

    public setAutoIDEnabled(enabled: boolean): void {
        TerrainSpeedSystem.setAutoIdentificationEnabled(enabled);
        this.render();
    }

    // 固化当前地形数据（将自动识别的结果保存为覆盖层）
    // [OPTIMIZATION] Tile-First Architecture: Prefetch all tiles, then process hexes synchronously
    public async bakeWorld(): Promise<void> {
        console.log('🚀 bakeWorld called - Tile-First Mode');

        try {
            const button = document.getElementById('bake-world') as HTMLButtonElement;
            if (button) {
                button.disabled = true;
                button.textContent = '正在计算瓦片...';
            }

            const startTime = performance.now();

            // Step 1: Enumerate all hexes in the game world range
            // [USER SPECIFIED] Istanbul to Japan, Equator to St. Petersburg
            const LAT_MIN = 0;    // Equator
            const LAT_MAX = 60;   // Saint Petersburg latitude
            const LNG_MIN = -19;  // West of Istanbul (including Lisbon area)
            const LNG_MAX = 146;  // East of Japan (Pacific)

            const cornerNW = GridSystem.latLngToAxial(LAT_MAX, LNG_MIN);
            const cornerNE = GridSystem.latLngToAxial(LAT_MAX, LNG_MAX);
            const cornerSW = GridSystem.latLngToAxial(LAT_MIN, LNG_MIN);
            const cornerSE = GridSystem.latLngToAxial(LAT_MIN, LNG_MAX);

            // [FIX] Expand padding to ±50 to cover ALL visible hexes on the map
            const qMin = Math.min(cornerNW.q, cornerNE.q, cornerSW.q, cornerSE.q) - 50;
            const qMax = Math.max(cornerNW.q, cornerNE.q, cornerSW.q, cornerSE.q) + 50;
            const rMin = Math.min(cornerNW.r, cornerNE.r, cornerSW.r, cornerSE.r) - 50;
            const rMax = Math.max(cornerNW.r, cornerNE.r, cornerSW.r, cornerSE.r) + 50;

            // Collect ALL hexes - inside bounds get elevation check, outside bounds = OCEAN
            const ZOOM = 7;
            const TILE_SIZE = 256;
            const ELEVATION_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

            // Hexes inside the scanning area (need elevation lookup)
            const hexesInRange: { q: number, r: number, lat: number, lng: number }[] = [];
            // Hexes outside the scanning area (automatically OCEAN)
            const hexesOutOfRange: { q: number, r: number }[] = [];
            const uniqueTiles = new Set<string>();

            for (let q = qMin; q <= qMax; q++) {
                for (let r = rMin; r <= rMax; r++) {
                    const center = GridSystem.axialToLatLng(q, r);
                    if (center.lat >= LAT_MIN && center.lat <= LAT_MAX &&
                        center.lng >= LNG_MIN && center.lng <= LNG_MAX) {
                        // Inside bounds - needs elevation check
                        hexesInRange.push({ q, r, lat: center.lat, lng: center.lng });
                        const tile = latLngToTile(center.lat, center.lng, ZOOM);
                        uniqueTiles.add(`${tile.x},${tile.y}`);
                    } else {
                        // Outside bounds - automatically OCEAN
                        hexesOutOfRange.push({ q, r });
                    }
                }
            }

            const totalHexes = hexesInRange.length + hexesOutOfRange.length;
            const totalTiles = uniqueTiles.size;
            console.log(`⬡ 找到 ${totalHexes} 个六边形，需要 ${totalTiles} 张瓦片`);

            // Step 2: Prefetch ALL tiles in parallel
            if (button) button.textContent = `下载瓦片 0/${totalTiles}...`;

            const tileCache = new Map<string, ImageData>();
            const tileArray = Array.from(uniqueTiles);
            const TILE_CONCURRENCY = 50; // Download 50 tiles at a time
            let downloadedTiles = 0;

            const canvas = document.createElement('canvas');
            canvas.width = TILE_SIZE;
            canvas.height = TILE_SIZE;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            for (let i = 0; i < tileArray.length; i += TILE_CONCURRENCY) {
                const batch = tileArray.slice(i, i + TILE_CONCURRENCY);

                const downloads = batch.map(async (tileKey) => {
                    const [x, y] = tileKey.split(',').map(Number);
                    const url = ELEVATION_URL
                        .replace('{z}', String(ZOOM))
                        .replace('{x}', String(x))
                        .replace('{y}', String(y));

                    try {
                        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                            const image = new Image();
                            image.crossOrigin = 'Anonymous';
                            image.onload = () => resolve(image);
                            image.onerror = reject;
                            image.src = url;
                        });

                        if (ctx) {
                            ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
                            ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
                            const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
                            tileCache.set(tileKey, imageData);
                        }
                    } catch (e) {
                        // Tile failed to load (might be ocean with no data)
                    }
                });

                await Promise.all(downloads);
                downloadedTiles += batch.length;

                if (button) button.textContent = `下载瓦片 ${downloadedTiles}/${totalTiles}...`;
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield for UI
            }

            console.log(`📥 已下载 ${tileCache.size}/${totalTiles} 张瓦片`);

            // Step 3: Process ALL hexes synchronously (no more async overhead!)
            if (button) button.textContent = `处理六边形...`;

            const results: { q: number; r: number; speed: TerrainSpeed }[] = [];
            let oceanCount = 0;
            let landCount = 0;

            const n = Math.pow(2, ZOOM);

            // First: Mark all OUT-OF-RANGE hexes as OCEAN
            for (const hex of hexesOutOfRange) {
                results.push({ q: hex.q, r: hex.r, speed: TerrainSpeed.OCEAN });
                oceanCount++;
            }
            console.log(`🌊 范围外六边形 ${hexesOutOfRange.length} 个，已标记为海洋`);

            // Second: Process IN-RANGE hexes with elevation lookup
            for (const hex of hexesInRange) {
                // Calculate tile and pixel position
                const tile = latLngToTile(hex.lat, hex.lng, ZOOM);
                const tileKey = `${tile.x},${tile.y}`;

                const imageData = tileCache.get(tileKey);
                if (!imageData) {
                    // No tile = assume ocean
                    results.push({ q: hex.q, r: hex.r, speed: TerrainSpeed.OCEAN });
                    oceanCount++;
                    continue;
                }

                // Calculate pixel position within tile
                const globalX = ((hex.lng + 180) / 360) * n * TILE_SIZE;
                const latRad = hex.lat * Math.PI / 180;
                const globalY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * TILE_SIZE;

                const localX = Math.floor(globalX % TILE_SIZE);
                const localY = Math.floor(globalY % TILE_SIZE);

                // Read pixel from cached ImageData
                const idx = (localY * TILE_SIZE + localX) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];

                // Decode elevation
                const elevation = (r * 256 + g + b / 256) - 32768;
                // Sea level = 0, anything above is land
                const speed = elevation > 0 ? TerrainSpeed.NORMAL : TerrainSpeed.OCEAN;

                results.push({ q: hex.q, r: hex.r, speed });
                if (speed === TerrainSpeed.OCEAN) oceanCount++;
                else landCount++;
            }

            // Step 4: Apply results
            this.overrideManager.setOverrides(results);
            this.overrideManager.save();
            this.render();

            const duration = ((performance.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Tile-First 识别完成! 耗时 ${duration}s`);
            console.log(`📊 统计: ${totalHexes} 六边形 | ${totalTiles} 瓦片 | 陆地 ${landCount} | 海洋 ${oceanCount}`);

            alert(`全图识别完成！\n\n耗时: ${duration}秒\n六边形: ${totalHexes}\n瓦片: ${totalTiles}\n陆地: ${landCount}\n海洋: ${oceanCount}\n\n数据已自动保存。`);

            if (button) {
                button.disabled = false;
                button.textContent = '🌊 全图识别';
            }
        } catch (error) {
            console.error('❌ bakeWorld failed:', error);
            alert(`全图识别失败：${error}`);
        }
    }
}
