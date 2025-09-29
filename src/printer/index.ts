// src/printer/index.ts
import { SerialPort } from 'serialport';
import { cfg } from '../config.js';
import { logger } from '../logger.js';
import { TicketBlock, defaultConfig } from './definitions.js';
import { blocksToRaw } from './ticketBuilder.js';
import { initializeFonts } from './textLayout.js';
import { fmtDateTime, getKickAvatar, sleep } from './utils.js';

let isPrinting = false;

if (cfg.printer.enabled) {
    initializeFonts();
}

function packGSv0Seg({ data, width, y0, rows }: { data: Buffer; width: number; y0: number; rows: number }) {
    const bytesPerRow = Math.ceil(width / 8);
    const out = Buffer.alloc(bytesPerRow * rows, 0);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < width; c++) {
            if (data[(y0 + r) * width + c] === 0) { // Pixel is black
                out[r * bytesPerRow + Math.floor(c / 8)] |= (0x80 >> (c % 8));
            }
        }
    }

    const xL = bytesPerRow & 0xFF;
    const xH = (bytesPerRow >> 8) & 0xFF;
    const yL = rows & 0xFF;
    const yH = (rows >> 8) & 0xFF;

    return Buffer.concat([
        Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
        out
    ]);
}

async function sendToPrinter({ raw, width, height }: { raw: Buffer; width: number; height: number }) {
    const portPath = cfg.printer.port;
    logger.info(`[Printer] (send) Abriendo puerto: ${portPath}`);

    const port = new SerialPort({ path: portPath, baudRate: cfg.printer.baudRate, autoOpen: false });

    // --- LA CORRECCIÓN ESTÁ AQUÍ ---
    // Envolvemos cada operación de callback en su propia Promise, manejando el error correctamente.
    const openPort = () => new Promise<void>((resolve, reject) => {
        port.open((err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    const writeData = (data: Buffer) => new Promise<void>((resolve, reject) => {
        port.write(data, (err) => {
            if (err) return reject(err);
            port.drain((drainErr) => {
                if (drainErr) return reject(drainErr);
                resolve();
            });
        });
    });

    const closePort = () => new Promise<void>((resolve, reject) => {
        port.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    try {
        await openPort();

        await writeData(Buffer.from([0x1B, 0x40])); // Reset printer

        const chunkRows = defaultConfig.printer.chunkRows;
        for (let y = 0; y < height; y += chunkRows) {
            const rows = Math.min(chunkRows, height - y);
            const segment = packGSv0Seg({ data: raw, width, y0: y, rows });
            await writeData(segment);
            await sleep(defaultConfig.printer.chunkDelayMs);
        }

        const feed = Buffer.from([0x1B, 0x4A, defaultConfig.printer.tailFeedDots]);
        await writeData(feed);

    } finally {
        if (port.isOpen) {
            await closePort();
            logger.info(`[Printer] (send) Puerto cerrado.`);
        }
    }
}


async function printTicket(blocks: TicketBlock[]) {
    if (!cfg.printer.enabled) return;
    if (isPrinting) {
        logger.warn('[Printer] (queue) Impresora ocupada. El ticket se ignora.');
        return;
    }

    isPrinting = true;
    logger.info('[Printer] (print) Generando ticket...');
    try {
        const ticketData = await blocksToRaw(blocks);
        await sendToPrinter(ticketData);
        logger.info('[Printer] (print) Ticket enviado a la impresora.');
    } catch (error: any) {
        logger.error(error, `[Printer] (print) Error al imprimir ticket: ${error.message}`);
    } finally {
        isPrinting = false;
    }
}

export async function printFollowerTicket(username: string) {
    const avatarUrl = await getKickAvatar(username);

    const blocks: TicketBlock[] = [
        {
            type: 'title',
            text: '¡NUEVO SEGUIDOR!',
            oneLine: true,
            fontSize: 32,
            weight: 'bold',
            gapBottom: 10
        }
    ];

    if (avatarUrl) {
        blocks.push({
            type: 'photo' as const,
            src: avatarUrl,
            maxWidth: cfg.printer.photo.maxWidth,
            maxHeight: cfg.printer.photo.maxHeight,
            autoGapTop: 16,
            autoGapBottom: 16
        });
    }

    blocks.push(
        {
            type: 'title',
            text: username,
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
    );

    await printTicket(blocks);
}