---
title: 历史事件显示优化
summary: 分析历史事件列表的显示问题，并提出按季节过滤与 UI 层级调整方案。
owner: GAKU
status: active
last_updated: 2025-11-02
phase: production
---
# 历史事件显示优化

## 问题分析

### 原有问题
1. **显示粒度不正确**：事件按年份显示，而不是按季度显示
2. **信息过载**：一年中所有季度的事件都会同时显示
3. **时间精度丢失**：无法区分同一年不同季度发生的事件

### 原有代码
```javascript
// 只过滤年份，不过滤季节
const currentYearEvents = this.eventLog.filter(e => e.year === this.currentYear);
```

## 优化方案

### 1. 当前事件显示（按季度）
**改进**：只显示当前年份+当前季节的事件

```javascript
// 获取当前季度的事件（年份+季节）
const currentSeasonEvents = this.eventLog.filter(e => 
    e.year === this.currentYear && 
    e.season === this.currentSeasonIndex
);
```

**显示效果**：
```
📅 公元前230年 春季
秦军暗渡黄河，突袭韩都新郑。
```

### 2. 历史事件分组（按季度）
**改进**：历史事件按"年份-季节"分组，而不是只按年份

```javascript
// 按"年份-季节"分组
const eventsByTime = new Map();
this.eventLog.forEach(event => {
    if (event.year !== this.currentYear || event.season !== this.currentSeasonIndex) {
        const timeKey = `${event.year}-${event.season}`;
        if (!eventsByTime.has(timeKey)) {
            eventsByTime.set(timeKey, {
                year: event.year,
                season: event.season,
                seasonName: event.seasonName,
                events: []
            });
        }
        eventsByTime.get(timeKey).events.push(event);
    }
});
```

**排序逻辑**：
```javascript
// 按时间倒序（年份倒序，同年按季节倒序）
const sortedTimes = Array.from(eventsByTime.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.season - a.season;
});
```

**显示效果**：
```
历史事件
▼

公元前230年 春季
秦军暗渡黄河，突袭韩都新郑。

公元前229年 夏季
秦将王翦使离间计杀赵将李牧。
```

## 优化效果

### 优点
1. ✅ **精确显示**：只显示当前季度发生的事件
2. ✅ **避免信息过载**：不会一次性显示一整年的事件
3. ✅ **时间线清晰**：历史事件按季度分组，时间脉络更清晰
4. ✅ **符合游戏节奏**：游戏按季度推进，事件显示也按季度

### 对比

| 项目 | 优化前 | 优化后 |
|------|--------|--------|
| 当前事件 | 显示整年 | 只显示当前季度 |
| 历史分组 | 按年份 | 按年份+季节 |
| 时间精度 | 年 | 季度 |
| 信息密度 | 高（过载） | 适中 |

## 实现细节

### 修改的文件
- `game.js` - `updateEventNotificationDisplay()` 方法

### 关键改动
1. 过滤条件：从 `year` 改为 `year + season`
2. 分组键：从 `year` 改为 `year-season`
3. 标题显示：从 `公元前230年` 改为 `公元前230年 春季`
4. 历史排序：增加季节排序逻辑

## 建议

### 进一步优化建议
1. **事件预告**：显示下一季度即将发生的事件
2. **事件搜索**：添加历史事件搜索功能
3. **事件筛选**：按事件类型（战争、政治、经济等）筛选
4. **时间轴视图**：可视化的时间轴展示历史事件

### 性能优化
- 当前实现已经很高效，使用Map进行分组
- 如果事件数量超过1000条，可以考虑：
  - 分页显示历史事件
  - 虚拟滚动
  - 懒加载

## 测试建议

### 测试场景
1. **单季度单事件**：验证正常显示
2. **单季度多事件**：验证多个事件正确显示
3. **跨季度事件**：验证不同季度的事件不会混在一起
4. **历史事件展开**：验证历史事件按季度正确分组
5. **时间排序**：验证历史事件按时间倒序正确排列

### 验证点
- ✅ 当前季度只显示当前季度的事件
- ✅ 标题显示"年份 + 季节"
- ✅ 历史事件按"年份-季节"分组
- ✅ 历史事件按时间倒序排列
- ✅ 展开/收起功能正常工作
