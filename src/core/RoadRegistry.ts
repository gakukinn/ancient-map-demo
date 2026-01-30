/**
 * RoadRegistry - 道路注册系统 (纯手动格子模式)
 * 
 * 管理地图上的黄色道路格子。
 * 连通性完全基于用户画出的黄色格子路径。
 */

import { LatLng } from '../types/core';
import { GridSystem, Hex } from '../systems/GridSystem';
import { CityData } from '../data/cities';
import { CUSTOM_ROADS_DATA, DISABLED_ROADS_DATA } from '../data/RoadData';

export class RoadRegistry {
    private cityLocations: Map<string, LatLng> = new Map();

    // 自定义道路格子 (从 localStorage 加载)
    private customRoadHexes: Set<string> = new Set();

    // 被禁用的系统道路格子 (显示的绿色格子)
    private disabledRoadHexes: Set<string> = new Set();

    // 城市区域缓存：HexKey -> CityId (包含中心和周围半径2的区域)
    private cityAreaMap: Map<string, string> = new Map();

    // 已初始化标志
    private initialized: boolean = false;

    // 事件监听器
    private updateListeners: Array<() => void> = [];

    public onRoadsUpdated(callback: () => void): void {
        this.updateListeners.push(callback);
    }

    private notifyListeners(): void {
        this.updateListeners.forEach(cb => cb());
    }

    public initialize(cities: CityData[]): void {
        console.log('🛤️ [RoadRegistry] 初始化纯手动格子道路系统...');
        cities.forEach(city => {
            this.cityLocations.set(city.id, { lat: city.lat, lng: city.lng });
        });
        this.loadCustomRoadHexes();
        this.loadDisabledRoadHexes();
        this.buildCityAreaCache();
        this.initialized = true;
    }

    public buildCityAreaCache(): void {
        this.cityAreaMap.clear();
        for (const [cityId, pos] of this.cityLocations.entries()) {
            const centerHex = GridSystem.latLngToAxial(pos.lat, pos.lng);
            this.cityAreaMap.set(`${centerHex.q},${centerHex.r}`, cityId);

            // [FIX] 缩小半径为 1 的区域作为“进城”范围 (仅中心和相邻格)
            // 原半径为 2，会导致密集区城市通行区连成一片形成隐形通路
            for (let r = 1; r <= 1; r++) {
                const neighbors = GridSystem.getHexRing(centerHex.q, centerHex.r, r);
                for (const hex of neighbors) {
                    this.cityAreaMap.set(`${hex.q},${hex.r}`, cityId);
                }
            }
        }
    }

    public isCityHex(hexKey: string): string | null {
        return this.cityAreaMap.get(hexKey) || null;
    }

    public isOnRoad(hexKey: string): boolean {
        // 在纯手动模式下，路就是 customRoadHexes
        return this.customRoadHexes.has(hexKey);
    }

    /**
     * 判断坐标是否在道路上 (LatLng 包装)
     */
    public isPositionOnRoad(lat: number, lng: number): boolean {
        const hex = GridSystem.latLngToAxial(lat, lng);
        return this.isOnRoad(`${hex.q},${hex.r}`);
    }

    /**
     * 判断坐标是否可通行 (LatLng 包装)
     */
    public isPositionPassable(lat: number, lng: number): boolean {
        const hex = GridSystem.latLngToAxial(lat, lng);
        return this.isPassable(`${hex.q},${hex.r}`);
    }

    /**
     * 判断一个格子是否是道路格子（包含城市区域）
     */
    public isPassable(hexKey: string): boolean {
        return this.isOnRoad(hexKey) || this.cityAreaMap.has(hexKey);
    }

    /**
     * A* 寻路 (仅限黄色格子和城市)
     */
    public findPathAStar(start: Hex, end: Hex): Hex[] {
        const startKey = `${start.q},${start.r}`;
        const endKey = `${end.q},${end.r}`;
        if (startKey === endKey) return [start];

        const frontier: { hex: Hex; priority: number }[] = [{ hex: start, priority: 0 }];
        const cameFrom = new Map<string, Hex | null>();
        const costSoFar = new Map<string, number>();

        cameFrom.set(startKey, null);
        costSoFar.set(startKey, 0);

        let iterations = 0;
        const MAX_ITERATIONS = 20000;

        while (frontier.length > 0) {
            iterations++;
            if (iterations > MAX_ITERATIONS) break;

            // [OPTIMIZATION] 不要使用 sort()，而是直接找最小值，性能提升百倍
            let minIdx = 0;
            for (let i = 1; i < frontier.length; i++) {
                if (frontier[i].priority < frontier[minIdx].priority) {
                    minIdx = i;
                }
            }
            const current = frontier.splice(minIdx, 1)[0].hex;
            const currentKey = `${current.q},${current.r}`;

            if (currentKey === endKey) break;

            const neighbors = GridSystem.getNeighborAxialCoords(current.q, current.r);
            for (const next of neighbors) {
                const nextKey = `${next.q},${next.r}`;

                // [STRICT] 核心限制：只能走黄格或城市/起点/终点周围格
                const isStartArea = this.hexDistance(next, start) <= 1;
                const isEndArea = this.hexDistance(next, end) <= 1;

                // 必须满足：是路、或是城市格、或是起终点冲刺格
                if (!this.isPassable(nextKey) && !isStartArea && !isEndArea && nextKey !== endKey) continue;

                // [FIX] 权重寻路：绝对优先走黄色道路 (Cost 1)
                // 非路格子 (Cost 50) - 大幅增加非道路代价，防止为了省几步路而翻山越岭
                const stepCost = this.isOnRoad(nextKey) ? 1 : 50;
                const newCost = costSoFar.get(currentKey)! + stepCost;

                if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!) {
                    costSoFar.set(nextKey, newCost);
                    // 启发式函数
                    const priority = newCost + this.hexDistance(next, end);
                    frontier.push({ hex: next, priority });
                    cameFrom.set(nextKey, current);
                }
            }
        }

