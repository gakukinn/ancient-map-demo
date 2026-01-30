/**
 * TerritoryWorker.ts
 * Offloads heavy BFS territory calculation to a background thread.
 * 
 * [PERF] This worker calculates hex ownership based on city positions and types,
 * then returns the ownership map to the main thread for rendering.
 */

// ==================== Type Definitions ====================

interface CityData {
    id: string;
    factionId: string;
    lat: number;
    lng: number;
    type: string;
}

interface RoadData {
    hexes: Set<string>; // "q,r" format
}

export interface TerritoryRequest {
    id: number;
    cities: CityData[];
    roadHexes: string[]; // "q,r" format array
    currentZoom: number;
}

export interface TerritoryResponse {
    id: number;
    // Map: cityId -> array of owned hex keys (number[])
    ownership: { [cityId: string]: number[] };
    // For rendering merged faction polygons
    factionHexes: { [factionId: string]: number[] };
}

// ==================== GridSystem (Standalone for Worker) ====================

const HEX_SIZE = 0.06;
const CENTER_LATITUDE = 34.26;

function latLngToAxial(lat: number, lng: number): { q: number, r: number } {
    const latFactor = Math.cos((CENTER_LATITUDE * Math.PI) / 180);
    const x = lng / HEX_SIZE / latFactor;
    const y = lat / HEX_SIZE;
    const q = x - y / 2;
    const r = y;
    return { q: Math.round(q), r: Math.round(r) };
}

function axialToLatLng(q: number, r: number): { lat: number, lng: number } {
    const latFactor = Math.cos((CENTER_LATITUDE * Math.PI) / 180);
    const lat = r * HEX_SIZE;
    const lng = (q + r / 2) * HEX_SIZE * latFactor;
    return { lat, lng };
}

function getSpatialKey(q: number, r: number): number {
    return (q << 16) | (r & 0xFFFF);
}

function getCoordsFromKey(key: number): { q: number, r: number } {
    const r = (key & 0xFFFF) << 16 >> 16;
    const q = key >> 16;
    return { q, r };
}

function getDistance(a: { q: number, r: number }, b: { q: number, r: number }): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// ==================== BFS Territory Calculation ====================

