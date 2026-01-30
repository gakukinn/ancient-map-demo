import L from 'leaflet';
import { GridSystem } from '../systems/GridSystem';
import { MAP_LAYER_ZINDEX, MAP_PANES } from '../config/MapLayers';

export class StrategicGridLayer {
    private map: L.Map;
    private canvas: HTMLCanvasElement;
    private isVisible: boolean = false;
    private paneName: string = 'strategicGridPane';

    constructor(map: L.Map) {
        this.map = map;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'strategic-grid-layer leaflet-zoom-animated';
        this.canvas.style.pointerEvents = 'none'; // Click-through

        this.initPane();

        // Bind events
        this.map.on('moveend', this.render.bind(this));
        this.map.on('zoomend', this.render.bind(this));
        this.map.on('resize', this.resize.bind(this));

        // Initial setup
        this.resize();
    }

    private initPane() {
        if (!this.map.getPane(this.paneName)) {
            this.map.createPane(this.paneName);
            const pane = this.map.getPane(this.paneName);
            if (pane) {
                // Should be above tiles (200) but below units (600)
                pane.style.zIndex = '300';
                pane.style.pointerEvents = 'none';
                pane.appendChild(this.canvas);
            }
        }
    }

    public toggle(show: boolean) {
        this.isVisible = show;
        this.canvas.style.display = show ? 'block' : 'none';
        if (show) {
            this.render();
        }
    }

    private resize() {
        const size = this.map.getSize();
        this.canvas.width = size.x;
        this.canvas.height = size.y;

        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);

        if (this.isVisible) {
            this.render();
        }
    }

    private render() {
        if (!this.isVisible) return;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update position (essential for zoom animations to align)
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);

        // Get bounds
        const bounds = this.map.getBounds();
        const center = this.map.getCenter();

        // Get Hexes
        // Use the map center as the grid origin for consistency
        // Use the map center as the grid origin for consistency
        const gridCenter = GridSystem.ORIGIN; // Chang'an base
        const hexes = GridSystem.getHexesInBounds(bounds, gridCenter);

        console.log(`[StrategicGrid] Rendering... Bounds: ${bounds.toBBoxString()}, Hexes found: ${hexes.length}`);

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; // Darker for visibility as requested
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Faint fill

        hexes.forEach(hexCenter => {
            // GridSystem now uses fixed projection (34.26°N) for all calculations
            const corners = GridSystem.getHexagonCorners(hexCenter);

            ctx.beginPath();
            corners.forEach((corner, i) => {
                const point = this.map.latLngToContainerPoint([corner.lat, corner.lng]);
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.closePath();
            ctx.stroke();
            // ctx.fill(); // Optional fill
        });
    }
}
