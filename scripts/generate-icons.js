import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Minimal pure Node.js PNG encoder using zlib
function createPng(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc32(body), 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = chunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    scanlines[rowStart] = 0; // Filter None
    rgbaBuffer.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idat = chunk('IDAT', compressedData);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// Helper to draw rounded rectangle
function isInsideRoundedRect(x, y, rx, ry, rw, rh, radius) {
  if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
  
  // Check corners
  const left = x < rx + radius;
  const right = x >= rx + rw - radius;
  const top = y < ry + radius;
  const bottom = y >= ry + rh - radius;

  if (left && top) {
    const dx = x - (rx + radius);
    const dy = y - (ry + radius);
    return dx * dx + dy * dy <= radius * radius;
  }
  if (right && top) {
    const dx = x - (rx + rw - radius);
    const dy = y - (ry + radius);
    return dx * dx + dy * dy <= radius * radius;
  }
  if (left && bottom) {
    const dx = x - (rx + radius);
    const dy = y - (ry + rh - radius);
    return dx * dx + dy * dy <= radius * radius;
  }
  if (right && bottom) {
    const dx = x - (rx + rw - radius);
    const dy = y - (ry + rh - radius);
    return dx * dx + dy * dy <= radius * radius;
  }

  return true;
}

// Render icon pixels
function renderIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;

  const bgRadius = isMaskable ? 0 : 120 * scale;
  const darkR = {
    x: (isMaskable ? 96 : 72) * scale,
    y: (isMaskable ? 180 : 160) * scale,
    w: (isMaskable ? 220 : 270) * scale,
    h: (isMaskable ? 220 : 270) * scale,
    r: (isMaskable ? 54 : 64) * scale
  };
  const greenR = {
    x: (isMaskable ? 196 : 170) * scale,
    y: (isMaskable ? 112 : 82) * scale,
    w: (isMaskable ? 220 : 270) * scale,
    h: (isMaskable ? 220 : 270) * scale,
    r: (isMaskable ? 54 : 64) * scale
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Base background
      if (isInsideRoundedRect(x, y, 0, 0, size, size, bgRadius)) {
        let r = 11, g = 18, b = 32, a = 255; // #0B1220

        // Dark slate rect (#1C2635)
        if (isInsideRoundedRect(x, y, darkR.x, darkR.y, darkR.w, darkR.h, darkR.r)) {
          r = 28; g = 38; b = 53;
        }

        // Green primary rect (#1DCF9F)
        if (isInsideRoundedRect(x, y, greenR.x, greenR.y, greenR.w, greenR.h, greenR.r)) {
          r = 29; g = 207; b = 159;
        }

        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
      } else {
        // Transparent outside
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      }
    }
  }

  return createPng(size, size, buf);
}

// Generate files
const png192 = renderIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = renderIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const appleTouch = renderIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

const maskable512 = renderIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);

console.log('PNG icons generated: 192x192, 512x512, apple-touch-icon, maskable-512x512');
