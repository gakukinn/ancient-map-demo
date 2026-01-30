# AI 绘画提示词指南 (完整版)

这里包含了**从零生成新兵种**和**为现有兵种制作动画**的所有提示词。

## 🛠️ 技术规范 (Technical Standards)
为了保证游戏内所有兵种大小一致，请严格遵守以下规范：

### 1. 尺寸标准
*   **游戏内显示尺寸**: **32px (宽) x 40px (高)**
    *   这是一个 **4:5** 的比例。
    *   显得士兵修长、挺拔，符合秦军/写实风格。
*   **原图建议尺寸**: 单帧 **64x80** (或 64x64，我们会自动拉伸一点点)。

### 2. 动画标准 (Sprite Sheet)
*   **布局**: **横向排列 (Horizontal Strip)**
*   **帧数**: **3 帧 (3 Frames)**
*   **顺序**: 站立 -> 迈左脚 -> 迈右脚

---

## 👑 玩家角色 (主公) 提示词 (Player Character)
**风格**: 三国志写实风格 (Romance of the Three Kingdoms Style)
**视角**: 正面偏右 45 度 (Isometric Right)
**比例**: 4:5 (微修长 Q 版)

### 复制以下提示词 (Copy this Prompt):

> **pixel art sprite of a Three Kingdoms general, ancient chinese armor, red cape, holding a sword, isometric view facing right, 45 degree angle, white background, koei tecmo style, realistic texture, 32 bit, detailed, full body, --ar 4:5 --no blur, shadow, 3d render**

**中文释义**:
*   `Three Kingdoms general`: 三国武将
*   `ancient chinese armor`: 中国古代盔甲
*   `red cape`: 红披风 (区分于普通士兵)
*   `isometric view facing right`: 45度朝右视角
*   `koei tecmo style`: 光荣(三国志)风格
*   `realistic texture`: 写实材质

---

## 第一步：生成基础静态图 (Basic Static Sprite)
**适用情况**：当你需要一个新的兵种（如骑兵、弓箭手），还没有任何图片时。

> **pixel art sprite of a Qin Dynasty soldier, full body, standing pose, ancient chinese black lamellar armor, black robe, holding a long spear (Ge), front-right side view, 45 degree angle, isometric, white background, hard black outline, cast shadow, high contrast, cel shading, clean edges, game asset, 32 bit, --ar 4:5 --iw 2 --no blur, cropping, cut off, realistic photo**
>
> **核心细节检查 (Checklist)**:
> *   `front-right side view / 45 degree angle`: **正面右倾 45 度** (这是您强调的关键视角，保证立体感)
> *   `full body / standing pose`: **全身/站姿** (防止 AI 画半身像或奇怪的动作，确保脚部完整)
> *   `hard black outline`: **硬黑描边** (游戏美术专用术语，保证角色与背景分离)
> *   `cast shadow`: **投射阴影** (脚底阴影，增加重量感)
> *   `high contrast / cel shading`: **高对比度/赛璐璐风格** (确保缩小后依然清晰)
> *   `--no blur, cropping`: **反向提示词** (禁止模糊、禁止裁剪，确保画出完整的人)

---

## 第二步：制作行走动画 (Walking Animation)
**适用情况**：当你已经有了一张满意的静态图（如现在的秦军士兵），想让他动起来时。

**关键操作**：
1.  **上传原图**：必须把第一步生成的图作为**参考图 (Image Prompt)** 上传。
2.  **设置权重**：设置较高的 Image Weight (如 High 或 Strong)，保证画出来的是同一个人。

> **Pixel art sprite sheet of a Qin Dynasty soldier walking. 3 frames in a row.**
>
> **Angle**: **Isometric view / 3/4 view facing right** (Front-Right).
> **Reference**: [Use your current image as Image Prompt]
>
> **Content**:
> *   **Row 1**: Walking cycle in 3/4 view.
>     *   Frame 1: Standing (Base pose).
>     *   Frame 2: Left leg forward.
>     *   Frame 3: Right leg forward.
> *   **Consistency**: strict adherence to the character design in the reference image.

---

## 备选方案 (如果 AI 画不出连续图)

如果 AI 实在画不出排成一排的图，你可以尝试**生成 2 张独立的图**：

1.  **图 A (soldier_1.png)**: 站立不动的样子。
2.  **图 B (soldier_2.png)**: 迈开腿走路的样子。

只要有这两张，我也能通过代码让他在 A 和 B 之间快速切换，看起来就像在走路！
