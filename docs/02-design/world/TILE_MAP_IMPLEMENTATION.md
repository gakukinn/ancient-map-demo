---
title: MAPWAR 瓦片地图系统实施文档
summary: 详细记录从单张大图迁移到瓦片地图架构的方案、实现步骤与里程碑。
owner: GAKU
status: active
last_updated: 2025-11-05
phase: production
---
# MAPWAR 瓦片地图系统实施文档

## 文档概述

**文档版本**: 1.0
**创建日期**: 2025-11-05
**文档目的**: 详细记录从单张大图到瓦片地图系统的完整迁移方案

---

## 1. 项目背景

### 1.1 当前地图系统问题

**现状**：
- **地图文件**: `my_new_task.jpg`（单张图片）
- **文件大小**: 53MB
- **分辨率**: 22016 x 14848 像素
- **加载方式**: 一次性加载整张图片到内存

**问题分析**：
1. **加载时间过长**: 53MB 需要 5-15 秒加载（取决于网络）
2. **内存占用巨大**: 解码后占用 ~1.2GB 内存（22016 × 14848 × 4 bytes）
3. **渲染性能差**: Canvas 需要处理超大图片的缩放和平移
4. **移动端不可用**: 大多数移动设备无法处理如此大的图片
5. **无法实现流畅缩放**: 只有一个分辨率，放大会模糊

**影响**：
- 游戏启动缓慢
- 可能导致浏览器崩溃（低配设备）
- 用户体验极差
- 无法发布为公开的网页游戏

### 1.2 为什么需要瓦片系统

**瓦片地图原理**：
将大地图切分成小块（通常 256×256 像素），按需加载可见区域的瓦片。

**优势**：
1. ✅ **快速加载**: 初始只加载 10-20 张瓦片（~500KB）
2. ✅ **内存可控**: 只保留可见区域的瓦片（~50-100MB）
3. ✅ **流畅缩放**: 多级分辨率，每级都是原生清晰度
4. ✅ **性能优异**: 小图片渲染速度快
5. ✅ **行业标准**: Google Maps、百度地图等都使用此方案

**性能对比**：

| 指标 | 单张大图 | 瓦片系统 | 提升 |
|------|---------|---------|------|
| 初始加载 | 53MB | ~500KB | **100倍** |
| 加载时间 | 10-15秒 | <1秒 | **15倍** |
| 内存占用 | 1.2GB | 50-100MB | **12-24倍** |
| 缩放流畅度 | 差（单级） | 优秀（多级） | **质的飞跃** |
| 移动设备支持 | ❌ | ✅ | - |

### 1.3 现有资源

**好消息**: 你已经有瓦片数据！

**现有瓦片**：
- 位置：`public/allmapsoft/downloads/my_new_task/`
- 数量：4378 张 JPG 图片
- 总大小：185MB
- 结构：`/{x}/{y}.jpg`（单一缩放级别）

**问题**: 只有一个缩放级别，无法实现多级缩放。

**解决方案**: 重新下载 Level 8, 10, 12 三个级别的瓦片。

---

## 2. 瓦片下载完整指南

### 2.1 Google Maps Downloader 配置

**工具信息**：
- 名称：Google Maps Downloader
- 网站：https://www.allmapsoft.com/gmd/
- 版本：需要完整版（试用版限制 Level 13）

### 2.2 下载配置参数

#### **地图范围**（与当前项目一致）

```
北纬（North）: 53.56°
南纬（South）: 18.11°
东经（East）: 134.77°
西经（West）: 73.33°
```

#### **缩放级别选择**

**推荐配置**: **Level 8, 10, 12**（3个级别）

**级别说明**：

| 级别 | 用途 | 分辨率 | 预估大小 | 说明 |
|------|------|--------|---------|------|
| **Level 8** | 全图视野 | 低分辨率 | ~50-80MB | 游戏默认缩放，查看全局 |
| **Level 10** | 中等缩放 | 中分辨率 | ~200-400MB | 平滑过渡，避免视觉跳跃 |
| **Level 12** | 详细查看 | 高分辨率 | ~800-1500MB | 最大放大，查看细节 |

**总存储**: 约 1-2GB

**可选方案**：
- **最小配置**: Level 8, 12（2个级别，~1GB，缩放会有跳跃）
- **完整配置**: Level 8, 9, 10, 11, 12（5个级别，~2-3GB，最流畅）

#### **导出设置**

**重要设置**：
```
✓ 地图类型: Terrain（地形图）
✓ 缩放级别: 8, 10, 12
✓ 导出格式: Tiles（瓦片，不合并）
✓ 图片格式: JPG
✓ 质量: 85-90%
✗ 不要选择 "Combine into one image"（不要合并）
```

**为什么不合并？**
- 合并后又变成大图，失去瓦片优势
- 无法实现按需加载
- 内存和性能问题依然存在

### 2.3 目录结构规范

**标准瓦片目录结构**（期望的格式）：

```
public/tiles/                    # 瓦片根目录
├── 8/                          # Level 8 瓦片
│   ├── 100/                    # X 坐标 = 100
│   │   ├── 40.jpg              # Y 坐标 = 40
│   │   ├── 41.jpg
│   │   └── ...
│   ├── 101/                    # X 坐标 = 101
│   │   └── ...
│   └── ...
├── 10/                         # Level 10 瓦片
│   ├── 400/
│   │   ├── 160.jpg
│   │   └── ...
│   └── ...
└── 12/                         # Level 12 瓦片
    ├── 1600/
    │   ├── 640.jpg
    │   └── ...
    └── ...
```

**瓦片命名规范**：
- 格式：`/{zoom}/{x}/{y}.jpg`
- `{zoom}`: 缩放级别（8, 10, 12）
- `{x}`: 瓦片 X 坐标（从西到东递增）
- `{y}`: 瓦片 Y 坐标（从北到南递增）
- 坐标系：Google Maps 标准（XYZ 切片方案）

**建议路径**：
```
建议新路径: public/tiles/
或: public/allmapsoft/tiles/
```

### 2.4 下载检查清单

下载完成后，请检查：

- [ ] 三个级别目录都存在（8, 10, 12）
- [ ] 每个级别都有多个 X 坐标目录
- [ ] 每个 X 目录下有多个 JPG 文件
- [ ] 文件命名为数字（如 40.jpg, 41.jpg）
- [ ] 总文件大小在 1-2GB 之间
- [ ] 随机打开几张图片确认是地图瓦片

**验证命令**（Windows）：
```bash
# 检查目录结构
dir /s /b public\tiles\8 | find /c ".jpg"
dir /s /b public\tiles\10 | find /c ".jpg"
dir /s /b public\tiles\12 | find /c ".jpg"

# 计算总大小
du -sh public\tiles\*
```

---

## 3. 技术架构设计

### 3.1 瓦片坐标系统

