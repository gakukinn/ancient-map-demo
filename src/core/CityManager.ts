import * as L from 'leaflet';
import { City } from '../types/core';
import { GameMap } from '../map/GameMap';
import { GridSystem } from '../systems/GridSystem';
import { FactionManager } from './FactionManager';
import { CITY_CONFIG, getMinGarrison } from '../config/CityConfig';
import { GameConfig } from '../config/GameConfig';
import { roadRegistry } from './RoadRegistry';
import { SiegeEffectRenderer } from '../map/SiegeEffectRenderer';
import { TerritorySystem } from '../systems/TerritorySystem';

export class CityManager {
    private cities: City[] = [];
    private map: GameMap;
    private factionManager: FactionManager;
    private territorySystem: TerritorySystem;
    private siegeEffectRenderer: SiegeEffectRenderer;

    // Callbacks
    private onCityUpdatedCallback: ((city?: City) => void) | null = null;

    // Debounce for deferred rendering
    private pendingRenderFrame: number | null = null;

    // [NEW] Visual History State
    private currentYear: number = 0;
    private isEditorMode: boolean = false;

    // [NEW] Check if a city is currently a capital of ANY faction
    public isAnyFactionCapital(cityId: string): boolean {
        // Iterate known factions via config or internal list
        // Since we have factionManager, checking active factions is cleaner
        // We can just iterate the cities list or request from factionManager?
        // FactionManager doesn't expose list easily, but we can check usage.

        // Safer approach: Iterate all cities, collect their factions? 
        // Or assume FACTIONS config is source of truth?
        // Let's use getAllFactionIds() which we already have.
        const factions = this.getAllFactionIds();
        for (const factionId of factions) {
            if (this.factionManager.getCapital(factionId) === cityId) {
                return true;
            }
        }
        return false;
    }

    constructor(map: GameMap, factionManager: FactionManager) {
        this.map = map;
        this.factionManager = factionManager;

        // Initialize Sub-Systems
        this.territorySystem = new TerritorySystem(map, factionManager);
        this.siegeEffectRenderer = new SiegeEffectRenderer(map);

        // Bind zoom events for Strategic View coordination
        this.map.getLeafletMap().on('zoomend', () => {
            const zoom = this.map.getLeafletMap().getZoom();
            const isStrategicView = zoom <= 7;

            this.territorySystem.setStrategicViewMode(isStrategicView);
            // [FIX] Removed toggleTerritoryLayer(isStrategicView) - this was hiding territory at zoom > 7!
            // Territory should always be visible. Style changes are handled by updateTerritoryStyle().

            if (isStrategicView) {
                this.siegeEffectRenderer.stopAll();
            }
            // [OPTIMIZATION] Re-render on zoom (update culling)
            this.requestRender();
        });

        // [OPTIMIZATION] Viewport Culling Support
        // 1. Re-render on Pan End (Manual Pan)
        this.map.getLeafletMap().on('moveend', () => {
            this.requestRender();
        });

        // 2. F8 Auto-Director Support (Throttle 'move' event)
        // Auto-follow sends continuous 'move' events but no 'moveend'.
        let lastMoveRender = 0;
        this.map.getLeafletMap().on('move', () => {
            const now = Date.now();
            if (now - lastMoveRender > 200) { // 5 FPS Throttle
                lastMoveRender = now;
                this.requestRender();
            }
        });
    }

    // Proxy Methods for TerritorySystem
    public setOnCityClick(callback: (city: City, e: L.LeafletMouseEvent) => void): void {
        this.territorySystem.onCityClick = callback;
        // Re-bind clicks if needed (usually handled by update, but safe to trigger)
    }

    public setCityMarkersVisible(visible: boolean): void {
        this.territorySystem.setCityMarkersVisible(visible);
    }

    public setCityTransparency(opacity: number, interactable: boolean): void {
        this.territorySystem.setCityLayersStyle(opacity, interactable);
    }

    public toggleTerritoryLayer(visible: boolean): void {
        this.territorySystem.toggleTerritoryLayer(visible);
    }

    public setOnCityUpdated(callback: (city?: City) => void): void {
        this.onCityUpdatedCallback = callback;
    }

