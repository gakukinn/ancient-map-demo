---
title: 野战配置说明
summary: 定义 field_battle 事件的 JSON 结构、参数含义与示例。
owner: GAKU
status: active
last_updated: 2025-11-02
phase: production
---
# 野战配置说明

## 野战配置格式

野战事件使用以下格式：

```javascript
{
    type: "field_battle",
    location: { latitude: 38.03, longitude: 114.15 }, // 战场坐标（推荐）
    // 或者
    // location: "city_id", // 城市ID（也支持）
    battleName: "井陉之战",
    factions: [
        { factionId: "qi", troops: 10000 },
        { factionId: "zhao", troops: 10000 }
    ]
    // duration 字段已废弃，战斗时长会自动根据双方兵力计算
}
```

## 配置说明

### location（战场位置）

**推荐格式：坐标对象**
```javascript
location: { latitude: 38.03, longitude: 114.15 }
```

**也支持：城市ID**
```javascript
location: "xuzhou"
```

### battleName（战斗名称）

显示在地图上的战斗名称，例如：
- "井陉之战"
- "彭城之战"
- "垓下之战"

### factions（参战势力）

必须是2个势力，每个势力包含：
- `factionId`: 势力ID
- `troops`: 兵力数量（固定10000）

### duration（战斗时长）

**已废弃！** 战斗时长现在会自动根据双方总兵力计算：

```javascript
duration = calculateBattleDuration(faction1.troops, faction2.troops)
```

计算公式：
- 基础时间：10秒
- 每1000兵力增加1秒
- 例如：10000 vs 10000 = 30秒

## UI显示

野战在地图上会显示为：

```
┌─────────────┐
│  井陉之战   │  ← 战斗名称（黑底白字）
└─────────────┘
      ⚔          ← 交叉剑图标
     ◯◯◯         ← 红色进度圈
   (  ○  )       ← 半透明红色背景
```

## 示例配置

### 井陉之战（使用坐标）

```javascript
{
    id: "battle_of_jingxing",
    year: -204,
    season: 0,
    title: "井陉之战",
    description: "汉军韩信，千里迂回，在井陉关与赵军背水一战。",
    actions: [
        {
            type: "field_battle",
            location: { latitude: 38.03, longitude: 114.15 },
            battleName: "井陉之战",
            factions: [
                { factionId: "qi", troops: 10000 },
                { factionId: "zhao", troops: 10000 }
            ]
        },
        {
            type: "transfer_city",
            cityId: "handan",
            fromFactionId: "zhao",
            toFactionId: "qi"
        }
    ]
}
```

### 彭城之战（使用城市ID）

```javascript
{
    id: "battle_of_pengcheng",
    year: -205,
    season: 1,
    title: "彭城之战",
    description: "汉军挺进楚都彭城，项羽率军突袭，楚汉决战彭城。",
    actions: [
        {
            type: "field_battle",
            location: "xuzhou",
            battleName: "彭城之战",
            factions: [
                { factionId: "qi", troops: 10000 },
                { factionId: "chu", troops: 10000 }
            ]
        },
        {
            type: "transfer_city",
            cityId: "luoyang",
            fromFactionId: "qin",
            toFactionId: "qi"
        }
    ]
}
```

## 注意事项

1. **location 推荐使用坐标**：更精确，可以在任意位置显示战场
2. **duration 字段可以删除**：会自动计算，保留也不影响（会被覆盖）
3. **兵力固定10000**：遵循野战规则，双方各10000兵
4. **战斗名称必填**：否则显示为"野战"

## 更新日志

- **2025-11-02**: 战斗时长改为自动计算，基于双方总兵力
- **2025-11-02**: location 支持坐标对象格式
- **2025-11-02**: 删除进度百分比显示
- **2025-11-02**: 增强野战UI显示效果
