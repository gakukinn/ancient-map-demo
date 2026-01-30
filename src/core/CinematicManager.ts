import * as L from 'leaflet';
import { getGlobalUnitRenderer } from '../map/UnitRenderer';
import { DirectorScript, DirectorAction, LatLng } from '../types/core'; // Kept LatLng if needed, usually imported from leaflet or types


import { GameConfig } from '../config/GameConfig';

export class CinematicManager {
    private map: L.Map | null = null;
    private isUIVisible: boolean = true;
    private overlayLayer: L.LayerGroup | null = null;

    // UI Elements to hide/show
    private uiSelectors: string[] = [
        '.leaflet-control-container', // Leaflet standard controls
        '#hud',                       // Top and left panels
        '.editor-panel',              // Bottom editor panel
        '#notification-area',         // Notifications
        '#game-ui-root',              // React/GameUIManager root if exists
        '.leaflet-top', '.leaflet-bottom', // Force hide leaflet corners
        '#speed-control',             // Speed control if separate
        // [DIRECTOR MODE] Editor Buttons
        '#road-toggle-btn',           // 筑路
        '#ce-toggle-btn',             // 城市编辑
        '#legion-toggle-btn',         // 军团编辑
        '#road-editor',               // Road editor panel
        '#city-editor',               // City editor panel
        // [FIX] 新增缺失的按钮
        '#toggle-history-btn',        // 开启/关闭历史事件
        '#toggle-npc-btn',            // 显示/隐藏 NPC
        '#toggle-edit-mode',          // 进入编辑模式
        '.editor-toggle-btn',         // 编辑模式切换按钮类
        '.ui-toggle-btn-hud',         // HUD 上的所有 toggle 按钮
        '#unified-editor-toolbar',    // 底部统一编辑器工具栏
        '.leaflet-playerPane-pane',   // 玩家渲染 Pane
        '.leaflet-playerpane-pane',   // 玩家渲染 Pane (全小写防备)
        '.player-canvas-layer',       // [FIX] 玩家 Canvas 层 (最稳妥)
    ];

    // Camera Control State
    private moveSpeed: number = 500; // Pixels per second
    private currentVelocity = { x: 0, y: 0 };
    private keysPressed: { [key: string]: boolean } = {};
    private smoothing: number = 0.1; // 0-1, lower is smoother

    constructor() {
        this.bindInput();
    }

    // [AUTO-DIRECTOR]
    private autoDirectorEnabled: boolean = false;
    private autoDirectorTimer: number = 0; // ms accumulator
    private deathSwitchTimer: number = 0; // [FIX] Timer for death lingering
    private readonly DEATH_SWITCH_DELAY = 4000; // 4s delay before switching from dead unit
    // [FIX] Weighted pattern: 8(1m) -> 9(5m) -> 10(1m) -> 9(5m)
    private autoDirectorZoomStages: number[] = [8, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 9];
    private currentZoomIndex: number = 0;
    private lastScanTime: number = 0;
    private legionManager: any = null; // Injected
    private readonly ZOOM_CYCLE_DURATION = 1 * 60 * 1000; // 1 Minute Base Tick

    public setLegionManager(manager: any) {
        this.legionManager = manager;
    }

    public toggleAutoDirector() {
        this.autoDirectorEnabled = !this.autoDirectorEnabled;
        console.log(`🎬 [Cinematic] Auto-Director: ${this.autoDirectorEnabled ? 'ON' : 'OFF'}`);
        // Visual Feedback
        const hud = document.getElementById('hud');
        if (hud) {
            // Simple toast
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.top = '20%';
            toast.style.left = '50%';
            toast.style.transform = 'translate(-50%, -50%)';
            toast.style.background = 'rgba(0,0,0,0.8)';
            toast.style.color = '#fff';
            toast.style.padding = '20px';
            toast.style.fontSize = '24px';
            toast.style.borderRadius = '10px';
            toast.style.zIndex = '9999';
            toast.innerText = this.autoDirectorEnabled ? '🎬 Auto-Director: ON' : '🛑 Auto-Director: OFF';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }

        if (this.autoDirectorEnabled) {
            this.autoDirectorTimer = 0;
            this.currentZoomIndex = 0;
            this.forceDirectorScan();
        } else {
            this.stopFollowing();
        }
    }

    public initialize(map: L.Map) {
        this.map = map;
        this.overlayLayer = L.layerGroup().addTo(map);
        console.log('🎬 CinematicManager Initialized with Director Mode');

        // [FIX] User Intent Interrupt: Stop following AND Auto-Director if user interacts
        // Removed 'zoomstart' to avoid detecting programmatic zooms as user interaction
        this.map.on('mousedown dragstart', () => {
            // [STRICT MODE] If Auto-Director is ON, IGNORE user interaction completely.
            // User must press F8 to exit.
            if (this.autoDirectorEnabled) {
                return;
            }

            if (this.isFollowing()) {
                this.stopFollowing();
                this.currentVelocity = { x: 0, y: 0 };
            }
        });
    }

