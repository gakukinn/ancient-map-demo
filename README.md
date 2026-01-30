# 🗺️ 满江红：古代地理全景图 (Ancient Geographic Panorama)

## 📜 项目简介
本项目是一个专注于**古代中国地理地形**的纯净展示系统。
它利用现代 WebGL 与 GIS 技术，将枯燥的地理数据转化为水墨风格的交互式地图。

**当前版本定位：**
*   **纯净地理 (Pure Geography)**：无任何游戏单位、UI 或逻辑干扰，仅展示山川河岳。
*   **真实数据 (Real Data)**：基于真实高程数据生成的地形起伏。
*   **无缝浏览 (Seamless)**：支持从宏观版图到微观地形的无缝缩放查看。

## 🌟 核心技术

### 1. 🌏 程序化地形渲染 (Procedural Terrain)
*   不使用预烘焙图片，而是实时读取地形数据。
*   **Hillshade 算法**：实时计算山体阴影与立体感。
*   **动态水系**：自动识别与渲染河流湖泊。

### 2. 🛠️ 技术栈
*   **核心**: TypeScript + Leaflet
*   **构建**: Vite
*   **数据源**: Terrarium Elevation Tiles

## 🚀 预览
访问 GitHub Pages 链接即可直接在浏览器中浏览古代地形。

## 🚀 部署与访问 (Deployment)

本项目配置了 GitHub Actions 自动部署。

1. **访问地址**: [https://gakukinn.github.io/ancient-map-demo/](https://gakukinn.github.io/ancient-map-demo/)
2. **如何更新**:
   - 任何推送到 `main` 分支的代码提交都会自动触发构建和部署。
   - 部署过程通常需要 1-2 分钟。可在 GitHub 仓库的 "Actions" 标签页查看进度。
