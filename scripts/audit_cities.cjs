const fs = require('fs');
const path = require('path');

const cityFile = path.join(__dirname, '../src/data/cities.ts');
const content = fs.readFileSync(cityFile, 'utf8');

// Parse cities
const cities = [];
const cityRegex = /{ id: '([^']+)', name: '([^']+)',[^}]+type: '([^']+)'/g;
let match;
while ((match = cityRegex.exec(content)) !== null) {
    cities.push({ id: match[1], name: match[2], type: match[3] });
}

console.log(`Parsed ${cities.length} cities.`);

// Check duplicates
const seenIds = new Set();
const seenNames = new Set();

cities.forEach(c => {
    if (seenIds.has(c.id)) console.log(`[DUPLICATE ID] ${c.id}`);
    seenIds.add(c.id);

    if (seenNames.has(c.name)) console.log(`[DUPLICATE NAME] ${c.name} (${c.id})`);
    seenNames.add(c.name);
});

// Check Tongguan specifically
const tongguans = cities.filter(c => c.name === '潼关');
console.log('[TONGGUAN CHECK]', tongguans);

// Check rules
cities.forEach(c => {
    if (c.name.includes('关') && c.type !== 'pass') {
        console.log(`[MISMATCH PASS] ${c.name} (${c.id}) is ${c.type}, expected pass`);
    }
    if (c.name.includes('渡') && c.type !== 'ferry') {
        console.log(`[MISMATCH FERRY] ${c.name} (${c.id}) is ${c.type}, expected ferry`);
    }
});
