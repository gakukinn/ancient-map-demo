---
title: MAPWAR 战术战斗系统技术文档
summary: 描述战术战斗模块的系统架构、数据流、关键类与扩展接口。
owner: GAKU
status: active
last_updated: 2025-11-05
phase: production
---
# MAPWAR 战术战斗系统技术文档

## 文档概述

**文档版本**: 1.0
**创建日期**: 2025-11-05
**文档目的**: 详细记录战术战斗子系统的完整设计和实现方案
**灵感来源**: 三国群英传4 战术战斗系统

---

## 1. 项目背景

### 1.1 当前战斗系统现状

**现有系统**：
- 战略地图上的军队相遇自动战斗
- 简单的伤亡计算（基于时间和兵力）
- 玩家只能选择加入哪一方
- 战斗过程不可见，只看到结果
- 无战术操作空间

**问题**：
- ❌ 缺乏玩家参与感
- ❌ 战斗结果随机性强
- ❌ 无法体现玩家实力
- ❌ 游戏深度不足

### 1.2 战术战斗系统目标

**核心目标**：
- ✅ 从战略地图切换到战术战场
- ✅ 玩家可以排兵布阵
- ✅ 三兵种系统（步兵、骑兵、弓箭手）
- ✅ 回合制战术操作
- ✅ 中等难度AI对手
- ✅ 战斗结果返回战略地图

**设计原则**：
1. **渐进增强**：MVP先实现核心功能，后续扩展
2. **数据一致性**：战术战斗与战略地图数据同步
3. **性能优先**：流畅的战斗体验（60 FPS）
4. **易于扩展**：为未来功能（地形、技能等）预留接口

---

## 2. 系统架构

### 2.1 整体流程

```
战略地图（game.js）
    ↓
军队相遇，触发战斗
    ↓
显示 BattleJoinDialog（选择阵营）
    ↓
玩家确认 → 启动战术战斗
    ↓
┌─────────────────────────────────┐
│ BattleManager.start()           │
│  ├─ 初始化战场                   │
│  ├─ 部署阶段（Deployment）       │
│  ├─ 战斗阶段（Combat）           │
│  └─ 结算阶段（Resolution）       │
└─────────────────────────────────┘
    ↓
返回战斗结果
    ↓
战略地图应用结果（伤亡、功勋）
```

### 2.2 显示方式：模态覆盖层

**技术方案**：
- 在当前页面上创建全屏覆盖层
- 覆盖层包含战斗Canvas和UI
- 战略地图保持在后台（暂停更新）
- 战斗结束后移除覆盖层

**优点**：
- 游戏状态自动保留
- 无需页面跳转
- 实现简单，风险低
- 后期可升级为独立页面

**HTML结构**：
```html
<div id="battle-overlay" class="battle-overlay hidden">
    <div class="battle-container">
        <canvas id="battle-canvas"></canvas>
        <div class="battle-hud">
            <!-- 战斗UI -->
        </div>
    </div>
</div>
```

**CSS样式**：
```css
.battle-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.battle-overlay.hidden {
    display: none;
}
```

---

## 3. 三兵种系统设计

### 3.1 兵种属性表

| 兵种 | 血量 | 攻击 | 防御 | 速度 | 射程 | 特点 |
|------|------|------|------|------|------|------|
| **步兵** (Infantry) | 120 | 25 | 15 | 2 | 1 | 高防御，前排肉盾 |
| **骑兵** (Cavalry) | 80 | 35 | 8 | 4 | 1 | 高速度，高攻击，快速突袭 |
| **弓箭手** (Archer) | 60 | 30 | 5 | 2 | 3 | 远程攻击，脆弱 |

### 3.2 属性说明

**血量（Health）**：
- 单位能承受的总伤害
- 降到0时单位死亡
- 战斗结束后不恢复（伤亡永久）

**攻击（Attack）**：
- 每次攻击造成的基础伤害
- 实际伤害 = 攻击 - 敌方防御
- 最小伤害为1（防御不能完全抵消）

**防御（Defense）**：
- 减少受到的伤害
- 防御越高，生存能力越强

**速度（Speed）**：
- 每回合可移动的格子数
- 骑兵速度最快，可快速包抄

**射程（Range）**：
- 攻击距离（格子数）
- 弓箭手射程3，可远程打击
- 步兵和骑兵射程1（近战）

