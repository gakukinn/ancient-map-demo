/**
 * HillshadeWorker.ts
 * Offloads heavy terrain math to a background thread
 */

// Define message types
export interface HillshadeRequest {
    id: number;
    width: number;
    height: number;
    data: Uint8ClampedArray; // Heightmap pixels
    params: {
        azimuth: number;
        altitude: number;
        zFactor: number;
        opacity: number;
        useElevationColor: boolean;
    };
}

export interface HillshadeResponse {
    id: number;
    data: Uint8ClampedArray; // Processed pixels
}

// Pre-allocate LUTs in Worker Scope
let colorLUT: Uint8ClampedArray | null = null;
let noiseLUT: Float32Array | null = null;
const LUT_OFFSET = 500;
const LUT_MAX_ELEV = 9000;

// Initialize LUTs (Copy logic from HillshadeLayer)
function initLUTs() {
    if (colorLUT) return;

    // --- Color LUT ---
    const range = LUT_OFFSET + LUT_MAX_ELEV;
    const lut = new Uint8ClampedArray(range * 3);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpColor = (c1: number[], c2: number[], t: number, out: any, offset: number) => {
        out[offset] = lerp(c1[0], c2[0], t);
        out[offset + 1] = lerp(c1[1], c2[1], t);
        out[offset + 2] = lerp(c1[2], c2[2], t);
    };

    const deepOcean = [35, 65, 100];
    const shelfBlue = [70, 110, 140];
    const shallowCyan = [100, 150, 170];
    const coastalSand = [200, 205, 180];
    const lowlandPale = [195, 205, 160];
    const lowlandEnd = [205, 215, 155];
    const sandBeige = [215, 210, 185];
    const loessYellow = [212, 192, 138];
    const loessMid = [195, 180, 140];
    const gobiBrown = [170, 160, 145];
    const transitionBrown = [165, 150, 130];  // 更冷的灰棕色
    const earthyRed = [140, 125, 115];        // 冷灰褐色，替代原红褐色
    const rockGrey = [105, 105, 110];         // 稍暖的岩石灰
    const snowWhite = [255, 255, 255];

    for (let i = 0; i < range; i++) {
        const elev = i - LUT_OFFSET;
        const offset = i * 3;
        if (elev < -300) { lut[offset] = deepOcean[0]; lut[offset + 1] = deepOcean[1]; lut[offset + 2] = deepOcean[2]; }
        else if (elev < -150) lerpColor(deepOcean, shelfBlue, (elev + 300) / 150, lut, offset);
        else if (elev < -100) lerpColor(shelfBlue, shallowCyan, (elev + 150) / 50, lut, offset);
        else if (elev < 20) lerpColor(coastalSand, lowlandPale, (elev + 100) / 120, lut, offset);
        else if (elev < 400) lerpColor(lowlandPale, lowlandEnd, (elev - 20) / 380, lut, offset);
        else if (elev < 1000) lerpColor(lowlandEnd, sandBeige, (elev - 400) / 600, lut, offset);
        else if (elev < 1300) lerpColor(sandBeige, loessYellow, (elev - 1000) / 300, lut, offset);
        else if (elev < 2500) lerpColor(loessYellow, loessMid, (elev - 1300) / 1200, lut, offset);
        else if (elev < 3800) lerpColor(loessMid, gobiBrown, (elev - 2500) / 1300, lut, offset);
        else if (elev < 4100) lerpColor(gobiBrown, transitionBrown, (elev - 3800) / 200, lut, offset);
        else if (elev < 4400) lerpColor(transitionBrown, earthyRed, (elev - 4000) / 400, lut, offset);
        else if (elev < 4900) lerpColor(earthyRed, rockGrey, (elev - 4400) / 500, lut, offset);
        else if (elev < 5200) lerpColor(rockGrey, snowWhite, (elev - 4900) / 300, lut, offset);
        else { lut[offset] = snowWhite[0]; lut[offset + 1] = snowWhite[1]; lut[offset + 2] = snowWhite[2]; }
    }
    colorLUT = lut;

    // --- Noise LUT ---
    const size = 256;
    const nLut = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const hash = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
            const noise = (hash - Math.floor(hash) - 0.5) * 4.0;
            nLut[y * size + x] = noise;
        }
    }
    noiseLUT = nLut;
}

