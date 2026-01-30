/**
 * DistanceUtils - 统一的距离与坐标判定工具库
 * 
 * 设计目标：
 * 1. 统一游戏中所有距离计算方式
 * 2. 提供标准化的"到达"判定阈值
 * 3. 支持六边形网格距离和欧几里得距离
 */

import { GridSystem } from '../systems/GridSystem';

// ==================== 标准阈值定义 ====================
/**
 * 距离阈值常量
 * 所有涉及距离判定的逻辑都应使用这些常量
 */
export const DISTANCE_THRESHOLDS = {
    /** 到达城市/目标点的判定距离 (LatLng 单位) */
    ARRIVAL: 0.15,

    /** 临近城市的判定距离 (用于驻扎、补给) */
    NEARBY_CITY: 0.2,

    /** 战斗参与距离 (LatLng 单位) */
    COMBAT_PARTICIPATION: 1.5,

    /** 同一 Hex 判定 (Hex 步数) */
    SAME_HEX: 0,

    /** 相邻 Hex 判定 (Hex 步数) */
    ADJACENT_HEX: 1,

    /** 增援搜索半径 (Hex 步数) */
    REINFORCEMENT_RANGE: 1,  // 增援范围（1 圈六边形 = 直接相邻）
} as const;

// ==================== 坐标类型定义 ====================
export interface LatLng {
    lat: number;
    lng: number;
}

export interface AxialHex {
    q: number;
    r: number;
}

// ==================== 网格常量 ====================
const DEFAULT_CENTER_LAT = 34.26;

// ==================== 距离计算函数 ====================

/**
 * 计算两点之间的欧几里得距离 (LatLng)
 */
export function getEuclideanDistance(pos1: LatLng, pos2: LatLng): number {
    const dx = pos1.lat - pos2.lat;
    const dy = pos1.lng - pos2.lng;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算两点之间的六边形距离 (Hex 步数)
 * 使用 Axial 坐标系
 */
export function getHexDistance(pos1: LatLng, pos2: LatLng, centerLat: number = DEFAULT_CENTER_LAT): number {
    const hex1 = GridSystem.latLngToAxial(pos1.lat, pos1.lng);
    const hex2 = GridSystem.latLngToAxial(pos2.lat, pos2.lng);

    // 六边形距离公式: max(|q1-q2|, |r1-r2|, |s1-s2|)
    // 其中 s = -q - r
    const dq = Math.abs(hex1.q - hex2.q);
    const dr = Math.abs(hex1.r - hex2.r);
    const ds = Math.abs((-hex1.q - hex1.r) - (-hex2.q - hex2.r));

    return Math.max(dq, dr, ds);
}

/**
 * 将 LatLng 转换为 Axial Hex 坐标
 */
export function toAxialHex(pos: LatLng, centerLat: number = DEFAULT_CENTER_LAT): AxialHex {
    return GridSystem.latLngToAxial(pos.lat, pos.lng);
}

// ==================== 判定函数 ====================

/**
 * 判断单位是否已到达目标点
 */
export function hasArrived(currentPos: LatLng, targetPos: LatLng): boolean {
    return getEuclideanDistance(currentPos, targetPos) <= DISTANCE_THRESHOLDS.ARRIVAL;
}

/**
 * 判断单位是否在城市附近 (可进行驻扎、补给)
 */
export function isNearCity(unitPos: LatLng, cityPos: LatLng): boolean {
    return getEuclideanDistance(unitPos, cityPos) <= DISTANCE_THRESHOLDS.NEARBY_CITY;
}

/**
 * 判断单位是否可参与战斗
 */
export function canParticipateInCombat(unitPos: LatLng, battlePos: LatLng): boolean {
    return getEuclideanDistance(unitPos, battlePos) <= DISTANCE_THRESHOLDS.COMBAT_PARTICIPATION;
}

/**
 * 判断两个单位是否在同一 Hex
 */
export function isSameHex(pos1: LatLng, pos2: LatLng, centerLat: number = DEFAULT_CENTER_LAT): boolean {
    return getHexDistance(pos1, pos2, centerLat) === DISTANCE_THRESHOLDS.SAME_HEX;
}

/**
 * 判断两个单位是否相邻 (Hex 距离 <= 1)
 */
export function isAdjacentHex(pos1: LatLng, pos2: LatLng, centerLat: number = DEFAULT_CENTER_LAT): boolean {
    return getHexDistance(pos1, pos2, centerLat) <= DISTANCE_THRESHOLDS.ADJACENT_HEX;
}

/**
 * 判断单位是否在增援范围内
 */
export function isWithinReinforcementRange(unitPos: LatLng, targetPos: LatLng, centerLat: number = DEFAULT_CENTER_LAT): boolean {
    return getHexDistance(unitPos, targetPos, centerLat) <= DISTANCE_THRESHOLDS.REINFORCEMENT_RANGE;
}

// ==================== 辅助转换函数 ====================

/**
 * 从城市对象提取 LatLng (兼容不同的城市数据结构)
 */
export function cityToLatLng(city: { latitude: number; longitude: number } | { lat: number; lng: number }): LatLng {
    if ('latitude' in city) {
        return { lat: city.latitude, lng: city.longitude };
    }
    return { lat: city.lat, lng: city.lng };
}

/**
 * 标准化坐标对象 (兼容多种输入格式)
 */
export function normalizePosition(pos: { latitude?: number; longitude?: number; lat?: number; lng?: number }): LatLng {
    return {
        lat: pos.lat ?? pos.latitude ?? 0,
        lng: pos.lng ?? pos.longitude ?? 0,
    };
}
