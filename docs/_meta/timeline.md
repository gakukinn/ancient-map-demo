---
title: MAPWAR 文档时间线
summary: 历史关键文档的发布时间与用途，方便 AI 建立上下文顺序。
owner: GAKU
status: active
last_updated: 2025-11-06
phase: production
---
# 文档时间线

| 日期       | 文档                                                         | 阶段         | 重点摘要                                                 |
|------------|--------------------------------------------------------------|--------------|----------------------------------------------------------|
| 2025-10-31 | [01-overview/20251031PROJECT_SUMMARY.md](../01-overview/20251031PROJECT_SUMMARY.md) | 重构结束     | 描述 ES6 重构完成情况、核心模块拆分与性能基线。          |
| 2025-10-31 | [00-meta/TECHNICAL_ROADMAP_CN.md](../00-meta/TECHNICAL_ROADMAP_CN.md)                 | 规划         | 列出后续重构路线、优先级与风险提示。                     |
| 2025-11-02 | [01-overview/20251102PROJECT_OVERVIEW.md](../01-overview/20251102PROJECT_OVERVIEW.md) | 全面更新     | 汇总世界构成、势力、城池与玩家模型的整体状态。           |
| 2025-11-05 | [02-design/battle/TACTICAL_BATTLE_SYSTEM.md](../02-design/battle/TACTICAL_BATTLE_SYSTEM.md) | 战斗系统     | 介绍战术战斗引擎的 API、数据流与调度流程。               |
| 2025-11-05 | [04-ai-export/SKILL_SEEKERS_SETUP.md](../04-ai-export/SKILL_SEEKERS_SETUP.md)         | AI 导出流程 | Skill Seekers 环境搭建与 Claude 技能包生成的长流程指南。 |
| 2025-11-06 | [02-design/world/TERRAIN_OVERLAY_SYSTEM.md](../02-design/world/TERRAIN_OVERLAY_SYSTEM.md) | 地图系统     | Zoom 9 地形通行层优化、覆盖层渲染及关键参数。           |
| 2025-11-06 | [02-design/world/20251106CITY_ICON_SYSTEM.md](../02-design/world/20251106CITY_ICON_SYSTEM.md) | 地图系统     | 城市图标展示逻辑、分层策略与标识方案。                  |

## 推荐阅读顺序
1. 先阅读 01-overview 中的概览类文档，了解世界观与系统状态。
2. 根据关注模块选择 02-design 内的专题设计文档（battle / world / systems）。
3. 如果需要复现环境或测试，转至 03-runtime。
4. 需要生成或更新 AI 技能包时，再参考 04-ai-export。
