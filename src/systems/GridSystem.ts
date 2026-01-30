import { LatLng } from '../types/core';

export interface Hex {
    q: number;
    r: number;
    s?: number;
}

export class GridSystem {
    /**
     * [OPTIMIZATION] Generate a unique 32-bit integer key for hexagonal coordinates (q, r).
     * Format: 16 bits for q, 16 bits for r.
     * Handles negative numbers via 2's complement (standard bitwise ops).
     */
    public static getSpatialKey(q: number, r: number): number {
        return (q << 16) | (r & 0xFFFF);
    }

    /**
     * [OPTIMIZATION] Extract (q, r) from a 32-bit integer spatial key.
     */
    public static getCoordsFromKey(key: number): { q: number, r: number } {
        const r = (key & 0xFFFF) << 16 >> 16; // Sign extend
        const q = key >> 16;
        return { q, r };
    }

    // Radius of the hexagon in degrees (approximate)
    // 0.15 degrees is roughly 16.5km, which is a reasonable size for a "province" or city territory
    private static readonly HEX_RADIUS = 0.15;

    // Global Grid Origin and Projection Reference (Chang'an / Xi'an)
    // ALL hexagon calculations use this latitude for projection to ensure zero overlap
    public static readonly ORIGIN = { lat: 34.26, lng: 108.94 };

    // Pre-computed projection factor for performance
    private static readonly PROJECTION_FACTOR = 1 / Math.cos(34.26 * Math.PI / 180);

    /**
     * Calculate the 6 corners of a hexagon centered at (lat, lng)
     * We use "Pointy-topped" hexagons.
     * Uses FIXED projection latitude for consistent hexagon shapes.
     */
    public static getHexagonCorners(center: LatLng): LatLng[] {
        const corners: LatLng[] = [];

        for (let i = 0; i < 6; i++) {
            // Pointy-topped hexagon: angles at 30, 90, 150...
            // 60 * i - 30 gives: -30, 30, 90, 150, 210, 270
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;

            // Apply fixed projection factor for longitude
            const x = GridSystem.HEX_RADIUS * Math.cos(angle_rad) * GridSystem.PROJECTION_FACTOR;
            const y = GridSystem.HEX_RADIUS * Math.sin(angle_rad);

            corners.push({
                lat: center.lat + y,
                lng: center.lng + x
            });
        }
        return corners;
    }

