# MAPWAR - 历史地理仿真沙盒 (Historical Geospatial Sandbox Simulator)

> **核心定位**: 2D 世界地形模拟器 | 伪直播架构 (Pseudo-Live) | 指令驱动 (Instruction Driven)

MAPWAR 不仅仅是一个游戏，而是一个**"世界地形模拟器"**。它致力于通过极简的指令流，在客户端还原宏大的历史地理变迁。

## 1. 核心哲学 (Core Philosophy)

###  沙盒模拟 (Sandbox Simulation)
*   **非游戏 (Not a Game)**: 我们不追求RTS的微操快感，而是追求《文明》式的宏观历史推演。
*   **视觉风格**: 2D 策略风格 (Civ-like)，专注于地形、国界与战略态势的可视化。

###  伪直播架构 (Pseudo-Live Architecture)
*   **挑战**: 如何用最低成本实现全球观众同步？
*   **解决方案**: **指令驱动 (Log-Driven)**。
    *   **服务器**: 不传输实时画面/位置帧，只广播 **"指令序列"** (如 `Year:202, Faction:Han, Action:Sortie(Target:Xuzhou)`)。
    *   **客户端**: 仅仅是一个**"播放器"**。接收指令后，基于确定性的本地逻辑（A*寻路、战斗公式）重现画面。
    *   **优势**: 极大降低带宽（文本流 vs 视频流），单台低配 VPS 即可支撑全球同步。

### 🤖 都城中心制 AI (Capital-Centric AI)
为了配合"指令驱动"架构，我们采用了极简的 AI 模型：
*   **单一都城 (Single Capital)**: 每个势力拥有一个逻辑核心。
*   **出征模式 (Sortie Mode)**: 军队平时**驻扎（隐藏）**在都城。只有当收到攻击指令时，才作为一次"事件"被生成，执行完任务即解散或回城。
*   **价值**: 这种设计消除了海量的"漫游状态"同步需求，让每一条指令都清晰明确。

## 2. 技术架构 (Technical Architecture)

### 🗺️ 全球地形 (Global Terrain)
*   **无缝滚动**: 基于 `GameMap.ts` 的无边界设计，地形本身即为全球无缝。
*   **GIS 渲染**: 实时读取 Terrarium 高度数据，通过 `HillshadeLayer` 进行高性能 GPU 渲染（内联数学优化）。

### ⚔️ 战斗演化 (Combat Evolution)
*   **微观表现**: 虽然宏观上是指令，但微观上仍保留了细腻的兵棋战斗（冲锋、插空站位、侧翼包抄）。
*   **确定性**: 所有的战斗结果由数值和逻辑决定，确保所有客户端看到的"演出"是一致的。



## 📁 项目结构

```
MAPWAR/
├── src/
│   ├── core/                    # 核心游戏逻辑
│   │   ├── Army.ts              # 军队类
│   │   ├── Player.ts            # 玩家类
│   │   ├── CombatSystem.ts      # 战斗系统
│   │   ├── CityManager.ts       # 城市管理
│   │   ├── NPCManager.ts        # NPC管理
│   │   ├── FactionManager.ts    # 势力管理
│   │   ├── HistoricalEventManager.ts  # 历史事件协调器
│   │   ├── SiegeManager.ts      # 攻城战管理 [Updated: 增援逻辑]
│   │   ├── FieldBattleManager.ts # 野战管理 [Updated: 驻扎逻辑]
│   │   ├── LegionManager.ts     # 军团管理
│   │   ├── EventVisualizer.ts   # 事件视觉效果
│   │   ├── HistoricalEvents.ts  # 历史事件数据
│   │   ├── TimeSystem.ts        # 时间系统
│   │   ├── FormationSystem.ts   # 阵型系统
│   │   └── TerrainSpeedSystem.ts # 地形速度系统
│   ├── map/                     # 地图渲染
│   │   ├── GameMap.ts           # 地图封装
│   │   ├── UnitRenderer.ts      # 单位渲染器（Army）
│   │   ├── LegionRenderer.ts    # 玩家渲染器
│   │   └── SpeedOverlayRenderer.ts  # 地形速度可视化
│   ├── systems/                 # 系统模块
│   │   └── GridSystem.ts        # 六边形网格系统
│   ├── types/                   # TypeScript类型定义
│   │   └── core.ts              # 核心类型
│   ├── ui/                      # UI组件
│   └── main.ts                  # 入口文件
├── public/
├── index.html
├── package.json
├── .cursorrules                 # AI 开发规范 [New]
└── vite.config.ts
```