#### **Web Mercator 投影**

Google Maps 使用 **Web Mercator** 投影（EPSG:3857）：

**特点**：
- 将地球投影为正方形
- 适合网页地图显示
- 保持角度，但不保持面积和距离
- 纬度范围：约 ±85.05°

**投影公式**：
```javascript
// 经纬度 → Mercator 坐标
function toMercator(lng, lat) {
    const EARTH_RADIUS = 6378137; // 地球半径（米）
    const x = EARTH_RADIUS * lng * Math.PI / 180;
    const y = EARTH_RADIUS * Math.log(
        Math.tan(Math.PI / 4 + lat * Math.PI / 360)
    );
    return { x, y };
}

// Mercator 坐标 → 经纬度
function fromMercator(x, y) {
    const EARTH_RADIUS = 6378137;
    const lng = (x / EARTH_RADIUS) * 180 / Math.PI;
    const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI;
    return { lat, lng };
}
```

#### **瓦片坐标系统**

**每个缩放级别的瓦片数量**：
```
Level z 的瓦片总数 = 2^z × 2^z

Level 8:  256 × 256 = 65,536 张
Level 10: 1,024 × 1,024 = 1,048,576 张
Level 12: 4,096 × 4,096 = 16,777,216 张
```

**经纬度 → 瓦片坐标**：
```javascript
function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((lng + 180) / 360 * n);

    const latRad = lat * Math.PI / 180;
    const yTile = Math.floor(
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    );

    return { x: xTile, y: yTile };
}
```

**瓦片坐标 → 经纬度**（瓦片左上角）：
```javascript
function tileToLatLng(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;

    return { lat, lng };
}
```

### 3.2 坐标转换流程

**完整转换链路**：

```
用户操作（鼠标点击）
    ↓
屏幕坐标 (screenX, screenY)
    ↓
[移除 pan 和 scale] ← 当前视口变换
    ↓
基础屏幕坐标 (baseX, baseY)
    ↓
[归一化到 0-1] ← Canvas 尺寸
    ↓
归一化坐标 (ratioX, ratioY)
    ↓
[映射到 Mercator 边界] ← 预计算边界
    ↓
Mercator 坐标 (mercX, mercY)
    ↓
[反投影] ← Mercator 公式
    ↓
经纬度坐标 (lat, lng)
    ↓
[瓦片坐标计算] ← 缩放级别
    ↓
瓦片坐标 (tileX, tileY, zoom)
    ↓
[加载瓦片]
    ↓
瓦片图片显示
```

**代码示例**：
```javascript
// 屏幕坐标 → 经纬度
function screenToLatLng(screenX, screenY, viewport) {
    // 1. 移除视口变换
    const baseX = (screenX - viewport.pan.x - viewport.centerX) / viewport.scale + viewport.centerX;
    const baseY = (screenY - viewport.pan.y - viewport.centerY) / viewport.scale + viewport.centerY;

    // 2. 归一化（0-1）
    const ratioX = baseX / viewport.width;
    const ratioY = baseY / viewport.height;

    // 3. 映射到 Mercator
    const mercX = viewport.mercatorBounds.xMin + ratioX * (viewport.mercatorBounds.xMax - viewport.mercatorBounds.xMin);
    const mercY = viewport.mercatorBounds.yMax - ratioY * (viewport.mercatorBounds.yMax - viewport.mercatorBounds.yMin);

    // 4. Mercator → 经纬度
    return fromMercator(mercX, mercY);
}

// 经纬度 → 需要加载的瓦片
function getTilesForView(bounds, zoom) {
    const topLeft = latLngToTile(bounds.north, bounds.west, zoom);
    const bottomRight = latLngToTile(bounds.south, bounds.east, zoom);

    const tiles = [];
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
        for (let y = topLeft.y; y <= bottomRight.y; y++) {
            tiles.push({ x, y, zoom });
        }
    }
    return tiles;
}
```

### 3.3 瓦片加载策略

#### **可见瓦片计算**

**步骤**：
1. 获取当前视口的地理边界
2. 根据当前缩放级别计算瓦片范围
3. 生成需要加载的瓦片列表
4. 过滤已加载的瓦片
5. 按优先级排序（中心区域优先）

**伪代码**：
```javascript
function calculateVisibleTiles() {
    // 1. 计算视口边界
    const topLeft = screenToLatLng(0, 0);
    const bottomRight = screenToLatLng(width, height);

    // 2. 确定缩放级别
    const zoom = getCurrentZoomLevel();

    // 3. 计算瓦片范围
    const tileTopLeft = latLngToTile(topLeft.lat, topLeft.lng, zoom);
    const tileBottomRight = latLngToTile(bottomRight.lat, bottomRight.lng, zoom);

    // 4. 生成瓦片列表（添加边界缓冲）
    const tiles = [];
    const buffer = 1; // 额外加载周围 1 圈瓦片

    for (let x = tileTopLeft.x - buffer; x <= tileBottomRight.x + buffer; x++) {
        for (let y = tileTopLeft.y - buffer; y <= tileBottomRight.y + buffer; y++) {
            if (!isTileLoaded(x, y, zoom)) {
                tiles.push({ x, y, zoom, priority: calculatePriority(x, y) });
            }
        }
    }

    // 5. 按优先级排序（距离中心越近优先级越高）
    tiles.sort((a, b) => b.priority - a.priority);

    return tiles;
}
```

#### **异步加载机制**

**原则**：
- 非阻塞加载（不影响游戏运行）
- 显示加载进度
- 失败重试机制
- 取消过期的加载请求

**代码示例**：
```javascript
class TileLoader {
    constructor() {
        this.loadingTiles = new Map(); // 正在加载的瓦片
        this.loadedTiles = new Map();  // 已加载的瓦片
        this.maxConcurrent = 6;        // 最大并发加载数
    }

    async loadTile(x, y, zoom) {
        const key = `${zoom}/${x}/${y}`;

        // 检查是否已加载
        if (this.loadedTiles.has(key)) {
            return this.loadedTiles.get(key);
        }

        // 检查是否正在加载
        if (this.loadingTiles.has(key)) {
            return this.loadingTiles.get(key);
        }

        // 开始加载
        const promise = this._loadTileImage(x, y, zoom);
        this.loadingTiles.set(key, promise);

        try {
            const image = await promise;
            this.loadedTiles.set(key, image);
            this.loadingTiles.delete(key);
            return image;
        } catch (error) {
            console.error(`Failed to load tile ${key}:`, error);
            this.loadingTiles.delete(key);
            return null;
        }
    }

    _loadTileImage(x, y, zoom) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = `/tiles/${zoom}/${x}/${y}.jpg`;
        });
    }

    async loadTiles(tiles) {
        // 控制并发数
        const chunks = [];
        for (let i = 0; i < tiles.length; i += this.maxConcurrent) {
            chunks.push(tiles.slice(i, i + this.maxConcurrent));
        }

        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(t => this.loadTile(t.x, t.y, t.zoom))
            );
        }
    }
}
```

