# MAPWAR 技术文档

本文档记录了 MAPWAR 项目的核心算法和设计决策，供未来的 AI 和开发者参考。

---

## 1. 地图系统 (Map System)

### 1.1 基础配置
- **地图库**: Leaflet.js
- **瓦片尺寸**: 512px (原始) → 256px (显示，Retina 质量)
- **原生缩放级别**: Zoom 9 (唯一可用的高清瓦片层)
- **允许缩放范围**: Zoom 7-12
- **瓦片路径**: `public/terrain_512/{x}/{y}.jpg`
- **TMS 模式**: `false`

### 1.2 性能优化
**问题**: 当用户缩小到"上帝视角"(Zoom 4-6) 时，浏览器尝试加载成千上万张 Zoom 9 的瓦片并缩放，导致严重卡顿。

**解决方案**: 
- 限制 `minZoom: 7`，防止过度缩小
- 未来可考虑生成低分辨率瓦片 (Zoom 6, 7, 8) 以支持更大视野

**关键代码**: `src/map/GameMap.ts`
```typescript
minZoom: 7,        // 限制最小缩放
maxZoom: 12,
minNativeZoom: 9,  // 只有 zoom 9 的瓦片
maxNativeZoom: 9
```

---

## 2. 六边形网格系统 (Hexagon Grid System)

### 2.1 网格类型
- **方向**: Pointy-topped (尖顶朝上)
- **半径**: 0.15 度 (约 16.5 km)
- **坐标系统**: Axial Coordinates (q, r)

### 2.2 关键算法

#### 2.2.1 完美拼接 (Perfect Tiling)
**问题**: 使用每个六边形自己的纬度计算投影会导致微小缝隙。

**解决方案**: 使用**单一参考纬度** (`projectionLat`) 进行所有投影计算。

**关键代码**: `src/systems/GridSystem.ts`
```typescript
// 所有六边形使用相同的 projectionLat
const corners = GridSystem.getHexagonCorners(hexCenter, GLOBAL_LAT);
```

**数学原理**:
```
lng_offset = distance * cos(angle) / cos(projectionLat)
lat_offset = distance * sin(angle)
```

#### 2.2.2 方向修正 (Rotation Fix)
**问题**: 邻居六边形使用"角度"而非"方向"导致 30° 旋转错误。

**解决方案**: 邻居方向使用 `60° * directionIndex` (0, 60, 120...)，而非 `60° * i - 30°`。

**关键代码**:
```typescript
// 正确: 邻居方向
const angle_deg = 60 * directionIndex; // 0, 60, 120, 180, 240, 300

// 错误: 角点方向 (会导致旋转)
const angle_deg = 60 * i - 30; // -30, 30, 90, 150, 210, 270
```

#### 2.2.3 坐标转换
**LatLng → Axial**:
```typescript
const y = lat - centerLat;
const x = (lng - centerLng) * cos(centerLat);
const r = y / (dist * sin(60°));
const q = (x - r * dist * cos(60°)) / dist;
// 然后进行 Cube Rounding
```

**Axial → LatLng**:
```typescript
const x_offset = q * dist * cos(0°) + r * dist * cos(60°);
const y_offset = q * dist * sin(0°) + r * dist * sin(60°);
const lng = centerLng + x_offset / cos(centerLat);
const lat = centerLat + y_offset;
```

### 2.3 网格渲染优化
**问题**: 低缩放级别下渲染数千个六边形导致卡顿。

**解决方案**: 
- 仅在 `zoom >= 7` 时渲染网格
- 使用 `getHexesInBounds()` 动态计算可见区域内的六边形

**关键代码**: `src/core/GridManager.ts`
```typescript
if (zoom < 7) return; // 性能优化
const hexCenters = GridSystem.getHexesInBounds(bounds, center);
```

---

## 3. 城市与领土系统 (City & Territory System)

### 3.1 领土范围
- **半径**: 1 (中心 + 1 圈)
- **格子数**: 7 个 (1 中心 + 6 邻居)

### 3.2 重叠冲突解决

#### 3.2.1 问题分析
**案例**: 新郑与开封
- 理论总数: 7 + 7 = 14 格
- 重叠格子: 2 格
- 实际总数: 14 - 2 = **12 格**

#### 3.2.2 分配策略演进

**策略 1: 距离优先 (Closest Wins)**
```typescript
if (dist < existing.dist) {
    map.set(key, { city, dist });
}
```
**结果**: 开封 7 : 新郑 5 (不平衡)

**策略 2: 平衡生长 (Balanced Growth)** ✅ 当前使用
```typescript
const score = rawDist * (1 + currentCount * penaltyFactor);
// penaltyFactor = 1.0
```
**结果**: 开封 6 : 新郑 6 (平衡)

