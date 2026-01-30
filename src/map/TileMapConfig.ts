/**
 * TileMapConfig.ts
 * 地图瓦片配置
 */

import type { LatLng } from '../types/core';

// 瓦片坐标
export interface TileCoord {
    x: number;
    y: number;
    zoom: number;
}

// 边界范围
// COVERAGE_BOUNDS removed from type definition

// 视口
export interface Viewport {
    centerLat: number;
    centerLng: number;
    width: number;
    height: number;
}

// 瓦片配置类型
interface TileConfigType {
    TILE_SIZE: number;
    TILE_URL: string;
    ZOOM_LEVELS: {
        CORE: number;
    };
    DEFAULT_ZOOM: number;
    MIN_ZOOM: number;
    MAX_ZOOM: number;
    TILE_PATHS: Record<number, string>;
    MAP_CENTER: LatLng;
    MERCATOR: {
        EARTH_RADIUS: number;
        MAX_LATITUDE: number;
    };
    // COVERAGE_BOUNDS removed
    CACHE: {
        MAX_TILES: number;
        PRELOAD_RADIUS: number;
    };
    PERFORMANCE: {
        MAX_CONCURRENT_LOADS: number;
        FADE_IN_DURATION: number;
        THROTTLE_RENDER: number;
        RETRY_ATTEMPTS: number;
        RETRY_DELAY: number;
    };
    ACTIVE_SOURCE?: string;
    SOURCES?: Record<string, {
        url: string;
        options: any;
    }>;
}

export const TILE_CONFIG: TileConfigType = {
    // 瓦片大小：我们使用Google标准512px瓦片
    TILE_SIZE: 512,

    // 地图源配置
    ACTIVE_SOURCE: 'LOCAL', // [OPTIMIZATION] Use LOCAL (Procedural) for pure ancient map look

    SOURCES: {
        LOCAL: {
            url: '', // 使用 TILE_PATHS
            options: {
                maxZoom: 11,
                minZoom: 7,
                minNativeZoom: 9,
                maxNativeZoom: 11  // Now supports native zoom 9 and 11
            }
        },
        ESRI_SHADED: {
            // Esri World Shaded Relief
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
            options: {
                maxZoom: 13,
                minZoom: 2,
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
            }
        },
        ESRI_HYDRO: {
            // Esri World Ocean Reference (Includes inland water)
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
            options: {
                maxZoom: 13,
                minZoom: 2,
                zIndex: 10, // Ensure high zIndex to prevent occlusion
                opacity: 0.8
            }
        },
        GOOGLE_TERRAIN: {
            url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', // lyrs=p for terrain
            options: {
                maxZoom: 20,
                minZoom: 2,
                subdomains: '0123'
            }
        }
    },

    // 在线地图URL（备用，当本地瓦片不可用时）
    TILE_URL: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',

    // 只使用核心层级（zoom 9）
    ZOOM_LEVELS: {
        CORE: 9
    },

    DEFAULT_ZOOM: 9,
    MIN_ZOOM: 4,
    MAX_ZOOM: 13,

    // 瓦片资源路径（已移除本地瓦片，全程序生成）
    TILE_PATHS: {},

    // 地图初始中心点（长安地区）
    MAP_CENTER: {
        lat: 34.26,
        lng: 108.94
    },

    // Web墨卡托投影参数
    MERCATOR: {
        EARTH_RADIUS: 6378137,
        MAX_LATITUDE: 85.0511287798
    },

    // 瓦片覆盖范围（zoom 9级别的瓦片坐标范围）
    // X: 359-443 覆盖经度约103°-115°
    // Y: 173-229 覆盖纬度约29°-39°
    // COVERAGE_BOUNDS removed as it was misleading and unused.

    CACHE: {
        MAX_TILES: 500,
        PRELOAD_RADIUS: 1
    },

    PERFORMANCE: {
        MAX_CONCURRENT_LOADS: 8,
        FADE_IN_DURATION: 150,
        THROTTLE_RENDER: 16,
        RETRY_ATTEMPTS: 2,
        RETRY_DELAY: 1000
    }
};

/**
 * Convert latitude/longitude to a tile coordinate
 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
    const n = Math.pow(2, zoom);
    const latRad = lat * Math.PI / 180;

    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

    return { x, y, zoom };
}

/**
 * Convert tile coordinates back to latitude/longitude
 */
export function tileToLatLng(x: number, y: number, zoom: number): LatLng {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;

    return { lat, lng };
}

/**
 * Haversine distance helper used by gameplay systems
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = TILE_CONFIG.MERCATOR.EARTH_RADIUS;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Build a tile path for the supported zoom level
 */
export function getTilePath(zoom: number, x: number, y: number): string | null {
    const basePath = TILE_CONFIG.TILE_PATHS[zoom];
    if (!basePath) {
        console.warn(`Tile path unavailable for zoom=${zoom}`);
        return null;
    }

    return `${basePath}/${x}/${y}.jpg`;
}

/**
 * Check if zoom level is available
 */
export function isZoomAvailable(zoom: number): boolean {
    return TILE_CONFIG.TILE_PATHS.hasOwnProperty(zoom);
}

/**
 * Get all available zoom levels
 */
export function getAvailableZooms(): number[] {
    return Object.keys(TILE_CONFIG.TILE_PATHS).map(Number).sort((a, b) => a - b);
}

/**
 * Check if tile is in coverage bounds
 */
export function isTileInCoverage(x: number, y: number, zoom: number): boolean {
    return true; // Always true (Global Access)
}

/**
 * Get visible tiles for viewport
 */
export function getVisibleTiles(viewport: Viewport, zoom: number): TileCoord[] {
    const { centerLat, centerLng, width, height } = viewport;
    const centerTile = latLngToTile(centerLat, centerLng, zoom);

    const tilesX = Math.ceil(width / TILE_CONFIG.TILE_SIZE) + 2;
    const tilesY = Math.ceil(height / TILE_CONFIG.TILE_SIZE) + 2;

    const tiles: TileCoord[] = [];
    const startX = centerTile.x - Math.floor(tilesX / 2);
    const startY = centerTile.y - Math.floor(tilesY / 2);

    for (let dy = 0; dy < tilesY; dy++) {
        for (let dx = 0; dx < tilesX; dx++) {
            const x = startX + dx;
            const y = startY + dy;
            const maxTile = Math.pow(2, zoom);

            if (x >= 0 && x < maxTile && y >= 0 && y < maxTile) {
                tiles.push({ x, y, zoom });
            }
        }
    }

    return tiles;
}
