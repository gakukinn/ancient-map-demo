const fs = require('fs');
const path = require('path');

const terrainPath = path.resolve('src/data/TerrainData.ts');
const targetCoords = [
    "24,-22", "-83,38", "-35,13", "33,-5", "36,-63", "39,24", "53,71", "58,84",
    "61,85", "63,86", "48,22", "52,-43", "-257,53", "-237,64", "-215,39",
    "-210,35", "-209,34", "-207,25", "-248,58", "57,84", "58,76"
];

console.log('Reading TerrainData.ts...');
let content = fs.readFileSync(terrainPath, 'utf8');

let modifiedCount = 0;

targetCoords.forEach(coord => {
    // Regex looking for: "24,-22": "OCEAN" with flexible spacing
    const regex = new RegExp(`"${coord}"\\s*:\\s*"OCEAN"`, 'g');

    if (regex.test(content)) {
        content = content.replace(regex, `"${coord}": "WATER"`);
        console.log(`✅ Fixed ${coord}: OCEAN -> WATER`);
        modifiedCount++;
    } else {
        console.warn(`⚠️ Could not find OCEAN entry for ${coord} (Already fixed? Or wrong type?)`);
        // Debug check
        const checkRegex = new RegExp(`"${coord}"\\s*:\\s*"(\\w+)"`);
        const match = content.match(checkRegex);
        if (match) {
            console.log(`   Current value is: ${match[1]}`);
        } else {
            console.log(`   Key not found at all.`);
        }
    }
});

if (modifiedCount > 0) {
    console.log(`\nSaving ${modifiedCount} changes to TerrainData.ts...`);
    fs.writeFileSync(terrainPath, content, 'utf8');
    console.log('Done!');
} else {
    console.log('\nNo changes made.');
}
