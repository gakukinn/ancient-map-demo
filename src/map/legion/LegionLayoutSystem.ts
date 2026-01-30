import { LegionType } from '../../types/UnitTypes';

export class LegionLayoutSystem {

    // [OFFSET CACHING] Cache grid calculations
    private static offsetCache: Map<string, { x: number, y: number }> = new Map();

    /**
     * Get the number of troops to render based on legion type.
     */
    public static getUnitCount(legionType: LegionType): number {
        // [FORCE COUNT] Cavalry is strictly 6 units (1-2-3 Triangle)
        if (legionType === 'cavalry' || legionType === 'huaxia_cavalry' || legionType === 'zhonghua_cavalry' || legionType === 'huihui_cavalry' || legionType === 'chaoxian_cavalry' || legionType === 'liang_cavalry' || legionType === 'wei_cavalry' || legionType === 'tujue_cavalry' || legionType === 'tian_cavalry' || legionType === 'xiyu_cavalry') {
            return 6;
        }
        // [FORCE COUNT] Mixed is strictly 7 units (2-3-2 Hex)
        if (legionType === 'mixed' || legionType === 'huaxia_mixed' || legionType === 'zhonghua_mixed' || legionType === 'huihui_mixed') {
            return 7;
        }
        // [FORCE COUNT] Xiyang/Han/Yuenan/Qiangzang/Zang/Gao Legion
        if (legionType === 'xiyang_legion' || legionType === 'han_legion' || legionType === 'yuenan_legion' || legionType === 'qiangzang_legion' || legionType === 'zang_legion' || legionType === 'gao_legion') {
            return 5; // Single Row
        }
        // Default
        return 9;
    }

    /**
     * Get Frame Count based on Aspect Ratio
     */
    public static getFrameCount(img: HTMLImageElement | null): number {
        if (!img || img.naturalWidth === 0) return 1;
        // If width approx equals height (< 2x), it's single frame (S10DB/NPC)
        if (img.naturalWidth < img.naturalHeight * 2) return 1;
        // S8 Assets (10 frames) - Width is roughly 10x Height
        if (img.naturalWidth > img.naturalHeight * 9 && img.naturalWidth < img.naturalHeight * 15) return 10;
        // S8GJ Charge (20 frames) - Width is roughly 20x Height
        if (img.naturalWidth > img.naturalHeight * 19) return 20;

        // Standard conventions
        return 8;
    }

    /**
     * Calculate custom formation offset
     */
    /**
     * Calculate custom formation offset
     * [OPTIMIZATION] Removed string caching as Key generation (900+ strings/frame) was causing GC spikes.
     * The math (sin/cos) is cheaper than string alloc + Map lookup.
     */
    // [OPTIMIZATION] Reusable object to prevent allocation per call (27,000/sec)
    private static tempOffset = { x: 0, y: 0 };

    /**
     * Calculate custom formation offset
     * [OPTIMIZATION] Returns a SHARED static object. Do not store reference!
     */
    public static getFormationOffset(index: number, spacingX: number, spacingY: number, direction: number, type: LegionType): { x: number, y: number } {
        let originalX = 0;
        let originalY = 0;

        // --- FORMATION LOGIC ---
        // [Xiyang/Han/Yuenan/Qiangzang/Zang/Gao Legion] Single Row of 5 (5个人一排)
        if (type === 'xiyang_legion' || type === 'han_legion' || type === 'yuenan_legion' || type === 'qiangzang_legion' || type === 'zang_legion' || type === 'gao_legion') {
            // [Xiyang/Han Legion] Single Row Staggered (5 Units)
            // Center: Index 1 (flag) at (0, -0.3)
            // Inner Flanks: 0 & 2 at (-0.6, -0.6) & (0.6, -0.6) -> Pushed forward
            // Outer Flanks: 4 & 3 at (-1.2, -0.4) & (1.2, -0.4) -> Slightly back from front

            if (index === 1) {
                // Center (Flag) - Slightly forward
                originalX = 0;
                originalY = -spacingY * 0.3;
            } else if (index === 0) {
                // Left Inner - Leading the charge
                originalX = -spacingX * 0.6;
                originalY = -spacingY * 0.6;
            } else if (index === 2) {
                // Right Inner - Leading the charge
                originalX = spacingX * 0.6;
                originalY = -spacingY * 0.6;
            } else if (index === 3) {
                // Far Right - Slightly back from leaders
                originalX = spacingX * 1.2;
                originalY = -spacingY * 0.4;
            } else if (index === 4) {
                // Far Left - Slightly back from leaders
                originalX = -spacingX * 1.2;
                originalY = -spacingY * 0.4;
            } else {
                originalX = 0;
                originalY = 0;
            }
        }

        // Check for Cavalry types
        else if (type === 'cavalry' || type === 'huaxia_cavalry' || type === 'zhonghua_cavalry' || type === 'huihui_cavalry' || type === 'chaoxian_cavalry' || type === 'liang_cavalry' || type === 'wei_cavalry' || type === 'tujue_cavalry' || type === 'tian_cavalry' || type === 'xiyu_cavalry') {
            // [WEDGE / ISOSCELES TRIANGLE] (箭头/等腰三角)
            const layout = [
                { r: 0, c: 0 },         // 0: Tip (Center)
                { r: 1, c: -1 }, { r: 1, c: 1 }, // 1,2: 2nd Row (Symm)
                { r: 2, c: -2 }, { r: 2, c: 0 }, { r: 2, c: 2 }, // 3,4,5: 3rd Row (Base of triangle)
            ];

            const pos = layout[index] || { r: Math.floor(index / 3) + 1, c: (index % 3 - 1) * 2 };

            originalY = (pos.r - 1.0) * spacingY;
            originalX = pos.c * spacingX * 0.7;

        } else if (type === 'mixed' || type === 'huaxia_mixed' || type === 'zhonghua_mixed' || type === 'huihui_mixed') {
            // [HEX / 2-3-2] (圆润/六边形)
            let r = 0, c = 0;
            if (index < 2) { // Row 0 (Front): 2 units
                r = -1.5; c = (index === 0) ? -0.5 : 0.5;
            } else if (index < 5) { // Row 1 (Mid): 3 units
                r = -0.5; c = (index - 3);
            } else if (index < 7) { // Row 2 (Back): 2 units
                r = 0.5; c = (index === 5) ? -0.5 : 0.5;
            } else { // Row 3 (Tail): remaining
                r = 1.5; c = ((index - 7) % 2 === 0) ? -0.5 : 0.5;
            }
            originalX = c * spacingX;
            originalY = r * spacingY;

        } else {
            // [INFANTRY / DEFAULT] (3x3 Grid)
            const rows = 3;
            const cols = 3;
            const r = Math.floor(index / cols);
            const c = index % cols;

            const centerX = (cols - 1) / 2;
            const centerY = (rows - 1) / 2;
            originalX = (c - centerX) * spacingX;
            originalY = (r - centerY) * spacingY;
        }

        // [ROTATION]
        const angle = (direction + 1) * Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Update reusable object
        this.tempOffset.x = originalX * cos - originalY * sin;
        this.tempOffset.y = originalX * sin + originalY * cos;

        return this.tempOffset;
    }
}
