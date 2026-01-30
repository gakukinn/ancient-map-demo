const fs = require('fs');
const path = require('path');

const cityFile = path.join(__dirname, '../src/data/cities.ts');
const content = fs.readFileSync(cityFile, 'utf8');

// Mapping Logic
const TYPE_MAP = {
    // Keep Imperial
    'capital': 'imperial_city',
    'imperial_city': 'imperial_city',
    'hanhuang_imperial_city': 'imperial_city',

    // Convert to huge_city
    'huge_city': 'huge_city',
    'bei_huge_city': 'huge_city',
    'dian_huge_city': 'huge_city',
    'hannan_huge_city': 'huge_city',
    'hanhuang_huge_city': 'huge_city',
    'west_huge_city': 'huge_city',
    'manchu_huge_city': 'huge_city',
    'hanchuan_huge_city': 'huge_city',
    'hanling_huge_city': 'huge_city',
    'hanxiang_huge_city': 'huge_city',

    // Convert to large_city
    'large_city': 'large_city',
    'bei_large_city': 'large_city',
    'manchu_medium_city': 'large_city',
    'hanchuan_medium_city': 'large_city',
    'hanling_medium_city': 'large_city',
    'hanxiang_medium_city': 'large_city',
    'west_medium_city': 'large_city',
    'hanhuangzhong_city': 'large_city',
    'shaanxi_gansu': 'large_city',
    'western_region': 'large_city',
    'sichuan_city': 'large_city',
    'hannan_city': 'large_city',

    // Convert to small_city
    'small_city': 'small_city',
    'west_city': 'small_city',
    'west_small_city': 'small_city',
    'hanhuang_small_city': 'small_city',
    'hanfu_small_city': 'small_city',
    'hanling_small_city': 'small_city',
    'south_city': 'small_city',
    'tibetan_city': 'small_city',
    'tibetan_fortress': 'small_city',
    'korean_city': 'small_city',
    'japanese_city': 'small_city',
    'mongol_city': 'small_city',
    'large_ranch': 'small_city',
    'manchu_city': 'small_city',
    'dian_city': 'small_city',
    'dianmian': 'small_city',

    // Convert to pass
    'pass': 'pass',
    'grassland_fortress': 'pass',
    'north_mountain_pass': 'pass',
    'beiping_pass': 'pass',
    'huangping_pass': 'pass',
    'chuan_mountain_pass': 'pass',
    'south_mountain_pass': 'pass',
    'nanping_pass': 'pass',
    'mountain_pass': 'pass',
    'xiyu_ping_pass': 'pass',
    'western_fortress': 'pass',
    'hanling_mountain_pass': 'pass',
    'huangdukou': 'pass'
};

// Regex to find type: 'xxx'
// Be careful not to replace things in comments incorrectly, but this is a one-off.
// We'll iterate line by line to be safe.
const lines = content.split('\n');
const newLines = lines.map(line => {
    // Match strict type: '...' pattern
    return line.replace(/type:\s*'([^']+)'/, (match, typeName) => {
        if (TYPE_MAP[typeName]) {
            return `type: '${TYPE_MAP[typeName]}'`;
        }
        console.warn(`Warning: Unmapped type '${typeName}' found.`);
        return match;
    });
});

fs.writeFileSync(cityFile, newLines.join('\n'), 'utf8');
console.log('City types simplified.');
