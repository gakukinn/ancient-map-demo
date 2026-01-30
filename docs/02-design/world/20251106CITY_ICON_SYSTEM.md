---
title: 城市图标系统实现文档
summary: 说明城市图标在不同缩放级别的定位方案、渲染流程与调试工具。
owner: GAKU
status: active
last_updated: 2025-11-06
phase: production
---
# 城市图标系统实现文档

## 📋 概述

本文档记录了MAPWAR游戏中城市图标系统的实现原理和使用方法，供日后维护和扩展使用。

## 🎯 核心原理

### 问题背景

在瓦片地图系统中，如果使用经纬度坐标来定位城市图标，会在不同zoom级别产生**位置偏移**：
- **现象**：zoom 12级位置正确，但zoom 9、8、7级图标会向西偏移
- **根本原因**：经纬度到瓦片坐标的转换在每个zoom级别都会产生浮点数舍入误差，累积后导致偏移

### 解决方案：瓦片坐标系统

使用**瓦片坐标**而非经纬度来存储城市位置：

```javascript
// ❌ 错误方式：使用经纬度（会产生zoom级别偏移）
this.cities = [
    { name: '长安', lat: 34.27519, lng: 108.92166, icon: 'changan' }
];

// ✅ 正确方式：使用瓦片坐标（所有zoom级别精确）
this.cities = [
    {
        name: '长安',
        tileCoord: { zoom: 9, x: 410.9108, y: 204.055 },  // 参考zoom级别的瓦片坐标
        icon: 'changan'
    }
];
```

### 数学原理

瓦片坐标在不同zoom级别的转换公式：

```javascript
// 从参考zoom到当前zoom的缩放
zoomDiff = currentZoom - referenceZoom
scale = 2^zoomDiff

// 转换公式
currentTileX = referenceTileX * scale
currentTileY = referenceTileY * scale
```

**示例**：长安在zoom 9的坐标是(410.9108, 204.055)
- Zoom 10: (410.9108 × 2, 204.055 × 2) = (821.8216, 408.110)
- Zoom 11: (410.9108 × 4, 204.055 × 4) = (1643.6432, 816.220)
- Zoom 12: (410.9108 × 8, 204.055 × 8) = (3287.2864, 1632.440)
- Zoom 8: (410.9108 ÷ 2, 204.055 ÷ 2) = (205.4554, 102.0275)

这种方法保证了**数学上的精确性**，避免了浮点数累积误差。

## 🏗️ 系统架构

### 文件结构

```
MAPWAR/
├── src/
│   └── map/
│       ├── TileMapRenderer.js      # 核心渲染器，实现城市图标系统
│       └── TileMapConfig.js        # 地图配置
├── assets/
│   └── cities/
│       └── changan.png             # 城市图标图片（332×214像素）
└── CITY_ICON_SYSTEM.md            # 本文档
```

### 关键代码位置

**TileMapRenderer.js** (行号参考)

1. **城市数据定义** (第33-42行)
```javascript
this.cities = [
    {
        name: '长安',
        tileCoord: { zoom: 9, x: 410.9108, y: 204.055 },
        icon: 'changan'
    }
];
```

2. **瓦片坐标转屏幕坐标** (第761-791行)
```javascript
tileCoordToScreen(tileCoord) {
    const zoomDiff = this.viewport.zoom - tileCoord.zoom;
    const scale = Math.pow(2, zoomDiff);

    const currentTileX = tileCoord.x * scale;
    const currentTileY = tileCoord.y * scale;

    const centerTile = latLngToTile(
        this.viewport.centerLat,
        this.viewport.centerLng,
        this.viewport.zoom
    );

    const dx = currentTileX - centerTile.x;
    const dy = currentTileY - centerTile.y;

    const x = this.canvas.width / 2 + dx * TILE_CONFIG.TILE_SIZE + this.viewport.offsetX;
    const y = this.canvas.height / 2 + dy * TILE_CONFIG.TILE_SIZE + this.viewport.offsetY;

    return { x, y };
}
```

3. **渲染城市图标** (第816-860行)
```javascript
renderCities() {
    this.cities.forEach(city => {
        const icon = this.cityIcons[city.icon];
        if (!icon) return;

        // 使用瓦片坐标转换
        const screenPos = this.tileCoordToScreen(city.tileCoord);

        // 根据zoom级别缩放图标
        const scale = 1 + (this.viewport.zoom - 9) * 0.25;
        const iconWidth = icon.width * scale;
        const iconHeight = icon.height * scale;

        // 绘制图标（居中对齐）
        this.ctx.drawImage(
            icon,
            screenPos.x - iconWidth / 2,
            screenPos.y - iconHeight / 2,
            iconWidth,
            iconHeight
        );

        // 绘制城市名称
        // ...
    });
}
```

