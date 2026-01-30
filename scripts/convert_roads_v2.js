
// --- GridSystem Logic (EMULATED FROM SOURCE) ---
const ORIGIN = { lat: 34.26, lng: 108.94 };
const HEX_RADIUS = 0.15;
// PROJECTION_FACTOR matches GridSystem.ts: 1 / cos(34.26 deg)
const PROJECTION_FACTOR = 1 / Math.cos(34.26 * Math.PI / 180);

console.log(`Using Constants: Origin=(${ORIGIN.lat}, ${ORIGIN.lng}), R=${HEX_RADIUS}, Factor=${PROJECTION_FACTOR}`);

function latLngToAxial(lat, lng) {
    const y = lat - ORIGIN.lat;
    const x = (lng - ORIGIN.lng) / PROJECTION_FACTOR;

    const dist = Math.sqrt(3) * HEX_RADIUS;

    const r = y / (dist * Math.sin(Math.PI / 3));
    const q = (x - r * dist * Math.cos(Math.PI / 3)) / dist;

    return roundCube(q, r);
}

function roundCube(q, r) {
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

// 线性插值
function lerp(start, end, t) {
    return start + (end - start) * t;
}

function generateLine(start, end) {
    const points = [];
    const dist = Math.sqrt(Math.pow(start.lat - end.lat, 2) + Math.pow(start.lng - end.lng, 2));
    // Reduced step size to 0.05 ensure connectivity
    const steps = Math.ceil(dist / 0.05);

    let lastHex = null;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = lerp(start.lat, end.lat, t);
        const lng = lerp(start.lng, end.lng, t);
        const hex = latLngToAxial(lat, lng);
        const key = `${hex.q},${hex.r}`;

        if (lastHex !== key) {
            points.push(key);
            lastHex = key;
        }
    }
    return points;
}

// --- Coordinates from cities.ts ---
// Keluheshan: 41.52, 108.52
// Halahelin: 47.15, 103.06
// Sunite (manual): 42.75, 112.65
// Yehuling: 40.88, 114.75

const roads = [
    // 1. Keluheshan -> Halahelin
    [
        { lat: 41.52, lng: 108.52 },
        { lat: 43.00, lng: 107.00 },
        { lat: 45.00, lng: 105.00 },
        { lat: 47.15, lng: 103.06 }
    ],
    // 2. Sunite -> Yehuling
    [
        { lat: 42.75, lng: 112.65 },
        { lat: 41.80, lng: 113.80 },
        { lat: 40.88, lng: 114.75 }
    ]
];

const allHexes = new Set();
roads.forEach(path => {
    for (let i = 0; i < path.length - 1; i++) {
        const segment = generateLine(path[i], path[i + 1]);
        segment.forEach(h => allHexes.add(h));
    }
});

console.log("Generated Hexes:");
// Format for copy-paste
console.log(Array.from(allHexes).map(h => `    "${h}",`).join('\n'));

// Debug specific points
const startHex = latLngToAxial(41.52, 108.52);
console.log(`\nDebug Check: Keluheshan (41.52, 108.52) -> ${startHex.q},${startHex.r} (Expected approx -17, 32)`);
