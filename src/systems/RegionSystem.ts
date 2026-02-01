import { CityType } from '../types/core';
import { CITY_CONFIG } from '../config/CityConfig';
import { resolvePath } from '../utils/PathUtils';

// 1. Definition of Regions and Styles
export type RegionType =
    | 'CENTRAL'  // 中原
    | 'NORTH'    // 北方
    | 'SOUTH'    // 江南
    | 'CHU_SHU'  // 楚蜀
    | 'LINGNAN'  // 岭南
    | 'NORTHWEST'// 西北
    | 'WESTERN'  // 西域
    | 'NOMADIC'  // 塞外
    | 'NORTHEAST'// 东北
    | 'TIBET'    // 西藏
    | 'JAPAN'    // 日本
    | 'KOREA'    // 朝鲜
    // === Step 1: Global ===
    | 'SOUTH_HEMISPHERE' // 南半球
    | 'NEW_WORLD'        // 新大陆
    // === Step 2: Eurasia Latitude Zones ===
    | 'SIBERIA'          // 极北 (Snow)
    | 'TROPICS'          // 热带 (Rainforest)
    | 'WEST_WORLD'       // 西方
    | 'CENTRAL_WORLD';   // 中亚

// Valid region list for validation
const REGION_ORDER: RegionType[] = [
    'CENTRAL', 'NORTH', 'SOUTH', 'CHU_SHU', 'LINGNAN',
    'NORTHWEST', 'WESTERN', 'NOMADIC', 'NORTHEAST', 'TIBET', 'JAPAN', 'KOREA',
    'SOUTH_HEMISPHERE', 'NEW_WORLD', 'SIBERIA', 'TROPICS', 'WEST_WORLD', 'CENTRAL_WORLD'
];

export type CityScale = 'big' | 'medium' | 'small' | 'pass' | 'ferry';

// 2. Polygon Definitions (Approximate Geographic Boundaries)
interface Point { lat: number; lng: number; }
type Polygon = Point[];

// Helper: Point in Polygon (Ray Casting Algorithm)
function isPointInPolygon(lat: number, lng: number, polygon: Polygon): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;

        const intersect = ((yi > lat) !== (yj > lat))
            && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// === Region Definitions (Polygons DELETED) ===
// Legacy polygon data removed to enforce strict Latitude/Longitude logic.

