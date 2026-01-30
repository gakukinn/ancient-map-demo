import { TimeSystem } from './TimeSystem';
import { Player } from './Player';
import { FactionManager } from './FactionManager';
import { LegionManager } from './LegionManager';
import { CityManager } from './CityManager';

import { FactionStatusPanel } from '../ui/FactionStatusPanel';
import { CinematicManager } from './CinematicManager';
import { ChronicleUI } from './ChronicleUI';
import { SpeedOverlayRenderer, BrushSize, ToolType } from '../map/SpeedOverlayRenderer';
import { TerrainSpeedSystem, TERRAIN_SPEED_CONFIG } from './TerrainSpeedSystem';
import { GridSystem } from '../systems/GridSystem';
import { GameConfig, GAME_CONSTANTS } from '../config/GameConfig';

export interface UIElements {
    rank: HTMLElement | null;
    troops: HTMLElement | null;
    merit: HTMLElement | null;
    faction: HTMLElement | null;
    resignBtn: HTMLElement | null;
    date: HTMLElement | null;
    coords: HTMLElement | null;
    hexCoords: HTMLElement | null;
    terrainType: HTMLElement | null;
    speedValue: HTMLElement | null;
    pauseBtn: HTMLElement | null;
    speed1xBtn: HTMLElement | null;
    speed2xBtn: HTMLElement | null;
    speed5xBtn: HTMLElement | null;
    speed10xBtn: HTMLElement | null;
    toggleInvincibleBtn: HTMLElement | null;
    hud: HTMLElement | null;
    playerInfo: HTMLElement | null;
    editorPanel: HTMLElement | null;

    toggleHistoryBtn: HTMLElement | null;
    toggleNPCBtn: HTMLElement | null; // [NEW]

    // Editor Elements
    toggleEditModeBtn: HTMLElement | null;
    editorControls: HTMLElement | null;
    toolPaintNormal: HTMLElement | null;
    toolPaintSlow: HTMLElement | null;
    toolPaintWater: HTMLElement | null;
    toolPaintOcean: HTMLElement | null; // Added Ocean
    toolEraser: HTMLElement | null;
    brushSmall: HTMLElement | null;
    brushMedium: HTMLElement | null;
    brushLarge: HTMLElement | null;
    saveDataBtn: HTMLElement | null;
    bakeWorldBtn: HTMLElement | null;
    undoBtn: HTMLElement | null;
    redoBtn: HTMLElement | null;

    // Import/Export
    exportTerrainBtn: HTMLElement | null;
    importTerrainBtn: HTMLElement | null;
    importTerrainFile: HTMLInputElement | null;
}

export class GameUIManager {
    private uiElements: UIElements = {} as UIElements;

    private timeSystem: TimeSystem;
    private player: Player;
    private factionManager: FactionManager;
    private cityManager: CityManager;
    private legionManager: LegionManager;
    private factionStatusPanel?: FactionStatusPanel;

    private cinematicManager: CinematicManager;
    private speedOverlay: SpeedOverlayRenderer;
    public chronicleUI: ChronicleUI; // Public for easy access (temporary)

