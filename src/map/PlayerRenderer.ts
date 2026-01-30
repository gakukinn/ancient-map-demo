import L from 'leaflet';

import { Player } from '../core/Player';
import { GameMap } from './GameMap';

export class PlayerRenderer {
    private map: any;
    private player: Player;
    private marker: any;
    private pathLine: any | null = null;

    constructor(gameMap: GameMap, player: Player) {
        this.map = gameMap.getLeafletMap();
        this.player = player;

        // 创建玩家标记
        this.createMarker();

        // 监听地图点击事件
        this.map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            this.player.moveTo(lat, lng);
            this.drawPath(lat, lng);
        });

        console.log('🎨 PlayerRenderer 已初始化');
    }

    private createMarker(): void {
        // [GOD VIEW] If visible is false, do not create marker
        // Note: We need to import GameConfig, but it might cycle. 
        // For now, let's just make it hidden via CSS class or opacity 0 if we can't import easily,
        // OR better: check a static flag if available.
        // Actually, importing GameConfig here is usually fine.
        // Let's assume GameConfig is available in imports, or check if we can skip.

        // Simpler: Just make it invisible via CSS transparent icon if we can't delete it
        // But better to not add to map.
        // Let's modify constructor to take a 'visible' flag or just read config.

        // Let's import GameConfig at top
        const pos = this.player.getPosition();

        // 创建玩家 Sprite 标记
        const spriteIcon = L.divIcon({
            className: 'player-marker-container god-view-hidden', // Add hidden class
            html: '<div class="player-sprite"></div>',
            iconSize: [32, 48], // 2:3 ratio
            iconAnchor: [16, 48] // Anchor at the very bottom center (feet)
        });

        this.marker = L.marker([pos.latitude, pos.longitude], {
            icon: spriteIcon,
            zIndexOffset: 1000,
            opacity: 0 // Force clear invisibility
        }).addTo(this.map);

        console.log(`⭐ 玩家标记已创建（God View: Hidden）于 [${pos.latitude}, ${pos.longitude}]`);
    }

    private drawPath(targetLat: number, targetLng: number): void {
        // 移除旧路径
        if (this.pathLine) {
            this.map.removeLayer(this.pathLine);
        }

        const pos = this.player.getPosition();

        // 绘制虚线路径
        this.pathLine = L.polyline(
            [[pos.latitude, pos.longitude], [targetLat, targetLng]],
            {
                color: '#FFD700',
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 10',
                className: 'player-path-line'
            }
        ).addTo(this.map);
    }

    // 设置战斗状态（改变标记颜色）
    public setCombatState(isFighting: boolean): void {
        if (!this.marker) return;

        const element = this.marker.getElement();
        if (element) {
            const sprite = element.querySelector('.player-sprite');
            if (sprite) {
                if (isFighting) {
                    sprite.classList.add('combat-state');
                } else {
                    sprite.classList.remove('combat-state');
                }
            }
        }
    }

    // 更新玩家标记位置
    public update(): void {
        const pos = this.player.getPosition();

        // Temporarily disabled flipping to stop "rotation" issues as requested
        /*
        const oldLatLng = this.marker.getLatLng();
        const dx = pos.longitude - oldLatLng.lng;
        
        if (Math.abs(dx) > 0.0001) {
             const element = this.marker.getElement();
             if (element) {
                 const sprite = element.querySelector('.player-sprite') as HTMLElement;
                 if (sprite) {
                     if (dx < 0) {
                         sprite.style.transform = 'scaleX(-1)';
                     } else {
                         sprite.style.transform = 'scaleX(1)';
                     }
                 }
             }
        }
        */

        this.marker.setLatLng([pos.latitude, pos.longitude]);

        // 如果到达目标，移除路径
        if (!this.player.getIsMoving() && this.pathLine) {
            this.map.removeLayer(this.pathLine);
            this.pathLine = null;
        }
    }

    // 清理资源
    public destroy(): void {
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        if (this.pathLine) {
            this.map.removeLayer(this.pathLine);
        }
    }
}
