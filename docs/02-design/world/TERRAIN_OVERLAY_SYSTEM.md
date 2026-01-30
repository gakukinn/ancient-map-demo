---
title: 地形通行层系统 - Zoom 9核心优化版
summary: 介绍地图通行遮罩的像素分类方案、渲染流程以及 Zoom 9 性能优化策略。
owner: GAKU
status: active
last_updated: 2025-11-06
phase: production
---
# 地形通行层系统 - Zoom 9核心优化版

## 📋 概述

MAPWAR地形通行层系统通过像素颜色分析自动识别三种地形通行方式：**不通**（海洋）、**慢通**（山地）、**平通**（平原）。

**核心优化**：以Zoom 9为核心缩放级别，提供最高精度的地形显示。

## 🎯 三色分类系统

### 1. 🌊 海洋 - 不可通行
- **颜色**：鲜艳蓝色 `rgba(59, 130, 246, 0.6)`
- **通行性**：0% 速度，完全不可通行
- **识别规则**：
  - 蓝色值 ≥ 170
  - 蓝色显著大于红色 (b - r ≥ 40)
  - 深海：纯蓝色 (g ≥ 140, b ≥ 180)
  - 浅海：蓝绿色 (b ≥ 170, g ≥ 150)

### 2. ⛰️ 山地 - 慢速通行
- **颜色**：深棕色 `rgba(161, 98, 7, 0.5)`
- **通行性**：30% 速度，行军困难
- **识别规则**：
  - 不是海洋且不是平原的区域
  - 包括：暗色山脉、沙漠、冰雪等

### 3. 🌾 平原 - 平速通行
- **颜色**：翠绿色 `rgba(34, 197, 94, 0.35)`
- **通行性**：100% 速度，快速移动
- **识别规则**：
  - 亮绿色：亮度 ≥ 190, 绿色 ≥ 190, 绿色突出 ≥ 10
  - 中等绿色：亮度 ≥ 160, 绿色 ≥ 160, 绿色突出 ≥ 20, 红色 < 180

## 🏗️ 系统架构

### 文件结构

```
MAPWAR/
├── src/
│   ├── map/
│   │   ├── TileMapRenderer.js           # 主渲染器，集成地形覆盖层
│   │   └── TerrainOverlayRenderer.js    # 地形覆盖层渲染器
│   ├── terrain/
│   │   ├── TerrainConfig.js             # 地形类型配置
│   │   ├── TerrainDetector.js           # 地形检测器（像素分析）
│   │   └── ...
│   └── data/
│       └── terrainData.js               # 地形数据配置
└── TERRAIN_OVERLAY_SYSTEM.md           # 本文档
```

### 核心类

#### TerrainOverlayRenderer（地形覆盖层渲染器）

**位置**: `src/map/TerrainOverlayRenderer.js`

**核心方法**:

```javascript
class TerrainOverlayRenderer {
    constructor(tileMapRenderer)  // 构造函数，绑定到主渲染器

    async render()                // 渲染地形覆盖层
    classifyTerrain(r, g, b)      // 根据RGB颜色识别地形类型

    setOpacity(opacity)           // 设置透明度（0-1）
    setSampleInterval(interval)   // 设置采样间隔（1-20像素）
    setEnabled(enabled)           // 启用/禁用覆盖层
}
```

#### TileMapRenderer（集成地形覆盖层）

**位置**: `src/map/TileMapRenderer.js`

**新增方法**:

```javascript
toggleTerrainOverlay()                    // 切换地形覆盖层显示（快捷键T）
setTerrainOverlayOpacity(opacity)         // 设置覆盖层透明度
setTerrainOverlaySampleInterval(interval) // 设置采样密度
```

## ⚙️ Zoom 9核心优化

### 缩放级别优化配置

系统针对不同缩放级别自动调整采样精度：

| 缩放级别 | 采样间隔 | 默认透明度 | 说明 |
|---------|---------|-----------|------|
| **Zoom 9** | **4px** | **0.5** | **核心层，最高精度** |
| Zoom 8/10 | 6px | 0.45 | 高精度 |
| Zoom 7/11 | 8px | 0.4 | 标准精度 |
| 其他级别 | 8px | 0.5 | 默认配置 |

**核心特性**：
- Zoom 9自动使用4px采样间隔，提供最精确的地形识别
- 其他级别根据缩放程度动态调整性能和精度平衡

### 性能优化

- **智能采样**: 根据缩放级别自动调整采样密度
- **延迟渲染**: 等待瓦片加载完成（300ms延迟）
- **离屏Canvas**: 独立渲染避免阻塞主线程
- **统计输出**: Zoom 9时输出详细地形分布统计