### 3.4 缓存管理机制

#### **LRU 缓存策略**

**最近最少使用（Least Recently Used）**：
- 保留最近使用的瓦片
- 当内存达到限制时，删除最久未使用的瓦片
- 缓存大小限制：例如 500 张瓦片（~125MB）

**实现**：
```javascript
class TileCache {
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
        this.cache = new Map(); // key → { image, timestamp }
        this.accessOrder = [];  // 访问顺序队列
    }

    get(key) {
        if (!this.cache.has(key)) return null;

        // 更新访问时间
        this._updateAccessOrder(key);
        return this.cache.get(key).image;
    }

    set(key, image) {
        // 检查是否需要清理
        if (this.cache.size >= this.maxSize) {
            this._evictLRU();
        }

        this.cache.set(key, {
            image,
            timestamp: Date.now()
        });
        this._updateAccessOrder(key);
    }

    _updateAccessOrder(key) {
        // 移除旧位置
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // 添加到队尾（最新）
        this.accessOrder.push(key);
    }

    _evictLRU() {
        // 删除最久未使用的瓦片
        const oldestKey = this.accessOrder.shift();
        this.cache.delete(oldestKey);
        console.log(`Evicted tile: ${oldestKey}`);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            memoryEstimate: `${(this.cache.size * 256).toFixed(0)} KB`
        };
    }
}
```

#### **预加载策略**

**预测用户移动方向**：
```javascript
class TilePreloader {
    constructor(tileLoader) {
        this.tileLoader = tileLoader;
        this.lastViewport = null;
    }

    preloadAhead(currentViewport) {
        if (!this.lastViewport) {
            this.lastViewport = currentViewport;
            return;
        }

        // 计算移动方向
        const dx = currentViewport.centerX - this.lastViewport.centerX;
        const dy = currentViewport.centerY - this.lastViewport.centerY;

        // 预加载移动方向上的瓦片
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            const predictedCenter = {
                x: currentViewport.centerX + dx * 2,
                y: currentViewport.centerY + dy * 2
            };

            const tiles = this._getTilesAroundPoint(predictedCenter, currentViewport.zoom);
            this.tileLoader.loadTiles(tiles);
        }

        this.lastViewport = currentViewport;
    }
}
```

### 3.5 LOD（细节层次）切换

#### **缩放级别选择算法**

**根据当前 scale 确定最佳 zoom level**：

```javascript
function getBestZoomLevel(scale, availableLevels = [8, 10, 12]) {
    // scale 范围：0.4 - 16
    // zoom 8: scale 0.4 - 1.5
    // zoom 10: scale 1.5 - 6
    // zoom 12: scale 6 - 16

    const scaleToZoom = {
        8: { min: 0.4, max: 1.5 },
        10: { min: 1.5, max: 6 },
        12: { min: 6, max: 16 }
    };

    // 找到最合适的级别
    for (const level of availableLevels.sort((a, b) => b - a)) {
        const range = scaleToZoom[level];
        if (scale >= range.min && scale <= range.max) {
            return level;
        }
    }

    // 边界情况
    if (scale < 1.5) return 8;
    if (scale < 6) return 10;
    return 12;
}
```

#### **平滑过渡**

**在切换 LOD 时避免闪烁**：

```javascript
class LODTransition {
    transitionToNewLevel(oldLevel, newLevel) {
        // 1. 保留旧级别瓦片
        // 2. 后台加载新级别瓦片
        // 3. 新瓦片加载完成后淡入

        return new Promise((resolve) => {
            const newTiles = this.calculateVisibleTiles(newLevel);

            Promise.all(
                newTiles.map(t => this.tileLoader.loadTile(t.x, t.y, t.zoom))
            ).then(() => {
                // 所有新瓦片加载完成
                this.currentLevel = newLevel;
                resolve();
            });
        });
    }
}
```

---

## 4. 海陆判断方案

### 4.1 需求说明

**为什么需要海陆判断？**
- 限制玩家/NPC 在陆地上移动
- 区分海洋、湖泊、河流
- 控制移动速度（陆地快，渡口慢）
- 游戏逻辑判断（是否可通过）

### 4.2 方案对比

#### **方案1：额外下载海陆遮罩瓦片**

**实现方式**：
- 下载额外的黑白遮罩瓦片（只需 Level 8）
- 黑色 = 陆地，白色 = 海洋
- 像素检测判断

**优点**：
- ✅ 精确可靠
- ✅ 可以检测任意坐标
- ✅ 遮罩瓦片很小（10-20MB）

**缺点**：
- ❌ 需要额外下载
- ❌ Google Maps Downloader 可能不支持导出纯色遮罩

**实现**：
```javascript
class LandMaskTiles {
    async isLand(lat, lng) {
        const tile = await this.getMaskTile(lat, lng, 8);
        const pixel = this.getPixelAt(tile, lat, lng);

        // 检测像素颜色（假设陆地为深色，海洋为浅色）
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        return brightness < 128;
    }
}
```

#### **方案2：像素颜色检测（地形瓦片）**

**实现方式**：
- 直接检测地形瓦片的颜色
- 海洋通常是蓝色系

**优点**：
- ✅ 不需要额外数据
- ✅ 实现简单

**缺点**：
- ❌ 不准确（河流、湖泊误判）
- ❌ 地形图颜色复杂
- ❌ 不同缩放级别颜色不同
- ❌ 已经尝试过，失败了

**不推荐**：你的文档提到"基于图片像素检测的方案未能正常工作"

#### **方案3：GeoJSON 海陆边界数据（推荐）**

**实现方式**：
- 使用矢量海岸线数据
- Point-in-polygon 算法判断

**数据来源**：
- Natural Earth Data: https://www.naturalearthdata.com/
- 文件：`ne_10m_land.geojson`（全球陆地多边形）
- 大小：压缩后 ~5MB

**优点**：
- ✅ 最精确
- ✅ 文件小
- ✅ 矢量数据，任意缩放都准确
- ✅ 可以区分海洋、湖泊、河流
- ✅ 行业标准方案

**缺点**：
- ❌ 需要实现 point-in-polygon 算法
- ❌ 需要下载 GeoJSON 数据

**实现**：
```javascript
import landPolygons from './data/china_land.geojson';

class GeoJSONLandMask {
    constructor() {
        this.landPolygons = landPolygons.features;
    }

    isLand(lat, lng) {
        const point = [lng, lat];

        for (const feature of this.landPolygons) {
            if (feature.geometry.type === 'Polygon') {
                if (this.pointInPolygon(point, feature.geometry.coordinates[0])) {
                    return true;
                }
            } else if (feature.geometry.type === 'MultiPolygon') {
                for (const polygon of feature.geometry.coordinates) {
                    if (this.pointInPolygon(point, polygon[0])) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    pointInPolygon(point, polygon) {
        // Ray casting algorithm
        const [x, y] = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const intersect = ((yi > y) !== (yj > y)) &&
                            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}
```

