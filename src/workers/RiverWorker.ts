/**
 * RiverWorker - 水域检测 Web Worker
 * 分析 ESRI 瓦片像素，识别水域并渲染蓝色河流
 * 
 * [OPTIMIZED] 使用 OffscreenCanvas 在 Worker 中读取像素，避免主线程阻塞
 */

export interface RiverWorkerRequest {
    id: number;
    width: number;
    height: number;
    bitmap: ImageBitmap; // [NEW] 接收 ImageBitmap 而非原始数据
}

export interface RiverWorkerResponse {
    id: number;
    data: Uint8ClampedArray;
}

self.onmessage = (e: MessageEvent<RiverWorkerRequest>) => {
    const { id, width, height, bitmap } = e.data;
    const len = width * height * 4;

    // Output buffer
    const outData = new Uint8ClampedArray(len);

    // 如果没有 bitmap，直接返回透明图层
    if (!bitmap) {
        self.postMessage({ id, data: outData }, [outData.buffer] as any);
        return;
    }

    // [OPTIMIZATION] 使用 OffscreenCanvas 在 Worker 中读取像素
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const esriData = imgData.data;

    // 释放 bitmap 内存
    bitmap.close();

    // Intermediate buffer for "is water" mask (1 byte per pixel)
    const isRiver = new Uint8Array(width * height);

    // 1. 识别水域像素
    // [FIX] 收紧水域检测条件，防止山体阴影被误判为水域
    // 条件：蓝色差值 +8，最低蓝色值 80，亮度范围 70-210
    for (let i = 0; i < len; i += 4) {
        const r = esriData[i], g = esriData[i + 1], b = esriData[i + 2];
        const brightness = (r + g + b) / 3;

        // 水域特征：蓝色占优，亮度适中（非阴影），非纯白
        if (b > r + 8 && b > g + 8 && b > 80 && brightness > 70 && brightness < 210 && (r < 250 || g < 250 || b < 250)) {
            isRiver[i / 4] = 1;
        }
    }

    // 2. 应用样式 & 边缘检测
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;

            if (isRiver[idx]) {
                // 检测边缘
                let isEdge = false;
                if (y > 0 && !isRiver[idx - width]) isEdge = true;
                else if (y < height - 1 && !isRiver[idx + width]) isEdge = true;
                else if (x > 0 && !isRiver[idx - 1]) isEdge = true;
                else if (x < width - 1 && !isRiver[idx + 1]) isEdge = true;

                if (isEdge) {
                    // 边缘颜色（深蓝）
                    outData[pixelIdx] = 60;
                    outData[pixelIdx + 1] = 90;
                    outData[pixelIdx + 2] = 140;
                    outData[pixelIdx + 3] = 255;
                } else {
                    // 主体颜色（浅蓝）
                    outData[pixelIdx] = 100;
                    outData[pixelIdx + 1] = 150;
                    outData[pixelIdx + 2] = 200;
                    outData[pixelIdx + 3] = 255;
                }
            } else {
                // 透明
                outData[pixelIdx + 3] = 0;
            }
        }
    }

    // 返回结果
    self.postMessage({ id, data: outData }, [outData.buffer] as any);
};