// 3. Region Deterministic Logic
export function getRegion(lat: number, lng: number): RegionType {
    // ==========================================
    // STEP 1: GLOBAL FILTERS (Hemisphere/New World)
    // ==========================================
    if (lat < 0) return 'SOUTH_HEMISPHERE';
    if (lng < -30 || lng > 170) return 'NEW_WORLD';

    // ==========================================
    // STEP 2: EURASIA LATITUDE ZONES (Climate Bands)
    // ==========================================
    // ==========================================
    // STEP 2: EURASIA LATITUDE ZONES (Climate Bands)
    // ==========================================
    if (lat > 50.0) return 'SIBERIA'; // High North (User Rule: > 50N is Snow)
    if (lat < 19.0) return 'TROPICS'; // Deep South

    // ==========================================
    // STEP 3: CORE TEMPERATE ZONE (19N - 50N)
    // ==========================================

    // ------------------------------------------
    // 3.0: Priority Special Regions (Polygons & Coordinate Boxes)
    // ------------------------------------------

    // [User Rule] Tibet Box (Snow): 29N - 36N, 78E - 101E
    // [User Rule] Tibet Box (Snow): 29N - 36N, 78E - 101E
    if (lat > 29.0 && lat < 36.0 && lng > 78.0 && lng < 101.0) {
        return 'TIBET';
    }

    // [MOVED] Japan Check moved below Northeast to protect Sakhalin/Manchuria

    // [Legacy Polygons DELETED as per user request]
    // The system now strictly relies on the Latitude/Longitude logic below.

    // ------------------------------------------
    // 3.1: Longitude Sectors
    // ------------------------------------------

    // [User Rule] Western Region Box (36N - 44N, West of 97E)
    // "West of 97, North of 36, South of 44 is Western" (Yellow Earth)
    // Extended from 93 to 97 to include Hami (~93.5E) and Dunhuang (~94E).
    if (lat > 36.0 && lat <= 44.0 && lng <= 97.0) {
        return 'WESTERN';
    }

    // [User Rule] Nomadic Steppe Band (41N - 50N, West of 123E)
    // "123 West... All Steppe" (Overrides West/Central Logic for this specific latitude band)
    if (lat > 41.0 && lng <= 123.0) {
        return 'NOMADIC';
    }

    // A. The West (Europe / Middle East)
    if (lng < 60.0) {
        return 'WEST_WORLD';
    }

    // [User Rule] Northwest Region Box (36N - 41N, 97E - 108E)
    // "South of 41, North of 36, East of 97, West of 108 is Northwest" (Yellow Road)
    // Adjusted from 34N to 36N per user request. Tianshui/Pingliang shift to Central/North.
    if (lat > 36.0 && lat <= 41.0 && lng > 97.0 && lng <= 108.0) {
        return 'NORTHWEST';
    }

    // [User Rule] Southeast Asia / Myanmar Border (Lat < 26, 92E - 105E)
    // "Mud Road" for Zhoushui/Jiangtoucheng Area (West of 105, East of India)
    if (lat < 26.0 && lng > 92.0 && lng <= 105.0) {
        return 'LINGNAN';
    }

    // B. The Central (Indo-Iranian / Central Asia)
    if (lng < 97.0) { // Updated to 97E as per request
        if (lat > 35.0) return 'WESTERN'; // Tarim / Central Asia
        return 'CENTRAL_WORLD'; // India / Persia
    }

    // C. The East (East Asia) - lng >= 123.0 (for Specific Sub-regions) AND General Context
    // ------------------------------------------

    // 1. Northeast (User Rule A: > 40N & > 123E)
    // "40 North, 123 East is Northeast (Snow)"
    // [PRIORITY] Must be checked BEFORE Japan/Korea to handle Sakhalin/Manchuria correctly
    if (lat > 40.0 && lng > 123.0) {
        return 'NORTHEAST';
    }

    // 2. Japan (User Rule: East of 129.5E, South of 40N)
    // Covers Honshu, Kyushu, Shikoku (Kyoto is 35N, Tokyo 35.6N)
    if (lng > 129.5) {
        return 'JAPAN';
    }

    // 3. Korea (User Rule: Longitude 123-129.5, South of 40N)
    // "West of Japan, East of 123"
    if (lat > 33.0 && lng > 123.0 && lng <= 129.5) {
        return 'KOREA';
    }

    // 2. Nomadic (User Rule B)
    // Already handled above (priority before longitude split)
    if (lat > 41.0 && lng <= 123.0) {
        return 'NOMADIC';
    }

    // 3. North Region Box (User Rule: 36N - 41N, 108E - 123E)
    // "North of 36, South of 41, East of 108, West of 123 is NORTH" (Yellow Earth)
    if (lat > 36.0 && lat <= 41.0 && lng > 108.0 && lng <= 123.0) {
        return 'NORTH';
    }

    // 4. Central Plains Box (User Rule: 32N - 36N, 108E - 123E)
    // "South of 36, North of 32, East of 108, West of 123 is CENTRAL" (Central Earth Road)
    // [Hanzhong Extension]: 32N-34N, 106E-108E (West of 108 Line)
    if (lat > 32.0 && lat <= 34.0 && lng > 106.0 && lng <= 108.0) {
        return 'CENTRAL'; // Hanzhong
    }
    if (lat > 32.0 && lat <= 36.0 && lng > 108.0 && lng <= 123.0) {
        return 'CENTRAL';
    }

    // 5. South Region Box (User Rule: 26N - 32N, 111E - 123E)
    // "South of 32, North of 26, East of 111, West of 123 is SOUTH" (Muddy Road)
    if (lat > 26.0 && lat <= 32.0 && lng > 111.0 && lng <= 123.0) {
        return 'SOUTH';
    }

    // 6. Lingnan Region (User Rule: < 26N, > 105E)
    // "South of 26, East of 105 is LINGNAN" (Muddy Road)
    if (lat <= 26.0 && lng > 105.0) {
        return 'LINGNAN';
    }

    // 7. Chu-Shu Region (User Rule: <= 32N, 101E - 111E)
    // "South of 32, West of 111, East of 101 is Cloud/Gui/Sichuan" (Muddy Road)
    // Placed AFTER Lingnan to avoid hindering Lingnan in the overlapped SE corner.
    if (lat <= 32.0 && lng > 101.0 && lng <= 111.0) {
        return 'CHU_SHU';
    }

    // 8. North (General Fallback for remaining high lat in East)
    if (lat > 35.0) {
        return 'NORTH';
    }

    // 5. Central Plains (33N - 35N)
    if (lat > 33.0) {
        return 'CENTRAL';
    }

    // 6. The South (< 33N)
    if (lat > 35.0) return 'NORTHWEST'; // Fallback
    return 'SOUTH';
}

// 4. Hybrid City Region Detection (Explicit Override + Auto-detection)
export function getCityRegion(city: { latitude: number; longitude: number; region?: string }): RegionType {
    // Priority 1: Explicit region override
    if (city.region && REGION_ORDER.includes(city.region as RegionType)) {
        return city.region as RegionType;
    }
    // Priority 2: Auto-detect from coordinates
    return getRegion(city.latitude, city.longitude);
}