### 3.3 兵种相克关系

**设计理念**：无硬性相克，靠战术取胜

**战术特点**：
- **步兵**：适合守卫关键位置，保护弓箭手
- **骑兵**：适合快速机动，侧翼包抄，击杀弓箭手
- **弓箭手**：适合后排输出，远程消耗敌人

**推荐配置**（每方10个单位）：
- 方案1：4步兵 + 3骑兵 + 3弓箭手（平衡）
- 方案2：5步兵 + 2骑兵 + 3弓箭手（防守）
- 方案3：3步兵 + 5骑兵 + 2弓箭手（进攻）

### 3.4 单位数据结构

```javascript
class BattleUnit {
    constructor(config) {
        // 基础属性
        this.id = generateUniqueId();
        this.type = config.type; // 'infantry' | 'cavalry' | 'archer'
        this.factionId = config.factionId;

        // 战斗属性
        this.maxHealth = config.maxHealth;
        this.health = config.maxHealth;
        this.attack = config.attack;
        this.defense = config.defense;
        this.speed = config.speed;
        this.range = config.range;

        // 战场状态
        this.position = { x: -1, y: -1 }; // 网格坐标
        this.deployed = false;
        this.alive = true;
        this.acted = false; // 本回合是否已行动

        // 视觉属性
        this.color = getFactionColor(factionId);
        this.sprite = getUnitSprite(type);
    }

    // 计算伤害
    calculateDamage(target) {
        const baseDamage = this.attack - target.defense;
        return Math.max(1, baseDamage); // 最小伤害1
    }

    // 攻击目标
    attack(target) {
        const damage = this.calculateDamage(target);
        target.takeDamage(damage);
        return damage;
    }

    // 受到伤害
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }

    // 是否在攻击范围内
    inRange(target) {
        const distance = Math.abs(this.position.x - target.position.x) +
                        Math.abs(this.position.y - target.position.y);
        return distance <= this.range;
    }

    // 可移动的格子
    getValidMoves(grid) {
        const moves = [];
        for (let dx = -this.speed; dx <= this.speed; dx++) {
            for (let dy = -this.speed; dy <= this.speed; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= this.speed) {
                    const newX = this.position.x + dx;
                    const newY = this.position.y + dy;
                    if (grid.isValid(newX, newY) && !grid.isOccupied(newX, newY)) {
                        moves.push({ x: newX, y: newY });
                    }
                }
            }
        }
        return moves;
    }
}
```

---

## 4. 战场网格系统

### 4.1 网格设计

**尺寸**：12列 × 10行 = 120个格子

**格子大小**：60像素 × 60像素

**总Canvas尺寸**：720像素 × 600像素

**坐标系统**：
- 左上角 (0, 0)
- 右下角 (11, 9)
- X轴向右递增，Y轴向下递增

### 4.2 网格数据结构

```javascript
class BattleGrid {
    constructor() {
        this.width = 12;
        this.height = 10;
        this.cellSize = 60;

        // 网格状态
        this.cells = [];
        for (let y = 0; y < this.height; y++) {
            this.cells[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = {
                    x, y,
                    terrain: 'plains', // 地形（MVP只有平原）
                    unit: null,        // 占据的单位
                    passable: true,    // 是否可通过
                    highlighted: false // 是否高亮显示
                };
            }
        }
    }

    // 检查坐标有效性
    isValid(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // 检查格子是否被占据
    isOccupied(x, y) {
        if (!this.isValid(x, y)) return true;
        return this.cells[y][x].unit !== null;
    }

    // 放置单位
    placeUnit(unit, x, y) {
        if (!this.isValid(x, y) || this.isOccupied(x, y)) {
            return false;
        }
        this.cells[y][x].unit = unit;
        unit.position = { x, y };
        unit.deployed = true;
        return true;
    }

    // 移除单位
    removeUnit(x, y) {
        if (!this.isValid(x, y)) return null;
        const unit = this.cells[y][x].unit;
        this.cells[y][x].unit = null;
        return unit;
    }

    // 移动单位
    moveUnit(fromX, fromY, toX, toY) {
        const unit = this.removeUnit(fromX, fromY);
        if (unit) {
            return this.placeUnit(unit, toX, toY);
        }
        return false;
    }

    // 获取格子的单位
    getUnit(x, y) {
        if (!this.isValid(x, y)) return null;
        return this.cells[y][x].unit;
    }

    // 屏幕坐标转网格坐标
    screenToGrid(screenX, screenY) {
        return {
            x: Math.floor(screenX / this.cellSize),
            y: Math.floor(screenY / this.cellSize)
        };
    }

    // 网格坐标转屏幕坐标（中心点）
    gridToScreen(gridX, gridY) {
        return {
            x: gridX * this.cellSize + this.cellSize / 2,
            y: gridY * this.cellSize + this.cellSize / 2
        };
    }
}
```

