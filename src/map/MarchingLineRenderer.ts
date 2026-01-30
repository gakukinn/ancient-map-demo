import L from 'leaflet';
import { GameMap } from './GameMap';
import { roadRegistry } from '../core/RoadRegistry';
import { LatLng } from '../types/core';
import { CityManager } from '../core/CityManager';

type AnimationState = 'IDLE' | 'MARCHING' | 'ATTACKING' | 'CONQUERED';

export class MarchingLineRenderer {
    private map: L.Map;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null = null;
    private animationId: number | null = null;
    private isVisible: boolean = false;

    // 依赖
    private cityManager: CityManager;

    // 路径：牧野 -> 新郑 (根据事件数据，不经过虎牢关)
    private attackPath: LatLng[] = [];

    // 动画状态
    private state: AnimationState = 'IDLE';
    private stateStartTime: number = 0;

    // 坐标常量 (根据事件数据)
    private readonly MUYE_POS = { lat: 35.377938, lng: 113.793640 };      // attackerCityId
    private readonly XINZHENG_POS = { lat: 34.261334, lng: 113.650818 };  // defenderCityId
    private readonly XINZHENG_ID = 'city_许昌_1766824237989';

    // 标志
    private hasConquered: boolean = false;
    private maxBattleDuration: number = 2000;

    // 攻城特效图片 - 预处理后的图像（已删除黑色背景）
    private processedFrames: Map<number, HTMLImageElement> = new Map();
    private imagesLoaded: boolean = false;
    private readonly FRAME_COUNT = 30;
    private readonly FPS = 30;

    constructor(gameMap: GameMap, cityManager: CityManager) {
        this.map = gameMap.getLeafletMap();
        this.cityManager = cityManager;
        this.canvas = L.DomUtil.create('canvas', 'marching-line-layer');

        // 创建自定义图层
        if (!this.map.getPane('marchingLinePane')) {
            this.map.createPane('marchingLinePane');
            const pane = this.map.getPane('marchingLinePane');
            if (pane) {
                pane.style.zIndex = '500';
                pane.style.pointerEvents = 'none';
            }
        }

        const pane = this.map.getPane('marchingLinePane');
        if (pane) {
            pane.appendChild(this.canvas);
        }

        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.position = 'absolute';

        const context = this.canvas.getContext('2d');
        if (!context) {
            console.error('Failed to get 2D context for MarchingLineRenderer');
            return;
        }
        this.ctx = context;

        // 加载并预处理攻城特效图片
        this.loadAndProcessSiegeAssets();

        // 绑定事件
        this.map.on('move', this.updateCanvas, this);
        this.map.on('zoom', this.updateCanvas, this);
        this.map.on('resize', this.updateCanvas, this);
        this.map.on('viewreset', this.updateCanvas, this);

        // 初始化
        this.updateCanvas();
        this.startAnimation();

        console.log('⚡ MarchingLineRenderer 初始化完成');
    }

    /**
     * 加载并预处理攻城特效图片（删除黑色背景）
     */
    private loadAndProcessSiegeAssets() {
        console.log('🔄 [MarchingLine] 预处理攻城特效图片...');
        let loadedCount = 0;

        for (let i = 1; i <= this.FRAME_COUNT; i++) {
            const frameIndex = i;
            const numStr = i.toString().padStart(3, '0');
            const src = `effects/siege/ezgif-frame-${numStr}.png`;

            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // 创建临时 canvas 处理图片
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d')!;

                tempCtx.drawImage(img, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imageData.data;

                // 删除黑色像素（阈值 60）
                const threshold = 60;
                for (let j = 0; j < data.length; j += 4) {
                    const r = data[j];
                    const g = data[j + 1];
                    const b = data[j + 2];
                    if (r + g + b < threshold) {
                        data[j + 3] = 0; // 设置 alpha 为 0（透明）
                    }
                }

                tempCtx.putImageData(imageData, 0, 0);

                // 转换为新的 Image 对象
                const processedImg = new Image();
                processedImg.src = tempCanvas.toDataURL('image/png');
                processedImg.onload = () => {
                    this.processedFrames.set(frameIndex, processedImg);
                    loadedCount++;
                    if (loadedCount === this.FRAME_COUNT) {
                        this.imagesLoaded = true;
                        console.log('✅ [MarchingLine] 攻城特效图片预处理完成');
                    }
                };
            };

            img.src = src;
        }
    }