    constructor(
        timeSystem: TimeSystem,
        player: Player,
        factionManager: FactionManager,
        cityManager: CityManager,
        legionManager: LegionManager,
        cinematicManager: CinematicManager,
        speedOverlay: SpeedOverlayRenderer
    ) {
        this.timeSystem = timeSystem;
        this.player = player;
        this.factionManager = factionManager;
        this.cityManager = cityManager;
        this.legionManager = legionManager;

        // [MAP-ONLY] Skip Faction Panel if logic systems are disabled
        if (!GameConfig.SYSTEM.MAP_ONLY_MODE) {
            // Initialize Faction Status Panel
            this.factionStatusPanel = new FactionStatusPanel(
                this.factionManager,
                this.legionManager,
                this.cityManager,
                (legionId) => {
                    const army = this.legionManager.getLegionById(legionId);
                    if (army) {
                        // [CAMERA FOLLOW] User Click -> Start Persistent Following
                        console.log(`🎯 [UI] Clicked Legion ${legionId}. Starting Follow Mode.`);
                        this.cinematicManager.startFollowing(army);
                    }
                }
            );
        }

        this.cinematicManager = cinematicManager;

        // [NEW] Sync CinematicManager follow state to UI
        this.cinematicManager.setOnFollowChange((armyId) => {
            console.log(`🎥 [UI] Syncing follow state: ${armyId}`);
            if (this.factionStatusPanel) {
                this.factionStatusPanel.setFollowId(armyId);
            }
        });

        this.speedOverlay = speedOverlay;
        this.chronicleUI = new ChronicleUI();

        // [NEW] Initialize Chronicle UI with TimeSystem (preloads all events)
        this.chronicleUI.initialize(this.timeSystem);
        this.chronicleUI.initialize(this.timeSystem);
        // [MAP-ONLY] Default History OFF
        if (GameConfig.SYSTEM.MAP_ONLY_MODE) {
            this.chronicleUI.hide();
        } else {
            this.chronicleUI.show(); // [MODIFIED] Show by default as requested in normal mode
        }

        this.initializeUIElements();
        this.bindEvents();
        this.update(); // [NEW] Sync UI with logic state immediately (e.g. initial date)
    }

    private initializeUIElements() {
        this.uiElements = {
            rank: document.getElementById('player-rank'),
            troops: document.getElementById('player-troops'),
            merit: document.getElementById('player-merit'),
            faction: document.getElementById('player-faction'),
            resignBtn: document.getElementById('resign-btn'),
            date: document.getElementById('game-date'),
            coords: document.getElementById('coords'),
            hexCoords: document.getElementById('hex-coords'),
            terrainType: document.getElementById('terrain-type'),
            speedValue: document.querySelector('#player-speed .value') as HTMLElement,
            pauseBtn: document.getElementById('pause-btn'),
            speed1xBtn: document.getElementById('speed-1x'),
            speed2xBtn: document.getElementById('speed-2x'),
            speed5xBtn: document.getElementById('speed-5x'),
            speed10xBtn: document.getElementById('speed-10x'),
            toggleInvincibleBtn: document.getElementById('toggle-invincible'),
            hud: document.getElementById('hud'),
            playerInfo: document.querySelector('.player-info') as HTMLElement,
            editorPanel: document.querySelector('.editor-panel') as HTMLElement,

            toggleHistoryBtn: document.getElementById('toggle-history-btn'),
            toggleNPCBtn: document.getElementById('toggle-npc-btn'),

            // Editor
            toggleEditModeBtn: document.getElementById('toggle-edit-mode'),
            editorControls: document.getElementById('editor-controls'),
            toolPaintNormal: document.getElementById('tool-paint-normal'),
            toolPaintSlow: document.getElementById('tool-paint-slow'),
            toolPaintWater: document.getElementById('tool-paint-water'),
            toolPaintOcean: document.getElementById('tool-paint-ocean'),
            toolEraser: document.getElementById('tool-eraser'),
            brushSmall: document.getElementById('brush-small'),
            brushMedium: document.getElementById('brush-medium'),
            brushLarge: document.getElementById('brush-large'),
            saveDataBtn: document.getElementById('save-data'),
            bakeWorldBtn: document.getElementById('bake-world'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),

            exportTerrainBtn: document.getElementById('export-terrain'),
            importTerrainBtn: document.getElementById('import-terrain'),
            importTerrainFile: document.getElementById('import-terrain-file') as HTMLInputElement
        };

        // [MAP-ONLY] Hide System Controls if active
        if (GameConfig.SYSTEM.MAP_ONLY_MODE) {
            const hide = (el: HTMLElement | null) => { if (el) el.style.display = 'none'; };

            // 1. Hide Time System (AND PARENT PANEL)
            const dateEl = this.uiElements.date;
            if (dateEl && dateEl.parentElement && dateEl.parentElement.parentElement) {
                hide(dateEl.parentElement.parentElement);
            }

            hide(this.uiElements.date);
            hide(this.uiElements.pauseBtn);
            hide(this.uiElements.speed1xBtn);
            hide(this.uiElements.speed2xBtn);
            hide(this.uiElements.speed5xBtn);
            hide(this.uiElements.speed10xBtn);
            if (this.uiElements.speedValue?.parentElement) hide(this.uiElements.speedValue.parentElement); // Try to hide container

            // 2. Hide Function Toggles
            hide(this.uiElements.toggleHistoryBtn);
            hide(this.uiElements.toggleNPCBtn);
            hide(this.uiElements.toggleInvincibleBtn);
            hide(this.uiElements.toggleEditModeBtn);

            // 3. Hide Player Info (Rank/Troops - since it's just one person)
            // hide(this.uiElements.rank?.parentElement);
            // Leaving "Resign" and basic info for now as they might be useful, or should I hide them too?
            // User asked for "Time System" and "Project Switch", I'll stick to that first.
        }
    }

