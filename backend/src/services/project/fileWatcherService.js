import { EventEmitter } from 'node:events';
import chokidar from 'chokidar';

import { isIgnoredPath, readProjectFiles } from './codeReaderService.js';
import { logger } from '../../utils/logger.js';

// BlueJ speichert beim Kompilieren mehrfach hintereinander.
const DEBOUNCE_MS = 500;

export const watcherEvents = new EventEmitter();

let watcher = null;
let debounceTimer = null;
let watchedRoot = null;

async function emitChange(reason) {
  try {
    const files = await readProjectFiles(watchedRoot);
    logger.debug(`Projekt neu eingelesen (${reason}): ${files.length} Datei(en)`);
    watcherEvents.emit('project:changed', { files, reason, at: Date.now() });
  } catch (err) {
    logger.error(`Einlesen fehlgeschlagen: ${err.message}`);
  }
}

function scheduleChange(reason) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => emitChange(reason), DEBOUNCE_MS);
}

export async function startWatching(root) {
  await stopWatching();
  watchedRoot = root;

  watcher = chokidar.watch(root, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored: (p, stats) => {
      if (isIgnoredPath(p, root)) return true;
      // Ordner nie ignorieren, sonst wird nicht hineingelaufen.
      if (stats?.isFile()) return !p.endsWith('.java');
      return false;
    },
  });

  watcher
    .on('add', (p) => scheduleChange(`neu: ${p}`))
    .on('change', (p) => scheduleChange(`geaendert: ${p}`))
    .on('unlink', (p) => scheduleChange(`geloescht: ${p}`))
    .on('error', (err) => logger.error(`Watcher-Fehler: ${err.message}`));

  logger.info(`Ueberwache Projektordner: ${root}`);
}

export async function stopWatching() {
  clearTimeout(debounceTimer);
  if (watcher) {
    await watcher.close();
    watcher = null;
    logger.info('Ueberwachung beendet');
  }
  watchedRoot = null;
}

export function isWatching() {
  return watcher !== null;
}