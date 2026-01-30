const fs = require('fs');
const path = require('path');
// We can't use 'canvas' or 'image-size' easily if not installed.
// We'll use a simple heuristic or try to read PNG header if possible, 
// OR just assume we can run a browser test? No.
// Let's try to infer from file size? No.
// Inspecting PNG header manually to get IHDR chunk.
// IHDR is at offset 8 (after signature).
// Width 4 bytes, Height 4 bytes.

function getPngDimensions(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(24);
        fs.readSync(fd, buffer, 0, 24, 0);
        fs.closeSync(fd);

        // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
        if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
            return 'Not a PNG';
        }

        // IHDR chunk starts at 12 (Length 4, Type 4, Data...)
        // Actually:
        // Sig: 8 bytes
        // Length: 4 bytes (at 8) -> should be 13
        // Type: 4 bytes (at 12) -> IHDR
        // Width: 4 bytes (at 16)
        // Height: 4 bytes (at 20)

        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height, ratio: (width / height).toFixed(2) };
    } catch (e) {
        return e.message;
    }
}

const p1 = 'C:/Users/GAKU/Desktop/MAPWAR/public/SUCAI/S10DB/484-1.png';
const p2 = 'C:/Users/GAKU/Desktop/MAPWAR/public/SUCAI/S10DB/366-1.png';

console.log('484-1 (Infantry):', getPngDimensions(p1));
console.log('366-1 (Crossbow):', getPngDimensions(p2));
