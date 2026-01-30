import { CityManager } from './CityManager';
import { CUSTOM_ROADS_DATA, DISABLED_ROADS_DATA } from '../data/RoadData';
import { roadRegistry } from './RoadRegistry';
import { RoadRenderer } from '../map/RoadRenderer';
import { GridSystem, Hex } from '../systems/GridSystem';
import L from 'leaflet';
import { IEditor } from './UnifiedEditorManager';

/**
 * RoadEditor - 道路编辑器 (极简纯手动版)
 * 
 * 仅包含“画路”功能。AI 和玩家完全根据所画路径移动。
 */
export class RoadEditor implements IEditor {
    public name: string = '道路';
    public icon: string = '🚧';

    private container: HTMLElement | null = null;
    private _visible: boolean = false;
    private cityManager: CityManager;
    private roadRenderer: RoadRenderer;

    private fileHandle: any = null; // RoadData.ts

    // 六边形道路编辑模式状态
    private isHexEditMode: boolean = false;
    private roadHexes: Set<string> = new Set();
    private disabledHexes: Set<string> = new Set();
    private mapClickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;
    private historyStack: string[] = [];

    constructor(cityManager: CityManager, roadRenderer: RoadRenderer) {
        this.cityManager = cityManager;
        this.roadRenderer = roadRenderer;
        this.createUI();
        // this.bindGlobalToggle(); // Removed

        this.roadHexes = new Set(roadRegistry.getCustomRoadHexes());
        this.disabledHexes = new Set(roadRegistry.getDisabledRoadHexes());
    }

    public show(): void {
        this._visible = true;
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    public hide(): void {
        this._visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.isHexEditMode) {
            this.exitHexEditMode();
        }
        this.roadRenderer.render();
    }

    public isVisible(): boolean {
        return this._visible;
    }

