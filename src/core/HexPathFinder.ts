import { LatLng } from '../types/core';
import { GridSystem } from '../systems/GridSystem';
import { SpatialRegistry } from './SpatialRegistry';
import { TerrainSpeedSystem } from './TerrainSpeedSystem';
import { TerrainSpeed, TERRAIN_SPEED_CONFIG } from './TerrainSpeedSystem';
import { roadRegistry } from './RoadRegistry';

/**
 * HexPathFinder
 * 
 * ⚠️ [部分废弃] A* 六边格寻路
 * 
 * 此模块现在仅作为 fallback 使用。
 * 正常情况下，军队移动应使用 RoadRegistry + moveLegionToCity()。
 * 参见 .agent/GAME_DESIGN.md 了解设计原则。
 * 
 * 保留此模块的原因：
 * - LegionManager.moveLegionTo() 作为兼容接口仍可能被调用
 * - 特殊情况下的路径计算（如 ZOC 检测）
 */

interface HexNode {
    q: number;
    r: number;
    g: number; // Cost from start
    h: number; // Heuristic (estimated cost to goal)
    f: number; // g + h
    parent: HexNode | null;
}

export class HexPathFinder {
    private spatialRegistry: SpatialRegistry;
    private maxSearchNodes: number;

    constructor(spatialRegistry: SpatialRegistry, maxSearchNodes: number = 500) {
        this.spatialRegistry = spatialRegistry;
        this.maxSearchNodes = maxSearchNodes;
    }