#### **方案4：预定义区域边界（快速方案）**

**实现方式**：
- 手动定义主要海洋区域的矩形边界
- 简单的坐标范围判断

**优点**：
- ✅ 实现超简单
- ✅ 性能最好
- ✅ 不需要额外文件

**缺点**：
- ❌ 精度低（只能粗略判断）
- ❌ 复杂海岸线无法处理
- ❌ 湖泊无法识别

**实现**：
```javascript
const OCEAN_REGIONS = [
    {
        name: '渤海',
        bounds: { north: 41, south: 37, east: 122, west: 118 }
    },
    {
        name: '黄海',
        bounds: { north: 40, south: 31, east: 126, west: 119 }
    },
    {
        name: '东海',
        bounds: { north: 33, south: 23, east: 128, west: 120 }
    },
    {
        name: '南海',
        bounds: { north: 23, south: 3, east: 121, west: 105 }
    }
];

function isLandSimple(lat, lng) {
    // 检查是否在海洋区域内
    for (const ocean of OCEAN_REGIONS) {
        if (lat >= ocean.bounds.south && lat <= ocean.bounds.north &&
            lng >= ocean.bounds.west && lng <= ocean.bounds.east) {
            return false; // 在海洋中
        }
    }
    return true; // 默认为陆地
}
```

### 4.3 推荐方案

**最佳方案：方案3（GeoJSON）+ 方案4（预定义）组合**

**实施策略**：
1. **主方案**：使用 GeoJSON 海岸线数据（精确）
2. **备用方案**：简单的海洋矩形判断（快速）
3. **渐进增强**：先实现简单方案，再升级到 GeoJSON

**组合实现**：
```javascript
class LandMaskSystem {
    constructor() {
        this.geojsonLoaded = false;
        this.landPolygons = null;
        this.loadGeoJSON();
    }

    async loadGeoJSON() {
        try {
            const response = await fetch('/data/china_land.geojson');
            const data = await response.json();
            this.landPolygons = data.features;
            this.geojsonLoaded = true;
            console.log('GeoJSON land mask loaded');
        } catch (error) {
            console.warn('Failed to load GeoJSON, using fallback method');
        }
    }

    isLand(lat, lng) {
        // 优先使用 GeoJSON（精确）
        if (this.geojsonLoaded) {
            return this.isLandGeoJSON(lat, lng);
        }

        // 备用：简单矩形判断（快速）
        return this.isLandSimple(lat, lng);
    }

    isLandGeoJSON(lat, lng) {
        // 使用 point-in-polygon 算法
        // ... (见方案3代码)
    }

    isLandSimple(lat, lng) {
        // 使用预定义海洋区域
        // ... (见方案4代码)
    }
}
```

### 4.4 GeoJSON 数据准备

**步骤1：下载 Natural Earth 数据**

```bash
# 下载链接
https://www.naturalearthdata.com/downloads/10m-physical-vectors/

# 文件选择
ne_10m_land.zip  # 陆地多边形（推荐）
或
ne_10m_ocean.zip  # 海洋多边形
```

**步骤2：裁剪到中国区域**

使用在线工具或代码裁剪：
```javascript
// 裁剪边界
const bounds = {
    north: 53.56,
    south: 18.11,
    east: 134.77,
    west: 73.33
};

// 过滤 GeoJSON
const chinaLand = {
    type: 'FeatureCollection',
    features: landData.features.filter(feature => {
        // 检查多边形是否在中国区域内
        return polygonIntersectsBounds(feature.geometry, bounds);
    })
};
```

**步骤3：简化多边形（减小文件）**

```bash
# 使用 mapshaper 工具
npm install -g mapshaper

# 简化（保留 10% 的点）
mapshaper ne_10m_land.geojson -simplify 10% -o china_land_simplified.geojson
```

**步骤4：放置文件**

```
public/data/china_land.geojson  # 完整版（~5MB）
或
public/data/china_land_simplified.geojson  # 简化版（~1MB）
```

---

## 5. 代码实现计划

### 5.1 新建文件清单

#### **文件1：TileMapLoader.js**
**路径**: `src/terrain/TileMapLoader.js`
**职责**: 瓦片加载和管理核心

**功能**：
- 计算可见瓦片
- 异步加载瓦片
- 瓦片缓存管理
- LOD 级别切换

**主要类**：
```javascript
export class TileMapLoader {
    constructor(options) {
        this.tileCache = new TileCache(options.maxCacheSize);
        this.tileLoader = new TileLoader();
        this.currentZoom = 8;
        this.visibleTiles = [];
    }

    // 计算并加载可见瓦片
    async updateVisibleTiles(viewport) { }

    // 渲染瓦片到 Canvas
    renderTiles(ctx, viewport) { }

    // 切换缩放级别
    switchZoomLevel(newZoom) { }

    // 预加载周围瓦片
    preloadTiles(viewport) { }
}
```

#### **文件2：TileCache.js**
**路径**: `src/terrain/TileCache.js`
**职责**: LRU 缓存系统

**功能**：
- 缓存瓦片图片
- LRU 淘汰策略
- 内存管理

#### **文件3：TileCoordinates.js**
**路径**: `src/utils/TileCoordinates.js`
**职责**: 坐标转换工具

**功能**：
- 经纬度 ↔ Mercator 投影
- 经纬度 ↔ 瓦片坐标
- 瓦片 ↔ 像素坐标

#### **文件4：LandMaskSystem.js**
**路径**: `src/terrain/LandMaskSystem.js`
**职责**: 海陆判断系统

**功能**：
- GeoJSON 数据加载
- Point-in-polygon 算法
- 备用简单判断

#### **文件5：china_land.geojson**
**路径**: `public/data/china_land.geojson`
**类型**: 数据文件
**内容**: 中国区域陆地边界（简化版）

### 5.2 修改文件清单

#### **文件1：TerrainMap.js**
**路径**: `src/terrain/TerrainMap.js`
**修改内容**：

```javascript
// 当前：单图加载
async load() {
    const img = new Image();
    img.src = '/allmapsoft/.../my_new_task.jpg';
    // ...
}

// 修改后：集成瓦片系统
constructor(canvas, options) {
    // ... 现有代码 ...

    // 新增：瓦片系统
    this.tileLoader = new TileMapLoader({
        tileBasePath: options.tileBasePath || '/tiles',
        availableZooms: options.availableZooms || [8, 10, 12],
        maxCacheSize: 500
    });

    this.useTiles = options.useTiles !== false; // 默认启用瓦片
}

async load() {
    if (!this.useTiles) {
        // 保留原来的单图加载逻辑（兼容）
        return this.loadSingleImage();
    }

    // 新逻辑：初始化瓦片系统
    await this.tileLoader.initialize();
    this.prepareFallbackPattern();
}

render() {
    if (!this.useTiles) {
        // 原来的单图渲染
        return this.renderSingleImage();
    }

    // 新逻辑：渲染瓦片
    const viewport = this.getViewport();
    this.tileLoader.renderTiles(this.ctx, viewport);
}
```