## 🏗️ 系统架构

### 核心系统

## 3. 系统模块 (System Modules)

### 核心系统 (Core Systems)

#### 1. 军团与单位系统 (Legions & Units)
项目有四大战斗单位：玩家、部队、盗贼、城市。
*   **城市 (City)**: 静态据点，拥有固定坐标、势力归属和驻军。城市是兵力的来源。
*   **军团 (Legion)**: 移动战斗单位。在"都城中心制"下，军团平时驻扎在都城，仅在执行指令时生成。
*   **征兵机制**: 军团创建时从同阵营城市抽调兵力，城市保留基本守备军。

#### 2. 宏观战略战斗 (Grand Strategy Combat)
*   基于 Zoom 9 级别的宏观战略。
*   无微操，通过 UI 面板和自动化逻辑推进战斗（先登 -> 陷阵 -> 斩将 -> 夺旗）。

#### 3. 视图与网格 (Map & Grid)
*   1个六边形(Hex) ≈ 15-20公里。
*   城市是一个逻辑点，无"关内/关外"物理区分。
*   **作战单位**: 
  - 最小作战单位为**军团 (Legion)**（万人级），而非单兵。

#### 4. 势力 (Factions)
包含几个历史势力（华夏、中华、天朝，满洲等）。


### 管理器系统

| 管理器 | 文件 | 职责 |
|--------|------|------|
| **HistoricalEventManager** | `src/core/HistoricalEventManager.ts` | 历史事件总协调，分发任务给子管理器 |
| **SiegeManager** | `src/core/SiegeManager.ts` | 攻城战逻辑、**防御增援调度**、胜负结算 |
| **FieldBattleManager** | `src/core/FieldBattleManager.ts` | 野战逻辑、**战后回防驻扎** |
| **LegionManager** | `src/core/LegionManager.ts` | 军团(Army)统一管理、复用、状态维护 |
| **CityManager** | `src/core/CityManager.ts` | 城市管理、领土计算 |



### UI控制
- **G键**: 开关地形速度网格显示（基于 GridSystem）
- **事件编辑器**: 📝按钮打开历史事件编辑器

## 📄 许可证

# 帝国地图战争：推演系统分析报告

## 1. 概述
当前版本是一个基于地理地图的实时历史战略系统。核心循环包括时间推进、实体移动军团）系统驱动的战斗遭遇（攻城/野战）。

--

## 2. 基础运行与稳定性
**状态**：**稳定性已优化**

### ✅ 运行良好
- **核心循环**：`GameApp.ts` 可靠地管理生命周期和时间更新。
- **渲染引擎**：`HillshadeLayer` 经过数学内联优化，极大提升了渲染帧率。
- **数据完整性**：`FactionManager` 和 `CityManager` 正确处理静态数据加载。
- **事件系统**：`HistoricalEventManager` 已修复 ID 冲突问题，并支持状态持久化。

### ⚠️ 潜在关注点
1.  **逻辑中的魔法数字**：
    -   尽管大部分已迁移至 `GameConfig.ts`，仍需持续关注新代码中是否引入硬编码数值。

---

## 3. 系统分析

### 3.1 地图与网格系统
- **核心组件**：
  - `GameMap.ts`: 地图主控制器，负责图层管理和交互。
  - `StrategicGridLayer.ts`: 绘制六边形网格和坐标系统。
  - **`HillshadeLayer.ts` (高性能程序化地形)**: 
    > [!IMPORTANT]
    > **核心技术**：本项目采用 **100% 程序化地形渲染 (Procedural Generation)**。
    > - **极致性能**：采用 ASM.js 风格的数学内联优化（Math Inlining）与分支预测优化（Branch Prediction Optimization），不仅移除了对图片瓦片的依赖，更将每像素的渲染开销降至最低。
    > - **视觉**：通过读取 AWS Terrarium 高度数据，实时演算精密的山体阴影、环境光遮蔽 (AO) 和动态海拔着色。
  - `TerritorySystem.ts`: 基于 SVG 滤镜的动态领土渲染系统。

### 3.2 逻辑合理性
**状态**：**已标准化**



---

## 4. 推演平衡
**状态**：**确定性且偏向街机风格**