    private bindEvents() {
        // Pause & Speed
        if (this.uiElements.pauseBtn) {
            this.uiElements.pauseBtn.onclick = () => {
                this.timeSystem.togglePause();
                this.update(); // Immediate update
            };
        }

        const setupSpeedBtn = (btn: HTMLElement | null, speed: number) => {
            if (btn) btn.onclick = () => {
                this.timeSystem.setSpeed(speed);
                this.update();
            };
        };
        setupSpeedBtn(this.uiElements.speed1xBtn, 1);
        setupSpeedBtn(this.uiElements.speed2xBtn, 2);
        setupSpeedBtn(this.uiElements.speed5xBtn, 5);
        setupSpeedBtn(this.uiElements.speed10xBtn, 10);

        // Player Actions
        if (this.uiElements.resignBtn) {
            this.uiElements.resignBtn.onclick = () => {
                if (confirm('确定要下野吗？所有的功绩和职位将保留，但不再属于任何势力。')) {
                    this.player.resign();
                    this.update();
                }
            };
        }

        if (this.uiElements.toggleInvincibleBtn) {
            this.uiElements.toggleInvincibleBtn.onclick = () => {
                this.player.toggleInvincible();
                this.update();
            };
        }

        // Toggles


        // [RESTORED] Toggle History Button
        if (this.uiElements.toggleHistoryBtn) {
            this.uiElements.toggleHistoryBtn.onclick = () => {
                // Toggle visibility
                const isVisible = (this.chronicleUI as any).container.style.opacity === '1';
                if (isVisible) {
                    this.chronicleUI.hide();
                    this.updateHistoryBtnState(false);
                } else {
                    this.chronicleUI.show();
                    this.updateHistoryBtnState(true);
                }
            };
            // Initial State default ON
            this.updateHistoryBtnState(true);
        }

        if (this.uiElements.toggleNPCBtn) {
            this.uiElements.toggleNPCBtn.onclick = () => {
                // We need to access npcManager. Since it's not direct child of UI Manager in constructor,
                // we access via global window.game or better, pass it in constructor.
                // However, inputManager has it. Let's use the global for now or refactor.
                // Given the constraints and current architecture:
                const npcManager = (window as any).npcManager;
                if (npcManager) {
                    const isVisible = npcManager.toggleManualVisibility();
                    this.updateNPCBtnState(isVisible);
                }
            };
            // Initial State default OFF
            this.updateNPCBtnState(false);
        }

        // Editor Events
        this.bindEditorEvents();

        // [NEW] Auto-Chronicle Listener
        window.addEventListener('chronicle-log', (e: any) => {
            const data = e.detail;
            if (data && this.chronicleUI) {
                // Enrich with current time
                const event = {
                    year: this.timeSystem.getYear(),
                    season: this.timeSystem.getSeason(),
                    type: data.type || 'narrative',
                    description: data.description || '未知事件',
                    effect: {}
                };
                this.chronicleUI.addEvent(event);
            }
        });
    }

