---
title: MAPWAR 项目运行指南
summary: 说明开发环境要求、启动命令与常见排错步骤，适合本地快速运行。
owner: GAKU
status: active
last_updated: 2025-11-01
phase: production
---
# 🎮 MAPWAR 项目运行指南

## 📋 目录
1. [环境要求](#环境要求)
2. [快速启动](#快速启动)
3. [详细步骤](#详细步骤)
4. [常见问题](#常见问题)
5. [开发工具](#开发工具)

---

## 🔧 环境要求

### 必需软件
- **Node.js**: 版本 16.0 或更高
  - 检查版本: `node --version`
  - 下载地址: https://nodejs.org/

### 可选软件
- **Git**: 用于版本控制
- **VS Code**: 推荐的代码编辑器

---

## 🚀 快速启动

### 方法1: 使用 npm (推荐)

```powershell
# 1. 打开 PowerShell，进入项目目录
cd C:\Users\GAKU\Desktop\MAPWAR

# 2. 安装依赖 (首次运行需要)
npm install

# 3. 启动开发服务器
npm run dev
```

**完成！** 浏览器会自动打开 `http://localhost:3000`

---

### 方法2: 使用 Python 静态服务器 (备用)

```powershell
# 1. 进入项目目录
cd C:\Users\GAKU\Desktop\MAPWAR

# 2. 启动 Python 服务器
python -m http.server 8000

# 3. 手动打开浏览器访问
# http://localhost:8000/index.html
```

**注意**: 此方法不支持热重载，需要手动刷新页面

---

## 📝 详细步骤

### 第一次运行 (完整步骤)

#### 步骤1: 检查 Node.js
```powershell
# 检查是否安装 Node.js
node --version

# 应该显示类似: v18.17.0 或更高版本
```

如果未安装，请访问 https://nodejs.org/ 下载安装

---

#### 步骤2: 打开项目目录
```powershell
# 使用 PowerShell
cd C:\Users\GAKU\Desktop\MAPWAR

# 或者在文件管理器中右键 -> "在终端中打开"
```

---

#### 步骤3: 安装依赖
```powershell
npm install
```

**说明**: 
- 这会安装 Vite 和其他必需的包
- 只需要运行一次
- 大约需要 1-2 分钟

**预期输出**:
```
added 50 packages in 30s
```

---

#### 步骤4: 启动开发服务器
```powershell
npm run dev
```

**预期输出**:
```
  VITE v7.1.12  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

#### 步骤5: 打开浏览器
- 浏览器会自动打开
- 如果没有自动打开，手动访问: `http://localhost:3000`

---

### 第二次及以后运行 (简化步骤)

```powershell
# 1. 进入目录
cd C:\Users\GAKU\Desktop\MAPWAR

# 2. 启动服务器
npm run dev

# 完成！
```

---

## 🎮 游戏操作说明

### 基本控制
- **鼠标滚轮**: 缩放地图 (0.4x ~ 16x)
- **鼠标左键拖拽**: 平移地图
- **鼠标右键点击**: 移动玩家位置
- **空格键**: 开始/暂停游戏

### UI 按钮
- **开始**: 启动游戏模拟
- **暂停**: 暂停游戏
- **重置**: 重置到初始状态
- **速度选择**: 1x / 2x / 4x / 8x
- **跳转**: 跳转到指定年份

### 键盘快捷键
- **P 键**: 显示/隐藏性能监控面板
- **空格键**: 开始/暂停
- **ESC 键**: 关闭对话框

---

## 🎯 游戏功能

### 战略层
- ✅ 实时地形地图显示
- ✅ 城市和势力管理
- ✅ 历史事件触发
- ✅ 军队移动和战斗
- ✅ 时间流逝系统
- ✅ 玩家系统

### 玩家系统
- ⭐ 官职晋升 (功勋系统)
- ⚔️ 参与战斗
- 🏆 获得功勋
- 👥 效忠势力

### 历史事件
- 📜 春秋战国历史事件
- 🏰 城市攻防战
- 🗺️ 领土变化
- 👑 势力兴衰

---

## 🛠️ 开发命令

### 常用命令
```powershell
# 启动开发服务器 (热重载)
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 调试模式
```powershell
# 启动并显示详细日志
npm run dev -- --debug

# 指定端口
npm run dev -- --port 3001
```

---

## ❓ 常见问题

### Q1: 端口 3000 被占用
**问题**: `Port 3000 is already in use`

**解决方案**:
```powershell
# 方法1: 使用其他端口
npm run dev -- --port 3001

# 方法2: 关闭占用端口的程序
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程 (替换 PID)
taskkill /PID <进程ID> /F
```

---

### Q2: 地图不显示
**问题**: 地图背景是黑色或空白

**可能原因**:
1. 地图资源未正确加载
2. 路径配置错误

**解决方案**:
```powershell
# 1. 检查资源文件是否存在
dir public\allmapsoft\downloads\my_new_task_combined\

# 2. 查看浏览器控制台错误
# 按 F12 打开开发者工具，查看 Console 标签

# 3. 检查文件权限
# 确保文件可读
```

---

### Q3: npm install 失败
**问题**: 安装依赖时出错

**解决方案**:
```powershell
# 1. 清除缓存
npm cache clean --force

# 2. 删除 node_modules 和 package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 3. 重新安装
npm install

# 4. 如果还是失败，使用淘宝镜像
npm install --registry=https://registry.npmmirror.com
```

---

### Q4: 热重载不工作
**问题**: 修改代码后页面不自动刷新

**解决方案**:
```powershell
# 1. 重启开发服务器
# Ctrl+C 停止，然后重新运行
npm run dev

# 2. 清除浏览器缓存
# Ctrl+Shift+R 强制刷新

# 3. 检查文件是否保存
# 确保修改的文件已保存
```

---

### Q5: 性能问题
**问题**: 游戏运行卡顿

**解决方案**:
1. **按 P 键查看性能监控**
   - 查看 FPS 是否低于 30
   - 查看内存使用情况

2. **降低游戏速度**
   - 选择 1x 速度

3. **关闭其他程序**
   - 释放系统资源

4. **检查浏览器**
   - 推荐使用 Chrome 或 Edge
   - 关闭不必要的标签页

---

## 🔍 开发工具

### Chrome DevTools
```
F12 - 打开开发者工具
Ctrl+Shift+C - 元素选择器
Ctrl+Shift+I - 检查元素
Ctrl+Shift+J - 控制台
```

### 性能分析
```
1. 按 F12 打开 DevTools
2. 切换到 Performance 标签
3. 点击录制按钮
4. 操作游戏 5-10 秒
5. 停止录制
6. 分析性能瓶颈
```

### 内存分析
```
1. 按 F12 打开 DevTools
2. 切换到 Memory 标签
3. 选择 "Heap snapshot"
4. 点击 "Take snapshot"
5. 分析内存使用
```

---

## 📊 性能监控

### 实时监控 (按 P 键)
显示信息:
- **FPS**: 当前帧率
- **平均FPS**: 平均帧率
- **帧数**: 总渲染帧数
- **地形重绘**: 地形渲染次数
- **领土重绘**: 领土渲染次数
- **内存**: JavaScript 堆内存使用

### 性能指标参考
- **优秀**: FPS ≥ 55 (绿色)
- **良好**: FPS ≥ 30 (黄色)
- **较差**: FPS < 30 (红色)

---

## 🌐 浏览器兼容性

### 推荐浏览器
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

### 不支持
- ❌ Internet Explorer (任何版本)
- ❌ 旧版浏览器

---

## 📁 项目结构

```
MAPWAR/
├── src/                    # 源代码
│   ├── main.js            # 入口文件
│   ├── data/              # 游戏数据
│   ├── renderer/          # 渲染系统
│   ├── terrain/           # 地形系统
│   ├── player/            # 玩家系统
│   ├── ui/                # UI组件
│   └── utils/             # 工具类
├── public/                # 静态资源
│   └── allmapsoft/        # 地图资源
├── game.js                # 核心游戏逻辑
├── index.html             # HTML入口
├── style.css              # 样式文件
├── vite.config.js         # Vite配置
└── package.json           # 项目配置
```

---

## 🎓 学习资源

### 项目文档
- `README.md` - 项目概述
- `REFACTOR_PLAN.md` - 重构计划
- `OPTIMIZATION_ANALYSIS.md` - 优化分析
- `DEV_GUIDE.md` - 开发指南
- `PROJECT_SUMMARY.md` - 项目总结

### 在线资源
- [Vite 文档](https://vitejs.dev/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [JavaScript 教程](https://javascript.info/)

---

## 🆘 获取帮助

### 检查日志
```powershell
# 查看开发服务器日志
# 在运行 npm run dev 的终端中查看

# 查看浏览器控制台
# F12 -> Console 标签
```

### 调试技巧
1. **使用 console.log**
   ```javascript
   console.log('当前状态:', this.isRunning);
   ```

2. **使用断点**
   - F12 -> Sources -> 点击行号设置断点

3. **使用性能监控**
   - 按 P 键显示性能面板

---

## ✅ 启动检查清单

运行前确认:
- [ ] Node.js 已安装 (v16+)
- [ ] 在正确的目录 (MAPWAR/)
- [ ] 依赖已安装 (npm install)
- [ ] 端口 3000 未被占用
- [ ] 地图资源文件存在

启动后确认:
- [ ] 浏览器自动打开
- [ ] 地图正常显示
- [ ] 控制台无错误
- [ ] 按钮可以点击
- [ ] 地图可以拖拽和缩放

---

## 🎉 成功启动！

如果你看到了地图和城市标记，恭喜你成功运行了 MAPWAR！

### 下一步
1. 尝试点击"开始"按钮
2. 观察时间流逝和历史事件
3. 使用鼠标拖拽和缩放地图
4. 右键点击移动玩家
5. 按 P 键查看性能监控

### 开发建议
1. 修改代码会自动刷新
2. 查看 `OPTIMIZATION_ANALYSIS.md` 了解优化建议
3. 阅读 `DEV_GUIDE.md` 学习开发流程

---

**祝你游戏愉快！** 🎮

*文档创建时间: 2025-11-01*
*适用版本: v2.0.0*
