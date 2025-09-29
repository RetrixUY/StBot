export type TitleBlock = {
  type: 'title';
  text: string;
  fontSize?: number;
  weight?: 'regular' | 'bold';
  oneLine?: boolean;
  align?: 'left' | 'center' | 'right';
  gapBottom?: number;
  gapTop?: number;
}
export type TextBlock = {
  type: 'text';
  text: string;
  fontSize?: number;
  weight?: 'regular' | 'bold';
  align?: 'left' | 'center' | 'right';
  gapBottom?: number;
  gapTop?: number;
}

export type PhotoBlock = {
  type: 'photo';
  src: Buffer | string;
  maxWidth?: number;
  maxHeight?: number; 
  circleMask?: boolean;
  border?: boolean;
  autoGapTop?: number;
  autoGapBottom?: number;
  // Propiedad 'dither' agregada
  dither?: {
    mode?: 'fs' | 'bayer';
    threshold?: number;
    strength?: number;
    serpentine?: boolean;
    matrixSize?: 4 | 8;
    gamma?: number;
  };
  gapTop?: number;
  gapBottom?: number;
}

export type TicketBlock = TitleBlock | TextBlock | PhotoBlock;

export interface PrinterConfig {
  width: number;
  margins: { left: number; right: number; top: number; bottom: number };
  wrapSafety: number;
  measureBleedPad: number;
  raster: { gamma: number; threshold: number; density: number };
  tailSafePx: number;
  growStepPx: number;
  maxGrows: number;
  printer: {
    heat: number[];
    chunkRows: number;
    chunkDelayMs: number;
    tailFeedDots: number;
  };
  photo: {
    maxWidth: number;
    maxHeight: number;
    circleMask: boolean;
    border: boolean;
  };
}

export const defaultConfig: PrinterConfig = {
  width: 384,
  margins: { left: 14, right: 14, top: 12, bottom: 8 },
  wrapSafety: 24,
  measureBleedPad: 20,
  raster: { gamma: 1.0, threshold: 145, density: 72 },
  tailSafePx: 12,
  growStepPx: 48,
  maxGrows: 4,
  printer: {
    heat: [0x07, 0xA0, 0x02],
    chunkRows: 192,
    chunkDelayMs: 25,
    tailFeedDots: 120,
  },
  photo: {
    maxWidth: 220,
    maxHeight: 220,
    circleMask: true,
    border: true,
  },
};