    /**
     * Get current map center position.
     */
    public getMapCenter(): { lat: number, lng: number } | null {
        if (!this.map) return null;
        const center = this.map.getCenter();
        return { lat: center.lat, lng: center.lng };
    }

    // ==================== Director Mode Scripting ====================

    private isPlayingSequence: boolean = false;
    private directorUnits: Map<string, any> = new Map(); // [DEPRECATED] kept for type safety if needed, but unused
    // [NEW] Track real units spawned by script for cleanup in preview mode
    private spawnedRealUnits: Set<string> = new Set();

    // [CAMERA FOLLOW] Auto-follow moving armies
    private followingArmy: any = null; // Reference to Army object being followed
    private lastFollowZoom: number = 0; // Track zoom level to detect user zoom during follow
    private lastFollowStartTime: number = 0; // [DEBOUNCE] Track last follow start time
    private static readonly FOLLOW_DEBOUNCE_MS = 500; // [DEBOUNCE] Minimum interval between follow switches

    public isPlaying(): boolean {
        return this.isPlayingSequence;
    }

    public async flyTo(target: { lat: number, lng: number }, duration: number, options: { zoom?: number } = {}): Promise<void> {
        if (!this.map) return;

        const targetZoom = options.zoom ?? 9; // Default strictly to 9 if not specified
        const startPos = this.map.getCenter();
        const startZoom = this.map.getZoom();

        console.log(`🎥 [Cinematic] Flying to [${target.lat.toFixed(2)}, ${target.lng.toFixed(2)}] over ${duration}s (Zoom: ${targetZoom})`);

        return new Promise<void>((resolve) => {
            // Safety timeout: Resolve anyway if moveend never fires (e.g. target is same as current)
            const safetyTimeout = setTimeout(() => {
                console.warn('⚠️ [Cinematic] FlyTo timeout - forcing resolve');
                resolve();
            }, duration * 1000 + 1000); // Duration + 1s buffer

            const onMoveEnd = () => {
                clearTimeout(safetyTimeout);
                // Ensure we are exactly at target zoom
                if (this.map && Math.abs(this.map.getZoom() - targetZoom) > 0.1) {
                    this.map.setZoom(targetZoom);
                }
                resolve();
            };

            if (this.map) {
                // If duration is very short, just jump
                if (duration <= 0.1) {
                    this.map.setView([target.lat, target.lng], targetZoom, { animate: false });
                    onMoveEnd();
                    return;
                }

                // Use flyTo for smooth interpolation including Zoom
                // But since we want STRICT zoom 9, usually flyTo swoops out. 
                // To keep zoom constant 9, we might prefer panTo if startZoom is also 9.
                if (Math.abs(startZoom - targetZoom) < 0.1 && targetZoom === 9) {
                    // Pure Pan
                    this.map.panTo([target.lat, target.lng], {
                        animate: true,
                        duration: duration,
                        easeLinearity: 1.0 // Constant speed
                    });
                } else {
                    // Zoom change needed
                    this.map.flyTo([target.lat, target.lng], targetZoom, {
                        animate: true,
                        duration: duration
                    });
                }

                this.map.once('moveend', onMoveEnd);
            }
        });
    }

