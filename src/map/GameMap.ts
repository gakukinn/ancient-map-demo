import L from 'leaflet';

import { TILE_CONFIG } from './TileMapConfig';
import { HillshadeLayer } from './HillshadeLayer';
import { RiverOverlayLayer } from './RiverOverlayLayer';
import { VectorRiverLayer } from './VectorRiverLayer'; // [NEW]
import { StrategicGridLayer } from './StrategicGridLayer';
import { CityCaptureRenderer } from './CityCaptureRenderer';

export class GameMap {
    private map: L.Map;
    private containerId: string;
    private currentTileLayer: L.TileLayer | null = null;
    private zoom11TileLayer: L.TileLayer | null = null;
    private currentSourceKey: string = 'LOCAL';
    private hillshadeLayer: HillshadeLayer | null = null;
    private riverLayer: RiverOverlayLayer | null = null;
    private vectorRiverLayer: VectorRiverLayer | null = null; // [NEW]
    private cityCaptureRenderer: CityCaptureRenderer | null = null;
    private overrideManager: any | null = null; // TerrainOverrideManager

    constructor(containerId: string) {
        this.containerId = containerId;

        const { lat, lng } = TILE_CONFIG.MAP_CENTER;

        // 初始化
        this.map = L.map(containerId, {
            center: [lat, lng],
            zoom: 9,
            minZoom: 4,  // [UPDATE] Macro view enabled
            maxZoom: 13, // [UPDATE] Detailed view enabled
            zoomSnap: 1,
            zoomDelta: 1,
            zoomControl: true,
            attributionControl: false,
            // [OPTIMIZATION] Premium Camera Feel
            inertia: true,
            inertiaDeceleration: 3000,
            inertiaMaxSpeed: 1500,
            worldCopyJump: true, // Allow wrapping around the world
            easeLinearity: 0.25,
            zoomAnimation: true,
            markerZoomAnimation: true,
            fadeAnimation: true
        });

        // [NEW] Auto-adjust Hillshade Z-Factor based on Zoom
        this.map.on('zoomend', () => {
            if (!this.hillshadeLayer) return;

            const zoom = this.map.getZoom();
            let targetZ = 30.0;

            if (zoom <= 7) targetZ = 10.0;
            else if (zoom === 8) targetZ = 20.0;
            else if (zoom === 9) targetZ = 30.0;
            else if (zoom === 10) targetZ = 40.0;
            else if (zoom === 11) targetZ = 50.0;
            else if (zoom >= 12) targetZ = 60.0;

            // Apply to layer
            this.hillshadeLayer.setParams({ zFactor: targetZ });

            // Sync UI
            const rngZ = document.getElementById('rng-z') as HTMLInputElement;
            const valZ = document.getElementById('val-z');
            if (rngZ) rngZ.value = targetZ.toFixed(1);
            if (valZ) valZ.innerText = targetZ.toFixed(1);

            console.log(`🏔️ Auto-adjusted Hillshade Z to ${targetZ} (Zoom: ${zoom})`);
        });

        // [NEW] Zoom Level Indicator in top-left
        this.addZoomIndicator();

        // 默认加载源
        const initialSource = (TILE_CONFIG as any).ACTIVE_SOURCE || 'LOCAL';
        this.setMapSource(initialSource);

        setTimeout(() => {
            this.map.invalidateSize();
        }, 300);

        // [FIX] 创建专用河流图层 Pane，确保在山体之上
        this.map.createPane('riverPane');
        const riverPane = this.map.getPane('riverPane');
        if (riverPane) {
            riverPane.style.zIndex = '340'; // 低于领土(350)和城市(610)
        }

        // [USER REQUEST] 创建矢量河流 Pane，位于 ESRI 河流之下
        this.map.createPane('vectorRiverPane');
        const vectorRiverPane = this.map.getPane('vectorRiverPane');
        if (vectorRiverPane) {
            vectorRiverPane.style.zIndex = '335'; // 低于 riverPane(340)
        }

        // [OPTIMIZATION] 默认开启山体高度 (Hillshade) - 无论地图源
        this.toggleHillshade(true);

        // [RESTORED] 河流/海岸线层 - 所有模式下都启用
        this.toggleRiver(true);

        // [NEW] Initialize City Capture Renderer
        this.cityCaptureRenderer = new CityCaptureRenderer(this);
    }

    // [NEW] Public API for TerrainEditor
    public setHillshadeParams(params: any) {
        if (!this.hillshadeLayer) return;
        this.hillshadeLayer.setParams(params);
    }

    public setMapStyle(filter: string) {
        const tilesPane = document.querySelector('.leaflet-tile-pane') as HTMLElement;
        if (tilesPane) {
            tilesPane.style.filter = filter;
        }
    }

