
// Mock GridSystem Constants
const ORIGIN = { lat: 34.26, lng: 108.94 };
const HEX_RADIUS = 0.15;
const PROJECTION_FACTOR = 1 / Math.cos(34.26 * Math.PI / 180);

function axialToLatLng(q, r) {
    const dist = Math.sqrt(3) * HEX_RADIUS;
    const x_offset = (q * dist * Math.cos(0)) + (r * dist * Math.cos(Math.PI / 3));
    const y_offset = (q * dist * Math.sin(0)) + (r * dist * Math.sin(Math.PI / 3));
    const lng_offset = x_offset * PROJECTION_FACTOR;
    return {
        lat: ORIGIN.lat + y_offset,
        lng: ORIGIN.lng + lng_offset
    };
}

function getNeighborAxialCoords(q, r) {
    const directions = [
        { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
    ];
    return directions.map(d => ({ q: q + d.q, r: r + d.r }));
}

// Mock RegionSystem Logic (Copied from src/systems/RegionSystem.ts)
function getRegion(lat, lng) {
    if (lat < 0) return 'SOUTH_HEMISPHERE';
    if (lng < -30 || lng > 170) return 'NEW_WORLD';

    // 3.0 Priority
    if (lat > 29.0 && lat < 36.0 && lng > 78.0 && lng < 101.0) return 'TIBET';

    // 3.1 Longitude Sectors
    if (lat > 36.0 && lat <= 44.0 && lng <= 97.0) return 'WESTERN';

    // NOMADIC (Crucial check)
    if (lat > 41.0 && lng <= 123.0) return 'NOMADIC';

    if (lng < 60.0) return 'WEST_WORLD';
    if (lat > 36.0 && lat <= 41.0 && lng > 97.0 && lng <= 108.0) return 'NORTHWEST';
    if (lat < 26.0 && lng > 92.0 && lng <= 105.0) return 'LINGNAN';

    if (lng < 97.0) {
        if (lat > 35.0) return 'WESTERN';
        return 'CENTRAL_WORLD';
    }

    if (lat > 40.0 && lng > 123.0) return 'NORTHEAST';
    if (lng > 129.5) return 'JAPAN';
    if (lat > 33.0 && lng > 123.0 && lng <= 129.5) return 'KOREA';
    if (lat > 41.0 && lng <= 123.0) return 'NOMADIC'; // Redundant but consistent
    if (lat > 36.0 && lat <= 41.0 && lng > 108.0 && lng <= 123.0) return 'NORTH';
    if (lat > 32.0 && lat <= 34.0 && lng > 106.0 && lng <= 108.0) return 'CENTRAL';
    if (lat > 32.0 && lat <= 36.0 && lng > 108.0 && lng <= 123.0) return 'CENTRAL';
    if (lat > 26.0 && lat <= 32.0 && lng > 111.0 && lng <= 123.0) return 'SOUTH';
    if (lat <= 26.0 && lng > 105.0) return 'LINGNAN';
    if (lat <= 32.0 && lng > 101.0 && lng <= 111.0) return 'CHU_SHU';

    if (lat > 35.0) return 'NORTH';
    if (lat > 33.0) return 'CENTRAL';
    return 'SOUTH';
}

function getTextureKeyForRegion(region) {
    switch (region) {
        case 'TIBET': case 'NORTHEAST': case 'SIBERIA': return 'snow';
        case 'WESTERN': case 'NORTHWEST': case 'CENTRAL_WORLD': return 'desert';
        case 'NOMADIC': return 'steppe';
        case 'SOUTH': case 'LINGNAN': case 'CHU_SHU': case 'TROPICS': return 'south';
        case 'CENTRAL': case 'NORTH': case 'KOREA': case 'JAPAN':
        case 'WEST_WORLD': case 'NEW_WORLD': case 'SOUTH_HEMISPHERE':
        default: return 'central';
    }
}

// Test Coordinates
const testPoints = [
    { name: "Yinshan Start", q: -7, r: 30 },
    { name: "Yinshan Next", q: -8, r: 30 },
    { name: "Zhangjiakou End", q: -48, r: 57 }
];

console.log("=== Debugging Road Logic (Standalone) ===");

testPoints.forEach(p => {
    const latLng = axialToLatLng(p.q, p.r);
    console.log(`\nPoint: ${p.name} (q:${p.q}, r:${p.r})`);
    console.log(`  -> LatLng: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
    const region = getRegion(latLng.lat, latLng.lng);
    console.log(`  -> Region: ${region}`);
    const textureKey = getTextureKeyForRegion(region);
    console.log(`  -> Texture Key: ${textureKey}`);
});

console.log("\n=== Checking Neighbors ===");
const neighbors = getNeighborAxialCoords(-7, 30);
const nKeys = neighbors.map(n => `${n.q},${n.r}`);
console.log(`Neighbors of -7,30: ${nKeys.join(' | ')}`);
console.log(`Is -8,30 a neighbor? ${nKeys.includes("-8,30")}`);
