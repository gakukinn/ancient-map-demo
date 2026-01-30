import L from 'leaflet';
import { GameMap } from './GameMap';
import { Player } from '../core/Player';
import { OrientationSystem } from '../core/OrientationSystem';
import { PlayerPhalanxDrawer } from './player/PlayerPhalanxDrawer'; // [PLAYER SYSTEM]
import { GeneralDrawer } from './GeneralDrawer'; // [NEW]
import { GameConfig } from '../config/GameConfig'; // [NEW]
import { FlagDrawer } from './FlagDrawer';
import { EffectDrawer } from './EffectDrawer';

/**
 * LegionRenderer - Renders the player's army using Phalanx Drawer
 */
export class LegionRenderer {
    private map: L.Map;
    private player: Player;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    // State
    private isAttacking: boolean = false;
    private currentBattleType: 'siege' | 'field' | null = null;
    private visible: boolean = true; // [NEW] Visibility control

    // Movement Tracking
    private lastPosition: { lat: number, lng: number };
    private wasFighting: boolean = false;
    private lastTime: number = 0;
    private lastDirectionIndex: number = 0;

    private playerPane: HTMLElement | null = null;
    private currentZIndex: string = '700';
    private lastRenderBounds: { x: number, y: number, w: number, h: number } | null = null;

