import L from 'leaflet';
import { GameMap } from './GameMap';
import { OrientationSystem } from '../core/OrientationSystem';
import { GridSystem } from '../systems/GridSystem';
import { MAP_LAYER_ZINDEX, MAP_PANES } from '../config/MapLayers';
import { PlayerPhalanxDrawer } from './player/PlayerPhalanxDrawer'; // [NEW] Preload only
import { LegionPhalanxDrawer, PhalanxAnimState } from './legion/LegionPhalanxDrawer'; // [AI SYSTEM]
import { LegionFlagDrawer } from './legion/LegionFlagDrawer'; // [AI FLAG SYSTEM]
import { ProjectileRenderer } from './ProjectileRenderer'; // [NEW] Arrow System
import { BanditDrawer, BanditState } from './BanditDrawer';
import { LegionType } from '../types/UnitTypes';
import { GameConfig } from '../config/GameConfig';
import { FACTIONS } from '../data/factions';
import { PerformanceMonitor } from '../debug/PerformanceMonitor'; // [DEBUG]

export interface IRenderable {
    getPosition(): { lat: number; lng: number };
    getTroops(): number;
    isDestroyed: boolean;
    name?: string;
}

export interface IAnimatedUnit extends IRenderable {
    // Animation State
    isAttacking: boolean;
    isMoving: boolean;

    // Battle Info
    currentBattleType: 'siege' | 'field' | null;
    targetPos: { lat: number; lng: number } | null;

    // Movement Tracking
    lastPosition: { lat: number; lng: number };

    // Optional
    id?: string;
    type?: string;
    lastDirection?: number;
    lastDamageTime?: number; // [NEW] For visual damage feedback
    legionType?: LegionType; // [UNIT SYSTEM] 兵种类型
    factionId?: string; // [NEW] Faction ID for color tinting
    visible?: boolean; // [NEW] Visibility toggle
    isPlayer?: boolean; // [NEW] Player control flag

    // [NEW] Projectile Cooldown
    lastShotTime?: number;
    lastReceivedShotTime?: number; // [NEW] City Defense cooldown

    // [NEW] Corpse Persistence
    destroyTime?: number;
}

/**
 * Global Unit Renderer - Manages all unit rendering using Phalanx Visuals
 */
export class GlobalUnitRenderer {
    private map: L.Map;
    // Canvas High (Default, Field Battle, Moving) - Above Cities
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    // Canvas Low (Siege Battle) - Below Cities
    private canvasLow: HTMLCanvasElement;
    private ctxLow: CanvasRenderingContext2D;

    private units: Set<IAnimatedUnit> = new Set();
    // [OPTIMIZATION] Cache sorted array to avoid Array.from(Set) every frame
    private sortedUnitsCache: IAnimatedUnit[] = [];
    private needsSort: boolean = false;

    private unitFightingStates: Map<string, boolean> = new Map();
    private lastTime: number = 0;
    private isRunning: boolean = false;
    private showLabels: boolean = true; // [NEW] Toggle for text labels

    // [NEW] Visual Systems
    private projectileSystem: ProjectileRenderer;

    // [OPTIMIZATION] Static preload to start loading assets before Map exists
    private static assetsPromise: Promise<void> | null = null;
    private static assetsLoaded: boolean = false;

    public static async preloadAssets(): Promise<void> {
        if (this.assetsPromise) return this.assetsPromise;

        console.log('🔄 GlobalUnitRenderer: Starting Static Preload...');
        this.assetsPromise = Promise.all([
            PlayerPhalanxDrawer.preload(),
            LegionPhalanxDrawer.preload(),
            LegionFlagDrawer.preload(),
            BanditDrawer.preload()
        ]).then(() => {
            this.assetsLoaded = true;
            console.log('🎨 GlobalUnitRenderer: Assets Ready (Static Preload Complete)');
        });

        return this.assetsPromise;
    }

