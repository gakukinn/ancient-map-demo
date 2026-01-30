
function tileToLatLng(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lon_deg = x / n * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat_deg = lat_rad * (180.0 / Math.PI);
    return { lat: lat_deg, lng: lon_deg };
}

const zoom = 9;
// COVERAGE_BOUNDS: { 9: { xMin: 359, xMax: 443, yMin: 173, yMax: 229 } }
const x_min = 359;
const x_max = 443;
const y_min = 173;
const y_max = 229;

// Calculate corners
// Tile (x, y) covers from x to x+1, y to y+1
const nw = tileToLatLng(x_min, y_min, zoom); // Top-Left of first tile
const se = tileToLatLng(x_max + 1, y_max + 1, zoom); // Bottom-Right of last tile

console.log("West (Left): " + nw.lng.toFixed(4));
console.log("East (Right): " + se.lng.toFixed(4));
console.log("North (Top): " + nw.lat.toFixed(4));
console.log("South (Bottom): " + se.lat.toFixed(4));
