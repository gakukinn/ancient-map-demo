import { City, CityType } from '../types/core';
import { CITIES } from '../data/cities';
import { CITY_CONFIG } from '../config/CityConfig';
import { FACTIONS } from '../data/factions';
import { CityManager } from './CityManager';
import { IEditor } from './UnifiedEditorManager';
import { pinyin } from 'pinyin-pro'; // [NEW] 拼音转换库

/**
 * CityEditor - 城市编辑器 (简化版 + 调试增强版)
 * 
 * 统一工作流：编辑表单 → 预览 → 关联文件 → 保存
 */
export class CityEditor implements IEditor {
    public name: string = '城市';
    public icon: string = '🏙️';

    private container: HTMLElement | null = null;
    private _visible: boolean = false;
    private map: any; // Leaflet map instance
    private cityManager: CityManager;
    private onAddCity: (cityData: any) => void;

    private selectedCityId: string | null = null;
    private previewCityId: string | null = null; // [NEW] 跟踪预览城市，防止重影
    private searchResults: any[] = [];
    private searchIndex: number = 0;
    private fileHandle: any = null;
    private isPicking: boolean = false;
    private pendingChanges: Map<string, string> = new Map(); // [BATCH] ID -> CodeBlock

    public isEditMode(): boolean {
        return this._visible;
    }

    public isPickingLocation(): boolean {
        return this.isPicking;
    }

    constructor(map: any, cityManager: CityManager, onAddCity: (cityData: any) => void) {
        this.map = map;
        this.cityManager = cityManager;
        this.onAddCity = onAddCity;
        this.createUI();
        // this.bindGlobalToggle(); // Removed
    }

