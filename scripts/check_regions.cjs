const fs = require('fs');
const path = require('path');

// ================= Logic =================
function isPointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

const TIBET_REGION = [
    { lat: 36.5, lng: 78.0 }, { lat: 36.0, lng: 103.0 },
    { lat: 28.0, lng: 104.0 }, { lat: 27.0, lng: 99.0 },
    { lat: 27.0, lng: 88.0 }, { lat: 30.0, lng: 80.0 }
];
const SICHUAN_REGION = [
    { lat: 33.0, lng: 105.0 }, { lat: 32.5, lng: 111.0 },
    { lat: 29.0, lng: 110.0 }, { lat: 28.0, lng: 106.0 },
    { lat: 29.5, lng: 101.5 }
];
const LINGNAN_REGION = [
    { lat: 26.5, lng: 97.0 }, { lat: 27.0, lng: 120.0 },
    { lat: 23.0, lng: 120.0 }, { lat: 18.0, lng: 110.0 },
    { lat: 21.0, lng: 100.0 }
];
const WESTERN_REGION = [
    { lat: 49.0, lng: 70.0 }, { lat: 46.0, lng: 96.0 },
    { lat: 40.0, lng: 98.0 }, { lat: 35.0, lng: 95.0 },
    { lat: 35.0, lng: 70.0 }
];
const NOMADIC_REGION = [
    { lat: 52.0, lng: 85.0 }, { lat: 52.0, lng: 120.0 },
    { lat: 42.0, lng: 117.0 }, { lat: 39.5, lng: 106.0 },
    { lat: 41.5, lng: 96.0 }
];
const NORTHEAST_REGION = [
    { lat: 53.0, lng: 115.0 }, { lat: 53.0, lng: 135.0 },
    { lat: 40.0, lng: 135.0 }, { lat: 39.0, lng: 120.0 },
    { lat: 42.0, lng: 117.0 }
];
const NORTHWEST_REGION = [
    { lat: 42.0, lng: 96.0 }, { lat: 40.0, lng: 111.0 },
    { lat: 34.0, lng: 111.0 }, { lat: 34.0, lng: 103.0 },
    { lat: 36.0, lng: 96.0 }
];
const NORTH_REGION = [
    { lat: 42.0, lng: 111.0 }, { lat: 41.0, lng: 120.0 },
    { lat: 35.0, lng: 120.0 }, { lat: 35.0, lng: 110.0 }
];
const SOUTH_REGION = [
    { lat: 33.0, lng: 111.0 }, { lat: 33.0, lng: 122.0 },
    { lat: 26.0, lng: 122.0 }, { lat: 26.0, lng: 111.0 }
];

function getRegion(lat, lng) {
    if (lng > 128) return 'JAPAN';
    if (lat > 34 && lng > 124) return 'KOREA';
    if (isPointInPolygon(lat, lng, TIBET_REGION)) return 'TIBET';
    if (isPointInPolygon(lat, lng, WESTERN_REGION)) return 'WESTERN';
    if (isPointInPolygon(lat, lng, NOMADIC_REGION)) return 'NOMADIC';
    if (isPointInPolygon(lat, lng, NORTHEAST_REGION)) return 'NORTHEAST';
    if (isPointInPolygon(lat, lng, SICHUAN_REGION)) return 'CHU_SHU';
    if (isPointInPolygon(lat, lng, LINGNAN_REGION)) return 'LINGNAN';
    if (isPointInPolygon(lat, lng, NORTHWEST_REGION)) return 'NORTHWEST';
    if (isPointInPolygon(lat, lng, NORTH_REGION)) return 'NORTH';
    if (isPointInPolygon(lat, lng, SOUTH_REGION)) return 'SOUTH';
    return 'CENTRAL';
}

// ================= Main =================
try {
    const cityFile = path.join(__dirname, '../src/data/cities.ts');
    if (!fs.existsSync(cityFile)) {
        console.error("File not found:", cityFile);
        process.exit(1);
    }
    const content = fs.readFileSync(cityFile, 'utf8');

    // Parse loop
    const cities = [];
    const regex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',[^}]*lat:\s*([\d\.-]+),\s*lng:\s*([\d\.-]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        cities.push({
            id: match[1],
            name: match[2],
            lat: parseFloat(match[3]),
            lng: parseFloat(match[4])
        });
    }
    console.log(`Found ${cities.length} cities.`);

    const counts = {};
    const north = [];
    const central = [];

    cities.forEach(c => {
        const r = getRegion(c.lat, c.lng);
        counts[r] = (counts[r] || 0) + 1;
        if (r === 'NORTH') north.push(`${c.name} (${c.id})`);
        if (r === 'CENTRAL') central.push(`${c.name} (${c.id})`);
    });

    console.log("\n=== Region Distribution ===");
    console.log(counts);

    console.log("\n=== NORTH Region Cities ===");
    console.log(north.join('\n'));

    console.log("\n=== CENTRAL Region Cities (Fallback) ===");
    console.log(central.join('\n'));

} catch (err) {
    console.error(err);
}