#### **文件2：gameData.js**
**路径**: `src/data/gameData.js`
**修改内容**：

```javascript
// 添加瓦片配置
export const TILE_CONFIG = {
    enabled: true,
    basePath: '/tiles',
    availableZooms: [8, 10, 12],
    tileSize: 256,
    format: 'jpg',
    maxCacheSize: 500
};

// 添加海陆判断配置
export const LAND_MASK_CONFIG = {
    enabled: true,
    geojsonPath: '/data/china_land.geojson',
    fallbackOceanRegions: [
        { name: '渤海', bounds: { ... } },
        { name: '黄海', bounds: { ... } },
        // ...
    ]
};
```

#### **文件3：game.js**
**路径**: `game.js`
**修改内容**：

```javascript
// 在 GameManager.init() 中
async init() {
    // ... 现有代码 ...

    // 初始化瓦片地图
    this.terrain = new TerrainMap(this.canvas, {
        bounds: window.GAME_DATA.mapBounds,
        useTiles: true,  // 启用瓦片系统
        tileBasePath: TILE_CONFIG.basePath,
        availableZooms: TILE_CONFIG.availableZooms
    });

    await this.terrain.load();

    // 初始化海陆判断
    this.landMask = new LandMaskSystem(LAND_MASK_CONFIG);
    await this.landMask.initialize();

    // ... 其他初始化 ...
}

// 在玩家/NPC 移动逻辑中添加海陆判断
isValidPosition(lat, lng) {
    // 检查是否在地图范围内
    if (!this.isInBounds(lat, lng)) return false;

    // 检查是否在陆地上
    if (!this.landMask.isLand(lat, lng)) return false;

    return true;
}
```

### 5.3 关键代码示例

#### **示例1：TileMapLoader 核心逻辑**

```javascript
// src/terrain/TileMapLoader.js
import { TileCache } from './TileCache.js';
import { latLngToTile, tileToLatLng } from '../utils/TileCoordinates.js';

export class TileMapLoader {
    constructor(options) {
        this.basePath = options.tileBasePath || '/tiles';
        this.availableZooms = options.availableZooms || [8, 10, 12];
        this.tileSize = 256;
        this.maxConcurrent = 6;

        this.cache = new TileCache(options.maxCacheSize || 500);
        this.loadingTiles = new Map();
        this.currentZoom = this.availableZooms[0];
    }

    // 更新可见瓦片
    async updateVisibleTiles(viewport) {
        // 1. 确定当前缩放级别
        const zoom = this.getBestZoomLevel(viewport.scale);

        if (zoom !== this.currentZoom) {
            await this.switchZoomLevel(zoom);
        }

        // 2. 计算可见瓦片
        const tiles = this.calculateVisibleTiles(viewport, zoom);

        // 3. 加载新瓦片
        await this.loadTiles(tiles);

        // 4. 更新可见列表
        this.visibleTiles = tiles;
    }

    // 计算可见瓦片
    calculateVisibleTiles(viewport, zoom) {
        const { width, height, scale, pan } = viewport;
        const { bounds } = viewport;

        // 屏幕四角的地理坐标
        const topLeft = this.screenToLatLng(0, 0, viewport);
        const bottomRight = this.screenToLatLng(width, height, viewport);

        // 转换为瓦片坐标
        const tileTopLeft = latLngToTile(topLeft.lat, topLeft.lng, zoom);
        const tileBottomRight = latLngToTile(bottomRight.lat, bottomRight.lng, zoom);

        // 生成瓦片列表（带缓冲区）
        const tiles = [];
        const buffer = 1;

        for (let x = tileTopLeft.x - buffer; x <= tileBottomRight.x + buffer; x++) {
            for (let y = tileTopLeft.y - buffer; y <= tileBottomRight.y + buffer; y++) {
                tiles.push({
                    x, y, zoom,
                    key: `${zoom}/${x}/${y}`,
                    url: `${this.basePath}/${zoom}/${x}/${y}.jpg`
                });
            }
        }

        return tiles;
    }

    // 加载瓦片
    async loadTiles(tiles) {
        const promises = tiles.map(tile => this.loadTile(tile));
        await Promise.all(promises);
    }

    async loadTile(tile) {
        // 检查缓存
        const cached = this.cache.get(tile.key);
        if (cached) return cached;

        // 检查是否正在加载
        if (this.loadingTiles.has(tile.key)) {
            return this.loadingTiles.get(tile.key);
        }

        // 开始加载
        const promise = this._loadImage(tile.url);
        this.loadingTiles.set(tile.key, promise);

        try {
            const image = await promise;
            this.cache.set(tile.key, image);
            this.loadingTiles.delete(tile.key);
            return image;
        } catch (error) {
            console.error(`Failed to load tile ${tile.key}:`, error);
            this.loadingTiles.delete(tile.key);
            return null;
        }
    }

    _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }

    // 渲染瓦片
    renderTiles(ctx, viewport) {
        ctx.save();

        // 应用视口变换
        const { width, height, scale, pan } = viewport;
        ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);

        // 渲染每个瓦片
        for (const tile of this.visibleTiles) {
            const image = this.cache.get(tile.key);
            if (!image) continue;

            // 计算瓦片屏幕位置
            const pos = this.tileToScreen(tile, viewport);
            const size = this.tileSize * Math.pow(2, this.currentZoom - tile.zoom);

            ctx.drawImage(image, pos.x, pos.y, size, size);
        }

        ctx.restore();
    }

    // 瓦片坐标转屏幕坐标
    tileToScreen(tile, viewport) {
        const { lat, lng } = tileToLatLng(tile.x, tile.y, tile.zoom);
        return this.latLngToScreen(lat, lng, viewport);
    }

    // 获取最佳缩放级别
    getBestZoomLevel(scale) {
        if (scale < 1.5) return 8;
        if (scale < 6) return 10;
        return 12;
    }

    // 切换缩放级别
    async switchZoomLevel(newZoom) {
        console.log(`Switching zoom level: ${this.currentZoom} → ${newZoom}`);
        this.currentZoom = newZoom;
        // 清理旧级别的缓存（可选）
        // this.cache.clear();
    }
}
```

#### **示例2：坐标转换工具**