### 观察
-   **战斗**：使用确定性模型（类似兰彻斯特方程）。
    -   **优点**：节奏可预测。
    -   **缺点**：缺乏以少胜多的“英雄”时刻（侧翼包抄纯粹是视觉效果）。

-   **兵力限制**：
    -   野战上限为 10,000 兵力。
    -   这简化了性能，但对于“史诗”战争来说可能感觉规模较小。

---

## 5. 建议（维护阶段）

为了达成“基础优先，不添加新功能”的目标，我建议进行以下严格的修复：

1.  **持续监控**：关注长游戏时间下的内存占用。
2.  **无新内容**：继续保持“不添加新功能”的原则，专注于代码质量与文档。

---

## 6. ✅ 近期系统优化 (Recent Optimizations)

为提升系统稳定性与逻辑一致性，已完成以下核心优化：

1.  **渲架性能大幅提升 (Rendering Performance)**:
    -   **HillshadeLayer 重构**: 对核心地形渲染循环进行了深度优化。
        -   **内联数学运算**: 将每像素必须的 9 次高度获取函数调用全部展开为内联数学公式，消除了数百万次函数调用开销。
        -   **路径分离**: 将“彩色地形”与“灰度地形”拆分为两个独立的渲染循环，移除了循环内部的条件分支判断。
    -   **效果**: 显著减少了拖动地图时的掉帧现象，提升了渲染流畅度。

2.  **修复历史事件冲突 Bug (Fixed Event Conflicts)**:
    -   **问题**: 旧系统使用 `年份_季节_类型` 作为唯一键，导致同一季节发生多个同类事件时（如多场攻城战），后续事件会被系统忽略。
    -   **解决**: 实现了确定性事件 ID 生成 (`Stable ID Generation`)。系统现在根据事件文件中的索引生成唯一 ID，确保所有并发事件都能被正确触发和追踪。

3.  **统一战斗与参战逻辑 (Unified Combat Logic)**:
    -   **问题**: 攻城战 (`Siege`) 与野战 (`Field Battle`) 自动寻路距离判断逻辑分散且不一致。
    -   **解决**: 创建了 `CombatUtils.checkPlayerParticipation` 统一接口。
    -   **效果**: 无论战斗类型如何，系统现在使用统一的距离

4.  **配置集中化 (Centralized Configuration)**:
    -   消除多处“魔法数字”（如 `9999` 自动加入距离），统一移至 `GameConfig.ts` 进行管理，提升代码可维护性。

5.  **数据持久化 (Data Persistence)**:
    -   **功能**: `HistoricalEventManager` 现在会自动将已触发的历史事件状态保存到本地存储 (`localStorage`)。
    -   **效果**: 即使页面刷新或重新加载，系统也会记住哪些历史事件已经发生过，防止重复触发。

---

## 7. 🎨 视觉技术文档

### 动态 SVG 领土光晕 (Dynamic SVG Territory Glow)

为了在保持高性能的同时实现柔和的势力边界，`TerritorySystem` 采用了混合渲染技术：

1.  **几何合并**: 使用算法将相邻的同势力六边形合并为单一的多边形路径，极大减少了 DOM 节点数量。
2.  **SVG 滤镜**: 利用 SVG `<filter>` 实现高性能的内/外发光效果（Inner/Outer Glow），替代了昂贵的 Canvas 逐像素模糊计算。
    -   这允许在地图缩放时保持边界的平滑与光晕的稳定，同时利用 GPU 加速渲染。

### 内向型光晕彩带 (Inward Glow Ribbons) - Zoom 9

为了在宏观战略视角 (Zoom 9) 实现"仅在国家交界处向内发光"的各种苛刻视觉要求，系统采用了一套混合几何算法：

1.  **Shared Border Detection**: 在 `renderFactionBorders` 中，系统会逐段检测六边形边界。仅当邻居 Hex 属于不同势力（且非空地）时，该边界被标记为"Shared Border"。
2.  **Ribbon Geometry Generation**: 针对每一段 Shared Border，算法会自动计算指向六边形中心的向量，生成一个向内延伸 20%-25% 的四边形带 (Ribbon Quad)。
3.  **Layering & Blur**:
    - 这些 Ribbon Quads 被合并渲染在黑色国界线图层**下方**。
    - 通过 CSS `.glow-ribbon` 类应用高斯模糊 (`filter: blur(4px)`)。
    - 结果：黑色边界线保持锐利，而光晕仅在边界内侧柔和晕开，且物理上严格限制在领土内部，绝无外溢。

