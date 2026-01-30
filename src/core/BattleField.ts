/**
 * BattleField - 区域战斗管理器
 * 
 * 支持多单位、多势力的混战，每个单位独立计算兵力。
 * 例如：玩家+华夏军团+城市 vs 蒙古军团
 * 
 * 设计原则：
 * 1. 势力编组：同一势力的单位自动编为一组
 * 2. 独立兵力：每个单位独立受损，"谁带的兵死谁的"
 * 3. 伤害分配：进攻方总伤害按比例分配给防守方各单位
 */

import { IBattleUnit, BattleType, UnitType } from './CombatSystem';
import { GameConfig } from '../config/GameConfig';

// ==================== 类型定义 ====================

export interface BattleFieldUnit {
    unit: IBattleUnit;
    initialTroops: number;
    isDefeated: boolean;
}

export interface FactionGroup {
    factionId: string;
    units: BattleFieldUnit[];
    totalTroops: number;
    initialTotalTroops: number; // [NEW] 初始总兵力，用于计算战斗时长
    totalDamageOutput: number;
    effectivePower: number; // [NEW] 考虑随机波动后的有效战力
    variance: number; // [NEW] 随机系数 (0.5 ~ 1.5)
}

// ==================== 战场类 ====================

export class BattleField {
    public id: string;
    public isOver: boolean = false;
    public onBattleComplete?: (winnerFactionId: string) => void; // [NEW] Callback for event sequencing

    public elapsed: number = 0;
    public type: BattleType;
    public targetDuration: number = 0; // [NEW] Public property

    private attackerGroup: FactionGroup;
    private defenderGroup: FactionGroup;
    private presetResult?: 'attacker_win' | 'defender_win';
    private customDuration?: number; // [NEW] Director-controlled duration override
    private defenderDamageMultiplier: number = 1.0; // [NEW] Defense Modifier (Default 1.0)

    // 伤害系数现在从 GameConfig 读取

