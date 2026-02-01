import * as L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { City } from '../types/core';
import { FactionManager } from '../core/FactionManager';
import { GridSystem } from '../systems/GridSystem';
import { OrientationSystem } from '../core/OrientationSystem';
import { GameConfig } from '../config/GameConfig';
import { roadRegistry } from '../core/RoadRegistry';
import { CityAssetManager } from '../core/CityAssetManager';
import { getCityImage } from './RegionSystem';
// [PERF] Import Territory Worker
import TerritoryWorker from '../workers/TerritoryWorker?worker';
import { TerritoryRequest, TerritoryResponse } from '../workers/TerritoryWorker';
import { PriorityQueue } from '../utils/PriorityQueue';

export class TerritorySystem {
    private map: GameMap;
    private factionManager: FactionManager;
    private layerGroup: L.LayerGroup; // For City Icons
    private territoryLayerGroup: L.LayerGroup; // For Territory Polygons

    // UI Elements Mapped by City ID
    private cityMarkers: Map<string, L.Marker> = new Map();
    private cityLabels: Map<string, L.Marker> = new Map();

    // Caches
    private geometryCache: Map<string, { checksum: string, paths: L.LatLng[][] }> = new Map();
    private factionFilters: Set<string> = new Set();

    // State
    private renderCounter = 0; // For cancelling stale async render jobs
    private cities: City[] = []; // Local cache for rendering
    private lastRenderedZoomFloor: number = -1; // [NEW] Track zoom for geometry rebuilds

    // [PERF] Worker for territory calculation
    private worker: Worker;
    private workerMsgId: number = 0;
    private pendingWorkerCallback: ((response: TerritoryResponse) => void) | null = null;
    // [CONFIG] Set to true to enable Worker-based calculation (experimental)
    // [DEBUG] Disabled - Worker may have issues causing missing territory colors
    private static USE_WORKER = false;

    // Event Callbacks
    public onCityClick: ((city: City, e: L.LeafletMouseEvent) => void) | null = null;

    constructor(map: GameMap, factionManager: FactionManager) {
        this.map = map;
        this.factionManager = factionManager;

        const leafletMap = map.getLeafletMap();

        // Create dedicated panes for city markers (z-index 610) and labels (z-index 640)
        if (!leafletMap.getPane('cityPane')) {
            leafletMap.createPane('cityPane');
            leafletMap.getPane('cityPane')!.style.zIndex = '610';
        }
        if (!leafletMap.getPane('labelsPane')) {
            leafletMap.createPane('labelsPane');
            leafletMap.getPane('labelsPane')!.style.zIndex = '640';
        }
        // Dedicated pane for territory polygons (below cities)
        if (!leafletMap.getPane('territoryPane')) {
            leafletMap.createPane('territoryPane');
            leafletMap.getPane('territoryPane')!.style.zIndex = '350';
        }

        this.layerGroup = L.layerGroup().addTo(leafletMap);
        this.territoryLayerGroup = L.layerGroup([], { pane: 'territoryPane' }).addTo(leafletMap);

        // [PERF] Initialize Territory Worker
        this.worker = new TerritoryWorker();
        this.worker.onmessage = (e: MessageEvent<TerritoryResponse>) => {
            if (this.pendingWorkerCallback) {
                this.pendingWorkerCallback(e.data);
                this.pendingWorkerCallback = null;
            }
        };

        // Setup Zoom Listener for scaling (Real-time 'zoom' instead of 'zoomend')
        leafletMap.on('zoom', () => {
            this.updateCityScales();
            this.updateTerritoryStyle();
        });

        // [NEW] Geometry Rebuild on Boosted Zoom Range (7-9) Entry/Exit
        leafletMap.on('zoomend', () => {
            const currentZoom = Math.floor(leafletMap.getZoom());
            // Boosted range is now [7, 9] per user request
            const wasBoosted = (this.lastRenderedZoomFloor >= 7 && this.lastRenderedZoomFloor <= 9);
            const isBoosted = (currentZoom >= 7 && currentZoom <= 9);

            if (wasBoosted !== isBoosted) {
                console.log(`[TerritorySystem] Zoom boost transition detected (${this.lastRenderedZoomFloor} -> ${currentZoom}). Recomputing territories...`);
                this.update(this.cities);
            }
        });
    }