    /**
     * Get all hexagon objects (with q,r) within a given radius
     */
    public static getHexObjectsInRadius(center: LatLng, radius: number): Hex[] {
        const results: Hex[] = [{ q: 0, r: 0 }]; // Center is always 0,0 relative to itself

        // Iterate q and r in a box and check distance
        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                if (Math.abs(q + r) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius) {
                    // Check distance in hex steps
                    const dist = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
                    if (dist <= radius && !(q === 0 && r === 0)) {
                        results.push({ q, r });
                    }
                }
            }
        }
        return results;
    }

    /**
     * Get all hexagon centers within a given radius (in hex steps)
     * radius 0 = just center (1 hex)
     * radius 1 = center + 6 neighbors (7 hexes)
     * radius 2 = center + 6 + 12 (19 hexes)
     */
    public static getHexagonsInRadius(center: LatLng, radius: number): LatLng[] {
        const results: LatLng[] = [center];

        for (let k = 1; k <= radius; k++) {
            const ring = GridSystem.getRing(center, k);
            results.push(...ring);
        }

        return results;
    }

    /**
     * Get a specific ring of hexagons
     */
    private static getRing(center: LatLng, radius: number): LatLng[] {
        const results: LatLng[] = [];
        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        // Start at direction 4 (South-West ish) * radius
        let current = GridSystem.getOffset(center, 4, radius * dist);

        for (let i = 0; i < 6; i++) {
            // Traverse the side of the ring
            for (let j = 0; j < radius; j++) {
                results.push(current);
                // Move to next hex in direction i
                current = GridSystem.getOffset(current, i, dist);
            }
        }

        return results;
    }

    /**
     * Calculate a new point given a start point, direction index, and distance
     * Uses FIXED projection latitude for consistent spacing
     */
    private static getOffset(start: LatLng, directionIndex: number, distance: number): LatLng {
        // Directions for neighbor movement (0, 60, 120...)
        // 0: 0 deg (East)
        // 1: 60 deg (South East)
        // 2: 120 deg (South West)
        // 3: 180 deg (West)
        // 4: 240 deg (North West)
        // 5: 300 deg (North East)
        const angle_deg = 60 * directionIndex;
        const angle_rad = Math.PI / 180 * angle_deg;

        // Use FIXED projection factor for longitude
        const x = distance * Math.cos(angle_rad) * GridSystem.PROJECTION_FACTOR;
        const y = distance * Math.sin(angle_rad);

        return {
            lat: start.lat + y,
            lng: start.lng + x
        };
    }

    /**
     * Convert Axial Coordinates (q, r) to LatLng
     * Uses FIXED projection for consistent results
     */
    public static hexToLatLng(q: number, r: number, center: LatLng): LatLng {
        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        // q moves East (0 deg)
        // r moves South East (60 deg)
        const x_offset = (q * dist * Math.cos(0)) + (r * dist * Math.cos(Math.PI / 3));
        const y_offset = (q * dist * Math.sin(0)) + (r * dist * Math.sin(Math.PI / 3));

        // Use FIXED projection factor for longitude
        const lng_offset = x_offset * GridSystem.PROJECTION_FACTOR;

        return {
            lat: center.lat + y_offset,
            lng: center.lng + lng_offset
        };
    }

    /**
     * Get all hexes within the map bounds
     */
    public static getHexesInBounds(bounds: L.LatLngBounds, center: LatLng): LatLng[] {
        const results: LatLng[] = [];

        const northWest = bounds.getNorthWest();
        const southEast = bounds.getSouthEast();

        const latMin = southEast.lat;
        const latMax = northWest.lat;
        const lngMin = northWest.lng;
        const lngMax = southEast.lng;

        // Step size (roughly hex size)
        const latStep = GridSystem.HEX_RADIUS * 1.5;
        const lngStep = GridSystem.HEX_RADIUS * 1.7; // sqrt(3)

        // Iterate through the lat/lng bounding box
        for (let lat = latMin - latStep; lat <= latMax + latStep; lat += latStep) {
            for (let lng = lngMin - lngStep; lng <= lngMax + lngStep; lng += lngStep) {
                // Find the nearest hex center to this point
                const hex = GridSystem.roundToHex(lat, lng, center);
                results.push(hex);
            }
        }

        // Remove duplicates (simple string check)
        const unique = new Map<string, LatLng>();
        results.forEach(p => unique.set(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`, p));

        return Array.from(unique.values());
    }

    /**
     * Find nearest hex center for a given LatLng
     * Uses FIXED projection for consistent rounding
     */
    private static roundToHex(lat: number, lng: number, center: LatLng): LatLng {
        // Convert LatLng to local cartesian using FIXED projection
        const y = lat - center.lat;
        const x = (lng - center.lng) / GridSystem.PROJECTION_FACTOR; // Reverse the projection

        // Convert to Axial (q, r)
        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        const r = y / (dist * Math.sin(Math.PI / 3));
        const q = (x - r * dist * Math.cos(Math.PI / 3)) / dist;

        // Round to nearest hex (Cube coordinates rounding algorithm)
        let x_cube = q;
        let z_cube = r;
        let y_cube = -x_cube - z_cube;

        let rx = Math.round(x_cube);
        let ry = Math.round(y_cube);
        let rz = Math.round(z_cube);

        const x_diff = Math.abs(rx - x_cube);
        const y_diff = Math.abs(ry - y_cube);
        const z_diff = Math.abs(rz - z_cube);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return GridSystem.hexToLatLng(rx, rz, center);
    }

    /**
     * Convert LatLng to Axial Coordinates (q, r)
     * Uses FIXED projection latitude (ORIGIN) for consistent results
     */
    public static latLngToAxial(lat: number, lng: number): { q: number, r: number } {
        const y = lat - GridSystem.ORIGIN.lat;
        const x = (lng - GridSystem.ORIGIN.lng) / GridSystem.PROJECTION_FACTOR;

        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        const r = y / (dist * Math.sin(Math.PI / 3));
        const q = (x - r * dist * Math.cos(Math.PI / 3)) / dist;

        return GridSystem.roundCube(q, r);
    }

    /**
     * [OPTIMIZATION] Get Hex Key directly from LatLng without object allocation.
     * Combines latLngToAxial and makeKey.
     */
    public static getHexKeyAtLatLng(lat: number, lng: number): number {
        const y = lat - GridSystem.ORIGIN.lat;
        const x = (lng - GridSystem.ORIGIN.lng) / GridSystem.PROJECTION_FACTOR;

        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        const r = y / (dist * Math.sin(Math.PI / 3));
        const q = (x - r * dist * Math.cos(Math.PI / 3)) / dist;

        // Inline roundCube to avoid object return
        let rx = Math.round(q);
        let ry = Math.round(-q - r);
        let rz = Math.round(r);

        const x_diff = Math.abs(rx - q);
        const y_diff = Math.abs(ry - (-q - r));
        const z_diff = Math.abs(rz - r);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return (rx << 16) | (rz & 0xFFFF);
    }

    /**
     * Round floating point axial coords to nearest integer hex
     */
    private static roundCube(q: number, r: number): { q: number, r: number } {
        let x = q;
        let z = r;
        let y = -x - z;

        let rx = Math.round(x);
        let ry = Math.round(y);
        let rz = Math.round(z);

        const x_diff = Math.abs(rx - x);
        const y_diff = Math.abs(ry - y);
        const z_diff = Math.abs(rz - z);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    }

    /**
     * Convert Axial Coordinates to LatLng (Global version)
     * Uses FIXED projection latitude (ORIGIN) for consistent results
     */
    public static axialToLatLng(q: number, r: number): LatLng {
        const dist = Math.sqrt(3) * GridSystem.HEX_RADIUS;

        const x_offset = (q * dist * Math.cos(0)) + (r * dist * Math.cos(Math.PI / 3));
        const y_offset = (q * dist * Math.sin(0)) + (r * dist * Math.sin(Math.PI / 3));

        const lng_offset = x_offset * GridSystem.PROJECTION_FACTOR;

        return {
            lat: GridSystem.ORIGIN.lat + y_offset,
            lng: GridSystem.ORIGIN.lng + lng_offset
        };
    }

    /**
     * Get the 6 neighboring hex coordinates in axial format
     * @param q Axial Q coordinate
     * @param r Axial R coordinate
     * @returns Array of 6 neighbor coordinates
     */
    public static getNeighborAxialCoords(q: number, r: number): { q: number, r: number }[] {
        // Axial coordinate directions for pointy-top hexagons
        // Order: E, SE, SW, W, NW, NE
        const directions = [
            { q: 1, r: 0 },   // East
            { q: 0, r: 1 },   // South-East
            { q: -1, r: 1 },  // South-West
            { q: -1, r: 0 },  // West
            { q: 0, r: -1 },  // North-West
            { q: 1, r: -1 }   // North-East
        ];

        return directions.map(d => ({ q: q + d.q, r: r + d.r }));
    }

    /**
     * [OPTIMIZATION] Zero-Allocation Neighbor Iteration
     * Invokes callback for each neighbor without creating arrays/objects.
     */
    public static forEachNeighbor(q: number, r: number, callback: (nq: number, nr: number) => void): void {
        callback(q + 1, r);     // East
        callback(q, r + 1);     // South-East
        callback(q - 1, r + 1); // South-West
        callback(q - 1, r);     // West
        callback(q, r - 1);     // North-West
        callback(q + 1, r - 1); // North-East
    }

    /**
     * 获取指定半径的六边形环（不包含内部格子）
     * @param centerQ 中心点 Q 坐标
     * @param centerR 中心点 R 坐标
     * @param radius 环的半径（1 = 相邻的6格）
     * @returns 环上所有六边格的坐标数组
     */
    public static getHexRing(centerQ: number, centerR: number, radius: number): Hex[] {
        if (radius <= 0) return [{ q: centerQ, r: centerR }];

        const results: Hex[] = [];
        const directions = [
            { q: 1, r: 0 },   // East
            { q: 0, r: 1 },   // South-East
            { q: -1, r: 1 },  // South-West
            { q: -1, r: 0 },  // West
            { q: 0, r: -1 },  // North-West
            { q: 1, r: -1 }   // North-East
        ];

        // 从 "West" 方向开始，走 radius 步
        let current = { q: centerQ - radius, r: centerR + radius };

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                results.push({ q: current.q, r: current.r });
                current = { q: current.q + directions[i].q, r: current.r + directions[i].r };
            }
        }

        return results;
    }
    /**
     * Calculate Manhattan distance between two hexes on the grid.
     * Formula: (|q1 - q2| + |q1 + r1 - q2 - r2| + |r1 - r2|) / 2
     */
    public static getDistance(a: Hex, b: Hex): number {
        const dq = a.q - b.q;
        const dr = a.r - b.r;
        return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
    }
}
