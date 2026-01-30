import { IEditor } from './UnifiedEditorManager';
import { SpeedOverlayRenderer, ToolType, BrushSize } from '../map/SpeedOverlayRenderer';
import { GridSystem } from '../systems/GridSystem';
import { TerrainSpeedSystem, TerrainSpeed } from './TerrainSpeedSystem';

/**
 * TerrainMaskEditor - 地形属性编辑器
 * 
 * 与 CityEditor / RoadEditor 格式统一：
 * - 独立的 UI 面板 (createUI)
 * - show() / hide() / isVisible()
 * - 通过 UnifiedEditorManager 管理
 */
export class MaskEditorAdapter implements IEditor {
    public name: string = '地形编辑器';
    public icon: string = '⛰️';

    private container: HTMLElement | null = null;
    private _visible: boolean = false;
    private speedOverlay: SpeedOverlayRenderer;
    private fileHandle: any = null;

    constructor(speedOverlay: SpeedOverlayRenderer) {
        this.speedOverlay = speedOverlay;
        this.createUI();
    }

    public show(): void {
        this._visible = true;
        this.speedOverlay.setEditMode(true);
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    public hide(): void {
        this._visible = false;
        this.speedOverlay.setEditMode(false);
        this.speedOverlay.saveQuietly();
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    public isVisible(): boolean {
        return this._visible;
    }

    private createUI(): void {
        // 清理旧的 DOM 元素
        const old = document.getElementById('terrain-mask-editor');
        if (old) old.remove();

        this.container = document.createElement('div');
        this.container.id = 'terrain-mask-editor';
        this.container.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 320px;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 15px;
            border-radius: 8px;
            display: none;
            z-index: 10000;
            font-family: 'Microsoft YaHei', monospace;
            border: 1px solid #8B4513;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            max-height: 80vh;
            overflow-y: auto;
        `;

        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #8B4513;">⛰️ 地形编辑器</h3>
            
            <div style="background: #2a1a0a; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 12px; color: #d4a574;">
                💡 点击地图上的六边格修改地形属性。数据保存在 TerrainData.ts 中。
            </div>

            <!-- 地形类型 -->
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">地形类型</div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    <button id="tm-paint-normal" class="tm-tool-btn tm-active" title="平原 (正常移动)">🌿 平原</button>
                    <button id="tm-paint-slow" class="tm-tool-btn" title="山地/森林 (慢速移动)">🏔️ 山地</button>
                    <button id="tm-paint-water" class="tm-tool-btn" title="河流 (可通行水域)">💧 河流</button>
                    <button id="tm-paint-ocean" class="tm-tool-btn" title="深海 (不可通行)">🌊 深海</button>
                    <button id="tm-eraser" class="tm-tool-btn" title="清除修改 (恢复自动识别)">🧹 清除</button>
                </div>
            </div>

            <!-- 画笔大小 -->
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">画笔大小</div>
                <div style="display: flex; gap: 5px;">
                    <button id="tm-brush-1" class="tm-tool-btn tm-active" title="1个六边形">小(1)</button>
                    <button id="tm-brush-7" class="tm-tool-btn" title="7个六边形">中(7)</button>
                    <button id="tm-brush-19" class="tm-tool-btn" title="19个六边形">大(19)</button>
                </div>
            </div>

            <!-- 操作 -->
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">操作</div>
                <div style="display: flex; gap: 5px;">
                    <button id="tm-undo" class="tm-tool-btn" title="撤销 (Ctrl+Z)">↩️ 撤销</button>
                    <button id="tm-redo" class="tm-tool-btn" title="重做 (Ctrl+Y)">↪️ 重做</button>
                </div>
            </div>

            <!-- 存档 (New File System API) -->
            <div style="margin-bottom: 15px; border-top: 1px solid #444; padding-top: 10px;">
                <div style="font-size: 12px; color: #ffd700; margin-bottom: 5px;">💾 数据保存 (推荐)</div>
                <button id="tm-link-file" class="tm-tool-btn" style="width: 100%; background: #607D8B; border-color: #455A64; margin-bottom: 5px;">
                    📂 关联 TerrainData.ts
                </button>
                <button id="tm-save-file-btn" class="tm-tool-btn" style="width: 100%; background: #4CAF50; border-color: #388E3C; font-weight: bold; display: none;">
                    💾 保存所有更改
                </button>
                <div id="tm-file-status" style="font-size: 11px; color: #aaa; text-align: center;">未关联文件</div>
            </div>

            <!-- Global Actions -->
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">自动化流程</div>
                <div style="display: flex; gap: 5px; flex-direction: column;">
                    <button id="tm-scan-water" class="tm-tool-btn" style="background: #009688; border-color: #00796B; font-weight: bold;">
                        🌊 全图识别 (Bake World)
                    </button>
                </div>
            </div>
            
            <hr style="border-color: #444; margin: 15px 0;">

            <!-- Legacy / Backup -->
            <button id="tm-copy-ts" class="tm-tool-btn" style="width: 100%; background: #333; border: 1px dashed #666; color: #aaa; margin-bottom: 10px; font-size: 11px;" title="手动复制数据代码作为备份">
                📋 复制数据为 TS 代码 (备用)
            </button>

            <div id="tm-status" style="font-size: 11px; color: #888; min-height: 1.2em;"></div>

            <style>
                .tm-tool-btn {
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                .tm-tool-btn:hover {
                    background: #444;
                    border-color: #777;
                }
                .tm-tool-btn.tm-active {
                    background: #8B4513;
                    border-color: #D2691E;
                }
            </style>
        `;

        document.body.appendChild(this.container);
        this.bindEvents();
    }

    private bindEvents(): void {
        if (!this.container) return;

        // Tool type buttons
        const toolButtons: { id: string; type: ToolType }[] = [
            { id: 'tm-paint-normal', type: 'paint-normal' },
            { id: 'tm-paint-slow', type: 'paint-slow' },
            { id: 'tm-paint-water', type: 'paint-water' },
            { id: 'tm-paint-ocean', type: 'paint-ocean' },
            { id: 'tm-eraser', type: 'eraser' },
        ];

        toolButtons.forEach(({ id, type }) => {
            const btn = this.container!.querySelector(`#${id}`) as HTMLButtonElement;
            if (btn) {
                btn.onclick = () => {
                    this.speedOverlay.setToolType(type);
                    this.setActiveButton(id, ['tm-paint-normal', 'tm-paint-slow', 'tm-paint-water', 'tm-paint-ocean', 'tm-eraser']);
                };
            }
        });

        // Brush size buttons
        const brushButtons: { id: string; size: BrushSize }[] = [
            { id: 'tm-brush-1', size: 1 },
            { id: 'tm-brush-7', size: 7 },
            { id: 'tm-brush-19', size: 19 },
        ];

        brushButtons.forEach(({ id, size }) => {
            const btn = this.container!.querySelector(`#${id}`) as HTMLButtonElement;
            if (btn) {
                btn.onclick = () => {
                    this.speedOverlay.setBrushSize(size);
                    this.setActiveButton(id, ['tm-brush-1', 'tm-brush-7', 'tm-brush-19']);
                };
            }
        });

        // Undo/Redo
        // Note: undo/redo not implemented in SpeedOverlayRenderer
        // const undoBtn = this.container.querySelector('#tm-undo') as HTMLButtonElement;
        // const redoBtn = this.container.querySelector('#tm-redo') as HTMLButtonElement;

        // File System API Handlers
        const linkFileBtn = this.container.querySelector('#tm-link-file') as HTMLButtonElement;
        const saveBtn = this.container.querySelector('#tm-save-file-btn') as HTMLButtonElement;
        const statusEl = this.container.querySelector('#tm-file-status');

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
                    if (handle.name !== 'TerrainData.ts') {
                        const confirmLink = window.confirm(
                            `⚠️ 安全警告\n\n` +
                            `您选择的文件是 "${handle.name}"，\n` +
                            `但地形编辑器需要关联 "TerrainData.ts"。\n\n` +
                            `如果继续并保存，可能会覆盖错误的文件，导致数据丢失！\n\n` +
                            `是否强制继续？`
                        );
                        if (!confirmLink) {
                            console.log('[MaskEditor] 用户取消了错误文件的关联');
                            return;
                        }
                    }

                    this.fileHandle = handle;
                    if (statusEl) {
                        statusEl.textContent = `✅ 已关联: ${handle.name}`;
                        (statusEl as HTMLElement).style.color = '#4CAF50';
                    }
                    if (saveBtn) saveBtn.style.display = 'block';
                } catch (e) {
                    console.log('File selection cancelled', e);
                }
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.handleSaveTerrainData();
        }

        // Step 1: Water Only
        const scanWaterBtn = this.container.querySelector('#tm-scan-water') as HTMLButtonElement;
        if (scanWaterBtn) {
            scanWaterBtn.onclick = async () => {
                this.setStatus('⏳ 正在进行全图识别...');
                scanWaterBtn.disabled = true;
                scanWaterBtn.textContent = '🔄 分析中...';

                try {
                    // Switch to bakeWorld for full map processing
                    await this.speedOverlay.bakeWorld();
                    this.setStatus('✅ 全图识别完成！');
                } catch (e) {
                    console.error(e);
                    this.setStatus('❌ 识别失败');
                } finally {
                    scanWaterBtn.disabled = false;
                    scanWaterBtn.textContent = '🌊 全图识别 (Bake World) (海陆分离)';
                }
            };
        }

        // Copy as TS
        const copyTsBtn = this.container.querySelector('#tm-copy-ts') as HTMLButtonElement;
        if (copyTsBtn) {
            copyTsBtn.onclick = () => {
                // Get JSON string from override manager via speedOverlay
                // [OPTIMIZATION] Use differential export
                const resolver = (q: number, r: number) => {
                    const center = GridSystem.axialToLatLng(q, r);
                    // Force use of Cached/Auto logic to see what the "default" is
                    // But we need the RAW auto-detection, not the cached/overridden one.
                    // TerrainSpeedSystem.classifyTerrainByColor is what we want.

                    // Hack: accessing private colorSampler from SpeedOverlayRenderer would be ideal, 
                    // but we can assume TerrainSpeedSystem has the shared sampler if initialized.
                    // Actually TerrainSpeedSystem.getHexSpeedAsync uses the sampler.

                    // Faster way: We need to access the sampler from speedOverlay
                    const sampler = (this.speedOverlay as any).colorSampler;
                    if (!sampler) return TerrainSpeed.SLOW;

                    const color = sampler.getColorAt(center.lat, center.lng);
                    if (!color) return TerrainSpeed.SLOW;
                    return TerrainSpeedSystem.classifyTerrainByColor(color);
                };

                const jsonData = this.speedOverlay.getOverrideManager().exportData(resolver);
                const tsCode = `import { TerrainSpeed } from '../core/TerrainSpeedSystem';\nexport const TERRAIN_OVERRIDE_DATA: Record<string, TerrainSpeed> = ${jsonData};`;
                navigator.clipboard.writeText(tsCode).then(() => {
                    this.setStatus('✅ 已优化并复制 TypeScript 代码 (仅包含差异数据)');
                }).catch(() => {
                    this.setStatus('❌ 复制失败');
                });
            };
        }
    }

