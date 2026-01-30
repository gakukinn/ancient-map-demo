/**
 * UnitTypes.ts

/**
 * 军团兵种类型
 */
export type LegionType =
    // Basic Types
    | 'infantry' | 'archer_cavalry' | 'cavalry' | 'mixed'
    // Faction Specific Types
    | 'huaxia_infantry' // 秦
    | 'zhonghua_mixed'  // 汉
    | 'tianchao_infantry' // 吴
    | 'chaoxian_cavalry' // 燕
    | 'caowei_infantry' // 魏
    // | 'qiangzang_cavalry' // 羌 (Renamed to tujue_cavalry)
    | 'huihui_archer_cavalry' // 赵 (keeping huihui for compatibility if needed, or renaming to zhao)
    | 'manzhou_cavalry' // 金
    | 'yuenan_infantry' // 越
    | 'dianmian_infantry' // 滇/缅
    | 'riben_infantry' // 倭
    | 'xiyu_cavalry' // 胡 (Renamed/Updated from xiyu_archer_cavalry if needed, or just new)
    | 'xiyang_infantry' // 番
    | 'jin_infantry' // 晋
    | 'tang_mixed' // 唐
    | 'song_infantry' // 宋
    | 'xia_cavalry' // 夏
    | 'shang_mixed' // 商
    | 'zhou_infantry' // 周
    | 'shu_infantry' // 蜀
    | 'e_infantry' // 鄂
    | 'yue_infantry' // 越
    | 'qi_infantry' // 齐
    | 'chu_mixed' // 楚
    | 'liang_cavalry' // 凉
    | 'sui_mixed' // 隋
    | 'yuan_archer_cavalry' // 元
    | 'tian_archer_cavalry' // 天
    | 'zhu_cavalry' // 明
    | 'liang_x_mixed' // 梁
    | 'han_x_archer_cavalry' // 韩
    | 'wei_cavalry' // 魏
    | 'tujue_cavalry' // 羌/突厥
    | 'tian_cavalry' // 天
    | 'panjun_infantry' // 叛
    | 'xiyang_legion' // 番
    | 'han_legion' // New Han Unit
    | 'yuenan_legion' // New Yuenan Unit
    | 'qiangzang_legion' // New Qiangzang Unit
    | 'zang_legion' // New Zang Unit
    | 'gao_legion' // New Gao Unit
    // Legacy/Compatibility
    | 'huaxia_mixed' | 'huaxia_cavalry' | 'zhonghua_infantry' | 'zhonghua_cavalry' | 'huihui_cavalry' | 'huihui_mixed';

/**
 * 兵种配置接口 (简化版 - 仅保留必要字段)
 */
export interface UnitTypeConfig {
    /** 兵种类型 */
    type: LegionType;
    /** 显示名称 */
    displayName: string;
}

/**
 * 兵种配置表
 */
