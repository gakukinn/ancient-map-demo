import L from 'leaflet';
import { LatLng } from '../types/core';
import { GameMap } from '../map/GameMap';

/**
 * HexPathRenderer
 * 
 * Visualizes calculated hex paths on the map.
 * Shows the actual route a legion will take, including any detours.
 */
export class HexPathRenderer {
    private map: L.Map;
    private pathLines: Map<string, L.Polyline> = new Map();
    private waypointMarkers: Map<string, L.CircleMarker[]> = new Map();

    constructor(gameMap: GameMap) {
        this.map = gameMap.getLeafletMap();
    }

    /**
     * Render a path for an army.
     * @param armyId Unique identifier for the army
     * @param path Array of LatLng waypoints
     * @param color Line color (default: cyan)
     */
    public renderPath(armyId: string, path: LatLng[], color: string = '#00BFFF'): void {
        // [MOD] User requested to remove the blue path line
        // We just clear the existing path and return
        this.clearPath(armyId);
        return;

        /*
        if (path.length < 2) return;

        // Create polyline
        const latLngs = path.map(p => L.latLng(p.lat, p.lng));
        const line = L.polyline(latLngs, {
            color: color,
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5',
            className: 'hex-path-line'
        }).addTo(this.map);

        this.pathLines.set(armyId, line);

        // Create small circle markers at each waypoint
        const markers: L.CircleMarker[] = [];
        path.forEach((p, i) => {
            // Skip first point (current position), and make last point (destination) special
            if (i === 0) return;

            const isDestination = i === path.length - 1;
            const marker = L.circleMarker(L.latLng(p.lat, p.lng), {
                radius: isDestination ? 8 : 4,
                color: color,
                fillColor: isDestination ? '#FFD700' : color,
                fillOpacity: isDestination ? 1 : 0.5,
                weight: 2
            }).addTo(this.map);

            markers.push(marker);
        });

        this.waypointMarkers.set(armyId, markers);
        */
    }

    /**
     * Clear the rendered path for an army.
     */
    public clearPath(armyId: string): void {
        const line = this.pathLines.get(armyId);
        if (line) {
            this.map.removeLayer(line);
            this.pathLines.delete(armyId);
        }

        const markers = this.waypointMarkers.get(armyId);
        if (markers) {
            markers.forEach(m => this.map.removeLayer(m));
            this.waypointMarkers.delete(armyId);
        }
    }

    /**
     * Clear all rendered paths.
     */
    public clearAll(): void {
        this.pathLines.forEach((line, id) => {
            this.map.removeLayer(line);
        });
        this.pathLines.clear();

        this.waypointMarkers.forEach((markers, id) => {
            markers.forEach(m => this.map.removeLayer(m));
        });
        this.waypointMarkers.clear();
    }

    /**
     * Update the path (e.g., when army moves and path shortens).
     * Removes the first waypoint marker when the army reaches it.
     */
    public updatePath(armyId: string, currentPath: LatLng[]): void {
        // For simplicity, just re-render the whole path
        // In a more optimized version, we'd update the polyline points
        this.renderPath(armyId, currentPath);
    }
}
