这是 Cursor 编辑器的设置菜单解释：

### Agent (智能代理设置)
*   **Agent Auto-Fix Lints (开启)**：**Agent 自动修复代码问题**。开启后，当代码出现 Lint 错误（如语法不规范、类型错误）时，AI 会尝试自动修复。
*   **Auto Execution (Request Review)**：**自动执行 (请求审查)**。控制 AI 是否可以自动运行终端命令。设置为 "Request Review" 表示 AI 在运行命令前必须先询问你。
*   **Review Policy (Request Review)**：**审查策略 (请求审查)**。控制 AI 修改文件时的权限。设置为 "Request Review" 表示 AI 修改文件前需要你确认。
*   **Customizations (Manage)**：**自定义 (管理)**。点击 "Manage" 可以添加自定义的规则或文档，让 AI 更懂你的项目规范。

### Tab (Tab 键智能补全设置)
*   **Tab Gitignore Access (Off)**：**Tab 访问 Gitignore (关闭)**。控制 Tab 补全是否可以读取被 `.gitignore` 忽略的文件。
*   **Tab Speed (Fast)**：**Tab 补全速度 (快)**。设置 AI 代码补全的响应速度。
*   **Tab to Import (On)**：**Tab 自动导入 (开启)**。开启后，使用 Tab 补全代码时，如果用到了未导入的模块，会自动并在文件顶部添加 `import` 语句。
*   **Tab to Jump (On)**：**Tab 跳转 (开启)**。开启后，如果补全的代码有多个占位符（比如函数参数），按 Tab 键可以跳到下一个参数位置。
*   **Snooze (Start)**：**暂停 (开始)**。暂时关闭 Tab 智能补全功能。

### Advanced Settings (高级设置)
*   **Settings**：**设置**。打开更详细的全局设置页面。
*   **AI Shortcuts**：**AI 快捷键**。设置与 AI 交互的快捷键。