### 4.3 部署区域

**双方部署区域**：

```
己方部署区（左侧）：
X: 0-2（3列）
Y: 0-9（全部行）

敌方部署区（右侧）：
X: 9-11（3列）
Y: 0-9（全部行）

中间战场：
X: 3-8（6列）
Y: 0-9（全部行）
```

**可视化**：
```
0  1  2  3  4  5  6  7  8  9  10 11
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│我│我│我│  │  │  │  │  │  │敌│敌│敌│ 0
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│我│我│我│  │  │  │  │  │  │敌│敌│敌│ 1
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│我│我│我│  │  │  │  │  │  │敌│敌│敌│ 2
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
...
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
  部署区   战场              部署区
```

---

## 5. 战斗阶段设计

### 5.1 阶段1：部署（Deployment Phase）

**时长**：不限时（玩家确认后开始）

**流程**：
1. 显示空战场网格
2. 显示可部署的单位列表（根据兵力计算）
3. 玩家拖拽或点击放置单位到部署区
4. AI自动部署单位（随机或简单策略）
5. 玩家点击"开始战斗"按钮
6. 进入战斗阶段

**单位数量计算**：
```javascript
function calculateUnitCount(totalTroops) {
    // 每个战斗单位代表一定数量的士兵
    // 战术单位数量 = 总兵力 / 每单位代表的士兵数
    const TROOPS_PER_UNIT = 500; // 每个战术单位代表500士兵
    const unitCount = Math.floor(totalTroops / TROOPS_PER_UNIT);
    return Math.min(unitCount, 10); // 最多10个单位
}

// 示例：
// 玩家有5000兵 → 10个战术单位
// 敌人有3000兵 → 6个战术单位
```

**单位类型分配**：
```javascript
function allocateUnitTypes(unitCount) {
    // 默认配置：40%步兵，30%骑兵，30%弓箭手
    const infantry = Math.floor(unitCount * 0.4);
    const cavalry = Math.floor(unitCount * 0.3);
    const archer = unitCount - infantry - cavalry;

    return {
        infantry: Math.max(1, infantry),
        cavalry: Math.max(0, cavalry),
        archer: Math.max(0, archer)
    };
}
```

### 5.2 阶段2：战斗（Combat Phase）

**回合制机制**：
- 每回合包含：玩家回合 + AI回合
- 回合限时：30秒（时间到自动执行）
- 回合内可以移动所有单位并发动攻击

**玩家回合流程**：
```
1. 回合开始，重置所有单位的"已行动"标记
2. 显示倒计时（30秒）
3. 玩家选择单位：
   - 点击己方单位 → 高亮可移动格子
   - 点击目标格子 → 移动单位
   - 点击敌方单位（在射程内）→ 攻击
4. 玩家点击"结束回合"或倒计时结束
5. 执行所有移动和攻击
6. 切换到AI回合
```

**AI回合流程**：
```
1. 回合开始
2. AI分析战场：
   - 识别威胁（哪些单位危险）
   - 识别机会（哪些敌人可击杀）
   - 评估位置优势
3. AI为每个单位做决策：
   - 优先击杀残血敌人
   - 弓箭手保持距离
   - 骑兵冲向敌方弓箭手
   - 步兵保护己方弓箭手
4. 执行所有AI行动（带动画）
5. 切换回玩家回合
```

**胜利条件检查**：
每个回合结束后检查：
- 敌方全灭 → 玩家胜利
- 己方全灭 → 玩家失败
- 超过20回合 → 根据剩余血量判定胜负

### 5.3 阶段3：结算（Resolution Phase）

**结算内容**：
1. 显示战斗结果（胜利/失败）
2. 显示战斗统计：
   - 击杀敌军数量
   - 己方存活单位
   - 战斗回合数
   - 获得功勋
3. 计算伤亡转化为战略地图的兵力损失
4. 玩家点击"返回战略地图"

