
const fs = require('fs');
const path = require('path');

// 1. Read the cities.ts file
const citiesPath = path.join(__dirname, 'src', 'data', 'cities.ts');
let fileContent = fs.readFileSync(citiesPath, 'utf8');

// 2. Parse the CITIES array securely (regex extraction)
// Find the content inside `export const CITIES: CityData[] = [` and `];`
const match = fileContent.match(/export const CITIES: CityData\[\] = \[([\s\S]*?)\];/);
if (!match) {
    console.error("Could not find CITIES array in src/data/cities.ts");
    process.exit(1);
}

// Clean up the string to make it JSON-like
let rawData = match[1];
// Remove comments // ...
rawData = rawData.replace(/\/\/.*$/gm, '');
// Quote keys (id: -> "id":)
rawData = rawData.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
// Quote single quoted strings '...' -> "..."
rawData = rawData.replace(/'([^']*)'/g, '"$1"');
// Remove trailing commas
rawData = rawData.replace(/,(\s*})/g, '$1');
rawData = rawData.replace(/,(\s*])/g, '$1');

// Wrap in brackets to form array
const jsonStr = `[${rawData}]`;

let cities = [];
try {
    // Use eval as last resort if JSON parse fails due to loose syntax (like trailing commas in objects)
    // Actually, eval is safer for this specific raw text integration than strict JSON.parse
    cities = eval(jsonStr);
} catch (e) {
    console.error("Parse error:", e.message);
    // Fallback: Manually try to match objects if eval fails (safety)
    // But for this task, let's assume standard formatting. 
    process.exit(1);
}

// 3. Define the Region Logic ( The "Design" )
function getRegion(lat, lng) {
    // --- 1. Distinct Geographies (Islands/Peninsulas) ---
    if (lng > 128 && lat < 46) return 'JAPAN'; // 日本列岛
    if (lng > 124 && lat < 43 && lat > 34) return 'KOREA'; // 朝鲜半岛 (Exclude Vladivostok/Manchuria North)

    // --- 2. North/South Divide (East China) ---
    // East of 100° (China Proper + Maneuver Area)
    if (lng > 100) {
        // --- Northeast (Manchuria) ---
        if (lat > 40 && lng > 118) return 'NORTHEAST'; // 辽东/满洲

        // --- Nomadic (Mongolia/Inner Mongolia) ---
        // North of ~40° is generally Great Wall line, but let's be specific
        // Ords Loop area is complex. 
        if (lat > 40) return 'NOMADIC';

        // --- China Proper ---

        // Lingnan (South of Nanling Mts)
        if (lat < 26) return 'LINGNAN';

        // Sichuan (Basin) - Roughly 102-110E, 28-33N
        if (lat >= 26 && lat < 33 && lng < 110) return 'SICHUAN';

        // Southwest (Yunnan/Guizhou) - usually handled by Lingnan or Sichuan, 
        // let's split if < 26 it is Lingnan, else if West it is Sichuan border.

        // Northwest (Shaanxi/Gansu) - West of 111° roughly (Yellow River bend)
        // Key Cities: Changan (108), Tianshui (105)
        if (lat >= 33 && lng < 111) return 'NORTHWEST';

        // Central vs North vs South
        // Huai River line is roughly 33°N
        // Yellow River line is roughly 35°N

        if (lat >= 35) return 'NORTH'; // Hebei, Shanxi
        if (lat >= 32) return 'CENTRAL_PLAINS'; // Henan, Shandong, N. Anhui (32-35)
        return 'SOUTH'; // Jiangnan, Hubei, Hunan (32 and below, excluding Lingnan/Sichuan)
    }

    // --- 3. West (West of 100°) ---

    // Tibet (High Plateau)
    // South of Kunlun/Qilian roughly
    if (lat < 36 && lng < 104) return 'TIBET';

    // Western Regions (Xinjiang/Central Asia)
    return 'WESTERN';
}

// 4. Run Scan
const stats = {};
const unassigned = [];
const details = [];

cities.forEach(c => {
    const r = getRegion(c.lat, c.lng);
    if (!stats[r]) stats[r] = 0;
    stats[r]++;
    details.push({ name: c.name, r });
    if (r === 'UNKNOWN') unassigned.push(c.name);
});

// 5. Output
console.log("=== Region Distribution ===");
console.table(stats);

console.log("\n=== Border Case Check (Sanity) ===");
const checkList = ['长安', '洛阳', '成都', '襄樊', '汉中', '北京', '广州', '敦煌', '哈拉和林'];
checkList.forEach(name => {
    const c = cities.find(x => x.name.includes(name)); // Fuzzy match
    if (c) console.log(`${c.name}: ${getRegion(c.lat, c.lng)}`);
});

if (unassigned.length > 0) {
    console.log("\n⚠️  UNASSIGNED / HOLES:", unassigned);
} else {
    console.log("\n✅ No unassigned cities. Full coverage.");
}