    // [NEW] History & Editor Logic
    public updateYear(year: number): void {
        if (this.currentYear !== year) {
            this.currentYear = year;
            this.requestRender();
        }
    }

    public getCurrentYear(): number {
        return this.currentYear;
    }

    public setEditorMode(enabled: boolean): void {
        this.isEditorMode = enabled;
        this.requestRender(); // Re-render to show/hide ghosts
    }

    public isCityVisible(city: City): boolean {
        // [OPTIMIZATION] Sandbox Mode: All cities are always visible
        // We ignore startYear/endYear to ensure full map population constantly.
        return true;
    }

    public isCityGhost(city: City): boolean {
        // Only makes sense in Editor Mode: "Ghost" if it WOULD be hidden normally
        if (!this.isEditorMode) return false;

        // Check normal visibility rules
        if (city.startYear !== undefined && this.currentYear < city.startYear) return true;
        if (city.endYear !== undefined && this.currentYear > city.endYear) return true;

        return false;
    }

    // CRUD & Logic
    public addCity(city: City): void {
        this.cities.push(city);
        this.requestRender();
    }

    public addCities(cities: City[]): void {
        this.cities.push(...cities);
        this.requestRender();
    }

    public removeCity(cityId: string): void {
        const index = this.cities.findIndex(c => c.id === cityId);
        if (index !== -1) {
            this.cities.splice(index, 1);
            this.requestRender();
        }
    }

    private requestRender(): void {
        if (!this.pendingRenderFrame) {
            this.pendingRenderFrame = requestAnimationFrame(() => {
                this.renderAllCities();
                this.pendingRenderFrame = null;
            });
        }
    }

    public async renderAllCities(): Promise<void> {
        // [NEW] Filter cities based on visibility
        const visibleCities = this.cities.filter(city => this.isCityVisible(city));

        // Pass "ghost" status via runtime property injection (or modify TerritorySystem)
        // For now, let's inject a temporary property if needed, or better:
        // Update TerritorySystem to accept a predicate or status map.
        // Quickest way: Map cities to include a _ghost flag if supported, 
        // OR just pass the full list to TerritorySystem and let it ask CityManager (dependency loop risk).
        // Let's modify visibleCities to include ghosts (implied by isCityVisible in Editor Mode)

        // We need to tell TerritorySystem which ones are ghosts.
        // Let's attach metadata to the array or objects? No, risky.
        // Let's rely on TerritorySystem checking `CityManager`? TerritorySystem has reference to FacitonManager not CityManager.

        // Current Plan: Pass ALL visible cities (including ghosts). 
        // NOTE: TerritorySystem needs modification to handle opacity based on date.
        // I will assume TerritorySystem draws them opaque for now, will fix opacity in next step.

        await this.territorySystem.update(visibleCities, (city) => this.isCityGhost(city));
    }

    public refreshAll(): void {
        this.requestRender();
    }

    // Proxy for TerritorySystem label updates
    public updateCityLabel(cityId: string): void {
        const city = this.getCity(cityId);
        if (city) {
            this.territorySystem.updateCityLabel(city);
        }
    }

    // Game Logic
    public updateTroops(): void {
        this.cities.forEach(city => {
            const config = CITY_CONFIG[city.type];
            // [USER REQUEST] 叛军城市的兵力也是可以恢复的
            // 军队生成已在 RecruitmentSystem 中禁止
            if (!config) return;

            // [NEW] Recruitment Efficiency Logic
            this.calculateRecruitmentEfficiency(city);
            const efficiency = city.recruitmentEfficiency || 1.0;

            const growth = Math.floor(config.maxTroops * config.growthRate * efficiency);
            if (city.troops < config.maxTroops) {
                city.troops = Math.min(config.maxTroops, city.troops + growth);
                this.territorySystem.updateCityLabel(city);
            }
        });
    }