**伤亡计算**：
```javascript
function calculateCasualties(battleUnits, totalTroops) {
    // 战术层单位 → 战略层兵力
    const TROOPS_PER_UNIT = 500;

    let survivedUnits = 0;
    let totalHealth = 0;
    let maxHealth = 0;

    for (const unit of battleUnits) {
        if (unit.alive) {
            survivedUnits++;
            totalHealth += unit.health;
            maxHealth += unit.maxHealth;
        }
    }

    // 计算存活率
    const survivalRate = maxHealth > 0 ? totalHealth / maxHealth : 0;

    // 计算剩余兵力
    const remainingTroops = Math.floor(totalTroops * survivalRate);
    const casualties = totalTroops - remainingTroops;

    return {
        remainingTroops,
        casualties,
        survivalRate
    };
}
```

**功勋奖励**：
```javascript
function calculateMerit(battleResult) {
    let merit = 0;

    // 基础功勋（胜利）
    if (battleResult.victory) {
        merit += 50;
    }

    // 击杀奖励
    merit += battleResult.enemiesKilled * 5;

    // 效率奖励（低伤亡）
    if (battleResult.survivalRate > 0.8) {
        merit += 20; // 完美胜利
    }

    // 速战速决
    if (battleResult.rounds < 5) {
        merit += 10;
    }

    return merit;
}
```

---

## 6. AI系统设计（中等难度）

### 6.1 AI决策流程

```
每个AI回合：
1. 评估战场态势
   - 统计双方单位数量和血量
   - 识别关键目标（残血单位、弓箭手）
   - 评估威胁（哪些敌人危险）

2. 为每个单位分配任务：
   - 进攻型单位（骑兵）→ 冲击敌方后排
   - 防守型单位（步兵）→ 保护己方弓箭手
   - 输出型单位（弓箭手）→ 保持距离，集火目标

3. 执行行动：
   - 移动到最佳位置
   - 攻击优先目标
```

### 6.2 AI决策树

```javascript
class BattleAI {
    makeDecision(unit, battlefield) {
        // 1. 优先击杀残血敌人
        const lowHealthEnemies = this.findLowHealthEnemies(battlefield, unit);
        if (lowHealthEnemies.length > 0) {
            return this.attackTarget(unit, lowHealthEnemies[0]);
        }

        // 2. 弓箭手保持距离
        if (unit.type === 'archer') {
            const nearbyEnemies = this.findNearbyEnemies(battlefield, unit, 2);
            if (nearbyEnemies.length > 0) {
                return this.retreatFrom(unit, nearbyEnemies);
            }
        }

        // 3. 骑兵优先攻击敌方弓箭手
        if (unit.type === 'cavalry') {
            const enemyArchers = this.findEnemyArchers(battlefield);
            if (enemyArchers.length > 0) {
                return this.chargeTarget(unit, enemyArchers[0]);
            }
        }

        // 4. 步兵保护己方弓箭手
        if (unit.type === 'infantry') {
            const friendlyArchers = this.findFriendlyArchers(battlefield, unit);
            if (friendlyArchers.length > 0) {
                const threats = this.findThreatsTo(battlefield, friendlyArchers[0]);
                if (threats.length > 0) {
                    return this.interceptThreat(unit, threats[0]);
                }
            }
        }

        // 5. 默认：攻击最近的敌人
        const nearestEnemy = this.findNearestEnemy(battlefield, unit);
        if (nearestEnemy) {
            return this.approachAndAttack(unit, nearestEnemy);
        }

        // 6. 无目标：向前移动
        return this.moveForward(unit);
    }

    // 寻找残血敌人（血量<30%）
    findLowHealthEnemies(battlefield, unit) {
        return battlefield.getAllEnemyUnits(unit.factionId)
            .filter(enemy => enemy.alive && enemy.health / enemy.maxHealth < 0.3)
            .sort((a, b) => a.health - b.health);
    }

    // 攻击目标（移动 + 攻击）
    approachAndAttack(unit, target) {
        // 计算移动路径
        const path = this.findPath(unit.position, target.position, unit.speed);

        // 移动到目标附近
        if (path.length > 0) {
            const newPos = path[Math.min(path.length - 1, unit.speed - 1)];
            return {
                action: 'move',
                from: unit.position,
                to: newPos,
                thenAttack: unit.inRange(target) ? target : null
            };
        }

        // 已在范围内，直接攻击
        if (unit.inRange(target)) {
            return {
                action: 'attack',
                target: target
            };
        }

        return null;
    }
}
```

