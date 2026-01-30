---
title: MAPWAR 项目全面文档
summary: 汇总世界观、势力、城市、玩家与 NPC 配置，提供 2025-11-02 时点的完整项目快照。
owner: GAKU
status: active
last_updated: 2025-11-02
phase: production
---
# MAPWAR 项目全面文档

## 项目概述

**项目名称**: MAPWAR  
**项目类型**: 基于真实地图的历史战略游戏（网页游戏）  
**技术栈**: 原生 JavaScript (ES6+), HTML5 Canvas  
**地图范围**: 中国及周边地区（北纬18.11°-53.56°，东经73.33°-134.77°）  
**历史时期**: 战国末期至秦统一（公元前231年起）

---

## 核心游戏机制

### 1. 时间系统
- **起始时间**: 公元前231年春季
- **季节系统**: 春、夏、秋、冬四季循环
- **季节时长**: 15秒/季（可调速：1x, 4x, 10x, 50x）
- **年份处理**: 
  - 负数表示公元前（BCE）
  - 正数表示公元（CE）
  - 没有公元0年，从-1年直接到1年

### 2. 势力系统
**初始势力**（10个）:
- 秦国（黑色）- 主导势力
- 韩国（橙色）
- 赵国（金黄色）
- 魏国（深青色）
- 齐国（深红）- **重要：齐国ID在游戏中代表汉朝**
- 楚国（深蓝）
- 燕国（紫色）
- 越国（青绿）
- 夏国（深蓝）
- 滇国（深棕）

**势力ID映射规则**:
```javascript
// 游戏设计：汉朝使用齐国ID
汉朝 = qi（齐国ID）
// 不要将qi改为han，它们在游戏中是同一个势力
```

### 3. 城市系统

#### 初始城市（20个）
定义在 `src/data/gameData.js` 的 `cities` 数组中，游戏开始时就存在：
- 长安（秦国首都）
- 洛阳、函谷关、新郑、邯郸、大梁
- 临淄、寿春、郢都、蓟城
- 成都、咸阳、襄阳、彭城、会稽
- 番禺、昆明、兰州、乌鲁木齐、呼和浩特

#### 城市属性
```javascript
{
    id: "city_id",           // 唯一标识
    name: "城市名",          // 显示名称
    factionId: "qin",        // 所属势力
    latitude: 34.34,         // 纬度
    longitude: 108.94,       // 经度
    importance: "capital",   // 重要性：capital/major/strategic/normal
    troops: 10000           // 驻军数量
}
```

#### 城市兵力机制
- **初始兵力**: 10,000（1万）
- **兵力上限**: 20,000（2万）
- **年度增长**: 100-400随机（每年春季）
- **战后恢复**: 伤兵40%-60%恢复（随机）

#### 动态城市规则
**重要规则**: 除了初始的20个城市外，以后添加的所有新城市都必须是动态生成的：
- 只在 `historicalEvents.js` 的事件 `actions` 中使用 `spawn_city`
- 等事件触发时才生成
- **不能添加到初始城市列表中**

### 4. 玩家系统

#### 玩家属性
```javascript
{
    position: { latitude, longitude },  // 位置
    troops: 55,                         // 初始兵力55
    merit: 0,                          // 功勋值
    rank: RANKS[0],                    // 当前军衔
    faction: null,                     // 所属势力（初始未加入）
    inBattle: false,                   // 战斗状态
    isMoving: false,                   // 移动状态
    targetPosition: null,              // 目标位置
    siegeTarget: null                  // 攻城目标
}
```

#### 军衔系统
定义在 `src/data/playerData.js`:
```javascript
{
    id: 0-9,                    // 军衔等级
    name: "什长/伍长/...",      // 军衔名称
    maxTroops: 55-9999,         // 最大兵力
    requiredMerit: 0-10000      // 所需功勋
}
```