---

## 8. 🗺️ 领土系统 (Territory System)

### 5级城市分类 (5-Category City Classification)

领土范围基于城市类型自动判定，采用关键字匹配规则：

| 类别 | 关键字匹配 | 领土圈数 | 说明 |
|------|-----------|---------|------|

| **大** | `huge` | 3圈 | 大城 |
| **中** | `large`, `medium`, 或含`city`但不含`small` | 2圈 | 中城 |
| **关** | `pass`, `fortress`, `ranch`, `guan` | 1圈 | 关隘、要塞 |
| **小** | 其他所有 | 1圈 | 小城 |
渡口，1圈

### 双模式领土扩展 (Dual-Mode Territory Expansion)

系统采用"核心圈 + 道路连接"的双模式扩展逻辑：

1. **核心领土 (Core Territory)**
   - 严格限制在城市中心的物理距离内
   - 使用 BFS 算法计算，每格消耗成本 1.0
   - **硬性物理距离检查**：无论路径成本多低，草地格子超出圈数限制一律不可占领

2. **道路连接 (Road Connectivity)**
   - 道路格子成本极低（0.05），可无限延伸
   - 城市可"无线连接"5格内的最近道路
   - **绝缘机制**：在核心圈外的道路上时，禁止向任何草地扩展，保持道路势力线细长

3. **优先权规则 (Priority Rules)**
   - 物理距离优先于路径成本
   - 第1圈绝对优先 → 第2圈 → 第3圈 → 道路
   - 防止远距离城市通过道路"抢夺"近距离城市的核心领土

### 配置位置
- 分类逻辑：`src/systems/TerritorySystem.ts` (第158-186行)
- 道路数据：`src/data/RoadData.ts`

---

## 9. ⚔️ 单位与阵型系统 (Unit & Formation System) - [2026-01-16 Update]

### 动态资源架构 (Dynamic Asset Architecture)

系统现已支持基于配置的三级资源加载 (`Primary` / `Secondary` / `Tertiary`)，实现了对复杂混合兵种的精细化表现。
- **智能回退 (Smart Fallback)**: 资源加载遵循 `特定阵营ID` -> `通用类型ID` -> `默认ID` 的回退链，确保越南、朝鲜等无独立模组的势力也能正确显示通用阵型与阵营染色。

### 阵型规范 (Formation Standards)

| 兵种类型 | 布局结构 | 数量限制 | 资源构成 |
| :--- | :--- | :--- | :--- |
| **步兵 (Infantry)** | **3x3 方阵** | 9人 | 前两排主武器(近战)，**仅第3排**使用副武器(弓/弩)。 |
| **骑兵 (Cavalry)** | **1-2-3 楔形** | 6人 | 全员主武器。剔除多余单位，强化冲击感。 |
| **混合 (Mixed)** | **2-3-2 六边形** | 7人 | **前排(2)**: 步兵 (Primary)<br>**中排(3)**: 骑兵 (Secondary)<br>**后排(2)**: 远程 (Tertiary) |

### 阵营差异化 (Faction Differentiation)

为了体现历史特色，系统在底层实现了基于阵营的自动资源映射：

1.  **华夏 (Huaxia - 秦)**:
    *   **特色**: 独占 **弩兵 (Crossbows)**。
    *   **表现**: 步兵方阵后排、混合阵型后排均装备弩。

2.  **中华及其他 (Zhonghua & Others)**:
    *   **特色**: 标准化 **弓兵 (Archers)**。
    *   **自动映射**: 所有非华夏势力的 Mixed 单位，系统会自动将其资源 ID 重定向至 `zhonghua_mixed`。这意味着楚、汉、匈奴等势力的步骑混合阵型，均会自动采用“步-骑-弓”的配置。

### 视觉平衡 (Visual Balancing)

*   **差异化缩放**:
    *   **近战单位 (Melee)**: 统一放大至 **1.2x** (120%)，增强重量感与压迫感。
    *   **远程单位 (Ranged)**: 统一调整为 **0.9x** (90%)，构建清晰的视觉层级。
*   **比例自适应**: 渲染管线现已支持动态宽高比，在统一 **100px 基准高度** 的前提下，完美保留原始素材(S10DB/NPC)的胖瘦体型差异。

