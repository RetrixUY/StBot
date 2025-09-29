// src/printer/ticketBuilder.ts
import sharp from 'sharp';
import { TicketBlock, defaultConfig as printerCfg } from './definitions.js';
import { getT2S } from './textLayout.js';
import { loadPhotoToBitmap } from './imageProcessor.js';

export async function blocksToRaw(blocks: TicketBlock[]): Promise<{ raw: Buffer; width: number; height: number }> {
  const { width, margins } = printerCfg;
  const contentWidth = width - margins.left - margins.right;
  let y = margins.top;

  const svgParts: string[] = [];
  const compositeJobs: any[] = [];

  for (const block of blocks) {
    y += block.gapTop ?? 0;

    if ((block.type === 'title' || block.type === 'text') && block.text) {
      const t2s = getT2S(block.weight);
      const fontSize = block.fontSize ?? (block.type === 'title' ? 24 : 18);
      const metrics = t2s.getMetrics(block.text, { fontSize });
      let x = margins.left;
      if (block.align !== 'left') {
          x = Math.floor(margins.left + (contentWidth - metrics.width) / 2);
      }
      svgParts.push(t2s.getPath(block.text, { x, y, fontSize, anchor: 'top', attributes: { fill: 'black' } }));
      y += metrics.height;
    }

    if (block.type === 'photo' && block.src) {
      y += block.autoGapTop ?? 16;
      
      const { raw, width: w, height: h } = await loadPhotoToBitmap(
          block.src,
          contentWidth,
          block.maxHeight ?? 220,
          {
              circleMask: block.circleMask,
              border: block.border,
              dither: block.dither // <--- PROPIEDAD DITHER PASADA
          }
      );
      
      const left = Math.floor(margins.left + (contentWidth - w) / 2);
      
      compositeJobs.push({
          input: raw,
          raw: { width: w, height: h, channels: 1 },
          top: Math.round(y),
          left: left,
      });

      y += h + (block.autoGapBottom ?? 2);
    }

    y += block.gapBottom ?? 0;
  }

  const height = Math.ceil(y + margins.bottom);
  const svg = `<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${svgParts.join('')}</svg>`;
  
  // 1. Renderiza el texto base
  let baseImage = sharp(Buffer.from(svg), { density: printerCfg.raster.density });
  
  // 2. Compone las fotos encima del texto
  if (compositeJobs.length > 0) {
      baseImage = baseImage.composite(compositeJobs);
  }

  // 3. Procesa la imagen final para la impresora
  const finalImage = await baseImage
      .grayscale()
      .threshold(printerCfg.raster.threshold)
      .raw()
      .toBuffer();

  return { raw: finalImage, width, height };
}