    public updateCity(id: string, data: Partial<City>): void {
        const cityIndex = this.cities.findIndex(c => c.id === id);
        if (cityIndex !== -1) {
            const oldCity = this.cities[cityIndex];
            this.cities[cityIndex] = { ...oldCity, ...data };
            const updatedCity = this.cities[cityIndex];

            const visualProps = ['factionId', 'type', 'name', 'image', 'mirror', 'latitude', 'longitude'];
            const needsFullRender = visualProps.some(prop => prop in data);

            // [NEW] Trigger Capture Effect if faction changed
            if (data.factionId && data.factionId !== oldCity.factionId) {
                console.log(`[CityManager] City ${oldCity.name} captured by ${data.factionId}! Playing effect.`);
                const color = this.factionManager.getFactionColor(data.factionId);
                // Snap to grid center for consistency
                const cityAxial = GridSystem.latLngToAxial(oldCity.latitude, oldCity.longitude);
                const snappedCenter = GridSystem.axialToLatLng(cityAxial.q, cityAxial.r);

                this.map.getCityCaptureRenderer()?.playCaptureEffect(snappedCenter.lat, snappedCenter.lng, color);

                // [FIX] Recalculate efficiency immediately upon capture
                // This ensures the label updates to reflect the new owner's capital distance
                this.calculateRecruitmentEfficiency(updatedCity);
            }

            if (needsFullRender) {
                this.requestRender();
            } else if ('troops' in data || ('factionId' in data && data.factionId !== oldCity.factionId)) {
                // If troops changed OR faction changed (efficiency update), update label
                this.territorySystem.updateCityLabel(updatedCity);
            }

            if (this.onCityUpdatedCallback) this.onCityUpdatedCallback(updatedCity);
        } else {
            console.warn('⚠️ [CityManager] City not found:', id);
        }
    }

    /**
     * [NEW] Calculate and set recruitment efficiency based on distance to capital.
     */
    public calculateRecruitmentEfficiency(city: City): void {
        let efficiency = 1.0;

        // [FIX] Explicitly exempt Rebels (panjun)
        if (city.factionId === 'panjun') {
            efficiency = 1.0;
        } else {
            const capitalId = this.factionManager.getCapital(city.factionId);

            if (capitalId) {
                // Find capital even if occupied
                const capitalCity = this.cities.find(c => c.id === capitalId);

                if (capitalCity) {
                    const dist = GridSystem.getDistance(
                        GridSystem.latLngToAxial(city.latitude, city.longitude),
                        GridSystem.latLngToAxial(capitalCity.latitude, capitalCity.longitude)
                    );

                    // Formula: 0-10 hexes = 100%, >10 hexes = -10% per 10 hexes, min 10%
                    const threshold = GameConfig.CITY.RECRUITMENT_EFFICIENCY_DISTANCE_THRESHOLD;
                    if (dist > threshold) {
                        const penaltySteps = Math.floor((dist - threshold) / threshold);
                        // [FIX] Use integer math to avoid 1.0 - 0.8 = 0.19999 -> 19%
                        const efficiencyInt = Math.max(10, 100 - (penaltySteps + 1) * 10);
                        efficiency = efficiencyInt / 100;
                    }
                }
            }
        }

        city.recruitmentEfficiency = efficiency;
    }

    public getCity(id: string): City | undefined {
        return this.cities.find(c => c.id === id);
    }

    public getCityById(id: string): City | undefined {
        return this.getCity(id);
    }

    public getCities(): City[] {
        // [PERFORMANCE WARNING] This creates a copy! Use getCitiesRef() for read-only hot paths.
        return [...this.cities];
    }

    // [OPTIMIZATION] Direct Read-Only Access
    public getCitiesRef(): readonly City[] {
        return this.cities;
    }

    public getCitiesByFaction(factionId: string): City[] {
        return this.cities.filter(c => c.factionId === factionId);
    }

    /**
     * [NEW] Get all unique faction IDs from cities
     */
    public getAllFactionIds(): string[] {
        const factionSet = new Set<string>();
        for (const city of this.cities) {
            if (city.factionId) {
                factionSet.add(city.factionId);
            }
        }
        return Array.from(factionSet);
    }