### 战斗动画技术 (Combat Animation Tech) [2026-01-16 Update]

系统引入了高度风格化的微观战斗动画，以增强宏观推演的生动性：

1.  **智能空隙填充 (Smart Gap Filling)**:
    *   **动态阵列**: 步兵接战时，由于前排单位不会移动，**第二排**单位会自动寻找前排间隙进行插入。
    *   **插空逻辑**: 左翼(Index 3)插入左侧空隙，右翼(Index 5)插入右侧空隙，中军主将(Index 4)保持不动。这种错位站位模拟了真实的密集方阵交战线。
    *   **防重叠**: 这种“插空”而非“重叠”的算法，在保持视觉密度的同时，避免了贴图穿模。

2.  **动态冲锋 (Dynamic Charge)**:
    *   **骑兵突刺**: 骑兵单位不再只是平移，而是基于 `Math.sin` 曲线执行周期性的前向突刺 (Surge)。
    *   **矢量对齐**: 冲锋方向通过 `(阵型角度 - 90°)` 动态计算，确保无论军团朝向何方，骑兵始终沿着马头方向发起冲击。
    *   **相位离散**: 每个骑兵拥有独立的动画相位偏移 (Phase Offset)，避免了机械的同步摆动。

3.  **位置抖动 (Micro Jitter)**:
    *   战斗状态下，所有单位都会叠加高频的随机位置抖动 (+/- 8px)，模拟战场上的混乱与厮杀感。

4.  **视觉对齐与平衡 (Alignment & Balance)**:
    *   **脚底锚点**: 渲染锚点从“膝盖(0.65)”修正为“脚底(0.90)”，确保无论单位缩放比例如何，所有士兵的脚底绝对水平对齐。
    *   **差异化缩放**: 针对不同素材源（如巨大的弩兵与较小的步兵），系统底层应用了 **差异化缩放 (1.2x vs 0.9x)**，确保最终呈现的视觉大小一致。

### 将领可视化 (General Visualization)

为了突出英雄单位在战场上的存在感，渲染器实现了自动化的将领替换逻辑：

*   **自动识别**: 当渲染军团时，系统会自动激活将领图层。
*   **阵位替换**:
    *   **步兵 (3x3)**: 替换正中心单位 (Index 4)。
    *   **骑兵 (Wedge)**: 替换三角形锋矢位置 (Index 0)。
    *   **混合 (Hex)**: 替换中军核心位置 (Index 3)。
*   **独立资源**: 将领拥有独立的 S10DB 动作模组 (ID 240-279)，支持全套移动、攻击、受击动画。

### 纯正染色技术 (True Color Tinting) [2026-01-16 Update]

为了解决原始素材蓝色底色干扰阵营染色的问题 (如 蓝底+红染=紫色)，渲染层重构了 `SpriteTinter` 算法：

*   **去色底 (Desaturation)**: 算法不再进行简单的 RGB 混合，而是先提取原始像素的 **亮度信息 (Luminance/Grayscale)**。
*   **重着色 (Re-Coloring)**: 基于提取的灰度值与目标阵营色进行混合。
    *   **公式**: `Pixel = Brightness * (1 - Intensity) + TargetColor * Intensity`
    *   **结果**: 彻底消除了素材底色干扰，实现了 **"红即是红 (Red is Red)"** 的纯正色彩表现，同时保留了原始素材的光影立体感。

---

## 10. 🏰 攻城定位系统 (Siege Positioning System) - [2026-01-22 Update]

### 核心问题与解决方案

在六边形地图中，军队不能与城市重叠在同一个格子里。因此当军队发起攻城战时，需要将其定位到城市的**相邻六边形**上。

#### 原始问题
之前的实现存在"军队乱跳"的 Bug：军队从道路行军过来，攻城战开始后却被移动到完全错误的位置（如对面方向）。

#### 问题根因
经过深入排查，发现问题出在**两处代码同时尝试定位军队**：

1. **`LegionManager.triggerSiege`**：碰撞检测触发攻城时，会尝试将军队移动到相邻格。
2. **`SiegeManager.onArmyArrive`**：攻城逻辑开始时，再次尝试定位军队。

更关键的是，碰撞检测的流程会**先回滚军队位置**：
```
军队尝试进入城市格 → 碰撞失败 → 位置回滚到道路格子 → 触发攻城
```

