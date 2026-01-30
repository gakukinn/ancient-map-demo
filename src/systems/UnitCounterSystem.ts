/**
 * UnitCounterSystem.ts
 * 
 * 兵种相克系统。
 * 实现经典的三角克制关系：
 * - 步兵 (Infantry) 克制 骑兵 (Cavalry) - 枪阵克制冲锋
 * - 骑兵 (Cavalry) 克制 弓兵 (Archer) - 快速突进切后排
 * - 弓兵 (Archer) 克制 步兵 (Infantry) - 远程消耗慢速单位
 */

import { LegionType } from '../types/UnitTypes';

/**
 * 克制关系表
 * Key: 攻击方兵种
 * Value: { 被克制兵种: 伤害加成 }
 */
const COUNTER_TABLE: Partial<Record<LegionType, Partial<Record<LegionType, number>>>> = {
    infantry: {
        cavalry: 1.5,   // 步兵克制骑兵 +50% 伤害
        infantry: 1.0,  // 同类型正常
        archer_cavalry: 0.8     // 被弓兵克制 -20%
    },
    archer_cavalry: {
        infantry: 1.5,  // 弓兵克制步兵 +50%
        archer_cavalry: 1.0,
        cavalry: 0.6    // 被骑兵克制 -40%
    },
    cavalry: {
        archer_cavalry: 1.5,    // 骑兵克制弓兵 +50%
        cavalry: 1.0,
        infantry: 0.7   // 被步兵克制 -30%
    }
};

/**
 * 计算兵种相克伤害修正
 * 
 * @param attackerType 攻击方兵种
 * @param defenderType 防守方兵种
 * @returns 伤害修正系数 (1.0 = 无修正, >1 = 克制, <1 = 被克)
 */
export function getCounterModifier(attackerType: LegionType, defenderType: LegionType): number {
    const attackerTable = COUNTER_TABLE[attackerType];
    if (!attackerTable) return 1.0;

    return attackerTable[defenderType] ?? 1.0;
}

/**
 * 判断是否克制
 */
export function isCountering(attackerType: LegionType, defenderType: LegionType): boolean {
    return getCounterModifier(attackerType, defenderType) > 1.0;
}

/**
 * 判断是否被克制
 */
export function isCountered(attackerType: LegionType, defenderType: LegionType): boolean {
    return getCounterModifier(attackerType, defenderType) < 1.0;
}

/**
 * 获取克制关系描述 (用于 UI 显示)
 */
export function getCounterDescription(attackerType: LegionType, defenderType: LegionType): string {
    const modifier = getCounterModifier(attackerType, defenderType);

    if (modifier > 1.0) {
        return `克制 (+${Math.round((modifier - 1) * 100)}% 伤害)`;
    } else if (modifier < 1.0) {
        return `被克 (${Math.round((modifier - 1) * 100)}% 伤害)`;
    }
    return '无克制关系';
}

/**
 * 获取某兵种克制的目标兵种列表
 */
export function getCounteredBy(type: LegionType): LegionType[] {
    const result: LegionType[] = [];
    const table = COUNTER_TABLE[type];
    if (!table) return result;

    for (const [targetType, modifier] of Object.entries(table)) {
        if (modifier !== undefined && modifier > 1.0) {
            result.push(targetType as LegionType);
        }
    }
    return result;
}

/**
 * 获取克制某兵种的兵种列表
 */
export function getCountersFor(type: LegionType): LegionType[] {
    const result: LegionType[] = [];

    for (const [attackerType, table] of Object.entries(COUNTER_TABLE)) {
        if (table[type] !== undefined && table[type]! > 1.0) {
            result.push(attackerType as LegionType);
        }
    }
    return result;
}

// Log counter system initialization
console.log('⚔️ [UnitCounterSystem] Initialized with rock-paper-scissors mechanics');
console.log('  Infantry (步兵) > Cavalry (骑兵) > Archer (弓兵) > Infantry (步兵)');