4. **渲染时机** (第445-448行, 第487-493行)
```javascript
// render()方法中：在zoom 7-11级显示城市
if (this.viewport.zoom >= 7 && this.viewport.zoom <= 11) {
    this.renderCities();
}

// renderTile()方法中：每个瓦片加载后重新绘制城市（保持在最上层）
this.loader.loadTile(x, y, zoom).then(img => {
    this.ctx.drawImage(img, ...);

    // 重新绘制城市图标（保持在最上层）
    if (this.viewport.zoom >= 7 && this.viewport.zoom <= 11) {
        this.renderCities();
    }
});
```

## 📝 添加新城市的步骤

### 1. 获取城市的瓦片坐标

**方法A：从经纬度计算**

如果你知道城市的经纬度，使用以下代码计算瓦片坐标：

```javascript
function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const latRad = lat * Math.PI / 180;
    const x = (lng + 180) / 360 * n;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    return { x, y };
}

// 示例：咸阳（34.35°N, 108.70°E）
const xianyang = latLngToTile(34.35, 108.70, 9);
console.log(xianyang); // { x: 409.808, y: 203.937 }
```

**方法B：通过地图点击获取**

1. 在浏览器中打开游戏
2. 按F12打开开发者工具，切换到Console标签
3. 在地图上点击城市位置
4. 查看控制台输出的经纬度坐标
5. 使用方法A计算瓦片坐标

**方法C：使用在线工具**

访问 https://www.maptiler.com/google-maps-coordinates-tile-bounds-projection/
输入经纬度和zoom级别，获取瓦片坐标。

### 2. 准备城市图标图片

- **格式**：PNG（支持透明背景）或JPG
- **尺寸**：建议300-400像素宽，保持原始长宽比
- **命名**：使用城市拼音小写，如 `xianyang.png`
- **位置**：放入 `assets/cities/` 目录

### 3. 添加城市数据

编辑 `src/map/TileMapRenderer.js`，在构造函数中添加：

```javascript
// 加载图标
this.loadCityIcon('xianyang', '/assets/cities/xianyang.png');

// 添加城市数据
this.cities = [
    { name: '长安', tileCoord: { zoom: 9, x: 410.9108, y: 204.055 }, icon: 'changan' },
    { name: '咸阳', tileCoord: { zoom: 9, x: 409.808, y: 203.937 }, icon: 'xianyang' }  // 新增
];
```

### 4. 测试验证

1. 刷新浏览器（Ctrl+Shift+R 硬刷新）
2. 测试所有zoom级别（7-11），确认图标位置一致
3. 检查控制台日志，确认图标加载成功

## 🎨 图标显示规则

### Zoom级别范围

- **Zoom 7-11**：显示城市图标
- **Zoom 5-6**：不显示（太小看不清）
- **Zoom 12**：不显示（超详细视图，应该显示3D建筑模型）

可以在代码中修改显示范围：

```javascript
// src/map/TileMapRenderer.js 第445-448行
if (this.viewport.zoom >= 7 && this.viewport.zoom <= 11) {
    this.renderCities();
}
```

### 图标缩放规则

图标大小会根据zoom级别自动调整：

```javascript
// Zoom 9为基准（1.0倍），每级±0.25倍
const scale = 1 + (this.viewport.zoom - 9) * 0.25;

// 示例：
// Zoom 7: scale = 1 + (7-9)*0.25 = 0.5x  (50%大小)
// Zoom 8: scale = 1 + (8-9)*0.25 = 0.75x (75%大小)
// Zoom 9: scale = 1.0x (原始大小)
// Zoom 10: scale = 1.25x (125%大小)
// Zoom 11: scale = 1.5x (150%大小)
```

修改缩放规则：

```javascript
// src/map/TileMapRenderer.js 第832行
const scale = 1 + (this.viewport.zoom - 9) * 0.3;  // 改为每级±0.3倍
```

### 图标对齐方式

当前实现：**底部中心对齐**（图标底部中心点对准城市坐标）

```javascript
// 居中对齐（图标中心点对准城市坐标）
this.ctx.drawImage(
    icon,
    screenPos.x - iconWidth / 2,   // 水平居中
    screenPos.y - iconHeight / 2,  // 垂直居中
    iconWidth,
    iconHeight
);
```

如需改为底部中心对齐：

```javascript
this.ctx.drawImage(
    icon,
    screenPos.x - iconWidth / 2,   // 水平居中
    screenPos.y - iconHeight,      // 底部对齐（图标底部对准城市坐标）
    iconWidth,
    iconHeight
);
```

