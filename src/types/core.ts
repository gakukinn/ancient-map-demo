/**
 * 核心类型定义
 */

// 位置坐标
export interface Position {
    x: number;
    y: number;
}

// 经纬度坐标
export interface LatLng {
    lat: number;
    lng: number;
}

// 地形类型
export enum TerrainType {
    OCEAN = 'ocean',
    NORMAL = 'normal',
    SLOW = 'slow',
    UNKNOWN = 'unknown'
}

// 地形属性
export interface TerrainProperties {
    name: string;
    passable: boolean;
    navalPassable: boolean;
    isWater: boolean;
    color: string;
    moveCost: number;
    speedMultiplier: number;
}

// RGB颜色
export interface RGBColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}

// 队伍/势力
export interface Faction {
    id: string;
    name: string;
    color: string;
    capitalCityId?: string; // [NEW] Designated Capital
    mainLegionId?: string;  // [NEW] Track the single active army
    armyName?: string;      // [NEW] 专属军队名称
    defaultLegionType?: import('./UnitTypes').LegionType; // [NEW] 默认兵种类型
}

export type CityType =
    // 基础类型
    | 'huge_city'         // 大城 (30k)
    | 'large_city'        // 中城 (20k)
    | 'small_city'        // 小城 (10k)
    | 'pass'              // 关隘 (10k)
    | 'ferry';            // 渡口 (10k)

export interface City {
    id: string;
    name: string;
    factionId: string;
    latitude: number;
    longitude: number;
    type: CityType;
    troops: number;
    image?: string;
    mirror?: boolean;
    startYear?: number; // [NEW] Start Year (Visible from this year)
    endYear?: number;   // [NEW] End Year (Visible until this year)
    region?: string;    // [NEW] Explicit region override (e.g., 'WESTERN', 'NOMADIC')
    recruitmentEfficiency?: number; // [NEW] 0.1 - 1.0 based on distance from capital
}

// 游戏状态
export interface GameState {
    units: any[]; // 临时用any，后续替换为Unit[]
    cities: City[];
    effects: any[];
    gameSpeed: number;
}

// ==================== 历史事件类型 (Historical Events) ====================


export type EventType = 'siege' | 'field_battle' | 'narrative' | 'player_join' | 'rename_legion';

export interface SiegeData {
    attackerFactionId: string;
    legionId?: string; // [NEW] Link to LegionConfig
    legionName?: string; // [OPTIONAL] Override name or for one-off
    attackerCityId?: string; // 可选：指定出兵城市（如果不填则自动选择最近的）
    attackerSourceCityId?: string; // [NEW] Optional: Synonym/Alias for attackerCityId for consistent naming
    attackerSourceLocation?: { lat: number, lng: number }; // [NEW] 可选：直接指定出兵坐标（优先级高于 attackerCityId）
    defenderCityId: string;
    attackerTroops?: number;
    defenderTroops?: number; // [NEW] Override city defender troops
    result?: 'attacker_win' | 'defender_win';
    customDuration?: number; // [NEW] Director-controlled battle duration in seconds (overrides troop-based calculation)
    speedMultiplier?: number; // [NEW] Custom movement speed for this event
    // 战后行动 (单一)
    afterBattle?: 'attack_city';
    afterBattleTargetCityId?: string; // 用于 move_to_city 或 attack_city
    // 战后行动链 (多步)
    afterBattleChain?: Array<{
        action: 'attack_city' | 'destroy';
        targetCityId?: string;
        speedMultiplier?: number;
    }>;
    newCityParams?: {
        name: string;
        lat: number;
        lng: number;
        factionId: string;
        image?: string;
        troops?: number;
        type?: CityType;
    };
}

export interface FieldBattleData {
    attackerFactionId: string;
    defenderFactionId: string;
    attackerLegionId?: string;
    defenderLegionId?: string;
    attackerLegionName?: string;  // [NEW] Create new attacker legion
    defenderLegionName?: string;  // [NEW] Create new defender legion
    attackerTroops?: number;      // [NEW] Troops for new attacker legion
    defenderTroops?: number;      // [NEW] Troops for new defender legion