    /**
     * 计算路径：牧野 -> 新郑 (直接路径，不经过虎牢关)
     */
    private calculatePath() {
        const path = roadRegistry.findPathOnRoad(this.MUYE_POS, this.XINZHENG_POS);
        if (path && path.length > 1) {
            this.attackPath = path;
            console.log(`✅ 行军路径获取成功: ${path.length} 个点 (牧野 → 新郑)`);
        } else {
            console.warn('⚠️ 行军路径获取失败，使用直线');
            this.attackPath = [this.MUYE_POS, this.XINZHENG_POS];
        }
    }

    // ==================================================================================
    // 公共方法
    // ==================================================================================

    /**
     * 播放"灭韩"过场动画 (前230年)
     */
    // 追踪目标
    private trackingTarget: { getPosition: () => { lat: number, lng: number } } | null = null;

    // ... (existing properties)

    /**
     * 播放"灭韩"过场动画 (前230年)
     * @param targetParams 可选的追踪目标
     */
    public playConquestOfHan(targetParams?: { getPosition: () => { lat: number, lng: number } }) {
        console.log('🎬 开始播放: 秦灭韩 (-230)');

        // 计算路径
        this.calculatePath();

        // 设置追踪目标
        if (targetParams) {
            this.trackingTarget = targetParams;
            console.log('🎯 [MarchingLine] 追踪目标已设置');
        } else {
            console.warn('⚠️ [MarchingLine] 未提供追踪目标，将显示完整路径');
        }

        this.isVisible = true;
        this.state = 'MARCHING';
        this.stateStartTime = Date.now();
        this.hasConquered = false;

        this.updateCanvas();
    }

    /**
     * 手动触发攻占 (由外部战斗系统调用)
     */
    public triggerConquest() {
        if (this.state === 'MARCHING' || this.state === 'ATTACKING') {
            this.executeConquest();
            // [MOD] 用户请求：战争结束后不再播放特效，直接结束
            this.stop();
            console.log('🎬 阶段: 攻占新郑 (特效已移除)');
        }
    }

    /**
     * 设置战斗时长 (由战斗系统调用)
     */
    public setBattleDuration(durationMs: number) {
        this.maxBattleDuration = durationMs;
        console.log(`⏱️ 行军线渲染器: 同步战斗时长 ${durationMs.toFixed(0)}ms`);
    }