所以当攻城逻辑运行时，军队**已经在正确的道路格子上**了！但旧代码假设军队在城市格子内，试图把它"移出来"，导致了混乱。

### 修复方案

**核心原则：军队通过道路碰撞触发攻城时，已经在正确的位置上，不需要移动！**

新逻辑（`SiegeManager.onArmyArrive`）：

```typescript
// Step 1: 获取军队当前实际位置
const armyHex = GridSystem.latLngToAxial(army.getPosition());

// Step 2: 检查是否已经在城市的相邻格
const isAlreadyAdjacent = adjacentHexes.some(h => h.q === armyHex.q && h.r === armyHex.r);

if (isAlreadyAdjacent) {
    // ✅ 已在正确位置 → 只需吸附到格子中心，设置朝向
    army.setPosition(hexCenter);
    army.lastDirection = OrientationSystem.get8DirectionIndex(hexCenter, cityPos);
} else {
    // ⚠️ 不在相邻格（异常情况）→ 寻找最近空位并移动
    // ...
}
```

### 配置位置
- 定位逻辑：`src/core/SiegeManager.ts` (第405-470行)
- 碰撞检测：`src/core/LegionManager.ts` (第272-400行)

### 设计要点

1. **单一定位点**：所有攻城定位逻辑统一在 `SiegeManager.onArmyArrive` 处理，`LegionManager.triggerSiege` 不再进行任何位置操作。
2. **状态检查优先**：先判断军队当前状态，而非盲目执行移动。
3. **朝向自动计算**：使用 `OrientationSystem.get8DirectionIndex` 确保军队面向城市。


## 11. 🌏 地形识别技术 (Terrain Identification Tech) - [2026-01-23 Update]

### 极速全图扫描 (Tile-First Architecture)

为了自动识别游戏中的陆地与海洋（用于决定单位通行权），系统实施了一套基于 **"Tile-First"（瓦片优先）** 架构的扫描方案，成功将 100,000+ 六边形的识别时间从 5分钟+ 降低至 **20秒**。

#### 1. 核心挑战

传统的扫描方法是 **Hex-Centric**（六边形中心）：
1. 遍历每个六边形（10万+）。
2. 计算其中心经纬度。
3. 发起一次网络请求（或调用 `getImageData`）获取该点海拔。
4. **问题**：即使有缓存，10万次异步 Promise 调用和上下文切换也会导致巨大的 CPU 开销和 Event Loop 阻塞。

#### 2. 解决方案：Tile-First 架构

新架构将流程反转：

1. **预计算瓦片需求 (Pre-calculation)**:
   - 首先遍历所有目标六边形，计算出它们总共覆盖了哪些唯一瓦片（Unique Tiles）。
   - 在 Zoom 7 下，全球范围仅需约 1000-2000 张瓦片。

2. **批量并行下载 (Batch Prefetch)**:
   - 使用 `Promise.all` 并发下载所有唯一瓦片（并发数 50）。
   - 将瓦片绘制到离屏 Canvas 并提取 `ImageData` 存入内存 Map。
   - **优势**：网络请求次数从 100,000 次降低到 1,000 次。

3. **同步内存查表 (Synchronous Lookup)**:
   - 瓦片就绪后，再次遍历所有六边形。
   - 此时所有数据均在内存中，直接通过数组索引读取像素值（`imageData.data[idx]`）。
   - **优势**：消除了所有异步等待，处理速度达到微秒级。

#### 3. 数据源与算法

*   **数据源**: Amazon S3 Terrarium Elevation Tiles
    *   URL: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
*   **海拔解码**:
    *   公式: `Elevation = (R * 256 + G + B / 256) - 32768`
*   **判定规则**:
    *   `Elevation > 0`: **陆地 (LAND)** -> 绿色
    *   `Elevation <= 0`: **海洋 (OCEAN)** -> 深蓝色
    *   **范围外处理**: 用户指定的矩形范围（Lat 0-60, Lng -19-146）之外的所有六边形，无论海拔如何，一律强制标记为 **海洋**（不可通行）。

#### 4. 性能数据