    public setMapSource(sourceKey: string) {
        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
            this.currentTileLayer = null;
        }
        // Remove old zoom11 layer if it exists (legacy cleanup)
        if (this.zoom11TileLayer) {
            this.map.removeLayer(this.zoom11TileLayer);
            this.zoom11TileLayer = null;
        }

        const sourceConfig = (TILE_CONFIG as any).SOURCES[sourceKey];
        if (!sourceConfig) return;

        let tileUrl = sourceConfig.url;
        const layerOptions = {
            tileSize: 512, // Default to 512 for our local tiles
            ...sourceConfig.options
        };

        if (sourceKey === 'LOCAL') {
            // [OPTIMIZED] Pure Procedural Mode
            // No local image tiles are loaded. The map relies entirely on HillshadeLayer (elevation data).
            // This offers the best performance and "clean historical" look.

            this.currentSourceKey = sourceKey;

            // We don't add any L.tileLayer here. 
            // The visual content will be provided by HillshadeLayer (zIndex 2).
            // Leaflet handles panning/zooming via its internal container.
        } else {
            this.currentSourceKey = sourceKey;
            this.currentTileLayer = L.tileLayer(tileUrl, layerOptions);
            this.currentTileLayer.addTo(this.map);
        }

        // 保持之前的滤镜 - 已移至 TerrainEditor 控制，此处仅负责重置或默认
        // const chkAncient = document.getElementById('chk-ancient') as HTMLInputElement;
        // ... (Logic removed from here)

        // 保持河流和地形的顺序
        // 1. Base Map (Added above)
        // 2. Hillshade (zIndex 2)
        // 3. River (zIndex 4)

        // 如果地形层已存在，不用动，它有 zIndex 控制
        // 如果河流层已存在，bringToFront 确保它在最上面
        if (this.riverLayer) {
            this.riverLayer.bringToFront();
        }

