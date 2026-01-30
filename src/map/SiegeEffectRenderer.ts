import L from 'leaflet';
import { GameMap } from './GameMap';

/**
 * SiegeEffectRenderer - 攻城战视觉特效渲染器
 * 使用 APNG 动画文件叠加在城市上方，浏览器自动播放动画。
 */
export class SiegeEffectRenderer {
    private map: GameMap;
    private activeEffects: Map<string, {
        overlay: L.ImageOverlay;
        location: { lat: number, lng: number };
        cityType: string;
        fadeTimerId?: any; // 用于淡入淡出动画的定时器
    }> = new Map();

    // 淡入淡出配置
    private static readonly FADE_DURATION_MS = 800; // 淡入淡出时长（毫秒）
    private static readonly FADE_STEPS = 20; // 动画帧数

    // APNG 素材路径
    private static readonly APNG_PATH = '/effects/ezgif.com-apng-maker.png';

    constructor(map: GameMap) {
        this.map = map;
        this.createEffectsPane();

        // 监听缩放事件，动态调整特效大小
        this.map.getLeafletMap().on('zoom', this.updateEffectScales.bind(this));
    }

    private createEffectsPane(): void {
        const leafletMap = this.map.getLeafletMap();
        if (!leafletMap.getPane('effectsPane')) {
            leafletMap.createPane('effectsPane');
            const pane = leafletMap.getPane('effectsPane')!;
            pane.style.zIndex = '650';
        }
    }

    /**
     * 在指定城市播放攻城特效
     */
    public playEffect(cityId: string, location: { lat: number, lng: number }, cityType: string = 'small_city'): void {
        if (this.activeEffects.has(cityId)) {
            console.log(`⚠️ [SiegeEffect] 特效已在 ${cityId} 播放中，跳过`);
            return;
        }

        console.log(`🔥 [SiegeEffect] 在城市 ${cityId} (类型: ${cityType}) 启动特效`);

        const bounds = this.getBounds(location, cityType);

        // 创建 overlay，初始透明度为 0
        const overlay = L.imageOverlay(SiegeEffectRenderer.APNG_PATH, bounds, {
            pane: 'effectsPane',
            interactive: false,
            opacity: 0 // 从完全透明开始
        }).addTo(this.map.getLeafletMap());

        this.activeEffects.set(cityId, {
            overlay,
            location,
            cityType
        });

        // 淡入动画
        this.fadeIn(cityId);
    }

    /**
     * 停止指定城市的攻城特效
     */
    public stopEffect(cityId: string): void {
        const effect = this.activeEffects.get(cityId);
        if (effect) {
            console.log(`🧯 [SiegeEffect] 停止城市 ${cityId} 的特效（开始淡出）`);
            // 淡出动画，完成后再移除
            this.fadeOut(cityId);
        }
    }

    /**
     * 淡入动画
     */
    private fadeIn(cityId: string): void {
        const effect = this.activeEffects.get(cityId);
        if (!effect) return;

        // 清除之前的动画定时器（如果有）
        if (effect.fadeTimerId) {
            clearInterval(effect.fadeTimerId);
        }

        const stepDuration = SiegeEffectRenderer.FADE_DURATION_MS / SiegeEffectRenderer.FADE_STEPS;
        const opacityStep = 1.0 / SiegeEffectRenderer.FADE_STEPS;
        let currentOpacity = 0;

        effect.fadeTimerId = setInterval(() => {
            currentOpacity += opacityStep;
            if (currentOpacity >= 1.0) {
                currentOpacity = 1.0;
                clearInterval(effect.fadeTimerId);
                effect.fadeTimerId = undefined;
            }
            effect.overlay.setOpacity(currentOpacity);
        }, stepDuration);
    }

