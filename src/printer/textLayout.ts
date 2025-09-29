// src/printer/textLayout.ts
import TextToSVG from 'text-to-svg';
import { cfg } from '../config.js';

let t2s: { regular: TextToSVG; bold: TextToSVG };

export function initializeFonts() {
  // Inicializa las fuentes para el módulo, permitiendo que getT2S funcione
  try {
    console.info('[Printer] (font) Cargando fuentes...');
    t2s = {
      // Usar la estructura de config.fonts de src/config.js
      regular: TextToSVG.loadSync(cfg.printer.fontRegular),
      bold: TextToSVG.loadSync(cfg.printer.fontBold),
    };
    console.info('[Printer] (font) Fuentes cargadas correctamente.');
  } catch (error) {
    console.error(error, '[Printer] (font) Error fatal al cargar las fuentes de la impresora. Asegúrate de que las rutas en el .env son correctas.');
    throw error;
  }
}

export const getT2S = (weight: 'regular' | 'bold' = 'regular') => (weight === 'bold' ? t2s.bold : t2s.regular);