    public show(): void {
        this._visible = true;
        this.cityManager.setEditorMode(true);
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    public hide(): void {
        this._visible = false;
        this.cityManager.setEditorMode(false);
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    public isVisible(): boolean {
        return this._visible;
    }

    private createUI(): void {
        // [Fix] 彻底清理所有残留的 DOM 元素（防止 HMR 导致多重残留）
        document.querySelectorAll('[id="city-editor"]').forEach(el => el.remove());

        this.container = document.createElement('div');
        this.container.id = 'city-editor';
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
            border: 1px solid #666;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            max-height: 80vh;
            overflow-y: auto;
        `;

        const typeOptions = Object.entries(CITY_CONFIG).map(([key, config]) =>
            `<option value="${key}" ${key === 'small_city' ? 'selected' : ''}>${config.name} (Max: ${config.maxTroops})</option>`
        ).join('');

        const factionOptions = FACTIONS.map(f =>
            `<option value="${f.id}" ${f.id === 'panjun' ? 'selected' : ''}>${f.name}</option>`
        ).join('');

        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ffd700;">🏙️ 城市编辑器</h3>
            
            <div id="ce-edit-hint" style="background: #2196F3; color: white; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 12px;">
                💡 点击地图上的城市可加载其数据进行修改
            </div>

            <!-- 城市信息表单 -->
            <div style="margin-bottom: 10px;">
                <label>城市 ID:</label>
                <input type="text" id="ce-id" placeholder="留空自动生成" style="width: 100%; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>城市名称:</label>
                <input type="text" id="ce-name" style="width: 100%; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>城市类型:</label>
                <select id="ce-type" style="width: 100%; background: #333; color: #fff; border: 1px solid #555; padding: 4px;">
                    ${typeOptions}
                </select>
            </div>

            <div style="margin-bottom: 10px;">
                <label>所属势力:</label>
                <select id="ce-faction" style="width: 100%; background: #333; color: #fff; border: 1px solid #555; padding: 4px;">
                    ${factionOptions}
                </select>
            </div>

            <div style="margin-bottom: 10px;">
                <label>区域风格 (可选覆盖):</label>
                <select id="ce-region" style="width: 100%; background: #333; color: #fff; border: 1px solid #555; padding: 4px;">
                    <option value="">-- 自动判定 --</option>
                    <option value="CENTRAL">中原 (CENTRAL)</option>
                    <option value="NORTH">北方 (NORTH)</option>
                    <option value="SOUTH">江南 (SOUTH)</option>
                    <option value="CHU_SHU">楚蜀 (CHU_SHU)</option>
                    <option value="LINGNAN">岭南 (LINGNAN)</option>
                    <option value="NORTHWEST">西北 (NORTHWEST)</option>
                    <option value="WESTERN">西域 (WESTERN)</option>
                    <option value="NOMADIC">塞外 (NOMADIC)</option>
                    <option value="NORTHEAST">东北 (NORTHEAST)</option>
                    <option value="TIBET">羌藏 (TIBET)</option>
                    <option value="JAPAN">日本 (JAPAN)</option>
                    <option value="KOREA">朝鲜 (KOREA)</option>
                </select>
            </div>

            <div style="margin-bottom: 10px;">
                <label>初始兵力:</label>
                <input type="number" id="ce-troops" value="1000" min="0" step="1000" style="width: 100%; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
            </div>



            <div style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="ce-mirror" style="width: 18px; height: 18px; cursor: pointer;">
                    <span>🔄 图片镜像 (水平翻转)</span>
                </label>
            </div>

            <div style="margin-bottom: 10px;">
                <label>坐标 (Lat, Lng):</label>
                <div style="display: flex; gap: 5px;">
                    <input type="number" id="ce-lat" step="any" placeholder="Lat" style="flex: 1; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
                    <input type="number" id="ce-lng" step="any" placeholder="Lng" style="flex: 1; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
                </div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button type="button" id="ce-pick-map" style="flex: 1; background: #607D8B; color: white; border: none; padding: 5px; cursor: pointer;">📍 地图取点</button>
                    <button type="button" id="ce-paste-coords" style="flex: 1; background: #009688; color: white; border: none; padding: 5px; cursor: pointer;">📋 粘贴坐标</button>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label>搜索坐标:</label>
                <div style="display: flex; gap: 5px;">
                    <input type="text" id="ce-search-query" placeholder="输入真实地名" style="flex: 1; background: #222; color: #fff; border: 1px solid #555; padding: 4px;">
                    <button type="button" id="ce-search-btn" style="background: #2196F3; color: white; border: none; padding: 5px 10px; cursor: pointer;">🔍</button>
                    <button type="button" id="ce-search-next" style="display:none; background: #FF9800; color: white; border: none; padding: 5px 10px; cursor: pointer;">➡️</button>
                </div>
            </div>

            <hr style="border-color: #444;">

            <!-- Step 1: 预览 -->
            <button type="button" id="ce-preview" style="width: 100%; background: #FF9800; color: white; border: none; padding: 10px; cursor: pointer; margin-bottom: 8px; font-weight: bold;">
                👁️ 预览城市 (临时显示在地图上)
            </button>

            <!-- Step 2: 关联文件 -->
            <button type="button" id="ce-link-file" style="width: 100%; background: #607D8B; color: white; border: none; padding: 8px; cursor: pointer;">📂 关联 src/data/cities.ts</button>
            <div id="ce-file-status" style="font-size: 11px; color: #888; margin-top: 3px; margin-bottom: 5px;">未关联文件</div>
            
            <!-- Pending Status -->
            <div id="ce-pending-status" style="font-size: 12px; color: #FF9800; margin-bottom: 10px; font-weight: bold; display: none;">
                ⚠️ 待保存变更: 0
            </div>

            <!-- Step 3: 保存 (始终可见) -->
            <!-- Step 3: 更新与新增 (区分操作) -->
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <button type="button" id="ce-update-btn" style="flex: 1; background: #4CAF50; color: white; border: none; padding: 10px; cursor: pointer; font-weight: bold;">💾 更新当前</button>
                <button type="button" id="ce-create-btn" style="flex: 1; background: #009688; color: white; border: none; padding: 10px; cursor: pointer; font-weight: bold;">➕ 新建城市</button>
            </div>

            <!-- 辅助功能 -->
            <button type="button" id="ce-copy-code" style="width: 100%; background: #9C27B0; color: white; border: none; padding: 8px; cursor: pointer; margin-top: 8px;">📋 复制代码到剪贴板</button>

            <div id="ce-status" style="font-size: 12px; color: #aaa; min-height: 1.2em; margin-top: 8px;"></div>
        `;

        document.body.appendChild(this.container);
        this.bindEvents();
        this.updatePendingUI();
    }

    public toggle(): void {
        if (this._visible) this.hide();
        else this.show();
    }

    public selectCityForEdit(city: any): void {
        if (!this.container) return;

        // 加载城市数据到表单 (scoped query)
        this.selectedCityId = city.id;
        (this.container.querySelector('#ce-id') as HTMLInputElement)!.value = city.id;
        (this.container.querySelector('#ce-name') as HTMLInputElement)!.value = city.name;
        (this.container.querySelector('#ce-type') as HTMLSelectElement)!.value = city.type;
        (this.container.querySelector('#ce-faction') as HTMLSelectElement)!.value = city.factionId;
        (this.container.querySelector('#ce-lat') as HTMLInputElement)!.value = city.latitude.toFixed(6);
        (this.container.querySelector('#ce-lng') as HTMLInputElement)!.value = city.longitude.toFixed(6);
        (this.container.querySelector('#ce-troops') as HTMLInputElement)!.value = Math.floor(city.troops).toString();

        (this.container.querySelector('#ce-mirror') as HTMLInputElement)!.checked = city.mirror || false;
        (this.container.querySelector('#ce-region') as HTMLSelectElement)!.value = city.region || '';

        this.setStatus(`已加载: ${city.name} (ID: ${city.id})`);

        // Auto-show if hidden
        if (!this.isVisible) this.toggle();
    }

    private bindEvents(): void {
        if (!this.container) return;

        // [关键修复] 使用 scoped query 确保操作的是当前容器内的元素
        const latInput = this.container.querySelector('#ce-lat') as HTMLInputElement;
        const lngInput = this.container.querySelector('#ce-lng') as HTMLInputElement;

        // File Link Button
        const linkFileBtn = this.container.querySelector('#ce-link-file') as HTMLButtonElement;
        const fileStatus = this.container.querySelector('#ce-file-status') as HTMLElement;

        const updateBtn = this.container.querySelector('#ce-update-btn') as HTMLButtonElement;
        const createBtn = this.container.querySelector('#ce-create-btn') as HTMLButtonElement;

        if (linkFileBtn) {
            linkFileBtn.onclick = async () => {
                try {
                    const [fileHandle] = await (window as any).showOpenFilePicker({
                        types: [{
                            description: 'TypeScript Files',
                            accept: { 'text/typescript': ['.ts'] }
                        }]
                    });

                    // [SAFETY] 文件名校验：防止误关联错误文件
                    if (fileHandle.name !== 'cities.ts') {
                        const confirmLink = window.confirm(
                            `⚠️ 安全警告\n\n` +
                            `您选择的文件是 "${fileHandle.name}"，\n` +
                            `但城市编辑器需要关联 "cities.ts"。\n\n` +
                            `如果继续并保存，可能会覆盖错误的文件，导致数据丢失！\n\n` +
                            `是否强制继续？`
                        );
                        if (!confirmLink) {
                            console.log('[CityEditor] 用户取消了错误文件的关联');
                            return;
                        }
                    }

                    this.fileHandle = fileHandle;
                    if (fileStatus) {
                        fileStatus.innerText = '✅ 已关联: ' + fileHandle.name;
                        fileStatus.style.color = '#4CAF50';
                    }
                    console.log('[CityEditor] 文件已关联:', fileHandle.name);
                } catch (e) {
                    console.log('File selection cancelled');
                }
            };
        }

        // Map Click Picker
        const pickBtn = this.container.querySelector('#ce-pick-map') as HTMLButtonElement;
        if (pickBtn) {
            pickBtn.onclick = () => {
                this.isPicking = true;
                pickBtn.textContent = '请点击地图...';
                pickBtn.style.background = '#E91E63';

                const onMapClick = (e: any) => {
                    if (!this.isPicking) return;

                    if (e.originalEvent) {
                        e.originalEvent.preventDefault();
                        e.originalEvent.stopPropagation();
                    }

                    latInput.value = e.latlng.lat.toFixed(6);
                    lngInput.value = e.latlng.lng.toFixed(6);

                    // Reset
                    this.isPicking = false;
                    pickBtn.textContent = '📍 地图取点';
                    pickBtn.style.background = '#607D8B';
                    this.map.off('click', onMapClick);
                };
                this.map.on('click', onMapClick);
            };
        }

        // Paste Coords Button (from right-click pick)
        const pasteBtn = this.container.querySelector('#ce-paste-coords') as HTMLButtonElement;
        if (pasteBtn) {
            pasteBtn.onclick = () => {
                const coords = (window as any).pickedCoords;
                if (!coords) {
                    alert('请先右键点击地图拾取坐标');
                    return;
                }
                latInput.value = coords.lat.toFixed(6);
                lngInput.value = coords.lng.toFixed(6);
                this.setStatus(`📍 已粘贴坐标: (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
            };
        }

        // Geocode Search
        const searchBtn = this.container.querySelector('#ce-search-btn') as HTMLButtonElement;
        const searchNextBtn = this.container.querySelector('#ce-search-next') as HTMLButtonElement;
        const searchInput = this.container.querySelector('#ce-search-query') as HTMLInputElement;

        if (searchBtn && searchNextBtn) {
            const showResult = (index: number) => {
                if (!this.searchResults || this.searchResults.length === 0) return;
                const data = this.searchResults[index];
                latInput.value = parseFloat(data.lat).toFixed(6);
                lngInput.value = parseFloat(data.lon).toFixed(6);
                this.setStatus(`[${index + 1}/${this.searchResults.length}] ${data.display_name.split(',')[0]}`);
            };

            searchBtn.onclick = async () => {
                const query = searchInput.value.trim();
                if (!query) return;

                searchBtn.textContent = '⏳';
                this.searchResults = [];
                this.searchIndex = 0;
                searchNextBtn.style.display = 'none';

                try {
                    const finalQuery = query.includes('中国') ? query : `中国 ${query}`;
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(finalQuery)}&limit=5&accept-language=zh-CN&countrycodes=cn`);
                    const data = await response.json();

                    if (data && data.length > 0) {
                        this.searchResults = data;
                        showResult(0);
                        if (this.searchResults.length > 1) {
                            searchNextBtn.style.display = 'block';
                        }
                    } else {
                        this.setStatus('未找到地点');
                    }
                } catch (e) {
                    this.setStatus('查询失败');
                    console.error(e);
                } finally {
                    searchBtn.textContent = '🔍';
                }
            };

            searchNextBtn.onclick = () => {
                if (this.searchResults.length <= 1) return;
                this.searchIndex = (this.searchIndex + 1) % this.searchResults.length;
                showResult(this.searchIndex);
            };
        }

        // Preview
        const previewBtn = this.container.querySelector('#ce-preview') as HTMLButtonElement;
        if (previewBtn) {
            previewBtn.onclick = () => {
                const name = (this.container!.querySelector('#ce-name') as HTMLInputElement).value;
                const type = (this.container!.querySelector('#ce-type') as HTMLSelectElement).value;
                const faction = (this.container!.querySelector('#ce-faction') as HTMLSelectElement).value;
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);

                if (!name || isNaN(lat) || isNaN(lng)) {
                    alert('请填写名称和坐标');
                    return;
                }

                const troops = parseInt((this.container!.querySelector('#ce-troops') as HTMLInputElement).value) || 10000;
                const mirror = (this.container!.querySelector('#ce-mirror') as HTMLInputElement).checked;
                const region = (this.container!.querySelector('#ce-region') as HTMLSelectElement).value;

                if (this.selectedCityId) {
                    // 更新模式：直接更新现有城市
                    this.cityManager.updateCity(this.selectedCityId, {
                        name,
                        factionId: faction,
                        latitude: lat,
                        longitude: lng,
                        type: type as CityType,
                        troops: troops,
                        mirror: mirror,
                        region: region || undefined,
                    });

                    // [BATCH] 将生成的代码存入缓冲区
                    const code = this.generateCityCode(false);
                    if (code) {
                        this.pendingChanges.set(this.selectedCityId, code);
                        this.updatePendingUI();
                    }
                    this.setStatus('✅ 已更新内存中的城市');
                } else {
                    // [FIX] 新建模式：显示临时预览，但不添加到 pendingChanges
                    // 先移除上一个预览城市（防止重影）
                    if (this.previewCityId) {
                        this.cityManager.removeCity(this.previewCityId);
                    }

                    // 使用临时 ID，仅用于预览，不会被保存
                    const previewId = `preview_${Date.now()}`;
                    this.previewCityId = previewId; // 记录当前预览 ID

                    this.onAddCity({
                        id: previewId,
                        name: name,
                        factionId: faction,
                        latitude: lat,
                        longitude: lng,
                        type: type as CityType,
                        troops: troops,
                        mirror: mirror,
                        region: region || undefined,
                    });
                    this.setStatus('👁️ 预览中 - 点击"新建城市"按钮保存到文件');
                }
            };
        }

        // Save to File
        // Update & Create Buttons
        if (updateBtn) {
            updateBtn.onclick = (e) => {
                e.stopPropagation(); e.preventDefault();
                this.handleSaveToFile('update');
            };
        }
        if (createBtn) {
            createBtn.onclick = (e) => {
                e.stopPropagation(); e.preventDefault();
                this.handleSaveToFile('create');
            };
        }

        // Copy Code
        const copyBtn = this.container.querySelector('#ce-copy-code') as HTMLButtonElement;
        if (copyBtn) {
            copyBtn.onclick = () => {
                const code = this.generateCityCode();
                if (code) {
                    navigator.clipboard.writeText(code).then(() => {
                        this.setStatus('📋 代码已复制到剪贴板！');
                    });
                    console.log(code);
                }
            };
        }
    }

