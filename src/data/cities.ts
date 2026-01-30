// 城市数据 (City Data)
// 每个城市包含完整信息：ID、名称、势力ID、坐标、类型、贴图
// Organized by RegionSystem

import { CityType } from '../types/core';

export interface CityData {
  id: string;
  name: string;
  factionId: string;
  lat: number;
  lng: number;
  type: CityType;
  image?: string; // [DEPRECATED] Use RegionSystem instead
  troops?: number;
  mirror?: boolean;
  region?: string; // [NEW] Explicit region override
  // [OPTIMIZATION] Removed startYear/endYear for Eternal War Mode
}

export const CITIES: CityData[] = [
  // ==================== 核心都城与重镇 (Huge Cities) ====================
  // 关中及中原核心
  { id: 'changan', name: '长安', factionId: 'huaxia', lat: 34.34, lng: 108.94, type: 'huge_city', troops: 10000 }, // 秦汉长乐宫/未央宫坐标
  { id: 'luoyang', name: '洛阳', factionId: 'huaxia', lat: 34.68, lng: 112.53, type: 'huge_city', troops: 10000, mirror: true }, // 汉魏洛阳城遗址
  { id: 'kaifeng', name: '开封', factionId: 'caowei', lat: 34.79, lng: 114.30, type: 'huge_city', troops: 10000 }, // 战国大梁/北宋东京
  { id: 'xinzheng', name: '许昌', factionId: 'qiangzang', lat: 34.02, lng: 113.85, type: 'huge_city', troops: 10000, mirror: true }, // 曹魏许都遗址
  { id: 'shangqiu', name: '睢阳', factionId: 'panjun', lat: 34.38, lng: 115.62, type: 'huge_city', troops: 10000 }, // 归德府/安史之乱血战地
  { id: 'city_tianshui', name: '天水', factionId: 'huaxia', lat: 34.58, lng: 105.70, type: 'huge_city', region: 'CENTRAL', troops: 10000 },

  // 华北及东北
  { id: 'youzhou', name: '燕京', factionId: 'chaoxian', lat: 39.90, lng: 116.35, type: 'huge_city', troops: 10000 }, // 燕京古称，更符合冷兵器背景
  { id: 'city_anyang', name: '朝歌', factionId: 'panjun', lat: 35.80, lng: 114.20, type: 'huge_city', troops: 10000, mirror: true }, // 淇县朝歌遗址
  { id: 'handan', name: '邯郸', factionId: 'huihui', lat: 36.60, lng: 114.48, type: 'huge_city', troops: 10000 }, // 赵国都城
  { id: 'qingzhou', name: '临淄', factionId: 'zhonghua', lat: 36.82, lng: 118.34, type: 'huge_city', troops: 10000, mirror: true }, // 齐国都城
  { id: 'city_taiyuan', name: '晋阳', factionId: 'panjun', lat: 37.75, lng: 112.50, type: 'huge_city', troops: 10000 }, // 龙兴之地，坚城
  { id: 'city_linhuangfu', name: '临潢府', factionId: 'panjun', lat: 43.96, lng: 119.40, type: 'huge_city', troops: 10000 }, // 辽上京临潢府
  { id: 'city_huiningfu', name: '会宁府', factionId: 'panjun', lat: 45.50, lng: 126.96, type: 'huge_city', troops: 10000 }, // 金上京
  { id: 'city_yalufu', name: '丸都城', factionId: 'panjun', lat: 41.15, lng: 126.15, type: 'huge_city', region: 'KOREA', troops: 10000 },

  // 江南及华南
  { id: 'nanjing', name: '建康', factionId: 'panjun', lat: 32.06, lng: 118.79, type: 'huge_city', troops: 10000 }, // 六朝古都名“建康”
  { id: 'shouchun', name: '寿春', factionId: 'tianchao', lat: 32.58, lng: 116.78, type: 'huge_city', troops: 10000 }, // 淮南重镇
  { id: 'city_suzhou', name: '姑苏', factionId: 'panjun', lat: 31.30, lng: 120.58, type: 'huge_city', mirror: true },
  { id: 'hangzhou', name: '会稽', factionId: 'panjun', lat: 29.98, lng: 120.58, type: 'huge_city', troops: 10000 }, // id是hangzhou但古称会稽更符合地域
  { id: 'city_yuzhang', name: '豫章', factionId: 'panjun', lat: 28.68, lng: 115.85, type: 'huge_city', troops: 10000 }, // 现代南昌
  { id: 'city_fuzhou', name: '福州', factionId: 'panjun', lat: 26.07, lng: 119.30, type: 'huge_city', troops: 10000 },
  { id: 'city_guangzhou', name: '番禺', factionId: 'panjun', lat: 23.13, lng: 113.26, type: 'huge_city', troops: 10000 },
  { id: 'city_guilin', name: '桂林', factionId: 'panjun', lat: 25.27, lng: 110.29, type: 'huge_city', troops: 10000 },

  // 荆襄与巴蜀
  { id: 'city_jingzhou', name: '江陵', factionId: 'panjun', lat: 30.35, lng: 112.20, type: 'huge_city', troops: 10000 }, // 荆州治所江陵
  { id: 'city_xiangyang', name: '襄阳', factionId: 'panjun', lat: 32.01, lng: 112.13, type: 'huge_city', troops: 10000 },
  { id: 'city_wuhan', name: '江夏', factionId: 'panjun', lat: 30.55, lng: 114.28, type: 'huge_city', troops: 10000 }, // “武汉”作为地名太现代，改为江夏
  { id: 'changsha', name: '长沙', factionId: 'panjun', lat: 28.20, lng: 112.98, type: 'huge_city', troops: 10000, mirror: true },
  { id: 'chengdu', name: '成都', factionId: 'panjun', lat: 30.65, lng: 104.06, type: 'huge_city', troops: 10000 },
  { id: 'city_hanzhong', name: '汉中', factionId: 'panjun', lat: 33.07, lng: 107.02, type: 'huge_city', troops: 10000, mirror: true },

  // 西域、西南及边疆
  { id: 'city_wuwei', name: '武威', factionId: 'panjun', lat: 37.93, lng: 102.63, type: 'huge_city', troops: 10000 }, // 凉州
  { id: 'city_yinchuan', name: '兴庆', factionId: 'panjun', lat: 38.48, lng: 106.27, type: 'huge_city', troops: 10000 }, // 西夏都城名
  { id: 'city_xining', name: '鄯城', factionId: 'panjun', lat: 36.62, lng: 101.77, type: 'huge_city', region: 'TIBET', troops: 10000, mirror: true },
  { id: 'city_lasa', name: '逻些', factionId: 'panjun', lat: 29.65, lng: 91.11, type: 'huge_city', troops: 10000 },
  { id: 'city_dali', name: '大理', factionId: 'panjun', lat: 25.69, lng: 100.16, type: 'huge_city', troops: 10000 },
  { id: 'city_henei', name: '交趾', factionId: 'yuenan', lat: 21.01, lng: 105.8, type: 'huge_city', troops: 10000 }, // 21.01是中国古代的交趾郡核心
  { id: 'city_suiye', name: '碎叶', factionId: 'panjun', lat: 42.86, lng: 75.24, type: 'huge_city', region: 'NOMADIC', troops: 10000, mirror: true },
  { id: 'city_wusun', name: '赤谷城', factionId: 'panjun', lat: 42.45, lng: 78.23, type: 'huge_city', troops: 10000 },
  { id: 'city_guishan', name: '贵山', factionId: 'panjun', lat: 40.29, lng: 69.80, type: 'huge_city', region: 'WESTERN', troops: 10000 },
  { id: 'city_halahelin', name: '和林', factionId: 'panjun', lat: 47.18, lng: 102.82, type: 'huge_city', troops: 10000 },

  // 东瀛及半岛
  { id: 'city_jingdou', name: '京都', factionId: 'panjun', lat: 35.01, lng: 135.76, type: 'huge_city', troops: 10000 },
  { id: 'city_hancheng', name: '开城', factionId: 'panjun', lat: 37.97, lng: 126.55, type: 'huge_city', troops: 10000 },


  // ==================== 中型城市 (Medium / 20k) ====================

  // --- 中原与西北 ---
  { id: 'city_ankang', name: '西城', factionId: 'panjun', lat: 32.68, lng: 109.02, type: 'large_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_langya', name: '琅琊', factionId: 'panjun', lat: 35.10, lng: 118.35, type: 'large_city', troops: 10000 },
  { id: 'city_baidicheng', name: '白帝城', factionId: 'panjun', lat: 31.04, lng: 109.57, type: 'large_city', troops: 10000 },
  { id: 'city_baotou', name: '九原', factionId: 'panjun', lat: 40.60, lng: 109.83, type: 'large_city', troops: 10000 },
  { id: 'city_bozhou', name: '谯县', factionId: 'panjun', lat: 33.85, lng: 115.77, type: 'large_city', troops: 10000 },
  { id: 'city_buhala', name: '布哈拉', factionId: 'panjun', lat: 39.77, lng: 64.42, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_changde', name: '临沅', factionId: 'panjun', lat: 29.03, lng: 111.69, type: 'large_city', troops: 10000 },
  { id: 'city_changzhi', name: '上党', factionId: 'panjun', lat: 36.18, lng: 113.10, type: 'large_city', troops: 10000 },
  { id: 'city_changzhou', name: '常州', factionId: 'panjun', lat: 31.81, lng: 119.97, type: 'large_city', troops: 10000 },
  { id: 'city_chenzhou', name: '桂阳', factionId: 'panjun', lat: 25.77, lng: 113.01, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_cheshi', name: '高昌', factionId: 'panjun', lat: 42.85, lng: 89.16, type: 'large_city', region: 'WESTERN', troops: 10000 },

  { id: 'city_dadingfu', name: '大定府', factionId: 'panjun', lat: 41.58, lng: 119.21, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_danyang_ah', name: '丹阳', factionId: 'panjun', lat: 30.50, lng: 118.50, type: 'large_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_dawan', name: '贰师', factionId: 'panjun', lat: 40.79, lng: 72.95, type: 'large_city', troops: 10000 },
  { id: 'city_diaoyucheng', name: '钓鱼城', factionId: 'panjun', lat: 30.00, lng: 106.32, type: 'large_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_dingtao', name: '定陶', factionId: 'panjun', lat: 35.07, lng: 115.59, type: 'large_city', troops: 10000 },
  { id: 'city_dunhuang', name: '敦煌', factionId: 'panjun', lat: 40.14, lng: 94.66, type: 'large_city', region: 'NORTHWEST', troops: 10000, mirror: true },
  { id: 'city_fengxiang', name: '义渠', factionId: 'panjun', lat: 35.33, lng: 107.58, type: 'large_city', region: 'NORTHWEST', troops: 10000, mirror: true }, // 修正类型为large
  { id: 'city_fusi', name: '伏俟城', factionId: 'panjun', lat: 36.65, lng: 99.10, type: 'large_city', region: 'TIBET', troops: 10000 },
  { id: 'city_ganja', name: '占贾', factionId: 'panjun', lat: 40.68, lng: 46.36, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_ganzhou', name: '南野', factionId: 'panjun', lat: 25.94, lng: 115.08, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_guangling', name: '广陵', factionId: 'panjun', lat: 32.40, lng: 119.41, type: 'large_city', troops: 10000 },
  { id: 'city_guangxin', name: '广信', factionId: 'panjun', lat: 23.49, lng: 111.13, type: 'large_city', troops: 10000 },
  { id: 'city_guizi', name: '龟兹', factionId: 'panjun', lat: 41.72, lng: 82.94, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_hefei', name: '合肥', factionId: 'panjun', lat: 31.87, lng: 117.28, type: 'large_city', troops: 10000 },
  { id: 'city_hejian', name: '河间', factionId: 'panjun', lat: 38.29, lng: 116.84, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_huaian', name: '淮安', factionId: 'panjun', lat: 33.60, lng: 119.02, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_huanglongfu', name: '黄龙府', factionId: 'panjun', lat: 44.41, lng: 125.18, type: 'large_city', troops: 10000 },
  { id: 'city_jianghu', name: '江户', factionId: 'panjun', lat: 35.69, lng: 139.69, type: 'large_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_jiangyang', name: '江阳', factionId: 'panjun', lat: 28.87, lng: 105.44, type: 'large_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_jiujiang', name: '柴桑', factionId: 'panjun', lat: 29.65, lng: 115.99, type: 'large_city', mirror: true },
  { id: 'city_julu', name: '巨鹿', factionId: 'panjun', lat: 37.01, lng: 115.02, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_junfu', name: '骏府', factionId: 'panjun', lat: 34.97, lng: 138.38, type: 'large_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_kunming', name: '谷昌', factionId: 'panjun', lat: 25.04, lng: 102.71, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_langzhong', name: '阆中', factionId: 'panjun', lat: 31.58, lng: 105.96, type: 'large_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_lanzhou', name: '金城', factionId: 'panjun', lat: 36.06, lng: 103.83, type: 'large_city', troops: 10000 },
  { id: 'city_liaoyang', name: '襄平', factionId: 'panjun', lat: 41.27, lng: 123.17, type: 'large_city', region: 'NORTH', troops: 10000 },
  { id: 'city_linfen', name: '平阳', factionId: 'panjun', lat: 36.24, lng: 111.63, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_linyiwangcheng', name: '林邑', factionId: 'panjun', lat: 15.82, lng: 108.23, type: 'large_city', region: 'LINGNAN', troops: 10000 },
  { id: 'city_longcheng', name: '龙城', factionId: 'panjun', lat: 47.95, lng: 102.55, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_longquanfu', name: '龙泉府', factionId: 'panjun', lat: 44.06, lng: 129.20, type: 'large_city', region: 'KOREA', troops: 10000 },
  { id: 'city_loulan', name: '楼兰', factionId: 'panjun', lat: 40.10, lng: 89.54, type: 'large_city', troops: 10000 },
  { id: 'city_luntai', name: '轮台', factionId: 'panjun', lat: 41.77, lng: 84.61, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_lvcheng', name: '晋兴', factionId: 'panjun', lat: 22.76, lng: 108.25, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_merv', name: '马雷', factionId: 'panjun', lat: 37.66, lng: 62.18, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_nishapur', name: '尼沙普尔', factionId: 'panjun', lat: 36.21, lng: 58.80, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_pingrang', name: '平壤', factionId: 'panjun', lat: 39.00, lng: 125.74, type: 'large_city', troops: 10000 },

  { id: 'city_puyang', name: '濮阳', factionId: 'panjun', lat: 35.71, lng: 115.02, type: 'large_city', troops: 10000 },
  { id: 'city_qingyuan', name: '阳城', factionId: 'panjun', lat: 38.86, lng: 115.49, type: 'large_city', troops: 10000 },

  // --- Large Cities 续批 (中亚、西域、中原补全) ---
  { id: 'city_quancheng', name: '历城', factionId: 'panjun', lat: 36.66, lng: 117.00, type: 'large_city', troops: 10000 }, // 济南古称
  { id: 'city_quanzhou', name: '泉州', factionId: 'panjun', lat: 24.89, lng: 118.59, type: 'large_city', troops: 10000 },
  { id: 'city_qujing', name: '建宁', factionId: 'panjun', lat: 25.48, lng: 103.80, type: 'large_city', region: 'CHU_SHU', troops: 10000 }, // 诸葛亮南征重要据点
  { id: 'city_rayy', name: '雷伊', factionId: 'panjun', lat: 35.60, lng: 51.44, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_rikaze', name: '日喀则', factionId: 'panjun', lat: 29.27, lng: 88.88, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_samarhan', name: '撒马尔罕', factionId: 'panjun', lat: 39.65, lng: 66.97, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_shanggu', name: '上谷', factionId: 'panjun', lat: 40.61, lng: 115.07, type: 'large_city', troops: 10000 },
  { id: 'city_shouxiangcheng', name: '受降城', factionId: 'panjun', lat: 42.27, lng: 105.95, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_shule', name: '疏勒', factionId: 'panjun', lat: 39.48, lng: 76.02, type: 'large_city', troops: 10000 },
  { id: 'city_shuofang', name: '朔方', factionId: 'panjun', lat: 40.73, lng: 108.48, type: 'large_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_suizhou', name: '汉东', factionId: 'panjun', lat: 31.78, lng: 113.17, type: 'large_city', troops: 10000 },
  { id: 'city_suoche', name: '莎车', factionId: 'panjun', lat: 38.42, lng: 77.24, type: 'large_city', troops: 10000 },
  { id: 'city_tabriz', name: '桃里寺', factionId: 'panjun', lat: 38.07, lng: 46.29, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_taizaifu', name: '太宰府', factionId: 'panjun', lat: 33.51, lng: 130.52, type: 'large_city', troops: 10000 },
  { id: 'city_tbilisi', name: '第比利斯', factionId: 'panjun', lat: 41.71, lng: 44.83, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_tongwancheng', name: '统万城', factionId: 'panjun', lat: 37.86, lng: 108.62, type: 'large_city', region: 'NORTHWEST', troops: 10000, mirror: true }, // 大夏国首都
  { id: 'city_urgench', name: '玉龙杰赤', factionId: 'panjun', lat: 42.33, lng: 59.15, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_wancheng', name: '宛', factionId: 'panjun', lat: 33.00, lng: 112.53, type: 'large_city', troops: 10000 },
  { id: 'city_weizhou', name: '代城', factionId: 'panjun', lat: 39.83, lng: 114.58, type: 'large_city', troops: 10000 },
  { id: 'city_xiangwu', name: '襄武', factionId: 'panjun', lat: 34.96, lng: 104.66, type: 'large_city', troops: 10000, mirror: true }, // 陇西枢纽
  { id: 'city_xiapi', name: '下邳', factionId: 'panjun', lat: 34.01, lng: 117.58, type: 'large_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_xuzhou', name: '彭城', factionId: 'panjun', lat: 34.27, lng: 117.20, type: 'large_city', troops: 10000 },
  { id: 'city_yanan', name: '肤施', factionId: 'panjun', lat: 36.60, lng: 109.49, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_yanqi', name: '焉耆', factionId: 'panjun', lat: 42.07, lng: 86.52, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_yemili', name: '叶米立', factionId: 'panjun', lat: 46.52, lng: 83.60, type: 'large_city', region: 'WEST', troops: 10000 },
  { id: 'city_yili', name: '弓月', factionId: 'panjun', lat: 43.91, lng: 81.33, type: 'large_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_yongzhou', name: '零陵', factionId: 'panjun', lat: 26.40, lng: 111.65, type: 'large_city', troops: 10000 },
  { id: 'city_yueyang', name: '巴陵', factionId: 'panjun', lat: 29.37, lng: 113.12, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_yuncheng', name: '安邑', factionId: 'panjun', lat: 35.13, lng: 111.20, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_yunzhong', name: '云中', factionId: 'panjun', lat: 40.82, lng: 111.66, type: 'large_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_yutian', name: '于阗', factionId: 'panjun', lat: 37.13, lng: 79.81, type: 'large_city', troops: 10000 },
  { id: 'city_zhangye', name: '张掖', factionId: 'panjun', lat: 39.12, lng: 99.92, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_zhaoyang', name: '柳城', factionId: 'panjun', lat: 41.58, lng: 120.44, type: 'large_city', region: 'NORTH', troops: 10000 },
  { id: 'city_zhengding', name: '真定', factionId: 'panjun', lat: 38.16, lng: 114.55, type: 'large_city', troops: 10000 },
  { id: 'city_zhongqing', name: '重庆', factionId: 'panjun', lat: 29.51, lng: 106.51, type: 'large_city', troops: 10000, mirror: true },
  { id: 'city_zhoukou', name: '陈城', factionId: 'panjun', lat: 33.81, lng: 114.91, type: 'large_city', troops: 10000 },
  { id: 'datong', name: '平城', factionId: 'panjun', lat: 40.09, lng: 113.34, type: 'large_city', troops: 10000, mirror: true },

  // ==================== [SECTION 3/5] Small Cities (Part 1) ====================
  { id: 'city_yingchang', name: '应昌', factionId: 'panjun', lat: 43.51, lng: 117.65, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_aihui', name: '黑龙江城', factionId: 'panjun', lat: 50.24, lng: 127.53, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_ali', name: '列城', factionId: 'panjun', lat: 34.17, lng: 77.57, type: 'small_city', region: 'WEST', troops: 10000 }, // 修正坐标至列城中心
  { id: 'city_amul', name: '阿姆河渡', factionId: 'panjun', lat: 38.95, lng: 63.83, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_anshi', name: '安市', factionId: 'panjun', lat: 40.85, lng: 122.75, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_anzhou', name: '萨水', factionId: 'panjun', lat: 39.62, lng: 125.66, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_baima', name: '白马', factionId: 'panjun', lat: 35.51, lng: 114.50, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_baixiang', name: '柏乡', factionId: 'panjun', lat: 37.48, lng: 114.73, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },


  { id: 'city_bangyuandong', name: '帮源洞', factionId: 'panjun', lat: 29.58, lng: 118.95, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_baohan', name: '枹罕', factionId: 'panjun', lat: 35.610000, lng: 103.240000, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_baoji', name: '陈仓', factionId: 'panjun', lat: 34.43, lng: 107.23, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_bayanxile', name: '巴彦锡勒', factionId: 'panjun', lat: 43.93, lng: 116.08, type: 'small_city', troops: 10000 },
  { id: 'city_bayinbuluke', name: '巴音布鲁克', factionId: 'panjun', lat: 42.89, lng: 84.21, type: 'small_city', region: 'NOMADIC', troops: 10000, mirror: true },
  { id: 'city_bianpu', name: '乌沙堡', factionId: 'panjun', lat: 41.27, lng: 113.52, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_bodongqi', name: '博东奇', factionId: 'panjun', lat: 46.55, lng: 92.10, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_boli', name: '剖阿里', factionId: 'panjun', lat: 48.48, lng: 135.09, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_bulgan_gobi', name: '布尔干', factionId: 'panjun', lat: 46.08, lng: 91.55, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_buyurhai', name: '捕鱼儿海', factionId: 'panjun', lat: 47.91, lng: 117.70, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_caishiji', name: '采石矶', factionId: 'panjun', lat: 31.65, lng: 118.42, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_cangting', name: '仓亭', factionId: 'panjun', lat: 36.31, lng: 115.98, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },

  { id: 'city_changbaishan_sd', name: '长白山', factionId: 'panjun', lat: 36.88, lng: 117.71, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_changban', name: '长坂', factionId: 'panjun', lat: 30.82, lng: 111.78, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_changting', name: '长汀', factionId: 'panjun', lat: 25.67, lng: 116.33, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_chaozhou', name: '潮州', factionId: 'panjun', lat: 23.45, lng: 116.64, type: 'small_city', troops: 10000, mirror: true },

  { id: 'city_chibi', name: '赤壁', factionId: 'panjun', lat: 29.87, lng: 113.62, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_chifeng', name: '赤峰', factionId: 'panjun', lat: 42.26, lng: 118.94, type: 'small_city', troops: 10000 },
  { id: 'city_chijian', name: '赤间关', factionId: 'panjun', lat: 33.96, lng: 130.94, type: 'small_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_chikanlou', name: '赤崁楼', factionId: 'panjun', lat: 23.00, lng: 120.18, type: 'small_city', region: 'LINGNAN', troops: 10000 },

  { id: 'city_chongzuo', name: '临尘', factionId: 'panjun', lat: 22.49, lng: 107.33, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_dabancheng', name: '达坂城', factionId: 'panjun', lat: 43.56, lng: 88.40, type: 'small_city', region: 'WESTERN', troops: 10000, mirror: true },
  { id: 'city_dagu', name: '大沽口', factionId: 'panjun', lat: 38.98, lng: 117.70, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_dajie', name: '大界', factionId: 'panjun', lat: 35.03, lng: 108.08, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_dalanbaljut', name: '答阑巴勒主惕', factionId: 'panjun', lat: 47.85, lng: 108.80, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_dalanzhuer', name: '答兰纳儿河', factionId: 'panjun', lat: 46.50, lng: 115.00, type: 'small_city', region: 'NOMADIC', troops: 10000 },

  { id: 'city_damghan', name: '达姆甘', factionId: 'panjun', lat: 36.16, lng: 54.35, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_dangqu', name: '宕渠', factionId: 'panjun', lat: 31.02, lng: 106.97, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_dangshan', name: '砀山', factionId: 'panjun', lat: 34.44, lng: 116.47, type: 'small_city', troops: 10000 },
  { id: 'city_dangxiong', name: '当雄', factionId: 'panjun', lat: 30.47, lng: 91.10, type: 'small_city', troops: 10000 },
  { id: 'city_dean', name: '武胜关', factionId: 'panjun', lat: 31.27, lng: 113.68, type: 'pass', region: 'SOUTH', troops: 10000 },
  { id: 'city_dehancheng', name: '得汉城', factionId: 'panjun', lat: 32.08, lng: 107.45, type: 'small_city', region: 'CHU_SHU', troops: 10000 },

  { id: 'city_derbent', name: '杰尔宾特', factionId: 'panjun', lat: 42.06, lng: 48.29, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_dingjiazhou', name: '丁家洲', factionId: 'panjun', lat: 30.93, lng: 117.70, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_duanshi', name: '长平', factionId: 'panjun', lat: 35.79, lng: 112.92, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_duima', name: '对马', factionId: 'panjun', lat: 34.20, lng: 129.29, type: 'small_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_eerduosi', name: '河曲', factionId: 'panjun', lat: 39.62, lng: 109.59, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_eyu', name: '阏与', factionId: 'panjun', lat: 37.05, lng: 113.15, type: 'small_city', troops: 10000 },
  { id: 'city_fengcheng', name: '凤城', factionId: 'panjun', lat: 40.45, lng: 124.07, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_fenghuangshan', name: '凤凰山', factionId: 'panjun', lat: 31.02, lng: 105.88, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_fucheng', name: '涪城', factionId: 'panjun', lat: 31.41, lng: 104.70, type: 'small_city', troops: 10000 },
  { id: 'city_fuliji', name: '符离', factionId: 'panjun', lat: 33.78, lng: 117.02, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_fushan', name: '东莱', factionId: 'panjun', lat: 35.18, lng: 129.07, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_fuzhou_2', name: '雕阴', factionId: 'panjun', lat: 35.80, lng: 109.41, type: 'small_city', troops: 10000 },
  { id: 'city_gaixia', name: '垓下', factionId: 'panjun', lat: 33.45, lng: 117.58, type: 'small_city', troops: 10000 },

  { id: 'city_gaoyueyuan', name: '高越原', factionId: 'panjun', lat: 38.62, lng: 103.08, type: 'small_city', region: 'NORTHWEST', troops: 10000 },
  { id: 'city_golmud', name: '格尔木', factionId: 'panjun', lat: 36.38, lng: 94.85, type: 'small_city', region: 'TIBET', troops: 10000 },
  { id: 'city_gonglusai', name: '望舒原', factionId: 'panjun', lat: 47.31, lng: 110.61, type: 'small_city', troops: 10000 },
  { id: 'city_guangdao', name: '广岛', factionId: 'panjun', lat: 34.40, lng: 132.46, type: 'small_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_guanzhai', name: '官寨', factionId: 'panjun', lat: 31.00, lng: 102.37, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_hailongtun', name: '海龙囤', factionId: 'panjun', lat: 27.82, lng: 106.83, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_haiyali', name: '海押立', factionId: 'panjun', lat: 45.41, lng: 79.91, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_haizhou_song', name: '海州', factionId: 'panjun', lat: 34.60, lng: 119.12, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_hanan', name: '汉安', factionId: 'panjun', lat: 29.66, lng: 104.92, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_hezhou', name: '贺州', factionId: 'panjun', lat: 24.37, lng: 111.36, type: 'small_city', troops: 10000 },
  { id: 'city_hongyanchi', name: '红盐池', factionId: 'panjun', lat: 39.30, lng: 108.50, type: 'small_city', region: 'NORTHWEST', troops: 10000 },
  { id: 'city_huaiyuan', name: '怀远', factionId: 'panjun', lat: 32.92, lng: 117.38, type: 'small_city', troops: 10000 },

  { id: 'city_hubudagang', name: '护步达冈', factionId: 'panjun', lat: 44.82, lng: 127.15, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_huma', name: '呼玛', factionId: 'panjun', lat: 51.72, lng: 126.65, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_itil', name: '亦的勒', factionId: 'panjun', lat: 46.35, lng: 48.05, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_jian', name: '吉安', factionId: 'panjun', lat: 27.09, lng: 114.96, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_jiangtou', name: '江头城', factionId: 'panjun', lat: 24.18, lng: 96.33, type: 'small_city', region: 'LINGNAN', troops: 10000 },
  { id: 'city_jieqiao', name: '界桥', factionId: 'panjun', lat: 36.98, lng: 115.42, type: 'small_city', region: 'NORTH', troops: 10000 },
  { id: 'city_jieting', name: '街亭', factionId: 'panjun', lat: 35.03, lng: 105.90, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_jilu', name: '姬路', factionId: 'panjun', lat: 34.84, lng: 134.69, type: 'small_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_jingjue', name: '精绝', factionId: 'panjun', lat: 37.11, lng: 82.73, type: 'small_city', troops: 10000 },
  { id: 'city_jingzhou_2', name: '镡城', factionId: 'panjun', lat: 26.56, lng: 109.57, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_jinhua', name: '金华', factionId: 'panjun', lat: 29.11, lng: 119.65, type: 'small_city', troops: 10000 },

  { id: 'city_jintian', name: '金田', factionId: 'panjun', lat: 23.23, lng: 110.05, type: 'small_city', region: 'LINGNAN', troops: 10000 },
  { id: 'city_jinxiang', name: '金乡', factionId: 'panjun', lat: 35.07, lng: 116.32, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_jinzhou_ming', name: '锦州', factionId: 'panjun', lat: 41.12, lng: 121.13, type: 'small_city', region: 'NORTH', troops: 10000 },
  { id: 'city_jiugongshan', name: '九宫山', factionId: 'panjun', lat: 29.40, lng: 114.65, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_jiuguo', name: '敖东', factionId: 'panjun', lat: 43.36, lng: 128.24, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_suoyang', name: '锁阳', factionId: 'panjun', lat: 40.52, lng: 95.78, type: 'small_city', region: 'NORTHWEST', troops: 10000, mirror: true },
  { id: 'city_juyanhai', name: '居延海', factionId: 'panjun', lat: 42.40, lng: 100.70, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_juye', name: '昌邑', factionId: 'panjun', lat: 35.39, lng: 116.06, type: 'small_city', troops: 10000 },
  { id: 'city_kalka', name: '卡尔卡河', factionId: 'panjun', lat: 47.10, lng: 37.55, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_kanglangshan', name: '康郎山', factionId: 'panjun', lat: 29.02, lng: 116.35, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_kebuduo', name: '科布多', factionId: 'panjun', lat: 47.99, lng: 91.63, type: 'small_city', troops: 10000 },
  { id: 'city_kecheng', name: '柯城', factionId: 'panjun', lat: 28.97, lng: 118.85, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_koyiten', name: '阔亦田', factionId: 'panjun', lat: 47.92, lng: 118.43, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_kunyang', name: '昆阳', factionId: 'panjun', lat: 33.62, lng: 113.35, type: 'small_city', troops: 10000 },
  { id: 'city_kuwu', name: '苦兀', factionId: 'panjun', lat: 53.10, lng: 142.10, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_langfang', name: '安次', factionId: 'panjun', lat: 39.52, lng: 116.70, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_leiwuqi', name: '类乌齐', factionId: 'panjun', lat: 31.22, lng: 96.60, type: 'small_city', troops: 10000 },
  { id: 'city_leuwuwei', name: '勒乌围', factionId: 'panjun', lat: 31.48, lng: 102.05, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_lianyun', name: '连云堡', factionId: 'panjun', lat: 37.00, lng: 73.40, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_lianzhou', name: '连州', factionId: 'panjun', lat: 24.94, lng: 112.48, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_linlishan', name: '林历山', factionId: 'panjun', lat: 29.93, lng: 117.92, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_lintun', name: '临屯', factionId: 'panjun', lat: 39.08, lng: 127.51, type: 'small_city', troops: 10000 },
  { id: 'city_longcou', name: '龙凑', factionId: 'panjun', lat: 37.11, lng: 116.48, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },

  { id: 'city_longgang', name: '金莲川', factionId: 'panjun', lat: 42.36, lng: 116.17, type: 'large_city', troops: 10000 }, // 元上京陪都
  { id: 'city_lukou', name: '鲁口', factionId: 'panjun', lat: 38.23, lng: 115.75, type: 'small_city', region: 'NORTH', troops: 10000 },
  { id: 'city_luohe', name: '临颍', factionId: 'panjun', lat: 33.80, lng: 113.95, type: 'small_city', troops: 10000 },

  { id: 'city_maduo', name: '玛多', factionId: 'panjun', lat: 34.92, lng: 98.21, type: 'small_city', troops: 10000 },
  { id: 'city_manas', name: '玛纳斯', factionId: 'panjun', lat: 44.30, lng: 86.22, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_manjiang', name: '漫江', factionId: 'panjun', lat: 42.15, lng: 127.28, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_mingsha', name: '鸣沙', factionId: 'panjun', lat: 37.50, lng: 105.20, type: 'small_city', troops: 10000, mirror: true },

  { id: 'city_muzhou', name: '宁古塔', factionId: 'panjun', lat: 44.50, lng: 130.25, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_nanping', name: '南平', factionId: 'panjun', lat: 26.63, lng: 118.17, type: 'small_city', troops: 10000 },
  { id: 'city_nanpu', name: '南浦', factionId: 'panjun', lat: 30.71, lng: 108.39, type: 'small_city', troops: 10000 },
  { id: 'city_naqu', name: '索坡', factionId: 'panjun', lat: 31.47, lng: 92.05, type: 'small_city', troops: 10000 },
  { id: 'city_nerchinsk', name: '尼布楚', factionId: 'panjun', lat: 51.97, lng: 116.58, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_ningbo', name: '句章', factionId: 'panjun', lat: 29.95, lng: 121.45, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_ninghua', name: '宁化', factionId: 'panjun', lat: 26.25, lng: 116.65, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_ningjiangzhou', name: '宁江州', factionId: 'panjun', lat: 45.18, lng: 124.83, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_ningyuan', name: '宁远', factionId: 'panjun', lat: 40.61, lng: 120.71, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_noryang', name: '露梁海', factionId: 'panjun', lat: 34.92, lng: 127.87, type: 'ferry', troops: 10000 },
  { id: 'city_nuergan', name: '奴儿干', factionId: 'panjun', lat: 52.94, lng: 139.75, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_old_mangya', name: '老茫崖', factionId: 'panjun', lat: 38.20, lng: 90.50, type: 'small_city', region: 'TIBET', troops: 10000 },
  { id: 'city_ononhe', name: '斡难河', factionId: 'panjun', lat: 48.25, lng: 110.50, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_otrar', name: '讹答剌', factionId: 'panjun', lat: 42.85, lng: 68.30, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_paryang', name: '帕羊', factionId: 'panjun', lat: 30.05, lng: 82.96, type: 'small_city', region: 'WEST', troops: 10000 },

  { id: 'city_pingliang', name: '平凉', factionId: 'panjun', lat: 35.53, lng: 106.67, type: 'small_city', region: 'NORTHWEST', troops: 10000 },
  { id: 'city_pingyao', name: '平陶', factionId: 'panjun', lat: 37.20, lng: 112.17, type: 'small_city', troops: 10000 },
  { id: 'city_pishan', name: '皮山', factionId: 'panjun', lat: 37.61, lng: 78.28, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_poyang', name: '余干', factionId: 'panjun', lat: 28.70, lng: 116.68, type: 'small_city', troops: 10000 },
  { id: 'city_qazvin', name: '加兹温', factionId: 'panjun', lat: 36.27, lng: 50.00, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_qichun', name: '蕲春', factionId: 'panjun', lat: 30.32, lng: 115.57, type: 'small_city', troops: 10000 },
  { id: 'city_qiemi', name: '且弥', factionId: 'panjun', lat: 43.82, lng: 87.61, type: 'small_city', region: 'WESTERN', troops: 10000 },
  { id: 'city_qiemo', name: '且末', factionId: 'panjun', lat: 38.14, lng: 85.53, type: 'small_city', troops: 10000 },
  { id: 'city_qiliemi', name: '乞列迷', factionId: 'panjun', lat: 50.22, lng: 136.90, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_qinghe', name: '清河城', factionId: 'panjun', lat: 41.17, lng: 124.03, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_qishan', name: '武都', factionId: 'panjun', lat: 33.39, lng: 104.92, type: 'small_city', mirror: true },
  { id: 'city_qiting', name: '歧亭', factionId: 'panjun', lat: 31.05, lng: 114.83, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_qu_a', name: '曲阿', factionId: 'panjun', lat: 31.98, lng: 119.58, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_qucheng', name: '曲城', factionId: 'panjun', lat: 34.430000, lng: 104.030000, type: 'small_city', region: 'NORTHWEST', troops: 10000, mirror: true },

  { id: 'city_quli', name: '姑墨', factionId: 'panjun', lat: 41.17, lng: 80.26, type: 'small_city', troops: 10000 },
  { id: 'city_rangcheng', name: '穰城', factionId: 'panjun', lat: 32.68, lng: 112.08, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_rongxian', name: '荣县', factionId: 'panjun', lat: 29.45, lng: 104.42, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_ruoqiang', name: '婼羌', factionId: 'panjun', lat: 39.02, lng: 88.16, type: 'small_city', troops: 10000 },
  { id: 'city_rutog', name: '日土宗', factionId: 'panjun', lat: 33.38, lng: 79.73, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_ruxu', name: '濡须', factionId: 'panjun', lat: 31.55, lng: 117.95, type: 'small_city', mirror: true },

  { id: 'city_saga', name: '萨嘎', factionId: 'panjun', lat: 29.32, lng: 85.22, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_saitula', name: '赛图拉', factionId: 'panjun', lat: 36.41, lng: 78.03, type: 'small_city', region: 'TIBET', troops: 10000 },
  { id: 'city_sanmishan', name: '三弥山', factionId: 'panjun', lat: 44.52, lng: 84.88, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_sarhu', name: '萨尔浒', factionId: 'panjun', lat: 41.88, lng: 124.27, type: 'small_city', region: 'NORTHEAST', troops: 10000 },

  { id: 'city_shangyong', name: '上庸', factionId: 'panjun', lat: 32.23, lng: 110.23, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_shayuan', name: '沙苑', factionId: 'panjun', lat: 34.82, lng: 109.95, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_shuaibinfu', name: '率宾府', factionId: 'panjun', lat: 43.79, lng: 131.95, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_shunchang', name: '顺昌', factionId: 'panjun', lat: 32.89, lng: 115.81, type: 'small_city', troops: 10000 },
  { id: 'city_sidu', name: '濑阳', factionId: 'panjun', lat: 31.42, lng: 119.48, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_songzhou', name: '松州', factionId: 'panjun', lat: 32.65, lng: 103.58, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_sudak', name: '苏达克', factionId: 'panjun', lat: 44.85, lng: 34.97, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_sukhbaatar', name: '苏赫巴托', factionId: 'panjun', lat: 50.23, lng: 106.20, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_suotouhu', name: '缩头湖', factionId: 'panjun', lat: 32.93, lng: 119.85, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_taizhou', name: '临海', factionId: 'panjun', lat: 28.66, lng: 121.42, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_talas', name: '恒罗斯', factionId: 'panjun', lat: 42.90, lng: 71.37, type: 'small_city', region: 'WEST', troops: 10000 },
  { id: 'city_tiandushan', name: '天都山', factionId: 'panjun', lat: 36.51, lng: 105.52, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_tianmenling', name: '天门岭', factionId: 'panjun', lat: 41.67, lng: 124.67, type: 'small_city', region: 'NORTHEAST', troops: 10000 },

  { id: 'city_tongjiang', name: '混同江口', factionId: 'panjun', lat: 47.64, lng: 132.51, type: 'small_city', region: 'NORTHEAST', troops: 10000 },

  { id: 'city_ulanbutong', name: '乌兰布通', factionId: 'panjun', lat: 42.58, lng: 117.33, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_ulanude', name: '乌兰乌德', factionId: 'panjun', lat: 51.83, lng: 107.58, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_uliji', name: '乌力吉', factionId: 'panjun', lat: 41.51, lng: 104.10, type: 'small_city', region: 'NOMADIC', troops: 10000 },

  { id: 'city_wankou', name: '皖口', factionId: 'panjun', lat: 30.52, lng: 116.85, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_weichu', name: '威楚', factionId: 'panjun', lat: 25.03, lng: 101.54, type: 'small_city', troops: 10000 },
  { id: 'city_weili', name: '渠犁', factionId: 'panjun', lat: 41.20, lng: 86.48, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_weitou', name: '尉头', factionId: 'panjun', lat: 39.81, lng: 79.11, type: 'small_city', troops: 10000 },
  { id: 'city_wensu', name: '温宿', factionId: 'panjun', lat: 41.24, lng: 79.22, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_wenzhou', name: '鹿城', factionId: 'panjun', lat: 28.00, lng: 120.70, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_wuguocheng', name: '五国城', factionId: 'panjun', lat: 46.29, lng: 129.56, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_wulagai', name: '饶乐水', factionId: 'panjun', lat: 45.71, lng: 118.91, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_wuqiao', name: '吴桥', factionId: 'panjun', lat: 37.63, lng: 116.38, type: 'small_city', region: 'NORTH', troops: 10000 },

  { id: 'city_wuyuan', name: '五原', factionId: 'panjun', lat: 40.78, lng: 107.46, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_wuzhangyuan', name: '五丈原', factionId: 'panjun', lat: 34.23, lng: 107.51, type: 'small_city', region: 'CENTRAL', troops: 10000 },

  { id: 'city_xiangride', name: '香日德', factionId: 'panjun', lat: 36.08, lng: 97.90, type: 'small_city', region: 'TIBET', troops: 10000 },
  { id: 'city_xiangxian', name: '项县', factionId: 'panjun', lat: 33.40, lng: 115.10, type: 'small_city', region: 'CENTRAL', troops: 10000 },


  { id: 'city_xiaotianyuan', name: '小田原', factionId: 'panjun', lat: 35.25, lng: 139.15, type: 'small_city', region: 'JAPAN', troops: 10000 },
  { id: 'city_xiaquyang', name: '晋州', factionId: 'panjun', lat: 38.03, lng: 115.12, type: 'small_city', region: 'NORTH', troops: 10000, mirror: true },
  { id: 'city_xiaxiang', name: '下相', factionId: 'panjun', lat: 33.96, lng: 118.27, type: 'small_city', troops: 10000 },
  { id: 'city_xiazhijiang', name: '下沚江', factionId: 'panjun', lat: 29.40, lng: 112.17, type: 'small_city', region: 'SOUTH', troops: 10000 },
  { id: 'city_xinxiang', name: '牧野', factionId: 'panjun', lat: 35.10, lng: 113.40, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_xinyang', name: '信阳', factionId: 'panjun', lat: 32.22, lng: 114.14, type: 'small_city', troops: 10000 },
  { id: 'city_xuantu', name: '玄菟', factionId: 'panjun', lat: 39.81, lng: 127.55, type: 'small_city', troops: 10000 },
  { id: 'city_yaksa', name: '雅克萨', factionId: 'panjun', lat: 53.38, lng: 124.08, type: 'small_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_yancheng', name: '雁城', factionId: 'panjun', lat: 26.90, lng: 112.57, type: 'small_city', troops: 10000 },

  { id: 'city_yibin', name: '宜宾', factionId: 'panjun', lat: 28.59, lng: 104.72, type: 'small_city', troops: 10000 },
  { id: 'city_yiling', name: '夷陵', factionId: 'panjun', lat: 30.69, lng: 111.28, type: 'small_city', troops: 10000, mirror: true },

  // --- Small Cities 补完 (Final 17) ---
  { id: 'city_yiwu', name: '伊吾', factionId: 'panjun', lat: 42.83, lng: 93.51, type: 'small_city', region: 'WESTERN', troops: 10000, mirror: true },
  { id: 'city_yongqiu', name: '雍丘', factionId: 'panjun', lat: 34.52, lng: 114.77, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_yubi', name: '玉壁', factionId: 'panjun', lat: 35.60, lng: 110.90, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_yulin', name: '榆林', factionId: 'panjun', lat: 38.29, lng: 109.73, type: 'small_city', troops: 10000 },
  { id: 'city_yumi', name: '扜弥', factionId: 'panjun', lat: 36.71, lng: 81.44, type: 'small_city', troops: 10000 },
  { id: 'city_yushu', name: '结古', factionId: 'panjun', lat: 33.00, lng: 97.01, type: 'small_city', troops: 10000 },
  { id: 'city_zabuhelante', name: '扎布赫兰特', factionId: 'panjun', lat: 47.73, lng: 96.68, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_zangke', name: '且兰', factionId: 'panjun', lat: 26.95, lng: 107.85, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_zaojiaolin', name: '皂角林', factionId: 'panjun', lat: 32.27, lng: 111.65, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_zhangzhou', name: '漳州', factionId: 'panjun', lat: 24.54, lng: 117.59, type: 'small_city', troops: 10000, mirror: true },
  { id: 'city_zhaomodo', name: '昭莫多', factionId: 'panjun', lat: 47.72, lng: 106.93, type: 'small_city', region: 'NOMADIC', troops: 10000 },
  { id: 'city_zhongzhou', name: '忠州', factionId: 'panjun', lat: 30.30, lng: 108.03, type: 'small_city', region: 'CHU_SHU', troops: 10000 }, // 修正：三峡忠州
  { id: 'city_zhoupan', name: '周槃', factionId: 'panjun', lat: 36.02, lng: 107.88, type: 'small_city', region: 'NORTHWEST', troops: 10000 },
  { id: 'city_zhoushui', name: '咒水', factionId: 'panjun', lat: 21.88, lng: 95.95, type: 'small_city', region: 'LINGNAN', troops: 10000 },
  { id: 'city_zhuti', name: '朱提', factionId: 'panjun', lat: 27.33, lng: 103.71, type: 'small_city', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_zhuya', name: '珠崖', factionId: 'panjun', lat: 19.99, lng: 110.38, type: 'small_city', troops: 10000 },
  { id: 'city_zimengchuan', name: '紫蒙川', factionId: 'panjun', lat: 43.63, lng: 122.25, type: 'small_city', troops: 10000, mirror: true },

  // ==================== [SECTION 4/5] 关隘 (Passes - Part 1) ====================
  { id: 'city_nanhanshancheng', name: '南汉山城', factionId: 'panjun', lat: 37.48, lng: 127.18, type: 'pass', region: 'KOREA', troops: 10000 },
  { id: 'city_arjin_pass', name: '阿尔金山', factionId: 'panjun', lat: 38.70, lng: 89.90, type: 'pass', region: 'TIBET', troops: 10000 },
  { id: 'city_bailangshan', name: '白狼山', factionId: 'panjun', lat: 41.22, lng: 119.38, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_biandukou', name: '扁都口', factionId: 'panjun', lat: 38.21, lng: 100.91, type: 'pass', troops: 10000 },
  { id: 'city_chijinxiaguan', name: '赤金峡', factionId: 'panjun', lat: 40.05, lng: 97.23, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_daomaguan', name: '倒马关', factionId: 'panjun', lat: 38.91, lng: 114.80, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_doushaguan', name: '豆沙关', factionId: 'panjun', lat: 28.16, lng: 103.75, type: 'pass', region: 'CHU_SHU', troops: 10000 }, // 石门关
  { id: 'city_dusongguan', name: '独松关', factionId: 'panjun', lat: 30.57, lng: 119.71, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_fenshuiguan_min', name: '分水关', factionId: 'panjun', lat: 27.28, lng: 119.23, type: 'pass', region: 'SOUTH', troops: 10000 },
  { id: 'city_gaoque', name: '高阙', factionId: 'panjun', lat: 41.17, lng: 107.03, type: 'pass', troops: 10000, mirror: true }, // 修正：阴山缺口位置
  { id: 'city_guangchengguan', name: '广成关', factionId: 'panjun', lat: 34.17, lng: 112.84, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_gulangguan', name: '古浪关', factionId: 'panjun', lat: 37.47, lng: 102.87, type: 'pass', region: 'TIBET', troops: 10000, mirror: true },
  { id: 'city_guyanguan', name: '严关', factionId: 'panjun', lat: 25.72, lng: 110.88, type: 'pass', troops: 10000 },
  { id: 'city_hanguguan', name: '函谷关', factionId: 'panjun', lat: 34.64, lng: 110.92, type: 'pass', troops: 10000 }, // 修正：秦函谷关
  { id: 'city_heka_pass', name: '河卡山', factionId: 'panjun', lat: 35.78, lng: 99.50, type: 'pass', region: 'WEST', troops: 10000 },
  { id: 'city_hengpuguan', name: '横浦关', factionId: 'panjun', lat: 25.44, lng: 114.39, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_heshangyuan', name: '大散关', factionId: 'panjun', lat: 34.28, lng: 106.98, type: 'pass', region: 'CENTRAL', troops: 10000 },
  { id: 'city_huangxiguan', name: '湟溪关', factionId: 'panjun', lat: 23.91, lng: 113.39, type: 'pass', troops: 10000 },
  { id: 'city_hulanggou', name: '虎狼谷', factionId: 'panjun', lat: 36.08, lng: 117.68, type: 'pass', region: 'NORTH', troops: 10000 },
  { id: 'city_hulaoguan', name: '虎牢关', factionId: 'panjun', lat: 34.84, lng: 113.15, type: 'pass', troops: 10000, mirror: true },

  { id: 'city_jianmenguan', name: '剑门关', factionId: 'panjun', lat: 32.22, lng: 105.56, type: 'pass', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_jiayuguan', name: '嘉峪关', factionId: 'panjun', lat: 39.81, lng: 98.22, type: 'pass', troops: 10000 },
  { id: 'city_jieshan', name: '界山达坂', factionId: 'panjun', lat: 34.52, lng: 80.01, type: 'pass', region: 'WEST', troops: 10000 },
  { id: 'city_jiluoshan', name: '稽落山', factionId: 'panjun', lat: 45.45, lng: 96.50, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_jinshan', name: '金山', factionId: 'panjun', lat: 48.00, lng: 89.00, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_juyongguan', name: '居庸关', factionId: 'panjun', lat: 40.29, lng: 116.06, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_keluoke', name: '可洛峐山', factionId: 'panjun', lat: 41.52, lng: 108.52, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_khalanzhenshatuo', name: '合兰真沙陀', factionId: 'panjun', lat: 47.12, lng: 111.45, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_kunlunguan', name: '昆仑关', factionId: 'panjun', lat: 23.22, lng: 108.79, type: 'pass', troops: 10000 },

  // ==================== [SECTION 4/5] 关隘 (Passes - Part 2) ====================
  { id: 'city_langjuxu', name: '狼居胥山', factionId: 'panjun', lat: 48.40, lng: 108.79, type: 'pass', troops: 10000 }, // 肯特山
  { id: 'city_mailingguan', name: '麦岭关', factionId: 'panjun', lat: 25.09, lng: 111.31, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_nahuhunshan', name: '纳忽山', factionId: 'panjun', lat: 47.45, lng: 102.32, type: 'pass', region: 'NOMADIC', troops: 10000 },

  { id: 'city_panjiang', name: '盘江关', factionId: 'panjun', lat: 25.78, lng: 104.95, type: 'pass', region: 'CHU_SHU', troops: 10000 },
  { id: 'city_piantouguan', name: '偏头关', factionId: 'panjun', lat: 39.44, lng: 111.49, type: 'pass', troops: 10000 },
  { id: 'city_pingxingguan', name: '平型关', factionId: 'panjun', lat: 39.32, lng: 113.92, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_qifu', name: '岐阜', factionId: 'panjun', lat: 35.42, lng: 136.77, type: 'pass', troops: 10000 }, // 稻叶山
  { id: 'city_raofengguan', name: '饶凤关', factionId: 'panjun', lat: 33.05, lng: 108.18, type: 'pass', region: 'CENTRAL', troops: 10000 },
  { id: 'city_resuoqiao', name: '热索桥', factionId: 'panjun', lat: 28.38, lng: 85.35, type: 'pass', region: 'WEST', troops: 10000 },
  { id: 'city_riyue_mt', name: '日月山', factionId: 'panjun', lat: 36.35, lng: 101.10, type: 'pass', region: 'TIBET', troops: 10000 },
  { id: 'city_shahukou', name: '杀虎口', factionId: 'panjun', lat: 40.24, lng: 112.31, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_shanhaiguan', name: '山海关', factionId: 'panjun', lat: 40.01, lng: 119.75, type: 'pass', troops: 10000 }, // 修正：卡在燕山与海之间
  { id: 'city_shaoguan', name: '韶关', factionId: 'panjun', lat: 24.83, lng: 113.82, type: 'pass', troops: 10000 },
  { id: 'city_shizuishan', name: '石嘴山', factionId: 'panjun', lat: 39.27, lng: 106.79, type: 'pass', troops: 10000 },

  { id: 'city_suluohanshan', name: '素罗汗山', factionId: 'panjun', lat: 52.00, lng: 113.00, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_tanggula', name: '唐古拉山口', factionId: 'panjun', lat: 32.87, lng: 91.92, type: 'pass', troops: 10000 },
  { id: 'city_tiemenguan', name: '铁门关', factionId: 'panjun', lat: 41.84, lng: 85.64, type: 'pass', troops: 10000 },
  { id: 'city_tongguan', name: '潼关', factionId: 'panjun', lat: 34.61, lng: 110.28, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_waqiaoguan', name: '瓦桥关', factionId: 'panjun', lat: 38.98, lng: 116.08, type: 'pass', region: 'NORTH', troops: 10000 },

  { id: 'city_wuguan', name: '武关', factionId: 'panjun', lat: 33.58, lng: 110.68, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_wuhai', name: '乌海关', factionId: 'panjun', lat: 35.15, lng: 98.88, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_xianrenguan', name: '仙人关', factionId: 'panjun', lat: 33.63, lng: 106.17, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_xianxiaguan', name: '仙霞关', factionId: 'panjun', lat: 28.39, lng: 118.39, type: 'pass', troops: 10000 },
  { id: 'city_xiaoguan', name: '萧关', factionId: 'panjun', lat: 35.83, lng: 106.27, type: 'pass', region: 'CENTRAL', troops: 10000, mirror: true },
  { id: 'city_xiatasai', name: '细君台', factionId: 'panjun', lat: 42.42, lng: 80.88, type: 'pass', troops: 10000 },
  { id: 'city_yangguan', name: '阳关', factionId: 'panjun', lat: 39.93, lng: 94.06, type: 'pass', region: 'NORTHWEST', troops: 10000 },
  { id: 'city_yangpingguan', name: '阳平关', factionId: 'panjun', lat: 32.97, lng: 106.03, type: 'pass', troops: 10000 },
  { id: 'city_yangshanguan', name: '阳山关', factionId: 'panjun', lat: 24.31, lng: 112.61, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_yanmenguan', name: '雁门关', factionId: 'panjun', lat: 39.21, lng: 112.88, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_yanranleshi', name: '燕然勒石', factionId: 'panjun', lat: 45.10, lng: 104.33, type: 'pass', region: 'NOMADIC', troops: 10000, mirror: true },
  { id: 'city_yanzhishan', name: '焉支山', factionId: 'panjun', lat: 38.15, lng: 101.42, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_yehuling', name: '野狐岭', factionId: 'panjun', lat: 40.88, lng: 114.75, type: 'pass', region: 'NORTH', troops: 10000 },
  { id: 'city_yudujin', name: '于都斤山', factionId: 'panjun', lat: 47.17, lng: 101.58, type: 'pass', troops: 10000, mirror: true },
  { id: 'city_yumenguan', name: '玉门关', factionId: 'panjun', lat: 40.35, lng: 93.86, type: 'pass', region: 'NORTHWEST', troops: 10000, mirror: true },
  { id: 'city_zhennanguan', name: '镇南关', factionId: 'panjun', lat: 21.98, lng: 106.71, type: 'pass', troops: 10000 },
  { id: 'city_zhezhuyundushan', name: '折折运都山', factionId: 'panjun', lat: 47.30, lng: 103.50, type: 'pass', region: 'NOMADIC', troops: 10000 },
  { id: 'city_zijingguan', name: '紫荆关', factionId: 'panjun', lat: 39.42, lng: 115.16, type: 'pass', troops: 10000, mirror: true },


  { id: 'city_guandu', name: '官渡', factionId: 'panjun', lat: 34.72, lng: 114.02, type: 'small_city', region: 'CENTRAL', troops: 10000 },
  { id: 'city_jundu', name: '军渡', factionId: 'panjun', lat: 37.40, lng: 110.87, type: 'ferry', troops: 10000 },
  { id: 'city_longmen', name: '蒲津渡', factionId: 'panjun', lat: 34.90, lng: 110.48, type: 'ferry', troops: 10000 },
  { id: 'city_longmen_sui', name: '龙门', factionId: 'panjun', lat: 35.45, lng: 110.45, type: 'ferry', region: 'CENTRAL', troops: 10000 },
  { id: 'city_chenjiadao', name: '陈家岛', factionId: 'panjun', lat: 35.93, lng: 120.22, type: 'ferry', region: 'NORTH', troops: 10000 },
  { id: 'city_liugongdao', name: '刘公岛', factionId: 'panjun', lat: 37.50, lng: 122.18, type: 'ferry', region: 'NORTH', troops: 10000 },
  { id: 'city_dengzhou', name: '登州', factionId: 'panjun', lat: 37.82, lng: 120.75, type: 'ferry', region: 'NORTH', troops: 10000 },
  { id: 'city_lushun_baiyushan', name: '旅顺', factionId: 'panjun', lat: 38.82, lng: 121.25, type: 'ferry', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_cengang', name: '岑港', factionId: 'panjun', lat: 30.05, lng: 122.02, type: 'ferry', region: 'SOUTH', troops: 10000 },
  { id: 'city_penghu', name: '澎湖', factionId: 'panjun', lat: 23.57, lng: 119.57, type: 'ferry', region: 'LINGNAN', troops: 10000 },
  { id: 'city_liaoluowan', name: '料罗湾', factionId: 'panjun', lat: 24.42, lng: 118.43, type: 'ferry', region: 'SOUTH', troops: 10000 },
  { id: 'city_tunmen', name: '屯门', factionId: 'panjun', lat: 22.38, lng: 113.92, type: 'ferry', region: 'LINGNAN', troops: 10000 },
  { id: 'city_yashan', name: '崖山', factionId: 'panjun', lat: 22.20, lng: 113.06, type: 'ferry', region: 'LINGNAN', troops: 10000 },
  { id: 'city_humen', name: '虎门', factionId: 'panjun', lat: 22.82, lng: 113.63, type: 'ferry', region: 'LINGNAN', troops: 10000 },
  { id: 'city_baijiangkou', name: '白江口', factionId: 'panjun', lat: 35.98, lng: 126.68, type: 'ferry', troops: 10000, mirror: true },
  { id: 'city_baitengjiang', name: '白藤江', factionId: 'panjun', lat: 20.83, lng: 106.67, type: 'ferry', region: 'LINGNAN', troops: 10000 },



  // ==================== 核心军事枢纽 (Huge Cities) ====================
  { id: 'city_yecheng', name: '邺城', factionId: 'panjun', lat: 36.28, lng: 114.43, type: 'huge_city', region: 'NORTH', troops: 10000 }, // 魏晋南北朝军事重心，“邺城兴则中原定”

  { id: 'city_sabi', name: '泗沘', factionId: 'panjun', lat: 36.280000, lng: 126.910000, type: 'large_city', region: 'KOREA', troops: 10000 }, // 白江口之战后的战略重心
  { id: 'city_osaka_castle', name: '大坂城', factionId: 'panjun', lat: 34.69, lng: 135.52, type: 'huge_city', region: 'JAPAN', troops: 10000 }, // 日本战国终结之地


  // ==================== 区域战役重心 (Large Cities) ====================
  // --- 中原战线 ---


  { id: 'city_runan', name: '汝南', factionId: 'panjun', lat: 32.94, lng: 114.37, type: 'large_city', region: 'CENTRAL', troops: 10000 }, // 袁氏祖地，中原后勤中心
  { id: 'city_ezhou_war', name: '武昌', factionId: 'panjun', lat: 30.39, lng: 114.89, type: 'large_city', region: 'SOUTH', troops: 10000 }, // 古武昌(鄂州)，东吴抗曹前哨

  // --- 北方走廊 ---
  { id: 'city_suide', name: '绥德', factionId: 'panjun', lat: 37.51, lng: 110.22, type: 'large_city', region: 'NORTHWEST', troops: 10000 }, // 秦汉上郡，蒙恬屯兵处
  { id: 'city_shuozhou_my', name: '马邑', factionId: 'panjun', lat: 39.33, lng: 112.43, type: 'large_city', region: 'NORTH', troops: 10000 }, // 马邑之谋，汉匈战争转折点
  { id: 'city_guangning', name: '广宁', factionId: 'panjun', lat: 41.59, lng: 121.79, type: 'large_city', region: 'NORTH', troops: 10000 }, // 明代辽东镇核心
  { id: 'city_dingzhou', name: '中山', factionId: 'panjun', lat: 38.51, lng: 114.99, type: 'large_city', region: 'NORTH', troops: 10000 }, // 战国中山国，后为北方防御重镇
  { id: 'city_beiting_war', name: '北庭', factionId: 'panjun', lat: 44.02, lng: 89.10, type: 'large_city', region: 'WESTERN', troops: 10000 }, // 唐代北庭都护府

  // --- 岭南与国际 ---
  { id: 'city_hepu', name: '合浦', factionId: 'panjun', lat: 21.66, lng: 109.20, type: 'large_city', region: 'LINGNAN', troops: 10000 }, // 马援南征交趾转运点




  // ==================== 著名古战场与军事堡垒 (Small Cities) ====================
  { id: 'city_tumubao', name: '土木堡', factionId: 'panjun', lat: 40.35, lng: 115.65, type: 'small_city', region: 'NORTH', troops: 10000 }, // 明代重大转折点
  { id: 'city_gongan', name: '公安', factionId: 'panjun', lat: 30.06, lng: 112.23, type: 'small_city', region: 'SOUTH', troops: 10000 }, // 刘备荆州立足点
  { id: 'city_maicheng', name: '麦城', factionId: 'panjun', lat: 30.68, lng: 112.18, type: 'small_city', region: 'SOUTH', troops: 10000 }, // 关羽败走麦城
  { id: 'city_zitong', name: '梓潼', factionId: 'panjun', lat: 31.63, lng: 105.16, type: 'small_city', region: 'CHU_SHU', troops: 10000 }, // 蜀道入川防线

  { id: 'city_longyou_dd', name: '狄道', factionId: 'panjun', lat: 35.38, lng: 103.88, type: 'small_city', region: 'NORTHWEST', troops: 10000 }, // 陇西军事基地

  { id: 'city_fanchang', name: '繁昌', factionId: 'panjun', lat: 31.08, lng: 118.20, type: 'small_city', region: 'SOUTH', troops: 10000 }, // 长江南岸拦截点
  { id: 'city_barkol_fort', name: '巴里坤', factionId: 'panjun', lat: 43.60, lng: 93.01, type: 'small_city', region: 'WESTERN', troops: 10000 }, // 西域屯田堡垒

  // ==================== 战略孤立名关 (Pass) ====================
  // --- 每一道关口都卡死一条独立的战略通道 ---
  { id: 'city_jingxingguan', name: '井陉关', factionId: 'panjun', lat: 38.03, lng: 114.04, type: 'pass', region: 'NORTH', troops: 10000 }, // 太行山脉由东入西第一道关口
  { id: 'city_dushikou', name: '独石口', factionId: 'panjun', lat: 41.25, lng: 115.71, type: 'pass', region: 'NORTH', troops: 10000 }, // 塞北直扑华北平原的豁口
  { id: 'city_gubeikou', name: '古北口', factionId: 'panjun', lat: 40.69, lng: 117.16, type: 'pass', region: 'NORTH', troops: 10000 }, // 长城内线生死防御点
  { id: 'city_xifengkou', name: '喜峰口', factionId: 'panjun', lat: 40.42, lng: 118.28, type: 'pass', region: 'NORTH', troops: 10000 }, // 塞外骑兵入关捷径
  { id: 'city_huangyaguan', name: '黄崖关', factionId: 'panjun', lat: 40.23, lng: 117.44, type: 'pass', region: 'NORTH', troops: 10000 }, // 幽州东北防线
  { id: 'city_lantian', name: '蓝田关', factionId: 'panjun', lat: 34.150000, lng: 109.310000, type: 'pass', region: 'CENTRAL', troops: 10000, mirror: true }, // 关中盆地东南门户，刘邦破秦之关

  { id: 'city_mingshan', name: '名山关', factionId: 'panjun', lat: 30.060000, lng: 103.040000, type: 'pass', region: 'CHU_SHU', troops: 10000, mirror: true }, // 川藏通道第一关
  { id: 'city_mopanguan', name: '磨盘关', factionId: 'panjun', lat: 25.12, lng: 102.10, type: 'pass', region: 'CHU_SHU', troops: 10000 }, // 滇西战略死穴
  { id: 'city_tieguan_west', name: '铁关', factionId: 'panjun', lat: 38.93, lng: 66.88, type: 'pass', region: 'WEST', troops: 10000 }, // 中亚铁门，阻断撒马尔罕与巴克特里亚
  { id: 'city_ningwuguan', name: '宁武关', factionId: 'panjun', lat: 39.00, lng: 112.30, type: 'pass', region: 'NORTH', troops: 10000 }, // 山西内三关之首

  // ==================== 核心军事渡口 (Ferry) ====================
  // --- 彻底阻隔水系，必须跨越的战术节点 ---


  { id: 'city_yanjin_war', name: '延津', factionId: 'panjun', lat: 35.15, lng: 114.21, type: 'ferry', region: 'CENTRAL', troops: 10000 }, // 官渡决战的前奏地
  { id: 'city_jingkou', name: '京口', factionId: 'panjun', lat: 32.22, lng: 119.46, type: 'ferry', region: 'SOUTH', troops: 10000 }, // 刘裕北伐基地，长江防线枢纽

  { id: 'city_sanhe_du', name: '三河', factionId: 'panjun', lat: 31.52, lng: 117.25, type: 'ferry', region: 'SOUTH', troops: 10000 }, // 巢湖决战点
  { id: 'city_wusongkou', name: '吴淞口', factionId: 'panjun', lat: 31.39, lng: 121.50, type: 'ferry', region: 'SOUTH', troops: 10000 }, // 海防与江防交汇

  { id: 'city_sinuiju_war', name: '义州渡', factionId: 'panjun', lat: 40.110000, lng: 124.390000, type: 'ferry', region: 'KOREA', troops: 10000, mirror: true }, // 渡鸭绿江第一节点

  // (后续补充点位省略，为保证格式严谨，以下继续补足各战线点位...)
  { id: 'city_shenyang_sj', name: '盛京', factionId: 'panjun', lat: 41.80, lng: 123.43, type: 'huge_city', region: 'NORTHEAST', troops: 10000 },
  { id: 'city_gangneung', name: '江陵', factionId: 'panjun', lat: 37.75, lng: 128.87, type: 'small_city', region: 'KOREA', troops: 10000 },
  { id: 'city_ulsan', name: '蔚山', factionId: 'panjun', lat: 35.53, lng: 129.31, type: 'small_city', region: 'KOREA', troops: 10000 },

  // ==================== 战略空白填补 (Strategic Gaps) ====================


  { id: 'city_yongmingcheng', name: '永明城', factionId: 'panjun', lat: 43.11, lng: 131.88, type: 'small_city', region: 'NORTHEAST', troops: 10000 },


  { id: 'city_shuli', name: '首里', factionId: 'panjun', lat: 26.21, lng: 127.71, type: 'small_city', region: 'JAPAN', troops: 10000 },


  { id: 'city_tanegashima', name: '种子岛', factionId: 'panjun', lat: 30.56, lng: 130.99, type: 'small_city', region: 'JAPAN', troops: 10000 },


  { id: 'city_tengyue', name: '腾越', factionId: 'panjun', lat: 25.02, lng: 98.49, type: 'small_city', region: 'CHU_SHU', troops: 10000 },


  { id: 'city_zhenyuan', name: '镇远', factionId: 'panjun', lat: 27.05, lng: 108.42, type: 'small_city', region: 'CHU_SHU', troops: 10000 },



  { id: 'city_xingxingxia', name: '星星峡', factionId: 'panjun', lat: 41.42, lng: 95.11, type: 'pass', region: 'WESTERN', troops: 10000 },


  { id: 'city_danshui', name: '淡水', factionId: 'panjun', lat: 25.17, lng: 121.44, type: 'small_city', region: 'LINGNAN', troops: 10000 },


  { id: 'city_yinping', name: '阴平', factionId: 'panjun', lat: 32.950000, lng: 104.680000, type: 'small_city', region: 'CHU_SHU', troops: 10000, mirror: true },

  { id: 'city_jiuquan', name: '酒泉', factionId: 'panjun', lat: 39.74, lng: 98.51, type: 'large_city', region: 'NORTHWEST', troops: 10000 },

];