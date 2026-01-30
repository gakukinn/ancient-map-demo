/**
 * MultiLegionFieldBattle - 多军团野战处理器
 * 
 * 处理指定多支军团参战的野战事件。
 * 使用 BattleField (区域战斗) 系统支持多单位混战。
 */

import { FieldBattleData } from '../types/core';
import { LegionManager } from './LegionManager';
import { Army } from './Army';
import { CityManager } from './CityManager';
import { CombatSystem, IBattleUnit } from './CombatSystem';
import { BattleUnitFactory } from './BattleUnitFactory';
import { Player } from './Player';
import { EventVisualizer } from './EventVisualizer';
import { HISTORICAL_LEGIONS } from '../data/legions';
import { LegionType } from '../types/UnitTypes';
import { roadRegistry } from './RoadRegistry';
import { getEuclideanDistance } from './DistanceUtils';
import { PLAYER_SPEED_TIERS } from '../config/GameConfig';

const BATTLE_OFFSET = 0.14; // [TUNED] Reduced from 0.15 to minimize teleport feeling
const MARCH_TIME = 4.0; // [NEW] Fixed march time for all armies

export class MultiLegionFieldBattle {
    private legionManager: LegionManager;
    private cityManager: CityManager;
    private combatSystem: CombatSystem;
    private player: Player;
    private visualizer: EventVisualizer;

    constructor(
        legionManager: LegionManager,
        cityManager: CityManager,
        combatSystem: CombatSystem,
        player: Player,
        visualizer: EventVisualizer
    ) {
        this.legionManager = legionManager;
        this.cityManager = cityManager;
        this.combatSystem = combatSystem;
        this.player = player;
        this.visualizer = visualizer;
    }

    /**
     * 检查是否应该使用多军团战斗系统
     */
    public static shouldUseMultiLegion(data: FieldBattleData): boolean {
        return !!(
            (data.attackerLegionNames && data.attackerLegionNames.length > 0) ||
            (data.defenderLegionNames && data.defenderLegionNames.length > 0) ||
            // 向后兼容旧的 ID 格式
            (data.attackerLegionIds && data.attackerLegionIds.length > 0) ||
            (data.defenderLegionIds && data.defenderLegionIds.length > 0)
        );
    }

