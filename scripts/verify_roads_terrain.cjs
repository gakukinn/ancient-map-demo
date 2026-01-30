const fs = require('fs');
const path = require('path');

const roadPath = path.resolve('src/data/RoadData.ts');
const terrainPath = path.resolve('src/data/TerrainData.ts');

function parseRoadData(content) {
    console.log('Scanning RoadData.ts content...');
    // Brute force extract "q,r" from "0,1" etc.
    // Regex for "2,3" or "-2,-3" inside quotes
    const re = /"(-?\d+,-?\d+)"/g;
    const coords = [];
    let m;
    while ((m = re.exec(content)) !== null) {
        coords.push(m[1]);
    }
    return coords;
}

function parseTerrainData(content) {
    console.log('Scanning TerrainData.ts content...');
    const map = {};
    // Regex matches "q,r": "TYPE"
    // Be flexible with whitespace around colon
    const re = /"(-?\d+,-?\d+)"\s*:\s*"(\w+)"/g;
    let m;
    let count = 0;
    while ((m = re.exec(content)) !== null) {
        map[m[1]] = m[2];
        count++;
    }
    console.log(`Parsed ${count} terrain entries.`);
    return map;
}

console.log('Reading files...');
const roadContent = fs.readFileSync(roadPath, 'utf8');
const terrainContent = fs.readFileSync(terrainPath, 'utf8');

console.log('Parsing data...');
const roads = parseRoadData(roadContent);
const terrain = parseTerrainData(terrainContent);

console.log(`Found ${roads.length} road segments.`);

const issues = [];
const stats = {};

roads.forEach(coord => {
    const type = terrain[coord];
    if (!type) {
        stats['UNDEFINED'] = (stats['UNDEFINED'] || 0) + 1;
    } else {
        stats[type] = (stats[type] || 0) + 1;
        if (type === 'OCEAN') {
            issues.push(coord);
        }
    }
});

const reportLines = [];
reportLines.push('--- Terrain Statistics on Roads ---');
reportLines.push(JSON.stringify(stats, null, 2));

if (issues.length > 0) {
    reportLines.push(`\n❌ FOUND ${issues.length} ROADS ON OCEAN!`);
    reportLines.push(`Coordinates: ${issues.join(', ')}`);
} else {
    reportLines.push('\n✅ No roads found on OCEAN terrain.');
}

fs.writeFileSync('road_report.txt', reportLines.join('\n'));
console.log('Report saved to road_report.txt');
