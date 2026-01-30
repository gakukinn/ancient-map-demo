---
title: MAPWAR 下一步详细行动计划
summary: 列出 2025-10-31 后续两日的模块化重构任务拆解与完成顺序。
owner: GAKU
status: completed
last_updated: 2025-10-31
phase: refactor
---
# MAPWAR 下一步详细行动计划

## 📊 当前状态
- ✅ Vite 开发环境已就绪
- ✅ 所有功能测试正常
- ✅ 热重载功能可用
- 📍 **当前位置：准备开始模块化重构**

---

## 🎯 阶段2：模块化重构（预计2天）

### 第1步：转换 TerrainMap 为 ES6 模块（30分钟）

**目标：** 将 `terrain-map.js` 改为标准 ES6 模块

**操作：**
1. 移动 `terrain-map.js` 到 `src/terrain/TerrainMap.js`
2. 移除 IIFE 包装
3. 添加 `export` 语句
4. 更新 `src/main.js` 中的导入

**预期结果：**
```javascript
// src/terrain/TerrainMap.js
export class TerrainMap {
    // ... 现有代码
}
```

**验证：**
- 游戏正常启动
- 地图正常显示
- 无控制台错误

---

### 第2步：转换数据文件为 ES6 模块（30分钟）

**目标：** 将全局变量改为模块导出

**操作：**

#### 2.1 转换 gameData.js
```javascript
// 从：
window.GAME_DATA = { ... }

// 改为：
export const GAME_DATA = { ... }
```

#### 2.2 转换 historicalEvents.js
```javascript
// 从：
window.HISTORICAL_EVENTS = [ ... ]

// 改为：
export const HISTORICAL_EVENTS = [ ... ]
```

#### 2.3 更新所有引用
- 在需要使用的地方添加 `import` 语句
- 移除 `window.` 前缀

**验证：**
- 数据正常加载
- 历史事件正常触发
- 游戏逻辑正常

---

### 第3步：提取渲染器类（2-3小时）

**目标：** 从 `game.js` 中分离渲染逻辑

#### 3.1 创建 MapRenderer.js
**文件：** `src/renderer/MapRenderer.js`

**职责：**
- 地图背景渲染
- 视口管理
- 坐标转换

**提取的方法：**
- `drawFrame()` 的地图部分
- 坐标转换相关方法

#### 3.2 创建 TerritoryRenderer.js
**文件：** `src/renderer/TerritoryRenderer.js`

**职责：**
- 领土着色
- Voronoi 计算
- 边界绘制

**提取的方法：**
- `drawTerritories()`
- `hexToRgb()`
- `addAlpha()`

#### 3.3 创建 CityRenderer.js
**文件：** `src/renderer/CityRenderer.js`

**职责：**
- 城市标记绘制
- 城市名称显示
- 兵力数字显示

**提取的方法：**
- `drawCities()`

#### 3.4 创建 ArmyRenderer.js
**文件：** `src/renderer/ArmyRenderer.js`

**职责：**
- 军队图标绘制
- 移动动画
- 围城标记

**提取的方法：**
- `drawArmies()`

**验证每一步：**
- 渲染效果与之前完全一致
- 性能无明显下降
- 无控制台错误

---

### 第4步：提取游戏系统（2-3小时）

#### 4.1 创建 TimelineManager.js
**文件：** `src/core/TimelineManager.js`

**职责：**
- 时间流逝管理
- 季节切换
- 年份递增

**提取的方法：**
- `advanceTimeline()`
- `incrementYear()`
- `resetTimeline()`

#### 4.2 创建 EventSystem.js
**文件：** `src/core/EventSystem.js`

**职责：**
- 历史事件触发
- 事件条件判断
- 事件结果处理

**提取的方法：**
- `initializeEvents()`
- `checkSeasonEvents()`
- `triggerHistoricalEvent()`

#### 4.3 创建 CombatSystem.js
**文件：** `src/systems/CombatSystem.js`

**职责：**
- 军队生成
- 战斗计算
- 围城处理

**提取的方法：**
- `spawnArmy()`
- `startFieldBattle()`
- `startSiege()`
- `resolveSiege()`

#### 4.4 创建 EconomySystem.js
**文件：** `src/systems/EconomySystem.js`

**职责：**
- 兵力增长
- 资源管理

**提取的方法：**
- `applyAnnualGrowth()`
- `ensureInitialTroops()`

**验证：**
- 所有游戏逻辑正常
- 历史事件正常触发
- 战斗系统正常工作

---

### 第5步：重构 GameManager（2小时）

**目标：** 简化 GameManager，使其成为协调器

**新的 GameManager 职责：**
- 初始化各个系统
- 协调系统间通信
- 管理游戏状态
- 处理用户输入

**文件：** `src/core/GameManager.js`

**结构：**
```javascript
export class GameManager {
    constructor() {
        this.timelineManager = new TimelineManager();
        this.eventSystem = new EventSystem();
        this.combatSystem = new CombatSystem();
        this.economySystem = new EconomySystem();
        
        this.mapRenderer = new MapRenderer();
        this.territoryRenderer = new TerritoryRenderer();
        this.cityRenderer = new CityRenderer();
        this.armyRenderer = new ArmyRenderer();
    }
    
    async init() { /* ... */ }
    loop(timestamp) { /* ... */ }
    // 其他协调方法
}
```

**验证：**
- 完整游戏流程正常
- 所有功能可用
- 代码结构清晰

---

## 🎯 阶段3：性能优化（预计1天）

### 第6步：实现离屏 Canvas 缓存（2小时）

**目标：** 减少重复渲染

**实现：**

#### 6.1 创建 OffscreenCanvas 工具
**文件：** `src/utils/OffscreenCanvas.js`

