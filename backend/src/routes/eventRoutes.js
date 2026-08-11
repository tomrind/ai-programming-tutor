import { Router } from 'express';

import { watcherEvents } from '../services/project/fileWatcherService.js';
import { compileProject } from '../services/analysis/compilerService.js';
import { getRoot } from '../services/project/projectService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Meldet dem Frontend, wenn sich der Code geaendert hat und dabei
 * Compilerfehler entstanden oder verschwunden sind. Bewusst nur eine
 * Meldung, keine Erklaerung: der Studierende entscheidet, ob er Hilfe
 * anfordert.
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  send('ready', { at: Date.now() });

  const onChange = async ({ files }) => {
    try {
      const result = await compileProject(getRoot(), files.map((f) => f.absPath));
      const errors = (result.diagnostics ?? []).filter((d) => d.severity === 'error');

      send('code', {
        at: Date.now(),
        compiled: result.compiled,
        fileCount: files.length,
        errors: errors.slice(0, 3).map((e) => ({
          file: e.file, line: e.line, label: e.label, didactic: e.didactic,
        })),
      });
    } catch (err) {
      logger.warn(`Ereignis konnte nicht gesendet werden: ${err.message}`);
    }
  };

  watcherEvents.on('project:changed', onChange);

  // Verhindert, dass Proxys die Verbindung als tot verwerfen.
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);

  res.on('close', () => {
    clearInterval(ping);
    watcherEvents.off('project:changed', onChange);
    res.end();
  });
});

export default router;