```javascript
// src/utils/TileCoordinates.js

const EARTH_RADIUS = 6378137;

// 经纬度 → Mercator 投影
export function toMercator(lng, lat) {
    const x = EARTH_RADIUS * lng * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x, y };
}

// Mercator 投影 → 经纬度
export function fromMercator(x, y) {
    const lng = (x / EARTH_RADIUS) * 180 / Math.PI;
    const latRad = 2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2;
    const lat = latRad * 180 / Math.PI;
    return { lat, lng };
}

// 经纬度 → 瓦片坐标
export function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((lng + 180) / 360 * n);

    const latRad = lat * Math.PI / 180;
    const yTile = Math.floor(
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    );

    return { x: xTile, y: yTile };
}

// 瓦片坐标 → 经纬度（瓦片左上角）
export function tileToLatLng(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;

    return { lat, lng };
}

// 瓦片坐标 → 像素坐标（在瓦片内的位置）
export function latLngToPixelInTile(lat, lng, zoom, tileSize = 256) {
    const n = Math.pow(2, zoom);
    const x = (lng + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    const pixelX = Math.floor((x - tileX) * tileSize);
    const pixelY = Math.floor((y - tileY) * tileSize);

    return {
        tile: { x: tileX, y: tileY },
        pixel: { x: pixelX, y: pixelY }
    };
}
```

#### **示例3：海陆判断系统**

```javascript
// src/terrain/LandMaskSystem.js

export class LandMaskSystem {
    constructor(config) {
        this.config = config;
        this.geojsonLoaded = false;
        this.landPolygons = null;
        this.oceanRegions = config.fallbackOceanRegions || [];
    }

    async initialize() {
        if (!this.config.enabled) return;

        try {
            const response = await fetch(this.config.geojsonPath);
            const data = await response.json();
            this.landPolygons = data.features;
            this.geojsonLoaded = true;
            console.log('Land mask GeoJSON loaded:', this.landPolygons.length, 'polygons');
        } catch (error) {
            console.warn('Failed to load GeoJSON land mask, using fallback:', error);
        }
    }

    isLand(lat, lng) {
        if (this.geojsonLoaded) {
            return this.isLandGeoJSON(lat, lng);
        }
        return this.isLandFallback(lat, lng);
    }

    isLandGeoJSON(lat, lng) {
        const point = [lng, lat];

        for (const feature of this.landPolygons) {
            const geometry = feature.geometry;

            if (geometry.type === 'Polygon') {
                if (this.pointInPolygon(point, geometry.coordinates[0])) {
                    return true;
                }
            } else if (geometry.type === 'MultiPolygon') {
                for (const polygon of geometry.coordinates) {
                    if (this.pointInPolygon(point, polygon[0])) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    isLandFallback(lat, lng) {
        // 检查是否在预定义的海洋区域内
        for (const ocean of this.oceanRegions) {
            const { north, south, east, west } = ocean.bounds;
            if (lat >= south && lat <= north && lng >= west && lng <= east) {
                return false; // 在海洋中
            }
        }
        return true; // 默认为陆地
    }

    // Ray casting algorithm
    pointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const intersect = ((yi > y) !== (yj > y)) &&
                            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}
```

---

## 6. 性能优化策略

### 6.1 可见瓦片计算优化

**策略**：
- 只计算屏幕可见区域的瓦片
- 添加 1-2 瓦片的缓冲区（预加载）
- 使用脏标记避免重复计算

**实现**：
```javascript
class VisibleTilesCalculator {
    constructor() {
        this.lastViewport = null;
        this.cachedTiles = [];
    }

    calculate(viewport) {
        // 检查视口是否显著变化
        if (this.lastViewport && !this.viewportChanged(viewport, this.lastViewport)) {
            return this.cachedTiles; // 返回缓存结果
        }

        // 重新计算
        const tiles = this._calculateTiles(viewport);
        this.cachedTiles = tiles;
        this.lastViewport = viewport;
        return tiles;
    }

    viewportChanged(current, last) {
        const threshold = 50; // 像素阈值
        return Math.abs(current.pan.x - last.pan.x) > threshold ||
               Math.abs(current.pan.y - last.pan.y) > threshold ||
               Math.abs(current.scale - last.scale) > 0.1;
    }
}
```

### 6.2 预加载策略

**智能预测**：
- 检测用户平移方向
- 预加载移动方向上的瓦片
- 限制预加载数量（避免浪费带宽）

**实现**：
```javascript
class SmartPreloader {
    preload(currentViewport, direction) {
        const predictedTiles = this.predictNextTiles(currentViewport, direction);

        // 低优先级后台加载
        this.loadInBackground(predictedTiles);
    }

    predictNextTiles(viewport, direction) {
        // 根据方向预测下一屏的瓦片
        const { dx, dy } = direction;
        const predictedCenter = {
            x: viewport.centerX + dx * viewport.width * 0.5,
            y: viewport.centerY + dy * viewport.height * 0.5
        };

        return this.getTilesAroundPoint(predictedCenter, viewport.zoom);
    }
}
```

### 6.3 内存管理

**策略**：
- LRU 缓存淘汰
- 监控内存使用
- 动态调整缓存大小

**实现**：
```javascript
class MemoryMonitor {
    constructor(cache) {
        this.cache = cache;
        this.maxMemory = 150 * 1024 * 1024; // 150MB
    }

    checkMemory() {
        const currentMemory = this.estimateMemoryUsage();

        if (currentMemory > this.maxMemory) {
            this.reduceCacheSize();
        }
    }

    estimateMemoryUsage() {
        // 256x256 JPG ≈ 50-100KB
        // 估算：每张瓦片约 80KB
        return this.cache.size * 80 * 1024;
    }

    reduceCacheSize() {
        const targetSize = Math.floor(this.cache.maxSize * 0.7);
        while (this.cache.size > targetSize) {
            this.cache._evictLRU();
        }
    }
}
```

### 6.4 渲染优化

**技巧**：
- 使用 OffscreenCanvas 预渲染
- 批量绘制瓦片
- 避免不必要的重绘

**实现**：
```javascript
class TileRenderer {
    constructor() {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.needsRedraw = true;
    }

    render(tiles, viewport) {
        if (!this.needsRedraw) {
            return; // 跳过重绘
        }

        // 预渲染到离屏 Canvas
        this.preRender(tiles, viewport);

        // 一次性绘制到主 Canvas
        this.mainCtx.drawImage(this.offscreenCanvas, 0, 0);

        this.needsRedraw = false;
    }

    preRender(tiles, viewport) {
        // 在离屏 Canvas 上批量绘制瓦片
        for (const tile of tiles) {
            const image = this.cache.get(tile.key);
            if (image) {
                this.offscreenCtx.drawImage(image, ...);
            }
        }
    }
}
```

### 6.5 网络优化

**策略**：
- HTTP/2 多路复用
- 控制并发请求数量
- 失败重试机制