### 6.3 AI难度参数

**中等难度配置**：
```javascript
const AI_CONFIG = {
    difficulty: 'medium',
    thinkingDelay: 500,        // AI思考延迟（毫秒）
    actionDelay: 800,          // 每个行动间隔

    // 决策权重
    targetPriority: {
        lowHealth: 0.8,        // 优先打残血（80%权重）
        highThreat: 0.6,       // 优先打威胁单位
        archer: 0.7,           // 优先打弓箭手
        nearest: 0.4           // 优先打最近的
    },

    // 战术倾向
    tactics: {
        protectArchers: true,  // 保护己方弓箭手
        focusFire: true,       // 集火单个目标
        retreat: true,         // 残血撤退
        flank: false           // 侧翼包抄（高级AI才启用）
    }
};
```

---

## 7. 渲染系统设计

### 7.1 Canvas分层

**三层渲染**：
```
1. 背景层（Grid Layer）
   - 网格线
   - 格子底色
   - 部署区标记

2. 单位层（Unit Layer）
   - 单位图标/精灵
   - 血条
   - 状态图标

3. UI层（Overlay Layer）
   - 移动路径预览
   - 攻击范围指示
   - 选中高亮
   - 伤害数字飘字
```

### 7.2 BattleRenderer 类

```javascript
class BattleRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 720;  // 12 * 60
        this.canvas.height = 600; // 10 * 60

        this.cellSize = 60;
        this.selectedUnit = null;
        this.hoveredCell = null;
    }

    // 主渲染函数
    render(battleState) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderGrid(battleState.grid);
        this.renderUnits(battleState.units);
        this.renderUI(battleState);
    }

    // 渲染网格
    renderGrid(grid) {
        // 绘制格子
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.cells[y][x];

                // 格子底色
                if (x < 3) {
                    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // 己方部署区
                } else if (x > 8) {
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // 敌方部署区
                } else {
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.05)'; // 战场
                }

                this.ctx.fillRect(x * this.cellSize, y * this.cellSize,
                                 this.cellSize, this.cellSize);

                // 高亮格子
                if (cell.highlighted) {
                    this.ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize,
                                     this.cellSize, this.cellSize);
                }
            }
        }

        // 绘制网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= grid.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= grid.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }

    // 渲染单位
    renderUnits(units) {
        for (const unit of units) {
            if (!unit.alive || !unit.deployed) continue;

            const screenPos = {
                x: unit.position.x * this.cellSize + this.cellSize / 2,
                y: unit.position.y * this.cellSize + this.cellSize / 2
            };

            // 绘制单位图标（简化版：圆形 + 文字）
            this.ctx.fillStyle = unit.color;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
            this.ctx.fill();

            // 绘制兵种标识
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const label = unit.type === 'infantry' ? '步' :
                         unit.type === 'cavalry' ? '骑' : '弓';
            this.ctx.fillText(label, screenPos.x, screenPos.y);

            // 绘制血条
            this.renderHealthBar(unit, screenPos);

            // 选中高亮
            if (this.selectedUnit === unit) {
                this.ctx.strokeStyle = 'yellow';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    }

    // 渲染血条
    renderHealthBar(unit, screenPos) {
        const barWidth = 40;
        const barHeight = 4;
        const barX = screenPos.x - barWidth / 2;
        const barY = screenPos.y + 28;

        // 背景（红色）
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // 当前血量（绿色）
        const healthRatio = unit.health / unit.maxHealth;
        this.ctx.fillStyle = healthRatio > 0.5 ? 'rgba(34, 197, 94, 0.9)' :
                            healthRatio > 0.25 ? 'rgba(251, 191, 36, 0.9)' :
                            'rgba(239, 68, 68, 0.9)';
        this.ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }

    // 渲染UI层（移动范围、攻击范围等）
    renderUI(battleState) {
        if (!this.selectedUnit) return;

        // 显示可移动格子
        const validMoves = this.selectedUnit.getValidMoves(battleState.grid);
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        for (const move of validMoves) {
            this.ctx.fillRect(move.x * this.cellSize, move.y * this.cellSize,
                             this.cellSize, this.cellSize);
        }

        // 显示攻击范围
        const attackRange = this.getAttackRange(this.selectedUnit, battleState.grid);
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        for (const cell of attackRange) {
            this.ctx.fillRect(cell.x * this.cellSize, cell.y * this.cellSize,
                             this.cellSize, this.cellSize);
        }
    }

    // 获取攻击范围
    getAttackRange(unit, grid) {
        const range = [];
        const r = unit.range;

        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= r && (dx !== 0 || dy !== 0)) {
                    const x = unit.position.x + dx;
                    const y = unit.position.y + dy;
                    if (grid.isValid(x, y)) {
                        range.push({ x, y });
                    }
                }
            }
        }

        return range;
    }
}
```