    private bindEditorEvents() {
        const els = this.uiElements;

        const updateToolUI = () => {
            const currentTool = this.speedOverlay.getToolType();
            const currentSize = this.speedOverlay.getBrushSize();

            [els.toolPaintNormal, els.toolPaintSlow, els.toolPaintWater, els.toolPaintOcean, els.toolEraser].forEach(el => el?.classList.remove('active'));
            if (currentTool === 'paint-normal') els.toolPaintNormal?.classList.add('active');
            if (currentTool === 'paint-slow') els.toolPaintSlow?.classList.add('active');
            if (currentTool === 'paint-water') els.toolPaintWater?.classList.add('active');
            if (currentTool === 'paint-ocean') els.toolPaintOcean?.classList.add('active');
            if (currentTool === 'eraser') els.toolEraser?.classList.add('active');

            [els.brushSmall, els.brushMedium, els.brushLarge].forEach(el => el?.classList.remove('active'));
            if (currentSize === 1) els.brushSmall?.classList.add('active');
            if (currentSize === 7) els.brushMedium?.classList.add('active');
            if (currentSize === 19) els.brushLarge?.classList.add('active');
        };

        if (els.toggleEditModeBtn) {
            els.toggleEditModeBtn.onclick = () => {
                const isEditing = this.speedOverlay.toggleEditMode();
                els.toggleEditModeBtn!.textContent = isEditing ? '退出编辑模式' : '进入编辑模式';
                els.toggleEditModeBtn!.classList.toggle('active', isEditing);

                if (els.editorControls) {
                    els.editorControls.style.display = isEditing ? 'block' : 'none';
                }

                if (isEditing) updateToolUI();
            };
        }

        const bindTool = (btn: HTMLElement | null, tool: any) => {
            if (btn) btn.onclick = () => {
                this.speedOverlay.setToolType(tool);
                updateToolUI();
            };
        };
        bindTool(els.toolPaintNormal, 'paint-normal');
        bindTool(els.toolPaintSlow, 'paint-slow');
        bindTool(els.toolPaintWater, 'paint-water');
        bindTool(els.toolPaintOcean, 'paint-ocean');
        bindTool(els.toolEraser, 'eraser');

        const bindSize = (btn: HTMLElement | null, size: BrushSize) => {
            if (btn) btn.onclick = () => {
                this.speedOverlay.setBrushSize(size);
                updateToolUI();
            };
        };
        bindSize(els.brushSmall, 1);
        bindSize(els.brushMedium, 7);
        bindSize(els.brushLarge, 19);

        if (els.saveDataBtn) els.saveDataBtn.onclick = () => this.speedOverlay.save();
        if (els.bakeWorldBtn) els.bakeWorldBtn.onclick = () => this.speedOverlay.bakeWorld();
        if (els.undoBtn) els.undoBtn.onclick = () => this.speedOverlay.undo();
        if (els.redoBtn) els.redoBtn.onclick = () => this.speedOverlay.redo();

        if (els.exportTerrainBtn) els.exportTerrainBtn.onclick = () => this.speedOverlay.exportData();
        if (els.importTerrainBtn && els.importTerrainFile) {
            els.importTerrainBtn.onclick = () => els.importTerrainFile!.click();
            els.importTerrainFile.onchange = () => {
                const file = els.importTerrainFile!.files?.[0];
                if (file) {
                    this.speedOverlay.importData(file);
                    els.importTerrainFile!.value = '';
                }
            };
        }
    }

    private updateHistoryBtnState(isEnabled: boolean) {
        if (this.uiElements.toggleHistoryBtn) {
            this.uiElements.toggleHistoryBtn.textContent = isEnabled ? '📜 历史: ON' : '📜 历史: OFF';
            this.uiElements.toggleHistoryBtn.style.color = isEnabled ? '#fff' : '#aaa';
        }
    }

