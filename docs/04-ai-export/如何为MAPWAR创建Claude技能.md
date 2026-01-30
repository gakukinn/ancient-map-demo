---
title: 为 MAPWAR 创建 Claude 技能包 - 快速指南
summary: 提供 3 步流程帮助熟悉环境的成员快速导出并上传 MAPWAR 的 Claude 技能包。
owner: GAKU
status: active
last_updated: 2025-11-05
phase: ai-export
---
# 为MAPWAR创建Claude技能包 - 快速指南

## 🎯 目标
让Claude AI更深入地理解MAPWAR项目，提供更精准的开发帮助。

## ✅ 已完成的准备工作
- ✅ Skill Seekers已克隆到：`C:\Users\GAKU\Desktop\Skill_Seekers`
- ✅ MAPWAR配置文件已创建：`Skill_Seekers\configs\mapwar.json`
- ✅ 自动化安装脚本已创建：`Skill_Seekers\setup_mapwar.bat`

## 🚀 快速开始（3步完成）

### 步骤1：检查Python（必需）

**打开命令提示符（CMD），输入：**
```cmd
python --version
```

**如果显示 `Python 3.10` 或更高版本** → 继续步骤2

**如果显示错误或版本低于3.10** → 需要安装Python：
1. 访问：https://www.python.org/downloads/
2. 下载Python 3.11或3.12（推荐）
3. ⚠️ **重要**：安装时**必须勾选** "Add Python to PATH"
4. 安装完成后，关闭并重新打开CMD
5. 再次检查：`python --version`

### 步骤2：运行自动化安装脚本

**双击运行：**
```
C:\Users\GAKU\Desktop\Skill_Seekers\setup_mapwar.bat
```

脚本会自动：
1. ✅ 检查Python环境
2. ✅ 创建虚拟环境
3. ✅ 安装所有依赖包
4. ✅ 验证配置文件
5. ✅ 询问是否立即生成技能包

**如果选择"Y"**，脚本会自动生成技能包并告诉您位置。

**如果选择"N"**，可以稍后手动生成（见下方）。

### 步骤3：上传技能到Claude

1. 找到生成的文件：`C:\Users\GAKU\Desktop\Skill_Seekers\output\MAPWAR_Game_Project.zip`
2. 访问：https://claude.ai/skills
3. 登录您的Claude账号
4. 点击"Upload Skill"或"上传技能"
5. 选择ZIP文件上传
6. 完成！🎉

## 🔧 手动操作（可选）

如果自动化脚本遇到问题，可以手动操作：

### 手动安装依赖：
```cmd
cd C:\Users\GAKU\Desktop\Skill_Seekers
python -m venv venv
venv\Scripts\activate
pip install requests beautifulsoup4 lxml
```

### 手动生成技能包：
```cmd
cd C:\Users\GAKU\Desktop\Skill_Seekers
venv\Scripts\activate
python cli/doc_scraper.py --config configs/mapwar.json
```

### 如果需要AI增强（可选）：
```cmd
python cli/doc_scraper.py --config configs/mapwar.json --enhance
```

## 📦 技能包包含的内容

生成的技能包会让Claude了解：

### 🎮 战术战斗系统
- ✅ 四兵种系统（精锐/骑兵/弓箭手/步兵）
- ✅ 12×10网格战场
- ✅ 回合制战斗逻辑
- ✅ AI对手行为
- ✅ 增援系统
- ✅ 多方混战支持

### 🗺️ 地图系统
- ✅ Canvas渲染逻辑
- ✅ 城市和势力管理
- ✅ 军队移动系统
- ✅ 瓦片地图规划

### 🎯 游戏核心
- ✅ 主游戏循环
- ✅ 事件系统
- ✅ UI和HUD
- ✅ 功勋奖励

### 📝 文档
- ✅ 项目结构
- ✅ 技术说明
- ✅ 实现报告
- ✅ TODO和计划

## 💡 使用技能后的效果

**之前的对话：**
```
用户："帮我优化战术战斗系统"
Claude："请提供您的战术战斗系统代码..."
```

**使用技能后：**
```
用户："帮我优化战术战斗系统"
Claude："我看到您的战术战斗系统位于 src/battle/ 目录，
包含BattleManager.js（250行）、BattleState.js（198行）等7个文件。
我注意到BattleManager.js:548行的updateHUD()方法可以优化..."
```

**Claude能做到：**
- ✅ 直接引用具体文件和行号
- ✅ 理解您的代码结构和命名习惯
- ✅ 给出符合现有架构的建议
- ✅ 避免重复解释项目背景

## 🔄 更新技能包

当您的代码有重大更新时，重新生成技能包：

```cmd
cd C:\Users\GAKU\Desktop\Skill_Seekers
venv\Scripts\activate
python cli/doc_scraper.py --config configs/mapwar.json
```

然后重新上传到Claude即可。

## 🐛 常见问题

### Q: Python命令不可用
**A:** 确保安装Python时勾选了"Add Python to PATH"
- 如果忘记勾选，可以重新安装或手动添加到PATH
- 重启CMD窗口后再试

### Q: pip安装依赖失败
**A:** 尝试以管理员身份运行CMD：
- 搜索"命令提示符"
- 右键 → "以管理员身份运行"
- 重新运行安装命令

### Q: 生成的技能包在哪里？
**A:** `C:\Users\GAKU\Desktop\Skill_Seekers\output\MAPWAR_Game_Project.zip`

### Q: 技能包太大无法上传
**A:** 编辑 `configs/mapwar.json`，添加更多排除文件：
```json
"exclude_files": [
  "node_modules/**",
  ".git/**",
  "*.zip",
  "my_new_task/**",
  "*.png",
  "*.jpg"
]
```

### Q: 想包含更多文件类型
**A:** 编辑 `configs/mapwar.json` 中的 `include_files`：
```json
"include_files": [
  "*.js",
  "*.html",
  "*.css",
  "*.md",
  "*.json"
]
```

## 📞 需要帮助？

如果遇到任何问题：
1. 查看详细指南：`SKILL_SEEKERS_SETUP.md`
2. 检查 Skill Seekers 官方文档
3. 告诉我具体的错误信息，我会帮您解决

## ✨ 完成后的使用

技能包上传成功后，在Claude的新对话中：

```
"查看MAPWAR技能，分析战术战斗系统的性能瓶颈"
"根据MAPWAR项目结构，建议如何实现瓦片地图加载"
"检查MAPWAR代码，找出潜在的bug"
"帮我重构game.js中的事件系统"
```

Claude将基于完整的项目上下文提供精准帮助！🚀

---

## 📋 快速检查清单

在开始之前，确认：
- [ ] Python 3.10+ 已安装
- [ ] Python已添加到PATH
- [ ] Skill_Seekers文件夹存在
- [ ] configs/mapwar.json 文件存在
- [ ] setup_mapwar.bat 文件存在

全部确认后，双击运行 `setup_mapwar.bat` 即可！
