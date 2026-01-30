import L from 'leaflet';
import { GameMap } from '../map/GameMap';
import { HistoricalEvent } from '../types/core';
import { MAP_LAYER_ZINDEX, MAP_PANES } from '../config/MapLayers';
import { IBattleUnit } from './CombatSystem';

export class EventVisualizer {
    private map: GameMap;
    private fieldBattleEffects: Map<string, L.Marker> = new Map();

    constructor(map: GameMap) {
        this.map = map;
    }

    public updateEventUI(event: HistoricalEvent): void {
        // Event display is now handled by CinematicDialogueUI and script system
    }

    public showFieldBattleEffect(lat: number, lng: number, effectId: string): void {
        const currentZoom = this.map.getLeafletMap().getZoom();
        const baseZoom = 9;
        const scale = Math.pow(2, currentZoom - baseZoom) * 3.0; // [MODIFIED] Enlarge effect (1.2 -> 3.0)

        // [MODIFIED] 使用 GIF 特效代替纯 CSS 粒子
        // [MODIFIED] CSS Fallback for missing battle_effect.gif
        const effectHtml = `
            <div class="field-battle-effect" style="
                transform: scale(${scale}); 
                transform-origin: center center;
                width: 40px; height: 40px;
                background: rgba(255, 0, 0, 0.4);
                border: 2px solid rgba(255, 0, 0, 0.8);
                border-radius: 50%;
                box-shadow: 0 0 15px red;
                animation: pulse 1s infinite;
            "></div>
        `;

        const icon = L.divIcon({
            className: 'field-battle-effect-icon',
            html: effectHtml,
            iconSize: [120, 120],
            iconAnchor: [60, 60]
        });

        // Ensure effects pane exists
        const paneName = MAP_PANES.EFFECTS;
        if (!this.map.getLeafletMap().getPane(paneName)) {
            this.map.getLeafletMap().createPane(paneName);
            const pane = this.map.getLeafletMap().getPane(paneName);
            if (pane) {
                pane.style.zIndex = MAP_LAYER_ZINDEX.BATTLE_EFFECT.toString();
                pane.style.pointerEvents = 'none'; // Click-through
            }
        }

        const marker = L.marker([lat, lng], {
            icon,
            pane: paneName
        });
        marker.addTo(this.map.getLeafletMap());
        this.fieldBattleEffects.set(effectId, marker);
    }

    public hideFieldBattleEffect(effectId: string): void {
        const marker = this.fieldBattleEffects.get(effectId);
        if (marker) {
            marker.remove();
            this.fieldBattleEffects.delete(effectId);
        }
    }
}
