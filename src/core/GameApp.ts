import L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { CityManager } from './CityManager';
import { CityAssetManager } from './CityAssetManager';
import { GridManager } from './GridManager';
import { FactionManager } from './FactionManager';
import { Player } from './Player';
import { LegionRenderer } from '../map/LegionRenderer';
import { initializeGlobalUnitRenderer, getGlobalUnitRenderer } from '../map/UnitRenderer';
import { GlobalUnitRenderer } from '../map/GlobalUnitRenderer';
import { SpeedOverlayRenderer } from '../map/SpeedOverlayRenderer';
import { MapColorSampler } from '../map/MapColorSampler';
import { ContactEngine } from './ContactEngine';
import { TerrainSpeedSystem, TERRAIN_SPEED_CONFIG } from './TerrainSpeedSystem';
import { SpatialRegistry } from './SpatialRegistry';
import { ColorDebugger } from '../map/ColorDebugger';
import { TerrainOverrideManager } from './TerrainOverrideManager';
import { TimeSystem, Season } from './TimeSystem';

import { GridSystem } from '../systems/GridSystem';

import { NPCManager } from './NPCManager';
import { CombatSystem } from './CombatSystem';
import { LegionManager } from './LegionManager';
import { SiegeManager } from './SiegeManager';
import { CityEditor } from './CityEditor';
import { RoadEditor } from './RoadEditor';
import { UnifiedEditorManager } from './UnifiedEditorManager';
import { RoadRenderer } from '../map/RoadRenderer';
import { FACTIONS } from '../data/factions';
import { CITIES } from '../data/cities';
import { GAME_CONSTANTS, GameConfig } from '../config/GameConfig';
import { AIController, RecruitmentSystem } from '../ai';
import { roadRegistry } from './RoadRegistry';
import { CinematicManager } from './CinematicManager';


// [NEW] Visual Renderers
import { GameUIManager } from './GameUIManager';
import { GameInputManager } from './GameInputManager';
import { MarchingLineRenderer } from '../map/MarchingLineRenderer';
import { TerrainEditor } from './TerrainEditor'; // [NEW]
import { MaskEditorAdapter } from './MaskEditorAdapter'; // [NEW]
import { PerformanceMonitor } from '../debug/PerformanceMonitor'; // [DEBUG]

declare global {
    interface Window {
        game: GameApp;
        // ...
    }
}


export class GameApp {
    private map!: GameMap;
    private factionManager!: FactionManager;
    private cityManager!: CityManager;
    private gridManager!: GridManager;
    private player!: Player;
    private legionRenderer!: LegionRenderer;

    private combatSystem!: CombatSystem;
    private legionManagerInstance!: LegionManager;
    private siegeManager!: SiegeManager;

    private cityEditor!: CityEditor;
    private roadEditor!: RoadEditor;
    private unifiedEditorManager!: UnifiedEditorManager;
    private terrainEditor!: TerrainEditor; // [NEW]
    private roadRenderer!: RoadRenderer;
    private timeSystem!: TimeSystem;
    private npcManager!: NPCManager;
    private speedOverlay!: SpeedOverlayRenderer;
    private colorDebugger!: ColorDebugger;
    private colorSampler!: MapColorSampler;
    private overrideManager!: TerrainOverrideManager;

    // [AI System]
    private aiController!: AIController;
    private recruitmentSystem!: RecruitmentSystem;

    private contactEngine!: ContactEngine;
    private cinematicManager!: CinematicManager;

    // [REFACTORED]
    private uiManager!: GameUIManager;
    private inputManager!: GameInputManager;
    private marchingLineRenderer!: MarchingLineRenderer; // [NEW]

    // Game Loop
    private lastFrameTime: number = 0;
    private animationFrameId: number | null = null;
    private uiUpdateAccumulator: number = 0; // [OPTIMIZATION] Throttle UI updates

    // [DIRECTOR MODE] Events waiting for user to click Continue


    constructor() {
        // UI Initialization moved to GameUIManager
        // Expose game instance globally
        window.game = this;
    }