    /**
     * 处理多军团野战事件
     */
    public handleMultiLegionBattle(
        data: FieldBattleData,
        onBattleEnd?: (winnerFaction: string, winningArmies: Army[]) => void
    ): void {
        console.log(`🏟️ [MultiLegion] 开始多军团野战处理`);

        const battleLocation = data.location;
        const attackerPosition = { lat: battleLocation.lat, lng: battleLocation.lng - BATTLE_OFFSET };
        const defenderPosition = { lat: battleLocation.lat, lng: battleLocation.lng + BATTLE_OFFSET };

        // 优先使用 legionNames 数组，向后兼容 legionIds，同时支持单一军团名称
        let attackerLegionNames = data.attackerLegionNames || data.attackerLegionIds || [];
        let defenderLegionNames = data.defenderLegionNames || data.defenderLegionIds || [];

        // [FIX] 如果数组为空但有单一军团名称，使用单一名称（"创建新军团"场景）
        if (attackerLegionNames.length === 0 && data.attackerLegionName) {
            attackerLegionNames = [data.attackerLegionName];
        }
        if (defenderLegionNames.length === 0 && data.defenderLegionName) {
            defenderLegionNames = [data.defenderLegionName];
        }

        // [NEW] 如果防守方未指定军团，自动搜索附近的防守方军团
        if (defenderLegionNames.length === 0) {
            const allArmies = this.legionManager.getArmies();
            const nearbyDefenders = allArmies.filter(a =>
                a.getFactionId() === data.defenderFactionId &&
                !a.isDestroyed &&
                // 简单的距离检查 (约 100-200km 范围)
                Math.abs(a.getPosition().lat - battleLocation.lat) < 2.0 &&
                Math.abs(a.getPosition().lng - battleLocation.lng) < 2.0
            );

            if (nearbyDefenders.length > 0) {
                defenderLegionNames = nearbyDefenders.map(a => a.name || 'Unknown Legion');
                console.log(`[MultiLegion] 自动检测到防守方军团 (${defenderLegionNames.length}): ${defenderLegionNames.join(', ')}`);
            }
        }

        // 收集攻击方军团
        const attackerArmies = this.collectArmies(
            attackerLegionNames,
            data.attackerFactionId,
            attackerPosition,
            data.attackerTroops,
            data.attackerSourceCityId,
            data.attackerSourceLocation // [NEW]
        );

        // 收集防守方军团
        const defenderArmies = this.collectArmies(
            defenderLegionNames,
            data.defenderFactionId,
            defenderPosition,
            data.defenderTroops,
            data.defenderSourceCityId,
            undefined // Defender source location not supported yet
        );

        console.log(`[MultiLegion] 攻击方军团: ${attackerArmies.map(a => a.name).join(', ')}`);
        console.log(`[MultiLegion] 防守方军团: ${defenderArmies.map(a => a.name).join(', ')}`);

        // [DEBUG] 详细日志：显示每个军团的状态
        attackerArmies.forEach(a => {
            const pos = a.getPosition();
            console.log(`[DEBUG] 攻击方 ${a.name}: 位置=(${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)}), 兵力=${a.getTroops()}, 战斗中=${a.getIsInCombat()}, 已销毁=${a.isDestroyed}`);
        });
        defenderArmies.forEach(a => {
            const pos = a.getPosition();
            console.log(`[DEBUG] 防守方 ${a.name}: 位置=(${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)}), 兵力=${a.getTroops()}, 战斗中=${a.getIsInCombat()}, 已销毁=${a.isDestroyed}`);
        });

        if (attackerArmies.length === 0 || defenderArmies.length === 0) {
            console.error(`[MultiLegion] 缺少参战军团，无法开始战斗`);
            // [FIX] Still call onBattleEnd to signal event completion (otherwise queue blocks forever)
            onBattleEnd?.('', []);
            return;
        }

        // [FIX] 双方同时移动到战场
        // 检查玩家是否应该参战 (如果玩家属于攻方或守方)
        let playerParticipating = false;
        let playerSide: 'attacker' | 'defender' | null = null;
        const playerFaction = this.player.getFaction();

        // [USER REQUEST] 暂时移除玩家自动参战逻辑
        /*
        console.log(`[MultiLegion] Check Player Join: Faction=${playerFaction}, Attacker=${data.attackerFactionId}, Defender=${data.defenderFactionId}, Fighting=${this.player.isFighting}`);

        if (!this.player.isFighting) {
            if (playerFaction === data.attackerFactionId) {
                playerParticipating = true;
                playerSide = 'attacker';
            } else if (playerFaction === data.defenderFactionId) {
                playerParticipating = true;
                playerSide = 'defender';
            }
        } else {
            console.log(`[MultiLegion] 玩家正在其他战斗中，无法响应召唤`);
        }
        */

        // 总等待数量 = 攻击军团 + 防守军团 + 玩家(如果参战)
        const totalArmies = attackerArmies.length + defenderArmies.length + (playerParticipating ? 1 : 0);
        let arrivedCount = 0;

        console.log(`[MultiLegion] 总参战单位: ${totalArmies} (玩家参战: ${playerParticipating})`);

        const onArmyArrived = () => {
            arrivedCount++;
            console.log(`[MultiLegion] 单位到达战场 (${arrivedCount}/${totalArmies})`);
            if (arrivedCount >= totalArmies) {
                // 所有军团(含玩家)就位，开始战斗
                // [FIX] Delay battle start to next tick.
                // This prevents LegionManager.update (current frame) from reverting 
                // the forced teleportation we are about to do in startRegionalBattle.
                setTimeout(() => {
                    this.startRegionalBattle(data, attackerArmies, defenderArmies, onBattleEnd);
                }, 0);
            }
        };

        // [CAMERA FIX] Focus on battlefield center (Global Overview)
        // Ensure correct coordinate order: [lat, lng] for Leaflet
        if ((window as any).game?.map) {
            // Stop any existing camera follow first
            if ((window as any).game.cinematicManager) {
                (window as any).game.cinematicManager.stopFollowing();
            }
            // Use getLeafletMap() to access the raw L.Map instance
            // Use getLeafletMap() to access the raw L.Map instance
            // Use getLeafletMap() to access the raw L.Map instance
            // [FIX] Use setView(..., 9, { animate: true, duration: 3.0 }).
            // User requested "Even slower" (started at 0.25, then 1.5, now 3.0).
            // (window as any).game.map.getLeafletMap().setView([data.location.lat, data.location.lng], 9, { animate: true, duration: 3.0 });
        }

        // 攻击方移动
        this.moveArmiesToBattleParallel(attackerArmies, attackerPosition, onArmyArrived, data.speedMultiplier);
        // 防守方移动
        this.moveArmiesToBattleParallel(defenderArmies, defenderPosition, onArmyArrived, data.speedMultiplier);

        // [NEW] 玩家自动前往战场
        if (playerParticipating) {
            console.log(`👤 玩家收到战争召唤，自动前往战场!`);
            const targetPos = playerSide === 'attacker' ? attackerPosition : defenderPosition;

            // 稍微错开一点位置给玩家
            const playerTarget = {
                lat: targetPos.lat + (playerSide === 'attacker' ? 0.05 : -0.05),
                lng: targetPos.lng
            };

            this.player.moveTo(
                playerTarget.lat,
                playerTarget.lng,
                () => {
                    console.log(`👤 玩家到达战场!`);
                    onArmyArrived();
                },
                true // isAutoMarching
            );
        }
    }