**实现**：
```javascript
class NetworkOptimizer {
    constructor() {
        this.maxConcurrent = 6;
        this.queue = [];
        this.activeRequests = 0;
    }

    async load(url) {
        if (this.activeRequests >= this.maxConcurrent) {
            // 加入队列
            return new Promise((resolve, reject) => {
                this.queue.push({ url, resolve, reject });
            });
        }

        return this._loadWithRetry(url);
    }

    async _loadWithRetry(url, retries = 3) {
        this.activeRequests++;

        for (let i = 0; i < retries; i++) {
            try {
                const result = await this._load(url);
                this.activeRequests--;
                this._processQueue();
                return result;
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.delay(1000 * (i + 1)); // 指数退避
            }
        }
    }

    _processQueue() {
        if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
            const { url, resolve, reject } = this.queue.shift();
            this._loadWithRetry(url).then(resolve).catch(reject);
        }
    }
}
```

---

## 7. 实施步骤

### 7.1 阶段1：下载瓦片（你的任务）

**预计时间**：1-4 小时（取决于网络速度）

**步骤**：
1. [ ] 打开 Google Maps Downloader
2. [ ] 设置地图区域（北纬 18.11-53.56°, 东经 73.33-134.77°）
3. [ ] 选择地图类型：Terrain（地形图）
4. [ ] 选择缩放级别：8, 10, 12
5. [ ] 设置导出格式：Tiles（瓦片），不合并
6. [ ] 设置图片格式：JPG, 质量 85-90%
7. [ ] 设置保存路径：`public/tiles/`
8. [ ] 开始下载
9. [ ] 等待下载完成
10. [ ] 验证目录结构和文件

**下载完成后**：
- 检查三个级别目录（8, 10, 12）
- 确认文件总大小在 1-2GB
- 随机打开几张图片验证

### 7.2 阶段2：代码实现（AI 任务）

**预计时间**：2-3 小时

**步骤**：
1. [ ] 创建 `TileCoordinates.js`（坐标转换工具）
2. [ ] 创建 `TileCache.js`（LRU 缓存）
3. [ ] 创建 `TileMapLoader.js`（瓦片加载器）
4. [ ] 修改 `TerrainMap.js`（集成瓦片系统）
5. [ ] 修改 `gameData.js`（添加配置）
6. [ ] 修改 `game.js`（初始化瓦片系统）
7. [ ] 创建 `LandMaskSystem.js`（海陆判断）
8. [ ] 下载并放置 `china_land.geojson`
9. [ ] 集成海陆判断到游戏逻辑

### 7.3 阶段3：测试验证

**预计时间**：1 小时

**测试清单**：
- [ ] 地图正常显示
- [ ] 瓦片正确加载
- [ ] 缩放切换流畅（Level 8 ↔ 10 ↔ 12）
- [ ] 平移不卡顿
- [ ] 城市位置正确
- [ ] 海陆判断有效
- [ ] 玩家/NPC 不能进入海洋
- [ ] 内存占用合理（<200MB）
- [ ] 加载时间快速（<2秒）
- [ ] 控制台无错误

### 7.4 阶段4：性能对比

**对比指标**：

| 指标 | 单张大图 | 瓦片系统 | 提升 |
|------|---------|---------|------|
| 初始加载时间 | ___ 秒 | ___ 秒 | ___ × |
| 首屏显示时间 | ___ 秒 | ___ 秒 | ___ × |
| 内存占用 | ___ MB | ___ MB | ___ × |
| 缩放流畅度 | 主观评分 | 主观评分 | - |
| FPS（帧率） | ___ fps | ___ fps | ___ × |

**测试方法**：
```javascript
// 在控制台运行
console.time('Map Load');
await game.terrain.load();
console.timeEnd('Map Load');

// 检查内存
console.log(performance.memory.usedJSHeapSize / 1024 / 1024, 'MB');
```

---

## 8. 附录

### 8.1 当前地图系统技术细节

#### **地图边界**（保持不变）

```javascript
const MAP_BOUNDS = {
    north: 53.56,  // 北纬53.56° (黑龙江北部)
    south: 18.11,  // 北纬18.11° (海南岛)
    east: 134.77,  // 东经134.77° (东北边境)
    west: 73.33    // 东经73.33° (新疆西部)
};
```

#### **Web Mercator 投影边界**（保持不变）

```javascript
const MERCATOR_BOUNDS = {
    xMin: 7983847.603275299,
    xMax: 14714892.31313095,
    yMin: 2035212.3146309834,
    yMax: 6574654.549337845
};
```

#### **缩放范围**（保持不变）

```javascript
const ZOOM_CONFIG = {
    minScale: 0.4,   // 最小缩放（缩小）
    maxScale: 16,    // 最大缩放（放大）
    defaultScale: 1  // 默认缩放
};
```

### 8.2 文件路径清单

#### **需要创建的文件**

```
c:\Users\GAKU\Desktop\MAPWAR\
├── src/
│   ├── terrain/
│   │   ├── TileMapLoader.js      [新建] 瓦片加载器
│   │   ├── TileCache.js          [新建] 瓦片缓存
│   │   └── LandMaskSystem.js     [新建] 海陆判断
│   └── utils/
│       └── TileCoordinates.js    [新建] 坐标转换
└── public/
    ├── tiles/                     [新建] 瓦片目录
    │   ├── 8/
    │   ├── 10/
    │   └── 12/
    └── data/
        └── china_land.geojson     [新建] 海陆数据
```

#### **需要修改的文件**

```
c:\Users\GAKU\Desktop\MAPWAR\
├── src/
│   ├── terrain/
│   │   └── TerrainMap.js         [修改] 集成瓦片系统
│   └── data/
│       └── gameData.js           [修改] 添加配置
└── game.js                        [修改] 初始化瓦片
```

#### **现有地图相关文件**

```
c:\Users\GAKU\Desktop\MAPWAR\
├── src/
│   ├── terrain/
│   │   ├── TerrainMap.js          [核心] 地图渲染
│   │   ├── TerrainLayer.js        [未使用] 地形层
│   │   └── terrainData.js         [数据] 地形定义
│   ├── data/
│   │   └── gameData.js            [数据] 游戏配置
│   └── renderer/
│       └── GameRenderer.js        [渲染] 游戏渲染器
├── game.js                         [核心] 游戏管理器
├── terrain-map.js                  [备用] 独立地图
└── public/allmapsoft/downloads/
    ├── my_new_task/                [旧瓦片] 单级别
    └── my_new_task_combined/
        └── my_new_task.jpg         [旧图] 53MB大图
```

### 8.3 常见问题排查

#### **问题1：瓦片加载失败（404 错误）**

**症状**：
- 控制台显示 "Failed to load tile" 错误
- 地图显示空白或不完整

**排查**：
```javascript
// 检查瓦片路径是否正确
console.log('Tile path:', tileLoader.basePath);
console.log('Trying to load:', `/tiles/8/100/40.jpg`);

// 手动访问瓦片 URL
// 在浏览器地址栏输入：http://localhost:5173/tiles/8/100/40.jpg
```

