
/**
 * PerformanceMonitor.ts
 * 
 * 一个轻量级的运行时性能监控器 (Lag Checker)。
 * 用于实时检测帧率、帧时间以及关键系统的执行耗时，帮助定位卡顿原因。
 */

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;

    // UI Elements
    private container: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    // Metrics
    private metrics: Map<string, number> = new Map(); // Current frame metrics
    private history: Map<string, number[]> = new Map(); // History for graphing

    private frames: number = 0;
    private lastFpsUpdate: number = 0;
    private currentFps: number = 60;

    // Flags
    private isVisible: boolean = false;
    private isPaused: boolean = false;

    // Configuration
    private readonly MAX_HISTORY = 120; // 2 seconds at 60fps
    private readonly GRAPH_HEIGHT = 150; // [USER REQUEST] Taller graph (100 -> 150)
    private readonly WIDTH = 600; // [USER REQUEST] Wider monitor (450 -> 600)

    // Value Tracking (Counts)
    private values: Map<string, number> = new Map();

    // UI Buffering
    private lastTextParams: Map<string, { valStr: string, color: string, prefix: string, barW: number }> = new Map();
    private lastTextUpdateParams: number = 0;
    private readonly TEXT_REFRESH_MS = 500; // Update text every 0.5s

    private constructor() {
        this.createUI();
        this.startLoop();

        // F3 Toggle
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                this.toggle();
            }
        });

        // Add to window for console access
        (window as any).perfMonitor = this;
    }

    public static getInstance(): PerformanceMonitor {
        if (!this.instance) {
            this.instance = new PerformanceMonitor();
        }
        return this.instance;
    }

    /**
     * Track a specific scalar value (e.g., Entity Count)
     * Resets every frame if requested, or persists?
     * Usually counts are set every frame.
     */
    public trackValue(key: string, value: number): void {
        if (!this.isVisible || this.isPaused) return;
        this.values.set(key, value);
    }

    /**
     * Start measuring a code block
     * Returns a function to call when done
     */
    public start(label: string): () => void {
        if (!this.isVisible || this.isPaused) return () => { };

        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            const current = this.metrics.get(label) || 0;
            this.metrics.set(label, current + duration);
        };
    }

    /**
     * Mark the start of a new frame
     */
    public beginFrame(): void {
        if (!this.isVisible || this.isPaused) return;

        this.metrics.clear();
        // Don't clear values, they might be persistent or updated sparsely. 
        // But for "Per Frame" counts, caller should update them.
        this.metrics.set('Frame Total', 0); // Placeholder
        const now = performance.now();
        this.frames++;

        // [NEW] Memory Monitoring (Chrome/Edge only)
        const perf = performance as any;
        if (perf.memory) {
            // Convert to MB
            const usedMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
            this.trackValue('Memory', usedMB);

            // Optional: Track GC spikes? 
            // If memory drops significantly (>10MB?) in one frame, it was a GC.
            // We could log it? For now just visual number is enough.
        }

        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = this.frames;
            this.frames = 0;
            this.lastFpsUpdate = now;
        }
    }

    /**
     * Mark the end of a frame (Calculates total time)
     */
    public endFrame(totalTime: number): void {
        if (!this.isVisible || this.isPaused) return;

        this.metrics.set('Frame Total', totalTime);

        // Record history
        this.metrics.forEach((value, key) => {
            if (!this.history.has(key)) this.history.set(key, []);
            const arr = this.history.get(key)!;
            arr.push(value);
            if (arr.length > this.MAX_HISTORY) arr.shift();
        });

        this.render();

        // [NEW] Automatic Diagnosis
        this.checkSpikes(totalTime);
    }

    private lastMemory: number = 0;
    private spikeCooldown: number = 0;
    private lastLagReport: string = ''; // [NEW] On-screen report
    private reportTimer: number = 0;

    private checkSpikes(totalTime: number): void {
        if (this.reportTimer > 0) this.reportTimer--;
        if (this.reportTimer <= 0) this.lastLagReport = ''; // clear old reports

        if (this.spikeCooldown > 0) {
            this.spikeCooldown--;
            return;
        }

        const perf = performance as any;
        if (totalTime > 33) { // > 30FPS spike
            let cause = 'Unknown';
            let details = '';

            // 1. Check Memory (GC)
            if (perf.memory) {
                const currentMem = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
                const memDrop = this.lastMemory - currentMem;
                if (memDrop > 10) { // Dropped 10MB+ (GC happened)
                    cause = 'GC SPIKE';
                    details = `-${memDrop}MB`;
                }
                this.lastMemory = currentMem;
            }

            // 2. Check Metrics
            if (cause === 'Unknown') {
                // Render time is likely the remainder if we synced correctly, 
                // but we don't explicitly track 'Render Total' inside GameApp yet in a way that maps perfectly 
                // unless we look at the 'Render.X' components.
                // Actually, GlobalUnitRenderer does start('Render').
                // Let's check the tracked map.
                let maxComponent = '';
                let maxVal = 0;
                this.metrics.forEach((v, k) => {
                    // Ignore Aggregate/Parent metrics
                    if (k !== 'Frame Total' && k !== 'Logic Update' && v > maxVal) {
                        maxVal = v;
                        maxComponent = k;
                    }
                });

                if (maxVal > 5) { // Lower threshold to catch smaller sub-spikes
                    cause = `${maxComponent}`;
                    details = `${maxVal.toFixed(0)}ms`;
                } else if (totalTime > 45) {
                    // If no sub-metric explains it, it's hidden overhead
                    cause = 'Hidden/Gap Overhead';
                    const logic = this.metrics.get('Logic Update') || 0;
                    details = `Logic=${logic.toFixed(0)}ms`;
                }
            }

            if (totalTime > 45) { // Only warn on significant stutters
                const report = `⚠️ LAG: ${cause} (${details})`;
                console.warn(report);
                this.lastLagReport = report;
                this.reportTimer = 180; // Show for 3 seconds (60 frames)
                this.spikeCooldown = 60; // Don't spam
            }
        } else {
            // Track memory for next frame comparison
            if (perf.memory) {
                this.lastMemory = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
            }
        }
    }

    private createUI(): void {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed; top: 10px; right: 10px; width: ${this.WIDTH}px;
            background: rgba(0, 0, 0, 0.85); color: #0f0; font-family: 'Consolas', monospace;
            font-size: 12px; z-index: 10000; padding: 10px; border-left: 4px solid #0f0;
            display: none; pointer-events: none; user-select: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
        `;

        const title = document.createElement('div');
        title.innerHTML = '<strong style="color: #fff; font-size: 14px;">🚀 Performance Monitor (F3)</strong>';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #444';
        title.style.paddingBottom = '6px';
        this.container.appendChild(title);

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.GRAPH_HEIGHT + 350; // Vastly increased safe height
        this.canvas.style.width = '100%';
        this.ctx = this.canvas.getContext('2d');

        this.container.appendChild(this.canvas);
        document.body.appendChild(this.container);
    }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        if (this.container) {
            this.container.style.display = this.isVisible ? 'block' : 'none';
        }
        console.log(`📊 Performance Monitor: ${this.isVisible ? 'ON' : 'OFF'}`);
    }

    private startLoop(): void {
        // We hook into existing game loops, so no separate loop needed here generally.
        // But we need to ensure render() acts on the latest data.
    }

    private render(): void {
        if (!this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const now = performance.now();

        ctx.clearRect(0, 0, w, h);

        // [USER REQUEST] Throttle Text Updates (Reduce flicker)
        const shouldUpdateText = (now - this.lastTextUpdateParams) > this.TEXT_REFRESH_MS;
        if (shouldUpdateText) {
            this.lastTextUpdateParams = now;
        }

        // 1. Draw FPS
        ctx.fillStyle = this.currentFps < 30 ? '#ff3333' : '#33ff33';
        ctx.font = 'bold 18px Consolas';
        ctx.fillText(`FPS: ${this.currentFps}`, 5, 20);

        // 2. Draw Time Metrics
        let y = 50;
        ctx.font = '13px Consolas';

        // [FIX] Use stable key list from history to prevent flickering rows
        // Sort keys to keep order consistent
        const keys = Array.from(this.history.keys()).sort();

        keys.forEach((key) => {
            // Get current value or 0 if missing this frame
            const value = this.metrics.get(key) || 0;
            const color = this.getColor(key);

            // Calculate current frame values for buffering
            let prefix = '';
            let valStr = value.toFixed(1).padStart(5, ' ');
            let barW = Math.min(250, (value / 33) * 250); // Wider bars

            if (value > 16 && key !== 'Frame Total') prefix = '⚠️ ';
            if (value > 33 && key !== 'Frame Total') prefix = '🔥 ';

            // Logic: If throttle time passed, update buffer. Else use buffer.
            if (shouldUpdateText || !this.lastTextParams.has(key)) {
                this.lastTextParams.set(key, { valStr, color, prefix, barW });
            }

            const cached = this.lastTextParams.get(key)!;

            // Draw Bar BG
            ctx.fillStyle = '#222';
            ctx.fillRect(180, y - 10, 250, 10);

            // Draw Bar FG
            // Use stable bar width from cache to match text stability (as requested by user)
            ctx.fillStyle = cached.color;
            ctx.fillRect(180, y - 10, cached.barW, 10);

            // Text
            ctx.fillStyle = cached.color;
            const displayName = key.length > 20 ? key.substring(0, 18) + '..' : key;
            ctx.fillText(`${displayName.padEnd(20)}: ${cached.valStr}ms ${cached.prefix}`, 5, y);

            y += 18; // More vertical spacing
        });

        // 3. Draw Counts / Values
        y += 15;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Consolas';
        ctx.fillText('--- Entity Counts ---', 5, y);
        y += 20;
        ctx.font = '13px Consolas';
        ctx.fillStyle = '#ccc';

        this.values.forEach((val, key) => {
            ctx.fillStyle = '#ddd';
            ctx.fillText(`${key}: ${val}`, 5, y);
            y += 18;
        });

        // 4. Draw Graph (Always realtime)
        const graphY = y + 20;
        const graphH = this.GRAPH_HEIGHT; // 150

        // ... (Graph drawing code follows) ...

        // Just ensure we don't overlap if metrics grow
        if (graphY + graphH > h) {
            // Safe buffer provided by +350 in height
        }

        // Draw Graph Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, graphY, w, graphH);

        // Grid lines
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        // 16ms (60fps)
        let lineY = graphY + graphH - (16.6 / 66 * graphH);
        ctx.moveTo(0, lineY); ctx.lineTo(w, lineY);
        // 33ms (30fps)
        lineY = graphY + graphH - (33.3 / 66 * graphH);
        ctx.moveTo(0, lineY); ctx.lineTo(w, lineY);
        ctx.stroke();

        ctx.fillStyle = '#666';
        ctx.font = '10px Consolas';
        ctx.fillText('33ms', w - 35, lineY - 4);
        ctx.fillText('16ms', w - 35, graphY + graphH - (16.6 / 66 * graphH) - 4);

        // Draw Lines
        this.metrics.forEach((_, key) => {
            if (key === 'Frame Total') return;
            this.drawGraphLine(key, graphY, graphH, this.getColor(key));
        });

        this.drawGraphLine('Frame Total', graphY, graphH, '#ffffff', 2);
    }

    private drawGraphLine(key: string, top: number, height: number, color: string, lineWidth: number = 1): void {
        if (!this.ctx || !this.history.has(key)) return;

        const data = this.history.get(key)!;
        const ctx = this.ctx;
        const scale = height / 66; // 0-66ms range (optimized for 30-60fps view)

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        const step = this.WIDTH / this.MAX_HISTORY;

        for (let i = 0; i < data.length; i++) {
            const val = data[i];
            const x = i * step;
            const y = top + height - (Math.min(val, 66) * scale); // Clamp to 66ms
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    private getColor(key: string): string {
        switch (key) {
            case 'Frame Total': return '#ffffff'; // White (Deprecated total)
            case 'JS CPU': return '#00ff00'; // Pure Green (Actual JS Usage)
            case 'System Overhead': return '#ff0000'; // Red (Browser/Rendering Delay)

            case 'Logic Update': return '#00ffff';
            case 'Render': return '#ff00ff';
            case 'Physics': return '#ffff00';
            case 'AI': return '#4488ff';

            // New Sub-scopes
            case 'Render.Unit': return '#ff80af';
            case 'Render.Map': return '#aa00aa';
            case 'Render.Text': return '#ffa500';
            case 'Render.Projectiles': return '#00ff00';


            case 'Logic.Legion': return '#40e0d0'; // Turquoise
            case 'Logic.AI': return '#1e90ff'; // DodgerBlue
            case 'Logic.Recruit': return '#adff2f'; // GreenYellow
            case 'Logic.Player': return '#fafad2'; // LightGoldenrodYellow
            case 'Logic.Combat': return '#ff6347'; // Tomato (Red-Orange)

            // [NEW] Granular Legion Breakdown
            case 'Logic.Legion.Move': return '#ffae42'; // Yellow-Orange (Physics)
            case 'Logic.Legion.Contact': return '#dc143c'; // Crimson (Critical logic)

            case 'Logic.UI': return '#ff0055'; // Vibrant Pink/Red
            case 'Logic.Time': return '#dda0dd'; // Plum
            case 'Logic.Cinematic': return '#9370db'; // MediumPurple

            case 'Logic.Gap1': return '#808080';
            case 'Logic.Gap2': return '#909090';
            case 'Logic.Gap3': return '#a0a0a0';
            case 'Logic.Gap4': return '#b0b0b0';
            case 'Logic.Gap5': return '#c0c0c0';

            default:
                // Hash string to color
                let hash = 0;
                for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
                const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
                return '#' + '00000'.substring(0, 6 - c.length) + c;
        }
    }
}