    constructor(gameMap: GameMap) {
        this.map = gameMap.getLeafletMap();

        // 1. Initialize High Canvas (Standard)
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext('2d')!;
        this.setupPane(MAP_PANES.UNITS, MAP_LAYER_ZINDEX.UNITS, this.canvas);

        // 2. Initialize Low Canvas (Siege)
        this.canvasLow = this.createCanvas();
        this.ctxLow = this.canvasLow.getContext('2d')!;
        this.setupPane(MAP_PANES.UNITS_LOW, MAP_LAYER_ZINDEX.UNITS_LOW, this.canvasLow);

        // Bind events
        this.map.on('move', this.updateCanvasPosition.bind(this));
        this.map.on('zoom', this.updateCanvasPosition.bind(this));
        this.map.on('resize', this.resizeCanvas.bind(this));

        // Initial setup
        this.resizeCanvas();
        this.updateCanvasPosition();

        // [NEW] Projectile System (Arrows)
        this.projectileSystem = new ProjectileRenderer(this.map);

        // Ensure assets are loaded (if not already called via static preload)
        if (!GlobalUnitRenderer.assetsPromise) {
            GlobalUnitRenderer.preloadAssets();
        }

        // Wait for preload to finish then start
        GlobalUnitRenderer.assetsPromise!.then(() => {
            this.start();
            // [DEBUG] Spawn Showcase Units if enabled
            if (GameConfig.SYSTEM.DEBUG_SHOWCASE_UNITS) {
                this.spawnShowcaseUnits();
            }
        });

        // [NEW] Listen for UI toggle events
        window.addEventListener('toggle-showcase-units', (e: any) => {
            this.toggleShowcase(e.detail?.visible ?? false);
        });
        window.addEventListener('toggle-showcase-battle', (e: any) => {
            this.toggleShowcaseBattle(e.detail?.attacking ?? false);
        });

        console.log('🎨 GlobalUnitRenderer initialized');
    }