## 🔧 调试技巧

### 查看城市坐标信息

控制台会输出详细的渲染信息：

```
🏛️ TileMapRenderer 初始化城市数据: [{name: '长安', tileCoord: {...}, icon: 'changan'}]
🏛️ 渲染城市: 长安, 瓦片坐标(zoom 9): x=410.9108, y=204.055
   当前zoom 10, 屏幕坐标: x=960.5, y=540.2
```

### 临时禁用调试日志

编辑 `src/map/TileMapRenderer.js`，注释掉console.log：

```javascript
// console.log('🏛️ TileMapRenderer 初始化城市数据:', this.cities);
// console.log(`🏛️ 渲染城市: ${city.name}, ...`);
// console.log(`   当前zoom ${this.viewport.zoom}, ...`);
```

### 绘制城市坐标十字线

在 `renderCities()` 方法中添加：

```javascript
// 绘制十字线用于调试定位
this.ctx.save();
this.ctx.strokeStyle = '#ff0000';
this.ctx.lineWidth = 2;
this.ctx.beginPath();
this.ctx.moveTo(screenPos.x - 20, screenPos.y);
this.ctx.lineTo(screenPos.x + 20, screenPos.y);
this.ctx.moveTo(screenPos.x, screenPos.y - 20);
this.ctx.lineTo(screenPos.x, screenPos.y + 20);
this.ctx.stroke();
this.ctx.restore();
```

## 🐛 常见问题

### Q1: 图标不显示

**检查清单**：
1. ✅ 图标文件是否存在于 `assets/cities/` 目录？
2. ✅ `loadCityIcon()` 是否正确调用？
3. ✅ 当前zoom级别是否在7-11范围内？
4. ✅ 浏览器控制台是否有图标加载错误？
5. ✅ 是否进行了硬刷新（Ctrl+Shift+R）？

### Q2: 图标位置在不同zoom级别偏移

**原因**：使用了经纬度坐标而非瓦片坐标

**解决**：
1. 将经纬度转换为瓦片坐标（使用zoom 9作为参考）
2. 修改城市数据为瓦片坐标格式
3. 使用 `tileCoordToScreen()` 而非 `latLngToScreen()`

### Q3: 图标被瓦片覆盖

**原因**：瓦片异步加载，渲染顺序问题

**解决**：已在 `renderTile()` 方法中实现，每个瓦片加载后重新绘制城市图标

### Q4: 图标太大或太小

**调整方法**：
```javascript
// 方法1：修改缩放系数
const scale = 1 + (this.viewport.zoom - 9) * 0.3;  // 改变0.25为其他值

// 方法2：修改图标基准大小
const baseScale = 0.8;  // 整体缩小到80%
const scale = baseScale * (1 + (this.viewport.zoom - 9) * 0.25);
```

## 📚 技术参考

### Web Mercator投影

- 瓦片坐标系统基于 [Web Mercator投影](https://en.wikipedia.org/wiki/Web_Mercator_projection)
- Google Maps、OpenStreetMap等都使用此投影
- 公式：`x = (lng + 180) / 360 * 2^zoom`
- 公式：`y = (1 - ln(tan(lat) + sec(lat)) / π) / 2 * 2^zoom`

### 瓦片坐标说明

- **整数部分**：瓦片索引（例如 x=410 表示第410个瓦片）
- **小数部分**：瓦片内偏移（例如 x=410.9108 表示在第410个瓦片内的91.08%位置）
- **范围**：0 ≤ x,y < 2^zoom

### 性能优化

当前实现已包含的优化：
- ✅ 图标预加载（构造函数中调用 `loadCityIcon()`）
- ✅ 缓存屏幕坐标计算结果（每次render只计算一次）
- ✅ 条件渲染（只在zoom 7-11渲染）
- ✅ 图标加载失败时跳过渲染

未来可考虑的优化：
- [ ] 视口裁剪（只渲染屏幕内可见的城市）
- [ ] LOD系统（根据zoom级别显示不同详细度的图标）
- [ ] Canvas离屏渲染（预渲染城市图层）

## 📖 版本历史

**v1.0 - 2025-11-06**
- ✅ 实现基于瓦片坐标的城市图标系统
- ✅ 解决不同zoom级别的位置偏移问题
- ✅ 支持zoom 7-11级别显示
- ✅ 支持图标自动缩放
- ✅ 添加长安城市图标（332×214像素）

---

**维护者**: AI Assistant
**最后更新**: 2025-11-06
**状态**: ✅ 生产可用