// 4. Style Mapping Table
const STYLE_MAP: Record<RegionType, { small: string, medium: string, big: string, pass: string, ferry: string }> = {
    CENTRAL: {
        small: resolvePath('/cities/central_small.png'),
        medium: resolvePath('/cities/central_medium.png'),
        big: resolvePath('/cities/central_big.png'),
        pass: resolvePath('/cities/central_pass.png'),
        ferry: resolvePath('/cities/central_ferry.png')
    },
    NORTH: {
        small: resolvePath('/cities/north_small.png'),
        medium: resolvePath('/cities/north_medium.png'),
        big: resolvePath('/cities/north_big.png'),
        pass: resolvePath('/cities/north_pass.png'),
        ferry: resolvePath('/cities/north_ferry.png')
    },
    SOUTH: {
        small: resolvePath('/cities/south_small.png'),
        medium: resolvePath('/cities/south_medium.png'),
        big: resolvePath('/cities/south_big.png'),
        pass: resolvePath('/cities/south_pass.png'),
        ferry: resolvePath('/cities/south_ferry.png')
    },
    CHU_SHU: {
        small: resolvePath('/cities/chushu_small.png'),
        medium: resolvePath('/cities/chushu_medium.png'),
        big: resolvePath('/cities/chushu_big.png'),
        pass: resolvePath('/cities/chushu_pass.png'),
        ferry: resolvePath('/cities/chushu_ferry.png')
    },
    LINGNAN: {
        small: resolvePath('/cities/lingnan_small.png'),
        medium: resolvePath('/cities/lingnan_medium.png'),
        big: resolvePath('/cities/lingnan_big.png'),
        pass: resolvePath('/cities/lingnan_pass.png'),
        ferry: resolvePath('/cities/lingnan_ferry.png')
    },
    NORTHWEST: {
        small: resolvePath('/cities/northwest_small.png'),
        medium: resolvePath('/cities/northwest_medium.png'),
        big: resolvePath('/cities/northwest_big.png'),
        pass: resolvePath('/cities/northwest_pass.png'),
        ferry: resolvePath('/cities/northwest_ferry.png')
    },
    WESTERN: {
        small: resolvePath('/cities/western_small.png'),
        medium: resolvePath('/cities/western_medium.png'),
        big: resolvePath('/cities/western_big.png'),
        pass: resolvePath('/cities/western_pass.png'),
        ferry: resolvePath('/cities/western_ferry.png')
    },
    NOMADIC: {
        small: resolvePath('/cities/nomadic_small.png'),
        medium: resolvePath('/cities/nomadic_medium.png'),
        big: resolvePath('/cities/nomadic_big.png'),
        pass: resolvePath('/cities/nomadic_pass.png'),
        ferry: resolvePath('/cities/nomadic_ferry.png')
    },
    NORTHEAST: {
        small: resolvePath('/cities/northeast_small.png'),
        medium: resolvePath('/cities/northeast_medium.png'),
        big: resolvePath('/cities/northeast_big.png'),
        pass: resolvePath('/cities/northeast_pass.png'),
        ferry: resolvePath('/cities/northeast_ferry.png')
    },
    TIBET: {
        small: resolvePath('/cities/tibet_small.png'),
        medium: resolvePath('/cities/tibet_medium.png'),
        big: resolvePath('/cities/tibet_big.png'),
        pass: resolvePath('/cities/tibet_pass.png'),
        ferry: resolvePath('/cities/tibet_ferry.png')
    },
    JAPAN: {
        small: resolvePath('/cities/japan_small.png'),
        medium: resolvePath('/cities/japan_medium.png'),
        big: resolvePath('/cities/japan_big.png'),
        pass: resolvePath('/cities/japan_pass.png'),
        ferry: resolvePath('/cities/japan_ferry.png')
    },
    KOREA: {
        small: resolvePath('/cities/korea_small.png'),
        medium: resolvePath('/cities/korea_medium.png'),
        big: resolvePath('/cities/korea_big.png'),
        pass: resolvePath('/cities/korea_pass.png'),
        ferry: resolvePath('/cities/korea_ferry.png')
    },
    // New Regions (Mapped to existing styles for now)
    SIBERIA: { // Use Northeast Style
        small: resolvePath('/cities/northeast_small.png'),
        medium: resolvePath('/cities/northeast_medium.png'),
        big: resolvePath('/cities/northeast_big.png'),
        pass: resolvePath('/cities/northeast_pass.png'),
        ferry: resolvePath('/cities/northeast_ferry.png')
    },
    TROPICS: { // Use Lingnan Style
        small: resolvePath('/cities/lingnan_small.png'),
        medium: resolvePath('/cities/lingnan_medium.png'),
        big: resolvePath('/cities/lingnan_big.png'),
        pass: resolvePath('/cities/lingnan_pass.png'),
        ferry: resolvePath('/cities/lingnan_ferry.png')
    },
    SOUTH_HEMISPHERE: { // Fallback
        small: resolvePath('/cities/central_small.png'),
        medium: resolvePath('/cities/central_medium.png'),
        big: resolvePath('/cities/central_big.png'),
        pass: resolvePath('/cities/central_pass.png'),
        ferry: resolvePath('/cities/central_ferry.png')
    },
    NEW_WORLD: { // Fallback
        small: resolvePath('/cities/central_small.png'),
        medium: resolvePath('/cities/central_medium.png'),
        big: resolvePath('/cities/central_big.png'),
        pass: resolvePath('/cities/central_pass.png'),
        ferry: resolvePath('/cities/central_ferry.png')
    },
    WEST_WORLD: { // Use Central Style for now
        small: resolvePath('/cities/central_small.png'),
        medium: resolvePath('/cities/central_medium.png'),
        big: resolvePath('/cities/central_big.png'),
        pass: resolvePath('/cities/central_pass.png'),
        ferry: resolvePath('/cities/central_ferry.png')
    },
    CENTRAL_WORLD: { // Use Western Style
        small: resolvePath('/cities/western_small.png'),
        medium: resolvePath('/cities/western_medium.png'),
        big: resolvePath('/cities/western_big.png'),
        pass: resolvePath('/cities/western_pass.png'),
        ferry: resolvePath('/cities/western_ferry.png')
    }
};

