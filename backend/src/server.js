import { createApp } from './app.js';
import { config } from './config/config.js';
import { logger, setLogLevel } from './utils/logger.js';
import { warmUp } from './services/tutor/ollamaService.js';
import { restoreProject } from './services/project/projectService.js';
import { restoreExercise } from './services/exerciseService.js';

setLogLevel(config.logLevel);

const app = createApp();

// Bewusst nur an 127.0.0.1 gebunden: das Backend ist aus dem Netzwerk
// nicht erreichbar, auch nicht im Hochschul-WLAN.
app.listen(config.port, '127.0.0.1', () => {
  logger.info(`Backend laeuft auf http://127.0.0.1:${config.port}`);
  logger.info(`Modell: ${config.ollama.model} via ${config.ollama.baseUrl}`);
  warmUp();
  restoreProject();
  restoreExercise();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unbehandelte Promise-Ablehnung', { reason: String(reason) });
});