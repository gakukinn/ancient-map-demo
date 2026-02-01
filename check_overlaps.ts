import * as fs from 'fs';

// 读取 cities.ts 文件
const content = fs.readFileSync('c:/Users/GAKU/Desktop/MAPWAR/src/data/cities.ts', 'utf-8');

// 提取所有城市数据
const cityRegex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*factionId:\s*'[^']+',\s*lat:\s*([\d.]+),\s*lng:\s*([\d.]+)/g;
const cities: Array<{ id: string, name: string, lat: number, lng: number }> = [];

let match;
while ((match = cityRegex.exec(content)) !== null) {
    cities.push({
        id: match[1],
        name: match[2],
        lat: parseFloat(match[3]),
        lng: parseFloat(match[4])
    });
}

console.log(`总共找到 ${cities.length} 个据点\n`);

// 计算两点之间的距离（简化的欧几里得距离）
function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dlat = lat1 - lat2;
    const dlng = lng1 - lng2;
    return Math.sqrt(dlat * dlat + dlng * dlng);
}

// 查找重叠的据点（距离小于0.1度，约11公里）
const overlaps: Array<{ city1: any, city2: any, distance: number }> = [];
const threshold = 0.1; // 约11公里

for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
        const dist = distance(cities[i].lat, cities[i].lng, cities[j].lat, cities[j].lng);
        if (dist < threshold) {
            overlaps.push({
                city1: cities[i],
                city2: cities[j],
                distance: dist
            });
        }
    }
}

// 按距离排序
overlaps.sort((a, b) => a.distance - b.distance);

console.log(`发现 ${overlaps.length} 对重叠据点（距离 < ${threshold}度）：\n`);

overlaps.forEach((overlap, index) => {
    console.log(`${index + 1}. 距离: ${overlap.distance.toFixed(4)}度`);
    console.log(`   - ${overlap.city1.name} (${overlap.city1.id}): ${overlap.city1.lat}, ${overlap.city1.lng}`);
    console.log(`   - ${overlap.city2.name} (${overlap.city2.id}): ${overlap.city2.lat}, ${overlap.city2.lng}`);
    console.log('');
});

// 查找完全相同坐标的据点
const exactDuplicates = overlaps.filter(o => o.distance === 0);
if (exactDuplicates.length > 0) {
    console.log(`\n⚠️ 发现 ${exactDuplicates.length} 对完全相同坐标的据点：`);
    exactDuplicates.forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.city1.name} (${dup.city1.id}) === ${dup.city2.name} (${dup.city2.id})`);
        console.log(`   坐标: ${dup.city1.lat}, ${dup.city1.lng}`);
    });
}
