# AI 自动战斗系统设计文档 (AI Auto-Battle System Design)

## 1. 设计愿景 (Vision)
将当前的 "Frontline AI"（简单的距离驱动攻击）升级为分层决策系统。AI 不应该是一个个独立的敢死队，而应表现出**国家意志**和**战术协同**。

- **从 "Random Walk" 到 "Strategic Operation"**：不再随机攻击最近的城市，而是有计划地推进。
- **从 "Suicide Attacks" 到 "Survival Instincts"**：残血部队知道撤退和补给。
- **从 "Solo" 到 "Swarm"**：懂得集结优势兵力攻打重镇。

---

## 2. 核心架构：三层决策模型 (Three-Layer Decision Model)

### 2.1 L1: 战略层 (Strategy Layer) - "决定打哪里？"
**负责实体**：`FactionManager` (新增/扩充)
每个阵营（Faction）拥有一个全局大脑，每隔一段时间（如 1-5 秒）分析局势：
- **威胁评估**：识别前线最危险的敌方据点。
- **进攻重心**：根据国力决定是全面进攻还是重点突破。
- **防御请求**：当己方城市受到威胁时，发布全剧广播“求救信号”。

### 2.2 L2: 战术层 (Tactics Layer) - "怎么打？"
**负责实体**：`LegionManager` (基于 FSM)
每个军团根据自身状态和战略目标，决定当前的任务状态（State）：

| 状态 (State) | 触发条件 (Trigger) | 行为 (Behavior) |
|---|---|---|
| **IDLE (待命)** | 无指令，健康 | 在最近的己方城市/关隘巡逻或驻扎。 |
| **OFFENSE (进攻)** | 战略层下达攻城指令 | 移动向目标城市，途中主动攻击敌军。 |
| **DEFEND (防守)** | 收到“求救信号”且距离较近 | 移动向受威胁的己方城市，拦截敌军。 |
| **RALLY (集结)** | 目标城市过于强大 | 移动到前线集结点，等待友军数量达到阈值。 |
| **REST (休整)** | 兵力 < 30% 或 士气低 | 撤退到最近的安全后方城市恢复。 |

### 2.3 L3: 执行层 (Execution Layer) - "怎么走？"
**负责实体**：`HexPathFinder` & `ContactEngine`
- **六边形吸附移动 (Hex Snapping)**: 移动是平滑动画，但停止时（到达目的地、战斗触发、下令停止）**强制吸附到六边形中心**。
- **避障微操**：不仅避开地形，还要评估路径上的敌军威胁度。
- **包围机动**：如果可能，尝试切断敌军退路（配合 "推挤" 机制）。

---

## 3. 详细功能模块

### 3.1 有限状态机 (Finite State Machine, FSM)
为每个 `Army` 对象引入 `AIState`：
```typescript
enum AIState {
    IDLE = 'IDLE',
    MOVING_TO_ATTACK = 'MOVING_TO_ATTACK',
    MOVING_TO_DEFEND = 'MOVING_TO_DEFEND',
    RETREATING = 'RETREATING',
    IN_COMBAT = 'IN_COMBAT'
}
```

### 3.2 补给与士气系统 (Resupply Logic)
- **回城判定**：当兵力低于阈值（如 30-40%）时，AI 必须强制切换为 `RETREATING` 状态。
- **安全城市寻找**：寻找最近的、未被围困的己方城市。
- **恢复速度**：在城内每秒恢复 X% 兵力，直到满员后切换回 `IDLE`。

### 3.3 动态防守 (Dynamic Defense)
- 当城市检测到各范围内有敌军时，向所属阵营的 `LegionManager` 发出 `CallToArms` 事件。
- 附近的空闲军团（IDLE）计算距离，最近的 N 个军团响应呼叫，切换为 `DEFEND` 状态。

---

## 4. 实施路线图 (Implementation Roadmap)

### Phase 1: 基础生存 (Survival Basics)
- [ ] 为 Army 添加 `AIState` 属性。
- [ ] 实现 `REST` (撤退补给) 逻辑：残血自动回城。
- [ ] 实现简单的状态切换：满血出击 -> 残血撤退 -> 满血再出击。
- **目标**：形成拉锯战，不再是一波流送死。

### Phase 2: 动态防守 (Active Defense)
- [ ] 城市被攻击时广播事件。
- [ ] 附近 AI 军团优先回防。
- **目标**：玩家攻城时会遭遇敌方援军，增加难度。

### Phase 3: 战略集结 (Strategic Rally)
- [ ] 实现 "集结" 逻辑：弱小军团不敢单挑大城，会等待友军。
- [ ] 引入 `FactionManager` 进行宏观调控。
- **目标**：模拟真实战争中的兵团作战。

---