    /**
     * 停止动画
     */
    public stop() {
        this.isVisible = false;
        this.state = 'IDLE';
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // ==================================================================================
    // 内部方法
    // ==================================================================================

    private updateCanvas() {
        if (!this.ctx || !this.map) return;
        const size = this.map.getSize();
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        L.DomUtil.setPosition(this.canvas, topLeft);
    }

    private startAnimation() {
        if (this.animationId !== null) return;
        const animate = () => {
            if (this.isVisible) {
                this.render();
            } else {
                if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    private executeConquest() {
        if (this.hasConquered) return;
        this.hasConquered = true;

        console.log('⚔️ 秦军攻占新郑！');

        const city = this.cityManager.getCity(this.XINZHENG_ID);
        if (city) {
            city.factionId = 'huaxia';
            city.troops = 10000;
            this.cityManager.refreshAll();
        }
    }

    private render() {
        if (!this.ctx || !this.map) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 渲染行军线 (牧野 -> 新郑)
        // [MOD] 仅在 MARCHING 或 ATTACKING 状态且有路径时渲染
        if ((this.state === 'MARCHING' || this.state === 'ATTACKING') && this.attackPath.length > 0) {

            let pathRender = this.attackPath;

            // [MOD] 如果有追踪目标，裁剪路径至目标位置 (补给线效果)
            if (this.trackingTarget) {
                const currentPos = this.trackingTarget.getPosition();
                // console.log('📍 Army Pos:', currentPos.lat.toFixed(4), currentPos.lng.toFixed(4));

                // 简单的裁剪逻辑：找到路径上离目标最近的点，截取前面的部分 + 目标点
                pathRender = this.getTrimmedPath(this.attackPath, currentPos);
                // console.log('📏 Trimmed Path:', pathRender.length);
            }

            this.renderPolyline(ctx, pathRender, {
                width: 8,
                color: '#000000',
                glowColor: '#e0ffff', // 这一点光晕稍微保留一点，作为"补给"的感觉
                dash: [20, 15],      // [MOD] 调整虚线样式，更像传送带
                speed: 1.5           // [MOD] 调整速度
            });
        }

        // 渲染攻城特效 (已移除 CONQUERED 状态的特效渲染，Step 459已处理)

        ctx.restore();
    }

    /**
     * 根据当前位置裁剪路径
     */
    private getTrimmedPath(fullPath: LatLng[], currentPos: { lat: number, lng: number }): LatLng[] {
        if (fullPath.length < 2) return [currentPos];

        // 找到最近的线段索引
        let closestIndex = 0;
        let minDistance = Infinity;

        // 优化：只搜索附近的点，或者假设军队沿着路径顺序前进
        // 由于 path 是有序的，我们可以直接遍历寻找最近点
        for (let i = 0; i < fullPath.length; i++) {
            const dist = L.latLng(currentPos).distanceTo(L.latLng(fullPath[i]));
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        // 如果最近点距离太远（比如超过 5km），说明可能出错了或者还没开始移动
        // if (minDistance > 5000) return [fullPath[0]];

        // 截取 0 到 closestIndex
        // 注意：最近点可能是当前位置的前一个点，也可能是后一个点。
        // 为了视觉连贯，我们将 currentPos 作为最后一个点。
        // 如果 closestIndex 是 "身后" 的点，那么 path[closestIndex] -> currentPos 是一段。
        // 如果 closestIndex 是 "身前" 的点，那么 path[closestIndex] 不应该被包含？这取决于路径密度。
        // 简单策略：包含 closestIndex，然后 append currentPos。
        const trimmed = fullPath.slice(0, closestIndex + 1);
        trimmed.push(currentPos);

        return trimmed;
    }


    private renderPolyline(ctx: CanvasRenderingContext2D, path: LatLng[], style: any) {
        if (path.length < 2) return;

        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        const canvasPoints = path.map(p => {
            const pt = this.map.latLngToLayerPoint([p.lat, p.lng]);
            return { x: pt.x - topLeft.x, y: pt.y - topLeft.y };
        });

        ctx.beginPath();
        ctx.lineWidth = style.width;
        ctx.strokeStyle = style.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = style.glowColor;

        const offset = -Date.now() / 10 * style.speed;
        ctx.setLineDash(style.dash);
        ctx.lineDashOffset = offset;

        ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        for (let i = 1; i < canvasPoints.length; i++) {
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    private renderSiegeSprite(ctx: CanvasRenderingContext2D, x: number, y: number) {
        if (!this.imagesLoaded) return;

        const elapsed = Date.now() - this.stateStartTime;
        const timePerFrame = 1000 / this.FPS;
        const frameIndex = Math.floor(elapsed / timePerFrame) + 1; // 1-indexed

        if (frameIndex >= 1 && frameIndex <= this.FRAME_COUNT) {
            const img = this.processedFrames.get(frameIndex);
            if (img && img.complete) {
                const size = 300;
                // 预处理后的图片已经没有黑色背景，直接绘制
                ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            }
        }
    }

    public destroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        this.map.off('move', this.updateCanvas, this);
        this.map.off('zoom', this.updateCanvas, this);
        this.map.off('resize', this.updateCanvas, this);
        this.map.off('viewreset', this.updateCanvas, this);
        this.canvas.remove();
    }
}
