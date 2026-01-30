/**
 * AIState.ts
 * 
 * AI 军团状态与配置
 * [简化版] - 仅保留实际使用的状态
 */

export enum AIState {
    /** 待命：等待新指令 */
    IDLE = 'IDLE',

    /** 进攻：向敌方城市推进 */
    ATTACKING = 'ATTACKING',

    /** 交战中：正在战斗，无法移动 */
    IN_COMBAT = 'IN_COMBAT'
}

/**
 * AI 配置常量
 */
export const AI_CONFIG = {
    /** AI 决策间隔 (毫秒) */
    DECISION_INTERVAL_MS: 3000,

    /** 每个 AI 军团每帧行动的概率 (防止所有军团同时行动) */
    ACTION_PROBABILITY: 0.05
};