    public getMarchingLineRenderer(): MarchingLineRenderer {
        return this.marchingLineRenderer;
    }

    /**
     * [SANDBOX API] Expose LegionManager for Cinematic Manager
     */
    public get legionManager() {
        return this.legionManagerInstance;
    }



    public async start() {
        try {
            console.log('Game starting...');

            // [OPTIMIZATION-STARTUP] 1. Start Heavy Async Tasks IMMEDIATELY (Network/IO)
            // Preload and process city flags AND unit assets in parallel with map init
            // [FIX] Preload ALL factions, not just those with cities (to support new factions)
            const allFactionIds = FACTIONS.map(f => f.id);
            const flagsPromise = CityAssetManager.preloadFlags(allFactionIds);

            // [OPTIMIZATION] Skip Unit Assets in Map-Only Mode (Save ~10MB+ RAM & Bandwidth)
            let unitAssetsPromise = Promise.resolve();
            if (!GameConfig.SYSTEM.MAP_ONLY_MODE) {
                unitAssetsPromise = GlobalUnitRenderer.preloadAssets();
            }

            // [OPTIMIZATION-STARTUP] 2. Initialize Main Map (DOM/WebGL)
            this.map = new GameMap('map');

            // 3. Initialize Core Managers (Lightweight JS)
            this.factionManager = new FactionManager();
            this.gridManager = new GridManager(this.map);
            FACTIONS.forEach(f => this.factionManager.addFaction(f));

            // Listeners
            this.setupMapVisualListeners();

            // Initialize global unit renderer for NPCs and armies
            // [MAP-ONLY] Skip renderer init to save memory
            if (!GameConfig.SYSTEM.MAP_ONLY_MODE) {
                initializeGlobalUnitRenderer(this.map);
            }

            // Player Setup
            this.player = new Player();
            this.player.joinFaction('huaxia');
            this.legionRenderer = new LegionRenderer(this.map, this.player);

            // Managers & Systems

            this.combatSystem = new CombatSystem();
            this.contactEngine = new ContactEngine(SpatialRegistry.getInstance(), this.combatSystem);
            this.timeSystem = new TimeSystem();

            // Terrain & Renderers (Independent)
            this.colorSampler = new MapColorSampler(this.map);
            this.overrideManager = new TerrainOverrideManager();
            TerrainSpeedSystem.initialize(this.colorSampler, this.overrideManager, CITIES);

            // [OPTIMIZATION-STARTUP] 4. Await Flags just before they are visually needed (City Rendering)
            // This fills the "network wait time" with the CPU initialization above.
            await flagsPromise;

            // [MAP-ONLY MODE] Conditional Logic
            const isMapOnly = GameConfig.SYSTEM.MAP_ONLY_MODE;

            // Roads Init (Moved up to ensure territory system sees them)
            console.log('🚧 正在生成道路网络...');
            roadRegistry.initialize(CITIES);
            this.roadRenderer = new RoadRenderer(this.map);

            // 5. Initialize City dependent systems
            this.cityManager = new CityManager(this.map, this.factionManager);
            this.loadCityData();

            // [FIX] Enable City Troop Recovery on Season Change
            // User requested explicit execution without extra logic
            this.timeSystem.onSeasonChange((season) => {
                // [OPTIMIZATION] Only recover troops in Winter (Historical: Off-farming season / 农闲征兵)
                if (season === Season.冬) {
                    this.cityManager.updateTroops();
                    console.log(`❄️ [CityManager] Winter (农闲) arrived: Updating troops for all cities.`);
                }
            });

            this.cityEditor = new CityEditor(this.map.getLeafletMap(), this.cityManager, (data) => {
                this.handleCityEditorSave(data);
            });

            // [MAP-ONLY MODE] Skip NPC Manager
            if (!isMapOnly) {
                this.npcManager = new NPCManager(this.map, this.cityManager, this.player);
            }

            // Cinematic Manager (Moved up for dependency injection)
            this.cinematicManager = new CinematicManager();
            this.cinematicManager.initialize(this.map.getLeafletMap());

            // [FIX] Unlock camera when game is paused
            this.timeSystem.onPauseChange((paused) => {
                if (paused) {
                    console.log('⏸️ [GameApp] Pause detected - Unlocking camera');
                    this.cinematicManager.stopFollowing();
                }
            });

            // [MAP-ONLY MODE] Skip Gameplay Systems (Legion, Siege, Contact)
            if (!isMapOnly) {
                // [SANDBOX MODE] Initialize LegionManager and SiegeManager directly (No HistoricalEventManager)
                this.legionManagerInstance = new LegionManager(this.cityManager, this.map, this.factionManager);
                this.legionManagerInstance.initContactEngine(this.combatSystem);
                this.legionManagerInstance.setCinematicManager(this.cinematicManager);
                this.cinematicManager.setLegionManager(this.legionManagerInstance); // [NEW] Auto-Director Dependency

                // [NEW] EventVisualizer stub (required by SiegeManager)
                const eventVisualizer = { showCityCapture: () => { }, playVictoryEffect: () => { } };
                this.siegeManager = new SiegeManager(this.cityManager, this.legionManagerInstance, this.combatSystem, this.player, this.map, eventVisualizer as any);
                this.legionManagerInstance.setSiegeManager(this.siegeManager);

                this.contactEngine.setSiegeManager(this.siegeManager);
            }


            // Roads Editor
            this.roadEditor = new RoadEditor(this.cityManager, this.roadRenderer);

            // [NEW] Terrain Editor
            this.terrainEditor = new TerrainEditor(this.map);

            // Initialize SpeedOverlay (Moved up for Editor Adapter)
            this.speedOverlay = new SpeedOverlayRenderer(this.map, this.overrideManager, this.colorSampler);
            this.colorDebugger = new ColorDebugger(this.map, this.colorSampler);

            // [UNIFIED EDITOR SYSTEM] Register all editors
            this.unifiedEditorManager = new UnifiedEditorManager();
            this.unifiedEditorManager.register(this.cityEditor);
            this.unifiedEditorManager.register(this.roadEditor);
            this.unifiedEditorManager.register(this.terrainEditor);
            this.unifiedEditorManager.register(new MaskEditorAdapter(this.speedOverlay));

            // [UI HACK] Hide old toggle button
            const oldBtn = document.getElementById('toggle-edit-mode');
            if (oldBtn) oldBtn.style.display = 'none';

            // [OPTIMIZATION] Defer heavy road rendering to prevent startup stutter
            setTimeout(() => {
                if (GameConfig.SYSTEM.MAP_ONLY_MODE) {
                    this.roadRenderer.toggle(false); // [MAP-ONLY] Default Closed
                } else {
                    this.roadRenderer.render();
                }
            }, 100);

            // AI Initialization
            // [MAP-ONLY MODE] Skip AI
            if (!isMapOnly) {
                this.aiController = new AIController(this.legionManagerInstance, this.cityManager, roadRegistry);
                this.recruitmentSystem = new RecruitmentSystem(this.cityManager, this.legionManagerInstance, roadRegistry);

                // [SANDBOX MODE] AI Enabled by default
                console.log('🌍 [GameApp] Sandbox Mode Active: Enabling AI.');
                this.aiController.setEnabled(true);

                console.log(`🤖 AI 系统状态: ${this.aiController['enabled'] ? '已激活' : '已休眠'}`);

                this.npcManager.spawnNPCs(GAME_CONSTANTS.TOTAL_NPC_COUNT);

                // Fix Spatial Registry
                this.legionManagerInstance.refreshCityRegistry();
            }

            // Cinematic Manager initialized earlier

            // [REFACTORED] Initialize UI and Input Managers
            this.uiManager = new GameUIManager(
                this.timeSystem,
                this.player,
                this.factionManager,
                this.cityManager,
                this.legionManagerInstance,
                this.cinematicManager,
                this.speedOverlay
            );

            this.inputManager = new GameInputManager(
                this.map,
                this.player,
                this.speedOverlay,
                this.roadEditor,
                this.cityEditor,
                this.cityManager,
                this.npcManager,
                this.uiManager,
                this.legionRenderer
            );

            // Expose Globals
            this.exposeGlobals();

            // Initial state is paused
            this.timeSystem.setPaused(true);

            // Start UI Loop (Delegated to UI Manager)
            // [OPTIMIZATION] Removed setInterval to prevent event loop stutter.
            // UI updates are now handled in gameLoop with throttling.
            // setInterval(() => this.uiManager.update(), GAME_CONSTANTS.UI_UPDATE_INTERVAL);

            // Start Game Loop
            this.lastFrameTime = performance.now();
            this.gameLoop(this.lastFrameTime);

            // [PERFORMANCE] Init Monitor
            PerformanceMonitor.getInstance();

            // [DUPLICATE CODE REMOVED]


            // Bind Player Callbacks
            this.bindPlayerCallbacks();

            this.setupZoomListeners();

            // [FIX] Force Enable Dragging explicitly
            if (this.map.getLeafletMap().dragging) {
                this.map.getLeafletMap().dragging.enable();
                console.log('✅ Forced map dragging enable');
            }


            // [NEW] Marching Line Effect (Initialized but hidden until event)
            this.marchingLineRenderer = new MarchingLineRenderer(this.map, this.cityManager);



            console.log('✅ 游戏初始化完成 (重构版)');
        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            this.showErrorOverlay(error instanceof Error ? error.message : '未知错误');
        }
    }