## 🎮 使用方法

### 快速开始

**方法1：键盘快捷键（推荐）**

```
按 T 键 - 切换地形通行层显示
```

**方法2：浏览器控制台**

```javascript
// 查看系统信息
game.terrain.terrainOverlay.showInfo();

// 切换显示
game.terrain.toggleTerrainOverlay();

// 调整透明度 (0-1)
game.terrain.setTerrainOverlayOpacity(0.6);
```

### 详细API

```javascript
// 在浏览器控制台或代码中
const terrain = game.terrain; // TileMapRenderer实例

// 切换显示
terrain.toggleTerrainOverlay();

// 强制开启
terrain.showTerrainOverlay = true;
terrain.render();

// 强制关闭
terrain.showTerrainOverlay = false;
terrain.render();
```

### 2. 调整覆盖层透明度

```javascript
// 设置透明度（0-1，0=完全透明，1=完全不透明）
terrain.setTerrainOverlayOpacity(0.5);  // 默认值

// 更透明（推荐查看地图细节时使用）
terrain.setTerrainOverlayOpacity(0.3);

// 更明显（推荐规划路径时使用）
terrain.setTerrainOverlayOpacity(0.7);
```

### 3. 调整采样密度

```javascript
// 设置采样间隔（像素）
terrain.setTerrainOverlaySampleInterval(8);  // 默认值（平衡性能和精度）

// 高精度（较慢，适合zoom 11-12级）
terrain.setTerrainOverlaySampleInterval(4);

// 低精度（较快，适合zoom 5-7级）
terrain.setTerrainOverlaySampleInterval(16);
```

## 🧪 测试验证

### 测试步骤

1. **打开游戏** - 运行 `test_tactical_battle.html` 或主游戏页面
2. **确认Zoom 9** - 使用滚轮或缩放按钮调整到Zoom 9级别
3. **按T键** - 开启地形通行层显示
4. **查看控制台** - 应该看到统计信息：
   ```
   🗺️ [Zoom 9] 地形统计: 海洋XX% | 山地XX% | 平原XX% | 采样间隔:4px
   ```
5. **验证显示** - 地图上应出现三色覆盖：
   - 🌊 蓝色区域 = 海洋（不通）
   - ⛰️ 棕色区域 = 山地（慢通）
   - 🌾 绿色区域 = 平原（平通）

### 浏览器控制台测试

```javascript
// 1. 查看系统信息
game.terrain.terrainOverlay.showInfo();

// 2. 测试不同缩放级别
[7, 8, 9, 10, 11].forEach(zoom => {
    game.terrain.viewport.zoom = zoom;
    game.terrain.toggleTerrainOverlay();
    setTimeout(() => {
        console.log(`Zoom ${zoom} 测试完成`);
        game.terrain.toggleTerrainOverlay();
    }, 2000);
});
```

## 🔧 自定义配置

### 修改地形颜色

