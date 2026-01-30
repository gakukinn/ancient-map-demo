// 势力数据 (Faction Data)
// 每个势力包含：ID、名称、颜色

import { Faction } from '../types/core';

// Re-export for compatibility
export type { Faction };

export const FACTIONS: Faction[] = [

    { id: 'huaxia', name: '华夏', color: '#000040ff', armyName: '大秦锐士', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'city_tianshui' },
    { id: 'zhonghua', name: '中华', color: '#ff0000ff', armyName: '羽林虎贲', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'city_hanzhong' },     // 红色 - 汉
    { id: 'tianchao', name: '天朝', color: '#0000ffff', armyName: '楼船舟师', defaultLegionType: 'zhonghua_infantry', capitalCityId: 'city_suzhou' },  // 蓝色 - 吴
    { id: 'chaoxian', name: '朝鲜', color: '#008000ff', armyName: '疾风突骑', defaultLegionType: 'chaoxian_cavalry', capitalCityId: 'youzhou' },   // 白色 - 燕
    { id: 'huihui', name: '突厥', color: '#ffff80ff', armyName: '胡服骑射', defaultLegionType: 'huihui_cavalry', capitalCityId: 'handan' }, // 卡其 - 赵
    { id: 'caowei', name: '蒙古', color: '#0080ffff', armyName: '虎豹迅骑', defaultLegionType: 'wei_cavalry', capitalCityId: 'xinzheng' },    // 黄绿 - 魏
    { id: 'qiangzang', name: '羌藏', color: '#ff8000ff', armyName: '百战青羌', defaultLegionType: 'qiangzang_legion', capitalCityId: 'city_xining' },  // 橙色 - 羌

    { id: 'yuenan', name: '百越', color: '#00ffffff', armyName: '雨林藤甲', defaultLegionType: 'yuenan_legion', capitalCityId: 'city_henei' },    // 青绿


    // { id: 'liang', name: '凉', color: '#F4A460', armyName: '朔风铁骑', defaultLegionType: 'liang_cavalry', capitalCityId: 'city_wuwei' },      // 沙黄

    // { id: 'xiyu', name: '胡', color: '#B8860B', armyName: '控弦胡骑', defaultLegionType: 'xiyu_cavalry', capitalCityId: 'city_wusun' },// 黑金

    // { id: 'jue', name: '厥', color: '#5759D9', armyName: '突厥狼卫', defaultLegionType: 'tujue_cavalry', capitalCityId: 'city_suiye' }, // 蓝色 - 厥
    // { id: 'xia', name: '夏', color: '#FFFFFF', armyName: '铁鹰鹞子', defaultLegionType: 'tujue_cavalry', capitalCityId: 'city_yinchuan' },        // 白色

    // { id: 'tian', name: '天', color: '#87CEEB', armyName: '皮室精骑', defaultLegionType: 'tian_cavalry', capitalCityId: 'city_linhuangfu' }, // 天蓝 - 天
    // { id: 'yuan', name: '元', color: '#1E90FF', armyName: '怯薛宿卫', defaultLegionType: 'tian_cavalry', capitalCityId: 'city_halahelin' }, // 宝蓝 - 元


    // { id: 'zang', name: '藏', color: '#FF1493', armyName: '雪域赭面', defaultLegionType: 'zang_legion', capitalCityId: 'city_lasa' },   // 深粉 - 藏

    // { id: 'manzhou', name: '金', color: '#FFFF00', armyName: '环铁浮屠', defaultLegionType: 'gao_legion', capitalCityId: 'city_huiningfu' },    // 黄色
    // { id: 'gao', name: '高', color: '#6B8E23', armyName: '高丽铁骑', defaultLegionType: 'gao_legion', capitalCityId: 'city_yalufu' }, // 橄榄绿 - 高

    // { id: 'shang', name: '商', color: '#E5E4E2', armyName: '天命三师', defaultLegionType: 'zhou_infantry', capitalCityId: 'city_anyang' },        // 白金
    // { id: 'zhou', name: '周', color: '#C80815', armyName: '王室六师', defaultLegionType: 'zhou_infantry', capitalCityId: 'luoyang' },         // 赤红

    // { id: 'qi', name: '齐', color: '#4B0082', armyName: '持戟技击', defaultLegionType: 'huaxia_infantry', capitalCityId: 'qingzhou' },        // 靛紫
    // //{ id: 'chu', name: '楚', color: '#228B22', armyName: '荆楚剑锐', defaultLegionType: 'huaxia_infantry', capitalCityId: 'city_jingzhou' },          // 森林绿

    // //{ id: 'caowei', name: '魏', color: '#9ACD32', armyName: '虎豹迅骑', defaultLegionType: 'wei_cavalry', capitalCityId: 'xinzheng' },    // 黄绿 - 魏
    // { id: 'yue', name: '越', color: '#40E0D0', armyName: '之江子弟', defaultLegionType: 'zhonghua_infantry', capitalCityId: 'hangzhou' },   // 青色 - 越

    // { id: 'shi', name: '士', color: '#D2B48C', armyName: '岭南健儿', defaultLegionType: 'yue_infantry', capitalCityId: 'city_guangzhou' }, // 沙色 - 士
    // { id: 'min', name: '闽', color: '#006400', armyName: '八闽锐师', defaultLegionType: 'yue_infantry', capitalCityId: 'city_fuzhou' },   // 深绿 - 闽


    // { id: 'e', name: '鄂', color: '#D2691E', armyName: '江夏横江', defaultLegionType: 'e_infantry', capitalCityId: 'city_wuhan' },   // 橙褐 - 鄂
    // { id: 'qu', name: '区', color: '#191970', armyName: '湘水劲卒', defaultLegionType: 'e_infantry', capitalCityId: 'changsha' },    // 深蓝 - 去
    // { id: 'gan', name: '赣', color: '#C2B280', armyName: '豫章精甲', defaultLegionType: 'e_infantry', capitalCityId: 'city_yuzhang' }, // 沙色 - 赣

    // { id: 'liang_x', name: '梁', color: '#BDB76B', armyName: '兰陵台军', defaultLegionType: 'song_infantry', capitalCityId: 'city_langya' },      // 苍黄 - 梁
    // { id: 'song', name: '宋', color: '#9c5333', armyName: '殿前诸班', defaultLegionType: 'song_infantry', capitalCityId: 'city_shangqiu' },      // 赭石

    // { id: 'shu', name: '蜀', color: '#789262', armyName: '无当飞军', defaultLegionType: 'shu_infantry', capitalCityId: 'chengdu' },       // 竹青
    // { id: 'nan', name: '南', color: '#90EE90', armyName: '桂林山勇', defaultLegionType: 'shu_infantry', capitalCityId: 'city_guilin' }, // 浅绿 - 南

    // { id: 'dianmian', name: '滇', color: '#8B4513', armyName: '藤甲奇兵', defaultLegionType: 'yuenan_infantry', capitalCityId: 'city_dali' },  // 深棕

    // { id: 'riben', name: '倭', color: '#FFC0CB', armyName: '修罗武士', defaultLegionType: 'riben_infantry', capitalCityId: 'city_jingdou' },     // 粉白


    // { id: 'han_x', name: '韩', color: '#DEB887', armyName: '三韩花郎', defaultLegionType: 'han_legion', capitalCityId: 'city_hancheng' }, // 褐黄 - 韩
    // { id: 'xiyang', name: '番', color: '#DA70D6', armyName: '禁卫军团', defaultLegionType: 'xiyang_legion', capitalCityId: 'city_guishan' },    // 紫粉 - 罗马/西洋

    //{ id: 'huaxia', name: '秦', color: '#000000', armyName: '大秦锐士', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'city_tianshui' },    // 黑色 - 秦

    // { id: 'jin', name: '晋', color: '#0000FF', armyName: '北府雄兵', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'city_taiyuan' },       // 蓝色
    // { id: 'sui', name: '隋', color: '#ADFF2F', armyName: '骁果禁卫', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'city_xiangyang' },         // 嫩绿
    // { id: 'tang', name: '唐', color: '#800080', armyName: '神策禁军', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'changan' },        // 帝王紫
    // { id: 'zhu', name: '明', color: '#8B3A3A', armyName: '大明卫军', defaultLegionType: 'zhonghua_mixed', capitalCityId: 'nanjing' },
    // 赭红 - 朱
    { id: 'panjun', name: '叛军', color: '#696969', defaultLegionType: 'panjun_infantry' },     // 深灰 - 叛军无首都

];
