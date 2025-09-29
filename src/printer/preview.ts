// src/printer/preview.ts
import { TicketBlock } from './definitions.js';
import { blocksToRaw } from './ticketBuilder.js';
import { savePreviewPNG } from './imageProcessor.js';
import { getKickAvatar, fmtDateTime } from './utils.js'; // Utilidades
import { initializeFonts } from './textLayout.js'; // <-- Importar initializeFonts
import { cfg } from '../config.js';

/**
 * Build block structure for a new follower ticket (Rescatado de src/streamer.js)
 */
function buildBlocks(name: string, photo: string | null): TicketBlock[] {
  return [
    {
      type: 'title',
      text: '¡NUEVO SEGUIDOR!',
      oneLine: true,
      fontSize: 32,
      weight: 'bold',
      gapBottom: 10
    },
    // Corrección de tipo (as const)
    ...(photo ? [{
      type: 'photo' as const,
      src: photo,
      maxWidth: cfg.printer.photo.maxWidth,
      maxHeight: cfg.printer.photo.maxHeight,
      autoGapTop: 16,
      autoGapBottom: 16
    }] : []),
    {
      type: 'title',
      text: String(name || 'StreamerFan'),
      fontSize: 36,
      weight: 'bold',
      gapBottom: 8
    },
    {
      type: 'text',
      text: fmtDateTime(),
      fontSize: 24,
      align: 'center',
      gapBottom: 10
    },
    {
      type: 'text',
      text: '¡Gracias por seguir el canal!',
      fontSize: 28,
      align: 'center',
      gapBottom: 80
    }
  ] as TicketBlock[]; 
}

/**
 * Generate a preview PNG of the follower ticket (Rescatado de src/streamer.js)
 */
export async function previewNewFollower({ name, photo, out = 'preview_follower.png' }: { name: string, photo: string | null, out?: string }) {
  
  // 🔴 CORRECCIÓN CLAVE: Inicializar las fuentes antes de generar los bloques
  initializeFonts();
  
  const blocks = buildBlocks(name, photo);
  const ticketData = await blocksToRaw(blocks);
  await savePreviewPNG(ticketData, out);
  console.log(`[Preview] PNG ready: ${out} (${cfg.printer.width}x${ticketData.height})`);
  return { out, width: cfg.printer.width, height: ticketData.height };
}


// --- Lógica de CLI simple para prueba ---
if (import.meta.main) {
  (async () => {
    // Para probar, puedes ejecutar: node printer/preview.ts "nombre_de_usuario"
    const args = process.argv.slice(2);
    const positional = args.filter(a => !a.startsWith('--'));
    const name = positional[0] || 'retrixuy';

    console.log(`[Preview] Generando previsualización para el usuario: ${name}`);

    // Obtener Avatar Kick
    let photo: string | null = null;
    try {
      photo = await getKickAvatar(name);
      console.log(`[Preview] Avatar de Kick encontrado: ${photo}`);
    } catch (e: any) {
      console.error(`[Preview] Falló al obtener el avatar: ${e.message}`);
    }

    const res = await previewNewFollower({ name, photo });
    console.log(`✅ Preview guardada: ${res.out} (${res.width}x${res.height})`);

  })().catch(e => {
    console.error('❌ Error fatal en preview:', e);
    process.exit(1);
  });
}