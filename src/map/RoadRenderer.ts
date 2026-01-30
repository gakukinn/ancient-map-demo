import L from 'leaflet';
import { GameMap } from './GameMap';
import { RoadLayer } from './RoadLayer';

/**
 * RoadRenderer - 道路渲染管理器
 * 
 * 现已重构为使用高性能的 Canvas Overlay (RoadLayer)。
 * 本类主要负责图层的生命周期管理和对外接口。
 */
export class RoadRenderer {
    private map: GameMap;
    private roadLayer: RoadLayer;

    constructor(map: GameMap) {
        this.map = map;
        this.roadLayer = new RoadLayer();
        this.map.getLeafletMap().addLayer(this.roadLayer);
    }

    /**
     * 获取 Leaflet 地图实例 (供 RoadEditor 等使用)
     */
    public getLeafletMap(): L.Map {
        return this.map.getLeafletMap();
    }

    /**
     * 重新渲染所有道路
     * 实际上调用 Canvas Layer 的重绘方法
     */
    public render(): void {
        this.roadLayer.redraw();
        console.log(`🛣️ [RoadRenderer] Redraw requested`);
    }

    public clear(): void {
        // 对于我们的 Canvas Overlay，目前只需要重绘即可，
        // 如果数据已清空，redraw 自然会清空画布
        this.roadLayer.redraw();
    }

    public toggle(visible: boolean): void {
        const map = this.map.getLeafletMap();
        if (visible) {
            if (!map.hasLayer(this.roadLayer)) {
                map.addLayer(this.roadLayer);
            }
        } else {
            if (map.hasLayer(this.roadLayer)) {
                map.removeLayer(this.roadLayer);
            }
        }
    }
}