**解决**：
- 确认瓦片目录结构正确
- 检查 `basePath` 配置
- 确认 Vite 配置正确（`publicDir` 设置）

#### **问题2：瓦片位置错位**

**症状**：
- 瓦片显示但位置不对
- 城市不在正确的地理位置上

**排查**：
```javascript
// 检查坐标转换
const testCity = { lat: 34.34, lng: 108.94 }; // 长安
const screen = terrain.latLngToScreen(testCity.lat, testCity.lng);
console.log('长安屏幕坐标:', screen);

// 反向验证
const geo = terrain.screenToLatLng(screen.x, screen.y);
console.log('反向转换:', geo); // 应该接近 34.34, 108.94
```

**解决**：
- 检查 Mercator 投影边界
- 验证瓦片坐标计算公式
- 确认瓦片坐标系（TMS vs XYZ）

#### **问题3：缩放时瓦片不切换**

**症状**：
- 放大后图片模糊
- 缩小后加载缓慢

**排查**：
```javascript
// 检查缩放级别选择
console.log('Current scale:', terrain.scale);
console.log('Selected zoom level:', tileLoader.currentZoom);

// 应该根据 scale 自动切换
// scale < 1.5 → zoom 8
// 1.5 ≤ scale < 6 → zoom 10
// scale ≥ 6 → zoom 12
```

**解决**：
- 检查 `getBestZoomLevel()` 函数
- 确认 `switchZoomLevel()` 被调用
- 添加调试日志

#### **问题4：内存占用过高**

**症状**：
- 游戏运行一段时间后变慢
- 浏览器崩溃

**排查**：
```javascript
// 检查缓存大小
console.log('Cache stats:', tileCache.getStats());

// 检查内存使用
console.log('Memory:', performance.memory.usedJSHeapSize / 1024 / 1024, 'MB');
```

**解决**：
- 减小缓存大小（`maxCacheSize`）
- 检查 LRU 淘汰是否生效
- 确认不再使用的瓦片被释放

#### **问题5：海陆判断不准确**

**症状**：
- 玩家可以进入海洋
- 陆地被判断为海洋

**排查**：
```javascript
// 测试已知坐标
console.log('北京是否陆地:', landMask.isLand(39.9, 116.4)); // 应该 true
console.log('渤海是否陆地:', landMask.isLand(38.5, 120.0)); // 应该 false

// 检查 GeoJSON 是否加载
console.log('GeoJSON loaded:', landMask.geojsonLoaded);
console.log('Polygons count:', landMask.landPolygons?.length);
```

**解决**：
- 确认 GeoJSON 文件路径正确
- 检查 point-in-polygon 算法
- 使用备用简单判断验证

### 8.4 性能基准参考

#### **目标性能指标**

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 初始加载时间 | < 2秒 | 从开始加载到首屏显示 |
| 瓦片加载时间 | < 500ms | 加载单个缩放级别的可见瓦片 |
| 内存占用 | < 200MB | 稳定运行时的内存使用 |
| FPS（帧率） | > 30 fps | 平移/缩放时的流畅度 |
| 缓存命中率 | > 80% | 瓦片缓存的有效性 |

#### **真实测试数据**（待填写）

```
测试环境：
- 浏览器: Chrome 131
- 操作系统: Windows 11
- CPU: _____
- 内存: _____
- 网络: _____

测试结果：
- 初始加载: _____ 秒
- 首屏显示: _____ 秒
- 内存占用: _____ MB
- 平均 FPS: _____ fps
- 缓存命中率: _____ %

对比单张大图：
- 加载时间提升: _____ 倍
- 内存占用减少: _____ 倍
- 流畅度: 显著提升 / 一般 / 无明显变化
```

### 8.5 参考资源

#### **坐标系统和投影**
- Web Mercator (EPSG:3857): https://epsg.io/3857
- Tile Map Service (TMS): https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
- Slippy Map Tilenames: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames

#### **GeoJSON 数据**
- Natural Earth Data: https://www.naturalearthdata.com/
- GeoJSON.io (在线编辑): https://geojson.io/
- Mapshaper (简化工具): https://mapshaper.org/

#### **地图工具**
- Google Maps Downloader: https://www.allmapsoft.com/gmd/
- GDAL2Tiles (切片工具): https://gdal.org/programs/gdal2tiles.html

#### **相关算法**
- Point in Polygon: https://en.wikipedia.org/wiki/Point_in_polygon
- LRU Cache: https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)
- Quadtree (高级优化): https://en.wikipedia.org/wiki/Quadtree

---

## 9. 总结

### 9.1 预期收益

**性能提升**：
- ✅ 初始加载时间从 10-15秒 降至 <2秒（**10倍+**）
- ✅ 内存占用从 1.2GB 降至 <200MB（**6倍+**）
- ✅ 流畅的多级缩放体验（Level 8, 10, 12）
- ✅ 支持移动设备访问

**用户体验**：
- ✅ 游戏启动快速
- ✅ 缩放放大清晰不模糊
- ✅ 平移流畅无卡顿
- ✅ 可以发布为公开网页游戏

**技术债务**：
- ✅ 符合行业标准（与 Google Maps 等一致）
- ✅ 易于扩展（可添加更多缩放级别）
- ✅ 代码结构清晰（模块化设计）

### 9.2 下一步行动

**立即执行**：
1. 使用 Google Maps Downloader 下载瓦片（Level 8, 10, 12）
2. 通知 AI 开始代码实现
3. 测试验证瓦片系统
4. 对比性能数据

**可选优化**（未来）：
- 添加更多缩放级别（Level 6, 7, 9, 11）
- 实现瓦片压缩（WebP 格式）
- 添加瓦片加载进度条
- 实现离线缓存（Service Worker）

---

**文档版本**: 1.0
**最后更新**: 2025-11-05
**文档状态**: 完整，待实施
**作者**: AI Assistant
**审核**: 待用户确认

---

**致未来的 AI**：
这份文档包含了从单张大图迁移到瓦片地图系统的完整技术方案。请严格遵循以下原则：
1. **不要擅自修改地图边界和投影参数**（已在现有系统中验证）
2. **保持与现有代码的兼容性**（添加功能，不破坏现有功能）
3. **实施前先阅读项目概述文档**（20251102PROJECT_OVERVIEW.md）
4. **遇到不确定的地方，先询问用户**（不要自行猜测）
5. **遵循项目规范**（见 PROJECT_OVERVIEW.md）

**关键决策记录**：
- 选择 Level 8, 10, 12 三个缩放级别（用户确认）
- 不合并瓦片为单张大图（技术决策）
- 使用 GeoJSON 方案实现海陆判断（推荐方案）
- 保留单图加载作为备用方案（兼容性）
