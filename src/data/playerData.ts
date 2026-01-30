// 玩家官职等级数据
export interface Rank {
    level: number;
    name: string;
    maxTroops: number;
    requiredMerit: number;
}

// 官职等级表（从低到高）
export const RANKS: Rank[] = [
    { level: 14, name: '平民', maxTroops: 1, requiredMerit: -1 }, // 特殊：未加入势力
    { level: 13, name: '新兵', maxTroops: 10000, requiredMerit: 0 },
    { level: 12, name: '百将', maxTroops: 100, requiredMerit: 100 },
    { level: 11, name: '军侯', maxTroops: 500, requiredMerit: 500 },
    { level: 10, name: '统领', maxTroops: 1000, requiredMerit: 1000 },    // 需杀敌 20
    { level: 9, name: '偏裨将军', maxTroops: 3000, requiredMerit: 3000 }, // 需杀敌 80
    { level: 8, name: '威猛将军', maxTroops: 6000, requiredMerit: 6000 }, // 需杀敌 200
    { level: 7, name: '讨荡将军', maxTroops: 10000, requiredMerit: 10000 }, // 需杀敌 500
    { level: 6, name: '振威将军', maxTroops: 15000, requiredMerit: 15000 }, // 需杀敌 1200
    { level: 5, name: '安平将军', maxTroops: 20000, requiredMerit: 20000 }, // 需杀敌 3000
    { level: 4, name: '征镇将军', maxTroops: 30000, requiredMerit: 30000 }, // 需杀敌 7000
    { level: 3, name: '卫方将军', maxTroops: 40000, requiredMerit: 40000 }, // 需杀敌 18000
    { level: 2, name: '骠骑将军', maxTroops: 50000, requiredMerit: 50000 }, // 需杀敌 40000
    { level: 1, name: '大元帅', maxTroops: 60000, requiredMerit: 60000 } // 需杀敌 80000
];

// 玩家初始配置
export const INITIAL_PLAYER_CONFIG = {
    position: {
        latitude: 34.26,   // 长安
        longitude: 108.94
    },
    troops: 0,             // DISABLED: Set to 0 to prevent player combat participation
    merit: 0,
    rankLevel: 14,         // 平民 (不加入势力)
    faction: null,         // 未选择势力
    moveSpeed: 0.5         // 0.5度/秒
};

// 根据等级获取官职
export function getRankByLevel(level: number): Rank | undefined {
    return RANKS.find(r => r.level === level);
}

// 根据功勋获取应有的官职
export function getRankByMerit(merit: number): Rank {
    // 从高到低查找符合条件的最高官职
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (merit >= RANKS[i].requiredMerit) {
            return RANKS[i];
        }
    }
    return RANKS[0]; // 默认返回最低级
}
