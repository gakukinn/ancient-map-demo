
export interface IEditor {
    name: string;
    icon: string;
    show(): void;
    hide(): void;
    isVisible(): boolean;
}

/**
 * UnifiedEditorManager - 统一编辑器管理器
 * 
 * 职责：
 * 1. 管理所有编辑器的注册
 * 2. 渲染统一的底部工具栏
 * 3. 控制编辑器的互斥显示（可选）
 * 4. 提供全局隐藏/显示接口（用于导演模式）
 */
export class UnifiedEditorManager {
    private editors: IEditor[] = [];
    private container: HTMLElement | null = null;
    private toolbar: HTMLElement | null = null;
    private activeEditor: IEditor | null = null;
    private isGlobalVisible: boolean = true;

    constructor() {
        this.createUI();
    }

    public register(editor: IEditor): void {
        this.editors.push(editor);
        this.renderToolbarItems();
    }

    public setGlobalVisibility(visible: boolean): void {
        this.isGlobalVisible = visible;
        if (this.toolbar) {
            this.toolbar.style.display = visible ? 'flex' : 'none';
        }

        // 如果设置为隐藏，同时也隐藏当前打开的编辑器
        if (!visible && this.activeEditor) {
            // 这里我们不仅隐藏工具栏，还临时隐藏当前编辑器
            // 但不清除 activeEditor 状态，以便恢复时知道谁是活动的（如果需要恢复？）
            // 策略：简单起见，隐藏 global 时，强制关闭当前编辑器
            this.activeEditor.hide();
            // 保持 activeEditor 引用？还是设为 null？
            // 设为 null 更安全，避免状态不一致
            this.activeEditor = null;
            this.updateActiveState();
        }
    }

    private createUI(): void {
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'unified-editor-toolbar';
        this.toolbar.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            transform: none;
            background: rgba(0, 0, 0, 0.85);
            padding: 8px 15px;
            border-radius: 50px;
            display: flex;
            gap: 10px;
            z-index: 20000;
            border: 1px solid #444;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            transition: opacity 0.3s;
        `;
        document.body.appendChild(this.toolbar);
    }

    private renderToolbarItems(): void {
        if (!this.toolbar) return;
        this.toolbar.innerHTML = '';

        this.editors.forEach(editor => {
            const btn = document.createElement('button');
            btn.title = editor.name;
            // [UI-FIX] Remove expanding label to prevent layout shift
            btn.innerHTML = `<span style="font-size: 1.2em;">${editor.icon}</span>`;

            // 样式
            btn.style.cssText = `
                background: transparent;
                border: none;
                color: #aaa;
                cursor: pointer;
                padding: 10px;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: background-color 0.2s, color 0.2s;
            `;

            // Hover effect - Color only, NO layout shift
            btn.onmouseenter = () => {
                if (this.activeEditor !== editor) {
                    btn.style.background = 'rgba(255,255,255,0.1)';
                    btn.style.color = '#fff';
                }
            };
            btn.onmouseleave = () => {
                if (this.activeEditor !== editor) {
                    btn.style.background = 'transparent';
                    btn.style.color = '#aaa';
                }
            };

            // Click handler
            btn.onclick = () => this.toggleEditor(editor);

            // Active state visual (initial check)
            if (this.activeEditor === editor) {
                this.setActiveStyle(btn, true);
            }

            // Store ref for updates
            (editor as any)._toolbarBtn = btn;

            this.toolbar!.appendChild(btn);
        });
    }

    private toggleEditor(editor: IEditor): void {
        if (this.activeEditor === editor) {
            // Close current
            editor.hide();
            this.activeEditor = null;
        } else {
            // Close active if exists
            if (this.activeEditor) {
                this.activeEditor.hide();
            }
            // Open new
            editor.show();
            this.activeEditor = editor;
        }
        this.updateActiveState();
    }

    private updateActiveState(): void {
        this.editors.forEach(editor => {
            const btn = (editor as any)._toolbarBtn as HTMLElement;
            if (btn) {
                const isActive = this.activeEditor === editor;
                this.setActiveStyle(btn, isActive);
            }
        });
    }

    private setActiveStyle(btn: HTMLElement, isActive: boolean): void {
        if (isActive) {
            btn.style.background = '#00bcd4';
            btn.style.color = '#fff';
            // btn.style.transform = 'scale(1.1)'; // user hates movement, keep it stable
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#aaa';
            // btn.style.transform = 'none';
        }
    }
}
