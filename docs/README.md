---
title: MAPWAR 文档索引
summary: 分层整理的 MAPWAR 项目文档导航，含时间线与 AI 阅读顺序建议。
owner: GAKU
status: active
last_updated: 2025-11-06
phase: production
---
# MAPWAR 文档索引

## 快速入口
- `_meta/timeline.md`：按发布时间梳理关键文档，推荐先从时间线了解演进。
- `_meta/inventory.md`：查看完整清单与清理建议，评估重复或待合并文档。
- `00-meta/更新日志.md`：记录版本更迭，适合建立历史对照。

## 分层目录
### 00-meta · 规划与里程碑
- 2025-10-31 — [TECHNICAL_ROADMAP_CN.md](00-meta/TECHNICAL_ROADMAP_CN.md)：后续重构路线、风险与优先级。
- 2025-10-31 — [更新日志.md](00-meta/更新日志.md)：版本更新记录。

> **注意**：旧的规划文档已移至 `archive/old_plans/`

### 01-overview · 顶层视图
- 2025-10-31 — [游戏设计文档.md](01-overview/游戏设计文档.md)：最初的高层设计蓝图，供背景补充。

> **注意**：旧的概述文档已移至 `archive/old_overviews/`

### 02-design · 系统设计
**battle/**
- 2025-11-02 — [BATTLE_SYSTEM_NOTES.md](02-design/battle/BATTLE_SYSTEM_NOTES.md)：围攻战算法与伤亡计算草案。
- 2025-11-02 — [FIELD_BATTLE_CONFIG.md](02-design/battle/FIELD_BATTLE_CONFIG.md)：野战事件配置字段说明。
- 2025-11-05 — [TACTICAL_BATTLE_SYSTEM.md](02-design/battle/TACTICAL_BATTLE_SYSTEM.md)：战术战斗模块结构与 API。
- 2025-11-05 — [TACTICAL_BATTLE_INTEGRATION.md](02-design/battle/TACTICAL_BATTLE_INTEGRATION.md)：战术战斗集成汇报与风险记录。
- 2025-11-05 — [MULTI_FACTION_BATTLE_UPDATE.md](02-design/battle/MULTI_FACTION_BATTLE_UPDATE.md)：多势力混战支持与新增流程。

**world/**
- 2025-11-05 — [TILE_MAP_IMPLEMENTATION.md](02-design/world/TILE_MAP_IMPLEMENTATION.md)：瓦片地图渲染实现细节。
- 2025-11-05 — [TILEMAP_USAGE.md](02-design/world/TILEMAP_USAGE.md)：编辑器与数据使用指南。
- 2025-11-05 — [EVENT_DISPLAY_OPTIMIZATION.md](02-design/world/EVENT_DISPLAY_OPTIMIZATION.md)：历史事件渲染性能优化。
- 2025-11-06 — [20251106CITY_ICON_SYSTEM.md](02-design/world/20251106CITY_ICON_SYSTEM.md)：城市图标层与样式策略。
- 2025-11-06 — [TERRAIN_OVERLAY_SYSTEM.md](02-design/world/TERRAIN_OVERLAY_SYSTEM.md)：地形通行层算法与 Zoom 9 优化。
- 2025-11-06 — [地形通行层使用说明.md](02-design/world/地形通行层使用说明.md)：地形覆盖层的实际操作说明。
- 2025-11-06 — [ZOOM_LEVELS_GUIDE.md](02-design/world/ZOOM_LEVELS_GUIDE.md)：缩放级别配置与展示策略。

**systems/**
- 2025-11-01 — [PLAYER_SYSTEM.md](02-design/systems/PLAYER_SYSTEM.md)：玩家成长与功勋机制。
- 2025-11-01 — [OPTIMIZATION_ANALYSIS.md](02-design/systems/OPTIMIZATION_ANALYSIS.md)：性能瓶颈分析与建议。
- 2025-10-31 — [势力配置说明.md](02-design/systems/势力配置说明.md)：七国势力数据说明。
- 2025-10-31 — [历史事件说明.md](02-design/systems/历史事件说明.md)：历史事件数据结构与样例。

### 03-runtime · 运行与测试
- 2025-10-31 — [DEV_GUIDE.md](03-runtime/DEV_GUIDE.md)：开发环境搭建与基本命令。
- 2025-10-31 — [CHECKLIST.md](03-runtime/CHECKLIST.md)：版本发布前检查项。
- 2025-10-31 — [TEST_INSTRUCTIONS.md](03-runtime/TEST_INSTRUCTIONS.md)：测试覆盖点与手动验证流程。
- 2025-11-01 — [HOW_TO_RUN.md](03-runtime/HOW_TO_RUN.md)：运行/调试项目的完整指南。
- 2025-11-05 — [如何启动地图测试.md](03-runtime/如何启动地图测试.md)：地图调试模式启动步骤。

### 04-ai-export · AI 工具链
- 2025-11-05 — [SKILL_SEEKERS_SETUP.md](04-ai-export/SKILL_SEEKERS_SETUP.md)：Skill Seekers 环境搭建全流程。
- 2025-11-05 — [如何为MAPWAR创建Claude技能.md](04-ai-export/如何为MAPWAR创建Claude技能.md)：Claude 技能包制作快速说明。
- 2025-11-05 — [技能包上传指南.md](04-ai-export/技能包上传指南.md)：上传检查清单与注意事项。
- 2025-11-05 — [超简单上传步骤.md](04-ai-export/超简单上传步骤.md)：面向非技术成员的极简操作步骤。

### archive · 归档文档
**old_overviews/** - 旧的项目概述文档
- 2025-10-31 — 20251031PROJECT_SUMMARY.md：ES6 重构完成后的总结与指标
- 2025-10-31 — FINAL_REPORT.md：重构阶段最终报告
- 2025-11-02 — 20251102PROJECT_OVERVIEW.md：世界设定、势力、城市与玩家系统的整体快照

**old_plans/** - 旧的规划文档
- 2025-10-31 — NEXT_STEPS.md：阶段性行动计划
- 2025-10-31 — REFACTOR_PLAN.md：代码重构任务拆解

**daily_updates/** - 每日更新文档
- 2025-11-20 — 20251120TechnicalDocumentation.md：技术文档
- 2025-11-21 — 20251121game_mechanics_overview.md：游戏机制概述
- 2025-11-22 — 20251122_speed_system_unification.md：速度系统统一
- 2025-11-22 — 20251122_modifications.md：今日修改总结

### 99-archive · 历史档案
- 2025-10-31 — [MVP需求说明.md](99-archive/MVP需求说明.md)：早期 MVP 范围与目标。

## 面向 AI 的阅读建议
- **先读概览**：使用时间线与 01-overview 建立世界观与当前版本基线。
- **按模块聚焦**：依据问题选择 02-design 中的 battle/world/systems 子目录。
- **执行操作前**：参照 03-runtime 获取命令与测试步骤，避免误操作。
- **自动化场景**：准备 Claude 或其他 LLM 任务时，配合 04-ai-export 的流程与 FAQ。

## 维护约定
- 新增文档时需补充 Front Matter，并在本索引与 `_meta/timeline.md` 中登记。
- 如需归档旧文档，请移入 `99-archive/` 并更新时间线备注。