    constructor(
        attackerFactionId: string,
        attackerUnits: IBattleUnit[],
        defenderFactionId: string,
        defenderUnits: IBattleUnit[],
        presetResult?: 'attacker_win' | 'defender_win',
        customDuration?: number // [NEW] Director-controlled duration in seconds
    ) {
        this.id = `bf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.presetResult = presetResult;
        this.customDuration = customDuration;

        // 初始化攻击方编组 (计算随机战力)
        const attackerInitialTotal = attackerUnits.reduce((sum, u) => sum + u.troops, 0);
        // [NEW] Variance Logic: Power = Troops * (1.0 +/- Variance)
        const getVariance = () => 1.0 + (Math.random() * 2 - 1) * GameConfig.COMBAT.RANDOM_VARIANCE;
        const attackerVariance = getVariance();

        this.attackerGroup = {
            factionId: attackerFactionId,
            units: attackerUnits.map(u => ({
                unit: u,
                initialTroops: u.troops,
                isDefeated: false
            })),
            totalTroops: attackerInitialTotal,
            initialTotalTroops: attackerInitialTotal,
            totalDamageOutput: 0,
            // [NEW] Effective Power for Combat Calculation
            effectivePower: attackerInitialTotal * attackerVariance,
            variance: attackerVariance
        };

        // 初始化防守方编组
        const defenderInitialTotal = defenderUnits.reduce((sum, u) => sum + u.troops, 0);
        const defenderVariance = getVariance();

        this.defenderGroup = {
            factionId: defenderFactionId,
            units: defenderUnits.map(u => ({
                unit: u,
                initialTroops: u.troops,
                isDefeated: false
            })),
            totalTroops: defenderInitialTotal,
            initialTotalTroops: defenderInitialTotal,
            totalDamageOutput: 0,
            // [NEW] Effective Power
            effectivePower: defenderInitialTotal * defenderVariance,
            variance: defenderVariance
        };

        // 判断战斗类型
        const hasCity = defenderUnits.some(u => u.unitType === 'city');
        this.type = hasCity ? 'siege' : 'field';

        // [NEW] Calculate Duration immediately (using POWER now?)
        // Standard behavior uses raw mass (troops) for duration pacing, but Power for outcome.
        this.calculateTargetDuration();

        // 触发战斗开始回调
        this.notifyBattleStart();

        console.log(`🏟️ [BattleField] 区域战斗开始!${presetResult ? ` [预设结果: ${presetResult}]` : ''}`);
        console.log(`   攻方 (${attackerFactionId}): ${attackerInitialTotal.toFixed(0)} troops (Power: ${this.attackerGroup.effectivePower.toFixed(0)}, x${attackerVariance.toFixed(2)})`);
        console.log(`   守方 (${defenderFactionId}): ${defenderInitialTotal.toFixed(0)} troops (Power: ${this.defenderGroup.effectivePower.toFixed(0)}, x${defenderVariance.toFixed(2)})`);
        console.log(`   ⏱️ 预计战斗时长: ${this.targetDuration.toFixed(1)}秒`);
    }

    private calculateTargetDuration() {
        if (this.customDuration !== undefined && this.customDuration > 0) {
            this.targetDuration = this.customDuration;
            console.log(`🎬 [BattleField] 使用导演指定时长: ${this.customDuration}秒`);
            return;
        }

        // const { DURATION_BASE, DURATION_MAX, MASS_FACTOR, SIEGE_BONUS } = GameConfig.COMBAT;
        const totalTroops = this.attackerGroup.initialTotalTroops + this.defenderGroup.initialTotalTroops;

        // [SIMPLIFIED] Linear Model: 1000 troops = 1 second
        // Range: 5s ~ 45s
        const rawDuration = totalTroops / 1000;
        this.targetDuration = Math.max(5.0, Math.min(30.0, rawDuration));

        // const massScale = Math.max(0, Math.log10(totalTroops));
        // let calculatedDuration = DURATION_BASE + (massScale * MASS_FACTOR);

        // if (this.type === 'siege') {
        //     calculatedDuration += SIEGE_BONUS;
        // }
        // this.targetDuration = Math.max(5.0, Math.min(20.0, calculatedDuration));
    }

    public setDefenderDamageMultiplier(multiplier: number): void {
        this.defenderDamageMultiplier = multiplier;
        console.log(`🛡️ [BattleField] 设置防守方伤害系数: ${multiplier}`);
    }

    private notifyBattleStart(): void {
        const allUnits = [...this.attackerGroup.units, ...this.defenderGroup.units];
        allUnits.forEach(bu => {
            const opponent = bu === this.attackerGroup.units[0]
                ? this.defenderGroup.units[0]?.unit
                : this.attackerGroup.units[0]?.unit;
            if (opponent) {
                bu.unit.onBattleStart?.(opponent, this.type);
            }
        });
    }

    public update(deltaTime: number): void {
        if (this.isOver) return;

        const timeScale = (window as any).game?.timeSystem?.timeScale || 1.0;
        const scaledDeltaTime = deltaTime * timeScale;
        this.elapsed += scaledDeltaTime;

        this.updateGroupStats();

        if (this.attackerGroup.totalTroops < 1) {
            this.resolve(this.defenderGroup, this.attackerGroup);
            return;
        }
        if (this.defenderGroup.totalTroops < 1) {
            this.resolve(this.attackerGroup, this.defenderGroup);
            return;
        }

        const attackerFactionId = this.attackerGroup.factionId;
        const mainDefender = this.defenderGroup.units.find(u => u.unit.unitType === 'city');
        if (mainDefender && mainDefender.unit.factionId === attackerFactionId) {
            console.log(`🏰 [BattleField] Siege target ${mainDefender.unit.name} is now friendly to attackers. Ending battle.`);
            this.resolve(this.attackerGroup, this.defenderGroup);
            return;
        }

        const defenderPenalty = this.defenderDamageMultiplier;
        const attackerPenalty = 1.0;

        let strongerGroup: FactionGroup;
        let weakerGroup: FactionGroup;

        if (this.presetResult === 'attacker_win') {
            strongerGroup = this.attackerGroup;
            weakerGroup = this.defenderGroup;
        } else if (this.presetResult === 'defender_win') {
            strongerGroup = this.defenderGroup;
            weakerGroup = this.attackerGroup;
        } else {
            // [FIX] 使用 Effective Power (战力) 判定胜负，而非 Initial Troops
            if (this.attackerGroup.effectivePower >= this.defenderGroup.effectivePower) {
                strongerGroup = this.attackerGroup;
                weakerGroup = this.defenderGroup;
            } else {
                strongerGroup = this.defenderGroup;
                weakerGroup = this.attackerGroup;
            }
        }

        // [FIX] 计算 DPS 时也使用 effectivePower，确保战损符合“战力差”
        const strongerPower = strongerGroup.effectivePower;
        const weakerPower = weakerGroup.effectivePower;
        const ratio = Math.max(1, strongerPower / Math.max(1, weakerPower));

        const targetDuration = this.targetDuration;

        // [LOGIC] 劣势方要在 targetDuration 内消耗殆尽
        // Weaker Loss = Weaker Initial Troops / Duration
        // Wait, should we use Power for calculating DPS rate?
        // Physics: "Damage dealing capacity" is Power. "Health" is Troops.

        // 1. Weak side death rate (Troops/Sec)
        // If weak side has 10k troops and duration is 10s, they lose 1k troops/sec.
        const weakerInitialTroops = weakerGroup.initialTotalTroops;
        const weakerTroopLossRate = weakerInitialTroops / targetDuration;

        // 2. Strong side death rate
        // Strong side executes 100% effectiveness. Weak side executes (1/ratio) effectiveness.
        // Strong side loses fewer troops.
        // Formula: StrongerLoss = WeakerLoss * (WeakerPower / StrongerPower)
        // This is Lanchester's Linear Law approximation for outcome.

        const strongerTroopLossRate = weakerTroopLossRate * (1.0 / ratio);
        // Example: Ratio 2.0 (Strong is 2x Weak). Strong loses 0.5x troops.

        let damageToAttackers: number;
        let damageToDefenders: number;

        if (strongerGroup === this.attackerGroup) {
            damageToDefenders = weakerTroopLossRate * scaledDeltaTime;
            damageToAttackers = strongerTroopLossRate * scaledDeltaTime;
        } else {
            damageToAttackers = weakerTroopLossRate * scaledDeltaTime;
            damageToDefenders = strongerTroopLossRate * scaledDeltaTime;
        }



        // 分配伤害给各单位
        this.distributeDamage(this.defenderGroup, damageToDefenders, defenderPenalty);
        this.distributeDamage(this.attackerGroup, damageToAttackers, attackerPenalty);
    }

    /**
     * 更新各组的总兵力统计
     */
    private updateGroupStats(): void {
        this.attackerGroup.totalTroops = this.attackerGroup.units
            .filter(u => !u.isDefeated)
            .reduce((sum, u) => sum + u.unit.troops, 0);

        this.defenderGroup.totalTroops = this.defenderGroup.units
            .filter(u => !u.isDefeated)
            .reduce((sum, u) => sum + u.unit.troops, 0);
    }

    /**
     * 将总伤害分配给一个编组中的各单位
     * 
     * 分配策略：按兵力比例分配（兵多的扛更多伤害）
     * 这模拟了"前线接战"的概念
     */
    private distributeDamage(group: FactionGroup, totalDamage: number, damageMultiplier: number = 1.0): void {
        const aliveUnits = group.units.filter(u => !u.isDefeated && u.unit.troops > 0);
        if (aliveUnits.length === 0) return;

        const totalTroops = aliveUnits.reduce((sum, u) => sum + u.unit.troops, 0);
        // [STABILITY] 防止除以零或 NaN
        if (totalTroops <= 0 || isNaN(totalTroops)) return;

        aliveUnits.forEach(bu => {
            // 按兵力比例分配伤害
            const ratio = bu.unit.troops / totalTroops;
            let damage = totalDamage * ratio;

            // [NEW] Apply Flanking Damage Multiplier
            // Override: If Director Mode (customDuration set), disable dynamic multipliers to ensure strict timing
            if (this.customDuration) {
                // Force linear damage to respect targetDuration
                damage *= 1.0;
            } else {
                damage *= damageMultiplier;
            }

            // [FAILSAFE] Ensure minimum damage (1 casualty) if there is any damage output
            if (damage > 0 && damage < 1) damage = 1;

            // 检查无敌状态
            if (bu.unit.isInvincible) {
                damage = 0;
            }

            const newTroops = Math.max(0, bu.unit.troops - damage);
            bu.unit.setTroops(newTroops);

            // 显示伤害
            if (damage > 0.5) {
                bu.unit.showDamage?.(damage);
            }

            // 检查是否被击败
            if (newTroops < 1) {
                bu.isDefeated = true;
                console.log(`💀 [BattleField] ${bu.unit.name} 被击败!`);
            }
        });
    }

    /**
     * 战斗结束处理
     */
    private resolve(winnerGroup: FactionGroup, loserGroup: FactionGroup): void {
        this.isOver = true;
        this.onBattleComplete?.(winnerGroup.factionId); // [NEW] Notify System


        console.log(`🏆 [BattleField] 战斗结束! 胜者: ${winnerGroup.factionId}`);

        // 处理失败方
        loserGroup.units.forEach(bu => {
            bu.unit.setTroops(0);
            bu.unit.destroy();
            // 找一个胜利方单位作为对手
            const opponent = winnerGroup.units[0]?.unit;
            if (opponent) {
                bu.unit.onBattleEnd?.('defeat', opponent, 0);
            }
        });

        // 处理胜利方
        winnerGroup.units.filter(u => !u.isDefeated).forEach(bu => {
            // 找一个失败方单位作为对手
            const opponent = loserGroup.units[0]?.unit;
            if (opponent) {
                bu.unit.onBattleEnd?.('victory', opponent, 0);
            }
        });

        // 处理胜利方中被击败的单位 (不论是军队还是城市，只要赢了就不该死)
        winnerGroup.units.filter(u => u.isDefeated).forEach(bu => {
            // [FIX] 胜方复活逻辑: 
            // 如果是城市 -> 必须保留，不能易主。
            // 如果是军队 -> 一般逻辑是溃散，但在合并防御模式下，既然赢了，保留1兵力合情合理 (惨胜)。
            // 简化逻辑：胜方所有单位保留最低安全兵力，视为"幸存"。

            const minSurvival = GameConfig.CITY.MIN_GARRISON_FALLBACK;
            bu.unit.setTroops(minSurvival);
            bu.isDefeated = false; // 复活

            console.log(`🚑 [BattleField] ${bu.unit.name} (胜方) 虽兵力耗尽，但免于溃灭 (Rescued)!`);

            const opponent = loserGroup.units[0]?.unit;
            if (opponent) {
                // 视为胜利
                bu.unit.onBattleEnd?.('victory', opponent, 0);
            }
        });
    }

    // ==================== 辅助方法 ====================

    /**
     * 添加援军到战场
     */
    public addReinforcement(unit: IBattleUnit, isAttacker: boolean): void {
        const group = isAttacker ? this.attackerGroup : this.defenderGroup;

        // 检查是否已在战场
        if (group.units.some(u => u.unit.id === unit.id)) {
            console.warn(`[BattleField] ${unit.name} 已在战场中`);
            return;
        }

        group.units.push({
            unit,
            initialTroops: unit.troops,
            isDefeated: false
        });

        // [FIX] Update Power Stats to include reinforcement
        const unitPower = unit.troops * group.variance;
        group.initialTotalTroops += unit.troops;
        group.effectivePower += unitPower;

        // [FIX] Recalculate duration to reflect the new scale of the battle
        // This prevents "instant kills" when a large army joins a small skirmish
        this.calculateTargetDuration();
        console.log(`⏱️ [BattleField] Duration updated to ${this.targetDuration.toFixed(1)}s`);

        // 通知战斗开始
        const opponent = isAttacker
            ? this.defenderGroup.units[0]?.unit
            : this.attackerGroup.units[0]?.unit;
        if (opponent) {
            unit.onBattleStart?.(opponent, this.type);
        }

        console.log(`📯 [BattleField] ${unit.name}(${unit.troops}) 加入${isAttacker ? '攻方' : '守方'}! (New Power: ${group.effectivePower.toFixed(0)})`);

        this.updateGroupStats();
    }


    /**
     * 获取战场信息
     */
    public getInfo(): { attackerTroops: number; defenderTroops: number; elapsed: number } {
        return {
            attackerTroops: this.attackerGroup.totalTroops,
            defenderTroops: this.defenderGroup.totalTroops,
            elapsed: this.elapsed
        };
    }

    /**
     * 获取攻方阵营ID
     */
    public getAttackerFaction(): string {
        return this.attackerGroup.factionId;
    }

    /**
     * [NEW] 获取攻方所有单位 (供 SiegeManager 检测军队参战状态)
     */
    public getAttackerUnits(): IBattleUnit[] {
        return this.attackerGroup.units.map(u => u.unit);
    }

    /**
     * [NEW] 获取守方所有单位
     */
    public getDefenderUnits(): IBattleUnit[] {
        return this.defenderGroup.units.map(u => u.unit);
    }
}