    // [NEW] Dynamic Style Switching
    private updateTerritoryStyle(): void {
        const zoom = this.map.getLeafletMap().getZoom();
        const floorZoom = Math.floor(zoom);

        // Zoom ≤ 8: Strategic solid fill (same as 7)
        // Zoom 9-10: Border Glow/Ribbon mode
        // Zoom ≥ 11: Hide faction colors
        const isStrategic = floorZoom <= 8;
        const isBorderGlowMode = floorZoom === 9;
        const isHidden = floorZoom >= 10 || GameConfig.SYSTEM.MAP_ONLY_MODE; // [MAP-ONLY] Force hide borders

        this.territoryLayerGroup.eachLayer((layer: any) => {
            // Handle territory polygons
            if (layer instanceof L.Polygon) {
                const el = layer.getElement();
                const fid = (layer as any).factionId;
                if (!el || !fid) return;

                if (isHidden) {
                    // Zoom 11+: Hide completely
                    layer.setStyle({ fillOpacity: 0 });
                    el.removeAttribute('filter');
                } else if (isBorderGlowMode) {
                    // Zoom 9-10: Border Glow Mode (ribbons visible, main polygon hidden)
                    layer.setStyle({ fillOpacity: 0 });
                    el.removeAttribute('filter');
                } else if (isStrategic) {
                    // Zoom ≤ 8: Solid Fill Mode
                    layer.setStyle({ fillOpacity: 0.5 });
                    el.removeAttribute('filter');
                }
            }

            // Handle Border Polylines (Simple Black Line)
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon) && !(layer as any).isGlowRibbon) {
                const el = layer.getElement();
                if (el) {
                    if (isHidden) {
                        layer.setStyle({ opacity: 0 });
                    } else {
                        el.removeAttribute('filter');
                        layer.setStyle({ opacity: 1.0, color: '#000', weight: 2 });
                    }
                }
            }

            // Handle Glow Ribbons (The Inward Glow)
            if ((layer as any).isGlowRibbon) {
                if (isHidden) {
                    layer.setStyle({ fillOpacity: 0, opacity: 0 });
                } else if (isBorderGlowMode) {
                    layer.setStyle({ fillOpacity: 0.6, opacity: 0 }); // Show glow
                } else {
                    layer.setStyle({ fillOpacity: 0, opacity: 0 }); // Hide in strategic mode
                }
            }
        });
    }

    /**
     * [PERF] Dispatch territory calculation to Worker
     */
    private dispatchToWorker(): Promise<TerritoryResponse> {
        return new Promise((resolve) => {
            const currentZoom = Math.floor(this.map.getLeafletMap().getZoom());

            // Prepare city data for Worker
            const cityData = this.cities.map(c => ({
                id: c.id,
                factionId: c.factionId || 'neutral',
                lat: c.latitude,
                lng: c.longitude,
                type: c.type
            }));

            // Get road hexes from roadRegistry
            let roadHexes: string[] = [];
            if (roadRegistry.isInitialized()) {
                roadHexes = Array.from(roadRegistry.getCustomRoadHexes());
            }

            const request: TerritoryRequest = {
                id: ++this.workerMsgId,
                cities: cityData,
                roadHexes: roadHexes,
                currentZoom: currentZoom
            };

            this.pendingWorkerCallback = resolve;
            this.worker.postMessage(request);
        });
    }

    /**
     * Main Render Loop
     * Calculates territory ownership and renders cities/territories.
     * Async/Chunked to prevent UI freeze.
     */
    public async update(cities: City[], ghostPredicate?: (city: City) => boolean): Promise<void> {
        this.cities = cities;
        const renderId = ++this.renderCounter;

        // Create temporary off-screen groups for double-buffering
        const tempLayerGroup = L.layerGroup();
        const tempTerritoryLayerGroup = L.layerGroup();
        const tempCityLabels = new Map<string, L.Marker>();
        const tempCityMarkers = new Map<string, L.Marker>();

        // [OPTIMIZATION] Viewport Culling
        const mapBounds = this.map.getLeafletMap().getBounds().pad(0.5);

        // Map to store hex ownership: spatialKey (number) -> City
        const hexOwnership = new Map<number, City>();
        const cityHexCounts = new Map<string, number>();

        // Initialize counts
        this.cities.forEach(c => cityHexCounts.set(c.id, 0));

        // ==================================================================================
        // 1. Territory Calculation Logic (Global Dijkstra / Priority Queue)
        // ==================================================================================

        // Build City CORE Index for Blocking Logic (Only Center needed for now or Ring 1 if strict)
        // Used to block expansion through enemy city cores
        const cityLocations = new Map<number, string>(); // spatialKey -> factionId
        this.cities.forEach(c => {
            const axial = GridSystem.latLngToAxial(c.latitude, c.longitude);
            const key = GridSystem.getSpatialKey(axial.q, axial.r);
            cityLocations.set(key, c.factionId);

            // Should we block neighbors too? Existing logic blocked neighbors.
            const neighbors = GridSystem.getNeighborAxialCoords(axial.q, axial.r);
            neighbors.forEach(n => {
                const nKey = GridSystem.getSpatialKey(n.q, n.r);
                if (!cityLocations.has(nKey)) {
                    cityLocations.set(nKey, c.factionId);
                }
            });
        });

        // Initialize Priority Queue
        // Item: { key, city, score, rawDist, parent? }
        // We prioritize minimal SCORE.
        // Score = rawDist (cost) - TierBonus (Priority for Ring 1/2/3)
        interface QueueItem {
            q: number;
            r: number;
            city: City;
            cost: number; // Accumulated Path Cost (Raw)
            score: number; // Priority Score (Cost - Bonus)
        }

        const pq = new PriorityQueue<QueueItem>((a, b) => {
            // Lower score is better
            if (Math.abs(a.score - b.score) > 0.001) return a.score - b.score;
            // Tie-break: Lower Random Key (deterministic) or just ID
            return a.city.id.localeCompare(b.city.id);
        });

        // Visited Set (Best Score per Hex)
        // We only care about the BEST claim.
        // Map<hexKey, bestScore>
        const visited = new Map<number, number>();

        // Initial Seeds (City Centers)
        const roadRegistry = (window as any).roadRegistry;
        const customRoads = roadRegistry ? roadRegistry.getCustomRoadHexes() : new Set<string>();

        this.cities.forEach(city => {
            const centerAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
            const centerKey = GridSystem.getSpatialKey(centerAxial.q, centerAxial.r);

            // Determine City Radius (Max Cost)
            let maxRadius = 1;
            const cityType = city.type.toLowerCase();

            if (cityType.includes('huge')) {
                maxRadius = 3;
            } else if (cityType.includes('large') || cityType.includes('medium') || (cityType.includes('city') && !cityType.includes('small'))) {
                maxRadius = 2;
            } else {
                maxRadius = 1;
            }

            // Push Center
            // Center Cost = 0
            // Center Score = 0 - Massive Bonus (Ring 0)
            const centerScore = 0 - 3000;

            const item: QueueItem = {
                q: centerAxial.q,
                r: centerAxial.r,
                city: city,
                cost: 0,
                score: centerScore
            };

            pq.push(item);
            visited.set(centerKey, centerScore);

            // Wireless Road Connection (Gap Jump)
            // If strictly NOT on road, look for nearby roads to seed
            const centerKeyStr = `${centerAxial.q},${centerAxial.r}`;
            if (roadRegistry && !customRoads.has(centerKeyStr)) {
                // Search spiral 1..5
                // Optimization: Just check radius 1 for now or standard 'getConnectedRoads' logic?
                // The original logic did a loop 1..5. Let's keep it but optimized.
                let found = false;
                for (let r = 1; r <= 5; r++) {
                    const ring = GridSystem.getHexRing(centerAxial.q, centerAxial.r, r);
                    for (const hex of ring) {
                        const hexKeyStr = `${hex.q},${hex.r}`;
                        if (customRoads.has(hexKeyStr)) {
                            // Found nearest road point
                            // Add as Seed
                            const roadKey = GridSystem.getSpatialKey(hex.q, hex.r);
                            const roadScore = 0.1; // Base cost for jump
                            // No ring priority bonus for jump? Or should it handle naturally?
                            // Road expansion usually has high limit but low priority compared to core.

                            pq.push({
                                q: hex.q,
                                r: hex.r,
                                city: city,
                                cost: 0.1,
                                score: 0.1 // Low priority compared to Core, high compared to far-away
                            });
                            // Don't mark visited yet? Or treat as separate start?
                            // Better push it.
                            found = true;
                            break;
                        }
                    }
                    if (found) break; // Jump to nearest only
                }
            }
        });

        // Time Slicing Config
        const MAX_FRAME_TIME_MS = 12; // Target 12ms per frame (leaving 4ms for browser overhead)
        let frameStartTime = performance.now();

        // Dijkstra Loop
        while (!pq.isEmpty()) {
            // Time Check
            if (performance.now() - frameStartTime > MAX_FRAME_TIME_MS) {
                if (this.renderCounter !== renderId) return; // Abort
                await new Promise(r => requestAnimationFrame(r));
                frameStartTime = performance.now();
            }

            const curr = pq.pop()!;
            const currKey = GridSystem.getSpatialKey(curr.q, curr.r);

            // Lazy Deletion Check: If we found a better path to this hex already, skip
            if (hexOwnership.has(currKey)) {
                // Already owned. Since we process min-score first, the first one to claim it WINS.
                // (First Claim Wins logic is standard for Voronoi-like, which Dijkstra approximates)
                continue;
            }

            // Claim It
            hexOwnership.set(currKey, curr.city);
            cityHexCounts.set(curr.city.id, (cityHexCounts.get(curr.city.id) || 0) + 1);

            // Expand Neighbors
            // [OPTIMIZATION] Zero-Alloc
            GridSystem.forEachNeighbor(curr.q, curr.r, (nQ, nR) => {
                const nKey = GridSystem.getSpatialKey(nQ, nR);

                // Early skip if already fully owned
                if (hexOwnership.has(nKey)) return;

                // --- Cost Calculation Logic (Copied/Adapted from original) ---

                // 1. Identify "Road" Status
                const nextRoadKey = `${nQ},${nR}`;
                const currRoadKey = `${curr.q},${curr.r}`;
                const isNextRoad = customRoads.has(nextRoadKey);
                const isCurrRoad = customRoads.has(currRoadKey);

                // 2. Max Radius / Budget
                const city = curr.city;
                let maxRadius = 1;
                const cityType = city.type.toLowerCase();
                // (Re-eval radius - optimization: store in City obj or Map?)
                if (cityType.includes('huge')) maxRadius = 3;
                else if (cityType.includes('large') || cityType.includes('medium') || (cityType.includes('city') && !cityType.includes('small'))) maxRadius = 2;
                else maxRadius = 1;

                // 3. Determine Step Cost & Permissions
                let stepCost = 1.0;

                if (isCurrRoad && isNextRoad) {
                    stepCost = 0.05; // Road -> Road (Fast)
                } else if (!isCurrRoad && isNextRoad) {
                    stepCost = 0.05; // Terrain -> Road (Entry)
                } else if (isCurrRoad && !isNextRoad) {
                    // Road -> Terrain (Exit)
                    // Rule: Can only exit road if within Core Radius of City Center
                    const centerAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
                    const distCurr = GridSystem.getDistance(centerAxial, { q: curr.q, r: curr.r });

                    if (distCurr > maxRadius) {
                        stepCost = 999; // Block exit outside core
                    } else {
                        // Check if Next is still inside core
                        const distNext = GridSystem.getDistance(centerAxial, { q: nQ, r: nR });
                        if (distNext <= maxRadius) {
                            stepCost = 1.0; // Allow filling core
                        } else {
                            stepCost = 10.0; // Soft block
                        }
                    }
                } else {
                    stepCost = 1.0; // Terrain -> Terrain
                }

                // 4. Physical Distance Check (Hard Limit for Terrain)
                if (!isNextRoad) {
                    const centerAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
                    const physicalDist = GridSystem.getDistance(centerAxial, { q: nQ, r: nR });
                    if (physicalDist > maxRadius) return; // Hard Stop
                }

                // 5. Block Enemy Core
                const occupantFaction = cityLocations.get(nKey);
                if (occupantFaction && occupantFaction !== city.factionId) {
                    // Cannot enter enemy city core/ring1
                    return;
                }

                // 6. Calculate New Cost
                const newCost = curr.cost + stepCost;

                // 7. Check Budget Limit
                // Road expansion budget is huge, Terrain is tight
                let budget = isNextRoad ? 50.0 : maxRadius;
                if (newCost > budget) return;

                // 8. Calculate Priority Score (for Queue)
                // Priority Bonus (Ring 1/2/3)
                const centerAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
                const physicalDist = GridSystem.getDistance(centerAxial, { q: nQ, r: nR });

                let score = newCost;
                if (physicalDist <= 1) score -= 2000;
                else if (physicalDist <= 2) score -= 1000;
                else if (physicalDist <= 3) score -= 500;
                else if (physicalDist <= 4) score -= 250;

                // Add to PQ if better score than seen
                if (!visited.has(nKey) || score < visited.get(nKey)!) {
                    visited.set(nKey, score);
                    pq.push({
                        q: nQ,
                        r: nR,
                        city: city,
                        cost: newCost,
                        score: score
                    });
                }
            });
        }


        // ==================================================================================
        // 3. Render - MERGED FACTION OUTLINES (WITH SPATIAL CHUNKING)
        // ==================================================================================

        const factionHexes = new Map<string, { q: number, r: number, key: number }[]>();
        const CHUNK_SIZE = 16; // Divide map into 16x16 block chunks

        hexOwnership.forEach((city, key) => {
            const { q, r } = GridSystem.getCoordsFromKey(key);
            const fid = city.factionId || 'neutral';

            let groupKey = fid;
            if (fid === 'panjun') {
                // Rebels are already micro-chunked by city ID
                groupKey = `panjun_${city.id}`;
            } else {
                // Major Factions: Spatial Chunking
                // Example: q=100, r=200 -> Chunk 6_12
                const cq = Math.floor(q / CHUNK_SIZE);
                const cr = Math.floor(r / CHUNK_SIZE);
                // Composite Key: factionId # ChunkQ _ ChunkR
                groupKey = `${fid}#${cq}_${cr}`;
            }

            if (!factionHexes.has(groupKey)) factionHexes.set(groupKey, []);
            factionHexes.get(groupKey)!.push({ q, r, key });
        });

        factionHexes.forEach((hexes, groupKey) => {
            // Restore Faction ID from group key
            let factionId = groupKey;

            if (groupKey.startsWith('panjun_')) {
                factionId = 'panjun';
            } else if (groupKey.includes('#')) {
                // Parse "qin#5_10" -> "qin"
                factionId = groupKey.split('#')[0];
            }

            // Skip Rendering Rebels? Existing code says yes:
            if (factionId === 'panjun') return;

            const color = this.factionManager.getFactionColor(factionId);
            const paneName = `territory-faction-${factionId}`;
            this.ensureFactionPane(paneName);

            this.ensureFactionFilter(factionId, color);

            // Optimization: Cached Geometry
            const sortedKeys = hexes.map(h => h.key).sort((a, b) => a - b);
            const checksum = sortedKeys.join('|');
            let totalPaths: L.LatLng[][] = [];

            const cached = this.geometryCache.get(groupKey);
            if (cached && cached.checksum === checksum) {
                totalPaths = cached.paths;
            } else {
                totalPaths = this.getMergedPaths(hexes);
                this.geometryCache.set(groupKey, { checksum, paths: totalPaths });
            }

            // Render Polygon (Invisible Fill + Glow Filter)
            const polygon = L.polygon(totalPaths, {
                stroke: false,
                fill: true,
                fillColor: color,
                fillOpacity: 1, // Default to hollow (will be updated by updateTerritoryStyle)
                interactive: false,
                pane: paneName
            });
            (polygon as any).factionId = factionId; // Store for filter application later
            polygon.addTo(tempTerritoryLayerGroup);

            // Render Borders (Edges touching different factions)
            this.renderFactionBorders(hexes, factionId, hexOwnership, paneName, tempTerritoryLayerGroup);
        });

        // ==================================================================================
        // 4. Draw City Icons (Chunked)
        // ==================================================================================
        const chunkSize = 20;
        let cityIndex = 0;
        const processCities = async () => {
            // Check abort
            if (this.renderCounter !== renderId) return;

            const end = Math.min(cityIndex + chunkSize, this.cities.length);
            for (let i = cityIndex; i < end; i++) {
                const city = this.cities[i];
                // [OPTIMIZATION] Viewport Culling Check
                if (mapBounds.contains({ lat: city.latitude, lng: city.longitude })) {
                    // Pass ghost predicate down
                    const isGhost = ghostPredicate ? ghostPredicate(city) : false;
                    this.renderSingleCity(city, tempLayerGroup, tempCityMarkers, tempCityLabels, isGhost);
                }
            }

            cityIndex = end;
            if (cityIndex < this.cities.length) {
                await new Promise(r => requestAnimationFrame(r)); // Yield UI
                processCities();
            } else {
                // Formatting Done! atomic Swap.
                if (this.renderCounter !== renderId) return;

                // 1. Clear OLD layers logic
                this.layerGroup.clearLayers();
                this.territoryLayerGroup.clearLayers();

                // 2. Add NEW layers logic
                tempLayerGroup.eachLayer(l => l.addTo(this.layerGroup));

                tempTerritoryLayerGroup.eachLayer(l => {
                    l.addTo(this.territoryLayerGroup);
                    // Apply deferred filter
                    const fid = (l as any).factionId;
                    if (fid) {
                        const el = (l as L.Polygon).getElement();
                        // [NEW] Immediately apply correct style based on current zoom
                        this.updateTerritoryStyle();
                    }
                });

                // 3. Update State
                this.cityMarkers = tempCityMarkers;
                this.cityLabels = tempCityLabels;

                this.updateCityScales();
            }
        };
        processCities();
    }

    private renderSingleCity(city: City, targetLayerGroup: L.LayerGroup, markersMap: Map<string, L.Marker>, labelsMap: Map<string, L.Marker>, isGhost: boolean = false): void {
        const color = this.factionManager.getFactionColor(city.factionId);

        // [MAP-ONLY] Natural Placement vs Snipped
        const isMapOnly = GameConfig.SYSTEM.MAP_ONLY_MODE;
        let displayLat = city.latitude;
        let displayLng = city.longitude;

        if (!isMapOnly) {
            const cityAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
            const snappedCenter = GridSystem.axialToLatLng(cityAxial.q, cityAxial.r);
            displayLat = snappedCenter.lat;
            displayLng = snappedCenter.lng;
        }

        // [MODIFIED] Use Automatic Region Styling (Priority to explicit image property)
        const cityImage = city.image || getCityImage(city);

        if (cityImage) {
            const baseTransform = OrientationSystem.getCityImageTransform(city.longitude);
            let transform = (baseTransform === 'none') ? '' : baseTransform;
            if (city.mirror) transform = `scaleX(-1) ${transform}`;
            if (!transform.trim()) transform = 'none';

            // [NEW] Ghost Style
            const ghostStyle = isGhost ? 'opacity: 0.5; filter: grayscale(100%); pointer-events: none;' : '';

            // Size Logic
            let baseSize = 200;

            if (city.type === 'huge_city') baseSize = 240;
            else if (city.type === 'small_city' || city.type === 'pass' || city.type === 'ferry') baseSize = 160;

            // [MAP-ONLY] Re-scale: 40% Reduction
            if (isMapOnly) {
                baseSize *= 0.6; // e.g. 200 -> 120
            }

            // Assets
            const flagBody = CityAssetManager.getProcessedFlag(city.factionId) || '';
            const flagText = CityAssetManager.getProcessedFlagText(city.factionId);
            const flagPole = CityAssetManager.getProcessedPole() || '';

            const flagFrameWidth = 32;
            const flagFrameHeight = 40;
            const flagScale = 1.4;
            const poleHeight = flagFrameHeight * flagScale * 1.2;

            // [USER REQUEST] Always show flag text for all factions (Removed hide logic for Huihui/Huaxia)
            const shouldHideText = false;
            // Variable isMapOnly is already defined at start of function


            let effectiveFlagText = flagText;

            const flagTextOverlay = (effectiveFlagText && !shouldHideText && !isMapOnly) ? `
                 <div class="city-flag-body" style="
                     position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                     background-image: url('${effectiveFlagText}');
                     background-size: ${128 * flagScale}px ${240 * flagScale}px;
                     background-position: 0 ${-160 * flagScale}px;
                     background-repeat: no-repeat;
                     z-index: 11;
                 "></div>` : '';

            const icon = L.divIcon({
                className: 'city-icon',
                html: `<div class="city-image-container" style="
                     display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
                     width: ${baseSize}px; height: ${baseSize + 80}px;
                     transform-origin: center bottom; position: relative;
                     ${ghostStyle}
                 ">
                     ${!isMapOnly ? `<img src="${flagPole}" style="
                         position: absolute; top: 110px; left: 50%;
                         transform: translateX(-30%);
                         height: ${poleHeight}px; width: auto; z-index: -1;
                     ">` : ''}
                     <img src="${cityImage}" style="
                         width: ${baseSize}px; height: auto;
                         transform: ${transform};
                         filter: drop-shadow(0 0 2px ${color});
                         position: relative; z-index: 1;
                     ">
                     ${!isMapOnly ? `<div class="city-flag-body" style="
                         position: absolute;
                         top: ${110 + poleHeight * 0.1}px;
                         left: 50%;
                         transform: translateX(5%);
                         width: ${flagFrameWidth * flagScale}px;
                         height: ${flagFrameHeight * flagScale}px;
                         background-image: url('${flagBody}');
                         background-size: ${128 * flagScale}px ${320 * flagScale}px;
                         background-position: 0 ${-200 * flagScale}px;
                         background-repeat: no-repeat;
                         z-index: 10;
                     ">
                         ${flagTextOverlay}
                     </div>` : ''}
                 </div>`,
                iconSize: [baseSize, baseSize + 60],
                iconAnchor: [baseSize / 2, baseSize + 30]
            });

            const marker = L.marker([displayLat, displayLng], {
                icon: icon,
                interactive: !isGhost, // Disable interaction for ghosts
                pane: 'cityPane'
            }).addTo(targetLayerGroup);

            if (!isGhost) {
                marker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (this.onCityClick) this.onCityClick(city, e);
                });
            }

            markersMap.set(city.id, marker);

            // Label (only if not ghost? or ghost labels too? User said ghost mode allows editing, so maybe ghost labels are needed to ID them. Let's keep labels but transparent?)
            // If Editor needs to Select them, they must be Interactive!
            // Wait, User said "Ghost Mode - hidden cities shown as transparent".
            // If they are strictly hidden, they shouldn't be interactable by PLAYER, but Editor uses global logic?
            // "When the City Editor is active, all cities ... should be visible ... to allow for easy identification and editing."
            // So they MUST be interactive in renderSingleCity IF isGhost is true?
            // Actually, `isGhost` is true only in editor mode (implied by CityManager logic).
            // `CityManager.isCityGhost` returns true only if `isEditorMode` is true AND city is hidden by time.
            // If `isEditorMode` logic passes ghosts to `TerritorySystem`, they SHOULD be clickable for the editor to work!
            // My previous code `pointer-events: none` would BREAK editor selection!

            // Correction: Ghost cities MUST be clickable in Editor Mode.
            // But `isGhost` implies they are normally hidden.
            // If I disable interaction, Editor can't select them.
            // So I must remove `pointer-events: none`.
            // And ensure `interactive: true`.

            // I will remove `pointer-events: none` from `ghostStyle` and ensure marker is interactive.

        }

        this.renderCityLabel(city, displayLat, displayLng, targetLayerGroup, labelsMap);
    }

    private renderCityLabel(
        city: City,
        lat: number,
        lng: number,
        targetLayerGroup: L.LayerGroup,
        labelsMap: Map<string, L.Marker>
    ) {
        const html = `<div style="
            display: flex; justify-content: center; align-items: center; gap: 6px;
            width: 150px; margin-left: -75px; margin-top: 55px;
            cursor: pointer; white-space: nowrap;
        ">
            <span style="
                color: #ffffff; font-weight: bold;
                text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                font-size: 13px;
            ">${city.name}</span>
            ${(!GameConfig.SYSTEM.MAP_ONLY_MODE) ? `
            <span style="
                color: #ffd700; font-weight: bold;
                text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                font-size: 12px;
            ">${Math.floor(city.troops)}</span>
            ` : ''}
            ${(!GameConfig.SYSTEM.MAP_ONLY_MODE && city.recruitmentEfficiency !== undefined && city.recruitmentEfficiency < 1.0) ? `
            <span style="
                color: ${city.recruitmentEfficiency >= 0.8 ? '#4ade80' : city.recruitmentEfficiency >= 0.5 ? '#fbbf24' : '#f87171'};
                font-weight: bold;
                text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                font-size: 10px;
                margin-left: 2px;
            ">${Math.floor(city.recruitmentEfficiency * 100)}%</span>` : ''}
        </div>`;

        const labelIcon = L.divIcon({ className: 'city-troop-label', html: html });

        const label = L.marker([lat, lng], {
            icon: labelIcon,
            zIndexOffset: 1000,
            interactive: true,
            pane: 'labelsPane'
        }).addTo(targetLayerGroup);

        label.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.onCityClick) this.onCityClick(city, e);
        });

        labelsMap.set(city.id, label);
    }

    public updateCityLabel(city: City) {
        const labelOriginal = this.cityLabels.get(city.id);
        if (labelOriginal) {
            // Re-create HTML logic for consistency - simplified here
            const html = `<div style="
                display: flex; justify-content: center; align-items: center; gap: 6px;
                width: 150px; margin-left: -75px; margin-top: 55px;
                cursor: pointer; white-space: nowrap;
            ">
                <span style="
                    color: #ffffff; font-weight: bold;
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                    font-size: 13px;
                ">${city.name}</span>
                <span style="
                    color: #ffd700; font-weight: bold;
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                    font-size: 12px;
                ">${Math.floor(city.troops)}</span>
                ${(!GameConfig.SYSTEM.MAP_ONLY_MODE && city.recruitmentEfficiency !== undefined && city.recruitmentEfficiency < 1.0) ? `
                <span style="
                    color: ${city.recruitmentEfficiency >= 0.8 ? '#4ade80' : city.recruitmentEfficiency >= 0.5 ? '#fbbf24' : '#f87171'};
                    font-weight: bold;
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                    font-size: 10px;
                    margin-left: 2px;
                ">${Math.floor(city.recruitmentEfficiency * 100)}%</span>` : ''}
            </div>`;

            const newIcon = L.divIcon({ className: 'city-troop-label', html: html });
            labelOriginal.setIcon(newIcon);
        }
    }

    // Helper: Merge hexes into polygon paths
    private getMergedPaths(hexList: { q: number, r: number, key: number }[]): L.LatLng[][] {
        if (hexList.length === 0) return [];
        const segments = new Set<string>();
        const coordMap = new Map<string, { lat: number, lng: number }>();
        const pKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

        hexList.forEach(h => {
            const center = GridSystem.axialToLatLng(h.q, h.r);
            const corners = GridSystem.getHexagonCorners(center);
            for (let i = 0; i < 6; i++) {
                const c1 = corners[i];
                const c2 = corners[(i + 1) % 6];
                const k1 = pKey(c1.lat, c1.lng);
                const k2 = pKey(c2.lat, c2.lng);
                const forward = `${k1}|${k2}`;
                const backward = `${k2}|${k1}`;
                if (segments.has(backward)) segments.delete(backward);
                else { segments.add(forward); coordMap.set(k1, c1); coordMap.set(k2, c2); }
            }
        });

        const paths: L.LatLng[][] = [];
        const nextMap = new Map<string, string>();
        segments.forEach(seg => { const [k1, k2] = seg.split('|'); nextMap.set(k1, k2); });
        while (nextMap.size > 0) {
            const loop: L.LatLng[] = [];
            const startKey = nextMap.keys().next().value!;
            let curr = startKey;
            let safety = 0;
            while (nextMap.has(curr) && safety++ < 1000) {
                loop.push(L.latLng(coordMap.get(curr)!));
                const next = nextMap.get(curr)!;
                nextMap.delete(curr);
                curr = next;
                if (curr === startKey) break;
            }
            if (loop.length > 0) paths.push(loop);
        }
        return paths;
    }

    private renderFactionBorders(
        hexes: { q: number, r: number, key: number }[],
        factionId: string,
        hexOwnership: Map<number, City>,
        paneName: string,
        targetTerritoryGroup: L.LayerGroup
    ) {
        // [REMOVED] Hexagonal faction borders disabled
        // No border rendering
    }

    private ensureGlobalStyles(): void {
        if (document.getElementById('mapwar-glow-styles')) return;
        const style = document.createElement('style');
        style.id = 'mapwar-glow-styles';
        style.innerHTML = `
            .glow-ribbon {
                filter: blur(8px); /* Soften the polygon edges */
                transition: opacity 0.3s;
            }
        `;
        document.head.appendChild(style);
    }

    private ensureFactionFilter(factionId: string, color: string): void {
        if (this.factionFilters.has(factionId)) return;

        let defs = document.getElementById('mapwar-svg-defs') as unknown as SVGDefsElement;
        if (!defs) {
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, 'svg');
            svg.id = 'mapwar-global-svg';
            svg.style.position = 'absolute';
            svg.style.width = '0';
            svg.style.height = '0';
            svg.style.pointerEvents = 'none';
            document.body.appendChild(svg);

            defs = document.createElementNS(svgNS, 'defs');
            defs.id = 'mapwar-svg-defs';
            svg.appendChild(defs);
        }

        const filterId = `glow-${factionId}`;
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = filterId;
        filter.setAttribute('x', '-50%');
        filter.setAttribute('y', '-50%');
        filter.setAttribute('width', '200%');
        filter.setAttribute('height', '200%');

        // One-Sided Inner Glow (Sharp & Tight)
        filter.innerHTML = `
            <feMorphology operator="erode" radius="3" in="SourceAlpha" result="eroded"/>
            <feComposite in="SourceAlpha" in2="eroded" operator="out" result="border"/>
            <feGaussianBlur in="border" stdDeviation="2" result="blur"/>
            <feFlood flood-color="${color}" flood-opacity="1.0" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glow"/>
            <feMerge>
                <feMergeNode in="glow"/>
            </feMerge>
        `;

        defs.appendChild(filter);



        this.factionFilters.add(factionId);
    }

    private ensureFactionPane(paneName: string): void {
        const leafletMap = this.map.getLeafletMap();
        if (!leafletMap.getPane(paneName)) {
            leafletMap.createPane(paneName);
            const pane = leafletMap.getPane(paneName)!;
            pane.style.zIndex = '350';
            pane.style.opacity = '1.0';
            pane.style.pointerEvents = 'none';
        }
    }

    private updateCityScales(): void {
        const currentZoom = this.map.getLeafletMap().getZoom();
        const baseZoom = 9;
        const effectiveZoom = Math.min(currentZoom, 10);
        const scale = Math.pow(2, effectiveZoom - baseZoom);

        this.cityMarkers.forEach(marker => {
            const element = marker.getElement();
            if (element) {
                const container = element.querySelector('.city-image-container') as HTMLElement;
                if (container) {
                    container.style.transformOrigin = '50% 100%';
                    container.style.transform = `scale(${scale})`;
                }
            }
        });
    }

    public setStrategicViewMode(isStrategic: boolean): void {
        const leafletMap = this.map.getLeafletMap();
        const panesToHide = [
            'cityPane', 'labelsPane', 'npcPane', 'siege-battle-pane',
            'field-battle-pane', 'player-pane', 'markerPane', 'popupPane', 'tooltipPane',
        ];

        panesToHide.forEach(paneName => {
            const pane = leafletMap.getPane(paneName);
            if (pane) {
                pane.style.display = isStrategic ? 'none' : '';
            }
        });
    }

    public setCityMarkersVisible(visible: boolean) {
        if (visible) {
            this.layerGroup.addTo(this.map.getLeafletMap());
        } else {
            this.layerGroup.removeFrom(this.map.getLeafletMap());
        }
    }

    public toggleTerritoryLayer(visible: boolean) {
        if (visible) {
            this.territoryLayerGroup.addTo(this.map.getLeafletMap());
            // [FIX] Re-apply filters because Leaflet resets DOM on re-add
            this.territoryLayerGroup.eachLayer((layer: any) => {
                const fid = layer.factionId;
                if (fid) {
                    const el = (layer as L.Polygon).getElement();
                    // [MODIFIED] Use dynamic updater instead of direct set
                    // if (el) el.setAttribute('filter', `url(#glow-${fid})`);
                }
            });
            this.updateTerritoryStyle(); // Apply correct style

        } else {
            this.territoryLayerGroup.removeFrom(this.map.getLeafletMap());
        }
    }

    // [NEW] Control City Layer Opacity & Interaction (for Road Editor)
    public setCityLayersStyle(opacity: number, interactable: boolean) {
        // [FIX] Ensure CSS rule exists to FORCE ignore pointer events on children
        if (!document.getElementById('mapwar-passthrough-style')) {
            const style = document.createElement('style');
            style.id = 'mapwar-passthrough-style';
            // Use simple string to avoid escaping issues
            style.innerHTML = '.mapwar-pass-through, .mapwar-pass-through * { pointer-events: none !important; }';
            document.head.appendChild(style);
        }

        const leafletMap = this.map.getLeafletMap();
        const panes = ['cityPane', 'labelsPane'];

        panes.forEach(name => {
            const pane = leafletMap.getPane(name);
            if (pane) {
                pane.style.opacity = opacity.toString();
                // Use class to force override children
                if (!interactable) {
                    pane.classList.add('mapwar-pass-through');
                } else {
                    pane.classList.remove('mapwar-pass-through');
                }
            }
        });
    }
}