### 7.3 动画系统

**移动动画**：
```javascript
class MoveAnimation {
    constructor(unit, from, to, duration = 500) {
        this.unit = unit;
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.startTime = Date.now();
        this.completed = false;
    }

    update() {
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);

        // 线性插值
        this.unit.visualPosition = {
            x: this.from.x + (this.to.x - this.from.x) * progress,
            y: this.from.y + (this.to.y - this.from.y) * progress
        };

        if (progress >= 1) {
            this.unit.visualPosition = this.to;
            this.completed = true;
        }
    }
}
```

**攻击动画**：
```javascript
class AttackAnimation {
    constructor(attacker, target, damage, duration = 300) {
        this.attacker = attacker;
        this.target = target;
        this.damage = damage;
        this.duration = duration;
        this.startTime = Date.now();
        this.completed = false;
    }

    update() {
        const elapsed = Date.now() - this.startTime;
        const progress = elapsed / this.duration;

        // 闪烁效果
        this.target.flash = Math.sin(progress * Math.PI * 4) > 0;

        // 伤害数字飘起
        this.damageText = {
            value: this.damage,
            alpha: 1 - progress,
            y: this.target.visualPosition.y - progress * 30
        };

        if (progress >= 1) {
            this.target.flash = false;
            this.completed = true;
        }
    }
}
```

---

## 8. 文件结构

### 8.1 新建文件清单

```
src/
├── battle/                          [新建目录]
│   ├── BattleConfig.js             [新建] 配置和常量
│   ├── BattleState.js              [新建] 战斗状态管理
│   ├── BattleManager.js            [新建] 战斗主控制器
│   ├── BattleGrid.js               [新建] 网格系统
│   ├── BattleUnit.js               [新建] 战术单位类
│   ├── BattleRenderer.js           [新建] Canvas渲染
│   ├── BattleAI.js                 [新建] AI决策系统
│   ├── BattlePhases.js             [新建] 战斗阶段控制
│   │   ├── DeploymentPhase.js      [新建] 部署阶段
│   │   ├── CombatPhase.js          [新建] 战斗阶段
│   │   └── ResolutionPhase.js      [新建] 结算阶段
│   └── BattleAnimations.js         [新建] 动画系统
├── ui/
│   └── BattleHUD.js                [新建] 战斗UI控制
└── ...现有文件...
```

### 8.2 修改文件清单

```
game.js                              [修改] 集成战术战斗系统
src/ui/BattleJoinDialog.js          [修改] 添加战术战斗入口
src/player/Player.js                [修改] 接收详细战斗结果
index.html                           [修改] 添加战斗覆盖层HTML
style.css                            [修改] 添加战斗界面样式
```

---

## 9. 实施阶段

### 9.1 阶段1：基础框架（第1-2天）

**任务**：
- [x] 创建技术文档
- [ ] 创建 BattleConfig.js（配置常量）
- [ ] 创建 BattleGrid.js（网格系统）
- [ ] 创建 BattleUnit.js（单位类）
- [ ] 创建 BattleState.js（状态管理）
- [ ] 创建 BattleManager.js（主控制器骨架）

**验收标准**：
- 能够创建战场网格
- 能够创建三种兵种的单位
- 状态管理器正常工作

### 9.2 阶段2：部署系统（第3-4天）

**任务**：
- [ ] 创建 DeploymentPhase.js
- [ ] 实现单位拖拽放置
- [ ] 实现AI自动部署
- [ ] 创建部署UI（单位列表、开始按钮）

**验收标准**：
- 玩家可以拖拽单位到部署区
- AI自动部署单位
- 点击"开始战斗"进入下一阶段

### 9.3 阶段3：战斗核心（第5-7天）

