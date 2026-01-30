import { FactionManager } from '../core/FactionManager';
import { LegionManager } from '../core/LegionManager';
import { CityManager } from '../core/CityManager';

export class FactionStatusPanel {
    private container: HTMLElement;
    private isVisible: boolean = true;
    private currentFollowId: string | null = null;
    private lastUpdateTime: number = 0;
    private readonly UPDATE_INTERVAL = 1000; // Only update every 1 second
    private sortMode: 'total' | 'legion' = 'total'; // [NEW] Sort mode

    private factionManager: FactionManager;
    private legionManager: LegionManager;
    private cityManager: CityManager;
    private onLegionClick?: (legionId: string) => void;

    constructor(
        factionManager: FactionManager,
        legionManager: LegionManager,
        cityManager: CityManager,
        onLegionClick?: (legionId: string) => void
    ) {
        this.factionManager = factionManager;
        this.legionManager = legionManager;
        this.cityManager = cityManager;
        this.onLegionClick = onLegionClick;

        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    private createContainer(): HTMLElement {
        const div = document.createElement('div');
        div.className = 'faction-status-panel';
        div.innerHTML = `
            <div class="faction-status-header">
                <span class="fs-title">⚔️ 势力军力</span>
                <button class="faction-status-toggle" title="隐藏/显示">▼</button>
            </div>
            <div class="faction-status-content">
                <table class="fs-table">
                    <thead>
                        <tr>
                            <th>势力</th>
                            <th class="sortable" data-sort="total">总兵力 ▾</th>
                            <th class="sortable" data-sort="legion">主力军团</th>
                            <th>查看</th>
                        </tr>
                    </thead>
                    <tbody class="fs-tbody"></tbody>
                </table>
            </div>
        `;

        // Sort handlers
        const thTotal = div.querySelector('th[data-sort="total"]') as HTMLElement;
        const thLegion = div.querySelector('th[data-sort="legion"]') as HTMLElement;

        thTotal.onclick = () => this.setSortMode('total');
        thLegion.onclick = () => this.setSortMode('legion');

        // Add minimal CSS for pointer cursor
        const style = document.createElement('style');
        style.textContent = `
            .fs-table th.sortable { cursor: pointer; user-select: none; }
            .fs-table th.sortable:hover { color: #fff; }
            .fs-table th.active-sort { color: #ffd700; }
        `;
        div.appendChild(style);

        // Toggle button
        const toggleBtn = div.querySelector('.faction-status-toggle') as HTMLButtonElement;
        toggleBtn.onclick = () => this.toggleVisibility();

        return div;
    }

    public toggleVisibility(): void {
        this.isVisible = !this.isVisible;
        const toggleBtn = this.container.querySelector('.faction-status-toggle') as HTMLButtonElement;
        if (this.isVisible) {
            this.container.classList.remove('collapsed');
            toggleBtn.textContent = '▼';
        } else {
            this.container.classList.add('collapsed');
            toggleBtn.textContent = '◀';
        }
    }

    public setFollowId(id: string | null): void {
        this.currentFollowId = id;
        // Update radio states without full re-render
        const radios = this.container.querySelectorAll('.follow-radio') as NodeListOf<HTMLInputElement>;
        radios.forEach(radio => {
            radio.checked = radio.value === id;
        });
    }

    private setSortMode(mode: 'total' | 'legion'): void {
        this.sortMode = mode;

        // Update header visuals
        const thTotal = this.container.querySelector('th[data-sort="total"]') as HTMLElement;
        const thLegion = this.container.querySelector('th[data-sort="legion"]') as HTMLElement;

        thTotal.textContent = mode === 'total' ? '总兵力 ▾' : '总兵力';
        thLegion.textContent = mode === 'legion' ? '主力军团 ▾' : '主力军团';

        thTotal.classList.toggle('active-sort', mode === 'total');
        thLegion.classList.toggle('active-sort', mode === 'legion');

        this.lastUpdateTime = 0; // Force immediate update
        this.update();
    }

    // [OPTIMIZATION] Row Cache to prevent DOM thrashing
    private rowCache: Map<string, HTMLElement> = new Map();

    public update(): void {
        // [FIX] removing isVisible check here might be needed if we want background updates, 
        // but for now keeping it to save performance when hidden.
        if (!this.isVisible) return;

        // [FIX] THROTTLE - Only update every 1 second
        const now = Date.now();
        if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
            return;
        }
        this.lastUpdateTime = now;

        const tbody = this.container.querySelector('.fs-tbody');
        if (!tbody) return;

        // Get factions and armies (Computation is cheap, DOM is expensive)
        const factions = this.factionManager.getFactions().filter(f => f.id !== 'neutral' && f.id !== 'panjun');
        const allArmies = this.legionManager.getArmies().filter(a => !a.isDestroyed && a.type === 'legion');

        // Build current data map
        const currentDataMap = new Map<string, any>();

        factions.forEach(f => {
            const totalTroops = this.cityManager.getFactionTotalTroops(f.id);
            const factionArmies = allArmies.filter(a => a.getFactionId() === f.id);
            const legionTroopsTotal = factionArmies.reduce((sum, a) => sum + a.getTroops(), 0);
            const primaryArmy = factionArmies[0] || null;

            currentDataMap.set(f.id, {
                id: f.id,
                faction: f,
                totalTroops: totalTroops + legionTroopsTotal,
                legionTroops: primaryArmy ? primaryArmy.getTroops() : 0,
                legionStatus: primaryArmy ? (primaryArmy.getIsInCombat() ? '⚔️' : '🐎') : '-',
                legionId: primaryArmy ? primaryArmy.id : null
            });
        });

        // Convert to sorted array
        const sortedData = Array.from(currentDataMap.values()).sort((a, b) => {
            if (this.sortMode === 'legion') {
                return b.legionTroops - a.legionTroops || b.totalTroops - a.totalTroops;
            } else {
                return b.totalTroops - a.totalTroops || b.legionTroops - a.legionTroops;
            }
        });

        // 1. Update / Create Rows
        const activeIds = new Set<string>();

        sortedData.forEach(d => {
            activeIds.add(d.id);
            let tr = this.rowCache.get(d.id);

            if (!tr) {
                // Create new row
                tr = document.createElement('tr');
                tr.className = 'fs-row';
                // Use temp innerHTML only for initial creation
                tr.innerHTML = `
                    <td class="fs-name"></td>
                    <td class="fs-troops"></td>
                    <td class="fs-legion"></td>
                    <td class="fs-action"></td>
                `;
                tr.onclick = () => {
                    const lid = tr!.dataset.legionId;
                    if (lid && this.onLegionClick) {
                        console.log('📍 [FactionStatusPanel] Row Clicked:', lid);
                        this.onLegionClick(lid);
                    }
                };
                tbody.appendChild(tr);
                this.rowCache.set(d.id, tr);
            }

            // Efficient DOM Updates (Text/Class only)
            tr.dataset.legionId = d.legionId || '';
            if (d.legionId) tr.classList.add('clickable');
            else tr.classList.remove('clickable');

            // Name Cell
            const tdName = tr.children[0] as HTMLElement;
            // Only update if needed? innerHTML is okay here for small content
            tdName.innerHTML = `<span class="fs-color-dot" style="background-color: ${d.faction.color}"></span> ${d.faction.name}`;

            // Troops Cell
            const tdTroops = tr.children[1] as HTMLElement;
            const troopText = this.formatNumber(d.totalTroops);
            if (tdTroops.textContent !== troopText) tdTroops.textContent = troopText;

            // Legion Cell
            const tdLegion = tr.children[2] as HTMLElement;
            let legionHtml = '';
            if (d.legionTroops > 0) {
                legionHtml = `<span class="fs-legion-val">${this.formatNumber(d.legionTroops)}</span> <span class="fs-status">${d.legionStatus}</span>`;
            } else {
                legionHtml = '<span class="fs-idle">备战</span>';
            }
            if (tdLegion.innerHTML !== legionHtml) tdLegion.innerHTML = legionHtml;

            // Action Cell (Radio)
            const tdAction = tr.children[3] as HTMLElement;
            if (d.legionId) {
                // Check if radio already exists
                let radio = tdAction.querySelector('input') as HTMLInputElement;
                if (!radio) {
                    tdAction.innerHTML = '';
                    radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'follow-target';
                    radio.className = 'follow-radio';
                    radio.title = '点击跟随部队';
                    // Event binding
                    radio.onclick = (e) => {
                        e.stopPropagation();
                        console.log('🎯 [FactionStatusPanel] Follow Radio Clicked:', d.legionId);
                        if (this.onLegionClick && d.legionId) this.onLegionClick(d.legionId);
                    };
                    tdAction.appendChild(radio);
                }

                radio.value = d.legionId;
                const shouldCheck = this.currentFollowId === d.legionId;
                if (radio.checked !== shouldCheck) radio.checked = shouldCheck;

            } else {
                if (tdAction.innerHTML !== '<span class="fs-empty">-</span>') {
                    tdAction.innerHTML = '<span class="fs-empty">-</span>';
                }
            }

            // Re-append to ensure sorting order
            tbody.appendChild(tr);
        });

        // 2. Remove Stale Rows
        this.rowCache.forEach((row, id) => {
            if (!activeIds.has(id)) {
                row.remove();
                this.rowCache.delete(id);
            }
        });
    }

    private formatNumber(num: number): string {
        if (num >= 10000) {
            return (num / 10000).toFixed(2) + '万';
        }
        return Math.floor(num).toString();
    }
}
