import L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { TerrainSpeedSystem, TerrainSpeed } from './TerrainSpeedSystem';
import { CityManager } from './CityManager';
import { IBattleUnit, UnitType } from './CombatSystem';
import { UnitRenderer, IRenderable } from '../map/UnitRenderer';
import { Player } from './Player';
import { GridSystem } from '../systems/GridSystem';

// Extend IBattleUnit for NPC
export interface NPC extends IBattleUnit, IRenderable {
    name: string; // Resolve conflict between IBattleUnit (required) and IRenderable (optional)
    type: 'bandit' | 'raider' | 'outlaw' | 'barbarian' | 'rebel' | 'mercenary' | 'cult' | 'righteous' | 'warlord';
    unitType: 'npc'; // 新增：对应 CombatSystem 的 UnitType
    latitude: number;
    longitude: number;
    color: string;
    marker?: L.Marker;
    renderer?: UnitRenderer;
}

export const NPC_TYPES = {
    bandit: { name: '盗贼', troops: 55, color: '#8B4513' },
    raider: { name: '流寇', troops: 111, color: '#A0522D' },
    outlaw: { name: '土匪', troops: 333, color: '#CD853F' },
    barbarian: { name: '异族', troops: 777, color: '#8B7355' },
    rebel: { name: '叛军', troops: 1111, color: '#D2691E' },
    mercenary: { name: '佣兵', troops: 3333, color: '#B8860B' },
    cult: { name: '邪教', troops: 5555, color: '#8B008B' },
    righteous: { name: '义军', troops: 7777, color: '#FF8C00' },
    warlord: { name: '军阀', troops: 9999, color: '#DC143C' }
};

export class NPCManager {
    // Distance constants (in degrees, ~0.5 degree ≈ 50km)
    private static readonly MIN_DISTANCE_TO_CITY = 0.5;
    private static readonly MIN_DISTANCE_BETWEEN_NPCS = 0.5;

    private npcs: NPC[] = [];
    private map: GameMap;
    private cityManager: CityManager;
    private player: Player;
    private layerGroup: L.LayerGroup;
    private onNPCClick: ((npc: NPC) => void) | null = null;

    // State
    private manualVisible: boolean = false; // Default Hidden
    private zoomVisible: boolean = true;    // Default based on zoom (usually true unless zoomed out far)

    constructor(map: GameMap, cityManager: CityManager, player: Player) {
        this.map = map;
        this.cityManager = cityManager;
        this.player = player;
        this.layerGroup = L.layerGroup().addTo(map.getLeafletMap());

        // Create a custom pane for NPCs
        const leafletMap = map.getLeafletMap();
        if (!leafletMap.getPane('npcPane')) {
            leafletMap.createPane('npcPane');
            leafletMap.getPane('npcPane')!.style.zIndex = '620';
        }

        // Initial render update
        this.updateRendering();
    }

    public setOnNPCClick(callback: (npc: NPC) => void): void {
        this.onNPCClick = callback;
    }

    // Toggle based on user click
    public toggleManualVisibility(): boolean {
        this.manualVisible = !this.manualVisible;
        this.updateRendering();
        return this.manualVisible;
    }

    public isManualVisible(): boolean {
        return this.manualVisible;
    }

    // Called by GameApp based on zoom level
    public setZoomVisible(visible: boolean): void {
        if (this.zoomVisible === visible) return;
        this.zoomVisible = visible;
        this.updateRendering();
    }

    private updateRendering(): void {
        const shouldBeVisible = this.manualVisible && this.zoomVisible;
        const map = this.map.getLeafletMap();

        // Toggle hitbox layer group
        if (shouldBeVisible) {
            if (!map.hasLayer(this.layerGroup)) {
                this.layerGroup.addTo(map);
            }
        } else {
            if (map.hasLayer(this.layerGroup)) {
                map.removeLayer(this.layerGroup);
            }
        }

        // Toggle NPC sprite renderers
        this.npcs.forEach(npc => {
            if (npc.renderer) {
                npc.renderer.setVisible(shouldBeVisible);
            }
        });
    }

