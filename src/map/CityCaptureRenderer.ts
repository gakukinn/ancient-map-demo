import * as L from 'leaflet';
import { GameMap } from './GameMap';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    decay: number;
    size: number;
    color: string;
    // [PERF] Pre-rendered gradient texture
    texture: HTMLCanvasElement;
}

interface CaptureEffect {
    lat: number;
    lng: number;
    particles: Particle[];
    startTime: number;
}

export class CityCaptureRenderer {
    private map: GameMap;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private activeEffects: CaptureEffect[] = [];
    private animationFrameId: number | null = null;
    // [PERF] Cache for pre-rendered gradient textures by color
    private textureCache: Map<string, HTMLCanvasElement> = new Map();

    constructor(map: GameMap) {
        this.map = map;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'city-capture-layer-vfx';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '601'; // Slightly above everything
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';

        const mapContainer = map.getContainer();
        mapContainer.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d')!;

        // Handle resizing
        this.onResize();
        window.addEventListener('resize', () => this.onResize());

        // Start loop
        this.loop();
    }

    public playCaptureEffect(lat: number, lng: number, _factionColor: string) {
        const particles: Particle[] = [];
        const particleCount = 50;

        // [USER REQUEST] Always use grey dust color, ignore faction color
        // Grey dust looks more natural for city capture effects
        const dustColor = 'rgb(180,180,180)';

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // [TUNED] Slower speed (User: "Too fast")
            const speed = 1.0 + Math.random() * 4.0;
            // const spread = Math.random() * 20; // Initial random spread

            const size = 20 + Math.random() * 30;
            particles.push({
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.003 + Math.random() * 0.01,
                size: size,
                color: dustColor,
                texture: this.getOrCreateTexture(dustColor, Math.ceil(size * 2))
            });
        }

        this.activeEffects.push({
            lat,
            lng,
            particles,
            startTime: Date.now()
        });
    }

    private loop() {
        this.update();
        this.draw();
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    private update() {
        // Update particles
        for (const effect of this.activeEffects) {
            for (const p of effect.particles) {
                p.x += p.vx;
                p.y += p.vy;

                // Physics: Low friction (Gliding) to travel far but slow
                p.vx *= 0.98;
                p.vy *= 0.98;

                // Physics: Expansion
                p.size *= 1.005; // Slower expansion

                // Physics: Slow turbulence / drift
                p.vy -= 0.01; // Slower risecay;
                // Life decay
                p.life -= p.decay;
            }
        }

        // Remove dead effects (when all particles are dead)
        this.activeEffects = this.activeEffects.filter(e => e.particles.some(p => p.life > 0));
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Use 'source-over' for normal alpha blending
        this.ctx.globalCompositeOperation = 'source-over';

        this.activeEffects.forEach(effect => {
            const center = this.map.latLngToContainerPoint([effect.lat, effect.lng]);

            // Dust Cloud - [PERF] Use pre-cached textures
            effect.particles.forEach(p => {
                if (p.life <= 0) return;

                const screenX = center.x + p.x;
                const screenY = center.y + p.y;

                // [PERF] Use drawImage with cached texture instead of creating gradient each frame
                // Scale texture to current particle size and apply alpha via globalAlpha
                const textureSize = p.texture.width;
                const drawSize = p.size * 2; // Diameter

                this.ctx.save();
                this.ctx.globalAlpha = p.life * 0.25; // Fade out
                this.ctx.drawImage(
                    p.texture,
                    screenX - drawSize / 2,
                    screenY - drawSize / 2,
                    drawSize,
                    drawSize
                );
                this.ctx.restore();
            });
        });
    }

    // [PERF] Pre-render gradient texture for a given color and size
    private getOrCreateTexture(color: string, size: number): HTMLCanvasElement {
        const key = `${color}_${size}`;
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        // Create new texture
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = size;
        textureCanvas.height = size;
        const textureCtx = textureCanvas.getContext('2d')!;

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        const gradient = textureCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

        // Extract RGB from the string "rgb(r,g,b)"
        const rgbValues = color.match(/\d+/g);
        if (rgbValues) {
            const [r, g, b] = rgbValues;
            gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
            gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        } else {
            gradient.addColorStop(0, 'rgba(200,200,200,1)');
            gradient.addColorStop(1, 'rgba(200,200,200,0)');
        }

        textureCtx.fillStyle = gradient;
        textureCtx.beginPath();
        textureCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        textureCtx.fill();

        this.textureCache.set(key, textureCanvas);
        return textureCanvas;
    }

    private onResize() {
        const container = this.map.getContainer();
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }
}