    /**
     * 根据名称列表收集军团（如果被消灭则重新创建）
     */
    private collectArmies(
        legionNames: string[],
        factionId: string,
        targetPos: { lat: number, lng: number },
        troops?: number,
        sourceCityId?: string, // [NEW]
        sourceLocation?: { lat: number, lng: number } // [NEW]
    ): Army[] {
        const armies: Army[] = [];
        const allArmies = this.legionManager.getArmies();
        const DEFAULT_TROOPS = 20000;

        for (const legionName of legionNames) {
            // 目标兵力：如果事件指定了troops则用事件的，否则用默认值
            const targetTroops = troops || DEFAULT_TROOPS;

            // 按名称查找未被消灭、且未在战斗中的军团
            // [FIX] 移除 isIdle() 检查，因为它要求 hasArrived=true，
            // 这会导致刚创建或正在移动的军团被误认为"不存在"而重复创建
            let army = allArmies.find(a =>
                a.name === legionName &&
                a.getFactionId() === factionId &&
                !a.isDestroyed &&
                !a.getIsInCombat() // 只要不在战斗中就可以调用
            );

            if (army) {
                // [FIX] 复用军团时，如果当前兵力低于目标兵力，则补齐
                if (troops) {
                    army.setTroops(troops);
                } else if (army.getTroops() < targetTroops) {
                    console.log(`[MultiLegion] 军团 ${army.name} 兵力不足 (${army.getTroops()}), 补齐至 ${targetTroops}`);
                    army.setTroops(targetTroops);
                }

                // [NEW] 如果指定了出发城市/位置，强制将现有军团移动到该位置（调度）
                if (sourceLocation) {
                    console.log(`[MultiLegion] 调度现有军团 ${army.name} 到指定坐标: ${sourceLocation.lat}, ${sourceLocation.lng}`);
                    army.setPosition(sourceLocation.lat, sourceLocation.lng);
                } else if (sourceCityId) {
                    const srcCity = this.cityManager.getCityById(sourceCityId);
                    if (srcCity) {
                        console.log(`[MultiLegion] 调度现有军团 ${army.name} 到指定出发点: ${srcCity.name}`);
                        army.setPosition(srcCity.latitude, srcCity.longitude);
                    }
                }

                armies.push(army);
                console.log(`[MultiLegion] 找到并准备军团: ${army.name} (${army.getTroops()} 兵)`);
            } else {
                // [NEW] 如果军团不存在或被消灭，重新创建
                console.log(`[MultiLegion] 军团 "${legionName}" 不存在或已被消灭，重新创建...`);

                // 从阵营城市征兵
                const requestedTroops = targetTroops; // 使用计算出的目标兵力
                let recruitedTroops = this.cityManager.recruitTroopsFromFaction(factionId, requestedTroops);

                // [FIX] 如果征兵不足（少于目标的 80%），强制补全（剧情需要，确保战斗平衡）
                if (recruitedTroops < requestedTroops * 0.8) {
                    console.log(`[MultiLegion] 征兵不足 (${recruitedTroops}/${requestedTroops})，系统强制补给`);
                    recruitedTroops = requestedTroops;
                }

                // [NEW] 确定出生点：优先使用指定的 sourceLocation / sourceCityId
                let spawnPos = targetPos;

                if (sourceLocation) {
                    spawnPos = sourceLocation;
                    console.log(`[MultiLegion] 使用指定出发坐标: ${spawnPos.lat}, ${spawnPos.lng}`);
                } else if (sourceCityId) {
                    const specificCity = this.cityManager.getCityById(sourceCityId);
                    if (specificCity) {
                        spawnPos = { lat: specificCity.latitude, lng: specificCity.longitude };
                        console.log(`[MultiLegion] 使用指定出发城市: ${specificCity.name}`);
                    } else {
                        console.warn(`[MultiLegion] 未找到指定出发城市 ID: ${sourceCityId}，将寻找最近城市`);
                        // Fallback to nearest
                        const spawnCity = this.cityManager.getNearestCity(factionId, { latitude: targetPos.lat, longitude: targetPos.lng });
                        if (spawnCity) spawnPos = { lat: spawnCity.latitude, lng: spawnCity.longitude };
                    }
                } else {
                    // 默认逻辑：找最近的友方城市作为出生点
                    const spawnCity = this.cityManager.getNearestCity(factionId, { latitude: targetPos.lat, longitude: targetPos.lng });
                    if (spawnCity) spawnPos = { lat: spawnCity.latitude, lng: spawnCity.longitude };
                }

                // Get type from historical config
                let lType: LegionType = 'infantry';
                const config = HISTORICAL_LEGIONS.find(l => l.name === legionName);
                if (config && config.type) {
                    // Accept any valid type from config (including faction-prefixed types)
                    lType = config.type as LegionType;
                }

                // 创建新军团
                const newArmy = this.legionManager.createLegion(
                    spawnPos,
                    recruitedTroops,
                    factionId,
                    legionName,
                    () => { }, // 到达回调稍后设置
                    lType // [NEW]
                );
                this.legionManager.addArmy(newArmy);
                armies.push(newArmy);

                console.log(`[MultiLegion] 重新创建军团: ${legionName} (${recruitedTroops} 兵)`);
            }
        }

        return armies;
    }

