import L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { GridSystem } from '../systems/GridSystem';

export class GridManager {
    private map: GameMap;
    private layerGroup: L.LayerGroup;
    private isVisible: boolean = false;

    constructor(map: GameMap) {
        this.map = map;
        this.layerGroup = L.layerGroup(); // Don't add to map initially
        this.setupGrid();
        // Removed setupControls() - event listener is now in main.ts only
    }

    public toggleGrid(): void {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.map.getLeafletMap().addLayer(this.layerGroup);
        } else {
            this.map.getLeafletMap().removeLayer(this.layerGroup);
        }
    }

    private setupGrid(): void {
        // Initial render
        this.updateGrid();

        // Update on move and zoom
        this.map.getLeafletMap().on('moveend zoomend', () => {
            if (this.isVisible) {
                this.updateGrid();
            }
        });
    }

    private updateGrid(): void {
        this.layerGroup.clearLayers();

        const map = this.map.getLeafletMap();
        const zoom = map.getZoom();

        // Performance Optimization: Don't render grid if zoomed out too far
        // Rendering thousands of polygons will lag the browser
        if (zoom < 7) {
            return;
        }

        const bounds = map.getBounds();
        const center = { lat: 34.26, lng: 108.94 }; // Global origin (Chang'an)
        const projectionLat = center.lat;

        // Get hexes in current view
        const hexCenters = GridSystem.getHexesInBounds(bounds, center);

        hexCenters.forEach(hexCenter => {
            const corners = GridSystem.getHexagonCorners(hexCenter);
            const latLngs = corners.map(c => [c.lat, c.lng] as [number, number]);

            L.polygon(latLngs, {
                color: '#000000', // Black border
                weight: 1,
                fill: false,      // No fill
                opacity: 0.5
            }).addTo(this.layerGroup);
        });
    }
}
