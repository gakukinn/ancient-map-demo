import L from 'leaflet';
import { GameMap } from './GameMap';

/**
 * 投射物接口
 */
interface Projectile {
    id: string; // Unique ID
    start: L.LatLng; // 起点
    end: L.LatLng; // 终点
    progress: number; // 0.0 -> 1.0
    speed: number; // 速度 (progress per second)
    maxHeight: number; // 抛物线最高点 (Visual scale)
    type: 'arrow' | 'stone' | 'fire';
}

/**
 * ProjectileRenderer
 * 负责绘制和更新所有飞行道具（箭矢）。
 * 这是一个纯视觉系统，不涉及伤害计算。
 */
export class ProjectileRenderer {
    private projectiles: Projectile[] = [];
    private lastTime: number = 0;
    private map: L.Map;

    constructor(map: L.Map) {
        this.map = map;
    }

    /**
     * 发射投射物
     * @param start 起点坐标
     * @param end 终点坐标
     * @param duration 飞行时间 (毫秒)，默认 800ms
     */
    public spawn(start: L.LatLng, end: L.LatLng, duration: number = 800): void {
        const id = Math.random().toString(36).substr(2, 9);
        const speed = 1000 / duration; // progress per second

        // 计算距离以调整高度
        const dist = this.map.distance(start, end);
        // 简单的高度估算：距离越远飞得越高，但有上限
        // 1000m -> 100px height? Visual logic. 
        // Let's use arbitrary units relative to map zoom? 
        // Actually height is purely visual pixel offset in draw.
        // We store strict LatLng, but we need visual height.
        // Let's assume height factor is proportional to screen distance? 
        // We'll calculate visual height in draw() based on screen points.
        // Here we just store a "intensity" factor 0-1.

        this.projectiles.push({
            id,
            start,
            end,
            progress: 0,
            speed,
            maxHeight: 0, // Calculated dynamically
            type: 'arrow'
        });
    }

    public update(dt: number): void {
        // [OPTIMIZATION] Reverse loop + splice to avoid allocating 'finished' array and 'filter' result
        // This eliminates Array allocation per frame in update loop.
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.progress += (p.speed * dt) / 1000;

            if (p.progress >= 1.0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D, currentScale: number): void {
        if (this.projectiles.length === 0) return;

        // [OPTIMIZATION] Pre-fetch map bounds for culling
        const mapBounds = this.map.getBounds();
        // Expand bounds slightly to avoid popping
        const pad = 0.1; // 10% padding
        const southWest = mapBounds.getSouthWest();
        const northEast = mapBounds.getNorthEast();
        const latPad = (northEast.lat - southWest.lat) * pad;
        const lngPad = (northEast.lng - southWest.lng) * pad;

        const minLat = southWest.lat - latPad;
        const maxLat = northEast.lat + latPad;
        const minLng = southWest.lng - lngPad;
        const maxLng = northEast.lng + lngPad;

        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // 箭矢颜色 - 稍微深一点的木色/黑色
        const arrowColor = '#2c3e50';
        const arrowHeadColor = '#95a5a6';

        for (const p of this.projectiles) {
            // [OPTIMIZATION] Culling
            // Interpolate current position roughly to check bounds
            // We use simple linear interpolation for culling check
            const currLat = p.start.lat + (p.end.lat - p.start.lat) * p.progress;
            const currLng = p.start.lng + (p.end.lng - p.start.lng) * p.progress;

            if (currLat < minLat || currLat > maxLat || currLng < minLng || currLng > maxLng) {
                continue; // Skip off-screen
            }

            const startPt = this.map.latLngToContainerPoint(p.start);
            const endPt = this.map.latLngToContainerPoint(p.end);

            // 抛物线插值
            // Linear position
            const x = startPt.x + (endPt.x - startPt.x) * p.progress;
            const y = startPt.y + (endPt.y - startPt.y) * p.progress;

            // Parabolic Height (Arc)
            // h(t) = 4 * H * t * (1-t)
            // Visual Height depends on distance usually.
            const dx = endPt.x - startPt.x;
            const dy = endPt.y - startPt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const arcHeight = Math.min(dist * 0.3, 100); // 30% of distance or max 100px

            const visualZ = 4 * arcHeight * p.progress * (1 - p.progress);

            // Apply height to Y (Screen Y is down, so minus Z goes up)
            const drawY = y - visualZ;
            const drawX = x;

            // Calculate Angle for rotation
            // We need tangent of the arc.
            // Pos P(t) = L(t) - V(t)*Up
            // dP/dt = dL/dt - dV/dt * Up
            // dL/dt = (end - start)
            // dV/dt = 4*H * (1 - 2t)

            const vx = (endPt.x - startPt.x);
            const vy = (endPt.y - startPt.y); // Linear velocity Y
            const vz_visual = - (4 * arcHeight * (1 - 2 * p.progress)); // Upward velocity component (in screen Y specific)

            // Final velocity vector
            const dirX = vx;
            const dirY = vy + vz_visual;

            const angle = Math.atan2(dirY, dirX);

            // Draw Arrow
            ctx.translate(drawX, drawY);
            ctx.rotate(angle);

            // Shaft (longer for visibility)
            ctx.strokeStyle = arrowColor;
            ctx.lineWidth = 1.5 * currentScale;
            ctx.beginPath();
            ctx.moveTo(-12 * currentScale, 0);
            ctx.lineTo(6 * currentScale, 0);
            ctx.stroke();

            // Head (Filled triangle for better visibility)
            ctx.fillStyle = arrowHeadColor;
            ctx.beginPath();
            ctx.moveTo(6 * currentScale, 0);
            ctx.lineTo(3 * currentScale, -2.5 * currentScale);
            ctx.lineTo(3 * currentScale, 2.5 * currentScale);
            ctx.closePath();
            ctx.fill();

            // [NEW] Fletching (Tail feathers) - Makes direction VERY clear
            ctx.strokeStyle = '#8b4513'; // Brown feather color
            ctx.lineWidth = 1 * currentScale;
            // Upper feather
            ctx.beginPath();
            ctx.moveTo(-12 * currentScale, 0);
            ctx.lineTo(-15 * currentScale, -3 * currentScale);
            ctx.stroke();
            // Lower feather
            ctx.beginPath();
            ctx.moveTo(-12 * currentScale, 0);
            ctx.lineTo(-15 * currentScale, 3 * currentScale);
            ctx.stroke();

            ctx.rotate(-angle);
            ctx.translate(-drawX, -drawY);
        }

        ctx.restore();
    }
}