    private generateCityCode(forceNewId: boolean = false): string | null {
        // [终极修复] 每次都从 DOM 直接获取当前可见的容器，不依赖可能过时的 this.container
        const container = document.getElementById('city-editor');
        if (!container) {
            console.error('[CityEditor] 错误: DOM 中找不到 city-editor');
            return null;
        }

        const nameInput = container.querySelector('#ce-name') as HTMLInputElement;
        const name = nameInput?.value;

        if (!name) {
            alert('请填写完整信息(城市名称必填)');
            return null;
        }

        // ID 逻辑: 
        // forceNewId = true (新建模式) -> 自动将中文名转为拼音 ID
        // forceNewId = false (更新/预览) -> 优先用输入框的 ID，没有则自动生成
        let id: string;
        // [NEW] 将中文名转为拼音（无音调、无空格）
        const pinyinName = pinyin(name, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        const safeId = pinyinName.replace(/[^a-z0-9]/g, '') || Date.now().toString().slice(-6);

        if (forceNewId) {
            id = `city_${safeId}`;
        } else {
            const idInput = container.querySelector('#ce-id') as HTMLInputElement;
            id = idInput?.value || `city_${safeId}`;
        }

        const type = (container.querySelector('#ce-type') as HTMLSelectElement)?.value;
        const faction = (container.querySelector('#ce-faction') as HTMLSelectElement)?.value;
        const lat = (container.querySelector('#ce-lat') as HTMLInputElement)?.value;
        const lng = (container.querySelector('#ce-lng') as HTMLInputElement)?.value;
        const troops = (container.querySelector('#ce-troops') as HTMLInputElement)?.value || '10000';

        const mirror = (container.querySelector('#ce-mirror') as HTMLInputElement)?.checked;
        const region = (container.querySelector('#ce-region') as HTMLSelectElement)?.value;

        console.log(`[CityEditor] generateCityCode 读取: name=${name}, lat=${lat}, lng=${lng}, region=${region}`);

        if (!lat || !lng) {
            alert('请填写完整信息');
            return null;
        }

        const mirrorCode = mirror ? ", mirror: true" : "";
        const regionCode = region ? `, region: '${region}'` : "";

        return `{ id: '${id}', name: '${name}', factionId: '${faction}', lat: ${lat}, lng: ${lng}, type: '${type}'${regionCode}, troops: ${troops}${mirrorCode} }`;
    }

    private updatePendingUI(): void {
        const el = document.getElementById('ce-pending-status');
        if (el) {
            const count = this.pendingChanges.size;
            el.textContent = `⚠️ 待保存变更: ${count} (点击保存按钮一次性写入)`;
            el.style.display = count > 0 ? 'block' : 'none';
        }
    }

    private async handleSaveToFile(mode: 'update' | 'create'): Promise<void> {
        console.log(`[CityEditor] 1. 进入 handleSaveToFile (批量模式)`);

        const container = document.getElementById('city-editor');
        if (!container) return;

        if (!this.fileHandle) {
            alert('请先点击"关联 src/data/cities.ts"按钮！');
            return;
        }

        // [BATCH] 首先，将当前表单的数据（如果有修改但未预览）也加入 pending
        // 只有当表单完整时才尝试生成
        const currentName = (container.querySelector('#ce-name') as HTMLInputElement)?.value;
        if (currentName) {
            // 尝试生成代码
            // 如果是 create 模式，forceNewId = true
            // 如果是 update 模式，forceNewId = false
            const isCreate = mode === 'create';

            // 注意：如果用户只是点击保存，我们默认他也想保存当前的
            // 但如果当前表单是空的或者非法的，generateCityCode 会报错或返回null
            // 我们简单尝试一下，忽略错误
            const currentCode = this.generateCityCode(isCreate);
            if (currentCode) {
                // 提取 ID
                const idMatch = currentCode.match(/id:\s*['"]([^'"]+)['"]/);
                const explicitId = (container.querySelector('#ce-id') as HTMLInputElement)?.value;
                const id = idMatch ? idMatch[1] : (explicitId || `city_${Date.now().toString().slice(-6)}`);

                this.pendingChanges.set(id, currentCode);
                console.log(`[Batch] Auto-added current form to pending: ${id}`);

                // [FIX] 如果是新建模式，同时将城市添加到内存
                if (isCreate) {
                    const type = (container.querySelector('#ce-type') as HTMLSelectElement)?.value;
                    const faction = (container.querySelector('#ce-faction') as HTMLSelectElement)?.value;
                    const lat = parseFloat((container.querySelector('#ce-lat') as HTMLInputElement)?.value);
                    const lng = parseFloat((container.querySelector('#ce-lng') as HTMLInputElement)?.value);
                    const troops = parseInt((container.querySelector('#ce-troops') as HTMLInputElement)?.value) || 10000;

                    this.onAddCity({
                        id: id,
                        name: currentName,
                        factionId: faction,
                        latitude: lat,
                        longitude: lng,
                        type: type as CityType,
                        troops: troops
                    });
                    console.log(`[CityEditor] Added new city to memory: ${id}`);
                }
            }
        }

        if (this.pendingChanges.size === 0) {
            alert('没有待保存的更改！请先修改并预览，或填写表单。');
            return;
        }

        try {
            console.log('[CityEditor] 5. 开始批量写入...');
            const file = await this.fileHandle.getFile();
            let text = await file.text();

            let successCount = 0;
            let failCount = 0;

            // 遍历所有待保存的更改
            for (const [id, codeBlock] of this.pendingChanges.entries()) {
                console.log(`[Batch] Processing ${id}...`);

                // 1. 查找 ID
                const idRegex = new RegExp(`(?:id|['"]id['"])\\s*:\\s*['"]${id}['"]`);
                const match = text.match(idRegex);
                const matchIndex = match ? match.index : -1;

                if (matchIndex !== -1) {
                    // Update existing
                    console.log(`[Batch] Updating existing: ${id}`);
                    let start = matchIndex!;
                    while (start > 0 && text[start] !== '{') start--;

                    let scanPtr = start;
                    let balance = 0;
                    let end = -1;

                    for (let i = 0; i < 50000; i++) {
                        if (scanPtr >= text.length) break;
                        if (text[scanPtr] === '{') balance++;
                        if (text[scanPtr] === '}') {
                            balance--;
                            if (balance === 0) {
                                end = scanPtr + 1;
                                break;
                            }
                        }
                        scanPtr++;
                    }

                    if (end !== -1) {
                        text = text.substring(0, start) + codeBlock + text.substring(end);
                        successCount++;
                    } else {
                        console.error(`[Batch] Failed to find closing brace for ${id}`);
                        failCount++;
                    }
                } else {
                    // Create new
                    console.log(`[Batch] Creating new: ${id}`);

                    // [FIX] 更稳健的数组末尾查找逻辑
                    // 1. 查找数组定义的结束位置 (];)
                    const arrayEnd = text.lastIndexOf('];');

                    if (arrayEnd === -1) {
                        console.error(`[Batch] Failed to find array end for ${id}`);
                        failCount++;
                    } else {
                        // 2. 向前回溯找到最后一个有效的数组元素结束位置
                        // 目标是插入到最后一个元素之后，]; 之前
                        let insertPos = arrayEnd;

                        // 检查是否需要添加逗号
                        // 向前扫描找到最后一个非空白字符
                        let scanPtr = arrayEnd - 1;
                        while (scanPtr > 0 && /\s/.test(text[scanPtr])) {
                            scanPtr--;
                        }

                        const lastChar = text[scanPtr];
                        const needsComma = lastChar !== ',' && lastChar !== '['; // 如果不是逗号且不是数组开头

                        const commaStr = needsComma ? ',' : '';
                        const insertStr = `${commaStr}\n  ${codeBlock}`; // 保持2空格缩进

                        // 在最后一个非空字符之后插入 (即 scanPtr + 1)
                        // 注意：text.slice(0, scanPtr + 1) 保留了那个字符
                        // text.slice(arrayEnd) 保留了 ];
                        // 中间的空白会被我们的新内容+格式化替代，或者保留一部分?
                        // 更简单的做法：直接替换 arrayEnd 之前的内容是不安全的，因为可能删掉注释
                        // 最佳做法：在 arrayEnd 之前插入，并处理逗号

                        const before = text.slice(0, scanPtr + 1);
                        const after = text.slice(scanPtr + 1);
                        // after 包含了从最后一个字符到文件末尾的所有内容 (包括原来的换行和 ];)

                        text = before + insertStr + after;
                        successCount++;
                    }
                }
            }

            console.log(`[CityEditor] 批量处理完成: 成功 ${successCount}, 失败 ${failCount}`);

            // 写入文件
            // @ts-ignore
            if (this.fileHandle.createWritable) {
                // @ts-ignore
                const writable = await this.fileHandle.createWritable();
                await writable.write(text);
                await writable.close();

                // 清理
                this.pendingChanges.clear();
                this.updatePendingUI();
                this.setStatus(`✅ 批量保存成功！更新: ${successCount} 个城市`);
            } else {
                alert('您的浏览器不支持 File System Access API 的写入功能');
            }

        } catch (err) {
            console.error('[CityEditor] 保存失败:', err);
            alert('保存失败: ' + err);
        }
    }

    private setStatus(msg: string): void {
        const el = document.getElementById('ce-status');
        if (el) el.textContent = msg;
    }

}
