import { GameMap } from '../map/GameMap';
import { Player } from './Player';
import { SpeedOverlayRenderer } from '../map/SpeedOverlayRenderer';
import { RoadEditor } from './RoadEditor';
import { CityEditor } from './CityEditor';
import { CityManager } from './CityManager';
import { NPCManager } from './NPCManager'; // Assuming this exists or needed
import { GameUIManager } from './GameUIManager';
import { GridSystem } from '../systems/GridSystem';
import * as L from 'leaflet';
import { LegionRenderer } from '../map/LegionRenderer';

export class GameInputManager {
    private map: GameMap;
    private player: Player;
    private speedOverlay: SpeedOverlayRenderer;
    private roadEditor: RoadEditor;
    private cityEditor: CityEditor;
    private cityManager: CityManager;
    private npcManager?: NPCManager;
    private uiManager: GameUIManager;
    private legionRenderer: LegionRenderer;

    private lastMouseMoveTime: number = 0;

    constructor(
        map: GameMap,
        player: Player,
        speedOverlay: SpeedOverlayRenderer,
        roadEditor: RoadEditor,
        cityEditor: CityEditor,
        cityManager: CityManager,
        npcManager: NPCManager | undefined,
        uiManager: GameUIManager,
        legionRenderer: LegionRenderer
    ) {
        this.map = map;
        this.player = player;
        this.speedOverlay = speedOverlay;
        this.roadEditor = roadEditor;
        this.cityEditor = cityEditor;
        this.cityManager = cityManager;
        this.npcManager = npcManager;
        this.uiManager = uiManager;
        this.legionRenderer = legionRenderer;

        this.bindEvents();
    }

    private bindEvents() {
        const leafletMap = this.map.getLeafletMap();

        // 1. Map Click
        leafletMap.on('click', (e: L.LeafletMouseEvent) => {
            // Priority: Speed Editor > Road Editor > Player Move

            if (this.speedOverlay.isEditing) return;
            // [FIX] If road editor is in Hex Edit mode, don't move player
            if (this.roadEditor && this.roadEditor.isHexEditing()) return;
            // [FIX] If city editor is picking location, don't move player
            if (this.cityEditor && this.cityEditor.isPickingLocation()) return;

            const { lat, lng } = e.latlng;
            const hex = GridSystem.latLngToAxial(lat, lng);
            const hexKey = `${hex.q},${hex.r}`;

            // [CHANGED] Player can move freely - no road restriction
            // Get hex center as destination
            const hexCenter = GridSystem.axialToLatLng(hex.q, hex.r);

            // Direct move to clicked location
            this.player.moveTo(hexCenter.lat, hexCenter.lng);
            console.log(`🚶 玩家自由移动到 ${hexKey}`);
        });

        // 2. Mouse Move (Throttled UI Update)
        leafletMap.on('mousemove', (e: L.LeafletMouseEvent) => {
            const now = Date.now();
            if (now - this.lastMouseMoveTime < 50) return; // Throttle 50ms
            this.lastMouseMoveTime = now;

            const { lat, lng } = e.latlng;
            this.uiManager.updateCursorInfo(lat, lng);

            // Edit Mode Preview
            if (this.speedOverlay.isEditing) {
                // Determine logic for hover preview if needed, usually handled by SpeedOverlayRenderer internally via its own listener
                // But if SpeedOverlayRenderer relies on manual calls, add here.
                // Assuming SpeedOverlayRenderer has its own listeners as seen in previous code analysis.
            }
        });

        // 2.5 Right-Click: Pick Coordinates for Editors
        leafletMap.on('contextmenu', (e: L.LeafletMouseEvent) => {
            e.originalEvent.preventDefault(); // Prevent browser context menu

            const { lat, lng } = e.latlng;
            const coordStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            (window as any).pickedCoords = { lat, lng };

            // Show Toast notification
            const toast = document.createElement('div');

            // Try to copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(coordStr).catch(err => console.error('Clipboard write failed', err));
                toast.innerText = `📍 已复制坐标: ${coordStr}`;
            } else {
                toast.innerText = `📍 已拾取: ${coordStr} (无法自动复制)`;
            }
            toast.style.cssText = `
                position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                background: rgba(0,188,212,0.95); color: white; padding: 12px 24px;
                border-radius: 8px; z-index: 9999; font-size: 14px; font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);

            console.log('[GameInputManager] Picked coords:', lat.toFixed(4), lng.toFixed(4));
        });

        // 3. City Click
        this.cityManager.setOnCityClick((city: any, e?: any) => {
            // Priority 1: Road Editor
            if (this.roadEditor && this.roadEditor.onCityClick(city.id, city.name, e)) return;

            // Priority 3: City Editor
            if (this.cityEditor && this.cityEditor.isEditMode()) {
                this.cityEditor.selectCityForEdit(city);
                return;
            }

            // this.cityEditor.selectCityForEdit(city);

            // Handle City Click Move (Logic from GameApp)
            // If friendly city -> Move to it?
            // If enemy city -> Attack it?
            // This logic was "handleCityClickMove" in GameApp.
            // For now, let's replicate the basic move logic here or call a delegate.
            // Since "handleCityClickMove" was just moving player, we implementation it here.

            // [MOVED LOGIC]
            const hexCenter = { lat: city.latitude, lng: city.longitude };
            // Simple move to city
            this.player.moveTo(hexCenter.lat, hexCenter.lng);

            // If enemy, maybe set target?
            // Player.moveTo handles movement. Combat triggers on proximity.
        });

        // 4. NPC Click
        if (this.npcManager) {
            this.npcManager.setOnNPCClick((npc) => {
                // Handle NPC Click (Logic from GameApp)
                console.log('Clicked NPC', npc);
                // Implement handleNPCClick logic here

                if (this.player.getFaction() === (npc as any).factionId) {
                    alert(`友军: ${(npc as any).name}\n兵力: ${Math.floor(npc.getTroops())}`);
                } else {
                    // Attack?
                    const choice = confirm(`遭遇敌军 ${(npc as any).name}\n兵力: ${Math.floor(npc.getTroops())}\n是否发起攻击？`);
                    if (choice) {
                        this.player.moveTo(npc.getPosition().lat, npc.getPosition().lng);
                        // Set battle target handled by proximity/combat system or need explicit setting?
                        // GameApp didn't show explicit "setBattleTarget" in click handler usually, just move.
                    }
                }
            });
        }

        // 5. Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore if in input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            // 'H' key is handled by CinematicManager (which is bound in its constructor)
            // 'WASD' is handled by CinematicManager

            if (e.key.toLowerCase() === 'g') {
                // Invincible toggled via UI Manager or Player directly?
                // UI Manager handles the button, but key shortcut should trigger action + UI update.
                this.player.toggleInvincible();
                this.uiManager.update();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                if (this.speedOverlay.isEditing) {
                    this.speedOverlay.undo();
                }
            } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                if (this.speedOverlay.isEditing) {
                    this.speedOverlay.redo();
                }
            }
        });
    }

    public handleBattleEnd(result: string, opponent: any) {
        // Logic moved from GameApp
        console.log(`Battle Ended: ${result}`);
        // Maybe show modal via UI Manager?
        // uiManager.showBattleResult(result);
    }
}
