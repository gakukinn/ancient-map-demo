/**
 * TerrainSpeedSystem.ts
 * 
 * [简化版] 仅用于地形可视化和 NPC 生成点判断。
 * 
 * ⚠️ 注意：军队移动速度不再由此系统决定！
 * 军队现在只能沿 RoadRegistry 定义的道路移动，速度恒定。
 * 参见 .agent/GAME_DESIGN.md 了解设计原则。
 */

import { LatLng } from '../types/core';
import { MapColorSampler } from '../map/MapColorSampler';
import { TerrainOverrideManager } from './TerrainOverrideManager';
import { Hex } from '../systems/GridSystem';
import { CityData } from '../data/cities';

export const TerrainSpeed = {
    NORMAL: 'NORMAL',
    SLOW: 'SLOW',
    WATER: 'WATER',
    OCEAN: 'OCEAN'
} as const;

export type TerrainSpeed = typeof TerrainSpeed[keyof typeof TerrainSpeed];

export const TERRAIN_SPEED_CONFIG = {
    [TerrainSpeed.NORMAL]: {
        multiplier: 1.0, // 平原基准
        color: '#22C55E', // 绿色
        fillColor: 'rgba(34, 197, 94, 0.3)',
        name: '平原 (正常)'
    },
    [TerrainSpeed.SLOW]: {
        multiplier: 1.0, // [USER REQUEST] 山地 1.0 (众生平等)
        color: '#F97316', // 橙色
        fillColor: 'rgba(249, 115, 22, 0.3)',
        name: '山地 (难行)'
    },
    [TerrainSpeed.WATER]: {
        multiplier: 1.0, // [USER REQUEST] 水路比平路快(顺江)，或是同速。用户定为 1.0
        color: '#3B82F6', // 天蓝
        fillColor: 'rgba(59, 130, 246, 0.3)',
        name: '河流 (通畅)'
    },
    [TerrainSpeed.OCEAN]: {
        multiplier: 1.0, // [USER REQUEST] 深海 1.0 (与山地一致)
        color: '#00008B', // 深蓝
        fillColor: 'rgba(0, 0, 139, 0.3)',
        name: '深海 (难行)'
    }
};


export class TerrainSpeedSystem {
    private static colorSampler: MapColorSampler | null = null;
    private static overrideManager: TerrainOverrideManager | null = null;
    private static cityLocations: Map<string, { lat: number, lng: number }> = new Map();
    private static autoIdentificationEnabled: boolean = true;

    // [缓存] 地形分析结果
    private static speedCache: Map<string, TerrainSpeed> = new Map();

    static initialize(sampler: MapColorSampler, overrideManager?: TerrainOverrideManager, cities?: CityData[]): void {
        this.colorSampler = sampler;
        if (overrideManager) {
            this.overrideManager = overrideManager;
        }

        if (cities) {
            cities.forEach(city => {
                this.cityLocations.set(city.id, { lat: city.lat, lng: city.lng });
            });
        }

        const savedSetting = localStorage.getItem('auto_id_enabled');
        if (savedSetting !== null) {
            this.autoIdentificationEnabled = savedSetting === 'true';
        }
    }

    static setAutoIdentificationEnabled(enabled: boolean): void {
        this.autoIdentificationEnabled = enabled;
        localStorage.setItem('auto_id_enabled', String(enabled));
    }

    static isAutoIdentificationEnabled(): boolean {
        return this.autoIdentificationEnabled;
    }

    /**
     * [FAST] 仅从缓存获取地形类型，不进行任何采样
     * 用于 A* 寻路等需要快速读取的场景
     */
    static getHexSpeedCached(hex: Hex): TerrainSpeed {
        if (this.overrideManager) {
            const override = this.overrideManager.getOverride(hex);
            if (override) {
                return override;
            }
        }
        // 没有缓存数据时，默认返回平原
        return TerrainSpeed.NORMAL;
    }

    /**
     * 异步版本：如需加载地图瓦片则等待，返回准确地形类型。
     * 用于 NPC 生成点判断等需要准确性的场景。
     */
    static async getHexSpeedAsync(hexCenter: LatLng, hex?: Hex): Promise<TerrainSpeed> {
        if (this.overrideManager && hex) {
            const override = this.overrideManager.getOverride(hex);
            if (override) {
                return override;
            }
        }

        if (!this.colorSampler) {
            return TerrainSpeed.SLOW;
        }

        const color = await this.colorSampler.getColorAtAsync(hexCenter.lat, hexCenter.lng);
        if (!color) {
            return TerrainSpeed.SLOW;
        }

        return this.classifyTerrainByColor(color);
    }

