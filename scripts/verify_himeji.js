// GridSystem Logic Extraction
const HEX_RADIUS = 0.15;
const ORIGIN = { lat: 34.26, lng: 108.94 };
const PROJECTION_FACTOR = 1 / Math.cos(34.26 * Math.PI / 180);

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

// Himeji Coordinates
const himeji = { lat: 34.839, lng: 134.694 };
const hex = latLngToAxial(himeji.lat, himeji.lng);

console.log(`Himeji (${himeji.lat}, ${himeji.lng}) -> Hex: q=${hex.q}, r=${hex.r}`);
