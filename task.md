# 任务清单

## 基础与稳定性修复
- [ ] **修复历史事件冲突**
    - [ ] 修改 `HistoricalEventManager.ts` 中的 `eventId` 生成逻辑，包含索引以支持同季度多事件。
    - [x] Implement `pickCityFromMap` logic
- [x] Bind map-picking buttons to trigger cross-module city lookup
- [x] Audit faction revival conditions (cities, armies, capital)
- [x] Verify revival captial capture and garrison
- [x] Audit army combat directions (6 vs 8)
    - [x] Identify restriction in OrientationSystem.ts
    - [x] Update get8DirectionFromAngle to support 8 directions
    - [x] Verify 8-directional facing in game
- [x] Adjust Reinforcement Range (2 -> 1)
    - [x] Update DISTANCE_THRESHOLDS.REINFORCEMENT_RANGE in DistanceUtils.ts
    - [x] Replace hardcoded range in SiegeManager.ts
    - [x] Verify 1-hex reinforcement range in game
- [x] Verify search performance with long city lists
- [x] Verify map-picking accuracy
- [x] Verify persistence of captured city IDs
- [ ] **统一距离常量**
    - [ ] 在 `GameConfig.ts` 中定义统一的距离阈值 (参战, 到达, 自动加入)。
    - [ ] 更新 `SiegeManager.ts`, `FieldBattleManager.ts`, `DistanceUtils.ts` 使用这些常量。

## 逻辑一致性修复
- [ ] **统一玩家撤退与参战逻辑**
    - [ ] 将重复的 `checkPlayerParticipation` 逻辑提取到 `CombatSystem` 或 `Player` 中 (或者仅确保两者使用相同的常量).
    - [x] Phase 2: Searchable City Selection (implemented via `datalist` and search-normalization)
- [x] Phase 3: Map-Picking Functionality (implemented `pickCityFromMap` and integrated into all forms)
    - [ ] 确保 `FieldBattleManager` 和 `SiegeManager` 在玩家战败后的撤退行为一致。

## 军制与平衡 (Military Balance)
- [x] **城市层级重定义 (Redefine City Hierarchy)**
    - [x] **四大都城 (The Four Capitals)**: 类型统一为 `capital`
        - [x] 长安 (Chang'an), 洛阳 (Luoyang/Sanchuan), 北京 (Youzhou), 南京 (Jinling)
        - [x] **初始兵力**: 20,000 (史实常备精锐)
    - [x] **巨城 (Huge City)**: `huge_city`
        - [x] 邯郸、成都、寿春等郡治/省会级。
        - [x] **初始兵力**: 10,000 (足以维持区域稳定)
    - [x] **中城 (Medium City)**: `large_city` (作为中城使用)
        - [x] 临颍、真定、长子等县治。
        - [x] **初始兵力**: 3,000 (基本的县级守备)
    - [x] **小城 (Small City)**: `small_city`
        - [x] 待定/补充。
        - [x] **初始兵力**: 1,000
    - [x] **关隘 (Pass)**: `pass` / `mountain_pass`
        - [x] 守备虽少但地利极高。
        - [x] **初始兵力**: 2,000
- [x] **执行数据修改**
    - [x] 修改 `cities.ts` 中上述城市的 `type` 和 `troops`。

## 验证
- [x] **史实自动配速 (Auto-Pacing)**：已实现基于 EndYear 的自动计算。
- [ ] 验证同季度多事件能否触发。
- [ ] 验证战斗距离判定是否一致。

## Commercialization Pivot (Interactive Sandbox)
- [ ] **Interactive "God Mode" (Playable Sandbox)**
    - [ ] **Selection System**: Implement mouse click to select armies/cities.
    - [ ] **Command Panel**: UI to control selected unit (Kill, Heal, Change Target).
    - [ ] **Instant Spawn**: Shift+Click to spawn random units for chaos testing.
- [x] **Web Release Prep**
    - [x] Remove hardcoded script dependencies (Make it playable without `script.json`).
    - [x] Build & Deploy to Vercel/Itch.io.
    - [x] Configure GitHub Pages Source to "GitHub Actions" (User confirmed).
