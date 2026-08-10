import fs from 'node:fs/promises';
import path from 'node:path';

import { config } from '../../config/config.js';
import { logger } from '../../utils/logger.js';
import { isBlueJProject, readProjectFiles } from './codeReaderService.js';
import { startWatching, stopWatching, isWatching } from './fileWatcherService.js';

const STATE_FILE = path.join(config.paths.data, 'currentProject.json');

let state = { root: null, isBlueJ: false, selectedAt: null };

export class InvalidProjectError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

async function persist() {
  await fs.mkdir(config.paths.data, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export async function selectProject(inputPath) {
  if (!inputPath?.trim()) {
    throw new InvalidProjectError('Kein Pfad angegeben.');
  }

  // Tilde aufloesen und absoluten, normalisierten Pfad erzwingen.
  const expanded = inputPath.startsWith('~')
    ? path.join(process.env.HOME ?? '', inputPath.slice(1))
    : inputPath;
  const root = path.resolve(expanded);

  let stat;
  try {
    stat = await fs.stat(root);
  } catch {
    throw new InvalidProjectError(`Ordner existiert nicht: ${root}`);
  }
  if (!stat.isDirectory()) {
    throw new InvalidProjectError(`Kein Ordner: ${root}`);
  }

  state = {
    root,
    isBlueJ: await isBlueJProject(root),
    selectedAt: Date.now(),
  };

  await persist();
  await startWatching(root);

  if (!state.isBlueJ) {
    logger.warn(`Keine package.bluej in ${root} - ist das ein BlueJ-Projekt?`);
  }

  return getStatus();
}

export async function getStatus() {
  if (!state.root) {
    return { selected: false, watching: false };
  }
  const files = await readProjectFiles(state.root);
  return {
    selected: true,
    root: state.root,
    isBlueJ: state.isBlueJ,
    watching: isWatching(),
    fileCount: files.length,
    files: files.map(({ path: p, lines, modifiedAt, truncated }) => ({
      path: p, lines, modifiedAt, truncated,
    })),
  };
}

export async function getFiles() {
  if (!state.root) throw new InvalidProjectError('Kein Projekt ausgewaehlt.');
  return readProjectFiles(state.root);
}

export function getRoot() {
  return state.root;
}

export async function clearProject() {
  await stopWatching();
  state = { root: null, isBlueJ: false, selectedAt: null };
  await persist();
}

/** Stellt beim Backend-Start das zuletzt gewaehlte Projekt wieder her. */
export async function restoreProject() {
  try {
    const saved = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
    if (saved.root) {
      await selectProject(saved.root);
      logger.info('Zuletzt gewaehltes Projekt wiederhergestellt');
    }
  } catch {
    logger.debug('Kein gespeichertes Projekt gefunden');
  }
}