| 指标 | 旧方案 (Hex-Centric) | 新方案 (Tile-First) | 提升 |
| :--- | :--- | :--- | :--- |
| **网络请求** | 100,000+ (逻辑上) | ~1,500 (物理上) | **~60x** |
| **总耗时** | 300秒+ | **20-30秒** | **~10x** |
| **内存开销** | 高 (大量Promise对象) | 中 (ImageData缓存) | 稳定 |

### 配置位置
- 瓦片采样：`src/map/MapColorSampler.ts`


## 12. 🚫 性能优化 (Performance Optimization) - [2026-01-24 Update]

### 优先队列与时间分片 (Priority Queue & Time Slicing)

为了彻底解决大规模领土计算（如攻陷大城）导致的 **1000ms+ 主线程卡顿**，`TerritorySystem` 实施了两项核心优化：

#### 1. 全局 Dijkstra 算法 (Global Dijkstra)
*   **旧方案**: 轮询式 BFS (`Round-Robin BFS`)。每轮循环都要遍历所有 300+ 个候选城市，寻找当前成本最低的扩展点。复杂度高达 `O(Hexes * Cities)`。
*   **新方案**: **基于优先队列的 Dijkstra**。
    *   引入了 `src/utils/PriorityQueue.ts` (Min-Heap)。
    *   所有城市的扩张前沿（Frontier）统一放入一个全局堆中。
    *   每次仅需 O(1) 取出全局最优解，将复杂度降低至 `O(Hexes * log(Frontier))`。

#### 2. 严格时间分片 (Strict Time Slicing)
*   **问题**: 即使算法优化了，一次性计算数千个格子的归属权仍可能耗时 50-100ms，导致掉帧。
*   **解决**: 引入 `performance.now()` 精确计时。
    *   在 Dijkstra 的 `while` 循环内部，每一步都检查当前帧耗时。
    *   一旦超过 **12ms** (预留 4ms 给渲染)，立即 `ensure requestAnimationFrame` 挂起当前任务，将剩余计算推迟到下一帧。
*   **效果**: 领土变更不再是“瞬间卡顿后刷新”，而是平滑地在 2-3 帧内“流式”展开，彻底消除了长帧卡顿。

### 核心代码
- 领土算法：`src/systems/TerritorySystem.ts` -> `update()`
- 优先队列：`src/utils/PriorityQueue.ts`

## 13. 🛡️ 禁卫军团与单位视觉优化 (Xiyang Legion & Visual Polish) - [2026-01-26 Update]

### 禁卫军团 (Xiyang Legion) 定制化
针对特殊的禁卫军团（XP001），实现了完全自定义的渲染逻辑：

1.  **特殊队形 (Custom Formation)**:
    -   **一字长蛇阵 (Single Row)**: 摒弃了传统的 3x3 或楔形阵，实现了 5 人一排的横向布局。
    -   **对称布局**: 以旗手 (Index 1) 为中心 (0,0)，左右各分布两名卫兵。
        -   Index 4 (-2x) | Index 0 (-1x) | **Index 1 (Flag)** | Index 2 (+1x) | Index 3 (+2x)

2.  **逻辑修正 (Logic Fixes)**:
    -   **缓存屏蔽**: 强制禁用 `offsetCache`，防止系统沿用旧的默认位置数据导致重叠。
    -   **补位豁免**: 从 `LegionPhalanxDrawer` 的步兵自动补位逻辑（Crowding）中剔除，防止最外侧单位被强行拉回中间填补缝隙。

### 视觉缩放统一 (Scale Standardization)
解决了不同素材源带来的视觉大小差异问题：

-   **突厥骑兵 (Tujue Cavalry)**: 原素材偏小。目前缩放比例维持在 **1.2x** 
代码里有一句 if (name.includes('e_')) scale = 0.9 （本来是给“鄂军 e_infantry”用的）。 结果 tujue_cavalry 这个名字里刚好藏了一个 e_ (tujue_cavalry)！ 就是这个 Bug 把突厥骑兵强行缩小成了 0.9。彻底修复 Bug：把那个判断改成了“必须以 e_ 开头”，这样突厥就不会躺枪了。
-   **混合缩放**: 确保前后排单位在应用不同素材（如前排S8YD vs 后排S8GJ）时，最终呈现的头部高度基本持平。

## 14. 区域划分与地理规范 (Region Partitions & Geospatial Specs) - [2026-01-27 Update]

系统采用严格的**经纬度方盒子 (Coordinate Box)** 逻辑替代了旧的多边形判定，实现了 18 个区域的无死角覆盖与确定的视觉分化。