    /**
     * 淡出动画，完成后移除 overlay
     */
    private fadeOut(cityId: string): void {
        const effect = this.activeEffects.get(cityId);
        if (!effect) return;

        // 清除之前的动画定时器（如果有）
        if (effect.fadeTimerId) {
            clearInterval(effect.fadeTimerId);
        }

        const stepDuration = SiegeEffectRenderer.FADE_DURATION_MS / SiegeEffectRenderer.FADE_STEPS;
        const opacityStep = 1.0 / SiegeEffectRenderer.FADE_STEPS;
        let currentOpacity = effect.overlay.options.opacity ?? 1.0;

        effect.fadeTimerId = setInterval(() => {
            currentOpacity -= opacityStep;
            if (currentOpacity <= 0) {
                currentOpacity = 0;
                clearInterval(effect.fadeTimerId);
                // 动画完成，移除 overlay
                effect.overlay.remove();
                this.activeEffects.delete(cityId);
                console.log(`🧯 [SiegeEffect] 城市 ${cityId} 的特效已完全消失`);
                return;
            }
            effect.overlay.setOpacity(currentOpacity);
        }, stepDuration);
    }

    /**
     * 停止所有攻城特效
     */
    public stopAll(): void {
        this.activeEffects.forEach((_, cityId) => this.stopEffect(cityId));
    }

    /**
     * 缩放时更新所有特效的地理范围
     */
    private updateEffectScales(): void {
        this.activeEffects.forEach((effect, cityId) => {
            const newBounds = this.getBounds(effect.location, effect.cityType);
            effect.overlay.setBounds(newBounds);
        });
    }

    /**
     * 根据城市类型和缩放级别计算特效的地理边界
     * 大城 > 中城 > 小城
     */
    private getBounds(center: { lat: number, lng: number }, cityType: string = 'small_city'): L.LatLngBounds {
        const zoom = this.map.getLeafletMap().getZoom();

        // 城市图标在 Zoom 10 后不再放大，特效需要匹配这个行为
        const scaleFactor = Math.pow(2, Math.min(zoom, 10) - zoom);

        // 根据城市类型确定基础尺寸
        const hugeCityTypes = [
            'huge_city', 'hannan_huge_city', 'hanbei_huge_city', 'hanhuang_huge_city',
            'huge_city',
            'hanchuan_huge_city', 'hanling_huge_city', 'hanxiang_huge_city'
        ];

        const smallCityTypes = [
            'pass', 'mountain_pass', 'north_mountain_pass', 'chuan_mountain_pass',
            'south_mountain_pass', 'hanling_mountain_pass', 'hanfu_small_city',
            'hanhuang_small_city', 'hanling_small_city', 'west_small_city', 'small_city',
            'nanping_pass', 'huangping_pass', 'beiping_pass', 'xiyu_ping_pass',
            'grassland_fortress', 'western_fortress', 'tibetan_fortress', 'huangdukou'
        ];

        // 基础尺寸和偏移量（大城/帝都 > 中城 > 小城/关隘）
        // 城市图标锚点在底部，建筑主体在图标上半部分
        // 坐标已 snap 到网格中心，只需要少量向上偏移
        let baseHalfWidth = 0.30;
        let baseHalfHeight = 0.18;
        let baseLatOffset = 0.08; // 小幅向上偏移

        if (cityType === 'huge_city') {
            // 大城：尺寸 1.2x
            baseHalfWidth = 0.36;
            baseHalfHeight = 0.22;
            baseLatOffset = 0.10;
        } else if (cityType === 'small_city' || cityType === 'pass' || cityType === 'ferry') {
            // 小城/关隘：尺寸 0.8x
            baseHalfWidth = 0.24;
            baseHalfHeight = 0.14;
            baseLatOffset = 0.06;
        }
        // 中城 (large_city) 使用默认值

        // 应用缩放因子
        const currentHalfWidth = baseHalfWidth * scaleFactor;
        const currentHalfHeight = baseHalfHeight * scaleFactor;
        const currentLatOffset = baseLatOffset * scaleFactor;

        return L.latLngBounds(
            [center.lat - currentHalfHeight + currentLatOffset, center.lng - currentHalfWidth],
            [center.lat + currentHalfHeight + currentLatOffset, center.lng + currentHalfWidth]
        );
    }
}