    /**
     * Start following an army. Camera will track this army every frame.
     * Auto-stops when army stops moving or a new camera action is triggered.
     * [FIX] Optimized: Short initial animation (0.5s) + immediate frame-by-frame follow.
     * [FIX] Added debounce to prevent rapid target switching.
     */
    /**
     * Start following an army. Camera will track this army every frame.
     * Auto-stops when army stops moving or a new camera action is triggered.
     * [FIX] Optimized: Short initial animation (0.5s) + immediate frame-by-frame follow.
     * [FIX] Added debounce to prevent rapid target switching.
     */
    public startFollowing(army: any): void {
        if (!army) return;

        const now = Date.now();

        // [DEBOUNCE] Skip if already following the same army
        if (this.followingArmy === army) {
            console.log(`🎥 [CinematicManager] Already following ${army.name || army.id}, skipping.`);
            return;
        }

        // [DEBOUNCE] Skip if switching too fast (unless first follow)
        if (this.followingArmy !== null && now - this.lastFollowStartTime < CinematicManager.FOLLOW_DEBOUNCE_MS) {
            console.log(`🎥 [CinematicManager] Debounced follow for ${army.name || army.id} (too soon after last switch)`);
            return;
        }

        // [STATE RESET] Clear previous approach state
        this.isApproaching = false;

        this.followingArmy = army;
        this.lastFollowStartTime = now;

        // Notify listeners (UI)
        this.notifyFollowListeners(army.id);

        console.log(`🎥 [CinematicManager] Started following army: ${army.name || army.id}`);

        if (this.map) {
            const pos = army.getPosition();
            if (pos) {
                // [OPTIMIZATION] DELAY ELIMINATION
                // If target is already within view (or very close), SKIP animation and snap immediately.
                const currentCenter = this.map.getCenter();
                const distance = Math.sqrt(
                    Math.pow(pos.lat - currentCenter.lat, 2) +
                    Math.pow(pos.lng - currentCenter.lng, 2)
                );

                // Threshold: 1.0 degree ~ 111km. If within this range, just snap.
                const SNAP_THRESHOLD = 1.0;

                if (distance < SNAP_THRESHOLD) {
                    console.log(`🎥 [CinematicManager] Target close (${distance.toFixed(2)} < ${SNAP_THRESHOLD}). Snapping immediately.`);
                    this.map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 }); // Short smooth pan
                    this.isApproaching = false; // Start following instantly
                } else {
                    // Long distance: Fly To
                    this.isApproaching = true;

                    const CAMERA_SPEED = 0.5; // degrees per second
                    const dynamicDuration = Math.max(1.0, Math.min(distance / CAMERA_SPEED, 3.0)); // [TWEAK] Reduce max duration to 3s

                    console.log(`🎥 [CinematicManager] Target far. Flying duration: ${dynamicDuration.toFixed(1)}s`);

                    this.map.setView([pos.lat, pos.lng], 9, {
                        animate: true,
                        duration: dynamicDuration,
                        easeLinearity: 0.5
                    });

                    // Start frame-by-frame following after approach
                    setTimeout(() => {
                        if (this.followingArmy === army) {
                            this.isApproaching = false;
                        }
                    }, dynamicDuration * 1000);
                }
            }
        }
    }

    /**
     * Stop following any army.
     * @param targetArmy Optional. If provided, only stop following if this specific army is being followed.
     */
    public stopFollowing(targetArmy?: any): void {
        if (targetArmy && this.followingArmy !== targetArmy) {
            // [FIX] Ignore stop request if we are following a different army
            return;
        }

        if (this.followingArmy) {
            console.log(`🎥 [CinematicManager] Stopped following army ${this.followingArmy.name || ''}.`);
            // Notify listeners (UI) that we stopped
            this.notifyFollowListeners(null);
        }
        this.followingArmy = null;
        this.lastFollowZoom = 0;
    }

    // [NEW] Listener system for UI synchronization
    private followListeners: ((armyId: string | null) => void)[] = [];

    public setOnFollowChange(callback: (armyId: string | null) => void) {
        this.followListeners.push(callback);
    }

    private notifyFollowListeners(armyId: string | null) {
        this.followListeners.forEach(cb => cb(armyId));
    }

    private isApproaching: boolean = false;

    // ... (rest of startFollowing implementation, check replacement below)


    /**
     * Check if currently following an army.
     */
    public isFollowing(): boolean {
        return this.followingArmy !== null;
    }



    public clearDirectorUnits() {
        // Legacy directorUnits (dummy) removed.
        // We now only track spawnedRealUnits.

        // [NEW] Cleanup real units if any were spawned during preview
        if (this.spawnedRealUnits.size > 0) {
            const game = (window as any).game;
            if (game && game.legionManager) {
                this.spawnedRealUnits.forEach(id => {
                    console.log(`🎬 [Director] Cleaning up preview unit: ${id}`);
                    const army = game.legionManager.getLegionById(id);
                    if (army) {
                        game.legionManager.removeArmy(army);
                    }
                });
            }
            this.spawnedRealUnits.clear();
        }
    }

    public async executeScript(script: DirectorScript) {
        this.isPlayingSequence = true;
        try {
            if (script.onStart) {
                console.log('🎬 Executing Review Script (Start)...');
                await this.executeActionSequence(script.onStart);
            }
        } catch (error) {
            console.error('❌ Error executing script:', error);
        } finally {
            this.isPlayingSequence = false;
        }
    }

    public async executeActionSequence(actions: DirectorAction[]) {
        // Group actions by time
        const timedActions = new Map<number, DirectorAction[]>();
        actions.forEach(action => {
            const time = action.time ?? 0;
            if (!timedActions.has(time)) timedActions.set(time, []);
            timedActions.get(time)!.push(action);
        });

        // Sort by time and execute
        const sortedTimes = Array.from(timedActions.keys()).sort((a, b) => a - b);
        let lastTime = 0;

        // Track all action promises to ensure we don't exit script (and unpause game loop) 
        // until visuals/waits are fully complete.
        const pendingPromises: Promise<void>[] = [];

        for (const time of sortedTimes) {
            // Wait until this time
            const waitDuration = (time - lastTime) * 1000;
            if (waitDuration > 0) {
                await new Promise(r => setTimeout(r, waitDuration));
            }
            lastTime = time;

            // Execute all actions at this time (non-blocking for timeline consistency)
            const actionsAtTime = timedActions.get(time)!;
            actionsAtTime.forEach(action => {
                pendingPromises.push(this.executeAction(action));
            });
        }

        // [FIX] Wait for all actions (including WAITs and Animations) to finish
        // This keeps isPlayingSequence = true, ensuring GameApp updates the physics engine
        if (pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }
    }



    private async executeAction(rawAction: DirectorAction): Promise<void> {
        // [FIX] Flatten action.data if it exists, to match code expectations
        const action: any = { ...rawAction };
        if (action.data) {
            Object.assign(action, action.data);
        }

        console.log(`🎬 [Director] Action: ${action.type}, data:`, action);

        // 1. Camera Actions
        if (action.type === 'camera') {
            // [CAMERA FOLLOW] Stop following when a new camera command is issued
            this.stopFollowing();

            if (this.map && action.target) {
                const duration = action.duration || 1;
                // [FIX] STRICT ZOOM 9 POLICY
                const targetZoom = 9;
                const target = Array.isArray(action.target)
                    ? { lat: action.target[0], lng: action.target[1] }
                    : action.target;

                // Use new flyTo method
                await this.flyTo(target, duration, { zoom: targetZoom });
            }
            return;
        }

        // 2. Unit Actions (SPAWN)
        if (action.type === 'SPAWN_UNIT') {
            if (action.unitId && action.position) {
                const pos = Array.isArray(action.position)
                    ? { lat: action.position[0], lng: action.position[1] }
                    : action.position;

                // [REFACTOR] Use LegionManager to create REAL unit
                const game = (window as any).game;
                if (game && game.legionManager) {
                    try {
                        console.log(`🎬 [Director] Processing SPAWN_UNIT for ID: ${action.unitId}`);
                        const existing = game.legionManager.getLegionById(action.unitId);
                        if (!existing) {
                            console.log(`🎬 [Director] Spawning Real Legion: ${action.name} (${action.unitId})`);
                            const legion = game.legionManager.createLegion(
                                { lat: pos.lat, lng: pos.lng },
                                action.troops || 10000,
                                action.faction || 'qin',
                                action.name,
                                undefined,
                                (action.visualType as any) || 'infantry'
                            );

                            if (legion) {
                                console.log(`🎬 [Director] Army object created. Original ID: ${legion.id}. Forcing ID to: ${action.unitId}`);
                                legion.id = action.unitId;
                                this.spawnedRealUnits.add(action.unitId);

                                const verify = game.legionManager.getLegionById(action.unitId);
                                console.log(`🎬 [Director] Immediate verification for ${action.unitId}: ${verify ? 'FOUND' : 'NOT FOUND'}`);
                            } else {
                                console.error('🎬 [Director] createLegion returned NULL!');
                            }
                        } else {
                            console.log(`🎬 [Director] Legion ${action.unitId} already exists. Skipping spawn.`);
                        }
                    } catch (err) {
                        console.error('🎬 [Director] Error during SPAWN_UNIT:', err);
                    }
                } else {
                    console.error('🎬 [Director] game.legionManager not found!');
                }
            }
            return;
        }

        // 3. Unit Actions (MOVE)
        if (action.type === 'MOVE_UNIT') {
            if (action.unitId && action.path) {
                const game = (window as any).game;
                if (game && game.legionManager) {
                    const army = game.legionManager.getLegionById(action.unitId);
                    if (army) {
                        const path: { lat: number, lng: number }[] = (action.path as any[]).map(p =>
                            Array.isArray(p) ? { lat: p[0], lng: p[1] } : p
                        );

                        console.log(`🎬 [Director] Moving Unit ${army.name} along path (${path.length} nodes)`);

                        if (action.speed) {
                            army.setSpeedMultiplier(action.speed);
                        } else {
                            army.setSpeedMultiplier(1.0);
                        }

                        army.moveAlongPath(path);
                        this.startFollowing(army);
                    } else {
                        console.warn(`🎬 [Director] Unit ${action.unitId} not found for MOVE_UNIT`);
                    }
                }
            }
            return;
        }

        // 4. Draw Actions (Arrows / Zones)
        if (action.type === 'draw' || action.type === 'SHOW_ARROW') {
            if (action.type === 'SHOW_ARROW') action.shape = 'arrow';

            const anyAction = action as any;
            if (anyAction.from && anyAction.to) {
                const f = Array.isArray(anyAction.from) ? { lat: anyAction.from[0], lng: anyAction.from[1] } : anyAction.from;
                const t = Array.isArray(anyAction.to) ? { lat: anyAction.to[0], lng: anyAction.to[1] } : anyAction.to;
                action.path = [f, t];
            }

            this.handleDrawAction(action);
            return;
        }

        // 5. Highlight City
        if (action.type === 'HIGHLIGHT_CITY') {
            const game = (window as any).game;
            if (game && game.cityManager) {
                const cityId = (action as any).cityId;
                const cities = game.cityManager.getCities();
                const target = cities.find((c: any) => c.id === cityId) || cities.find((c: any) => c.name === cityId);

                if (target) {
                    console.log(`🎬 [Director] Highlighting City: ${target.name}`);

                    if (this.overlayLayer && this.map) {
                        const latlng = [target.latitude, target.longitude];
                        const effectType = (action as any).effect || 'default';
                        let color = '#FFD700';
                        if (effectType === 'capture') color = '#000000';
                        if (effectType === 'warning') color = '#FF0000';

                        const radius = 20;
                        const marker = L.circleMarker(latlng as L.LatLngExpression, {
                            radius: radius,
                            color: color,
                            fillColor: 'transparent',
                            weight: 3,
                            opacity: 0.8
                        }).addTo(this.overlayLayer);

                        const duration = (action.duration || 3) * 1000;
                        setTimeout(() => {
                            if (this.overlayLayer && this.overlayLayer.hasLayer(marker)) {
                                this.overlayLayer.removeLayer(marker);
                            }
                        }, duration);
                    }
                } else {
                    console.warn(`🎬 [Director] City not found for HIGHLIGHT_CITY: ${cityId}`);
                }
            }
            return;
        }

        // 6. Trigger Historical Event
        if (action.type === 'TRIGGER_EVENT') {
            const eventId = (action as any).eventId;
            if (eventId !== undefined) {
                // const game = (window as any).game;
                // if (game && game.historicalEventManager) {
                //     const event = HISTORICAL_EVENTS[parseInt(eventId)];
                //     if (event) {
                //         const force = (action as any).force !== false;
                //         console.log(`🎬 [Director] Triggering Event: ${event.description} (Force: ${force})`);
                //         game.historicalEventManager.triggerEvent(event, force);
                //
                //         if (game.timeSystem && game.timeSystem.isGamePaused()) {
                //             console.log('[Director] Unpausing game for event movement simulation...');
                //             game.timeSystem.setPaused(false);
                //         }
                //     }
                // }
                console.warn('[Director] TRIGGER_EVENT is disabled in Sandbox mode.');
            }
            return;
        }

        // 7. Map Filter
        if (action.type === 'MAP_FILTER' || action.type === 'ACTION_MAP_FILTER') {
            let overlay = document.getElementById('director-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'director-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '500';
                overlay.style.transition = 'background 1s';
                document.body.appendChild(overlay);
            }

            if (action.data?.mode === 'drought') {
                overlay.style.background = `rgba(189, 140, 60, ${action.data.intensity || 0.3})`;
            } else if (action.data?.mode === 'political') {
                overlay.style.background = 'transparent';
            } else {
                overlay.style.background = 'transparent';
            }
            return;
        }

        // 8. UI Actions
        if (action.type === 'ui') {
            if (action.uiAction === 'hide_all') this.setUIVisible(false);
            if (action.uiAction === 'show_all') this.setUIVisible(true);
            return;
        }

        // 9. Wait
        if (action.type === 'wait') {
            await new Promise(resolve => setTimeout(resolve, (action.duration || 1) * 1000));
            return;
        }
    }

    private handleDrawAction(action: DirectorAction) {
        if (!this.map || !this.overlayLayer) return;

        let points: any[] = [];
        if (action.path) {
            points = (action.path as any[]).map(p => Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]);
        }

        // Handle flattened V2 'from'/'to' if path is missing
        const anyAction = action as any;
        if (!action.path && anyAction.from && anyAction.to) {
            const f = Array.isArray(anyAction.from) ? { lat: anyAction.from[0], lng: anyAction.from[1] } : anyAction.from;
            const t = Array.isArray(anyAction.to) ? { lat: anyAction.to[0], lng: anyAction.to[1] } : anyAction.to;
            points = [[f.lat, f.lng], [t.lat, t.lng]];
        }

        if (action.shape === 'arrow' && points.length >= 2) {
            // [OPTIMIZATION] Auto-curve if 3 points are provided (Start, Control, End)
            if (points.length === 3) {
                points = this.getQuadraticBezierPoints(points[0], points[1], points[2], 20);
            }

            const color = action.color || '#ff0000';

            // Draw Main Line
            L.polyline(points, {
                color: color,
                weight: action.width || 4,
                opacity: 0.8,
                dashArray: action.style === 'dashed' ? '10, 10' : undefined,
                className: 'tactical-arrow'
            }).addTo(this.overlayLayer);

            // Draw Arrow Head
            const end = points[points.length - 1];
            L.circleMarker(end, {
                radius: (action.width || 4) * 2,
                color: color,
                fillColor: color,
                fillOpacity: 1
            }).addTo(this.overlayLayer);

            // Draw Label
            if (action.label) {
                const mid = points[Math.floor(points.length / 2)];
                L.tooltip({
                    permanent: true,
                    direction: 'center',
                    className: 'director-label'
                })
                    .setLatLng(mid)
                    .setContent(action.label)
                    .addTo(this.overlayLayer);
            }
        }

        if (action.shape === 'zone' && action.path) {
            const points = (action.path as any[]).map(p => Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]);
            L.polygon(points, {
                color: action.color || '#ffff00',
                weight: 2,
                fillOpacity: 0.3
            }).addTo(this.overlayLayer);
        }
    }

    // ==================== Manual Control & UI Helper ====================

    private bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keysPressed[e.code] = true;
            this.handleGlobalHotkeys(e);
        });

        window.addEventListener('keyup', (e) => {
            this.keysPressed[e.code] = false;
        });
    }

    private handleGlobalHotkeys(e: KeyboardEvent) {
        // Prevent toggle if user is typing
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        // H: Toggle UI (God Mode)
        if (e.code === 'KeyH') {
            this.toggleUI();
        }

        // [AUTO-DIRECTOR] F8: Toggle Director Mode
        if (e.code === 'F8') {
            if (GameConfig.SYSTEM.STATIC_MAP_SCENE) {
                console.log('🎥 [Cinematic] F8 Disabled in Static Map Mode');
                return;
            }
            this.toggleAutoDirector();
        }
    }

    public toggleUI() {
        this.setUIVisible(!this.isUIVisible);
    }

    public setUIVisible(visible: boolean) {
        this.isUIVisible = visible;
        const displayValue = this.isUIVisible ? '' : 'none';

        this.uiSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
                if (el instanceof HTMLElement) {
                    el.style.display = displayValue;
                }
            });
        });

        const renderer = getGlobalUnitRenderer();
        if (renderer) {
            // [FIX] Always show army labels regardless of UI visibility
            // renderer.setShowLabels(this.isUIVisible);
        }
    }

    public isControllingCamera(): boolean {
        if (Math.abs(this.currentVelocity.x) > 1 || Math.abs(this.currentVelocity.y) > 1) return true;
        return !!(this.keysPressed['KeyW'] || this.keysPressed['ArrowUp'] ||
            this.keysPressed['KeyS'] || this.keysPressed['ArrowDown'] ||
            this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft'] ||
            this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']);
    }

    // ==================== Update Loop ====================

    public update(deltaTime: number) {
        // [AUTO-DIRECTOR]
        this.updateAutoDirector(deltaTime);


        // [FIX] Cap deltaTime to prevent jumps during lag spikes
        const safeDelta = Math.min(deltaTime, 0.1);

        // Update Director Units
        this.directorUnits.forEach(unit => unit.update(safeDelta));

        // Handle Camera
        if (!this.map) return;
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        // [CAMERA FOLLOW] Auto-follow moving army
        if (this.followingArmy) {
            // [SMOOTH APPROACH] Skip frame updates while approaching
            if (this.isApproaching) {
                return;
            }

            // [FIX] Persistent Follow: Only stop if destroyed
            if (this.followingArmy.isDestroyed) {
                // If Auto-Director is ON, we linger for a few seconds (handled in updateAutoDirector)
                if (this.autoDirectorEnabled) {
                    return;
                }
                console.log(`🎥 [CinematicManager] Following army destroyed. Ending follow.`);
                this.stopFollowing();
                return;
            }

            const pos = this.followingArmy.getPosition();
            if (pos) {
                // [SMOOTH FOLLOW] Use Lerp instead of hard lock
                // Current Map Center
                const currentCenter = this.map.getCenter();
                const targetLat = pos.lat;
                const targetLng = pos.lng;

                // Simple adjustable speed factor.
                const followSpeed = 3.0;
                const t = 1.0 - Math.pow(0.01, deltaTime * followSpeed);

                // Manual Lerp
                const newLat = currentCenter.lat + (targetLat - currentCenter.lat) * t;
                const newLng = currentCenter.lng + (targetLng - currentCenter.lng) * t;

                // [OPTIMIZATION] Minimal Movement Threshold
                // Only update map view if movement is significant (> ~1 meter).
                // This prevents micro-jitter and reduces expensive DOM reflows.
                if (Math.abs(newLat - currentCenter.lat) > 0.00001 || Math.abs(newLng - currentCenter.lng) > 0.00001) {
                    this.map.panTo([newLat, newLng], { animate: false });
                }

                // [ZOOM REFRESH] Detect user zoom changes and force visual update
                const currentZoom = this.map.getZoom();
                // [OPTIMIZATION] Removed unnecessary 'zoomend' firing which caused layout thrashing.
                // The map automatically handles tile updates on setView/panTo.
                this.lastFollowZoom = currentZoom;
            }
            return; // Don't process manual controls while following
        }

        // (Existing specific camera key logic...)
        // Simplified for merge: just call existing manual control
        // [FIX] Use safeDelta for physics
        this.updateCameraManual(safeDelta);
    }

    private updateCameraManual(deltaTime: number) {
        let targetVx = 0;
        let targetVy = 0;

        if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) targetVy -= 1;
        if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) targetVy += 1;
        if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) targetVx -= 1;
        if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) targetVx += 1;

        if (targetVx !== 0 || targetVy !== 0) {
            const length = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
            targetVx /= length;
            targetVy /= length;
        }

        targetVx *= this.moveSpeed;
        targetVy *= this.moveSpeed;

        const lerpFactor = 1 - Math.pow(this.smoothing, deltaTime * 10);
        this.currentVelocity.x += (targetVx - this.currentVelocity.x) * lerpFactor;
        this.currentVelocity.y += (targetVy - this.currentVelocity.y) * lerpFactor;

        // [FIX] Strict Inertia Cutoff to prevent ghost drifting
        if (Math.abs(this.currentVelocity.x) < 10) this.currentVelocity.x = 0;
        if (Math.abs(this.currentVelocity.y) < 10) this.currentVelocity.y = 0;

        if (Math.abs(this.currentVelocity.x) < 1 && Math.abs(this.currentVelocity.y) < 1) return;

        if (this.map) {
            this.map.panBy([this.currentVelocity.x * deltaTime, this.currentVelocity.y * deltaTime], {
                animate: false
            });
        }
    }

    /**
     * Helper: Generate points for a Quadratic Bezier Curve
     */
    private getQuadraticBezierPoints(p0: [number, number], p1: [number, number], p2: [number, number], segments: number): [number, number][] {
        const points: [number, number][] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const lat = Math.pow(1 - t, 2) * p0[0] + 2 * (1 - t) * t * p1[0] + Math.pow(t, 2) * p2[0];
            const lng = Math.pow(1 - t, 2) * p0[1] + 2 * (1 - t) * t * p1[1] + Math.pow(t, 2) * p2[1];
            points.push([lat, lng]);
        }
        return points;
    }
    // ==================== [AUTO-DIRECTOR] Logic ====================

    private updateAutoDirector(dt: number) {
        if (!this.autoDirectorEnabled || !this.map) return;

        // 1. Zoom Cycle Timer
        this.autoDirectorTimer += dt * 1000;
        if (this.autoDirectorTimer > this.ZOOM_CYCLE_DURATION) {
            this.autoDirectorTimer = 0;
            this.currentZoomIndex = (this.currentZoomIndex + 1) % this.autoDirectorZoomStages.length;

            const targetZoom = this.autoDirectorZoomStages[this.currentZoomIndex];
            console.log(`🎬 [Auto-Director] Cycling Zoom to Level ${targetZoom}`);
            this.map.setZoom(targetZoom, { animate: true });

            // [FIX] Do NOT switch target on zoom change. Stay loyal to current target.
            // this.forceDirectorScan();
        }

        // 2. Emergency Switch Only (If target dies)
        // [FIX] Removed periodic 5s scan. We behave like a loyal cameraman.
        // const targetLost = !this.followingArmy || this.followingArmy.isDestroyed;

        if (!this.followingArmy) {
            // Immediate switch if nothing to follow
            this.forceDirectorScan();
            this.lastScanTime = Date.now();
            this.deathSwitchTimer = 0;
        } else if (this.followingArmy.isDestroyed) {
            // Linger on death scene
            this.deathSwitchTimer += dt * 1000;
            if (this.deathSwitchTimer > this.DEATH_SWITCH_DELAY) {
                console.log(`🎬 [Auto-Director] Death linger complete (${this.DEATH_SWITCH_DELAY}ms). Switching.`);
                this.forceDirectorScan();
                this.lastScanTime = Date.now();
                this.deathSwitchTimer = 0;
            }
        } else {
            // Target alive, reset timer
            this.deathSwitchTimer = 0;
        }

        // 3. Enforce Zoom (Soft enforcement to prevent user/event drift)
        // If we are significantly off the target zoom, gently correct it
        // (Optional, maybe too intrusive if user is scrolling? User scroll disables AD, so it's fine)
        const targetZoom = this.autoDirectorZoomStages[this.currentZoomIndex];
        if (Math.abs(this.map.getZoom() - targetZoom) > 0.5) {
            // this.map.setZoom(targetZoom); // Let's rely on cycle trigger for now to avoid jitter
        }
    }

    private forceDirectorScan() {
        if (!this.legionManager) return;

        const armies = this.legionManager.getArmies() as any[]; // Type cast for now
        if (!armies || armies.length === 0) return;

        // 1. Filter Alive
        const activeArmies = armies.filter(a => !a.isDestroyed);

        if (activeArmies.length === 0) return;

        // 2. Sort by Troops (Desc)
        activeArmies.sort((a, b) => b.getTroops() - a.getTroops());

        const bestTarget = activeArmies[0];

        // 3. Switch if needed
        if (this.followingArmy !== bestTarget) {
            console.log(`🎬 [Auto-Director] Switching focus to ${bestTarget.name} (Troops: ${Math.floor(bestTarget.getTroops())})`);

            const targetZoom = this.autoDirectorZoomStages[this.currentZoomIndex];

            // If we were already following someone, just switch target reference to avoid camera jump if close?
            // CinematicManager.startFollowing handles the transition.

            // Check if we need to set zoom? startFollowing might not set zoom.
            // Let's pass zoom option if our method supported it, but startFollowing currently doesn't take options in signature?
            // Let's check startFollowing signature.
            // It is `public startFollowing(army: any): void`.

            this.startFollowing(bestTarget);

            // Manually set zoom after a brief delay or immediately if just starting?
            // map.setZoom is async-ish.
            if (this.map && Math.abs(this.map.getZoom() - targetZoom) > 0.1) {
                this.map.setZoom(targetZoom, { animate: true });
            }
        }
    }

}

