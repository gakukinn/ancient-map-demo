/**
 * TargetEvaluator.ts
 * 
 * 目标评估器：为 AI 军团计算每个潜在目标的"价值分数"。
 * 分数越高 = 越值得攻击。
 */

import { City } from '../types/core';
import { Army } from '../core/Army';
import { CityManager } from '../core/CityManager';
import { LegionManager } from '../core/LegionManager';
import { GridSystem } from '../systems/GridSystem';
import { GameConfig } from '../config/GameConfig';
import { getMinGarrison } from '../config/CityConfig';

export interface TargetScore {
    city: City;
    score: number;
    distance: number;
    threatLevel: number;  // 敌方兵力
    strategicValue: number;
}

export class TargetEvaluator {
    private cityManager: CityManager;
    private legionManager: LegionManager;

    constructor(cityManager: CityManager, legionManager: LegionManager) {
        this.cityManager = cityManager;
        this.legionManager = legionManager;
    }

    /**
     * 为指定军团评估所有敌方城市，返回按分数排序的目标列表。
     * 核心逻辑：基于兵力对比、距离和战略价值进行综合评分。
     */
    public evaluateTargets(army: Army): TargetScore[] {
        const myFaction = army.getFactionId();
        const myTroops = army.getTroops();

        // [MODIFIED] 以都城为中心计算距离，而非军队当前位置
        const capitalCity = this.cityManager.getCitiesByFaction(myFaction)
            .find(c => c.type === 'huge_city');

        // 如果没有都城，使用军队当前位置
        let centerHex: { q: number, r: number };
        if (capitalCity) {
            centerHex = GridSystem.latLngToAxial(capitalCity.latitude, capitalCity.longitude);
        } else {
            const myPos = army.getPosition();
            centerHex = GridSystem.latLngToAxial(myPos.lat, myPos.lng);
        }

        const allCities = this.cityManager.getCities();
        const scores: TargetScore[] = [];

        for (const city of allCities) {
            // 跳过友方城市 (进攻中立或敌对)
            if (city.factionId === myFaction) {
                continue;
            }

            const cityPos = { lat: city.latitude, lng: city.longitude };
            const cityHex = GridSystem.latLngToAxial(cityPos.lat, cityPos.lng);

            // [MODIFIED] 使用都城到目标的距离，按距离向外扩张
            const distance = GridSystem.getDistance(centerHex, cityHex);

            // [RULE] 优先攻击最近的城市
            // 距离惩罚指数级增加：Math.pow(distance, 1.5)
            // 降低指数以鼓励 AI 稍微看远一点
            const distancePenalty = Math.max(1, Math.pow(distance, 1.5));

            // 综合威胁评估：城市驻军 + 附近的敌方军团
            const threatLevel = this.calculateThreatLevel(city, myFaction);

            // 兵力对比 (Strength Ratio)
            // ratio > 1 表示我方优势，ratio < 1 表示敌方优势
            const strengthRatio = myTroops / Math.max(1, threatLevel);

            // [REMOVED] 战略价值 - 不再使用
            const strategicValue = 1.0; // 固定为1，不影响评分

            // 如果胜算太低 (少于敌方 50%)，且距离较远，则忽略
            // 但如果距离很近(<=3)，即使兵力劣势也可能去骚扰
            if (strengthRatio < 0.5 && distance > 3) continue;

            // 核心评分公式（简化版）：
            // Score = (兵力优势^2 * 1000) / 距离惩罚
            // 优先攻击距离都城近且能打赢的城市
            let score = (Math.pow(strengthRatio, 2) * 1000) / distancePenalty;

            // [BONUS] 极近距离加分 (距离 <= 5 格，极大增加仇恨)
            if (distance <= 5) {
                score *= 3.0;
            }

            scores.push({
                city,
                score,
                distance,
                threatLevel,
                strategicValue
            });
        }

        // 按分数降序排列
        scores.sort((a, b) => b.score - a.score);
        return scores;
    }

    /**
     * 计算目标的综合威胁等级 (防御力量)
     * 包括：城市驻军 + 城市周围所有的敌方军团
     */
    private calculateThreatLevel(city: City, attackerFactionId: string): number {
        // Use dynamic garrison based on city type (10% of maxTroops)
        const minGarrison = getMinGarrison(city.type);
        let threat = city.troops || minGarrison;

        // [IMPROVED] 扫描城市周围 2 格寻找敌方军团
        // 任何在该范围内的敌军都应被视为潜在的防守力量
        const nearbyArmies = this.legionManager.getArmiesInRadius({ lat: city.latitude, lng: city.longitude }, 2);

        for (const army of nearbyArmies) {
            // 如果是敌方军团（相对于攻击者）
            if (army.getFactionId() !== attackerFactionId) {
                threat += army.getTroops();
            }
        }

        // 简单防御系数：如果是关隘或大城市，防御效率更高，等效兵力更多
        if (city.type === 'pass') {
            threat *= 1.5;
        }

        return threat;
    }

    /**
     * 找到最近的友方城市（用于撤退）
     */
    public findNearestFriendlyCity(army: Army): City | null {
        const myFaction = army.getFactionId();
        const myPos = army.getPosition();
        const myHex = GridSystem.latLngToAxial(myPos.lat, myPos.lng);

        const friendlyCities = this.cityManager.getCitiesByFaction(myFaction);
        if (friendlyCities.length === 0) return null;

        let nearest: City | null = null;
        let minDist = Infinity;

        for (const city of friendlyCities) {
            const cityHex = GridSystem.latLngToAxial(city.latitude, city.longitude);
            const dist = GridSystem.getDistance(myHex, cityHex);

            if (dist < minDist) {
                minDist = dist;
                nearest = city;
            }
        }

        return nearest;
    }

    /**
     * 计算城市的战略价值
     */
    private getStrategicValue(city: City): number {
        let value = 1.0;

        // 根据城市类型增加价值
        switch (city.type) {
            case 'huge_city':
                value = 30.0; // 大城与巨城合并，给予较高战略价值
                break;
            case 'pass':
                value = 25.0; // 关隘是交通命脉
                break;
            case 'large_city':
                value = 5.0;
                break;
            case 'small_city':
                value = 2.0;
                break;
            default:
                value = 1.0;
        }
        return value;
    }
}
