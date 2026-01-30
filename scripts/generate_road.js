
const HEX_RADIUS = 0.15;
const ORIGIN_LAT = 34.26;
const ORIGIN_LNG = 108.94;
const PROJECTION_FACTOR = 1 / Math.cos(ORIGIN_LAT * Math.PI / 180);

function latLngToAxial(lat, lng) {
    const y = lat - ORIGIN_LAT;
    const x = (lng - ORIGIN_LNG) / PROJECTION_FACTOR;

    const dist = Math.sqrt(3) * HEX_RADIUS;

    const r = y / (dist * Math.sin(Math.PI / 3));
    const q = (x - r * dist * Math.cos(Math.PI / 3)) / dist;

    return hexRound(q, r);
}

function hexRound(q, r) {
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

function hexLerp(a, b, t) {
    const ax = a.q;
    const az = a.r;
    const ay = -ax - az;
    const bx = b.q;
    const bz = b.r;
    const by = -bx - bz;

    const cx = ax + (bx - ax) * t;
    const cy = ay + (by - ay) * t;
    const cz = az + (bz - az) * t;

    const rx = Math.round(cx);
    const ry = Math.round(cy);
    const rz = Math.round(cz);

    const x_diff = Math.abs(rx - cx);
    const y_diff = Math.abs(ry - cy);
    const z_diff = Math.abs(rz - cz);

    let finalRx = rx;
    let finalRz = rz;

    if (x_diff > y_diff && x_diff > z_diff) {
        finalRx = -Math.round(cy) - Math.round(cz); // Just use standard round logic
        // Re-implement correctly from python logic
        if (x_diff > y_diff && x_diff > z_diff) {
            finalRx = -ry - rz;
        } else if (y_diff > z_diff) {
            // ry = -rx - rz
        } else {
            finalRz = -finalRx - ry;
        }
    }

    // Simplification: use the hexRound logic on the interpolated cube coords
    return hexRoundCube(cx, cy, cz);
}

function hexRoundCube(x, y, z) {
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


function hexDistance(a, b) {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

function hexLine(start, end) {
    const n = hexDistance(start, end);
    const results = [];
    if (n === 0) return [start];
    for (let i = 0; i <= n; i++) {
        results.push(hexLerp(start, end, (1.0 / n) * i));
    }
    return results;
}

// ===== 燕然山道 (窦宪北征) =====
// 89年窦宪大破北匈奴，班固作《封燕然山铭》
// 西受降城 -> 燕然山 -> 龙城/单于庭
const waypoints = [
    // Part 1: 勒石之路 (西受降城 -> 燕然山)
    { lat: 41.150, lng: 108.500 },   // 0 - 西受降城 (起点)
    { lat: 41.450, lng: 108.150 },   // 1 - 高阙塞 (陰山缺口)
    { lat: 41.900, lng: 107.800 },   // 2 - 漠南戈壁
    { lat: 42.350, lng: 107.450 },   // 3 - 界河/边境
    { lat: 42.750, lng: 107.100 },   // 4 - 瀚海 (南部)
    { lat: 43.150, lng: 106.800 },   // 5 - 瀚海 (中部)
    { lat: 43.550, lng: 106.350 },   // 6 - 涿邪山 (南部)
    { lat: 43.800, lng: 105.800 },   // 7 - 涿邪山 (古尔班赛汗山)
    { lat: 44.250, lng: 105.400 },   // 8 - 曼达勒敖包
    { lat: 44.700, lng: 105.100 },   // 9 - 稀落山 (前哨战)
    { lat: 45.000, lng: 104.900 },   // 10 - 燕然山南麓
    { lat: 45.250, lng: 104.650 },   // 11 - 燕然勒石 (历史现场)

    // Part 2: 龙城之路 (燕然山 -> 单于庭)
    { lat: 45.550, lng: 104.100 },   // 12 - 翁金河下游
    { lat: 46.000, lng: 103.500 },   // 13 - 杭爱山南坡
    { lat: 46.450, lng: 102.800 },   // 14 - 温都尔汗 (分水岭)
    { lat: 46.800, lng: 102.300 },   // 15 - 鄂尔浑河上游
    { lat: 47.150, lng: 101.900 },   // 16 - 哈拉和林南
    { lat: 47.460, lng: 101.450 }    // 17 - 龙城/单于庭 (终点)
];

let hexPath = [];

// Process path
for (let i = 0; i < waypoints.length - 1; i++) {
    const startHex = latLngToAxial(waypoints[i].lat, waypoints[i].lng);
    const endHex = latLngToAxial(waypoints[i + 1].lat, waypoints[i + 1].lng);
    const segment = hexLine(startHex, endHex);
    hexPath = hexPath.concat(segment);
}

const uniquePath = new Set();
hexPath.forEach(h => uniquePath.add(`${h.q},${h.r}`));

const sorted = Array.from(uniquePath).sort((a, b) => {
    const [q1, r1] = a.split(',').map(Number);
    const [q2, r2] = b.split(',').map(Number);
    return q1 - q2 || r1 - r2;
});

console.log("    // 燕然山道 (窦宪北征)");
sorted.forEach(h => console.log(`    "${h}",`));