    /**
     * @deprecated Use setZoomVisible or toggleManualVisibility
     */
    public toggle(visible: boolean): void {
        this.setZoomVisible(visible);
    }

    public async spawnNPCs(count: number = 90): Promise<void> {
        console.log(`🎯 Generating ${count} NPCs across 9 levels...`);

        // Define NPC distribution by type
        const distribution: { type: keyof typeof NPC_TYPES, count: number }[] = [
            { type: 'bandit', count: 18 },
            { type: 'raider', count: 16 },
            { type: 'outlaw', count: 14 },
            { type: 'barbarian', count: 12 },
            { type: 'rebel', count: 10 },
            { type: 'mercenary', count: 8 },
            { type: 'cult', count: 6 },
            { type: 'righteous', count: 4 },
            { type: 'warlord', count: 2 }
        ];

        // Map bounds
        const fullBounds = {
            north: 53.56,
            south: 18.11,
            east: 134.77,
            west: 73.33
        };

        const coreBounds = {
            north: 40.0,
            south: 23.0,
            east: 121.0,
            west: 104.0
        };

        let totalSpawned = 0;
        const maxAttemptsPerNPC = 100;

        // [OPTIMIZATION] Batch size for yielding to UI thread
        const BATCH_SIZE = 5;
        let spawnsInBatch = 0;

        // Spawn each type according to distribution
        for (const { type, count } of distribution) {
            const config = NPC_TYPES[type];
            let spawnedOfType = 0;

            while (spawnedOfType < count) {
                let attempts = 0;
                let success = false;

                while (attempts < maxAttemptsPerNPC && !success) {
                    attempts++;
                    const useCoreBounds = Math.random() < 0.5;
                    const bounds = useCoreBounds ? coreBounds : fullBounds;
                    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
                    const lng = bounds.west + Math.random() * (bounds.east - bounds.west);

                    // 1. Check Terrain
                    const hex = GridSystem.latLngToAxial(lat, lng);
                    const speedType = await TerrainSpeedSystem.getHexSpeedAsync({ lat, lng }, hex);

                    if (speedType !== TerrainSpeed.SLOW) continue;

                    // 2. Check Distance to Cities
                    const tooCloseToCity = this.cityManager.getCities().some(city => {
                        const dist = Math.sqrt(Math.pow(city.latitude - lat, 2) + Math.pow(city.longitude - lng, 2));
                        return dist < NPCManager.MIN_DISTANCE_TO_CITY;
                    });
                    if (tooCloseToCity) continue;

                    // 3. Check Distance to Existing NPCs
                    const tooCloseToNPC = this.npcs.some(existingNPC => {
                        const dist = Math.sqrt(
                            Math.pow(existingNPC.latitude - lat, 2) +
                            Math.pow(existingNPC.longitude - lng, 2)
                        );
                        return dist < NPCManager.MIN_DISTANCE_BETWEEN_NPCS;
                    });
                    if (tooCloseToNPC) continue;

                    // 4. Create & Add NPC
                    const npc = this.createNPC(type, lat, lng, `${totalSpawned}`);
                    this.addNPC(npc); // Render is called here, immediately adds to DOM

                    spawnedOfType++;
                    totalSpawned++;
                    success = true;

                    // [OPTIMIZATION] Yield to UI thread every few spawns
                    spawnsInBatch++;
                    if (spawnsInBatch >= BATCH_SIZE) {
                        spawnsInBatch = 0;
                        await new Promise(resolve => requestAnimationFrame(resolve));
                    }
                }

                if (!success) {
                    console.warn(`⚠️ Could not spawn ${config.name} after ${maxAttemptsPerNPC} attempts. Skipping.`);
                    break;
                }
            }
            console.log(`✅ Spawned ${spawnedOfType}/${count} ${config.name}`);

            // Allow UI update between types as well
            if (spawnsInBatch > 0) {
                await new Promise(resolve => requestAnimationFrame(resolve));
                spawnsInBatch = 0;
            }
        }

        console.log(`🎉 Total NPCs spawned: ${totalSpawned}/90`);
    }

