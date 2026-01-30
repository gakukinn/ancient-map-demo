---
title: MAPWAR 文档清单与清理建议
summary: 列出当前各文档用途、优先级及清理建议，便于后续删除或合并。
owner: GAKU
status: active
last_updated: 2025-11-06
phase: production
---
# 文档清单与清理建议

| 目录 | 文档 | 用途 | 建议 |
|------|------|------|------|
| 00-meta | NEXT_STEPS.md | 2025-10-31 当日的重构行动计划 | 保留备查，可视需要并入 REFACTOR_PLAN |
| 00-meta | REFACTOR_PLAN.md | 重构目标与任务拆解 | 保留 |
| 00-meta | TECHNICAL_ROADMAP_CN.md | 长期技术路线和风险 | 保留 |
| 00-meta | 更新日志.md | 2025-10-31 更新记录 | 与时间线重复，可考虑精简为时间线附录 |
| 01-overview | 20251031PROJECT_SUMMARY.md | 重构冲刺总结 | 保留，辅佐 FINAL_REPORT |
| 01-overview | 20251102PROJECT_OVERVIEW.md | 最新项目全貌 | 保留（核心入口） |
| 01-overview | FINAL_REPORT.md | 重构阶段最终报告 | 保留 |
| 01-overview | 游戏设计文档.md | 早期高层设计 | 标记为 archive，留做背景资料 |
| 02-design/battle | * | 战斗模块相关设计 | 全部保留 |
| 02-design/systems | OPTIMIZATION_ANALYSIS.md | 性能评估与建议 | 保留 |
| 02-design/systems | PLAYER_SYSTEM.md | 玩家成长系统 | 保留 |
| 02-design/systems | 势力配置说明.md | 势力数据说明 | 保留 |
| 02-design/systems | 历史事件说明.md | 事件数据结构 | 保留 |
| 02-design/world | 20251106CITY_ICON_SYSTEM.md | 城市图标实现 | 保留 |
| 02-design/world | EVENT_DISPLAY_OPTIMIZATION.md | 事件显示优化方案 | 保留 |
| 02-design/world | TERRAIN_OVERLAY_SYSTEM.md | 通行层算法 | 保留 |
| 02-design/world | TILE_MAP_IMPLEMENTATION.md | 瓦片地图迁移记录 | 保留 |
| 02-design/world | TILEMAP_USAGE.md | 瓦片地图使用指南 | 与 TILE_MAP_IMPLEMENTATION 有交叉，可在后续合并成「实现 vs 使用」章节 |
| 02-design/world | ZOOM_LEVELS_GUIDE.md | 缩放配置指南 | 保留 |
| 02-design/world | 地形通行层使用说明.md | 通行层操作说明（面向运营/测试） | 保留 |
| 03-runtime | CHECKLIST.md | 版本检查清单 | 保留 |
| 03-runtime | DEV_GUIDE.md | 开发者指南 | 保留 |
| 03-runtime | HOW_TO_RUN.md | 运行指南 | 可与 DEV_GUIDE 互相引用，避免重复步骤 |
| 03-runtime | TEST_INSTRUCTIONS.md | 测试手册 | 保留 |
| 03-runtime | 如何启动地图测试.md | 地图调试专用指南 | 保留 |
| 04-ai-export | SKILL_SEEKERS_SETUP.md | Skill Seekers 安装与生成流程 | 保留 |
| 04-ai-export | 如何为MAPWAR创建Claude技能.md | 速查流程 | 与 超简单上传步骤.md 共用场景，可整合为一份「快速指南 + 附录」 |
| 04-ai-export | 技能包上传指南.md | 上传检查项 | 与 超简单上传步骤.md 部分重复，可合并 |
| 04-ai-export | 超简单上传步骤.md | 面向非技术成员的逐步引导 | 视团队情况保留或合并入单份指南 |

## 已删除
- `99-archive/MVP需求说明.md`：文件内容为空，已移除，若需要旧版 MVP 范围可从版本管理或早期资料恢复。

## 清理建议
1. **精简 AI 导出文档**  
   - 将 `如何为MAPWAR创建Claude技能.md` 作为总入口。  
   - 在同一文档下增加「详细上传检查」与「极简操作步骤」两个附录，以取代 `技能包上传指南.md` 与 `超简单上传步骤.md`（或保持链接指向同页锚点）。  
2. **整合瓦片地图文档**  
   - 在 `TILE_MAP_IMPLEMENTATION.md` 中加入指向 `TILEMAP_USAGE.md` 的引用，并考虑将重复的配置说明合并。  
3. **更新日志处理**  
   - 将 `更新日志.md` 中的信息合并进 `_meta/timeline.md` 的补充章节，之后可将该文件转存至 `99-archive/` 或删除。  
4. **历史计划文档标记**  
   - 若不再需要每日任务追溯，可将 `NEXT_STEPS.md` 与 `REFACTOR_PLAN.md` 移至 `99-archive/`，并在索引中注明「历史重构计划」。