self.onmessage = (e: MessageEvent<HillshadeRequest>) => {
    initLUTs();
    if (!colorLUT || !noiseLUT) return;

    const { id, width, height, data, params } = e.data;
    const output = new Uint8ClampedArray(width * height * 4);

    // Process params
    const azimuthRad = (params.azimuth * Math.PI) / 180;
    const altitudeRad = (params.altitude * Math.PI) / 180;
    const cosAzimuth = Math.cos(azimuthRad);
    const sinAzimuth = Math.sin(azimuthRad);
    const cosAltitude = Math.cos(altitudeRad);
    const sinAltitude = Math.sin(altitudeRad);

    const INV_8 = 0.125;
    let divisor = 320 - (params.zFactor * 10);
    if (divisor < 20) divisor = 20;

    // Loop
    for (let y = 0; y < height; y++) {
        const yT = (y === 0 ? 0 : y - 1) * width;
        const yM = y * width;
        const yB = (y === height - 1 ? height - 1 : y + 1) * width;
        const noiseYRow = (y & 255) * 256;

        for (let x = 0; x < width; x++) {
            const idx = (yM + x) * 4;

            // X Neighbors
            const xL = (x === 0 ? 0 : x - 1);
            const xR = (x === width - 1 ? width - 1 : x + 1);

            // Fetch Z (Elevation)
            // Note: Decoding RGB to Height: (R*256 + G + B/256) - 32768
            const getZ = (baseIdx: number) =>
                (data[baseIdx] * 256 + data[baseIdx + 1] + data[baseIdx + 2] * 0.00390625) - 32768;

            const idxTL = (yT + xL) * 4; const zTL = getZ(idxTL);
            const idxT = (yT + x) * 4; const zT = getZ(idxT);
            const idxTR = (yT + xR) * 4; const zTR = getZ(idxTR);

            const idxL = (yM + xL) * 4; const zL = getZ(idxL);
            const idxC = idx; const zC = getZ(idxC);
            const idxR = (yM + xR) * 4; const zR = getZ(idxR);

            const idxBL = (yB + xL) * 4; const zBL = getZ(idxBL);
            const idxB = (yB + x) * 4; const zB = getZ(idxB);
            const idxBR = (yB + xR) * 4; const zBR = getZ(idxBR);

            // Math
            const dzdx = ((zTR + 2 * zR + zBR) - (zTL + 2 * zL + zBL)) * INV_8;
            const dzdy = ((zBL + 2 * zB + zBR) - (zTL + 2 * zT + zTR)) * INV_8;

            const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy) / divisor);
            let aspect = Math.atan2(dzdy, -dzdx);
            if (aspect < 0) aspect += 2 * Math.PI;

            let hillshade = ((cosAltitude * Math.cos(slope)) +
                (sinAltitude * Math.sin(slope) * Math.cos(azimuthRad - aspect)));

            // Color Generation
            if (params.useElevationColor) {
                // Ambient Occlusion
                const zAvg = (zTL + zT + zTR + zL + zR + zBL + zB + zBR) * INV_8;
                const curvature = zC - zAvg;
                const aoStrength = 1.5 * (params.zFactor * 0.1);
                let aoFactor = (curvature < 0)
                    ? Math.max(0.5, 1.0 + (curvature * 0.004 * aoStrength))
                    : Math.min(1.15, 1.0 + (curvature * 0.002 * aoStrength));
                hillshade *= aoFactor;

                // Ink Shading logic
                let shadowStrength = 0.55;
                let ambientBase = 0.70;
                if (zC < 1000) { shadowStrength = 0.75; ambientBase = 0.50; }
                else if (zC < 1300) {
                    const t = (zC - 1000) * 0.003333;
                    shadowStrength = 0.75 - (0.20 * t);
                    ambientBase = 0.50 + (0.20 * t);
                }
                if (zC > 4200) {
                    const t = Math.min(1.0, (zC - 4200) * 0.001);
                    shadowStrength = 0.55 - (0.1 * t);
                    ambientBase = 0.70 + (0.1 * t);
                }
                const shadeFactor = ambientBase + hillshade * shadowStrength;

                // Noise
                let noise = 0;
                if (zC > 0) {
                    noise = noiseLUT[noiseYRow + (x & 255)];
                    if (zC + noise <= 0) noise = -zC + 0.1;
                }

                // LUT Color
                let elevIndex = Math.floor(zC + noise) + LUT_OFFSET;
                if (elevIndex < 0) elevIndex = 0;
                else if (elevIndex > LUT_MAX_ELEV + LUT_OFFSET) elevIndex = LUT_MAX_ELEV + LUT_OFFSET;

                const lIdx = elevIndex * 3;
                let r = colorLUT[lIdx];
                let g = colorLUT[lIdx + 1];
                let b = colorLUT[lIdx + 2];

                // Texturing Rules (Grain, Erosion, Veg, Ridges)
                if (zC > 0 && zC < 1500) {
                    const grain = 1.0 + (noise * 0.03);
                    r *= grain; g *= grain; b *= grain;
                }
                if (zC >= 1300 && zC < 3800 && curvature < -0.3) { // Erosion
                    let eStr = Math.min(0.35, (Math.abs(curvature) - 0.3) * 0.15);
                    if (zC < 1500) eStr *= (zC - 1300) / 200;
                    else if (zC > 3500) eStr *= (3800 - zC) / 300;
                    const invE = 1 - eStr;
                    r = r * invE + 160 * eStr; g = g * invE + 140 * eStr; b = b * invE + 100 * eStr;
                }
                if (zC < 1300 && curvature < -1.0) { // Veg
                    const vStr = Math.min(0.4, Math.abs(curvature) * 0.06);
                    const invV = 1 - vStr;
                    r = r * invV + 100 * vStr; g = g * invV + 115 * vStr; b = b * invV + 90 * vStr;
                }
                if (zC > 4000 && curvature > 2.0) { // Ridges
                    const rStr = Math.min(0.4, (curvature - 2.0) * 0.05);
                    const invR = 1 - rStr;
                    r = r * invR + 230 * rStr; g = g * invR + 220 * rStr; b = b * invR + 210 * rStr;
                }

                output[idx] = r * shadeFactor;
                output[idx + 1] = g * shadeFactor;
                output[idx + 2] = b * shadeFactor;
                output[idx + 3] = 255;
            } else {
                // Grayscale Path (Simpler)
                const val = hillshade * 255;
                if (val < 180) {
                    output[idx] = 0; output[idx + 1] = 0; output[idx + 2] = 20;
                    let alpha = (180 - val) * 0.00555 * 255 * params.opacity;
                    output[idx + 3] = (alpha > 240) ? 240 : alpha;
                } else if (val > 220) {
                    output[idx] = 255; output[idx + 1] = 255; output[idx + 2] = 240;
                    let alpha = (val - 220) * 0.02857 * 255 * params.opacity * 0.8;
                    output[idx + 3] = (alpha > 255) ? 255 : alpha;
                } else {
                    output[idx + 3] = 0;
                }
            }
        }
    }

    // Return result (transferable)
    // Cast to any to avoid TS matching Window.postMessage instead of Worker.postMessage
    (self as any).postMessage({ id, data: output } as HillshadeResponse, [output.buffer]);
};