    private setupMapVisualListeners() {
        window.addEventListener('toggle-faction-color', (e: any) => {
            if (this.cityManager) this.cityManager.toggleTerritoryLayer(e.detail.visible);
        });

        window.addEventListener('toggle-road-layer', (e: any) => {
            if (this.roadRenderer) this.roadRenderer.toggle(e.detail.visible);
        });

        window.addEventListener('toggle-terrain-layer', (e: any) => {
            if (this.speedOverlay) this.speedOverlay.setVisible(e.detail.visible);
        });

        window.addEventListener('toggle-showcase-units', (e: any) => {
            const renderer = getGlobalUnitRenderer();
            if (renderer) renderer.toggleShowcase(e.detail.visible);
        });

        window.addEventListener('bake-world-terrain', () => {
            if (this.speedOverlay) {
                this.speedOverlay.bakeWorld();
            }
        });
    }

    private loadCityData() {
        const cityData = CITIES.map(c => ({
            id: c.id,
            name: c.name,
            factionId: c.factionId,
            latitude: c.lat,
            longitude: c.lng,
            type: c.type,
            troops: c.troops !== undefined ? c.troops : GameConfig.SIEGE.DEFAULT_CITY_TROOPS,
            image: c.image,
            mirror: c.mirror || false,
            region: c.region // [NEW] Preserve explicit region override
        }));

        this.cityManager.addCities(cityData);

        // [FIX] Initialize CityManager's year immediately to ensure startYear filtering works
        // Without this, currentYear defaults to 0, causing cities with negative startYear (e.g. -218) to display incorrectly
        this.cityManager.updateYear(this.timeSystem.getYear());

        // [NEW] Initialize Faction Capitals
        this.initializeCapitals();
    }