    public addNPC(npc: NPC): void {
        this.npcs.push(npc);
        this.renderNPC(npc);
    }

    public removeNPC(npcId: string): void {
        const index = this.npcs.findIndex(n => n.id === npcId);
        if (index !== -1) {
            const npc = this.npcs[index];
            npc.isDestroyed = true;
            if (npc.marker) {
                npc.marker.remove();
            }
            if (npc.renderer) {
                npc.renderer.destroy();
            }
            this.npcs.splice(index, 1);
        }
    }

    public getNPCs(): NPC[] {
        return this.npcs;
    }

    /**
     * Create an NPC object with all IBattleUnit methods
     */
    private createNPC(
        type: keyof typeof NPC_TYPES,
        lat: number,
        lng: number,
        idSuffix: string
    ): NPC {
        const config = NPC_TYPES[type];
        const npc: NPC = {
            id: `npc_${type}_${Date.now()}_${idSuffix}`,
            type: type,
            name: config.name,
            troops: config.troops,
            maxTroops: config.troops,
            morale: 100,
            maxMorale: 100,
            latitude: lat,
            longitude: lng,
            color: config.color,
            factionId: null,
            unitType: 'npc', // 新增：NPC 类型
            isDestroyed: false,

            setTroops: function (count: number) {
                this.troops = count;
                if (this.marker) {
                    this.marker.setTooltipContent(`${this.name} (${Math.floor(this.troops)})`);
                }
            },
            setMorale: function (value: number) {
                this.morale = Math.max(0, Math.min(this.maxMorale, value));
            },
            destroy: () => { },
            onBattleStart: (opponent: IBattleUnit, battleType: 'siege' | 'field') => {
                if (npc.renderer) {
                    // Pass opponent position so Bandit turns to face the enemy
                    const pos = opponent.getPosition();
                    const targetPos = pos ? { lat: pos.lat, lng: pos.lng } : undefined;
                    npc.renderer.triggerAttack(battleType, targetPos);
                }
            },
            onBattleEnd: (result) => {
                if (npc.renderer) {
                    npc.renderer.stopAttack();
                }
                if (result === 'defeat') {
                    this.removeNPC(npc.id);
                }
            },
            showDamage: (damage: number) => {
                // Sync damage time for visual feedback (even if damage text disabled)
                if (npc.renderer) npc.renderer.lastDamageTime = Date.now();
            },
            getPosition: () => ({ lat: npc.latitude, lng: npc.longitude }),
            getTroops: () => npc.troops
        };

        return npc;
    }