    /**
     * Find a path from start to goal, avoiding obstacles.
     * 
     * @param startLatLng Starting position
     * @param goalLatLng Target position
     * @param selfArmyId ID of the moving army (to exclude self from collision)
     * @param allowAdjacentGoal If true, path ends when adjacent to goal (for combat approach)
     * @param selfFactionId Faction ID of moving army (friendly units can be passed through)
     * @returns Array of LatLng waypoints, or null if no path found
     */
    public findPath(
        startLatLng: LatLng,
        goalLatLng: LatLng,
        selfArmyId?: string,
        allowAdjacentGoal: boolean = false,
        selfFactionId?: string,
        ignoreRoads: boolean = false // [NEW] Allow bypassing road restrictions
    ): LatLng[] | null {
        const startHex = GridSystem.latLngToAxial(startLatLng.lat, startLatLng.lng);
        const goalHex = GridSystem.latLngToAxial(goalLatLng.lat, goalLatLng.lng);

        // Same hex = no movement needed
        if (startHex.q === goalHex.q && startHex.r === goalHex.r) {
            return [startLatLng];
        }

        const openSet: HexNode[] = [];
        const closedSet = new Set<number>(); // [OPTIMIZATION] Use integer keys

        const startNode: HexNode = {
            q: startHex.q,
            r: startHex.r,
            g: 0,
            h: this.heuristic(startHex, goalHex),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        openSet.push(startNode);

        let nodesSearched = 0;

        while (openSet.length > 0 && nodesSearched < this.maxSearchNodes) {
            nodesSearched++;

            // Get node with lowest f
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;
            const currentKey = SpatialRegistry.getSpatialKey(current.q, current.r);

            // Goal check
            if (current.q === goalHex.q && current.r === goalHex.r) {
                return this.reconstructPath(current);
            }

            // Adjacent goal check (for approaching enemies)
            if (allowAdjacentGoal && this.isAdjacent(current, goalHex)) {
                return this.reconstructPath(current);
            }

            closedSet.add(currentKey);

            // Expand neighbors
            const neighbors = GridSystem.getNeighborAxialCoords(current.q, current.r);

            for (const neighbor of neighbors) {
                const neighborKey = SpatialRegistry.getSpatialKey(neighbor.q, neighbor.r);

                // Skip if already evaluated
                if (closedSet.has(neighborKey)) continue;

                // Check if blocked (except self and goal)
                const isGoal = neighbor.q === goalHex.q && neighbor.r === goalHex.r;
                // [STRICT ROAD MODE] Only allow movement on road or city hexes (if registry is active)
                if (!ignoreRoads && roadRegistry.isInitialized()) {
                    const roadKey = `${neighbor.q},${neighbor.r}`; // RoadRegistry still uses string keys
                    const isStartArea = GridSystem.getDistance(neighbor, startHex) <= 1;
                    const isEndArea = GridSystem.getDistance(neighbor, goalHex) <= 1;

                    // 必须满足：是路、或是城市格、或是起终点冲刺格
                    if (!roadRegistry.isPassable(roadKey) && !isStartArea && !isEndArea && !isGoal) continue;
                }

                // [FIX] Pass goalHex to verify ZOC Exceptions
                if (!isGoal && this.isBlocked(neighbor.q, neighbor.r, goalHex, selfArmyId, selfFactionId)) continue;

                // [FIX] Use Actual Terrain Cost
                // For Strict Road Mode: Road (1.0), Off-road/City (99999) unless ignoring roads
                const roadKey = `${neighbor.q},${neighbor.r}`;
                const isOnRoad = roadRegistry.isInitialized() && roadRegistry.isOnRoad(roadKey);
                let terrainCost = 1.0;

                if (roadRegistry.isInitialized() && !ignoreRoads) {
                    terrainCost = isOnRoad ? 1.0 : 99999.0;
                } else {
                    // Normal terrain cost logic (simplified)
                    terrainCost = 1.0;
                }

                const tentativeG = current.g + terrainCost;

                // Check if already in open set with better path
                const existingIndex = openSet.findIndex(n => n.q === neighbor.q && n.r === neighbor.r);
                if (existingIndex !== -1) {
                    if (tentativeG >= openSet[existingIndex].g) continue;
                    openSet.splice(existingIndex, 1); // Remove to re-add with better path
                }

                const neighborNode: HexNode = {
                    q: neighbor.q,
                    r: neighbor.r,
                    g: tentativeG,
                    h: this.heuristic(neighbor, goalHex),
                    f: 0,
                    parent: current
                };
                neighborNode.f = neighborNode.g + neighborNode.h;
                openSet.push(neighborNode);
            }
        }

        // No path found
        console.warn(`[HexPathFinder] No path found from ${startHex.q},${startHex.r} to ${goalHex.q},${goalHex.r} after ${nodesSearched} nodes`);
        return null;
    }

    /**
     * Heuristic: Hex distance (axial distance)
     */
    private heuristic(a: { q: number, r: number }, b: { q: number, r: number }): number {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    }

    /**
     * Check if a hex is blocked for pathfinding.
     * 
     * 规则：
     * - 友方城市：可通过（但不能停留）
     * - 敌方城市：阻挡
     * - 友方军队：可通过（但不能停留）
     * - 敌方军队：阻挡
     */
    /**
     * Check if a hex is blocked for pathfinding.
     * 
     * 规则：
     * - 友方城市：可通过
     * - 敌方城市：阻挡
     * - 敌方据点ZOC：如果邻接敌方据点且目标不是该据点，阻挡（防止绕过）
     * - 友方军队：可通过
     * - 敌方军队：阻挡
     */
    private isBlocked(q: number, r: number, goalHex: { q: number, r: number }, selfArmyId?: string, selfFactionId?: string): boolean {
        // 1. 检查格子本身是否被城市阻挡
        const cityFaction = this.spatialRegistry.getCityFaction(q, r);
        if (cityFaction) {
            if (selfFactionId && cityFaction === selfFactionId) return false; // Friendly city OK
            return true; // Hostile city BLOCKED
        }

        // 2. [NEW] Stronghold Zone of Control (ZOC) Check
        // 如果当前格子邻接敌方据点(Pass/Capital)，且我们的目标不是攻打该据点，则此路不通。
        if (selfFactionId) {
            const neighbors = GridSystem.getNeighborAxialCoords(q, r);

            for (const n of neighbors) {
                const nFaction = this.spatialRegistry.getCityFaction(n.q, n.r);

                // 只有敌方据点产生 ZOC
                if (nFaction && nFaction !== selfFactionId && nFaction !== 'neutral') {
                    // EXCEPTION: If our GOAL is this neighbor (attacking the city), we validly stand here.
                    if (n.q === goalHex.q && n.r === goalHex.r) {
                        continue; // Allowed to approach target
                    }

                    // OTHERWISE: Blocked by ZOC!
                    return true;
                }
            }
        }

        // 3. 检查军队
        const occupier = this.spatialRegistry.getArmyAt(q, r);
        if (!occupier) return false;
        if (selfArmyId && occupier.id === selfArmyId) return false; // Self OK

        // Friendly army OK
        if (selfFactionId && occupier.getFactionId() === selfFactionId) {
            return false;
        }

        // Hostile army BLOCKED
        return true;
    }

    /**
     * Check if two hexes are adjacent
     */
    private isAdjacent(a: { q: number, r: number }, b: { q: number, r: number }): boolean {
        const neighbors = GridSystem.getNeighborAxialCoords(a.q, a.r);
        return neighbors.some(n => n.q === b.q && n.r === b.r);
    }

    /**
     * Reconstruct path from goal node back to start
     */
    private reconstructPath(goalNode: HexNode): LatLng[] {
        const path: LatLng[] = [];
        let current: HexNode | null = goalNode;

        while (current !== null) {
            const latLng = GridSystem.axialToLatLng(current.q, current.r);
            path.unshift(latLng);
            current = current.parent;
        }

        return path;
    }
}