军衔列表（从低到高）:
1. 什长（55兵力，0功勋）
2. 伍长（111兵力，50功勋）
3. 百夫长（333兵力，150功勋）
4. 司马（777兵力，400功勋）
5. 都尉（1111兵力，800功勋）
6. 校尉（3333兵力，1500功勋）
7. 将军（5555兵力，3000功勋）
8. 大将军（7777兵力，5000功勋）
9. 上将军（9999兵力，10000功勋）

#### 玩家兵力恢复
- **恢复条件**: 在己方城市时
- **恢复频率**: 每年一次（任意季节）
- **恢复量**: 100-400随机
- **恢复限制**: 
  - 只能在同一年的相同或更晚季节恢复
  - 不能超过当前军衔的最大兵力
  - 记录格式：`"年份-季节索引"` (如 "-231-0")

#### 晋升系统
- 功勋达到要求时自动晋升
- 显示晋升对话框（`PromotionDialog`）
- 游戏暂停，等待玩家确认
- 最大兵力自动提升

### 5. 战斗系统

#### 战斗类型

**野战（field_battle）**:
- 双方兵力：10,000 VS 10,000（1万 VS 1万）
- 触发：玩家点击敌方军队
- 显示战斗对话框（`BattleJoinDialog`）

**攻城战（siege）**:
- 攻方兵力：20,000（2万）
- 守方兵力：10,000（1万）
- 触发：历史事件或AI行为
- 持续时间：15秒（可配置）

**重要规则**: 这是固定规则，所有战斗必须遵守，不得擅自修改兵力数量

#### 战斗结算
- 胜方获得功勋
- 败方损失兵力
- 伤兵有40%-60%恢复
- 城市归属可能改变

### 6. NPC系统

#### NPC类型（9种练级怪物）
定义在 `src/npc/NPCManager.js`:

| 类型 | 名称 | 兵力 | 数量 | 速度 | 颜色 |
|------|------|------|------|------|------|
| bandit | 盗贼 | 55 | 18 | 0.6 | #8B4513 |
| raider | 流寇 | 111 | 16 | 0.7 | #A0522D |
| outlaw | 土匪 | 333 | 14 | 0.8 | #CD853F |
| barbarian | 异族 | 777 | 12 | 0.85 | #8B7355 |
| rebel | 叛军 | 1111 | 10 | 0.9 | #D2691E |
| mercenary | 佣兵 | 3333 | 8 | 0.95 | #B8860B |
| cult | 邪教 | 5555 | 6 | 1.0 | #8B008B |
| righteous | 义军 | 7777 | 4 | 1.05 | #FF8C00 |
| warlord | 军阀 | 9999 | 2 | 1.1 | #DC143C |

**总计**: 90个NPC

#### NPC生成规则
- **50%在核心区域**（成都以东，北京以南）
- **50%在全地图**（广州以北，上海以西，喀什以东）
- **最小间距**: 0.5度（约50公里）
- **最大尝试次数**: 50次

#### NPC刷新机制
- NPC被击败后加入死亡列表
- 每年刷新一个死亡的NPC
- 上限：90个NPC
- 达到上限时不刷新

### 7. 历史事件系统

#### 事件触发
- 定义在 `src/data/historicalEvents.js`
- 按年份和季节触发
- 季度检查（每季度开始时）
- 显示在事件通知面板

#### 事件动作类型

**spawn_army** - 生成军队:
```javascript
{
    type: "spawn_army",
    factionId: "qin",
    fromCityId: "luoyang",
    toCityId: "zheng_zhou",
    troops: 20000,
    speed: 1.0
}
```

**siege** - 攻城:
```javascript
{
    type: "siege",
    attackerFactionId: "qin",
    targetCityId: "zheng_zhou",
    duration: 15000  // 毫秒
}
```

**transfer_city** - 城市转移:
```javascript
{
    type: "transfer_city",
    cityId: "zheng_zhou",
    fromFactionId: "han",
    toFactionId: "qin"
}
```

**spawn_city** - 动态生成城市:
```javascript
{
    type: "spawn_city",
    cityId: "new_city",
    name: "新城市",
    factionId: "qin",
    latitude: 34.0,
    longitude: 108.0,
    importance: "normal",
    troops: 10000
}
```