**任务**：
- [ ] 创建 CombatPhase.js
- [ ] 实现回合制逻辑
- [ ] 实现单位移动
- [ ] 实现单位攻击
- [ ] 创建 BattleAI.js（中等难度）
- [ ] 实现胜负判定

**验收标准**：
- 玩家回合可以移动和攻击
- AI回合正常运行
- 战斗可以正常结束

### 9.4 阶段4：渲染和动画（第8-10天）

**任务**：
- [ ] 创建 BattleRenderer.js
- [ ] 渲染网格和单位
- [ ] 渲染血条和状态
- [ ] 创建 BattleAnimations.js
- [ ] 实现移动动画
- [ ] 实现攻击动画
- [ ] 实现伤害数字

**验收标准**：
- 战场渲染正常
- 动画流畅（60 FPS）
- 视觉反馈清晰

### 9.5 阶段5：UI和HUD（第11-12天）

**任务**：
- [ ] 创建 BattleHUD.js
- [ ] 实现倒计时UI
- [ ] 实现单位信息面板
- [ ] 实现战斗日志
- [ ] 实现结算界面

**验收标准**：
- UI响应正确
- 信息显示清晰
- 用户体验良好

### 9.6 阶段6：集成和测试（第13-14天）

**任务**：
- [ ] 修改 game.js 集成战术战斗
- [ ] 修改 BattleJoinDialog.js
- [ ] 修改 Player.js 接收结果
- [ ] 测试完整流程
- [ ] 平衡三兵种数值
- [ ] 优化AI行为
- [ ] 修复Bug

**验收标准**：
- 战略地图 → 战术战斗 → 战略地图流程完整
- 数据正确同步
- 无严重Bug
- 性能达标（60 FPS）

---

## 10. 关键代码示例

### 10.1 BattleManager 主控制器

```javascript
// src/battle/BattleManager.js
import { BattleState } from './BattleState.js';
import { BattleRenderer } from './BattleRenderer.js';
import { DeploymentPhase } from './phases/DeploymentPhase.js';
import { CombatPhase } from './phases/CombatPhase.js';
import { ResolutionPhase } from './phases/ResolutionPhase.js';

export class BattleManager {
    constructor(config) {
        this.config = config; // { factions, location, playerSide, playerTroops }
        this.state = null;
        this.renderer = null;
        this.phase = null;
        this.overlay = null;
    }

    // 启动战术战斗
    async start() {
        // 1. 创建覆盖层
        this.createOverlay();

        // 2. 初始化战斗状态
        this.state = new BattleState(this.config);

        // 3. 初始化渲染器
        const canvas = document.getElementById('battle-canvas');
        this.renderer = new BattleRenderer(canvas);

        // 4. 运行战斗阶段
        try {
            // 部署阶段
            this.phase = new DeploymentPhase(this.state, this.renderer);
            await this.phase.execute();

            // 战斗阶段
            this.phase = new CombatPhase(this.state, this.renderer);
            const battleResult = await this.phase.execute();

            // 结算阶段
            this.phase = new ResolutionPhase(this.state, this.renderer, battleResult);
            const finalResult = await this.phase.execute();

            return finalResult;
        } finally {
            // 5. 清理覆盖层
            this.removeOverlay();
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'battle-overlay';
        this.overlay.className = 'battle-overlay';
        this.overlay.innerHTML = `
            <div class="battle-container">
                <canvas id="battle-canvas" width="720" height="600"></canvas>
                <div id="battle-hud" class="battle-hud"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
```

### 10.2 集成到 game.js

```javascript
// game.js 中修改 startFieldBattle 方法

import { BattleManager } from './src/battle/BattleManager.js';

