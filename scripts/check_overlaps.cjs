
const fs = require('fs');

// 简单提取 CITIES 数组内容的正则
// 我们假设 cities.ts 的格式比较规范
const content = fs.readFileSync('c:/Users/GAKU/Desktop/MAPWAR/src/data/cities.ts', 'utf-8');

// 提取所有 {...} 对象
const regex = /\{ id: '([^']+)', name: '([^']+)',[^}]*lat: ([0-9.-]+), lng: ([0-9.-]+)/g;
const cities = [];
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

const THRESHOLD = 0.25; // 约 25-30km，视纬度而定
const overlaps = [];

for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
        const c1 = cities[i];
        const c2 = cities[j];

        // 简单的欧几里得距离 (经纬度近似)
        //由于经度距离随纬度变化，这里做一个简单修正
        const latDiff = c1.lat - c2.lat;
        const lngDiff = (c1.lng - c2.lng) * Math.cos(c1.lat * Math.PI / 180);

        const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (dist < THRESHOLD) {
            overlaps.push({
                c1: c1,
                c2: c2,
                dist: dist.toFixed(4)
            });
        }
    }
}

overlaps.sort((a, b) => a.dist - b.dist);

if (overlaps.length === 0) {
    console.log("No overlaps found.");
} else {
    console.log(`Found ${overlaps.length} potential overlaps:`);
    overlaps.forEach(o => {
        console.log(`- [${o.dist}] ${o.c1.name}(${o.c1.lat}, ${o.c1.lng}) <--> ${o.c2.name}(${o.c2.lat}, ${o.c2.lng})`);
    });
}