        // [FIX] 确保 HillshadeLayer 在底图之上（防止被新加载的 TileLayer 覆盖）
        if (this.hillshadeLayer && this.map.hasLayer(this.hillshadeLayer)) {
            this.hillshadeLayer.bringToFront();
        }
    }

    public toggleHillshade(enable: boolean) {
        if (enable) {
            // [FIX] Calculate initial Z-Factor based on current zoom
            const zoom = this.map.getZoom();
            let initialZ = 30.0;
            if (zoom <= 7) initialZ = 10.0;
            else if (zoom === 8) initialZ = 20.0;
            else if (zoom === 9) initialZ = 30.0;
            else if (zoom === 10) initialZ = 40.0;
            else if (zoom === 11) initialZ = 50.0;
            else if (zoom >= 12) initialZ = 60.0;

            if (!this.hillshadeLayer) {
                this.hillshadeLayer = new HillshadeLayer({
                    zIndex: 2,
                    maxZoom: 18,
                    zFactor: initialZ // Apply correctly on init
                });
            }
            if (!this.map.hasLayer(this.hillshadeLayer)) {
                this.hillshadeLayer.addTo(this.map);
            }
            // Ensure params are up to date if reusing existing layer
            if (this.hillshadeLayer) {
                this.hillshadeLayer.setParams({ zFactor: initialZ });
            }
        } else {
            if (this.hillshadeLayer && this.map.hasLayer(this.hillshadeLayer)) {
                this.map.removeLayer(this.hillshadeLayer);
            }
        }
    }

    public toggleRiver(enable: boolean) {
        // [MODIFIED] Keep existing RiverOverlayLayer (ESRI) Logic
        if (this.riverLayer) {
            if ((this.riverLayer as any)._map) {
                this.map.removeLayer(this.riverLayer as any);
            } else if (this.map.hasLayer(this.riverLayer as any)) {
                this.map.removeLayer(this.riverLayer as any);
            }
        }

        // [NEW] Toggle Vector Layer logic
        if (this.vectorRiverLayer) {
            if (this.map.hasLayer(this.vectorRiverLayer)) {
                this.map.removeLayer(this.vectorRiverLayer);
            }
        }

        // [USER FIXED] 恢复 ESRI 样式，不移除 river-blend-style
        // const existingStyle = document.getElementById('river-blend-style');
        // if (existingStyle) {
        //    existingStyle.remove();
        // }

        if (enable) {
            // 1. Load ESRI Layer (Existing)
            this.riverLayer = new RiverOverlayLayer();
            this.riverLayer.addTo(this.map);

            // 2. Load Vector Layer (New Authentic Data)
            // fetch data if not loaded
            if (!this.vectorRiverLayer) {
                // [FIX] Use import.meta.env.BASE_URL for Vite compatibility
                const basePath = import.meta.env.BASE_URL || '/';
                fetch(`${basePath}assets/ne_10m_rivers_lake_centerlines.geojson`)
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        console.log('[GameMap] Vector river data loaded:', data.features?.length || 0, 'features');
                        // [FIX] Use dedicated pane for proper z-ordering
                        this.vectorRiverLayer = new VectorRiverLayer(data, { pane: 'vectorRiverPane' });
                        // Ensure it's added if 'enable' is still true
                        // @ts-ignore
                        if (enable && this.map) {
                            this.vectorRiverLayer.addTo(this.map);
                            this.vectorRiverLayer.bringToBack(); // [USER REQUEST] Put below ESRI
                            console.log('[GameMap] VectorRiverLayer added to map (Behind)');

                            // [NEW] Initial Dynamic Style
                            const currentZoom = this.map.getZoom();
                            this.vectorRiverLayer.updateStyle(currentZoom);

                            // [FIX] Apply initial offset mode immediately!
                            const shouldOffset = currentZoom <= 9;
                            this.vectorRiverLayer.setOffsetMode(shouldOffset);

                            // [USER REQUEST] Ensure ESRI stays on top
                            if (this.riverLayer) {
                                this.riverLayer.bringToFront();
                            }
                        }

                        // [NEW] Bind auto-scaling to map zoom
                        this.map.on('zoomend', () => {
                            if (!this.vectorRiverLayer) return;
                            const zoom = this.map.getZoom();

                            // [USER REQUEST] Only show in Zoom 8-9-10
                            const shouldShow = zoom >= 8 && zoom <= 10;

                            if (shouldShow) {
                                if (!this.map.hasLayer(this.vectorRiverLayer)) {
                                    this.vectorRiverLayer.addTo(this.map);
                                    this.vectorRiverLayer.bringToBack();
                                    if (this.riverLayer) this.riverLayer.bringToFront();
                                }
                                this.vectorRiverLayer.updateStyle(zoom);
                                // Offset: ON for 8-9, OFF for 10
                                this.vectorRiverLayer.setOffsetMode(zoom <= 9);
                            } else {
                                if (this.map.hasLayer(this.vectorRiverLayer)) {
                                    this.map.removeLayer(this.vectorRiverLayer);
                                }
                            }
                        });

                        // [FIX] Trigger initial visibility check
                        this.map.fire('zoomend');
                    })
                    .catch(err => console.error('[GameMap] Failed to load vector rivers:', err));
            } else {
                // [FIX] Let zoomend listener handle visibility (Zoom 8-10 only)
                this.map.fire('zoomend');
            }
        }
    }

    public toggleAncientStyle(enable: boolean) {
        const tilesPane = document.querySelector('.leaflet-tile-pane') as HTMLElement;
        if (!tilesPane) return;
        if (enable) {
            tilesPane.style.filter = 'sepia(0.6) contrast(1.2) brightness(0.95) hue-rotate(-10deg)';
        } else {
            tilesPane.style.filter = 'none';
        }
    }

    // private addStyleControl() { ... } // REMOVED

    public getLeafletMap(): L.Map {
        return this.map;
    }

    public getContainer(): HTMLElement {
        return this.map.getContainer();
    }

    public latLngToContainerPoint(latlng: [number, number]): L.Point {
        return this.map.latLngToContainerPoint(latlng);
    }

    public getCityCaptureRenderer(): CityCaptureRenderer | null {
        return this.cityCaptureRenderer;
    }

    private gridLayer: StrategicGridLayer | null = null;

    public toggleGrid(enable: boolean) {
        if (!this.gridLayer) {
            this.gridLayer = new StrategicGridLayer(this.map);
        }
        this.gridLayer.toggle(enable);
    }

    private addZoomIndicator(): void {
        // Wait for Leaflet zoom control to be rendered
        setTimeout(() => {
            const zoomControl = document.querySelector('.leaflet-control-zoom');
            if (!zoomControl) return;

            // Create zoom level display element
            const indicator = document.createElement('a');
            indicator.id = 'zoom-level-display';
            indicator.className = 'leaflet-control-zoom-level';
            indicator.style.cssText = `
                display: block;
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                color: #333;
                background: #fff;
                border-top: 1px solid #ccc;
                padding: 4px 0;
                cursor: default;
                user-select: none;
            `;
            indicator.innerText = `${Math.floor(this.map.getZoom())}`;
            zoomControl.appendChild(indicator);

            // Update on zoom
            this.map.on('zoom', () => {
                indicator.innerText = `${Math.floor(this.map.getZoom())}`;
            });
        }, 100);
    }
}