    public getNearestCity(factionId: string | null, targetPos: { latitude: number; longitude: number }): City | null {
        if (this.cities.length === 0) return null;

        // [OPTIMIZATION] Zero-Allocation Search
        let nearest: City | null = null;
        let minDistSq = Infinity; // Use squared distance

        // Cache targetLat/Lng for slightly faster access
        const tLat = targetPos.latitude;
        const tLng = targetPos.longitude;

        // Pre-calculate cos for rough longitude projection around target latitude
        const cosLat = Math.cos(tLat * (Math.PI / 180));

        for (let i = 0; i < this.cities.length; i++) {
            const city = this.cities[i];

            if (factionId !== null && city.factionId !== factionId) continue;

            const dLat = city.latitude - tLat;
            const dLng = (city.longitude - tLng) * cosLat;

            // Simple Euclidean comparison is faster and sufficient for "nearest" check
            const distSq = dLat * dLat + dLng * dLng;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = city;
            }
        }
        return nearest;
    }

    public getFactionTotalTroops(factionId: string): number {
        return this.cities
            .filter(c => c.factionId === factionId)
            .reduce((sum, c) => sum + c.troops, 0);
    }

    public recruitTroopsFromFaction(factionId: string, requiredAmount: number, autoFill: boolean = false): number {
        const cities = this.cities.filter(c => c.factionId === factionId);
        if (cities.length === 0) return 0;

        // 1. Calculate total available excess troops (above 1000)
        let totalExcess = 0;
        const capableCities: City[] = [];

        cities.forEach(c => {
            const minGarrison = getMinGarrison(c.type);
            const excess = Math.max(0, c.troops - minGarrison);
            if (excess > 0) {
                totalExcess += excess;
                capableCities.push(c);
            }
        });

        // 2. Determine actual recruit amount
        let actualRecruit = requiredAmount;
        if (totalExcess < requiredAmount) {
            if (autoFill) {
                actualRecruit = requiredAmount;
            } else {
                actualRecruit = totalExcess; // Strict limit
            }
        }

        if (actualRecruit <= 0) return 0;

        // 3. Distribute the cost
        let amountToDeduct = Math.min(actualRecruit, totalExcess);
        let remainingToDeduct = amountToDeduct;

        while (remainingToDeduct > 0.1 && capableCities.length > 0) {
            const amountPerCity = remainingToDeduct / capableCities.length;
            for (let i = capableCities.length - 1; i >= 0; i--) {
                const city = capableCities[i];
                const minGarrison = getMinGarrison(city.type);
                const available = city.troops - minGarrison;

                if (available <= amountPerCity) {
                    city.troops -= available;
                    remainingToDeduct -= available;
                    capableCities.splice(i, 1);
                    this.territorySystem.updateCityLabel(city);
                } else {
                    city.troops -= amountPerCity;
                    remainingToDeduct -= amountPerCity;
                    this.territorySystem.updateCityLabel(city);
                }
            }
        }
        return Math.floor(actualRecruit);
    }

    public addTroops(cityId: string, amount: number): void {
        const city = this.getCity(cityId);
        if (city) {
            city.troops += amount;
            this.territorySystem.updateCityLabel(city);
        }
    }

    // Siege Effects
    public playSiegeEffect(cityId: string): void {
        const city = this.getCity(cityId);
        if (city) {
            // 城市图标的实际渲染位置是 snap 到六边形网格中心的
            // 特效坐标必须与之匹配，否则会偏移
            const cityAxial = GridSystem.latLngToAxial(city.latitude, city.longitude);
            const snappedCenter = GridSystem.axialToLatLng(cityAxial.q, cityAxial.r);
            this.siegeEffectRenderer.playEffect(cityId, { lat: snappedCenter.lat, lng: snappedCenter.lng }, city.type);
        }
    }

    public stopSiegeEffect(cityId: string): void {
        this.siegeEffectRenderer.stopEffect(cityId);
    }

    // Road / Path Utils
    public getConnectedCities(cityId: string): City[] {
        const connectedIds = roadRegistry.getConnectedCities(cityId);
        return connectedIds
            .map((id: string) => this.getCityById(id))
            .filter((c: City | undefined): c is City => c !== undefined);
    }

    public findPath(startId: string, endId: string): City[] | null {
        const cityIds = roadRegistry.findCityPath(startId, endId);
        if (!cityIds) return null;
        return cityIds
            .map((id: string) => this.getCityById(id))
            .filter((c: City | undefined): c is City => c !== undefined);
    }

    // Deprecated but kept for API compatibility if needed
    public refreshConnections(): void {
        this.requestRender();
    }

}
