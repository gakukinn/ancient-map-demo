import L from 'leaflet';

/**
 * VectorRiverLayer
 * 
 * 使用 GeoJSON 矢量数据渲染真实的河流层。
 * 数据源: Natural Earth Rivers + Lake Centerlines (1:10m)
 * 
 * [ENHANCEMENT] 双层渲染 (Casing)
 * 为了模拟真实地图的“黑边”效果，我们使用两层 GeoJSON：
 * 1. 底层 (Border Layer): 深色，较宽 (Base + 2px)
 * 2. 顶层 (Water Layer): 浅蓝色，标准宽
 */
export class VectorRiverLayer extends L.FeatureGroup {
    private originalData: any;
    private currentOffsetMode: boolean = false;

    // Two internal layers for the casing effect
    private borderLayer: L.GeoJSON;
    private waterLayer: L.GeoJSON;

    constructor(data: any, options?: L.LayerOptions) {
        super([], options); // Initialize empty FeatureGroup

        // Store original WGS-84 data
        this.originalData = JSON.parse(JSON.stringify(data));

        // 1. Initialize Border Layer (Bottom)
        // Darker, wider line to simulate "black border"
        this.borderLayer = new L.GeoJSON(data, {
            style: (feature) => VectorRiverLayer.getBorderStyle(feature, 9),
            pane: options?.pane // Share properties
        });

        // 2. Initialize Water Layer (Top)
        // Standard blue water
        this.waterLayer = new L.GeoJSON(data, {
            style: (feature) => VectorRiverLayer.getWaterStyle(feature, 9),
            pane: options?.pane
        });

        // Add to group (Order matters: Border first -> Bottom)
        this.addLayer(this.borderLayer);
        this.addLayer(this.waterLayer);

        console.log('[VectorRiverLayer] Initialized Double-Layer Casing System');
    }

    /**
     * [USER FEATURE] 动态切换坐标系
     * Zoom <= 9: Enable GCJ-02 Offset (Align with Local Tiles)
     * Zoom >= 10: Disable Offset (Align with WGS-84 / ESRI)
     */
    public setOffsetMode(enable: boolean) {
        if (this.currentOffsetMode === enable) return;

        console.log(`[VectorRiverLayer] Switching Offset Mode: ${enable ? 'GCJ-02 (Offset)' : 'WGS-84 (Standard)'}`);
        this.currentOffsetMode = enable;

        // Determine data source
        let targetData = this.originalData;
        if (enable) {
            targetData = VectorRiverLayer.applyGCJ02Offset(this.originalData);
        }

        // Update both layers
        this.borderLayer.clearLayers();
        this.borderLayer.addData(targetData);

        this.waterLayer.clearLayers();
        this.waterLayer.addData(targetData);
    }

    /**
     * Update dynamic styles for both layers
     */
    public updateStyle(zoom: number) {
        this.borderLayer.setStyle((feature) => VectorRiverLayer.getBorderStyle(feature, zoom));
        this.waterLayer.setStyle((feature) => VectorRiverLayer.getWaterStyle(feature, zoom));
    }

    // --- Styling Logic ---

    // 1. Water Style (Inner Blue)
    private static getWaterStyle(feature: any, zoom: number): L.PathOptions {
        // [USER REQUEST] 统一使用用户指定颜色 (#7BA4C4)
        const uniformColor = '#7BA4C4';

        let scaleMultiplier = VectorRiverLayer.getScaleMultiplier(zoom);
        let baseWeight = 3.0; // Base width for "Uniform" look

        let weight = baseWeight * scaleMultiplier;
        weight = Math.max(weight, 1.5); // Min width

        return {
            color: uniformColor,
            weight: weight,
            opacity: 1.0,  // Opaque water
            lineCap: 'round',
            lineJoin: 'round',
            className: 'vector-river-water'
        };
    }

    // 2. Border Style (Outer Dark/Black)
    private static getBorderStyle(feature: any, zoom: number): L.PathOptions {
        // Dark color for the "Black Border"
        const borderColor = '#2C3E50'; // Deep Blue-Black

        let scaleMultiplier = VectorRiverLayer.getScaleMultiplier(zoom);
        let baseWeight = 3.0;

        // Border needs to be WIDER than water
        // [USER REQUEST] "都是1" -> Constant 1px total difference (0.5px on each side)
        let waterWeight = Math.max(baseWeight * scaleMultiplier, 1.5);
        let borderWeight = waterWeight + 1.0;

        return {
            color: borderColor,
            weight: borderWeight,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'vector-river-border'
        };
    }

    private static getScaleMultiplier(zoom: number): number {
        if (zoom >= 12) return 2.0;
        else if (zoom >= 10) return 1.5;
        else if (zoom <= 7) return 0.5;
        return 1.0;
    }

    // GCJ-02 Offset Logic (Mars Coordinates)
    private static applyGCJ02Offset(geojson: any): any {
        const PI = 3.1415926535897932384626;
        const ee = 0.00669342162296594323;
        const a = 6378245.0;

        const transformLat = (x: number, y: number) => {
            let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
            ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
            ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
            return ret;
        };

        const transformLon = (x: number, y: number) => {
            let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
            ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
            ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
            return ret;
        };

        const wgs2gcj = (lng: number, lat: number): [number, number] => {
            // [FIX] Restrict Offset to Local Tile Area ONLY (Xi'an / Guanzhong Region)
            // Local Tiles Coverage: ~103° to 115° E, ~29° to 39° N
            // Outside this box, we use ESRI (WGS-84), so NO offset should be applied.
            if (lng < 103.0 || lng > 115.0 || lat < 29.0 || lat > 39.0) {
                return [lng, lat];
            }
            let dLat = transformLat(lng - 105.0, lat - 35.0);
            let dLon = transformLon(lng - 105.0, lat - 35.0);
            const radLat = lat / 180.0 * PI;
            let magic = Math.sin(radLat);
            magic = 1 - ee * magic * magic;
            const sqrtMagic = Math.sqrt(magic);
            dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
            dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
            return [lng + dLon, lat + dLat];
        };

        // Deep clone to avoid mutating original if reused
        const newData = JSON.parse(JSON.stringify(geojson));

        // Recursive coordinate transformer
        const processCoords = (coords: any) => {
            if (Array.isArray(coords[0])) {
                // LineString or Polygon rings
                if (typeof coords[0][0] === 'number') {
                    // Single point in array [lng, lat]
                    const [lng, lat] = coords as [number, number];
                    const [gLng, gLat] = wgs2gcj(lng, lat);
                    coords[0] = gLng;
                    coords[1] = gLat;
                } else {
                    // Array of points
                    for (const c of coords) {
                        processCoords(c);
                    }
                }
            }
        };

        // Handle FeatureCollection
        if (newData.type === 'FeatureCollection') {
            for (const feature of newData.features) {
                if (feature.geometry && feature.geometry.coordinates) {
                    // GeoJSON coordinates are usually nested arrays.
                    // Using a smarter recursion to handle any depth
                    const traverse = (arr: any[]) => {
                        if (arr.length >= 2 && typeof arr[0] === 'number') {
                            // Hit a coordinate pair
                            const [lng, lat] = wgs2gcj(arr[0], arr[1]);
                            arr[0] = lng;
                            arr[1] = lat;
                        } else {
                            arr.forEach(item => traverse(item));
                        }
                    };
                    traverse(feature.geometry.coordinates);
                }
            }
        }
        return newData;
    }
}