export const UNIT_TYPE_CONFIG: Record<LegionType, UnitTypeConfig> = {
    // Basic
    infantry: { type: 'infantry', displayName: '步兵' },
    archer_cavalry: { type: 'archer_cavalry', displayName: '弓骑' },
    cavalry: { type: 'cavalry', displayName: '骑兵' },
    mixed: { type: 'mixed', displayName: '步骑' },

    // Faction Specific
    huaxia_infantry: { type: 'huaxia_infantry', displayName: '大秦锐士' },
    zhonghua_mixed: { type: 'zhonghua_mixed', displayName: '羽林虎贲' },
    tianchao_infantry: { type: 'tianchao_infantry', displayName: '楼船舟师' },
    chaoxian_cavalry: { type: 'chaoxian_cavalry', displayName: '疾风突骑' },
    caowei_infantry: { type: 'caowei_infantry', displayName: '重甲武卒' },
    // qiangzang_cavalry moved to bottom with new units
    huihui_archer_cavalry: { type: 'huihui_archer_cavalry', displayName: '飞鹰精骑' },
    manzhou_cavalry: { type: 'manzhou_cavalry', displayName: '环铁浮屠' },
    yuenan_infantry: { type: 'yuenan_infantry', displayName: '雨林藤甲' },
    dianmian_infantry: { type: 'dianmian_infantry', displayName: '滇缅战卒' },
    riben_infantry: { type: 'riben_infantry', displayName: '修罗武士' },
    xiyu_cavalry: { type: 'xiyu_cavalry', displayName: '控弦胡骑' },
    xiyang_infantry: { type: 'xiyang_infantry', displayName: '列阵火枪' },
    jin_infantry: { type: 'jin_infantry', displayName: '北府雄兵' },
    tang_mixed: { type: 'tang_mixed', displayName: '神策禁军' },
    song_infantry: { type: 'song_infantry', displayName: '殿前诸班' },
    xia_cavalry: { type: 'xia_cavalry', displayName: '铁鹰鹞子' },
    shang_mixed: { type: 'shang_mixed', displayName: '天命三师' },
    zhou_infantry: { type: 'zhou_infantry', displayName: '王室六师' },
    shu_infantry: { type: 'shu_infantry', displayName: '无当飞军' },
    qi_infantry: { type: 'qi_infantry', displayName: '持戟技击' },
    chu_mixed: { type: 'chu_mixed', displayName: '广编车兵' },
    liang_cavalry: { type: 'liang_cavalry', displayName: '朔风铁骑' },
    sui_mixed: { type: 'sui_mixed', displayName: '骁果禁卫' },
    yuan_archer_cavalry: { type: 'yuan_archer_cavalry', displayName: '怯薛宿卫' },
    tian_archer_cavalry: { type: 'tian_archer_cavalry', displayName: '突厥狼卫' },
    zhu_cavalry: { type: 'zhu_cavalry', displayName: '关宁铁骑' },
    liang_x_mixed: { type: 'liang_x_mixed', displayName: '兰陵台军' },
    han_x_archer_cavalry: { type: 'han_x_archer_cavalry', displayName: '三韩花郎' },
    wei_cavalry: { type: 'wei_cavalry', displayName: '虎豹迅骑' },
    tujue_cavalry: { type: 'tujue_cavalry', displayName: '百战青羌' },
    tian_cavalry: { type: 'tian_cavalry', displayName: '皮室精骑' },
    panjun_infantry: { type: 'panjun_infantry', displayName: '叛军' },
    e_infantry: { type: 'e_infantry', displayName: '江夏横江' },
    yue_infantry: { type: 'yue_infantry', displayName: '之江子弟' },
    xiyang_legion: { type: 'xiyang_legion', displayName: '禁卫军团' },
    han_legion: { type: 'han_legion', displayName: '三韩花郎' },
    yuenan_legion: { type: 'yuenan_legion', displayName: '雨林藤甲' },
    qiangzang_legion: { type: 'qiangzang_legion', displayName: '雪域战羌' },
    zang_legion: { type: 'zang_legion', displayName: '吐蕃甲骑' },
    gao_legion: { type: 'gao_legion', displayName: '高丽铁骑' },

    // Legacy/Compatibility
    huaxia_mixed: { type: 'huaxia_mixed', displayName: '华夏步骑' },
    huaxia_cavalry: { type: 'huaxia_cavalry', displayName: '华夏骑兵' },
    zhonghua_infantry: { type: 'zhonghua_infantry', displayName: '中华步兵' },
    zhonghua_cavalry: { type: 'zhonghua_cavalry', displayName: '中华骑兵' },
    huihui_cavalry: { type: 'huihui_cavalry', displayName: '回回骑兵' },
    huihui_mixed: { type: 'huihui_mixed', displayName: '回回步骑' }
};

/**
 * 获取兵种配置
 */
export function getUnitTypeConfig(type: LegionType): UnitTypeConfig {
    return UNIT_TYPE_CONFIG[type] || UNIT_TYPE_CONFIG.infantry;
}
