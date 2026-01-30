
import { GridSystem } from '../src/systems/GridSystem';

// Mock data
const cities = [
    { id: 'xinzheng', name: '新郑', lat: 34.39, lng: 113.73 },
    { id: 'kaifeng', name: '开封', lat: 34.79, lng: 114.30 }
];

const GLOBAL_LAT = 34.26;
const hexMap = new Map<string, { cityId: string, dist: number }>();

cities.forEach(city => {
    // Center hex
    const centerAxial = GridSystem.latLngToAxial(city.lat, city.lng, GLOBAL_LAT);
    claimHex(centerAxial, city.id, hexMap, GLOBAL_LAT, city.lat, city.lng);

    // Neighbors (Radius 1)
    const directions = [
        { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
    ];

    directions.forEach(dir => {
        const neighbor = { q: centerAxial.q + dir.q, r: centerAxial.r + dir.r };
        claimHex(neighbor, city.id, hexMap, GLOBAL_LAT, city.lat, city.lng);
    });
});

function claimHex(axial: { q: number, r: number }, cityId: string, map: Map<string, { cityId: string, dist: number }>, globalLat: number, cityLat: number, cityLng: number) {
    const key = `${axial.q},${axial.r}`;
    const hexCenter = GridSystem.axialToLatLng(axial.q, axial.r, globalLat);
    const dist = Math.sqrt(Math.pow(hexCenter.lat - cityLat, 2) + Math.pow(hexCenter.lng - cityLng, 2));

    const existing = map.get(key);

    if (!existing) {
        map.set(key, { cityId, dist });
    } else {
        if (dist < existing.dist) {
            map.set(key, { cityId, dist });
        }
    }
}

// Count
const counts: Record<string, number> = {};
hexMap.forEach(val => {
    counts[val.cityId] = (counts[val.cityId] || 0) + 1;
});

console.log('Xinzheng:', counts['xinzheng']);
console.log('Kaifeng:', counts['kaifeng']);