```javascript
export class OffscreenCanvasCache {
    constructor() {
        this.caches = new Map();
    }
    
    create(key, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        this.caches.set(key, canvas);
        return canvas.getContext('2d');
    }
    
    get(key) {
        return this.caches.get(key);
    }
}
```

#### 6.2 缓存地形图
- 将地形图渲染到离屏 Canvas
- 只在缩放/移动时更新
- 主 Canvas 直接复制离屏 Canvas

#### 6.3 缓存领土层
- 将领土着色渲染到离屏 Canvas
- 只在城市归属变化时更新

**预期提升：**
- 帧率从 30-40 FPS 提升到 55-60 FPS
- CPU 使用率降低 40-50%

---

### 第7步：实现对象池（1小时）

**目标：** 减少 GC 压力

**实现：**

#### 7.1 创建通用对象池
**文件：** `src/utils/ObjectPool.js`

```javascript
export class ObjectPool {
    constructor(factory, reset, initialSize = 10) {
        this.factory = factory;
        this.reset = reset;
        this.pool = [];
        this.active = new Set();
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }
    
    acquire() {
        let obj = this.pool.pop();
        if (!obj) obj = this.factory();
        this.active.add(obj);
        return obj;
    }
    
    release(obj) {
        if (this.active.has(obj)) {
            this.reset(obj);
            this.active.delete(obj);
            this.pool.push(obj);
        }
    }
}
```

#### 7.2 应用到军队对象
- 创建军队对象池
- 军队消失时回收到池中
- 需要新军队时从池中获取

**预期提升：**
- 减少内存分配
- 降低 GC 频率
- 更稳定的帧率

---

### 第8步：优化渲染算法（2小时）

**目标：** 减少不必要的绘制

#### 8.1 实现脏矩形检测
- 只重绘变化的区域
- 跟踪需要更新的对象

#### 8.2 视口裁剪
- 只渲染可见区域内的对象
- 城市和军队超出视口时跳过渲染

#### 8.3 分层渲染
- 静态层：地形（很少更新）
- 半静态层：领土（偶尔更新）
- 动态层：城市、军队（频繁更新）

**预期提升：**
- 大地图场景性能提升 50%
- 支持更多城市和单位

---

## 🎯 阶段4：测试与验证（预计半天）

### 第9步：功能测试（1小时）

**测试清单：**
- [ ] 游戏启动正常
- [ ] 地图显示正常
- [ ] 城市标记正确
- [ ] 开始/暂停功能
- [ ] 速度调节功能
- [ ] 重置功能
- [ ] 地图拖拽
- [ ] 地图缩放
- [ ] 历史事件触发
- [ ] 军队生成
- [ ] 军队移动
- [ ] 围城战斗
- [ ] 城市归属变化
- [ ] 兵力增长
- [ ] 时间流逝
- [ ] 季节切换

### 第10步：性能测试（1小时）

**测试项目：**
- [ ] 帧率测试（目标：稳定 60 FPS）
- [ ] 内存使用（目标：< 50MB）
- [ ] 加载时间（目标：< 1秒）
- [ ] 长时间运行稳定性（30分钟无卡顿）

### 第11步：对比测试（30分钟）

**对比项目：**
- 重构前 vs 重构后
- 功能完整性
- 性能指标
- 代码可读性

---

## 📋 每一步的标准流程

### 开始前
1. 确认当前代码可以正常运行
2. 提交 Git（如果使用版本控制）
3. 阅读要修改的代码

### 实施中
1. 创建新文件
2. 复制相关代码
3. 修改为模块格式
4. 更新导入/导出
5. 测试新模块

### 完成后
1. 运行游戏验证功能
2. 检查控制台无错误
3. 测试相关功能
4. 提交代码（可选）
5. 更新文档进度

---

## ⚠️ 注意事项

### 重构原则
1. **小步快跑**：每次只改一个模块
2. **频繁测试**：每改一处就测试
3. **保持功能**：不改变任何游戏行为
4. **可回滚**：随时可以回到上一步

### 遇到问题时
1. **立即停止**
2. **记录问题**
3. **寻求帮助**
4. **不要猜测**

### 性能优化原则
1. **先测量**：使用 Chrome DevTools
2. **找瓶颈**：确定优化目标
3. **再优化**：针对性改进
4. **后验证**：确认提升效果

---

## 📊 进度跟踪

### 已完成（2025-10-31）
- [x] 阶段1：环境搭建与基础模块化
  - [x] Vite 开发环境
  - [x] TerrainMap ES6 模块化
  - [x] 数据文件 ES6 模块化
  - [x] 修复模块加载顺序问题
  
- [x] 阶段2：GameManager 重构
  - [x] game.js 转换为 ES6 模块
  - [x] 创建并集成 GameRenderer 类
  - [x] 删除冗余代码（减少258行）
  - [x] 功能验证通过

### 待开始
  - [ ] 步骤1：转换 TerrainMap
  - [ ] 步骤2：转换数据文件
  - [ ] 步骤3：提取渲染器
  - [ ] 步骤4：提取游戏系统
  - [ ] 步骤5：重构 GameManager

### 待开始
- [ ] 阶段3：性能优化
  - [ ] 步骤6：离屏 Canvas
  - [ ] 步骤7：对象池
  - [ ] 步骤8：渲染优化

- [ ] 阶段4：测试验证
  - [ ] 步骤9：功能测试
  - [ ] 步骤10：性能测试
  - [ ] 步骤11：对比测试

---

## 🎯 下一步行动

**立即开始：步骤1 - 转换 TerrainMap 为 ES6 模块**

预计时间：30分钟
风险等级：低
优先级：高

准备好了吗？告诉我，我会立即开始！

---

*文档创建时间：2025-10-31 17:10*
*预计总完成时间：3-4天*
*当前进度：15% 完成*