// 5. Main Accessor
export function getCityImage(city: { lat?: number; lng?: number; latitude?: number; longitude?: number; type: CityType; id: string; region?: string }): string {
    // Resolve Coordinates (Support both CityData and Runtime City)
    const lat = city.lat ?? city.latitude;
    const lng = city.lng ?? city.longitude;

    if (lat === undefined || lng === undefined) {
        console.warn(`[RegionSystem] City ${city.id} missing coordinates!`);
        return resolvePath('/cities/city_small.png');
    }

    // 1. Force Giant Specifics (Strict 4 Cities + Western Cities)
    if (city.id === 'changan') return resolvePath('/cities/zhiding/changan.png');
    if (city.id === 'luoyang') return resolvePath('/cities/zhiding/luoyang.png');
    if (city.id === 'nanjing') return resolvePath('/cities/zhiding/nanjing.png');
    if (city.id === 'youzhou') return resolvePath('/cities/zhiding/beijing.png'); // Beijing

    // Western / Central Asian Cities
    if (city.id === 'city_rome') return resolvePath('/cities/zhiding/luoma.png');
    if (city.id === 'city_alexandria') return resolvePath('/cities/zhiding/yalishanda.png');
    if (city.id === 'city_antioch') return resolvePath('/cities/zhiding/antiaoke.png');
    if (city.id === 'city_damascus') return resolvePath('/cities/zhiding/damashige.png');
    if (city.id === 'city_jerusalem') return resolvePath('/cities/zhiding/yelusaleng.png');
    if (city.id === 'city_baghdad') return resolvePath('/cities/zhiding/bageda.png');
    if (city.id === 'city_constantinople') return resolvePath('/cities/zhiding/junshitanding.png');
    if (city.id === 'city_venice') return resolvePath('/cities/zhiding/weinisi.png');
    if (city.id === 'city_samarhan') return resolvePath('/cities/zhiding/samaerhan.png');
    if (city.id === 'city_buhala') return resolvePath('/cities/zhiding/buhala.png');
    if (city.id === 'city_ctesiphon') return resolvePath('/cities/zhiding/taixifeng.png');
    if (city.id === 'city_rayy') return resolvePath('/cities/zhiding/leiyi.png');
    if (city.id === 'city_cheshi') return resolvePath('/cities/zhiding/tulufan.png'); // Gaochang

    const config = CITY_CONFIG[city.type];
    let scale: CityScale = 'small';

    if (city.type === 'huge_city') {
        scale = 'big';
    } else if (city.type === 'large_city') {
        scale = 'medium';
    } else if (city.type === 'pass') {
        scale = 'pass';
    } else if (city.type === 'ferry') {
        scale = 'ferry';
    } else {
        scale = 'small';
    }

    // 3. Identify Region (Hybrid: Explicit Override + Auto-detection)
    const region = getCityRegion({ latitude: lat as number, longitude: lng as number, region: city.region });

    // 4. Map to Image
    const styleSet = STYLE_MAP[region];
    let image = styleSet[scale];

    // Fallback if specific scale is missing in some sparse sets
    if (!image) image = styleSet.small;

    return image;
}