    private initializeCapitals() {
        const cities = this.cityManager.getCities();
        const factionCities = new Map<string, any[]>();

        // Group cities by faction
        cities.forEach(city => {
            if (!factionCities.has(city.factionId)) {
                factionCities.set(city.factionId, []);
            }
            factionCities.get(city.factionId)?.push(city);
        });

        // Assign capital for each faction
        factionCities.forEach((cityList, factionId) => {
            // Strategy: Priority High -> Low
            // 1. Imperial City (Imperial / Hanhuang Imperial)
            // 2. Huge City (Any type containing 'huge')
            // 3. Large City (Any type containing 'large')
            // 4. First city found

            let capital = cityList.find(c => c.type === 'huge_city');

            if (!capital) {
                capital = cityList.find(c => c.type.includes('huge_city'));
            }

            if (!capital) {
                capital = cityList.find(c => c.type.includes('large_city'));
            }

            if (!capital && cityList.length > 0) {
                capital = cityList[0];
            }

            if (capital) {
                this.factionManager.setCapital(factionId, capital.id);
                console.log(`👑 [FactionManager] Set capital for ${factionId} to ${capital.name} (${capital.id})`);
            }
        });
    }

    private handleCityEditorSave(data: any) {
        // Remove existing temp cities to prevent ghosting during preview
        if (data.id.startsWith('temp_')) {
            const cities = this.cityManager.getCities();
            cities.forEach(c => {
                if (c.id.startsWith('temp_')) {
                    this.cityManager.removeCity(c.id);
                }
            });
        }
        this.cityManager.addCity(data);
    }

