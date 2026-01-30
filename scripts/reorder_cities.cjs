
const fs = require('fs');
const path = require('path');

const capitalIds = new Set([
    'youzhou', 'city_wuwei', 'xinzheng', 'handan', 'city_wusun', 'city_suiye', 'city_yinchuan',
    'city_linhuangfu', 'city_halahelin', 'city_xining', 'city_lasa', 'city_huiningfu', 'city_yalufu',
    'city_anyang', 'luoyang', 'qingzhou', 'city_jingzhou', 'city_suzhou', 'city_hancheng', 'city_guangzhou',
    'city_fuzhou', 'hangzhou', 'city_wuhan', 'changsha', 'city_yuzhang', 'city_langya', 'city_shangqiu',
    'chengdu', 'city_guilin', 'city_dali', 'city_henei', 'city_jingdou', 'city_guishan', 'city_tianshui',
    'city_hanzhong', 'city_taiyuan', 'city_xiangyang', 'changan', 'nanjing'
]);

const filePath = path.join(__dirname, 'src', 'data', 'cities.ts');
console.log(`Reading file from ${filePath}`);

try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find array start and end
    const startMarker = "export const CITIES: CityData[] = [";
    const endMarker = "];";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.lastIndexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error("Could not find CITIES array markers.");
        process.exit(1);
    }

    const arrayContent = content.substring(startIndex + startMarker.length, endIndex);
    const prefix = content.substring(0, startIndex + startMarker.length);
    const suffix = content.substring(endIndex);

    // Split by lines and parse
    // Basic parser assuming object starts with { and ends with },
    // But since it's a TS file with comments, we need to be careful.
    // We can rely on `{ id: '...'` pattern to identify start of a city.

    const lines = arrayContent.split('\n');
    const cities = [];
    let currentCityLines = [];
    let currentId = null;

    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines if we are not inside a city object, but keeping formatting might be nice.
        if (!trimmed) continue;

        // Detect start of a city
        const idMatch = line.match(/id:\s*'([^']+)'/);

        if (idMatch) {
            // If we were already collecting a city, push it
            if (currentId) {
                cities.push({ id: currentId, lines: currentCityLines });
            }
            currentId = idMatch[1];
            currentCityLines = [line];
        } else {
            if (currentId) {
                currentCityLines.push(line);
            }
            // else: it's a comment or region header. We'll drop strict region headers in favor of our new grouping
            // or we could collect 'orphaned' lines.
        }
    }

    if (currentId) {
        cities.push({ id: currentId, lines: currentCityLines });
    }

    const capitals = [];
    const others = [];

    cities.forEach(city => {
        if (capitalIds.has(city.id)) {
            capitals.push(city);
        } else {
            others.push(city);
        }
    });

    console.log(`Found ${capitals.length} capitals and ${others.length} other cities.`);

    // Reconstruct content
    let newContent = prefix + "\n";

    newContent += "  // ==================== 势力首都 (Faction Capitals) ====================";
    capitals.forEach(city => {
        newContent += "\n" + city.lines.join("\n");
    });

    newContent += "\n\n  // ==================== 其他城市 (Other Cities) ====================";
    others.forEach(city => {
        newContent += "\n" + city.lines.join("\n");
    });

    newContent += "\n" + suffix;

    fs.writeFileSync(path.join(__dirname, 'src', 'data', 'cities_reordered.ts'), newContent);
    console.log("Written cities_reordered.ts");

} catch (e) {
    console.error(e);
    process.exit(1);
}