    private renderNPC(npc: NPC): void {
        // [FIX] Snap NPC position to hex center
        const hex = GridSystem.latLngToAxial(npc.latitude, npc.longitude);
        const hexCenter = GridSystem.axialToLatLng(hex.q, hex.r);
        npc.latitude = hexCenter.lat;
        npc.longitude = hexCenter.lng;

        // Create renderer for NPC sprite
        npc.renderer = new UnitRenderer(this.map, npc, '620');
        // [FIX] Sync initial visibility state
        const shouldBeVisible = this.manualVisible && this.zoomVisible;
        npc.renderer.setVisible(shouldBeVisible);

        // Note: 8-direction sprites handle facing automatically via PhalanxDrawer

        // Create invisible interactive marker for click detection
        // [EXPANDED] Larger click area for better interaction
        const latOffset = 0.15;  // Doubled from 0.075
        const lngOffset = 0.10;  // Increased from 0.03

        const points: [number, number][] = [
            [npc.latitude + latOffset, npc.longitude - lngOffset], // Top Left
            [npc.latitude + latOffset, npc.longitude + lngOffset], // Top Right
            [npc.latitude - latOffset, npc.longitude + lngOffset], // Bottom Right
            [npc.latitude - latOffset, npc.longitude - lngOffset]  // Bottom Left
        ];

        const marker = L.polygon(points, {
            color: '#000',
            weight: 0,
            fillColor: '#000',
            fillOpacity: 0,
            pane: 'npcPane',
            interactive: true,
            className: 'npc-hitbox'
        }).addTo(this.layerGroup);

        // NPC labels are rendered by GlobalUnitRenderer.renderInfo()

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.onNPCClick) {
                this.onNPCClick(npc);
            }
        });

        npc.marker = marker as any;
    }

    /**
     * Respawn one NPC (called annually by TimeSystem)
     * Spawns only one NPC regardless of how many are missing
     */
    /**
     * Respawn one NPC (called annually by TimeSystem)
     * Spawns only one NPC if there are missing ones
     */
    public respawnOneNPC(): void {
        this.respawnMissingNPCs(1);
    }

    private async respawnMissingNPCs(maxToSpawn: number): Promise<void> {
        // Define NPC distribution by type (same as in spawnNPCs)
        const distribution: { type: keyof typeof NPC_TYPES, count: number }[] = [
            { type: 'bandit', count: 18 },
            { type: 'raider', count: 16 },
            { type: 'outlaw', count: 14 },
            { type: 'barbarian', count: 12 },
            { type: 'rebel', count: 10 },
            { type: 'mercenary', count: 8 },
            { type: 'cult', count: 6 },
            { type: 'righteous', count: 4 },
            { type: 'warlord', count: 2 }
        ];

        let spawnedCount = 0;
        const maxAttempts = 50; // Max attempts to find position

        while (spawnedCount < maxToSpawn) {
            // 1. Identify missing types
            const currentCounts = new Map<string, number>();
            this.npcs.forEach(npc => {
                currentCounts.set(npc.type, (currentCounts.get(npc.type) || 0) + 1);
            });

            const missingTypes = distribution.filter(d => {
                const current = currentCounts.get(d.type) || 0;
                return current < d.count;
            });

            if (missingTypes.length === 0) {
                console.log('NPC population full, no respawn needed.');
                break;
            }

            // 2. Pick random missing type
            const target = missingTypes[Math.floor(Math.random() * missingTypes.length)];
            const config = NPC_TYPES[target.type];

            // 3. Try to spawn it
            let attempts = 0;
            let success = false;

            // Map bounds (same as spawnNPCs)
            const fullBounds = { north: 53.56, south: 18.11, east: 134.77, west: 73.33 };
            const coreBounds = { north: 40.0, south: 23.0, east: 121.0, west: 104.0 };

            while (attempts < maxAttempts && !success) {
                attempts++;
                const useCoreBounds = Math.random() < 0.5;
                const bounds = useCoreBounds ? coreBounds : fullBounds;
                const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
                const lng = bounds.west + Math.random() * (bounds.east - bounds.west);

                // Check Terrain - USE ASYNC VERSION
                const hex = GridSystem.latLngToAxial(lat, lng);
                const speedType = await TerrainSpeedSystem.getHexSpeedAsync({ lat, lng }, hex);
                if (speedType !== TerrainSpeed.SLOW) continue;

                // Check Cities
                if (this.cityManager.getCities().some(c => Math.sqrt((c.latitude - lat) ** 2 + (c.longitude - lng) ** 2) < NPCManager.MIN_DISTANCE_TO_CITY)) continue;

                // Check NPCs
                if (this.npcs.some(n => Math.sqrt((n.latitude - lat) ** 2 + (n.longitude - lng) ** 2) < NPCManager.MIN_DISTANCE_BETWEEN_NPCS)) continue;

                // Create NPC
                const npc = this.createNPC(target.type, lat, lng, 'respawn');

                this.addNPC(npc);
                console.log(`✅ Respawned 1 ${config.name} at [${lat.toFixed(2)}, ${lng.toFixed(2)}]`);
                spawnedCount++;
                success = true;
            }
        }
    }
}