    private bindPlayerCallbacks() {
        this.player.onCombatStateChangeCallback = (isFighting: boolean, battleType?: 'siege' | 'field') => {
            if (isFighting) {
                this.legionRenderer.triggerAttack(battleType);
            } else {
                this.legionRenderer.stopAttack();
            }
        };
        // Battle end callback can be handled in InputManager or kept here if it affects global state
        this.player.onBattleEndCallback = (result, opponent) => {
            this.inputManager.handleBattleEnd(result, opponent);
        };

        this.player.onFactionChangeCallback = () => {
            console.log('🔄 Player faction changed, reloading sprites...');
            this.legionRenderer.reloadSprites();
        };
    }

    private setupZoomListeners() {
        this.map.getLeafletMap().on('zoomend', () => {
            const zoom = this.map.getLeafletMap().getZoom();
            const isStrategicView = zoom <= 7;
            const hideNPCs = zoom <= 8;

            // [FIX] Widen road visibility for verification (User couldn't see roads at high/low zoom)
            // Previously: zoom > 7 && zoom < 10
            // [FIX] Widen road visibility for verification (User couldn't see roads at high/low zoom)
            // Previously: zoom > 7 && zoom < 10
            const showRoads = zoom >= 5 && zoom < 10;

            // [MAP-ONLY] Do not auto-toggle roads (Default Closed)
            if (!GameConfig.SYSTEM.MAP_ONLY_MODE) {
                this.roadRenderer.toggle(showRoads);
            }
            this.npcManager.setZoomVisible(!hideNPCs);
            this.legionRenderer.setVisible(!isStrategicView); // [NEW] Hide player in strategic view

        });
    }