// ==================== Director Unit Class ====================

import { IAnimatedUnit } from '../map/GlobalUnitRenderer';

class DirectorUnit implements IAnimatedUnit {
    public id: string;
    public name?: string;
    public factionId?: string; // Faction ID
    public type: string; // "infantry" etc

    // Position
    private currentPos: { lat: number, lng: number };
    public lastPosition: { lat: number, lng: number };

    // State
    public isAttacking: boolean = false;
    public isMoving: boolean = false;
    public isDestroyed: boolean = false;
    public currentBattleType: 'siege' | 'field' | null = null;
    public targetPos: { lat: number; lng: number } | null = null;
    public lastDirection?: number;

    // Movement Path
    private movePath: { lat: number, lng: number }[] = [];
    private moveDuration: number = 0;
    private moveElapsed: number = 0;
    private startPos: { lat: number, lng: number } | null = null;

    constructor(id: string, pos: { lat: number, lng: number }, name?: string, faction?: string, type: string = "infantry") {
        this.id = id;
        this.currentPos = { ...pos };
        this.lastPosition = { ...pos };
        this.name = name;
        this.factionId = faction;
        this.type = type;
    }

    public get legionType(): any { return this.type; } // [UNIT SYSTEM] Bridge to Renderer

    public getPosition() { return this.currentPos; }
    public getTroops() { return 10000; } // Default visualization troops

