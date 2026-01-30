/**
 * FactionTintSystem.ts
 * 
 * 管理势力颜色染色映射。
 * 根据势力ID返回对应的染色颜色。
 */

import { FACTIONS } from '../../data/factions';

/**
 * 染色颜色接口
 */
export interface TintColor {
    r: number;  // 0-255
    g: number;  // 0-255
    b: number;  // 0-255
    intensity: number;  // 0-1 染色强度
}

/**
 * 势力染色系统
 */
export class FactionTintSystem {
    // 势力ID到染色颜色的映射
    private static tintColorCache: Map<string, TintColor> = new Map();
    private static initialized = false;

    /**
     * 初始化染色系统
     */
    public static initialize(): void {
        if (this.initialized) return;

        // 从 factions.ts 中读取颜色并转换为 TintColor
        FACTIONS.forEach(faction => {
            const hexColor = faction.color;
            // [MODIFIED] User liked Qin's color (0.6 intensity). 
            // Increasing default intensity to 0.6 to make all faction colors more visible and consistent.
            const tintColor = this.hexToTintColor(hexColor, 0.6);
            this.tintColorCache.set(faction.id, tintColor);
        });

        this.initialized = true;
        console.log('🎨 [FactionTintSystem] Initialized with', this.tintColorCache.size, 'factions');
    }

    /**
     * 获取势力的染色颜色
     */
    public static getTintColor(factionId: string): TintColor | null {
        if (!this.initialized) this.initialize();
        return this.tintColorCache.get(factionId) || null;
    }

    /**
     * 将HEX颜色转换为TintColor
     */
    private static hexToTintColor(hex: string, intensity: number): TintColor {
        // [FIX] Support 6-digit or 8-digit hex (ignore alpha part if present)
        // Remove $ anchor strictly, or just take first 6 chars
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/.exec(hex);
        if (!result) {
            return { r: 128, g: 128, b: 128, intensity: 0.3 }; // 默认灰色
        }
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            intensity
        };
    }

    /**
     * 检查是否需要染色
     * 某些势力可能不需要染色（如使用原始颜色的势力）
     */
    public static shouldTint(factionId: string): boolean {
        const tint = this.getTintColor(factionId);
        return tint !== null && tint.intensity > 0;
    }
}