**算法流程**:
1. 生成所有城市的领土声明 (claims)
2. 迭代分配:
   - 计算每个声明的"加权距离" = 实际距离 × (1 + 已占格子数 × 1.0)
   - 选择加权距离最小的声明
   - 分配格子，更新计数
3. 重复直到所有格子分配完毕

**关键代码**: `src/core/CityManager.ts`
```typescript
while (assignedHexes.size < totalUniqueHexes) {
    let bestClaim: Claim | null = null;
    let minScore = Infinity;
    
    for (const claim of allClaims) {
        if (assignedHexes.has(claim.key)) continue;
        
        const currentCount = cityHexCounts.get(claim.city.id) || 0;
        const score = claim.rawDist * (1 + currentCount * 1.0);
        
        if (score < minScore) {
            minScore = score;
            bestClaim = claim;
        }
    }
    
    if (bestClaim) {
        hexOwnership.set(bestClaim.key, bestClaim.city);
        assignedHexes.add(bestClaim.key);
        cityHexCounts.set(bestClaim.city.id, currentCount + 1);
    }
}
```

---

## 4. 势力与颜色系统 (Faction & Color System)

### 4.1 势力配置
| 势力 | 颜色 | 色值 | 文化背景 |
|------|------|------|----------|
| 华夏 | 黑色 | #000000 | 中原文化 |
| 中华 | 红色 | #FF0000 | 革命象征 |
| 天朝 | 青色 | #00FFFF | 天空/海洋 |
| 朝鲜 | 银色 | #C0C0C0 | 金属质感 |
| 蒙古 | 蓝色 | #0000FF | 草原天空 |
| 羌藏 | 灰色 | #808080 | 高原岩石 |
| 回回 | 米白色 | #FFFACD | 尚白文化 |

### 4.2 透明度优化

**问题**: 浅色在地图背景上不够明显。

**解决方案**: 根据颜色亮度动态调整透明度。

**算法**:
```typescript
// 计算相对亮度 (Relative Luminance)
const brightness = 0.299 * R + 0.587 * G + 0.114 * B;

// 动态透明度
const fillOpacity = brightness > 0.6 ? 0.75 : 0.5;
```

**效果**:
- **浅色系** (米白、银色、青色): 75% 不透明 → 更清晰
- **深色系** (黑、灰、蓝、红): 50% 不透明 → 不遮挡地图细节

**关键代码**: `src/core/CityManager.ts`
```typescript
private getColorBrightness(hexColor: string): number {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
}
```

---

## 5. 全局常量与配置

### 5.1 投影锚点
```typescript
const GLOBAL_LAT = 34.26; // 长安纬度，用于全局网格对齐
const GLOBAL_LNG = 108.94; // 长安经度
```

### 5.2 六边形参数
```typescript
const HEX_RADIUS = 0.15; // 度
const HEX_DISTANCE = Math.sqrt(3) * HEX_RADIUS; // 邻居距离
```

### 5.3 性能阈值
```typescript
const MIN_ZOOM_FOR_GRID = 7; // 网格显示最小缩放级别
const MIN_ZOOM_FOR_MAP = 7;  // 地图最小缩放级别
const MAX_ZOOM = 12;         // 地图最大缩放级别
```

---

## 6. 已知问题与未来优化

### 6.1 地图瓦片
- **当前**: 仅有 Zoom 9 一层瓦片
- **问题**: 无法流畅缩小到全国视角
- **建议**: 生成 Zoom 6-8 的低分辨率瓦片

### 6.2 领土扩张
- **当前**: 固定半径 1 (7 格)
- **未来**: 支持动态扩张、领土争夺

### 6.3 性能优化
- **当前**: 每次移动/缩放都重新计算所有领土
- **优化**: 实现领土缓存、增量更新

---

## 7. 文件结构

```
src/
├── map/
│   ├── GameMap.ts           # 地图初始化与配置
│   └── TileMapConfig.ts     # 瓦片路径配置
├── systems/
│   └── GridSystem.ts        # 六边形数学计算
├── core/
│   ├── CityManager.ts       # 城市与领土管理
│   ├── FactionManager.ts    # 势力管理
│   └── GridManager.ts       # 网格渲染与切换
├── types/
│   └── core.ts              # 类型定义
└── main.ts                  # 入口文件
```

---

## 8. 调试技巧

### 8.1 查看六边形坐标
```typescript
console.log('Hex Axial:', GridSystem.latLngToAxial(lat, lng, GLOBAL_LAT));
```

### 8.2 统计领土分配
```typescript
cityHexCounts.forEach((count, cityId) => {
    console.log(`${cityId}: ${count} hexes`);
});
```

### 8.3 检查颜色亮度
```typescript
console.log('Brightness:', this.getColorBrightness('#FFFACD'));
```

---

**文档版本**: 1.0  
**最后更新**: 2025-11-20  
**维护者**: MAPWAR Development Team