    private showErrorOverlay(message: string): void {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 99999; color: #fff;
        `;
        overlay.innerHTML = `
            <h1 style="color: #ff5722; margin-bottom: 20px;">❌ 游戏加载失败</h1>
            <p style="color: #aaa; max-width: 600px; text-align: center;">${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 30px; cursor: pointer;">重试</button>
        `;
        document.body.appendChild(overlay);
    }

    private gameLoop(timestamp: number) {
        // [PERF] 1. Calculate Frame Start & Latency
        // timestamp is "VSync Target Time" (when the frame *should* have started)
        // realStart is "Wall Clock Time" (when JS *actually* started executing)
        const realStart = performance.now();
        const systemLatency = realStart - timestamp; // Positive means we are LATE starting (Browser/Render blocked)

        const deltaTime = (realStart - this.lastFrameTime) / 1000; // Time since last REAL frame start
        this.lastFrameTime = realStart;

        // [PERF] Start Logic Frame
        const monitor = PerformanceMonitor.getInstance();
        monitor.beginFrame();

        // Track System Overhead
        monitor.trackValue('Sys Latency', Math.round(systemLatency)); // Time spent waiting for Main Thread

        // Track DOM Count (Heavy Styling Cost)
        monitor.trackValue('DOM Nodes', document.getElementsByTagName('*').length);

        const endLogic = monitor.start('Logic Update');

        try {
            const isPaused = this.timeSystem.isGamePaused();
            const isScriptPlaying = this.cinematicManager.isPlaying();

            // 1. Calendar Time Update
            const endTime = monitor.start('Logic.Time');
            if (!isPaused) {
                this.timeSystem.update(deltaTime);
                this.cityManager.updateYear(this.timeSystem.getYear());
            }
            endTime();

            // 2. Simulation Update (Always Run Physics/Logic)
            // [FIX] Decouple Physics from Calendar: "It's a map, not a paused game."
            // If paused, run at 1.0x (Realtime) so player/units can move.
            // If running, run at configured simulation speed.
            const timeScale = isPaused ? 1.0 : this.timeSystem.getSpeed();
            const simDeltaTime = deltaTime * timeScale;

            const endPlayer = monitor.start('Logic.Player');
            this.player.update(simDeltaTime);
            endPlayer();

            if (this.legionManagerInstance) {
                const endLegion = monitor.start('Logic.Legion');
                this.legionManagerInstance.update(simDeltaTime);
                endLegion();
            }

            const endCombat = monitor.start('Logic.Combat');
            this.combatSystem.update(simDeltaTime);
            endCombat();

            if (this.aiController) {
                const endAI = monitor.start('Logic.AI');
                this.aiController.update();
                endAI();
            }
            if (this.recruitmentSystem) {
                const endRecruit = monitor.start('Logic.Recruit');
                this.recruitmentSystem.update(simDeltaTime);
                endRecruit();
            }

            // Cinematic Camera Update
            const endCine = monitor.start('Logic.Cinematic');
            this.cinematicManager.update(deltaTime);
            endCine();

            this.uiUpdateAccumulator += deltaTime;
            const uiTick = this.uiUpdateAccumulator >= 0.1;

            // UI Update
            const endUI = monitor.start('Logic.UI');
            if (uiTick) {
                this.uiManager.update();
                this.uiUpdateAccumulator = 0;
            }
            endUI();

        } catch (error) {
            console.error('❌ Game Loop Error:', error);
        }

        endLogic();

        // [OPTIMIZATION] Synchronous Render Loop
        const renderer = getGlobalUnitRenderer();
        if (renderer) {
            const endRender = monitor.start('Render.Unit'); // Track manual render time
            renderer.manualRender(realStart);
            endRender();
        }

        // [PERF] End Frame - Calculate Pure JS CPU Time
        const realEnd = performance.now();
        const cpuTime = realEnd - realStart;

        // [DEBUG] Spike Logger
        // Use a threshold of 33ms (30FPS) to detect noticeable stutters
        const totalFrameTime = cpuTime + systemLatency;
        if (totalFrameTime > 33.0 && realEnd > 5000) { // Skip first 5s warmup
            // console.warn(`⚠️ [Lag Spike] Total: ${totalFrameTime.toFixed(1)}ms | JS: ${cpuTime.toFixed(1)}ms | Sys: ${systemLatency.toFixed(1)}ms`);
        }

        // Report Metrics
        // Note: Frame Total is now split into "System Overhead" (Latency) and "JS CPU"
        monitor.trackValue('JS CPU', cpuTime);
        if (systemLatency > 16.0) {
            // If latency is high, push it as a metric bar too so it shows up red
            // We use a custom key since 'Frame Total' is hardcoded
        }

        // We still pass "Total wall time since timestamp" to endFrame for consistency
        // But internal graph usually tracks what we pass here.
        // Let's pass the CPU Time, and log the System Overhead separately.
        monitor.endFrame(cpuTime); // Plot ONLY the JS Execution Time

        // Push System Overhead as a separate metric line
        // We need to do this manually or via start/end? 
        // Monitor only graphs things logged via .start/end or endFrame.
        // Let's cheat and add it to metrics directly? No, Monitor API is strict.
        // We'll trust the 'Sys Latency' value track to show us the number.

        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    private exposeGlobals() {
        const win = window as any;
        win.game = this;
        win.gameMap = this.map;
        win.player = this.player;
        win.speedOverlay = this.speedOverlay;
        win.timeSystem = this.timeSystem;
        win.npcManager = this.npcManager;
        win.combatSystem = this.combatSystem;
    }



}