function calculateTerritories(
    cities: CityData[],
    roadHexes: Set<string>,
    currentZoom: number
): { ownership: Map<number, CityData>, factionHexes: Map<string, number[]> } {

    const hexOwnership = new Map<number, CityData>();

    // Build City CORE Index for Blocking Logic
    const cityLocations = new Map<number, string>();
    const hexDirs = [
        { q: 0, r: 0 },
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];

    cities.forEach(c => {
        const axial = latLngToAxial(c.lat, c.lng);
        hexDirs.forEach(dir => {
            const key = getSpatialKey(axial.q + dir.q, axial.r + dir.r);
            if (!cityLocations.has(key)) {
                cityLocations.set(key, c.factionId);
            }
        });
    });

    // Generate all potential claims
    interface Claim {
        key: number;
        city: CityData;
        rawDist: number;
    }
    let allClaims: Claim[] = [];

    cities.forEach(city => {
        const centerAxial = latLngToAxial(city.lat, city.lng);
        const openSet = [{ q: centerAxial.q, r: centerAxial.r, cost: 0 }];
        const centerKey = getSpatialKey(centerAxial.q, centerAxial.r);

        allClaims.push({
            key: centerKey,
            city: city,
            rawDist: 0
        });

        const visited = new Map<number, number>();
        visited.set(centerKey, 0);

        // Determine maxRadius based on type
        let maxRadius = 1;
        const cityType = city.type.toLowerCase();
        if (cityType.includes('huge_city')) {
            // 巨 (Giant) - Capital, Imperial -> 4 Rings
            maxRadius = 4;
        } else if (cityType.includes('huge')) {
            // 大 (Huge) - Huge City -> 3 Rings
            maxRadius = 3;
        } else if (cityType.includes('large') || cityType.includes('medium') ||
            (cityType.includes('city') && !cityType.includes('small'))) {
            // 中 (Medium) - Large/Medium/Normal City -> 2 Rings
            maxRadius = 2;
        } else {
            // 小/关 (Small/Pass) - Small City, Pass, Fortress -> 1 Ring
            maxRadius = 1;
        }

        // [NOTE] Removed Zoom Boost to strictly adhere to fixed 4-3-2-1 sizes
        // if (currentZoom >= 7 && currentZoom <= 9) {
        //     maxRadius += 1;
        // }

        // BFS with Road System
        let head = 0;
        while (head < openSet.length) {
            const curr = openSet[head++];
            const dirs = [
                { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
            ];

            for (const dir of dirs) {
                const nq = curr.q + dir.q;
                const nr = curr.r + dir.r;
                const nKey = getSpatialKey(nq, nr);

                const nextRoadKey = `${nq},${nr}`;
                const currRoadKey = `${curr.q},${curr.r}`;
                const isNextRoad = roadHexes.has(nextRoadKey);
                const isCurrRoad = roadHexes.has(currRoadKey);

                let stepCost = 1.0;
                if (isCurrRoad && isNextRoad) {
                    stepCost = 0.05;
                } else if (!isCurrRoad && isNextRoad) {
                    stepCost = 0.05;
                } else if (isCurrRoad && !isNextRoad) {
                    const distCurr = getDistance(centerAxial, { q: curr.q, r: curr.r });
                    if (distCurr > maxRadius) {
                        stepCost = 999;
                    } else {
                        const distNext = getDistance(centerAxial, { q: nq, r: nr });
                        stepCost = distNext <= maxRadius ? 1.0 : 10.0;
                    }
                }

                // Blocking by enemy city
                const occupantFaction = cityLocations.get(nKey);
                if (occupantFaction && occupantFaction !== city.factionId) {
                    stepCost = 999;
                }

                const newCost = curr.cost + stepCost;

                // Physical distance check for terrain
                if (!isNextRoad) {
                    const physicalDist = getDistance(centerAxial, { q: nq, r: nr });
                    if (physicalDist > maxRadius) continue;
                }

                let limit = isNextRoad ? 50.0 : maxRadius;

                if (newCost <= limit) {
                    if (!visited.has(nKey) || newCost < visited.get(nKey)!) {
                        visited.set(nKey, newCost);
                        openSet.push({ q: nq, r: nr, cost: newCost });
                        allClaims.push({
                            key: nKey,
                            city: city,
                            rawDist: newCost
                        });
                    }
                }
            }
        }
    });

    // Round-Robin Assignment
    const assignedHexes = new Set<number>();
    const totalUniqueHexes = new Set(allClaims.map(c => c.key)).size;

    const cityClaimsMap = new Map<string, Claim[]>();
    cities.forEach(c => cityClaimsMap.set(c.id, []));
    for (const claim of allClaims) {
        cityClaimsMap.get(claim.city.id)?.push(claim);
    }
    for (const list of cityClaimsMap.values()) {
        list.sort((a, b) => {
            if (Math.abs(a.rawDist - b.rawDist) > 0.001) return a.rawDist - b.rawDist;
            return a.key - b.key;
        });
    }

    const cityClaimIndices = new Map<string, number>();
    cities.forEach(c => cityClaimIndices.set(c.id, 0));

    let candidatePool = new Map<string, Claim>();
    for (const city of cities) {
        const list = cityClaimsMap.get(city.id)!;
        if (list.length > 0) candidatePool.set(city.id, list[0]);
    }

    while (assignedHexes.size < totalUniqueHexes && candidatePool.size > 0) {
        let bestCityId: string | null = null;
        let minScore = Infinity;

        for (const [cityId, claim] of candidatePool.entries()) {
            let activeClaim = claim;
            while (assignedHexes.has(activeClaim.key)) {
                const list = cityClaimsMap.get(cityId)!;
                const idx = cityClaimIndices.get(cityId)! + 1;
                cityClaimIndices.set(cityId, idx);
                if (idx < list.length) {
                    activeClaim = list[idx];
                    candidatePool.set(cityId, activeClaim);
                } else {
                    candidatePool.delete(cityId);
                    activeClaim = null as any;
                    break;
                }
            }
            if (!activeClaim) continue;

            const { q: hq, r: hr } = getCoordsFromKey(activeClaim.key);
            const cityData = cities.find(c => c.id === cityId)!;
            const physicalDist = getDistance(
                latLngToAxial(cityData.lat, cityData.lng),
                { q: hq, r: hr }
            );

            let score = activeClaim.rawDist;
            if (physicalDist <= 1) score -= 2000;
            else if (physicalDist <= 2) score -= 1000;
            else if (physicalDist <= 3) score -= 500;
            else if (physicalDist <= 4) score -= 250;

            if (score < minScore) {
                minScore = score;
                bestCityId = cityId;
            }
        }

        if (!bestCityId) break;

        const winnerClaim = candidatePool.get(bestCityId)!;
        hexOwnership.set(winnerClaim.key, winnerClaim.city);
        assignedHexes.add(winnerClaim.key);

        const list = cityClaimsMap.get(bestCityId)!;
        const idx = cityClaimIndices.get(bestCityId)! + 1;
        cityClaimIndices.set(bestCityId, idx);
        if (idx < list.length) {
            candidatePool.set(bestCityId, list[idx]);
        } else {
            candidatePool.delete(bestCityId);
        }
    }

    // Group by faction for merged outlines
    const factionHexes = new Map<string, number[]>();
    hexOwnership.forEach((city, key) => {
        const fid = city.factionId || 'neutral';
        // Rebels don't merge
        const groupKey = (fid === 'panjun') ? `panjun_${city.id}` : fid;
        if (!factionHexes.has(groupKey)) factionHexes.set(groupKey, []);
        factionHexes.get(groupKey)!.push(key);
    });

    return { ownership: hexOwnership, factionHexes };
}

// ==================== Worker Message Handler ====================

self.onmessage = (e: MessageEvent<TerritoryRequest>) => {
    const { id, cities, roadHexes, currentZoom } = e.data;

    const roadSet = new Set(roadHexes);
    const { ownership, factionHexes } = calculateTerritories(cities, roadSet, currentZoom);

    // Convert ownership Map to plain object for transfer
    const ownershipObj: { [cityId: string]: number[] } = {};
    const cityKeys = new Map<string, number[]>();
    ownership.forEach((city, key) => {
        if (!cityKeys.has(city.id)) cityKeys.set(city.id, []);
        cityKeys.get(city.id)!.push(key);
    });
    cityKeys.forEach((keys, cityId) => {
        ownershipObj[cityId] = keys;
    });

    // Convert factionHexes Map to plain object
    const factionHexesObj: { [factionId: string]: number[] } = {};
    factionHexes.forEach((keys, factionId) => {
        factionHexesObj[factionId] = keys;
    });

    const response: TerritoryResponse = {
        id,
        ownership: ownershipObj,
        factionHexes: factionHexesObj
    };

    (self as any).postMessage(response);
};