    /**
     * 移动多支军团到战场位置（并行版本，每个军团到达时调用回调）
     */
    private moveArmiesToBattleParallel(
        armies: Army[],
        targetPos: { lat: number, lng: number },
        onEachArrived: () => void,
        speedMultiplier: number = 1.0 // [NEW] Accept speed multiplier
    ): void {
        const totalCount = armies.length;

        if (totalCount === 0) {
            return;
        }

        armies.forEach((army, index) => {
            // 稍微错开位置，避免重叠
            const offset = (index - (totalCount - 1) / 2) * 0.05;
            const armyTarget = { lat: targetPos.lat + offset, lng: targetPos.lng };

            // [FIX] Ignore city collision during field battle movement
            army.ignoreCityCollision = true;

            const startPos = army.getPosition();
            const directDist = getEuclideanDistance(startPos, armyTarget);

            // [FIX] Instant arrival check for extremely short distances (< 2km)
            // 防止防守方生成在战场附近时因距离过近导致速度计算异常或永远不到达
            if (directDist < 0.02) {
                console.log(`[MultiLegion] Army ${army.name} is already at target (Dist: ${directDist.toFixed(4)}), instant arrival.`);
                army.setPosition(armyTarget.lat, armyTarget.lng);
                // Reset states immediately
                army.setSpeedMultiplier(1.0);
                army.ignoreCityCollision = false; // [FIX] Restore physics
                onEachArrived();
                return;
            }

            // 先设置回调，再开始移动，确保万无一失
            army.setOnArriveCallback(() => {
                console.log(`[MultiLegion] 军团 ${army.name} 到达战场`);
                // [NEW] Reset speed multiplier and collision flag after arrival
                army.setSpeedMultiplier(1.0);
                army.ignoreCityCollision = false; // [FIX] Restore physics
                onEachArrived();
            });

            const path = roadRegistry.findPathOnRoad(startPos, armyTarget);

            if (path && path.length >= 2) {
                // Determine speed based on road distance
                let actualPathLength = 0;
                for (let i = 0; i < path.length - 1; i++) {
                    actualPathLength += getEuclideanDistance(path[i], path[i + 1]);
                }
                const baseSpeed = PLAYER_SPEED_TIERS.STANDARD_SPEED; // 0.15

                // [FIX] Ensure minimum speed to prevent stuck armies
                const calculatedSpeed = (actualPathLength / MARCH_TIME) / baseSpeed * speedMultiplier;
                // 最小速度保障：即使距离极短，也要保证有速度
                const finalSpeed = Math.max(calculatedSpeed, 0.1);

                army.setSpeedMultiplier(finalSpeed);
                console.log(`[MultiLegion] Army ${army.name} moving via road (Speed: ${finalSpeed.toFixed(2)}x)`);
                army.moveAlongPath(path.slice(1));
            } else {
                // Direct path fallback
                const baseSpeed = PLAYER_SPEED_TIERS.STANDARD_SPEED;

                // [FIX] Ensure minimum speed
                const calculatedSpeed = (directDist / MARCH_TIME) / baseSpeed * speedMultiplier;
                const finalSpeed = Math.max(calculatedSpeed, 0.1);

                army.setSpeedMultiplier(finalSpeed);
                console.log(`[MultiLegion] Army ${army.name} moving via direct path (Speed: ${finalSpeed.toFixed(2)}x)`);
                army.moveAlongPath([armyTarget]);
            }

        });
    }