    private updateNPCBtnState(isVisible: boolean) {
        if (this.uiElements.toggleNPCBtn) {
            this.uiElements.toggleNPCBtn.textContent = isVisible ? '🤖 NPC: ON' : '🤖 NPC: OFF';
            this.uiElements.toggleNPCBtn.style.color = isVisible ? '#fff' : '#aaa';
        }
    }

    public update() {
        if (this.factionStatusPanel) this.factionStatusPanel.update();
        // 1. Time & Speed
        const date = this.timeSystem.getFormattedDate();
        if (this.uiElements.date) this.uiElements.date.innerText = date;

        const isPaused = this.timeSystem.isGamePaused(); // FIXED: Use public method
        if (this.uiElements.pauseBtn) {
            this.uiElements.pauseBtn.innerText = isPaused ? '▶️ 继续' : '⏸️ 暂停';
            this.uiElements.pauseBtn.classList.toggle('active', isPaused);
        }

        const speed = this.timeSystem.getSpeed();
        if (this.uiElements.speedValue) {
            this.uiElements.speedValue.innerText = `${speed}x`;
        }

        // Update active speed button
        [this.uiElements.speed1xBtn, this.uiElements.speed2xBtn, this.uiElements.speed5xBtn, this.uiElements.speed10xBtn].forEach(btn => btn?.classList.remove('active'));
        if (speed === 1) this.uiElements.speed1xBtn?.classList.add('active');
        if (speed === 2) this.uiElements.speed2xBtn?.classList.add('active');
        if (speed === 5) this.uiElements.speed5xBtn?.classList.add('active');
        if (speed === 10) this.uiElements.speed10xBtn?.classList.add('active');

        // 2. Player Info
        if (this.uiElements.troops) this.uiElements.troops.innerText = Math.floor(this.player.getTroops()).toString();
        if (this.uiElements.rank) this.uiElements.rank.innerText = this.player.getRank().name; // FIXED: getRank() returns object, access .name
        if (this.uiElements.merit) this.uiElements.merit.innerText = Math.floor(this.player.merit).toString();

        const factionId = this.player.getFaction(); // FIXED: getFaction() instead of getFactionId()
        const faction = factionId ? this.factionManager.getFaction(factionId) : null;
        if (this.uiElements.faction) {
            this.uiElements.faction.innerText = faction ? faction.name : '在野';
            this.uiElements.faction.style.color = faction ? faction.color : '#aaa';
        }

        // Toggle Buttons State
        if (this.uiElements.toggleInvincibleBtn) {
            const isInvincible = this.player.isInvincible;
            this.uiElements.toggleInvincibleBtn.textContent = isInvincible ? '🛡️ 无敌: ON' : '🛡️ 无敌: OFF';
            this.uiElements.toggleInvincibleBtn.style.color = isInvincible ? '#FFD700' : '#fff';
            this.uiElements.toggleInvincibleBtn.classList.toggle('active', isInvincible);
        }
    }

    // Called on mouse move from map event directly or via InputManager
    public updateCursorInfo(lat: number, lng: number) {
        // Update Coords
        if (this.uiElements.coords) {
            this.uiElements.coords.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        // Update hex & terrain
        const hex = GridSystem.latLngToAxial(lat, lng);
        if (this.uiElements.hexCoords) {
            this.uiElements.hexCoords.textContent = `${hex.q}, ${hex.r}`;
        }

        if (this.uiElements.terrainType) {
            const speedType = TerrainSpeedSystem.getHexSpeed({ lat, lng }, hex);
            const config = TERRAIN_SPEED_CONFIG[speedType];
            this.uiElements.terrainType.textContent = config.name;
            this.uiElements.terrainType.style.color = config.color;
        }
    }
}
