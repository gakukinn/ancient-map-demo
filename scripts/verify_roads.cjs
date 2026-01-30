
const fs = require('fs');
const path = require('path');

const roadDataPath = 'C:\\Users\\GAKU\\Desktop\\MAPWAR\\src\\data\\RoadData.ts';
const terrainDataPath = 'C:\\Users\\GAKU\\Desktop\\MAPWAR\\src\\data\\TerrainData.ts';

try {
    const roadContent = fs.readFileSync(roadDataPath, 'utf-8');
    const terrainContent = fs.readFileSync(terrainDataPath, 'utf-8');

    // Parse Roads
    const roads = [];
    const roadRegex = /"(-?\d+,-?\d+)"/g;
    let match;
    while ((match = roadRegex.exec(roadContent)) !== null) {
        roads.push(match[1]);
    }

    console.log(`Found ${roads.length} road segments.`);

    // Parse Terrain
    const terrain = new Map();
    // Match lines like: "-15,-29": "NORMAL",
    const terrainRegex = /"(-?\d+,-?\d+)":\s*"([A-Z]+)"/g;
    while ((match = terrainRegex.exec(terrainContent)) !== null) {
        terrain.set(match[1], match[2]);
    }

    console.log(`Found ${terrain.size} terrain definitions.`);

    const invalidRoads = [];
    const unknownTerrainRoads = [];

    for (const road of roads) {
        const type = terrain.get(road);
        if (!type) {
            unknownTerrainRoads.push(road);
        } else if (type === 'OCEAN' || type === 'WATER') {
            invalidRoads.push({ coord: road, type: type });
        }
    }

    console.log('--- Verification Results ---');
    if (invalidRoads.length === 0 && unknownTerrainRoads.length === 0) {
        console.log('All roads are on valid land terrain (NORMAL/SLOW).');
    } else {
        if (invalidRoads.length > 0) {
            console.log(`Found ${invalidRoads.length} roads on water/ocean:`);
            invalidRoads.forEach(item => {
                console.log(`Road at ${item.coord} is on ${item.type}`);
            });
        }
        if (unknownTerrainRoads.length > 0) {
            console.log(`Found ${unknownTerrainRoads.length} roads with unknown terrain (potentially on base terrain?):`);
            if (unknownTerrainRoads.length > 20) {
                console.log(unknownTerrainRoads.slice(0, 20).join(', ') + '...');
                console.log(`Total unknown: ${unknownTerrainRoads.length}`);
            } else {
                console.log(unknownTerrainRoads.join(', '));
            }
        }
    }

} catch (err) {
    console.error('Error reading or parsing files:', err);
}