    private async handleSaveTerrainData(): Promise<void> {
        if (!this.fileHandle) return;

        try {
            // [OPTIMIZATION] Use differential export
            const resolver = (q: number, r: number) => {
                const center = GridSystem.axialToLatLng(q, r);
                const sampler = (this.speedOverlay as any).colorSampler;
                if (!sampler) return TerrainSpeed.SLOW;

                const color = sampler.getColorAt(center.lat, center.lng);
                if (!color) return TerrainSpeed.SLOW;
                return TerrainSpeedSystem.classifyTerrainByColor(color);
            };

            const jsonData = this.speedOverlay.getOverrideManager().exportData(resolver);

            // Format as readable TS file matching TerrainData.ts structure
            const code = `/**
 * TerrainData.ts
 * 
 * 地形覆盖数据 (与 cities.ts / RoadData.ts 格式统一)
 * 自动生成 - 请通过地形编辑器修改
 * [OPTIMIZED] 仅包含人工修正的差异数据
 * 
 * 数据格式: { 'q,r': 'NORMAL' | 'SLOW' | 'WATER' | 'OCEAN' }
 */

import { TerrainSpeed } from '../core/TerrainSpeedSystem';

export const TERRAIN_OVERRIDE_DATA: Record<string, TerrainSpeed> = ${jsonData};

export function getTerrainDataCount(): number {
    return Object.keys(TERRAIN_OVERRIDE_DATA).length;
}
`;

            const writable = await this.fileHandle.createWritable();
            await writable.write(code);
            await writable.close();

            this.setStatus('✅ 保存成功！已同步到 TerrainData.ts');
            // Flash effect
            const btn = this.container?.querySelector('#tm-save-file-btn') as HTMLElement;
            if (btn) {
                const originalBg = btn.style.background;
                btn.style.background = '#4CAF50';
                setTimeout(() => btn.style.background = originalBg, 1000);
            }
        } catch (err) {
            console.error('保存失败:', err);
            this.setStatus('❌ 保存失败，请检查文件权限');
        }
    }

    private setActiveButton(activeId: string, allIds: string[]): void {
        allIds.forEach(id => {
            const btn = this.container?.querySelector(`#${id}`);
            if (btn) {
                btn.classList.toggle('tm-active', id === activeId);
            }
        });
    }

    private setStatus(msg: string): void {
        const status = this.container?.querySelector('#tm-status');
        if (status) status.textContent = msg;
    }
}