    /**
     * 获取地形类型（用于可视化）
     */
    static getHexSpeed(hexCenter: LatLng, hex?: Hex): TerrainSpeed {
        // [FIX] Use stable Hex Key (q,r) if available to avoid floating point issues
        let key: string;
        if (hex) {
            key = `${hex.q},${hex.r}`;
        } else {
            key = `${hexCenter.lat.toFixed(4)},${hexCenter.lng.toFixed(4)}`;
        }

        if (this.speedCache.has(key)) {
            return this.speedCache.get(key)!;
        }

        const result = this.calculateHexSpeed(hexCenter, hex);
        this.speedCache.set(key, result);
        return result;
    }

    /**
     * 清除指定位置的缓存
     * 当编辑器修改了地形覆盖时调用
     */
    static clearCache(lat: number, lng: number, hex?: Hex): void {
        const legacyKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (this.speedCache.has(legacyKey)) {
            this.speedCache.delete(legacyKey);
        }

        if (hex) {
            const hexKey = `${hex.q},${hex.r}`;
            if (this.speedCache.has(hexKey)) {
                this.speedCache.delete(hexKey);
            }
        }
    }

    private static calculateHexSpeed(hexCenter: LatLng, hex?: Hex): TerrainSpeed {
        if (this.overrideManager && hex) {
            const override = this.overrideManager.getOverride(hex);
            if (override) {
                return override;
            }
        }

        if (!this.autoIdentificationEnabled) {
            return TerrainSpeed.SLOW;
        }

        if (!this.colorSampler) {
            return TerrainSpeed.SLOW;
        }

        const color = this.colorSampler.getColorAt(hexCenter.lat, hexCenter.lng);
        if (!color) {
            return TerrainSpeed.SLOW;
        }

        return this.classifyTerrainByColor(color);
    }

    /**
     * 根据颜色识别地形类型
     * 针对 ESRI World Shaded Relief 地图优化
     */
    /**
     * 根据颜色识别地形类型 (全球通用两步法)
     * Step 1: 海陆分离
     * Step 2: 内部细分
     */
    public static classifyTerrainByColor(color: { r: number; g: number; b: number; variance: number }): TerrainSpeed {
        const { r, g, b, variance } = color;
        const brightness = (r + g + b) / 3;

        // 0. 无效/背景检测
        if (brightness > 250 || brightness < 5) {
            return TerrainSpeed.NORMAL; // 默认为平原
        }

        // ==========================================
        // STEP 1: 海陆分离 (Water vs Land)
        // 核心依据：蓝色主导权 (Blue Dominance)
        // ==========================================
        // 允许绿色稍微高一点（青色水域），但红色必须显著低于蓝色
        const isBlueDominant = (b > r + 15) && (b >= g - 5);

        // 特殊：深海可能 RGB 都很低，但蓝色依然相对较高
        const isDeepDarkWater = (brightness < 60) && (b >= r) && (b >= g);

        const isWater = isBlueDominant || isDeepDarkWater;

        // ==========================================
        // STEP 2: 内部细分 (Sub-classification)
        // ==========================================

        if (isWater) {
            // --- 水域细分 ---
            // 深色且方差小 -> 海域
            // 浅色或方差稍大 -> 河流 (Google地形图中河流常为浅蓝)
            if (brightness < 100 && variance < 50) {
                return TerrainSpeed.OCEAN;
            } else {
                return TerrainSpeed.WATER;
            }
        } else {
            // --- 陆地细分 ---
            // 乱 -> 山地
            // 平 -> 平原
            if (variance > 40) {
                return TerrainSpeed.SLOW; // 山地
            } else {
                return TerrainSpeed.NORMAL; // 平原
            }
        }
    }

    /**
     * 获取速度倍率 (Strict Mode)
     * 规则：道路优先 (2.0x)，否则检查特定地形。
     * ⚠️ 深海返回 0.0 (不可通行)
     */
    static getSpeedMultiplier(hexCenter: LatLng): number {
        const registry = (window as any).roadRegistry;
        if (registry && registry.isPositionOnRoad(hexCenter.lat, hexCenter.lng)) {
            return 2.0; // 道路极速
        }

        // 非道路：按地形判断
        const terrainType = this.getHexSpeed(hexCenter);
        const config = TERRAIN_SPEED_CONFIG[terrainType];

        // 如果是平原(NORMAL)，给予 0.2 的野外低速 (避免 1.0 太快，体现道路价值)
        if (terrainType === TerrainSpeed.NORMAL) {
            return 0.2;
        }

        return config.multiplier; // OCEAN=0.0, SLOW=0.1, WATER=1.0
    }

    /**
     * 获取地形颜色配置（用于可视化）
     */
    static getHexColorConfig(hexCenter: LatLng) {
        const speed = this.getHexSpeed(hexCenter);
        return TERRAIN_SPEED_CONFIG[speed];
    }

    static isNearRoad(lat: number, lng: number): boolean {
        const registry = (window as any).roadRegistry;
        return registry ? registry.isPositionOnRoad(lat, lng) : false;
    }
}
