---
title: Skill Seekers 安装指南
summary: 指南涵盖 Skill Seekers 环境搭建、依赖安装与 MAPWAR Claude 技能包生成流程。
owner: GAKU
status: active
last_updated: 2025-11-05
phase: ai-export
---
# Skill Seekers 安装指南 - 为MAPWAR项目创建Claude技能

## 📋 目标
为MAPWAR游戏项目创建一个Claude AI技能包，让Claude能够更深入地理解项目结构、代码和设计。

## ✅ 已完成
- ✅ Skill Seekers仓库已克隆到：`C:\Users\GAKU\Desktop\Skill_Seekers`

## 🔧 接下来的步骤

### 步骤1：安装Python 3.10+（如果还没有）

#### 检查是否已安装Python
1. 打开命令提示符（CMD）或PowerShell
2. 运行：`python --version`
3. 如果显示 `Python 3.10` 或更高版本，跳到步骤2

#### 如果需要安装Python：
1. 访问：https://www.python.org/downloads/
2. 下载最新的Python 3.10+版本（推荐3.11或3.12）
3. **重要**：安装时勾选 "Add Python to PATH"
4. 安装完成后重启命令提示符

### 步骤2：设置虚拟环境

打开命令提示符（以管理员身份运行），执行：

```cmd
cd C:\Users\GAKU\Desktop\Skill_Seekers

REM 创建虚拟环境
python -m venv venv

REM 激活虚拟环境
venv\Scripts\activate

REM 升级pip
python -m pip install --upgrade pip
```

### 步骤3：安装依赖

在激活的虚拟环境中：

```cmd
REM 安装基础依赖
pip install requests beautifulsoup4 lxml

REM 安装GitHub支持（可选，但推荐）
pip install PyGithub

REM 安装PDF支持（可选）
pip install PyMuPDF

REM 如果有requirements.txt
pip install -r requirements.txt
```

### 步骤4：创建MAPWAR项目配置文件

创建文件：`C:\Users\GAKU\Desktop\Skill_Seekers\configs\mapwar.json`

```json
{
  "name": "MAPWAR战略游戏",
  "description": "基于中国历史的战略回合制游戏，包含战术战斗系统",
  "version": "1.0.0",
  "sources": [
    {
      "type": "github",
      "url": "local",
      "path": "C:\\Users\\GAKU\\Desktop\\MAPWAR",
      "include_patterns": [
        "*.js",
        "*.html",
        "*.css",
        "*.md"
      ],
      "exclude_patterns": [
        "node_modules/**",
        ".git/**",
        "*.zip",
        "my_new_task/**"
      ]
    }
  ],
  "categories": {
    "战斗系统": {
      "patterns": ["src/battle/**"],
      "description": "战术战斗系统，包含四兵种、网格战场、AI等"
    },
    "地图系统": {
      "patterns": ["map*", "tile*"],
      "description": "战略地图、瓦片系统、地图渲染"
    },
    "游戏逻辑": {
      "patterns": ["game.js", "events.js"],
      "description": "游戏主循环、事件系统、势力管理"
    },
    "UI系统": {
      "patterns": ["style.css", "index.html"],
      "description": "用户界面、HUD、控制面板"
    }
  },
  "output": {
    "format": "zip",
    "filename": "MAPWAR_Claude_Skill"
  }
}
```

### 步骤5：生成MAPWAR技能包

在激活的虚拟环境中：

```cmd
cd C:\Users\GAKU\Desktop\Skill_Seekers

REM 基础版本（仅代码分析）
python cli/doc_scraper.py --config configs/mapwar.json

REM 如果需要AI增强（需要Claude API或使用Claude Code）
python cli/doc_scraper.py --config configs/mapwar.json --enhance
```

### 步骤6：上传技能到Claude

1. 生成的技能包位于：`C:\Users\GAKU\Desktop\Skill_Seekers\output\MAPWAR_Claude_Skill.zip`
2. 访问：https://claude.ai/skills
3. 点击"Upload Skill"
4. 上传生成的ZIP文件
5. 完成！现在Claude可以更好地理解MAPWAR项目

## 🎯 技能包将包含什么？

生成的技能包会让Claude了解：

### 📂 项目结构
- 所有JavaScript文件的位置和用途
- 代码组织方式（战斗系统、地图系统等）
- 文件之间的依赖关系

### 🎮 战术战斗系统
- BattleManager、BattleState、BattleGrid等核心类
- 四兵种系统（精锐、骑兵、弓箭手、步兵）
- 增援系统和多方混战机制
- AI行为逻辑

### 🗺️ 地图系统
- Canvas渲染逻辑
- 城市和势力管理
- 军队移动和战斗触发

### 📝 游戏设计
- 历史事件系统
- 功勋奖励机制
- UI/UX设计

## 💡 使用技能后的好处

1. **更精准的帮助**
   - Claude能准确引用您的代码行数
   - 理解您的命名约定和代码风格

2. **更快的开发**
   - 不需要反复解释项目结构
   - Claude可以直接定位需要修改的文件

3. **更好的建议**
   - 基于您实际的代码给出建议
   - 避免与现有架构冲突的方案

4. **持续改进**
   - 每次更新代码后，重新生成技能包
   - Claude始终了解最新的项目状态

## 🐛 常见问题

### Q: Python安装后命令不可用
A: 确保安装时勾选了"Add Python to PATH"，或手动添加到环境变量

### Q: pip安装失败
A: 尝试使用管理员权限运行命令提示符

### Q: 生成的技能包太大
A: 编辑`mapwar.json`，添加更多排除模式到`exclude_patterns`

### Q: 想要包含更多内容
A: 修改`mapwar.json`中的`include_patterns`，添加更多文件类型

## 📞 需要帮助？

如果遇到任何问题，请告诉我：
1. 您在哪一步遇到了问题
2. 具体的错误信息
3. 我会帮您解决！

## 🚀 完成后

技能包创建完成并上传到Claude后，在新的对话中您可以：

```
"请查看MAPWAR技能，帮我优化战术战斗系统的性能"
"根据MAPWAR的代码结构，建议如何实现瓦片地图系统"
"分析MAPWAR项目，找出可能的bug和改进点"
```

Claude将能够查阅完整的项目信息来提供帮助！