async startFieldBattle(action, event) {
    // ... 现有逻辑 ...

    // 检查玩家是否参战
    if (this.player.inBattle && this.player.faction) {
        // 暂停游戏
        this.isPaused = true;

        // 准备战斗配置
        const battleConfig = {
            factions: [
                {
                    factionId: action.attacker.factionId,
                    troops: action.attacker.troops,
                    isPlayer: this.player.faction === action.attacker.factionId
                },
                {
                    factionId: action.defender.factionId,
                    troops: action.defender.troops,
                    isPlayer: this.player.faction === action.defender.factionId
                }
            ],
            location: action.location,
            playerTroops: this.player.troops
        };

        // 启动战术战斗
        const battleManager = new BattleManager(battleConfig);
        const battleResult = await battleManager.start();

        // 应用战斗结果
        this.player.endBattle(
            battleResult.victory,
            battleResult.enemiesKilled,
            battleResult.casualties
        );

        // 恢复游戏
        this.isPaused = false;
    }
}
```

---

## 11. 性能优化

### 11.1 渲染优化

**策略**：
- 使用 requestAnimationFrame 控制帧率
- 只在状态变化时重绘
- 使用离屏Canvas缓存静态元素

**实现**：
```javascript
class BattleRenderer {
    constructor(canvas) {
        // ...
        this.dirty = true;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    render(battleState) {
        if (!this.dirty) return;

        // 渲染到离屏Canvas
        this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderGrid(battleState.grid);
        this.renderUnits(battleState.units);

        // 一次性绘制到主Canvas
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        this.dirty = false;
    }

    markDirty() {
        this.dirty = true;
    }
}
```

### 11.2 AI优化

**策略**：
- 限制AI计算深度
- 使用启发式快速评估
- 避免复杂路径搜索

---

## 12. 测试计划

### 12.1 单元测试

- [ ] BattleUnit 属性计算正确性
- [ ] BattleGrid 坐标转换正确性
- [ ] 伤害计算公式验证
- [ ] 移动范围计算验证

### 12.2 集成测试

- [ ] 完整战斗流程（部署→战斗→结算）
- [ ] 数据同步（战术→战略）
- [ ] AI决策合理性
- [ ] 性能测试（帧率、内存）

### 12.3 平衡测试

- [ ] 三兵种平衡性
- [ ] AI难度合理性
- [ ] 战斗时长合理性
- [ ] 功勋奖励合理性

---

## 13. 后续扩展计划

### 13.1 阶段2扩展（未来）

**地形系统**：
- 森林（弓箭手隐蔽）
- 山地（骑兵速度减半）
- 河流（不可通过，需渡口）

**技能系统**：
- 将领技能（全军加攻、加速）
- 阵型加成（方阵、锥形阵）
- 特殊能力（齐射、冲锋）

**高级AI**：
- 侧翼包抄战术
- 诱敌深入
- 保存实力撤退

### 13.2 阶段3扩展（未来）

**多人战斗**：
- 三方混战
- 2v2联盟

**战役模式**：
- 多场战斗连续进行
- 伤兵可恢复

**独立页面升级**：
- 全屏横屏战斗界面
- 更丰富的视觉效果

---

## 14. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI太弱/太强 | 游戏性 | 多次测试调整，添加难度选项 |
| 性能问题（动画卡顿） | 体验 | 优化渲染，降低动画复杂度 |
| 三兵种不平衡 | 游戏性 | 数值测试，玩家反馈调整 |
| 战斗时间过长 | 体验 | 限制回合数，加快动画速度 |
| 状态同步错误 | 功能 | 严格测试数据流，添加校验 |

---

## 15. 总结

### 15.1 MVP核心功能

✅ 12x10网格战场
✅ 三兵种系统（步、骑、弓）
✅ 部署阶段（玩家布局）
✅ 回合制战斗（30秒限时）
✅ 中等AI对手
✅ 动画和视觉反馈
✅ 战斗结果返回战略地图

### 15.2 预计成果

**开发时间**：1-2周（全职）或 3-4周（业余）
**代码量**：2000-3000行
**体验提升**：将战斗从"黑盒"变为"战术博弈"
**扩展性**：为未来高级功能预留接口

---

**文档版本**: 1.0
**最后更新**: 2025-11-05
**文档状态**: 完整，准备实施
**作者**: AI Assistant
**审核**: 待用户确认

---

**致未来的AI**：
这份文档包含了战术战斗系统的完整设计。请严格遵循：
1. **MVP优先**：先实现基础功能，确保可玩性
2. **数据一致性**：战术层与战略层数据必须正确同步
3. **性能优先**：确保60 FPS，动画流畅
4. **用户体验**：清晰的UI，明确的反馈
5. **遵循项目规范**：与现有代码风格保持一致

**关键决策记录**：
- 三兵种系统（步、骑、弓）- 用户确认
- 模态覆盖层显示 - 用户确认
- 回合制 + 30秒限时 - 用户确认
- 中等难度AI - 用户确认
- MVP阶段先实现 - 用户确认
