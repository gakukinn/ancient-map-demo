import L from 'leaflet';

import { GameMap } from '../map/GameMap';
import { MapColorSampler } from './MapColorSampler';

/**
 * 颜色调试工具
 * 点击地图显示该位置的颜色信息，用于调整地形分类规则
 */
export class ColorDebugger {
    private map: any;
    private sampler: MapColorSampler;
    private debugPanel: HTMLDivElement | null = null;
    private isActive: boolean = false;
    private clickHandler: ((e: any) => void) | null = null;

    constructor(gameMap: GameMap, sampler: MapColorSampler) {
        this.map = gameMap.getLeafletMap();
        this.sampler = sampler;
        this.createDebugPanel();
    }

    /**
     * 创建调试面板
     */
    private createDebugPanel(): void {
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'color-debug-panel';
        this.debugPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 2000;
            min-width: 300px;
            display: none;
        `;
        this.debugPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #FFD700;">
                🎨 颜色调试器
            </div>
            <div id="color-debug-content">
                点击地图任意位置查看颜色...
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #555;">
                <button id="close-debug" style="
                    background: #FF4444;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;
        document.body.appendChild(this.debugPanel);

        // 关闭按钮事件
        const closeBtn = this.debugPanel.querySelector('#close-debug');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivate());
        }
    }

    /**
     * 激活调试模式
     */
    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        if (this.debugPanel) {
            this.debugPanel.style.display = 'block';
        }

        // 添加地图点击事件
        this.clickHandler = (e: any) => {
            const { lat, lng } = e.latlng;
            this.showColorInfo(lat, lng);
        };
        this.map.on('click', this.clickHandler);

        console.log('🎨 颜色调试器已激活 - 点击地图查看颜色');
    }

    /**
     * 停用调试模式
     */
    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
        }

        // 移除地图点击事件
        if (this.clickHandler) {
            this.map.off('click', this.clickHandler);
            this.clickHandler = null;
        }

        console.log('🎨 颜色调试器已关闭');
    }

    /**
     * 切换调试模式
     */
    public toggle(): void {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    /**
     * 显示指定位置的颜色信息
     */
    private showColorInfo(lat: number, lng: number): void {
        const color = this.sampler.getColorAt(lat, lng);

        if (!color) {
            this.updateDebugPanel({
                lat,
                lng,
                error: '无法采样颜色（可能是跨域限制或瓦片未加载）'
            });
            return;
        }

        const { r, g, b, variance } = color;
        const brightness = Math.round((r + g + b) / 3);

        // 分析颜色特征
        const analysis = this.analyzeColor(color);

        this.updateDebugPanel({
            lat,
            lng,
            r,
            g,
            b,
            variance,
            brightness,
            analysis
        });
    }

    /**
     * 分析颜色特征
     */
    private analyzeColor(color: { r: number; g: number; b: number }): string {
        const { r, g, b } = color;
        const brightness = (r + g + b) / 3;

        const features: string[] = [];

        // 主色调
        if (r > g && r > b) {
            features.push('红色系');
        } else if (g > r && g > b) {
            features.push('绿色系');
        } else if (b > r && b > g) {
            features.push('蓝色系');
        } else {
            features.push('灰色系');
        }

        // 亮度
        if (brightness > 200) {
            features.push('很亮');
        } else if (brightness > 160) {
            features.push('较亮');
        } else if (brightness > 120) {
            features.push('中等');
        } else {
            features.push('较暗');
        }

        // 饱和度
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        if (saturation > 80) {
            features.push('高饱和');
        } else if (saturation > 40) {
            features.push('中饱和');
        } else {
            features.push('低饱和');
        }

        return features.join(', ');
    }

    /**
     * 更新调试面板内容
     */
    private updateDebugPanel(info: any): void {
        const content = this.debugPanel?.querySelector('#color-debug-content');
        if (!content) return;

        if (info.error) {
            content.innerHTML = `
                <div style="color: #FF6B6B;">
                    ❌ ${info.error}
                </div>
                <div style="margin-top: 5px; color: #AAA;">
                    位置: ${info.lat.toFixed(4)}, ${info.lng.toFixed(4)}
                </div>
            `;
            return;
        }

        const { r, g, b, variance, brightness, analysis } = info;
        const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

        content.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>位置:</strong> ${info.lat.toFixed(4)}, ${info.lng.toFixed(4)}
            </div>
            <div style="margin-bottom: 8px;">
                <div style="
                    width: 100%;
                    height: 60px;
                    background: ${hexColor};
                    border: 2px solid white;
                    border-radius: 4px;
                    margin: 5px 0;
                "></div>
            </div>
            <div style="margin-bottom: 5px;">
                <strong>瓦片真实颜色 (100×100像素平均值):</strong>
            </div>
            <div style="margin-bottom: 5px; font-size: 14px; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
                <div>R: ${r}</div>
                <div>G: ${g}</div>
                <div>B: ${b}</div>
            </div>
            <div style="margin-bottom: 5px;">
                <strong>HEX:</strong> ${hexColor}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>亮度:</strong> ${brightness}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>纹理(标准差):</strong> ${info.variance ? info.variance.toFixed(1) : 'N/A'}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>特征:</strong> ${analysis}
            </div>
            <div style="padding: 8px; background: rgba(34,197,94,0.2); border-left: 3px solid #22C55E; border-radius: 4px;">
                <div style="color: #22C55E; margin-bottom: 5px; font-weight: bold;">📝 请标注这个颜色：</div>
                <div style="color: #FFF; font-size: 13px;">
                    这是 <strong>平速（平原）</strong> 还是 <strong>慢速（山地/河流）</strong>？
                </div>
            </div>
        `;
    }

    /**
     * 检查是否激活
     */
    public isActivated(): boolean {
        return this.isActive;
    }
}