**field_battle** - 野战:
```javascript
{
    type: "field_battle",
    attacker: { factionId: "qin", troops: 10000 },
    defender: { factionId: "han", troops: 10000 },
    location: { latitude: 34.0, longitude: 108.0 }
}
```

#### 历史事件显示
- **当前季度事件**: 显示在顶部通知区域
- **历史事件记录**: 按"年份-季节"分组显示
- **排序**: 最新的在前
- **格式**: "公元前XXX年 春/夏/秋/冬"

#### 重要规则
**严格遵守的制作规则**:
1. 不要自行添加城市转移动作
2. 不要自行添加战斗动作
3. 不要自行决定哪些城市应该被占领
4. 不要自行设计事件的连锁反应
5. 只实现用户明确要求的功能和效果
6. 不清楚时，先问用户想要什么效果

---

## 技术架构

### 文件结构

```
MAPWAR/
├── index.html                      # 主HTML文件
├── game.js                         # 游戏主逻辑（GameManager类）
├── style.css                       # 样式文件
├── src/
│   ├── data/
│   │   ├── gameData.js            # 游戏基础数据（地图范围、势力、初始城市）
│   │   ├── historicalEvents.js    # 历史事件数据
│   │   ├── playerData.js          # 玩家数据（军衔系统）
│   │   └── terrainData.js         # 地形数据（目前为空）
│   ├── player/
│   │   └── Player.js              # 玩家类
│   ├── npc/
│   │   └── NPCManager.js          # NPC管理系统
│   ├── renderer/
│   │   └── GameRenderer.js        # 游戏渲染器（未使用）
│   ├── terrain/
│   │   ├── TerrainMap.js          # 地形地图系统
│   │   └── TerrainLayer.js        # 地形渲染层（未使用）
│   ├── ui/
│   │   ├── BattleJoinDialog.js    # 战斗对话框
│   │   └── PromotionDialog.js     # 晋升对话框
│   └── utils/
│       ├── ObjectPool.js          # 对象池（军队复用）
│       └── OffscreenCanvasCache.js # 离屏Canvas缓存
└── public/
    └── allmapsoft/
        └── downloads/
            └── my_new_task_combined/
                └── my_new_task.jpg # 地图图片
```

### 核心类

#### GameManager (game.js)
游戏主控制器，负责：
- 游戏循环（requestAnimationFrame）
- 时间系统（季节、年份）
- 城市管理
- 军队管理
- 战斗系统
- 历史事件触发
- 渲染调度
- UI更新

**关键方法**:
```javascript
async init()                    // 初始化游戏
loop(timestamp)                 // 游戏主循环
updateSeason(deltaTime)         // 更新季节
checkHistoricalEvents()         // 检查历史事件
spawnArmy(...)                  // 生成军队
startSiege(...)                 // 开始攻城
drawFrame()                     // 渲染一帧
```

#### TerrainMap (src/terrain/TerrainMap.js)
地图系统，负责：
- 地图图片加载
- 坐标转换（经纬度 ↔ 屏幕坐标）
- 地图缩放和平移
- 墨卡托投影

**关键方法**:
```javascript
async load()                           // 加载地图
render()                               // 渲染地图
latLngToScreen(lat, lng)              // 经纬度转屏幕坐标
screenToLatLng(x, y)                  // 屏幕坐标转经纬度
zoomByFactor(factor, focusX, focusY)  // 缩放
```

#### Player (src/player/Player.js)
玩家类，负责：
- 玩家状态管理
- 移动控制
- 兵力恢复
- 功勋和晋升

**关键方法**:
```javascript
moveTo(lat, lng)                      // 移动到目标
update(deltaTime, currentYear, cities) // 更新状态
tryRecoverTroops(year, season)        // 尝试恢复兵力
addMerit(amount)                      // 增加功勋
joinFaction(factionId)                // 加入势力
```

#### NPCManager (src/npc/NPCManager.js)
NPC管理器，负责：
- NPC生成
- NPC移动
- NPC刷新