    private createUI(): void {
        const old = document.getElementById('road-editor');
        if (old) old.remove();

        this.container = document.createElement('div');
        this.container.id = 'road-editor';
        this.container.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 15px;
            border-radius: 8px;
            display: none;
            z-index: 10000;
            font-family: 'Microsoft YaHei', monospace;
            border: 1px solid #ffd700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ffd700;">🛤️ 道路建设 (极简版)</h3>
            
                点击 <b>“✏️ 开始绘路”</b> 按钮，然后在地图上点击格子铺设道路（自动匹配地形纹理）。AI 将自动沿路寻找目标。
            
            <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                <button id="road-hex-edit-btn" style="flex: 2; background: #9C27B0; color: white; border: none; padding: 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">
                    ✏️ 开始绘路
                </button>
                <button id="road-undo-hex-btn" style="flex: 1; background: #FF9800; color: white; border: none; padding: 10px; cursor: pointer; border-radius: 4px;">
                    ↩️ 撤销
                </button>
            </div>
            
            <hr style="border-color: #444; margin: 15px 0;">
            
            <div style="margin-bottom: 5px;">
                <button id="road-link-file" style="width: 100%; background: #607D8B; color: white; border: none; padding: 8px; cursor: pointer; border-radius: 4px; font-size: 12px;">
                    📂 关联 RoadData.ts
                </button>
                <button id="road-save-file-btn" style="width: 100%; background: #795548; color: white; border: none; padding: 12px; cursor: pointer; border-radius: 4px; margin-top: 8px; display: none; font-weight: bold;">
                    💾 保存到代码文件
                </button>
                <div id="road-file-status" style="font-size: 11px; color: #888; margin-top: 5px; text-align: center;">未关联数据文件</div>
            </div>
            
            <div id="road-status" style="font-size: 12px; color: #ffd700; margin-top: 10px; min-height: 1.2em; text-align: center;"></div>
        `;

        document.body.appendChild(this.container);
        this.bindEvents();
    }

    private toggle(): void {
        if (this._visible) this.hide();
        else this.show();
    }

    private bindEvents(): void {
        const linkFileBtn = document.getElementById('road-link-file');
        const saveBtn = document.getElementById('road-save-file-btn');
        const hexEditBtn = document.getElementById('road-hex-edit-btn');
        const undoBtn = document.getElementById('road-undo-hex-btn');

        if (linkFileBtn) {
            linkFileBtn.onclick = async () => {
                try {
                    const [handle] = await (window as any).showOpenFilePicker({
                        types: [{
                            description: 'TypeScript Files',
                            accept: { 'text/typescript': ['.ts'] }
                        }]
                    });

                    // [SAFETY] 文件名校验：防止误关联错误文件
                    if (handle.name !== 'RoadData.ts') {
                        const confirmLink = window.confirm(
                            `⚠️ 安全警告\n\n` +
                            `您选择的文件是 "${handle.name}"，\n` +
                            `但道路编辑器需要关联 "RoadData.ts"。\n\n` +
                            `如果继续并保存，可能会覆盖错误的文件，导致数据丢失！\n\n` +
                            `是否强制继续？`
                        );
                        if (!confirmLink) {
                            console.log('[RoadEditor] 用户取消了错误文件的关联');
                            return;
                        }
                    }

                    this.fileHandle = handle;
                    const status = document.getElementById('road-file-status');
                    if (status) {
                        status.innerText = `✅ 已关联: ${handle.name}`;
                        status.style.color = '#4CAF50';
                    }
                    if (saveBtn) saveBtn.style.display = 'block';
                } catch (e) { console.log('File selection cancelled'); }
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.handleSaveRoadData();
        }

        if (hexEditBtn) {
            hexEditBtn.onclick = () => this.toggleHexEditMode();
        }

        if (undoBtn) {
            undoBtn.onclick = () => this.undoLastHexAction();
        }
    }

    private async handleSaveRoadData(): Promise<void> {
        if (!this.fileHandle) return;

        try {
            const customRoads = Array.from(this.roadHexes);
            const disabledRoads = Array.from(this.disabledHexes);

            const code = `// 道路物理格点数据 (黄格)
export const CUSTOM_ROADS_DATA: string[] = ${JSON.stringify(customRoads, null, 4)};

// 禁用的道路格子
export const DISABLED_ROADS_DATA: string[] = ${JSON.stringify(disabledRoads, null, 4)};
`;

            const writable = await this.fileHandle.createWritable();
            await writable.write(code);
            await writable.close();

            this.setStatus('✅ 保存成功！');
            alert('✅ 道路数据已同步到工程文件！');
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败，请检查文件权限。');
        }
    }

    public onCityClick(cityId: string, cityName: string, e?: L.LeafletMouseEvent): boolean {
        if (!this.isVisible) return false;
        if (this.isHexEditMode) {
            const pos = this.cityManager.getCity(cityId);
            if (pos) {
                const hex = GridSystem.latLngToAxial(pos.latitude, pos.longitude);
                this.toggleRoadHex(hex.q, hex.r);
            }
            return true;
        }
        return false;
    }

    public isHexEditing(): boolean {
        return this.isHexEditMode;
    }

    private toggleHexEditMode(): void {
        if (this.isHexEditMode) this.exitHexEditMode();
        else this.enterHexDrawMode();
    }

    private enterHexDrawMode(): void {
        this.isHexEditMode = true;
        this.setStatus('✏️ 绘路模式已开启');
        const map = this.roadRenderer.getLeafletMap();
        if (map) {
            this.mapClickHandler = (e) => this.onMapClickToggleHex(e);
            map.on('click', this.mapClickHandler);
            map.getContainer().style.cursor = 'crosshair';
        }
        // [FIX] Make cities transparent (40%) and click-through
        this.cityManager.setCityTransparency(0.4, false);

        const btn = document.getElementById('road-hex-edit-btn');
        if (btn) { btn.innerText = '💾 完成绘路'; btn.style.background = '#E91E63'; }
        this.historyStack = [];
    }

    private exitHexEditMode(): void {
        this.isHexEditMode = false;
        this.setStatus('✅ 已退出绘路模式');
        const map = this.roadRenderer.getLeafletMap();
        if (map && this.mapClickHandler) {
            map.off('click', this.mapClickHandler);
            this.mapClickHandler = null;
            map.getContainer().style.cursor = '';
        }
        // [FIX] Restore city opacity and interaction
        this.cityManager.setCityTransparency(1.0, true);
        // [FIX] REMOVED DANGEROUS RELOAD: roadRegistry.reloadCustomRoadHexes();
        // This was causing the "ghost" behavior where edits vanish upon exit.
        const btn = document.getElementById('road-hex-edit-btn');
        if (btn) { btn.innerText = '✏️ 开始绘路'; btn.style.background = '#9C27B0'; }
    }

    private onMapClickToggleHex(e: L.LeafletMouseEvent): void {
        const hex = GridSystem.latLngToAxial(e.latlng.lat, e.latlng.lng);
        this.toggleRoadHex(hex.q, hex.r);
    }

    private toggleRoadHex(q: number, r: number): void {
        const key = `${q},${r}`;
        this.historyStack.push(key + ':' + (this.roadHexes.has(key) ? 'remove' : 'add'));

        if (this.roadHexes.has(key)) {
            this.roadHexes.delete(key);
            this.setStatus(`🗑️ 移除: ${key}`);
        } else {
            this.roadHexes.add(key);
            this.setStatus(`➕ 添加: ${key}`);
        }

        roadRegistry.updateCustomRoadHexes(this.roadHexes);
        this.roadRenderer.render();

        // 自动保存到 localStorage
        localStorage.setItem('mapwar_road_hexes', JSON.stringify(Array.from(this.roadHexes)));
    }

    private undoLastHexAction(): void {
        if (this.historyStack.length === 0) return;
        const last = this.historyStack.pop()!;
        const [key, action] = last.split(':');
        if (action === 'add') this.roadHexes.delete(key);
        else this.roadHexes.add(key);

        roadRegistry.updateCustomRoadHexes(this.roadHexes);
        this.roadRenderer.render();
        localStorage.setItem('mapwar_road_hexes', JSON.stringify(Array.from(this.roadHexes)));
        this.setStatus(`↩️ 撤销: ${key}`);
    }

    private clearAllRoadHexes(): void {
        this.roadHexes.clear();
        roadRegistry.updateCustomRoadHexes(this.roadHexes);
        this.roadRenderer.render();
        localStorage.setItem('mapwar_road_hexes', JSON.stringify([]));
        this.setStatus('🗑️ 已清空');
    }

    private setStatus(msg: string): void {
        const el = document.getElementById('road-status');
        if (el) el.textContent = msg;
    }
}
