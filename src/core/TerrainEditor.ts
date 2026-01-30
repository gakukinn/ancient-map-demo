import { IEditor } from './UnifiedEditorManager';
import { GameMap } from '../map/GameMap';

/**
 * TerrainEditor - 地形显示编辑器
 * 
 * 控制地图的视觉显示参数：
 * - 地图源 (ESRI / Local)
 * - Hillshade 参数 (Z-Factor, Opacity, Sun Alt)
 * - 美术滤镜 (Sepia, Saturation, Contrast)
 * - 图层开关 (River, Faction, Grid, Road, Terrain, Showcase)
 */
export class TerrainEditor implements IEditor {
    public name: string = '样板';
    public icon: string = '🗺️';

    private container: HTMLElement | null = null;
    private _visible: boolean = false;
    private map: GameMap;

    constructor(map: GameMap) {
        this.map = map;
        this.createUI();
    }

    public show(): void {
        this._visible = true;
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    public hide(): void {
        this._visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    public isVisible(): boolean {
        return this._visible;
    }

    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'terrain-editor';
        this.container.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 260px;
            background: rgba(255, 255, 255, 0.95);
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            display: none;
            flex-direction: column;
            gap: 8px;
            z-index: 10000;
            font-family: 'Microsoft YaHei', sans-serif;
            max-height: 70vh;
            overflow-y: auto;
        `;

        this.container.innerHTML = `
            <div style="font-weight:bold;margin-bottom:4px;font-size:14px;color:#333;display:flex;justify-content:space-between;align-items:center;">
                <span>🌍 地形显示设置</span>
                <span style="font-size:10px;color:#999;">Visual</span>
            </div>
            
            <button id="btn-source-esri" style="padding:6px;cursor:pointer;background:#4a90e2;color:white;border:none;border-radius:4px;font-weight:bold;">
                ⛰️ 立体地形 (ESRI)
            </button>
            
            <button id="btn-source-local" style="padding:6px;cursor:pointer;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;color:#333;">
                🗺️ 原始地图 (Local)
            </button>
            
            <hr style="margin:4px 0;width:100%;border:0;border-top:1px solid #eee;">
            
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#333;">
                <input type="checkbox" id="chk-hillshade" checked> 
                <b>📐 开启山体高度增强</b>
            </label>

            <div id="hillshade-controls" style="margin-left:10px;display:flex;flex-direction:column;gap:4px;padding:5px;background:#f9f9f9;border-radius:4px;">
                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    立体强度 (Z) <span id="val-z">25.0</span>
                </label>
                <input type="range" id="rng-z" min="10.0" max="100.0" step="1.0" value="25.0" style="width:100%;">
                
                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    阴影浓度 (Op) <span id="val-o">90%</span>
                </label>
                <input type="range" id="rng-o" min="0.1" max="1.5" step="0.1" value="0.9" style="width:100%;">

                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    阳光角度 (Alt) <span id="val-a">45°</span>
                </label>
                <input type="range" id="rng-a" min="10" max="80" step="5" value="45" style="width:100%;">
            </div>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#2e7d32;margin-top:2px;">
                <input type="checkbox" id="chk-elev-color" checked> 
                <b>🎨 海拔分层着色</b>
            </label>

            <hr style="margin:8px 0;width:100%;border:0;border-top:1px solid #eee;">
            
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#333;margin-bottom:4px;">
                <input type="checkbox" id="chk-style"> 
                <b>🎨 开启美术滤镜</b>
            </label>

            <div id="style-controls" style="margin-left:10px;display:none;flex-direction:column;gap:4px;padding:5px;background:#f9f9f9;border-radius:4px;">
                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    复古做旧 (Sep) <span id="val-sep">0%</span>
                </label>
                <input type="range" id="rng-sep" min="0" max="100" step="5" value="0" style="width:100%;">

                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    色彩饱和 (Sat) <span id="val-sat">100%</span>
                </label>
                <input type="range" id="rng-sat" min="0" max="200" step="10" value="100" style="width:100%;">
                
                <label style="font-size:11px;color:#666;display:flex;justify-content:space-between;">
                    对比度 (Con) <span id="val-con">100%</span>
                </label>
                <input type="range" id="rng-con" min="50" max="200" step="5" value="100" style="width:100%;">
            </div>

            <hr style="margin:4px 0;width:100%;border:0;border-top:1px solid #eee;">

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#0066cc;">
                <input type="checkbox" id="chk-river" checked>  
                <b>💧 开启河流图层</b>
            </label>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#d32f2f;">
                <input type="checkbox" id="chk-faction" checked> 
                <b>🚩 开启势力区域</b>
            </label>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#333;">
                <input type="checkbox" id="chk-grid"> 
                <b>🌐 开启战略网格</b>
            </label>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#FFD700;">
                <input type="checkbox" id="chk-road" checked> 
                <b>🛣️ 开启道路网络</b>
            </label>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#8B4513;">
                <input type="checkbox" id="chk-terrain"> 
                <b>⛰️ 开启地形覆盖</b>
            </label>

            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#9c27b0;">
                <input type="checkbox" id="chk-showcase"> 
                <b>♟️ 开启兵种展示</b>
            </label>

            <button id="btn-test-battle" style="margin-top:8px;padding:8px 12px;cursor:pointer;background:#e91e63;color:white;border:none;border-radius:4px;font-weight:bold;font-size:12px;">
                ⚔️ 测试战斗动画
            </button>
        `;

        document.body.appendChild(this.container);
        this.bindEvents();
    }

    private bindEvents(): void {
        const btnEsri = this.container!.querySelector('#btn-source-esri') as HTMLButtonElement;
        const btnLocal = this.container!.querySelector('#btn-source-local') as HTMLButtonElement;
        const chkHillshade = this.container!.querySelector('#chk-hillshade') as HTMLInputElement;
        const chkRiver = this.container!.querySelector('#chk-river') as HTMLInputElement;

        if (btnEsri) btnEsri.onclick = () => this.map.setMapSource('ESRI_SHADED');
        if (btnLocal) btnLocal.onclick = () => this.map.setMapSource('LOCAL');

        if (chkHillshade) {
            chkHillshade.onchange = (e: any) => {
                const isChecked = e.target.checked;
                this.map.toggleHillshade(isChecked);
                const controls = this.container!.querySelector('#hillshade-controls') as HTMLElement;
                if (controls) controls.style.display = isChecked ? 'flex' : 'none';

                // Auto Link Elevation Color
                if (isChecked) {
                    const chkElevColor = this.container!.querySelector('#chk-elev-color') as HTMLInputElement;
                    if (chkElevColor && !chkElevColor.checked) {
                        chkElevColor.checked = true;
                        chkElevColor.dispatchEvent(new Event('change'));
                    }
                }
            };
        }

        // Sliders
        const rngZ = this.container!.querySelector('#rng-z') as HTMLInputElement;
        const rngO = this.container!.querySelector('#rng-o') as HTMLInputElement;
        const rngA = this.container!.querySelector('#rng-a') as HTMLInputElement;

        const valZ = this.container!.querySelector('#val-z');
        const valO = this.container!.querySelector('#val-o');
        const valA = this.container!.querySelector('#val-a');

        const updateTerrain = () => {
            const z = parseFloat(rngZ.value);
            const o = parseFloat(rngO.value);
            const a = parseInt(rngA.value);
            const chkElevColor = this.container!.querySelector('#chk-elev-color') as HTMLInputElement;
            const useElevColor = chkElevColor ? chkElevColor.checked : false;

            if (valZ) valZ.textContent = z.toFixed(1);
            if (valO) valO.textContent = Math.round(o * 100) + '%';
            if (valA) valA.textContent = a + '°';

            // Access via public API on Map (will add shortly)
            // or directly access layer if we modify GameMap to expose it or a setter
            // Current GameMap has separate setters, let's look at GameMap again to see how `setParams` was called.
            // It was accessing `this.hillshadeLayer` directly. We need `map.setHillshadeParams(...)`.

            // For now, we assume GameMap will be updated to support this.
            (this.map as any).setHillshadeParams({ zFactor: z, shadowOpacity: o, altitude: a, useElevationColor: useElevColor });
        };

        const chkElevColor = this.container!.querySelector('#chk-elev-color') as HTMLInputElement;
        if (chkElevColor) {
            chkElevColor.onchange = () => {
                updateTerrain();
                if (chkElevColor.checked) {
                    const chkHill = this.container!.querySelector('#chk-hillshade') as HTMLInputElement;
                    if (chkHill && !chkHill.checked) {
                        chkHill.checked = true;
                        chkHill.dispatchEvent(new Event('change'));
                    }
                }
            };
        }

        if (rngZ) { rngZ.oninput = updateTerrain; }
        if (rngO) { rngO.oninput = updateTerrain; }
        if (rngA) { rngA.oninput = updateTerrain; }


        // Style Sliders
        const chkStyle = this.container!.querySelector('#chk-style') as HTMLInputElement;
        const styleControls = this.container!.querySelector('#style-controls') as HTMLElement;
        const rngSep = this.container!.querySelector('#rng-sep') as HTMLInputElement;
        const rngSat = this.container!.querySelector('#rng-sat') as HTMLInputElement;
        const rngCon = this.container!.querySelector('#rng-con') as HTMLInputElement;

        const valSep = this.container!.querySelector('#val-sep');
        const valSat = this.container!.querySelector('#val-sat');
        const valCon = this.container!.querySelector('#val-con');

        const updateStyle = () => {
            const isEnabled = chkStyle ? chkStyle.checked : false;
            if (styleControls) styleControls.style.display = isEnabled ? 'flex' : 'none';

            const sep = rngSep.value;
            const sat = rngSat.value;
            const con = rngCon.value;

            if (valSep) valSep.textContent = sep + '%';
            if (valSat) valSat.textContent = sat + '%';
            if (valCon) valCon.textContent = con + '%';

            if (isEnabled) {
                this.map.setMapStyle(`sepia(${sep}%) saturate(${sat}%) contrast(${con}%)`);
            } else {
                this.map.setMapStyle('none');
            }
        };

        if (chkStyle) chkStyle.onchange = updateStyle;
        if (rngSep) { rngSep.oninput = updateStyle; }
        if (rngSat) { rngSat.oninput = updateStyle; }
        if (rngCon) { rngCon.oninput = updateStyle; }

        // Toggles
        const chkFaction = this.container!.querySelector('#chk-faction') as HTMLInputElement;
        if (chkFaction) {
            chkFaction.onchange = (e: any) => {
                window.dispatchEvent(new CustomEvent('toggle-faction-color', { detail: { visible: e.target.checked } }));
            };
        }

        if (chkRiver) {
            chkRiver.onchange = (e: any) => this.map.toggleRiver(e.target.checked);
        }

        const chkGrid = this.container!.querySelector('#chk-grid') as HTMLInputElement;
        if (chkGrid) chkGrid.onchange = (e: any) => this.map.toggleGrid(e.target.checked);

        const chkRoad = this.container!.querySelector('#chk-road') as HTMLInputElement;
        if (chkRoad) {
            chkRoad.onchange = (e: any) => {
                window.dispatchEvent(new CustomEvent('toggle-road-layer', { detail: { visible: e.target.checked } }));
            };
        }

        const chkTerrain = this.container!.querySelector('#chk-terrain') as HTMLInputElement;
        if (chkTerrain) {
            chkTerrain.onchange = (e: any) => {
                window.dispatchEvent(new CustomEvent('toggle-terrain-layer', { detail: { visible: e.target.checked } }));
            };
        }

        const chkShowcase = this.container!.querySelector('#chk-showcase') as HTMLInputElement;
        if (chkShowcase) {
            chkShowcase.onchange = (e: any) => {
                window.dispatchEvent(new CustomEvent('toggle-showcase-units', { detail: { visible: e.target.checked } }));
            };
        }



        // Test Battle
        const btnTestBattle = this.container!.querySelector('#btn-test-battle') as HTMLButtonElement;
        if (btnTestBattle) {
            let intervalId: any = null;
            btnTestBattle.onclick = () => {
                if (intervalId) {
                    // Stop
                    clearInterval(intervalId);
                    intervalId = null;
                    window.dispatchEvent(new CustomEvent('toggle-showcase-battle', { detail: { attacking: false } }));
                    btnTestBattle.textContent = '⚔️ 测试战斗动画';
                    btnTestBattle.style.background = '#e91e63';
                } else {
                    // Start Loop
                    if (chkShowcase && !chkShowcase.checked) {
                        chkShowcase.checked = true;
                        chkShowcase.dispatchEvent(new Event('change'));
                    }

                    let isAttacking = true;
                    // Initial Trigger
                    window.dispatchEvent(new CustomEvent('toggle-showcase-battle', { detail: { attacking: isAttacking } }));
                    btnTestBattle.textContent = '🔄 循环演示中 (10s)';
                    btnTestBattle.style.background = '#4caf50';

                    intervalId = setInterval(() => {
                        isAttacking = !isAttacking;
                        window.dispatchEvent(new CustomEvent('toggle-showcase-battle', { detail: { attacking: isAttacking } }));
                        btnTestBattle.textContent = isAttacking ? '⚔️ 演示中: 攻击' : '🏃 演示中: 移动';
                    }, 10000); // Toggle every 10 seconds
                }
            };
        }
    }
}