    private spawnShowcaseUnits(): void {
        console.log('🧪 [DEBUG] Spawning Showcase Units...');
        const factions = FACTIONS.filter(f => f.id !== 'panjun');

        // Grid Start (Near Luoyang - 三川)
        const startLat = 34.62;
        const startLng = 112.45;
        const gapLat = 0.60;
        const gapLng = 2.0; // Increased horizontal gap for single column labels
        const maxRowsPerCol = 10; // More rows per column since we only have 1 unit per faction

        factions.forEach((factionConfig, index) => {
            // Determine Column and visual Row
            const colIndex = Math.floor(index / maxRowsPerCol);
            const rowIndex = index % maxRowsPerCol;

            // Offset for columns
            const colOffsetLng = colIndex * (-3.0);

            const lat = startLat - (rowIndex * gapLat);
            const lng = startLng + colOffsetLng;

            // Use the configured defaultLegionType (or fallback to 'infantry')
            const legionType = factionConfig.defaultLegionType || 'infantry';
            const armyName = factionConfig.armyName || `${factionConfig.name}军`;

            const id = `showcase_${factionConfig.id}_${legionType}`;

            // Use fixed position object
            const fixedPos = { lat, lng };

            const unit: IAnimatedUnit = {
                id: id,
                name: armyName, // Use official Army Name (e.g. "虎豹迅骑")
                getTroops: () => 5000,
                getPosition: () => fixedPos,
                isDestroyed: false,
                isAttacking: false,
                isMoving: false,
                currentBattleType: null,
                targetPos: null,
                lastPosition: fixedPos,
                type: 'legion',
                legionType: legionType,
                factionId: factionConfig.id,
                lastDirection: Math.floor(Math.random() * 8),
                visible: false
            };

            this.register(unit);
            console.log(`🧪 [DEBUG] Registered: ${id} (${armyName}) at (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
        });
        console.log(`✅ [DEBUG] Total showcase units: ${factions.length}`);
    }

    private createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.style.pointerEvents = 'none';
        canvas.className = 'leaflet-zoom-animated';
        return canvas;
    }

    private setupPane(paneName: string, zIndex: number, canvas: HTMLCanvasElement): void {
        if (!this.map.getPane(paneName)) {
            this.map.createPane(paneName);
            const pane = this.map.getPane(paneName);
            if (pane) {
                pane.style.zIndex = zIndex.toString();
                pane.style.pointerEvents = 'none'; // Click-through
            }
        }
        const pane = this.map.getPane(paneName) || this.map.getPanes().overlayPane;
        pane.appendChild(canvas);
    }

    public register(unit: IAnimatedUnit): void {
        this.units.add(unit);
        this.needsSort = true;
        // [OPTIMIZATION] Force next frame render
        this.start();
    }

    public unregister(unit: IAnimatedUnit): void {
        this.units.delete(unit);
        this.needsSort = true;
    }

    private resizeCanvas(): void {
        const size = this.map.getSize();
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        this.canvasLow.width = size.x;
        this.canvasLow.height = size.y;
        this.updateCanvasPosition();
        this.needsSort = true; // Force re-render on resize
    }

    // [OPTIMIZATION] Track if map moved/zoomed to force render
    private isMapDirty: boolean = true;

    private updateCanvasPosition(): void {
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);
        L.DomUtil.setPosition(this.canvasLow, topLeft);
        this.isMapDirty = true; // Map moved, must redraw
    }

    // [OPTIMIZATION] FPS Limit
    private fpsInterval: number = 1000 / 60;
    private lastDrawTime: number = 0;

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastDrawTime = this.lastTime;
        // [REF] Decoupled from rAF. GameApp now drives this via manualRender().
    }

    // [NEW] Manual Render Hook (Called by GameApp)
    public manualRender(time: number): void {
        if (!this.isRunning) return;
        this.animate(time);
    }

    public stop(): void {
        this.isRunning = false;
    }

    // [NEW] Toggle Showcase Units Visibility
    public toggleShowcase(visible: boolean): void {
        console.log(`🧪 [GlobalUnitRenderer] Toggling showcase units: ${visible}`);
        let count = 0;
        this.units.forEach(unit => {
            if (unit.id && unit.id.startsWith('showcase_')) {
                (unit as any).visible = visible;
                count++;
            }
        });
        console.log(`   - Updated ${count} units`);
        this.needsSort = true; // Force redraw
        this.isMapDirty = true;
    }

    // [NEW] Toggle Showcase Units Battle State (for testing animations)
    public toggleShowcaseBattle(attacking: boolean): void {
        console.log(`⚔️ [GlobalUnitRenderer] Toggling showcase battle: ${attacking}`);
        let count = 0;
        let directionIndex = 0;

        // 8方向向量 (用于计算目标位置)
        // 0: S, 1: SW, 2: W, 3: NW, 4: N, 5: NE, 6: E, 7: SE
        const dirVectors = [
            { lat: -0.3, lng: 0 },     // S (0)
            { lat: -0.2, lng: -0.2 },  // SW (1)
            { lat: 0, lng: -0.3 },     // W (2)
            { lat: 0.2, lng: -0.2 },   // NW (3)
            { lat: 0.3, lng: 0 },      // N (4)
            { lat: 0.2, lng: 0.2 },    // NE (5)
            { lat: 0, lng: 0.3 },      // E (6)
            { lat: -0.2, lng: 0.2 },   // SE (7)
        ];

        this.units.forEach(unit => {
            if (unit.id && unit.id.startsWith('showcase_')) {
                unit.isAttacking = attacking;
                unit.currentBattleType = attacking ? 'field' : null;

                if (attacking) {
                    const pos = unit.getPosition();
                    const dir = Math.floor(Math.random() * 8);
                    const vec = dirVectors[dir];
                    unit.targetPos = { lat: pos.lat + vec.lat, lng: pos.lng + vec.lng };
                    unit.lastDirection = dir;
                    directionIndex++;
                } else {
                    unit.targetPos = null;
                    unit.lastDirection = Math.floor(Math.random() * 8); // Randomize direction when idle
                }
                count++;
            }
        });
        console.log(`   - Updated ${count} units to ${attacking ? 'ATTACKING (8 directions)' : 'IDLE'}`);
        this.needsSort = true;
        this.isMapDirty = true;
    }

    public setShowLabels(visible: boolean): void {
        this.showLabels = visible;
        this.isMapDirty = true;
    }

    // [OPTIMIZATION]
    // Track if any unit is moving or animating to decide if we need to redraw
    private animate(time: number): void {
        // [REF] RESTORED FPS Throttling (Max 60 FPS)
        // User reported removed limiting caused severe lag (likely on >60Hz screens).
        const elapsed = time - this.lastDrawTime;
        if (elapsed < this.fpsInterval) {
            return;
        }
        this.lastDrawTime = time - (elapsed % this.fpsInterval);

        // Update delta time
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // [PERF-MONITOR]
        const monitor = PerformanceMonitor.getInstance();
        const endRender = monitor.start('Render');

        // 1. Maintain Sorted Cache
        if (this.needsSort) {
            this.sortedUnitsCache = Array.from(this.units);
            this.needsSort = false;
            this.isMapDirty = true; // Sort changed, must redraw
        }

        // [PERF] Only sort when units are moving
        // Check if any unit moved since last frame by comparing positions
        let anyMoved = false;
        let anyAnimating = false; // Moving, Attacking, Dying

        for (const unit of this.sortedUnitsCache) {
            if (unit.isMoving || unit.isAttacking || (unit as any).isBattling || unit.isDestroyed) {
                anyMoved = true; // Position might change (or visual state)
                anyAnimating = true; // Need to redraw this unit
            }
        }

        // [PERF] Sort only if position actually matters (moved)
        if (anyMoved) {
            this.sortedUnitsCache.sort((a, b) => b.getPosition().lat - a.getPosition().lat);
        }

        // [OPTIMIZATION]
        // If map didn't move, and no units are animating, and no projectiles
        // SKIP RENDER COMPLETELY.
        const projectilesActive = this.projectileSystem && (this.projectileSystem as any).projectiles?.length > 0;

        if (!this.isMapDirty && !anyAnimating && !projectilesActive) {
            // Nothing changed visually. Skip clear and draw.
            // Just request next frame and return.
            endRender(); // [PERF-MONITOR] Close measurement even if skipping
            // [FIX] REMOVED recursive call
            // requestAnimationFrame(this.animate.bind(this));
            return;
        }

        // Reset dirty flag (will be set again if map moves)
        this.isMapDirty = false;

        // 2. Check Loop - Update States (and detect if we need to keep rendering next frame)
        // If we processed logic above, we still need to update states for next frame check?
        // Logic updates (move) happen in LegionManager/Army (Sim loop). 
        // Here is visual interpolation state.

        for (let i = 0; i < this.sortedUnitsCache.length; i++) {
            const unit = this.sortedUnitsCache[i];
            if (unit.isDestroyed && !unit.destroyTime) {
                // Mark for cleanup handled in renderUnit logic
            }
            this.updateUnitState(unit);
        }

        // [NEW] Update Projectiles
        this.projectileSystem.update(deltaTime);

        // Render Start
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctxLow.clearRect(0, 0, this.canvasLow.width, this.canvasLow.height);

        // Render Loop
        // [OPTIMIZATION] Frustum Culling (Simple Bounds Check)
        // Only draw units within visible canvas area + padding
        const PADDING = 150;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // [PERF] Sub-scope: Unit Draw
        const endUnitDraw = monitor.start('Render.Unit');

        // [PERF-MONITOR]
        // Count Rendered Units
        let renderedCount = 0;

        for (let i = 0; i < this.sortedUnitsCache.length; i++) {
            const unit = this.sortedUnitsCache[i];

            // [USER REQUEST] Persistent Corpses: Keep unit visible for 5s after destruction
            if (unit.isDestroyed) {
                if (!unit.destroyTime) {
                    unit.destroyTime = Date.now();
                }

                if (Date.now() - unit.destroyTime > 15000) {
                    this.unregister(unit);
                    LegionPhalanxDrawer.resetUnit(unit.id || '');
                    continue;
                }
            }

            if ((unit as any).visible === false) continue;

            // PRE-CALC Position for Culling
            const unitPos = unit.getPosition();
            const centerPoint = this.map.latLngToContainerPoint([unitPos.lat, unitPos.lng]);

            // CULLING
            if (centerPoint.x < -PADDING || centerPoint.x > width + PADDING ||
                centerPoint.y < -PADDING || centerPoint.y > height + PADDING) {
                continue;
            }

            const targetCtx = (unit.currentBattleType === 'siege') ? this.ctx : this.ctx;
            // Pass pre-calculated point to avoid re-calculation? 
            // renderUnit calls latLngToContainerPoint again. 
            // For minimal change, let's keep renderUnit as is, but we saved the draw call overhead.
            this.renderUnit(unit, targetCtx);
            renderedCount++;
        }
        endUnitDraw(); // End Unit Draw

        // [NEW] Draw Projectiles AFTER units
        const currentZoom = this.map.getZoom();
        const effectiveZoom = Math.min(currentZoom, 9);
        const scale = Math.pow(2, effectiveZoom - 9) * 0.9;

        const endProj = monitor.start('Render.Projectiles'); // [PERF-MONITOR]
        this.projectileSystem.draw(this.ctx, scale);
        endProj();

        // [PERF-MONITOR] Track
        monitor.trackValue('Rendered Units', renderedCount);
        monitor.trackValue('Projectiles', (this.projectileSystem as any).projectiles?.length || 0);

        endRender(); // [PERF-MONITOR]

        // [FIX] REMOVE recursive requestAnimationFrame.
        // The render loop is now exclusively driven by GameApp's manualRender().
        // requestAnimationFrame(this.animate.bind(this)); 
    }

    private updateUnitState(unit: IAnimatedUnit): void {
        // [NEW] Check for battle end signal to clear corpses
        const id = unit.id || 'unknown';
        const isFighting = unit.currentBattleType !== null; // OR unit.isAttacking?
        const wasFighting = this.unitFightingStates.get(id) || false;

        if (wasFighting && !isFighting) {
            LegionPhalanxDrawer.resetUnit(id); // [AI SYSTEM]
        }
        this.unitFightingStates.set(id, isFighting);

        const currentPos = unit.getPosition();

        // Check if unit is moving
        const posChanged = Math.abs(currentPos.lat - unit.lastPosition.lat) > 0.0001 ||
            Math.abs(currentPos.lng - unit.lastPosition.lng) > 0.0001;

        if (posChanged) unit.isMoving = true;
        else unit.isMoving = false; // Or let unit decide.

        // [NEW] Projectile Spawner Logic (Unit Attack)
        // If attacking AND is ranged/mixed AND has target
        if (unit.isAttacking && unit.targetPos) {
            // [OPTIMIZATION] Culling Check for Spawning
            // Don't spawn projectiles for off-screen units (Purely visual)

            // Approximate culling (Box check)
            const bounds = this.map.getBounds();
            const pos = unit.getPosition();

            // Simple bound check
            if (!bounds.contains([pos.lat, pos.lng])) {
                // If start is off-screen, check if target is on-screen
                if (!bounds.contains([unit.targetPos.lat, unit.targetPos.lng])) {
                    return; // Both Start and End are off-screen. Skip spawning.
                }
            }

            const lType = unit.legionType || 'infantry';
            const isRanged = lType.includes('archer') || lType.includes('mixed') ||
                lType.includes('infantry') || (lType === 'huihui_cavalry') || lType.includes('tujue') || lType.includes('tian') || lType.includes('xiyu') || lType.includes('chaoxian') ||
                (lType === 'cavalry' && (unit as any).factionId === 'huihui'); // [USER REQUEST] Huihui Cavalry in Showcase (generic type)

            const now = Date.now();

            // 1. Unit Attack Volley (To Target)
            if (isRanged) {
                // [USER REQUEST] Faster frequency (1000ms instead of 2000ms)
                if (!unit.lastShotTime || now - unit.lastShotTime > 1000) {
                    // Random offset to de-sync armies
                    if (!unit.lastShotTime) unit.lastShotTime = now - Math.random() * 1000;

                    if (now - unit.lastShotTime > 1000) {
                        // FIRE!
                        this.spawnVolley(unit.getPosition(), unit.targetPos, lType, (unit as any).factionId, unit.lastDirection, false);
                        unit.lastShotTime = now;
                    }
                }
            }

            // 2. [USER REQUEST] City Defense Volley (From Target To Unit)
            // Only if in Siege Battle (Unit is attacking a city)
            if (unit.currentBattleType === 'siege') {
                if (!unit.lastReceivedShotTime || now - unit.lastReceivedShotTime > 1500) { // Slight offset (1.5s) from attack
                    if (!unit.lastReceivedShotTime) unit.lastReceivedShotTime = now - Math.random() * 1000;

                    if (now - unit.lastReceivedShotTime > 1500) {
                        // FIRE BACK!
                        // Source: City (TargetPos)
                        // Target: Unit (CurrentPos)
                        this.spawnVolley(unit.targetPos, unit.getPosition(), 'city_defense', 'city', undefined, true);
                        unit.lastReceivedShotTime = now;
                    }
                }
            }
        }
    }

    /**
     * [NEW] Helper to spawn arrow volleys
     * @param from Start LatLng
     * @param to End LatLng
     * @param type Legion Type (determines count)
     * @param factionId Faction ID
     * @param direction Unit Direction (for height offset)
     * @param isCityDefense If true, uses fixed count of 9 and reverse logic
     */
    private spawnVolley(from: { lat: number, lng: number }, to: { lat: number, lng: number }, type: string, factionId: string | undefined, direction: number | undefined, isCityDefense: boolean): void {

        let startJitterLat = (Math.random() - 0.5) * 0.002;
        let startJitterLng = (Math.random() - 0.5) * 0.002;

        // [USER REQUEST] Height Object
        // Unit anchor is at FEET. Arrows should spawn from CHEST.
        // For City (isCityDefense), start is City Center, usually elevated or just center. 
        // Let's add height if it's a Unit firing.
        if (!isCityDefense) {
            let BODY_HEIGHT_OFFSET = 0.035;
            if (direction === 1 || direction === 7) {
                BODY_HEIGHT_OFFSET += 0.02;
            }
            startJitterLat += BODY_HEIGHT_OFFSET;
        } else {
            // City Volley - Spawn from "high up" on walls? 
            // City anchor is center. ~0.05 is good wall height approximation.
            startJitterLat += 0.05;
        }

        const baseStart = L.latLng(from.lat + startJitterLat, from.lng + startJitterLng);
        const baseEnd = L.latLng(to.lat, to.lng);

        // Count Logic
        let count = 5;
        if (isCityDefense) {
            count = 9; // [USER REQUEST] 9 arrows for City
        } else {
            const isHuihuiMixed = type === 'huihui_mixed' || (type === 'mixed' && factionId === 'huihui');
            const isMixed = type.includes('mixed');
            count = (isMixed && !isHuihuiMixed) ? 3 : 5;
        }

        // Calculate Perpendicular Vector for Spread
        const dx = baseEnd.lng - baseStart.lng;
        const dy = baseEnd.lat - baseStart.lat;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Spread Factor
        const spreadFactor = 0.025;
        // Perpendicular (dLng, -dLat) mapped to (px, py)
        // px (Lat offset) using dLng (dx)
        // py (Lng offset) using -dLat (-dy)
        // Wait, previous working logic was:
        // px = (dx/len); py = -(dy/len);

        const pxFinal = (dx / len) * spreadFactor;
        const pyFinal = -(dy / len) * spreadFactor;

        for (let k = 0; k < count; k++) {
            // Calculate Offset (Centered)
            const offset = k - (count - 1) / 2;

            const sLat = baseStart.lat + pxFinal * offset;
            const sLng = baseStart.lng + pyFinal * offset;
            // Keep target parallel
            const eLat = baseEnd.lat + pxFinal * offset;
            const eLng = baseEnd.lng + pyFinal * offset;

            const s = L.latLng(sLat, sLng);
            const e = L.latLng(eLat, eLng);

            // [USER REQUEST] "Ripple Fire" logic
            let staggerDelay: number;

            if (isCityDefense) {
                // [USER REQUEST] City: "Simultaneous Volley" (一排齐射)
                // Use a tiny random jitter (0-20ms) just to prevent rendering artifacts, but effectively simultaneous.
                staggerDelay = Math.random() * 20;
            } else {
                // [USER REQUEST] Army: "Random/Ripple Fire"
                // 80ms base + random jitter
                staggerDelay = k * 80 + Math.random() * 30;
            }

            setTimeout(() => {
                this.projectileSystem.spawn(s, e, 400 + Math.random() * 50);
            }, staggerDelay);
        }
    }

    private renderUnit(unit: IAnimatedUnit, ctx: CanvasRenderingContext2D): void {
        // ... (Checks for Bandit remain same)
        const banditTypes = ['bandit', 'raider', 'outlaw', 'barbarian', 'rebel', 'mercenary', 'cult', 'righteous', 'warlord'];
        const isBandit = banditTypes.includes(unit.type || '') || (unit as any).factionId === 'bandit';

        const unitPos = unit.getPosition();
        // Base center point
        let centerPoint = this.map.latLngToContainerPoint([unitPos.lat, unitPos.lng]);

        // Cull off-screen units
        if (centerPoint.x < -100 || centerPoint.x > this.canvas.width + 100 ||
            centerPoint.y < -100 || centerPoint.y > this.canvas.height + 100) {
            return;
        }

        const currentZoom = this.map.getZoom();
        const effectiveZoom = Math.min(currentZoom, 9);
        const scale = Math.pow(2, effectiveZoom - 9) * 0.9; // Reduced by 10%
        const troops = unit.getTroops();

        // Determine Direction First (needed for offset)
        // Initialize random direction if undefined (for natural Bandit look)
        if (unit.lastDirection === undefined) {
            unit.lastDirection = Math.floor(Math.random() * 8);
        }
        let directionIndex = unit.lastDirection;
        if (unit.isAttacking && unit.targetPos) {
            const dLat = Math.abs(unitPos.lat - unit.targetPos.lat);
            const dLng = Math.abs(unitPos.lng - unit.targetPos.lng);
            if (dLat > 0.00001 || dLng > 0.00001) {
                directionIndex = OrientationSystem.get8DirectionIndex(unitPos, unit.targetPos);
                unit.lastDirection = directionIndex;

            }
        } else if (unit.isMoving) {
            const moveDir = OrientationSystem.get8DirectionIndex(unit.lastPosition, unitPos);
            if (unit.lastPosition.lat !== unitPos.lat || unit.lastPosition.lng !== unitPos.lng) {
                directionIndex = moveDir;
                unit.lastDirection = directionIndex;
            }
        }

        if (isBandit) {
            // [NEW] Snap NPC position to Hex center
            const hex = GridSystem.latLngToAxial(unitPos.lat, unitPos.lng);
            const snapped = GridSystem.axialToLatLng(hex.q, hex.r);
            centerPoint = this.map.latLngToContainerPoint([snapped.lat, snapped.lng]);

            let state: BanditState = 'IDLE';

            if (unit.isAttacking) state = 'ATTACK';
            else if (unit.isMoving) state = 'MOVE';

            BanditDrawer.draw(
                ctx,
                { x: centerPoint.x, y: centerPoint.y },
                state,
                directionIndex,
                scale,
                troops,
                Date.now(),
                unit.type || 'bandit' // Pass type for formation
            );

        } else {
            // ... (Phalanx Rendering logic)
            let state: PhalanxAnimState = 'IDLE';
            if (unit.isAttacking) state = 'ATTACK';
            else if (unit.isMoving) state = 'MOVE';
            // [SHOWCASE DEBUG] Force MOVE state when not attacking to test loop
            else if (unit.id?.startsWith('showcase_')) state = 'MOVE';

            // [FIX] Calculate Flag Offset based on General Position
            const genOffset = LegionPhalanxDrawer.getGeneralOffset(
                unit.legionType || 'infantry',
                directionIndex,
                scale
            );
            const flagCenter = { x: centerPoint.x + genOffset.x, y: centerPoint.y + genOffset.y };

            // 1. Draw Flag Pole (Behind Soldiers)
            LegionFlagDrawer.drawPole(
                ctx,
                flagCenter,
                scale,
                unit.factionId || 'huaxia'
            );

            // [AI SYSTEM] Use Dedicated Legion Drawer
            // Determine Asset ID based on Type & Faction
            // Try specific asset set first: e.g. 'zhonghua_cavalry'
            const rawType = unit.legionType || 'infantry';
            const faction = unit.factionId || 'huaxia';

            // [FIX] Extract base type from faction-prefixed types (huaxia_mixed -> mixed)
            // Added support for yuenan, huihui, etc.
            const baseType = rawType.replace(/^(huaxia|zhonghua|yuenan|huihui|chaoxian)_/, '');

            // [ASSET MAPPING POLICY - REFACTORED]
            // Use the rawType (from unit.legionType which comes from factions.ts) directly as assetsId.
            // This respects the factions.ts configuration as the source of truth.
            // Fallback logic in LegionPhalanxDrawer will handle missing assets.
            let assetsId = rawType;

            LegionPhalanxDrawer.draw(
                unit.id || 'unknown',
                ctx,
                { x: centerPoint.x, y: centerPoint.y },
                state,
                directionIndex,
                scale,
                troops,
                Date.now(),
                false, // hasGeneral (old legacy flag, keep false, we use isPlayer now for general sprite)
                unit.currentBattleType !== null, // isFighting
                this.projectPointBound, // [OPTIMIZATION] Use bound method
                this.unprojectPointBound, // [OPTIMIZATION] Use bound method
                unit.legionType || 'infantry', // [UNIT SYSTEM] 兵种类型
                unit.factionId || 'zhonghua', // [NEW] Faction ID for tinting
                assetsId, // [NEW] Pass specific asset ID
                unit.isPlayer || false // [NEW] isPlayer flag
            );

            // 3. Draw Flag Body (On Top of Soldiers)
            // [NEW] Get current year for conditional flag logic
            const currentYear = (window as any).game?.timeSystem?.getYear() ?? -999;

            LegionFlagDrawer.drawFlag(
                ctx,
                flagCenter,
                directionIndex,
                scale,
                Date.now(),
                unit.factionId || 'huaxia',
                currentYear // [NEW] Pass year
            );
        }

        // Update last position for next frame
        unit.lastPosition = { lat: unitPos.lat, lng: unitPos.lng };

        // Draw Unit Name/Info (Optional)
        const endText = PerformanceMonitor.getInstance().start('Render.Text');
        this.renderInfo(ctx, centerPoint, unit, scale);
        endText();
    }

    // [OPTIMIZATION] Bound methods for projection to avoid creating functions every frame
    private projectPointBound = (lat: number, lng: number): { x: number, y: number } => {
        const point = this.map.latLngToContainerPoint([lat, lng]);
        return { x: point.x, y: point.y };
    };

    private unprojectPointBound = (x: number, y: number): { lat: number, lng: number } => {
        const latlng = this.map.containerPointToLatLng([x, y]);
        return { lat: latlng.lat, lng: latlng.lng };
    };

    // [OPTIMIZATION] Reused StringBuilder for renderInfo
    private renderInfo(ctx: CanvasRenderingContext2D, center: L.Point, unit: IAnimatedUnit, scale: number) {
        if (!this.showLabels) return;
        if (!unit.name) return;

        // [MATCH CITY STYLE] Position label BELOW the unit
        const y = center.y + 40 * scale;
        const fontSize = Math.max(10, 12 * scale);
        const troopsFontSize = Math.max(9, 11 * scale);

        // Name (white with black outline)
        const nameText = unit.name;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Draw black outline
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(nameText, center.x - 3, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(nameText, center.x - 3, y);

        // Troops (gold with black outline)
        // [OPTIMIZATION] Simple string buffer or template literal efficiently
        ctx.font = `bold ${troopsFontSize}px Arial`;
        ctx.textAlign = 'left';

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        const troopCount = Math.floor(unit.getTroops());
        const troopsText = ` ${troopCount}`; // Simple alloc, simpler than complex concat

        ctx.strokeText(troopsText, center.x + 3, y);
        ctx.fillStyle = '#ffd700'; // Gold like city
        ctx.fillText(troopsText, center.x + 3, y);
    }

    public destroy(): void {
        this.stop();
        this.canvas.remove();
        this.canvasLow.remove();
    }
}