    public startMove(path: { lat: number, lng: number }[], duration: number) {
        this.movePath = path;
        this.moveDuration = duration;
        this.moveElapsed = 0;
        this.isMoving = true;

        if (path.length > 0) {
            this.currentPos = { ...path[0] }; // Jump to start
            this.startPos = { ...path[0] };
        }
    }

    public update(dt: number) {
        if (!this.isMoving || this.movePath.length < 2) return;

        this.moveElapsed += dt;
        const progress = Math.min(this.moveElapsed / this.moveDuration, 1.0);

        // Simple linear interpolation along the WHOLE path is hard if path has multiple nodes.
        // Simplified: Interpolate between index i and i+1 based on progress.
        // For accurate timing, we assume uniform speed along total length or just interpolate total index.

        const totalSegments = this.movePath.length - 1;
        const totalProgress = progress * totalSegments;
        const segmentIndex = Math.floor(totalProgress);
        const segmentProgress = totalProgress - segmentIndex;

        if (segmentIndex >= totalSegments) {
            // Arrived
            this.currentPos = this.movePath[totalSegments];
            if (progress >= 1.0) this.isMoving = false;
        } else {
            const p0 = this.movePath[segmentIndex];
            const p1 = this.movePath[segmentIndex + 1];

            this.currentPos = {
                lat: p0.lat + (p1.lat - p0.lat) * segmentProgress,
                lng: p0.lng + (p1.lng - p0.lng) * segmentProgress
            };
        }

        // Direction is handled by Renderer comparing currentPos and lastPosition
    }

}
