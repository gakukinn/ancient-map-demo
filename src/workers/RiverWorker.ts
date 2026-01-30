export interface RiverWorkerRequest {
    id: number;
    width: number;
    height: number;
    esriData: Uint8ClampedArray | null;
    localData: Uint8ClampedArray | null;
}

export interface RiverWorkerResponse {
    id: number;
    data: Uint8ClampedArray;
}

self.onmessage = (e: MessageEvent<RiverWorkerRequest>) => {
    const { id, width, height, esriData, localData } = e.data;
    const len = width * height * 4;

    // Output buffer
    const outData = new Uint8ClampedArray(len);

    // Intermediate buffer for "is water" mask (1 byte per pixel)
    // Used for reliable edge detection
    const isRiver = new Uint8Array(width * height);

    // 1. Identify Water Pixels
    for (let i = 0; i < len; i += 4) {
        let isWaterPixel = false;
        const idx = i / 4;

        // Check ESRI
        if (esriData) {
            const r = esriData[i], g = esriData[i + 1], b = esriData[i + 2];
            if (b > r + 2 && b > g + 2 && b > 60 && (r < 250 || g < 250 || b < 250)) {
                isWaterPixel = true;
            }
        }

        // Check Local (Union)
        if (!isWaterPixel && localData) {
            const r = localData[i], g = localData[i + 1], b = localData[i + 2];
            if (b > r + 2 && b > g + 2 && b > 60 && (r < 250 || g < 250 || b < 250)) {
                isWaterPixel = true;
            }
        }

        if (isWaterPixel) {
            isRiver[idx] = 1;
        }
    }

    // 2. Apply Styling & Edge Detection
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;

            if (isRiver[idx]) {
                // Check neighbors for edge
                let isEdge = false;
                if (y > 0 && !isRiver[idx - width]) isEdge = true; // Top
                else if (y < height - 1 && !isRiver[idx + width]) isEdge = true; // Bottom
                else if (x > 0 && !isRiver[idx - 1]) isEdge = true; // Left
                else if (x < width - 1 && !isRiver[idx + 1]) isEdge = true; // Right

                if (isEdge) {
                    // Edge Color
                    outData[pixelIdx] = 60;
                    outData[pixelIdx + 1] = 90;
                    outData[pixelIdx + 2] = 140;
                    outData[pixelIdx + 3] = 255;
                } else {
                    // Body Color
                    outData[pixelIdx] = 100;
                    outData[pixelIdx + 1] = 150;
                    outData[pixelIdx + 2] = 200;
                    outData[pixelIdx + 3] = 255;
                }
            } else {
                // Transparent
                outData[pixelIdx + 3] = 0;
            }
        }
    }

    // Transfer back
    self.postMessage({ id, data: outData }, [outData.buffer] as any);
};
