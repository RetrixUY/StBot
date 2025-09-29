// src/printer/imageProcessor.ts
import sharp from 'sharp';
import { defaultConfig, PhotoBlock, TicketBlock } from './definitions.js';
import { cfg } from '../config.js';

const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// --- Matrices de Dithering de Bayer (Normalizadas 0..1) ---

const B4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
].map(r => r.map(v => (v + 0.5) / 16));

const B8raw = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];
const B8 = B8raw.map(r => r.map(v => (v + 0.5) / 64));

// Floyd–Steinberg con control de umbral, fuerza y serpentine
function applyDitheringFS(data: Buffer, width: number, height: number, {
  threshold = 128,
  strength = 1.0,
  serpentine = true,
} = {}) {
  const out = Buffer.from(data);

  for (let y = 0; y < height - 1; y++) {
    const leftToRight = !serpentine || (y % 2 === 0);
    const xStart = leftToRight ? 0 : width - 1;
    const xEnd = leftToRight ? width - 1 : 0;
    const step = leftToRight ? 1 : -1;

    for (let x = xStart; leftToRight ? x < xEnd : x > xEnd; x += step) {
      const i = y * width + x;
      const oldPx = out[i];
      const newPx = oldPx < threshold ? 0 : 255;
      out[i] = newPx;
      const err = (oldPx - newPx) * strength;

      const xr = x + step;
      const xl = x - step;
      const y1 = y + 1;

      if (leftToRight) {
        if (xr < width) out[i + step] = clamp8(out[i + step] + err * 7 / 16);
        if (y1 < height && xl >= 0) out[i + width - step] = clamp8(out[i + width - step] + err * 3 / 16);
        if (y1 < height) out[i + width] = clamp8(out[i + width] + err * 5 / 16);
        if (y1 < height && xr < width) out[i + width + step] = clamp8(out[i + width + step] + err * 1 / 16);
      } else {
        if (xl >= 0) out[i - step] = clamp8(out[i - step] + err * 7 / 16);
        if (y1 < height && xr < width) out[i + width + step] = clamp8(out[i + width + step] + err * 3 / 16);
        if (y1 < height) out[i + width] = clamp8(out[i + width] + err * 5 / 16);
        if (y1 < height && xl >= 0) out[i + width - step] = clamp8(out[i + width - step] + err * 1 / 16);
      }
    }
  }

  const finalThreshold = threshold < 128 ? 0 : 255;
  for (let i = 0; i < width; i++) {
    const idx = (height - 1) * width + i;
    out[idx] = out[idx] < finalThreshold ? 0 : 255;
  }
  for (let i = 0; i < height; i++) {
    const idx = i * width + (width - 1);
    out[idx] = out[idx] < finalThreshold ? 0 : 255;
  }

  return out;
}

// Dithering por trama ordenada (Bayer)
function applyDitheringBayer(data: Buffer, width: number, height: number, {
  matrixSize = 4,
  gamma = 1.0,
}: { matrixSize?: 4 | 8; gamma?: number } = {}) {
  const M = (matrixSize === 8) ? B8 : B4;
  const out = Buffer.alloc(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = Math.pow(data[i] / 255, gamma);
      const thr = M[y % M.length][x % M[0].length]; // 0..1
      out[i] = (v < thr) ? 0 : 255;
    }
  }
  return out;
}

type DitherOptions = PhotoBlock['dither'];

export async function loadPhotoToBitmap(
  src: string | Buffer,
  maxW: number,
  maxH: number,
  opts: {
    circleMask?: boolean;
    border?: boolean;
    dither?: DitherOptions;
  } = {}
): Promise<{ raw: Buffer; width: number; height: number }> {
  
  const circleMask = opts.circleMask ?? defaultConfig.photo.circleMask;
  const border = opts.border ?? defaultConfig.photo.border;
  const ditherOpts = opts.dither ?? {};
  const ditherMode = ditherOpts.mode || 'fs';

  const size = Math.min(maxW, maxH);
  const input = Buffer.isBuffer(src)
    ? src
    : await fetch(src).then(res => res.arrayBuffer()).then(ab => Buffer.from(ab));

  // 1. Pre-procesamiento robusto
  let processedImage = await sharp(input)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .grayscale()
    .normalise()
    .modulate({ brightness: 1.4, saturation: 0.8 })
    .toBuffer();

  // 2. Preparación para Dithering
  const { data, info } = await sharp(processedImage)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .grayscale()
    .linear(1.2, -10)
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 3. Dithering
  let ditheredData: Buffer;
  if (ditherMode === 'bayer') {
    ditheredData = applyDitheringBayer(data, size, size, {
      matrixSize: ditherOpts.matrixSize as 4 | 8 ?? 4,
      gamma: ditherOpts.gamma ?? 1.0,
    });
  } else {
    ditheredData = applyDitheringFS(data, size, size, {
      threshold: ditherOpts.threshold ?? 128,
      strength: ditherOpts.strength ?? 1.0,
      serpentine: ditherOpts.serpentine ?? true,
    });
  }

  // Si no hay máscara, devuelve el dithered raw
  if (!circleMask) {
    return { raw: ditheredData, width: size, height: size };
  }

  // 4. Máscara Circular y Borde
  const mask = Buffer.alloc(size * size, 255);
  const center = size / 2;
  const radius = (size / 2) - 3;
  const outerRadius = radius + 2;
  const innerRadius = radius - 0.5;
  const radiusSquared = innerRadius * innerRadius;
  const outerSquared = outerRadius * outerRadius;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const distanceSquared = dx * dx + dy * dy;
      const index = y * size + x;

      if (distanceSquared <= radiusSquared) {
        mask[index] = ditheredData[index]; // Interior: píxel dithered
      } else if (border && distanceSquared <= outerSquared) {
        mask[index] = 0; // Borde: negro
      }
      // Fuera: queda blanco (255)
    }
  }

  return { raw: mask, width: size, height: size };
}

/**
 * Convert processed image data to PNG preview (RESCATADO DE SOLUCIÓN VIEJA)
 */
export async function savePreviewPNG(
    data: { raw: Buffer; width: number; height: number },
    outPath: string
): Promise<void> {
  const { raw, width, height } = data;
  
  await sharp(raw, { raw: { width, height, channels: 1 } })
    .resize({ width: cfg.printer.width, fit: 'fill' }) // Usa config.width para escalar
    .png()
    .toFile(outPath);
}