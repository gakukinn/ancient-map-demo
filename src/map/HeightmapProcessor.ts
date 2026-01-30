
/**
 * HeightmapProcessor.ts
 * Process raw heightmap image into a hillshade overlay on the client side.
 */

export class HeightmapProcessor {
    /**
     * Converts a heightmap image URL to a hillshade Blob URL
     */
    static async generateHillshade(imageUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject('Could not get canvas context');
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imgData.data;
                const width = img.width;
                const height = img.height;

                // Create new buffer for hillshade
                const output = ctx.createImageData(width, height);
                const outData = output.data;

                // Hillshade parameters
                const azimuth = 315 * (Math.PI / 180); // Light from NW
                const angle_altitude = 45 * (Math.PI / 180);
                const z_factor = 4.0; // Exaggeration factor

                // Precompute lighting vectors
                const sin_alt = Math.sin(angle_altitude);
                const cos_alt = Math.cos(angle_altitude);
                const cos_az = Math.cos(azimuth);
                const sin_az = Math.sin(azimuth);

                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = (y * width + x) * 4;

                        // Get neighbors heights (using Red channel)
                        // a b c
                        // d e f
                        // g h i
                        const a = data[((y - 1) * width + (x - 1)) * 4];
                        const b = data[((y - 1) * width + x) * 4];
                        const c = data[((y - 1) * width + (x + 1)) * 4];
                        const d = data[(y * width + (x - 1)) * 4];
                        // const e = data[idx];
                        const f = data[(y * width + (x + 1)) * 4];
                        const g = data[((y + 1) * width + (x - 1)) * 4];
                        const h = data[((y + 1) * width + x) * 4];
                        const i = data[((y + 1) * width + (x + 1)) * 4];

                        // Calculate slope
                        const dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / 8.0;
                        const dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / 8.0;

                        // Calculate aspect and slope
                        // Note: This is a fast approximation for visual effect, not scientifically accurate GIS
                        // We assume pixel distance is 1 for simplicity in visual tweaking
                        const slope = Math.atan(z_factor * Math.sqrt(dzdx * dzdx + dzdy * dzdy));

                        let aspect = 0;
                        if (dzdx !== 0) {
                            aspect = Math.atan2(dzdy, -dzdx);
                            if (aspect < 0) aspect += 2 * Math.PI;
                        } else {
                            aspect = Math.PI / 2;
                            if (dzdy > 0) aspect = 3 * Math.PI / 2;
                        }

                        // Calculate intensity
                        // Hillshade = (cos(Zenith) * cos(Slope)) + (sin(Zenith) * sin(Slope) * cos(Azimuth - Aspect))
                        // Zenith = 90 - Altitude. So cos(Zenith) = sin(Altitude), etc.
                        let intensity = sin_alt * Math.cos(slope) + cos_alt * Math.sin(slope) * Math.cos(azimuth - aspect);

                        // Normalize format -1 to 1 -> 0 to 255
                        // Actually visual range is roughly 0 to 1 with some clamp
                        intensity = Math.max(0, intensity);
                        let val = Math.floor(255 * intensity);

                        // Convert to Shadow Overlay:
                        // Bright areas (val > 128) -> Transparent
                        // Dark areas (val < 128) -> Black

                        // Strategy B: Mixed
                        // Use result as Alpha for a black layer?
                        // If intensity is high (lit), we want transparency.
                        // If intensity is low (shaded), we want black.

                        // So: Alpha = 255 - val
                        // But let's refine:
                        // val 255 (fully lit) -> Alpha 0
                        // val 0 (deep shadow) -> Alpha 180 (not fully black)

                        const alpha = Math.floor((1 - intensity) * 160); // Max opacity 160

                        outData[idx] = 0;     // R
                        outData[idx + 1] = 0; // G
                        outData[idx + 2] = 0; // B
                        outData[idx + 3] = alpha; // A
                    }
                }

                ctx.putImageData(output, 0, 0);

                // Add a very slight blur to soften pixelation
                // ctx.filter = 'blur(1px)'; // Note: might need simple generic blur if specific context filter not supported, but usually fine
                // ctx.drawImage(canvas, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject('Canvas to Blob failed');
                    }
                });
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
}