        if (!cameFrom.has(endKey)) return [];

        const path: Hex[] = [];
        let curr: Hex | null | undefined = end;
        while (curr) {
            path.push(curr);
            curr = cameFrom.get(`${curr.q},${curr.r}`);
        }
        return path.reverse();
    }

    /**
     * 获取所有与指定城市连通的城市
     * [OPTIMIZED] 使用单次 BFS (漫延算法) 找到所有可达城市，大幅提升性能
     */
    public getConnectedCities(cityId: string): string[] {
        const startPos = this.cityLocations.get(cityId);
        if (!startPos) return [];

        const startHex = GridSystem.latLngToAxial(startPos.lat, startPos.lng);
        const startKey = `${startHex.q},${startHex.r}`;

        const connectedCityIds: string[] = [];
        const queue: Hex[] = [startHex];
        const visited = new Set<string>([startKey]);

        let iters = 0;
        const MAX_ITERS = 20000;

        while (queue.length > 0 && iters < MAX_ITERS) {
            iters++;
            const current = queue.shift()!;
            const currentKey = `${current.q},${current.r}`;

            // 检查当前格是否属于某个城市（且不是起点城市）
            const cityIdAtHex = this.isCityHex(currentKey);
            if (cityIdAtHex && cityIdAtHex !== cityId) {
                if (!connectedCityIds.includes(cityIdAtHex)) {
                    connectedCityIds.push(cityIdAtHex);
                }
            }

            // 漫延邻居
            const neighbors = GridSystem.getNeighborAxialCoords(current.q, current.r);
            for (const next of neighbors) {
                const nKey = `${next.q},${next.r}`;
                if (!visited.has(nKey) && this.isPassable(nKey)) {
                    visited.add(nKey);
                    queue.push(next);
                }
            }
        }

        return connectedCityIds;
    }

    /**
     * [IMPROVED] 获取“直接邻接”的城市 (路网上一站即达，中间不经过其他城市)
     * 这大大缩小了 AI 的搜索范围，使其更倾向于局部推进。
     */
    public getAdjacentCities(cityId: string): string[] {
        const startPos = this.cityLocations.get(cityId);
        if (!startPos) return [];

        const startHex = GridSystem.latLngToAxial(startPos.lat, startPos.lng);
        const startKey = `${startHex.q},${startHex.r}`;
        const connectedCityIds: string[] = [];
        const queue: Hex[] = [startHex];
        const visited = new Set<string>([startKey]);

        let iters = 0;
        const MAX_ITERS = 10000;

        while (queue.length > 0 && iters < MAX_ITERS) {
            iters++;
            const current = queue.shift()!;
            const currentKey = `${current.q},${current.r}`;

            const cityIdAtHex = this.isCityHex(currentKey);

            // 如果当前格是城市（且不是起点城市）
            if (cityIdAtHex && cityIdAtHex !== cityId) {
                if (!connectedCityIds.includes(cityIdAtHex)) {
                    connectedCityIds.push(cityIdAtHex);
                }
                // [CRITICAL] 停止向该方向继续搜索，实现“邻接”语义
                continue;
            }

            // 漫延邻居
            const neighbors = GridSystem.getNeighborAxialCoords(current.q, current.r);
            for (const next of neighbors) {
                const nKey = `${next.q},${next.r}`;
                if (!visited.has(nKey) && this.isPassable(nKey)) {
                    visited.add(nKey);
                    queue.push(next);
                }
            }
        }

        return connectedCityIds;
    }

    private checkConnectivity(start: Hex, end: Hex): boolean {
        // 使用简单的 BFS 检查是否有通路
        const startKey = `${start.q},${start.r}`;
        const endKey = `${end.q},${end.r}`;

        const queue: Hex[] = [start];
        const visited = new Set<string>([startKey]);

        let iters = 0;
        while (queue.length > 0 && iters < 10000) {
            iters++;
            const current = queue.shift()!;
            const currentHexKey = `${current.q},${current.r}`;
            const currentCityId = this.isCityHex(currentHexKey);
            const targetCityId = this.isCityHex(endKey);

            if (targetCityId && currentCityId === targetCityId) return true;

            const neighbors = GridSystem.getNeighborAxialCoords(current.q, current.r);
            for (const next of neighbors) {
                const nKey = `${next.q},${next.r}`;
                if (!visited.has(nKey) && this.isPassable(nKey)) {
                    visited.add(nKey);
                    queue.push(next);
                    if (this.isCityHex(nKey) === this.isCityHex(endKey)) return true;
                }
            }
        }
        return false;
    }

    public findCityPath(fromId: string, toId: string): string[] | null {
        // 在纯手动模式下，城市之间可能没有固定路径，
        // 简化为直接寻找连通性。如果连通，返回 [起点, 终点]
        const fromPos = this.cityLocations.get(fromId);
        const toPos = this.cityLocations.get(toId);
        if (!fromPos || !toPos) return null;

        const startHex = GridSystem.latLngToAxial(fromPos.lat, fromPos.lng);
        const endHex = GridSystem.latLngToAxial(toPos.lat, toPos.lng);

        if (this.checkConnectivity(startHex, endHex)) {
            return [fromId, toId];
        }
        return null;
    }

    public findPathOnRoad(from: LatLng, to: LatLng): LatLng[] | null {
        const startHex = GridSystem.latLngToAxial(from.lat, from.lng);
        const endHex = GridSystem.latLngToAxial(to.lat, to.lng);

        const hexPath = this.findPathAStar(startHex, endHex);
        if (hexPath.length === 0) return null;

        return hexPath.map(h => GridSystem.axialToLatLng(h.q, h.r));
    }

    public getFullPathToCity(currentPos: LatLng, targetCityId: string, sourceCityId?: string): LatLng[] | null {
        const targetPos = this.cityLocations.get(targetCityId);
        if (!targetPos) return null;
        return this.findPathOnRoad(currentPos, targetPos);
    }

    // --- 辅助工具 ---
    private hexDistance(a: Hex, b: Hex): number {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    }

    public isInitialized(): boolean { return this.initialized; }

    private loadCustomRoadHexes(): void {
        // [FIX] 1. 核心数据源：始终从代码文件加载
        this.customRoadHexes = new Set(CUSTOM_ROADS_DATA);
        console.log(`[RoadRegistry] 从 RoadData.ts 加载了 ${this.customRoadHexes.size} 条基础道路`);
        console.log(`[RoadRegistry] DEBUG CHECK: Has -7,30? ${this.customRoadHexes.has("-7,30")}`);


        // 2. localStorage 加载：仅用于调试或编辑器，且不再自动覆盖基础数据
        const saved = localStorage.getItem('mapwar_road_hexes');
        if (saved) {
            const localHexes = JSON.parse(saved) as string[];
            // [STRICT] 如果本地缓存比代码多，说明可能有残留。提示用户，但不自动采用。
            if (localHexes.length > this.customRoadHexes.size) {
                console.warn(`[RoadRegistry] 检测到 localStorage 中有 ${localHexes.length} 条数据，多于代码定义的 ${this.customRoadHexes.size} 条。`);
                console.warn(`[RoadRegistry] ⚠️ 为了保证路网唯一性，已跳过 localStorage 自动覆盖。如需同步，请在编辑器中手动操作。`);
            }
        }
    }

    private loadDisabledRoadHexes(): void {
        this.disabledRoadHexes = new Set(DISABLED_ROADS_DATA);
        console.log(`[RoadRegistry] 从 RoadData.ts 加载了 ${this.disabledRoadHexes.size} 条禁用通路`);

        const saved = localStorage.getItem('mapwar_disabled_hexes');
        if (saved) {
            const localHexes = JSON.parse(saved) as string[];
            if (localHexes.length > this.disabledRoadHexes.size) {
                console.warn(`[RoadRegistry] localStorage 中存在额外的禁用格数据，已跳过自动同步。`);
            }
        }
    }

    public reloadCustomRoadHexes(): void {
        this.loadCustomRoadHexes();
        this.notifyListeners();
    }

    public getCustomRoadHexes(): Set<string> {
        return this.customRoadHexes;
    }

    public getDisabledRoadHexes(): Set<string> {
        return this.disabledRoadHexes;
    }

    public updateCustomRoadHexes(hexes: Set<string>): void {
        this.customRoadHexes = new Set(hexes);
        this.notifyListeners();
    }
}

export const roadRegistry = new RoadRegistry();
(window as any).roadRegistry = roadRegistry;