    // [NEW] 多军团参战支持
    attackerSourceCityId?: string; // [NEW] Optional: Specify source city for attacker
    attackerSourceLocation?: { lat: number, lng: number }; // [NEW] Optional: Specify source coordinates for attacker
    defenderSourceCityId?: string; // [NEW] Optional: Specify source city for defender
    attackerLegionIds?: string[]; // 指定多支攻击方军团ID
    defenderLegionIds?: string[]; // 指定多支防守方军团ID
    attackerLegionNames?: string[]; // 按名称指定多支攻击方军团
    defenderLegionNames?: string[]; // 按名称指定多支防守方军团

    location: { lat: number, lng: number };
    result?: 'attacker_win' | 'defender_win';
    speedMultiplier?: number; // [NEW] Custom movement speed for this event
    customDuration?: number;  // [NEW] Director-controlled battle duration in seconds
    newCityParams?: {
        name: string;
        lat: number;
        lng: number;
        factionId: string;
        image?: string;
        troops?: number;
        type?: CityType;
    };
    afterBattle?: 'garrison' | 'siege' | 'move_to_city' | 'destroy';
    afterBattleTargetCityId?: string; // 用于 siege 或 move_to_city
    siegeAfterBattleChain?: Array<{
        action: 'attack_city' | 'destroy';
        targetCityId?: string;
        speedMultiplier?: number;
    }>;
}

export interface PlayerJoinData {
    factionId: string;
}

export interface RenameLegionData {
    legionName: string;
    newName: string;
}

export interface HistoricalEvent {
    year: number;
    season: number; // 0: Spring, 1: Summer, 2: Autumn, 3: Winter
    endYear?: number;   // [NEW] End Year (Calculate duration based on difference)
    endSeason?: number; // [NEW] End Season
    description: string;
    type: EventType;
    siegeData?: SiegeData;
    fieldBattleData?: FieldBattleData;
    narrativeData?: NarrativeData;
    playerJoinData?: PlayerJoinData;
    // scriptSequenceData?: HistoricalEvent[]; // [REMOVED]
    renameLegionData?: RenameLegionData;
    cityUpdates?: {
        cityId: string;
        factionId?: string;
        troops?: number;
    }[];
    // directorScript?: DirectorScript; // [REMOVED]
}


// ==================== AVG 叙事类型 (Narrative Mode) ====================

export interface NarrativeFrame {
    id: string;
    speaker: string;     // 若为 "narrator" 则显示为旁白模式，否则显示名字
    text: string;        // 能够支持 HTML 标签
    background?: string; // 只有背景变化时才填 (path relative to public/assets/avg/)
    actors?: {
        left?: string;   // path or "CLEAR"
        right?: string;  // path or "CLEAR"
        center?: string; // path or "CLEAR"
    };
    audio?: string;      // 语音文件路径
}

export interface NarrativeData {
    scenes?: NarrativeFrame[]; // 可选，军团调动事件不需要对话场景
    nextAction?: 'close' | 'camera_move'; // 剧情结束后的动作
    // [NEW] 军团调动数据 (叙事事件编辑器)
    factionId?: string;
    legionId?: string;
    moveToCityId?: string;
    moveToLocation?: { lat: number; lng: number };
    speedMultiplier?: number; // [NEW] Custom movement speed for this event
    afterBattleChain?: Array<{ action: string, targetCityId?: string, speedMultiplier?: number }>;
}

// ==================== 导演模式类型 (Director Mode) ====================

export interface DirectorAction {
    type: string;
    time?: number;
    duration?: number;
    target?: { lat: number; lng: number } | [number, number];
    data?: any;
    // Camera
    zoom?: number;
    // Unit
    unitId?: string;
    position?: { lat: number; lng: number } | [number, number];
    path?: Array<{ lat: number; lng: number } | [number, number]>;
    speed?: number;
    troops?: number;
    faction?: string;
    name?: string;
    visualType?: string;
    // Draw
    shape?: 'arrow' | 'zone';
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed';
    label?: string;
    // UI
    uiAction?: 'hide_all' | 'show_all';
}

export interface DirectorScript {
    onStart?: DirectorAction[];
    onEnd?: DirectorAction[];
}
