const fs = require('fs');
const path = require('path');

// 1. Read files
const factionsPath = path.join('c:/Users/GAKU/Desktop/MAPWAR/src/data/factions.ts');
const citiesPath = path.join('c:/Users/GAKU/Desktop/MAPWAR/src/data/cities.ts');

const factionsContent = fs.readFileSync(factionsPath, 'utf8');
const citiesContent = fs.readFileSync(citiesPath, 'utf8');

// 2. Parse Factions to get capitalCityIds
// Using simple regex or eval is risky, let's try to extract the array content.
// Since these are TS files, we can't require them directly in pure Node without compilation or ts-node.
// We will use regex to extract the object literals.

function extractArray(content, arrayName) {
    const regex = new RegExp(`export const ${arrayName}: .*? = \\s*(\\[[\\s\\S]*?\\]);`, 'm');
    const match = content.match(regex);
    if (!match) return null;

    // Evaluate the array string to get objects. 
    // We need to handle potential TS syntax or comments if any, but since we are running this in a controlled env,
    // we can try a loose eval.
    // However, the file might contain imports or types.
    // Let's try parsing strictly with regex for what we need.
    return match[1];
}

// Manually parse for robustness without eval
const capitalIds = new Set();
const factionsMatch = factionsContent.matchAll(/capitalCityId:\s*'([^']+)'/g);
for (const match of factionsMatch) {
    capitalIds.add(match[1]);
}

console.log('Found Capital IDs:', Array.from(capitalIds));

// 3. Parse Cities
// We need to parse the full city objects to preserve all fields.
// Since the file is well-structured, we can try to "require" it if we strip TS types, 
// OR we can parse the content block and reconstruct it.
// Let's parse the array content text and use a safer "Function" constructor or regex to extract objects.

// Extract the content inside `export const CITIES: CityData[] = [` and `];`
const citiesBlockMatch = citiesContent.match(/export const CITIES: CityData\[\] = (\[[\s\S]*?\]);/);
if (!citiesBlockMatch) {
    console.error('Could not find CITIES array');
    process.exit(1);
}

let citiesArrayText = citiesBlockMatch[1];

// Remove comments to make it valid JS for evaluation if needed, 
// though manual line-by-line processing is safer to preserve structure?
// No, the user wants REORGANIZATION, so we don't need to preserve original comments/grouping 
// (which the plan noted might be lost).
// So we will parse it into objects.

// Basic cleanup to make it JSON-like enough to eval
// 1. Remove // comments
citiesArrayText = citiesArrayText.replace(/\/\/.*$/gm, '');
// 2. Quote keys (relaxed JSON) is supported by JS eval, so we can just eval it.
// We assume the file doesn't have imports used inside the array values (it seems plain).

let cities;
try {
    // Wrap in parens to make it an expression
    cities = eval('(' + citiesArrayText + ')');
} catch (e) {
    console.error('Failed to eval cities array:', e);
    process.exit(1);
}

// 4. Reorganize
const capitals = [];
const others = [];

cities.forEach(city => {
    if (capitalIds.has(city.id)) {
        city.troops = 50000;
        capitals.push(city);
    } else {
        others.push(city);
    }
});

// 5. Generate Output Content
function formatCity(city) {
    // Generate a clean single-line object string
    const entries = Object.entries(city).map(([k, v]) => {
        const val = typeof v === 'string' ? `'${v}'` : v;
        return `${k}: ${val}`;
    });
    return `  { ${entries.join(', ')} },`;
}

const newContent = `// 城市数据 (City Data)
// 每个城市包含完整信息：ID、名称、势力ID、坐标、类型、贴图
// Organized by RegionSystem

import { CityType } from '../types/core';

export interface CityData {
  id: string;
  name: string;
  factionId: string;
  lat: number;
  lng: number;
  type: CityType;
  image?: string; // [DEPRECATED] Use RegionSystem instead
  troops?: number;
  mirror?: boolean;
  region?: string; // [NEW] Explicit region override
  // [OPTIMIZATION] Removed startYear/endYear for Eternal War Mode
}

export const CITIES: CityData[] = [
  // ==================== 势力首都 (Faction Capitals) ====================
${capitals.map(formatCity).join('\n')}

  // ==================== 其他城市 (Other Cities) ====================
${others.map(formatCity).join('\n')}
];
`;

fs.writeFileSync(path.join('c:/Users/GAKU/Desktop/MAPWAR/src/data/cities.new.ts'), newContent);
console.log('Generated cities.new.ts');
console.log(`Capitals: ${capitals.length}, Others: ${others.length}, Total: ${cities.length}`);
