import pino from "pino";
import pretty from 'pino-pretty';
import chalk, { ChalkInstance } from 'chalk';

// Colores para los módulos principales (ej: [SB])
const moduleColors: { [key: string]: ChalkInstance } = {
  core: chalk.bold.cyan,
  http: chalk.bold.magenta,
  spotify: chalk.bold.green,
  SB: chalk.bold.yellow,
  default: chalk.bold.white,
};

// --- NUEVO: Colores para los submódulos (ej: (chat)) ---
const subModuleColors: { [key: string]: ChalkInstance } = {
  songRequest: chalk.hex('#FFD700'), // Amarillo Oro
  reward: chalk.hex('#98FB98'),      // Verde Pálido
  chat: chalk.hex('#87CEEB'),        // Azul Cielo
  follow: chalk.hex('#FFA07A'),      // Salmón Claro
  raid: chalk.hex('#FF69B4'),        // Rosa Fuerte
  sub: chalk.hex('#BA55D3'),         // Orquídea Medio
  kicks: chalk.hex('#32CD32'),       // Verde Lima
  poll: chalk.hex('#FF8C00'),        // Naranja Oscuro
  predict: chalk.hex('#6A5ACD'),    // Azul Pizarra
  default: chalk.white,
};

const stream = pretty({
  colorize: true,
  translateTime: 'SYS:HH:MM:ss',
  ignore: 'pid,hostname',
  
  messageFormat: (log: pino.LogDescriptor, messageKey: string) => {
    let msg = log[messageKey] as string;

    // 1. Colorear el módulo principal (como antes)
    const moduleMatch = msg.match(/^\[(\w+)\]\s/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      const colorizer = moduleColors[moduleName] || moduleColors.default;
      msg = msg.replace(`[${moduleName}]`, colorizer(`[${moduleName}]`));
    }

    // --- NUEVO: 2. Colorear el submódulo ---
    const subModuleMatch = msg.match(/\((\w+)\)/);
    if (subModuleMatch) {
      const subModuleName = subModuleMatch[1];
      const colorizer = subModuleColors[subModuleName] || subModuleColors.default;
      msg = msg.replace(`(${subModuleName})`, colorizer(`(${subModuleName})`));
    }

    return msg;
  }
});

export const logger = pino(stream);