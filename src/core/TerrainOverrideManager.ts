import { TerrainSpeed } from './TerrainSpeedSystem';
import { Hex } from '../systems/GridSystem';
import { TERRAIN_OVERRIDE_DATA } from '../data/TerrainData';

export interface TerrainOverrideData {
    [key: string]: TerrainSpeed;
}

export class TerrainOverrideManager {
    private overrides: Map<number, TerrainSpeed> = new Map();

    constructor() {
        // 1. 优先从源码文件加载 (TerrainData.ts)
        this.loadFromSourceFile();
        // 2. [DISABLE] 禁用从 localStorage 加载，防止旧缓存覆盖文件修改
        // 既然我们已经实现了文件关联保存，就应该以文件为准。
        // this.loadFromStorage();
    }

    /**
     * 从源码文件加载数据 (TerrainData.ts)
     */
    private loadFromSourceFile(): void {
        try {
            const count = Object.keys(TERRAIN_OVERRIDE_DATA).length;
            if (count > 0) {
                this.loadData(TERRAIN_OVERRIDE_DATA);
                console.log(`📂 已从 TerrainData.ts 加载 ${count} 个地形数据`);
            }
        } catch (e) {
            console.warn('⚠️ 无法从 TerrainData.ts 加载地形数据:', e);
        }
    }

    /**
     * 生成唯一的六边形键值 (q,r) -> number
     */
    private getHexKey(hex: Hex): number {
        return (hex.q << 16) | (hex.r & 0xFFFF);
    }

    /**
     * 设置覆盖值
     */
    public setOverride(hex: Hex, speed: TerrainSpeed): void {
        const key = this.getHexKey(hex);
        this.overrides.set(key, speed);
        // [OPTIMIZATION] Removed auto-save on every pixel to prevent lag. Save is manual or on-close.
    }

    public bulkSetOverrides(newOverrides: Map<string, TerrainSpeed>): void {
        newOverrides.forEach((value, keyStr) => {
            const [q, r] = keyStr.split(',').map(Number);
            const key = (q << 16) | (r & 0xFFFF);
            this.overrides.set(key, value);
        });
        // [OPTIMIZATION] Removed auto-save
    }

    /**
     * 批量设置覆盖值 (数组格式)
     */
    public setOverrides(updates: { q: number; r: number; speed: TerrainSpeed }[]): void {
        updates.forEach(update => {
            const key = (update.q << 16) | (update.r & 0xFFFF);
            this.overrides.set(key, update.speed);
        });

        // [OPTIMIZATION] Removed auto-save
    }

    /**
     * 获取覆盖值
     */
    public getOverride(hex: Hex): TerrainSpeed | null {
        const key = this.getHexKey(hex);
        return this.overrides.get(key) || null;
    }

    /**
     * 清除覆盖值
     */
    public clearOverride(hex: Hex): void {
        const key = this.getHexKey(hex);
        this.overrides.delete(key);
        // [OPTIMIZATION] Removed auto-save
    }

    /**
     * 导出数据为 JSON 字符串
     */
    /**
     * 导出数据为 JSON 字符串
     * @param baseResolver 可选的基准值解析器。如果提供了此函数，且 override 值与基准值相同，则不导出（实现差分存储）。
     */
    public exportData(baseResolver?: (q: number, r: number) => TerrainSpeed): string {
        const data: TerrainOverrideData = {};
        let prunedCount = 0;

        this.overrides.forEach((value, key) => {
            // Convert int key back to string "q,r" for JSON
            const r = (key & 0xFFFF) << 16 >> 16;
            const q = key >> 16;

            // Differential Optimization
            if (baseResolver) {
                const baseValue = baseResolver(q, r);
                // If the override is exactly what the base system would return, we don't need to save it
                if (value === baseValue) {
                    prunedCount++;
                    return; // Skip saving
                }
            }

            data[`${q},${r}`] = value;
        });

        if (prunedCount > 0) {
            console.log(`🧹 已优化存储：移除 ${prunedCount} 个冗余数据 (与自动识别一致)`);
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * 导入数据
     */
    public loadData(data: TerrainOverrideData): void {
        this.overrides.clear();
        Object.entries(data).forEach(([keyStr, value]) => {
            const [q, r] = keyStr.split(',').map(Number);
            const key = (q << 16) | (r & 0xFFFF);
            this.overrides.set(key, value as TerrainSpeed);
        });
        // 移除自动保存，避免加载时覆盖数据
    }

    /**
     * 手动保存到 LocalStorage
     */
    public save(): void {
        this.saveToStorage();
    }

    /**
     * 保存到 LocalStorage (临时持久化)
     */
    private saveToStorage(): void {
        try {
            // [DISABLE] Disable auto-save to localStorage to prevent QuotaExceededError
            // The map data is >5MB which exceeds the limit.
            // const data = this.exportData();
            // localStorage.setItem('terrain_overrides', data);

            // console.log('💾 地形数据已保存');
        } catch (e) {
            console.error('❌ 无法保存地形覆盖数据到 LocalStorage:', e);
            // [FIX] 用户可见的警告
            // alert('⚠️ 保存失败！\n\n浏览器存储空间可能已满。\n请使用「导出存档」按钮将数据保存为文件，以防丢失。');
        }
    }

    /**
     * 从 LocalStorage 加载
     */
    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem('terrain_overrides');
            if (data) {
                const parsed = JSON.parse(data);
                this.loadData(parsed);
                console.log(`📦 已加载 ${this.overrides.size} 个地形修正数据`);
            }
        } catch (e) {
            console.warn('无法从 LocalStorage 加载地形覆盖数据');
        }
    }

    /**
     * 获取所有覆盖数据的数量
     */
    public getOverrideCount(): number {
        return this.overrides.size;
    }

    /**
     * 获取所有覆盖数据 Map
     */
    public getAllOverrides(): Map<string, TerrainSpeed> {
        // Convert back to string keys for consumers expecting them
        const strMap = new Map<string, TerrainSpeed>();
        this.overrides.forEach((val, key) => {
            const r = (key & 0xFFFF) << 16 >> 16;
            const q = key >> 16;
            strMap.set(`${q},${r}`, val);
        });
        return strMap;
    }
}