    /**
     * 启动区域战斗
     */
    private startRegionalBattle(
        data: FieldBattleData,
        attackerArmies: Army[],
        defenderArmies: Army[],
        onBattleEnd?: (winnerFaction: string, winningArmies: Army[]) => void
    ): void {
        console.log(`⚔️ [MultiLegion] 启动区域战斗!`);

        // 显示战斗特效
        const battleId = `mfb_${Date.now()}`;
        const effectId = battleId + '_effect';
        // [USER REQUEST] Disable Field Battle Effect
        // this.visualizer.showFieldBattleEffect(data.location.lat, data.location.lng, effectId);

        // 战斗结束清理回调
        let isBattleOver = false;
        let hasTriggeredEnd = false;

        const onBattleComplete = () => {
            if (isBattleOver) return; // 避免重复清理
            isBattleOver = true;
            this.visualizer.hideFieldBattleEffect(effectId);

            // [FIX] Reset combat state for all armies
            [...attackerArmies, ...defenderArmies].forEach(army => {
                if (!army.isDestroyed) {
                    army.setCombatState(false);
                }
            });
        };

        const attackerPosition = { lat: data.location.lat, lng: data.location.lng - BATTLE_OFFSET };
        const defenderPosition = { lat: data.location.lat, lng: data.location.lng + BATTLE_OFFSET };

        // [FIX] Force Teleport to Start Positions (Avoid physics/blocking issues)
        // Ensure perfect alignment for the cinematic battle
        attackerArmies.forEach((a, index) => {
            // Apply slight formation spread if multiple armies (vertical line)
            const spreadLat = data.location.lat + (index * 0.02);
            const pos = { lat: spreadLat, lng: attackerPosition.lng };

            // Stop any residual movement FIRST
            a.stopMovement();
            // Then Teleport
            a.setPosition(pos.lat, pos.lng);

            a.setCombatState(true, 'field', defenderPosition);
        });

        defenderArmies.forEach((a, index) => {
            // Apply slight formation spread if multiple armies (vertical line)
            // Mirror the spread for defenders
            const spreadLat = data.location.lat + (index * 0.02);
            const pos = { lat: spreadLat, lng: defenderPosition.lng };

            // Stop any residual movement FIRST
            a.stopMovement();
            // Then Teleport
            a.setPosition(pos.lat, pos.lng);

            a.setCombatState(true, 'field', attackerPosition);
        });

        const handleAttackerVictory = () => {
            if (!hasTriggeredEnd && onBattleEnd) {
                hasTriggeredEnd = true;
                const survivingArmies = attackerArmies.filter(a => !a.isDestroyed);
                console.log(`[MultiLegion] 攻击方胜利，触发后续逻辑，剩余军团数: ${survivingArmies.length}`);
                onBattleEnd(data.attackerFactionId, survivingArmies);
            }
        };

        // 创建战斗单位适配器
        // [FIX] Plot Armor: Check if this side is scripted to win
        const attackerShouldSurvive = data.result === 'attacker_win';

        const attackerUnits: IBattleUnit[] = attackerArmies.map((army, index) =>
            BattleUnitFactory.createAdapter(
                army.id,
                army.name || 'Attacker',
                army.getFactionId(),
                army,
                'legion',
                army.getTroops(),
                () => {
                    // Victory
                    onBattleComplete(); // 清除特效
                    console.log(`[MultiLegion] ${army.name} 获胜!`);
                    handleAttackerVictory();
                },
                () => {
                    // Defeat Callback
                    onBattleComplete(); // 清除特效

                    if (attackerShouldSurvive) {
                        console.log(`[MultiLegion] 剧情保护触发: ${army.name} 虽然兵力耗尽但在剧情中获胜，避免销毁。`);
                        army.setTroops(10000); // 剧情幸存 - 保底 10000 兵力
                        // 此时仍视为"Defeat"回调被调用，但我们强制保留军团
                        handleAttackerVictory(); // 强制触发这一方的胜利后续
                    } else {
                        army.destroy();
                    }
                },
                undefined
            )
        );

        // [FIX] Plot Armor for Defender
        const defenderShouldSurvive = data.result === 'defender_win';

        const defenderUnits: IBattleUnit[] = defenderArmies.map(army =>
            BattleUnitFactory.createAdapter(
                army.id,
                army.name || 'Defender',
                army.getFactionId(),
                army,
                'legion',
                army.getTroops(),
                () => { onBattleComplete(); /* victory */ },
                () => {
                    onBattleComplete();
                    if (defenderShouldSurvive) {
                        console.log(`[MultiLegion] 剧情保护触发: ${army.name} 虽然兵力耗尽但在剧情中获胜，避免销毁。`);
                        army.setTroops(10000); // 剧情幸存 - 保底 10000 兵力
                    } else {
                        army.destroy();
                    }
                },
                undefined
            )
        );

        // [NEW] 检查玩家是否参战
        const playerPos = this.player.getPosition();
        const distToBattle = Math.sqrt(
            Math.pow(playerPos.latitude - data.location.lat, 2) +
            Math.pow(playerPos.longitude - data.location.lng, 2)
        );
        const JOIN_DISTANCE = 0.5; // 参战距离范围

        if (distToBattle <= JOIN_DISTANCE) {
            const playerFaction = this.player.getFaction();

            if (playerFaction === data.attackerFactionId) {
                console.log(`👤 玩家加入攻击方! (${playerFaction})`);
                const playerUnit = BattleUnitFactory.createAdapter(
                    'player',
                    'Player',
                    playerFaction,
                    this.player,
                    'player',
                    this.player.getTroops(),
                    () => {
                        // Player Victory
                        onBattleComplete();
                        this.player.recruitTroops(Math.floor(this.player.getTroops() * 0.1)); // 小奖励
                        this.player.setCombatState(false); // [FIX] End Fighting
                        handleAttackerVictory();
                    },
                    () => {
                        // Player Defeat
                        onBattleComplete();
                        this.player.setTroops(0);
                        this.player.setCombatState(false); // [FIX] End Fighting
                    },
                    undefined
                );
                attackerUnits.push(playerUnit);
            } else if (playerFaction === data.defenderFactionId) {
                console.log(`👤 玩家加入防守方! (${playerFaction})`);
                const playerUnit = BattleUnitFactory.createAdapter(
                    'player',
                    'Player',
                    playerFaction,
                    this.player,
                    'player',
                    this.player.getTroops(),
                    () => {
                        // Player Victory (Defender)
                        onBattleComplete();
                        this.player.recruitTroops(Math.floor(this.player.getTroops() * 0.1));
                        this.player.setCombatState(false); // [FIX] End Fighting
                    },
                    () => {
                        // Player Defeat
                        onBattleComplete();
                        this.player.setTroops(0);
                        this.player.setCombatState(false); // [FIX] End Fighting
                    },
                    undefined
                );
                defenderUnits.push(playerUnit);
            }
        }



        // 启动区域战斗
        // [FIX] 传递预设结果参数 (data.result)
        // [FIX] Set Player Combat State if involved
        const isPlayerInvolved = attackerUnits.some(u => u.id === 'player') ||
            defenderUnits.some(u => u.id === 'player');

        if (isPlayerInvolved) {
            this.player.setCombatState(true, 'field', { lat: data.location.lat, lng: data.location.lng });
        }

        const battleField = this.combatSystem.startRegionalBattle(
            data.attackerFactionId,
            attackerUnits,
            data.defenderFactionId,
            defenderUnits,
            data.result, // [FIX] 传递预设胜负结果
            data.customDuration // [NEW] 传递自定义战斗时长
        );

        // [NEW] Hook up BattleField completion to external system
        battleField.onBattleComplete = (winnerFactionId) => {
            console.log(`[MultiLegion] BattleField ${battleField.id} reports completion. Winner: ${winnerFactionId}`);
            // Ensure visualizer cleanup
            this.visualizer.hideFieldBattleEffect(effectId);

            if (onBattleEnd) {
                const survivingArmies = winnerFactionId === data.attackerFactionId
                    ? attackerArmies.filter(a => !a.isDestroyed)
                    : defenderArmies.filter(a => !a.isDestroyed);
                onBattleEnd(winnerFactionId, survivingArmies);
            }
        };

        console.log(`[MultiLegion] 战场创建成功: ${battleField.id}`);
    }
}