编辑 [src/map/TerrainOverlayRenderer.js:17-33](src/map/TerrainOverlayRenderer.js#L17-L33)：

```javascript
this.colors = {
    [TERRAIN_TYPES.OCEAN]: {
        color: 'rgba(59, 130, 246, 0.6)',    // 修改这里
        name: '海洋（不可通行）',
        speed: '0%'
    },
    [TERRAIN_TYPES.SLOW]: {
        color: 'rgba(161, 98, 7, 0.5)',      // 修改这里
        name: '山地（慢速）',
        speed: '30%'
    },
    [TERRAIN_TYPES.NORMAL]: {
        color: 'rgba(34, 197, 94, 0.3)',     // 修改这里
        name: '平原（平速）'
    }
};
```

### 修改地形识别规则

编辑 `src/map/TerrainOverlayRenderer.js` 的 `classifyTerrain()` 方法：

```javascript
classifyTerrain(r, g, b) {
    // 修改海洋识别阈值
    if (b >= 200 && g >= 170 && r <= 130 && (b - r) >= 70) {
        return TERRAIN_TYPES.OCEAN;
    }

    // 修改平原识别阈值
    const brightness = (r + g + b) / 3;
    if (brightness >= 220 && g >= 220 && g > r && g > b) {
        return TERRAIN_TYPES.NORMAL;
    }

    return TERRAIN_TYPES.SLOW;
}
```

### 修改默认设置

编辑 `src/map/TileMapRenderer.js` 的构造函数：

```javascript
// 地形覆盖层渲染器
this.terrainOverlay = new TerrainOverlayRenderer(this);
this.terrainOverlay.resize(canvas.width, canvas.height);
this.showTerrainOverlay = true; // 改为true，默认开启覆盖层
```

## 📊 地形通行性配置

### 地形类型定义

**位置**: `src/terrain/TerrainConfig.js`

```javascript
export const TERRAIN_PROPERTIES = {
    [TERRAIN_TYPES.OCEAN]: {
        name: '海洋',
        passable: false,        // 陆军不可通行
        moveCost: Infinity,
        speedMultiplier: 0      // 0%速度
    },

    [TERRAIN_TYPES.NORMAL]: {
        name: '平原',
        passable: true,
        moveCost: 1,
        speedMultiplier: 1.0    // 100%速度
    },

    [TERRAIN_TYPES.SLOW]: {
        name: '山地',
        passable: true,
        moveCost: 2,
        speedMultiplier: 0.5    // 50%速度（文档说30%，可根据需要调整）
    }
};
```

### 通行性查询

```javascript
import { getTerrainProperties, TERRAIN_TYPES } from './terrain/TerrainConfig.js';

// 获取地形属性
const oceanProps = getTerrainProperties(TERRAIN_TYPES.OCEAN);
console.log(oceanProps.passable);  // false
console.log(oceanProps.speedMultiplier);  // 0

// 用于寻路算法
function canPass(terrainType) {
    const props = getTerrainProperties(terrainType);
    return props.passable;
}

function getMoveCost(terrainType) {
    const props = getTerrainProperties(terrainType);
    return props.moveCost;
}
```

## 🐛 调试技巧

### 1. 查看地形识别结果

在浏览器控制台运行：

```javascript
// 查看某个像素的地形类型
const canvas = game.terrain.canvas;
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(500, 300, 1, 1);
const [r, g, b] = imageData.data;

const terrainType = game.terrain.terrainOverlay.classifyTerrain(r, g, b);
console.log(`像素(500, 300)地形类型: ${terrainType}`);
```

### 2. 显示采样网格

临时修改 `TerrainOverlayRenderer.render()` 方法：

```javascript
// 在render()方法末尾添加网格绘制
this.overlayCtx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
this.overlayCtx.lineWidth = 1;
for (let x = 0; x < width; x += this.sampleInterval) {
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(x, 0);
    this.overlayCtx.lineTo(x, height);
    this.overlayCtx.stroke();
}
for (let y = 0; y < height; y += this.sampleInterval) {
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(0, y);
    this.overlayCtx.lineTo(width, y);
    this.overlayCtx.stroke();
}
```

### 3. 统计地形分布

```javascript
// 统计当前屏幕的地形分布
function analyzeTerrainDistribution() {
    const canvas = game.terrain.canvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const counts = { ocean: 0, slow: 0, normal: 0 };
    const sampleInterval = 16;

    for (let y = 0; y < height; y += sampleInterval) {
        for (let x = 0; x < width; x += sampleInterval) {
            const index = (y * width + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];

            const terrainType = game.terrain.terrainOverlay.classifyTerrain(r, g, b);
            counts[terrainType]++;
        }
    }

    const total = counts.ocean + counts.slow + counts.normal;
    console.log('地形分布统计:');
    console.log(`海域: ${(counts.ocean / total * 100).toFixed(1)}%`);
    console.log(`山地: ${(counts.slow / total * 100).toFixed(1)}%`);
    console.log(`平原: ${(counts.normal / total * 100).toFixed(1)}%`);
}

analyzeTerrainDistribution();
```

## 🔍 常见问题

### Q1: 覆盖层不显示

**检查清单**:
1. ✅ 是否按了T键开启覆盖层？
2. ✅ 控制台是否显示 "🗺️ 地形覆盖层: 开启"？
3. ✅ 是否等待了300ms让瓦片加载完成？
4. ✅ 浏览器控制台是否有错误信息？
5. ✅ 是否进行了硬刷新（Ctrl+Shift+R）？

### Q2: 地形识别不准确

**原因**: 瓦片地图的颜色可能与识别规则不匹配

**解决方法**:
1. 使用调试技巧查看实际像素颜色
2. 修改 `classifyTerrain()` 方法的阈值
3. 参考真实地图验证识别结果

**示例**: 如果海域识别不准确，调整蓝色阈值：

```javascript
// 原始规则
if (b >= 180 && g >= 150 && r <= 150 && (b - r) >= 50)

// 调整后（更严格的海域识别）
if (b >= 200 && g >= 170 && r <= 130 && (b - r) >= 70)
```

### Q3: 覆盖层性能差

**原因**: 采样间隔太小或屏幕分辨率过高

**解决方法**:
```javascript
// 增加采样间隔（牺牲精度换取性能）
terrain.setTerrainOverlaySampleInterval(16);

// 或在高zoom级别自动调整
if (terrain.viewport.zoom >= 10) {
    terrain.setTerrainOverlaySampleInterval(12);
} else {
    terrain.setTerrainOverlaySampleInterval(8);
}
```

### Q4: 覆盖层颜色太浓/太淡

**调整透明度**:
```javascript
// 太浓 → 降低透明度
terrain.setTerrainOverlayOpacity(0.3);

// 太淡 → 增加透明度
terrain.setTerrainOverlayOpacity(0.7);
```

### Q5: 城市图标被覆盖层遮挡

**原因**: 渲染顺序问题

**验证**: 代码已正确实现，城市图标会在覆盖层之后重新绘制（见`renderTerrainOverlayDelayed()`方法）

如果仍有问题，检查：
```javascript
// src/map/TileMapRenderer.js 第888-892行
// 重新绘制城市图标和调试信息（保持在最上层）
if (this.viewport.zoom >= 7 && this.viewport.zoom <= 11) {
    this.renderCities();
}
this.renderDebugInfo();
```

## 🚀 未来扩展建议

### 1. 四种地形支持

添加"道路"地形类型（快速通行200%）：

```javascript
// TerrainOverlayRenderer.js
this.colors = {
    ...
    [TERRAIN_TYPES.FAST]: {
        color: 'rgba(251, 191, 36, 0.4)',  // 黄色 - 道路
        name: '道路（快速）'
    }
};

// classifyTerrain() 方法中添加
if (brightness >= 230 && r >= 200 && g >= 200 && b >= 180) {
    return TERRAIN_TYPES.FAST;  // 道路（灰白色）
}
```

### 2. 动态优化采样密度

根据zoom级别自动调整：

```javascript
// TileMapRenderer.js render()方法中
const autoSampleInterval = Math.max(4, 16 - this.viewport.zoom);
this.terrainOverlay.setSampleInterval(autoSampleInterval);
```

### 3. 地形缓存系统

缓存已分析的瓦片地形数据，避免重复计算：

```javascript
// TerrainOverlayRenderer.js
this.terrainCache = new Map();

getTileTerrain(tileKey) {
    if (this.terrainCache.has(tileKey)) {
        return this.terrainCache.get(tileKey);
    }
    // 计算并缓存
    const terrainData = this.analyzeTile(tile);
    this.terrainCache.set(tileKey, terrainData);
    return terrainData;
}
```

### 4. 寻路算法集成

将地形数据用于AI寻路：

```javascript
// PathfinderIntegration.js
import { getTerrainProperties } from './terrain/TerrainConfig.js';

function calculatePathCost(fromTile, toTile) {
    const terrainType = detectTerrainType(toTile);
    const props = getTerrainProperties(terrainType);

    if (!props.passable) {
        return Infinity;  // 不可通行
    }

    return props.moveCost;  // 返回移动成本
}
```

## 📖 技术参考

### 地形识别原理

- **颜色空间**: RGB颜色空间（0-255）
- **亮度计算**: `(R + G + B) / 3`（简化公式，也可用YIQ公式 `0.299*R + 0.587*G + 0.114*B`）
- **海洋特征**: 蓝绿色，蓝色通道显著高于红色通道
- **植被特征**: 绿色通道高于其他通道
- **山地特征**: 低亮度，颜色偏棕灰色

### Canvas性能优化

- **ImageData操作**: 直接操作像素数组比逐像素getPixel快100倍
- **离屏Canvas**: 使用独立Canvas避免阻塞主渲染线程
- **采样优化**: 跳过像素减少计算量（8像素间隔 = 1/64计算量）
- **延迟渲染**: 使用setTimeout避免阻塞用户交互

### 相关Web API

- `Canvas.getImageData()`: 获取像素数据
- `Canvas.putImageData()`: 写入像素数据
- `Canvas.drawImage()`: 合成图层
- `setTimeout()`: 异步延迟执行

## 📝 版本历史

**v1.0 - 2025-11-06**
- ✅ 实现基于像素颜色的地形识别
- ✅ 三种地形类型：海域/山地/平原
- ✅ 半透明覆盖层渲染
- ✅ 快捷键T切换显示
- ✅ 可调节透明度和采样密度
- ✅ 性能优化（采样间隔、延迟渲染）

---

**维护者**: AI Assistant
**最后更新**: 2025-11-06
**状态**: ✅ 生产可用