### 核心区域概览 (18 Regions)

| 区域 ID | 中文名 | 路面风格 | 地理范围 (Approx.) |
| :--- | :--- | :--- | :--- |
| **SIBERIA** | 极北 | **雪路** | > 50°N 全球范围 |
| **NORTHEAST**| 东北 | **雪路** | > 40°N 且 > 123°E |
| **TIBET** | 西藏 | **雪路** | 29°N-36°N, 78°E-101°E (强制特例) |
| **NOMADIC** | 塞外 | **草原** | 41°N-50°N 且 <= 123°E (剔除西域部分) |
| **WESTERN** | 西域 | **黄路** | 36°N-44°N 且 <= 93°E |
| **NORTHWEST**| 西北 | **黄路** | 36°N-41°N, 93°E-108°E (含天水) |
| **NORTH** | 北方 | **黄路** | 36°N-41°N, 108°E-123°E |
| **CENTRAL** | 中原 | **土路** | 32°N-36°N, 108°E-123°E (含汉中扩展) |
| **KOREA** | 朝鲜 | **土路** | 33°N-40°N, 123°E-129.5°E |
| **JAPAN** | 日本 | **土路** | <= 40°N 且 > 129.5°E |
| **CHU_SHU** | 楚蜀 | **泥路** | <= 32°N, 101°E-111°E (云贵川) |
| **SOUTH** | 南方 | **泥路** | 26°N-32°N, 111°E-123°E (江南) |
| **LINGNAN** | 岭南 | **泥路** | < 26°N 且 > 105°E |
| **TROPICS** | 热带 | **泥路** | < 19°N 全球范围 |
| **WEST_WORLD**| 西方 | **土路** | < 60°E |
| **CENTRAL_WORLD**| 中亚 | **黄路** | 60°E-97°E (温带区) |
| **SOUTH_HEMISPHERE**| 南半球 | **默认** | < 0° (纬度) |
| **NEW_WORLD** | 新大陆 | **默认** | > 170°E 或 < -30°E |

### 判定逻辑优先级 (Decision Logic)

判定函数 `RegionSystem.getRegion` 严格按以下顺序执行，确保特例优先：

1.  **全球滤镜**: 优先判定南半球、极北(>50N)和热带(<19N)。
2.  **强制特例箱 (User Boxes)**: 判定 **西藏** 和 **日本**（此时日本定位在 123E 以东）。
3.  **西域优先 (Western Special)**: 判定 **93E 以西** 的西域区，防止其被草原带错误切割。
4.  **塞外草原带 (Steppe Band)**: 判定 **41N-50N** 且在 **123E 以西** 的所有区域为草原。
5.  **经度大分割**:
    - **西方/中亚世界**: 处理 97E 以西的非特例区域。
    - **东亚核心区**: 
        - **东北/朝鲜**: 以 40N 指标线在 123E 以东切分。
        - **西北**: 34N-41N 之间的黄土区域。
        - **北方/中原**: 采用密集堆叠规则，含**汉中 (106-108E)** 的文化归属修正。
        - **南方/岭南/楚蜀**: 采用“岭南优先”原则，确保云贵川逻辑不干扰两广沿海判定。

### 技术实现
- **文件**: `src/systems/RegionSystem.ts`
- **机制**: 实时经纬度映射，无多边形计算开销，支持 10FPS 以上的动态刷新。

## 15. 常见问题 (Troubleshooting) - [2026-01-27 Update]

### 道路不可见问题 (Invisible Roads)
如果您在 `src/data/RoadData.ts` 中添加了新的道路坐标，刷新页面后却无法显示，请检查以下两点：

1.  **数据位置错误 (Wrong Array)**:
    *   **现象**: 坐标数据位于文件**最末尾**。
    *   **原因**: `RoadData.ts` 文件末尾定义了一个 `DISABLED_ROADS_DATA`（禁用道路）数组。如果您直接在文件底部的 `];` 前插入数据，实际上是将道路加入了禁用列表。
    *   **解决**: 请确保将新数据添加到文件上方的 **`CUSTOM_ROADS_DATA`** 数组中（约第 3300 行附近）。

2.  **区域纹理缺失 (Missing Texture)**:
    *   确保该区域（如 `NOMADIC` / `SIBERIA`）在 `RoadLayer.ts` 中有对应的纹理映射。