**关键方法**:
```javascript
spawnInitialNPCs()     // 生成初始NPC
update(deltaTime)      // 更新所有NPC
onNPCDeath(npc)       // NPC死亡处理
onYearChange()        // 年度刷新
```

### 坐标系统

#### 地图范围
```javascript
{
    north: 53.56,   // 北纬53.56° (黑龙江北部)
    south: 18.11,   // 北纬18.11° (海南岛)
    east: 134.77,   // 东经134.77° (东北边境)
    west: 73.33     // 东经73.33° (新疆西部)
}
```

#### 墨卡托投影边界
```javascript
{
    xMin: 7983847.603275299,
    xMax: 14714892.31313095,
    yMin: 2035212.3146309834,
    yMax: 6574654.549337845
}
```

#### 坐标转换流程
```
经纬度 → 墨卡托坐标 → 归一化比例 → 屏幕坐标
                                    ↓
                            应用缩放和平移
```

### 渲染系统

#### 渲染层次（从下到上）
1. **地形底图** - 地图图片
2. **领土区域** - Voronoi图着色（使用缓存）
3. **城市** - 圆点 + 名称 + 兵力
4. **军队** - 移动的方块 + 行军路线
5. **NPC** - 菱形 + 名称 + 兵力
6. **玩家** - 三角形 + 移动路径

#### 性能优化
- **领土缓存**: 只在地图移动/缩放或城市归属变化时重绘
- **视口裁剪**: 只渲染屏幕内的元素
- **对象池**: 军队对象复用，避免频繁创建/销毁
- **节流**: 领土重绘节流（100ms）

### UI系统

#### HUD元素
- **时间显示**: 年份 + 季节
- **速度控制**: 1x/4x/10x/50x按钮
- **玩家信息**: 兵力、功勋、军衔、势力
- **事件通知**: 当前季度事件 + 历史记录

#### 对话框
- **BattleJoinDialog**: 战斗加入确认
- **PromotionDialog**: 晋升通知

#### 交互
- **左键点击**: 选择城市或移动玩家
- **右键点击**: 移动玩家
- **鼠标拖拽**: 平移地图
- **鼠标滚轮**: 缩放地图
- **WASD/方向键**: 平移地图

---

## 当前状态和已知问题

### 已实现功能
✅ 基础地图渲染和交互  
✅ 时间系统（季节、年份）  
✅ 城市系统（20个初始城市）  
✅ 玩家系统（移动、战斗、晋升）  
✅ NPC系统（9种类型，90个NPC）  
✅ 战斗系统（野战、攻城）  
✅ 历史事件系统（季度触发）  
✅ 军衔系统（9个等级）  
✅ 兵力恢复机制  
✅ 领土渲染（Voronoi图）  
✅ 晋升对话框  
✅ 战斗对话框  

### 未实现/待完善功能
❌ 地形系统（海域、山脉、河流等）  
❌ 地形对移动速度的影响  
❌ 地形对战斗的影响  
❌ AI势力行为（目前只有历史事件驱动）  
❌ 外交系统  
❌ 经济系统  
❌ 科技系统  
❌ 更多历史事件  
❌ 存档/读档功能  
❌ 音效和音乐  

### 已知问题
⚠️ 地形系统尝试失败（基于图片像素检测的方案未能正常工作）  
⚠️ 领土边界有时会出现锯齿  
⚠️ 大量军队时可能有性能问题  

### 最近的修改（2024-11-02）
1. 尝试实现基于图片像素的地形检测系统（失败）
2. 回滚所有地形相关代码
3. 清空地形区域数据
4. 确保游戏正常运行

---

## 开发规范和注意事项

### 代码规范
1. **使用ES6+语法**: 类、箭头函数、解构等
2. **模块化**: 每个功能独立文件
3. **命名规范**: 
   - 类名：PascalCase
   - 变量/函数：camelCase
   - 常量：UPPER_SNAKE_CASE
4. **注释**: 关键逻辑必须注释