    constructor(gameMap: GameMap, player: Player) {
        this.map = gameMap.getLeafletMap();
        this.player = player;
        this.lastPosition = { ...player.getPosition() };
        this.wasFighting = false;

        // Create UI layer
        this.createCanvasOverlay();

        // [DEBUG] Manual Cleanup Trigger
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'c') {
                console.log('[Debug] Force resetting player unit');
                PlayerPhalanxDrawer.resetUnit('player');
            }
        });

        // Load shared assets
        // Load shared assets
        Promise.all([
            PlayerPhalanxDrawer.preload(),
            FlagDrawer.preload(),
            GeneralDrawer.preload() // [NEW] Ensure single unit sprite is ready
        ]).then(() => {
            console.log('🛡️ LegionRenderer: Assets Ready');
            this.render();
        });

        // Bind events
        this.map.on('move', this.updateCanvasPosition.bind(this));
        this.map.on('zoom', this.updateCanvasPosition.bind(this));
        this.map.on('resize', this.resizeCanvas.bind(this));

        // Initial setup
        this.resizeCanvas();
        this.updateCanvasPosition();
        this.animate();
    }

    private createCanvasOverlay() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.pointerEvents = 'none';
        this.canvas.className = 'leaflet-zoom-animated player-canvas-layer';
        this.ctx = this.canvas.getContext('2d')!;

        const PLAYER_PANE_NAME = 'playerPane';
        if (!this.map.getPane(PLAYER_PANE_NAME)) {
            this.map.createPane(PLAYER_PANE_NAME);
            const pane = this.map.getPane(PLAYER_PANE_NAME);
            if (pane) {
                pane.style.zIndex = '700';
                pane.style.pointerEvents = 'none';
            }
        }
        this.playerPane = this.map.getPane(PLAYER_PANE_NAME) || null;
        const parentPane = this.playerPane || this.map.getPanes().tooltipPane;
        parentPane.appendChild(this.canvas);
    }

    public reloadSprites(): void {
        PlayerPhalanxDrawer.preload();
    }

    private resizeCanvas(): void {
        const size = this.map.getSize();
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        this.updateCanvasPosition();
    }

    private updateCanvasPosition(): void {
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);
        // [FIX] 移除此处的 render()，彻底解决 panTo 导致的闪烁
    }

    private updateZIndex(): void {
        if (!this.playerPane) return;
        const targetZ = '700';
        if (this.currentZIndex !== targetZ) {
            this.playerPane.style.zIndex = targetZ;
            this.currentZIndex = targetZ;
        }
    }

    private render(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.visible) return; // [NEW] Skip rendering if hidden

        const playerPos = this.player.getPosition();
        const centerPoint = this.map.latLngToContainerPoint([playerPos.latitude, playerPos.longitude]);

        const currentZoom = this.map.getZoom();
        const effectiveZoom = Math.min(currentZoom, 9); // [FIX] Cap scale at Zoom 9 (Zoom 10 uses Zoom 9 scale)
        const scale = Math.pow(2, effectiveZoom - 9);

        // Cull
        if (centerPoint.x < -100 || centerPoint.x > this.canvas.width + 100 ||
            centerPoint.y < -100 || centerPoint.y > this.canvas.height + 100) {
            return;
        }

        // 1. Determine State & Direction
        const isMoving = this.player.getIsMoving();
        const isFighting = this.player.isFighting;

        if (this.wasFighting && !isFighting) {
            PlayerPhalanxDrawer.resetUnit('player_legion'); // [FIX] Match draw ID
        }
        this.wasFighting = isFighting;

        let directionIndex = this.lastDirectionIndex;

        if (isFighting && this.player.battleTarget) {
            directionIndex = OrientationSystem.get8DirectionIndex(
                { lat: playerPos.latitude, lng: playerPos.longitude },
                this.player.battleTarget
            );
            this.lastDirectionIndex = directionIndex;
        } else if (isMoving) {
            directionIndex = OrientationSystem.get8DirectionIndex(
                { lat: this.lastPosition.lat, lng: this.lastPosition.lng },
                { lat: playerPos.latitude, lng: playerPos.longitude }
            );

            // Check target if position hasn't changed this frame (sub-pixel movement)
            if (this.lastPosition.lat === playerPos.latitude && this.lastPosition.lng === playerPos.longitude && this.player.getTargetPosition()) {
                const target = this.player.getTargetPosition()!;
                directionIndex = OrientationSystem.get8DirectionIndex(
                    { lat: playerPos.latitude, lng: playerPos.longitude },
                    { lat: target.latitude, lng: target.longitude }
                );
            }
            this.lastDirectionIndex = directionIndex;
        }

        // const currentZoom = this.map.getZoom(); // Defined above
        // const scale = Math.pow(2, currentZoom - 9); // Defined above
        const troops = this.player.getTroops();
        const now = Date.now();

        // [NEW] Combat VFX
        if (isFighting && this.player.battleTarget) {
            const targetPos = this.player.battleTarget;
            // Calculate Midpoint in Container Space
            // Player Center
            // centerPoint is already Player Center

            // Target Center
            const targetPoint = this.map.latLngToContainerPoint([targetPos.lat, targetPos.lng]);

            // Midpoint
            const midX = (centerPoint.x + targetPoint.x) / 2;
            const midY = (centerPoint.y + targetPoint.y) / 2;

            // Draw Effects slightly above center (mid-air)
            EffectDrawer.drawCombatEffects(
                this.ctx,
                { x: midX, y: midY - 20 * scale }, // Lift up a bit
                scale,
                now
            );
        }

        // State Priority: DEATH > DAMAGE > ATTACK > MOVE > IDLE
        let state: 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGE' | 'DEATH' = 'IDLE';

        if (troops <= 0) {
            state = 'DEATH';
            // } else if (now - this.player.lastDamageTime < 500) { // User requested to remove Damage state
            //     state = 'DAMAGE';
        } else if (isFighting) {
            state = 'ATTACK';
        } else if (isMoving) {
            state = 'MOVE';
        }

        if (GameConfig.SYSTEM.MAP_ONLY_MODE) {
            // [MAP-ONLY] Draw Simple "One Person" (General) Sprite
            // No Flags, No Phalanx.

            // Re-use logic: 0-7 Direction
            const now = Date.now();

            GeneralDrawer.draw(
                this.ctx,
                { x: centerPoint.x, y: centerPoint.y },
                state,
                directionIndex,
                scale * 1.5, // Make him slightly larger since he is alone
                now
            );
            return; // Skip Flag/Phalanx
        }

        // 1. Draw Flag Pole (Behind Soldiers)
        FlagDrawer.drawPole(
            this.ctx,
            { x: centerPoint.x, y: centerPoint.y },
            scale
        );

        // 2. Draw Phalanx (Soldiers)
        // [PLAYER SYSTEM] Use Dedicated PlayerDrawer
        PlayerPhalanxDrawer.draw(
            'player_legion',
            this.ctx,
            { x: centerPoint.x, y: centerPoint.y },
            state,
            directionIndex,
            scale,
            troops,
            now,
            true, // hasGeneral
            isFighting,
            (lat: number, lng: number) => {
                const point = this.map.latLngToContainerPoint([lat, lng]);
                return { x: point.x, y: point.y };
            },
            (x: number, y: number) => {
                const latlng = this.map.containerPointToLatLng([x, y]);
                return { lat: latlng.lat, lng: latlng.lng };
            }
        );

        // 3. Draw Flag Body (On Top of Soldiers)
        FlagDrawer.drawFlag(
            this.ctx,
            { x: centerPoint.x, y: centerPoint.y },
            directionIndex,
            scale,
            Date.now()
        );

        // Draw Info (Name/Troops) - DISABLED
        // this.renderInfo(this.ctx, { x: centerPoint.x, y: centerPoint.y }, scale);
    }

    private renderInfo(ctx: CanvasRenderingContext2D, center: { x: number, y: number }, scale: number) {
        ctx.font = `bold ${Math.max(10, 12 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const troops = Math.floor(this.player.getTroops());
        const text = `我军 (${troops})`; // Default name "My Army" if no name property

        const y = center.y - 40 * scale;

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(text, center.x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, center.x, y);
    }

    private animate(time: number = 0): void {
        // Sync player combat state
        if (this.player.isFighting !== this.isAttacking) {
            // Battle just ended - immediately clear unit state
            if (this.isAttacking && !this.player.isFighting) {
                PlayerPhalanxDrawer.resetUnit('player_legion'); // [FIX] Match draw ID
            }
            this.isAttacking = this.player.isFighting;
            // Force render on state change
            this.render();
        }

        // [OPTIMIZATION]
        // Only render if:
        // 1. Visible
        // 2. Moving OR Fighting OR Position Changed significantly
        if (!this.visible) {
            // Just loop, don't draw
            requestAnimationFrame(this.animate.bind(this));
            return;
        }

        const playerPos = this.player.getPosition();
        const isMoving = this.player.getIsMoving();
        const isFighting = this.player.isFighting;

        // Simple dirty check: if not moving, not fighting, and position is same as last frame (screen space)
        // actually lastPosition is lat/lng.
        // We can just rely on isMoving/isFighting flags for efficiency.

        if (isMoving || isFighting) {
            this.render();
        } else {
            // If we just stopped, we might need one last render? 
            // The state change logic (isMoving -> false) isn't explicit here, 
            // but updateCanvasPosition handles map drag.
            // If map drags, render() is called? 
            // Actually our previous code REMOVED render() from pan event to stop flicker. 
            // So we MUST render if map moves.
            // But we don't have easy access to "map is moving" state inside this loop without checking map center?
            // Since we can't easily detect map pan here without polling map.getCenter(), 
            // let's stick to simple state check + continuous render for now, just optimized.

            // ACTUALLY: Leaflet 'move' event triggers updateCanvasPosition.
            // We can set a dirty flag there.

            // For now, let's keep continuous render but it's lightweight if draw calls are efficient.
            // The PhalanxDrawer uses caching.
            this.render();
        }

        this.lastPosition = { lat: playerPos.latitude, lng: playerPos.longitude };
        this.lastTime = time;
        requestAnimationFrame(this.animate.bind(this));
    }

    public triggerAttack(battleType: 'siege' | 'field' = 'field'): void {
        // Handled by player state in animate/render loop
    }

    public stopAttack(): void {
        // Handled by player state
    }

    public destroy(): void {
        this.canvas.remove();
    }

    public setVisible(visible: boolean): void {
        if (this.visible === visible) return;
        this.visible = visible;
        if (!visible) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.render();
        }
    }
}