### 性能考虑
1. **避免每帧重绘**: 使用缓存和脏标记
2. **减少DOM操作**: 批量更新
3. **对象复用**: 使用对象池
4. **视口裁剪**: 只处理可见元素

### 历史事件开发规范
**严格遵守**:
- 不要擅自改变历史事件的结果
- 所有事件结果必须由用户明确指定
- 不清楚时，先询问用户
- 只实现用户明确要求的功能

### 城市添加规范
- **初始城市**: 只在 `gameData.js` 中配置
- **动态城市**: 只在 `historicalEvents.js` 中使用 `spawn_city`
- **禁止**: 在初始城市列表中添加新城市

### 战斗配置规范
**固定规则，不得修改**:
- 野战：10,000 VS 10,000
- 攻城：20,000 VS 10,000

---

## 扩展建议

### 地形系统（待实现）
**推荐方案**:
1. 使用GeoJSON数据（Natural Earth Data）
2. 或使用在线工具手动绘制（geojson.io）
3. 转换为游戏可用的多边形数据

**不推荐**:
- 基于图片像素检测（已尝试失败）
- QGIS（过于复杂）
- Tiled（不适合矢量地图）

### AI系统（待实现）
建议实现：
- 势力扩张逻辑
- 军队调度
- 城市防御
- 外交决策

### 存档系统（待实现）
需要保存：
- 游戏时间
- 城市状态
- 军队状态
- 玩家状态
- NPC状态
- 历史事件记录

---

## 调试和测试

### 控制台命令
游戏运行时可以在控制台使用：
```javascript
// 查看游戏状态
window.game

// 查看玩家状态
window.game.player

// 查看所有城市
window.game.cities

// 查看所有军队
window.game.armies

// 查看所有NPC
window.game.npcManager.getNPCs()

// 修改游戏速度
window.game.setSpeed(3)  // 0-3对应1x/4x/10x/50x
```

### 常见问题排查
1. **玩家无法移动**: 检查 `isPassable` 函数
2. **NPC不刷新**: 检查 `onYearChange` 调用
3. **城市不增长**: 检查 `onYearChange` 中的城市增长逻辑
4. **历史事件不触发**: 检查年份和季节是否匹配
5. **坐标转换错误**: 检查 `screenToLatLng` 返回值格式

---

## 联系和贡献

### 项目维护者
- 用户：GAKU

### 开发历史
- 2024-11-02: 尝试地形系统，回滚，创建项目文档

### 未来计划
1. 实现完整的地形系统
2. 添加更多历史事件
3. 实现AI势力行为
4. 优化性能和用户体验

---

## 附录

### 重要文件清单
- `game.js` - 游戏主逻辑（3600行）
- `src/data/gameData.js` - 基础数据
- `src/data/historicalEvents.js` - 历史事件
- `src/player/Player.js` - 玩家类
- `src/npc/NPCManager.js` - NPC管理
- `src/terrain/TerrainMap.js` - 地图系统

### 关键常量
```javascript
// 时间
SEASON_DURATION_MS = 15000  // 季节时长（毫秒）

// 兵力
INITIAL_TROOPS = 10000      // 城市初始兵力
MAX_TROOPS = 20000          // 城市兵力上限
ANNUAL_GROWTH_MIN = 100     // 年度增长最小值
ANNUAL_GROWTH_MAX = 400     // 年度增长最大值

// 战斗
FIELD_BATTLE_TROOPS = 10000 // 野战兵力
SIEGE_ATTACKER = 20000      // 攻城方兵力
SIEGE_DEFENDER = 10000      // 守城方兵力

// NPC
TOTAL_NPCS = 90             // NPC总数
NPC_SPAWN_DISTANCE = 0.5    // NPC最小间距（度）
```

### 坐标示例
```javascript
// 主要城市坐标
长安: { latitude: 34.34, longitude: 108.94 }
洛阳: { latitude: 34.62, longitude: 112.45 }
临淄: { latitude: 36.82, longitude: 118.05 }
```

---

**文档版本**: 1.0  
**最后更新**: 2024-11-02  
**文档状态**: 完整
