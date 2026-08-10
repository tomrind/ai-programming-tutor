import crypto from 'node:crypto';
import { logger } from '../../utils/logger.js';

export const MAX_LEVEL = 4;
const MIN_LEVEL = 1;

// Sitzungen leben im Arbeitsspeicher; Persistenz folgt in Schritt 10.
const sessions = new Map();

/** Fingerabdruck des gesamten Projektcodes, um Aenderungen zu erkennen. */
export function fingerprint(files) {
  const hash = crypto.createHash('sha1');
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(f.path).update('\0').update(f.content).update('\0');
  }
  return hash.digest('hex');
}

function emptyState() {
  return { level: MIN_LEVEL, codeFingerprint: null, exerciseId: null, turns: 0 };
}

export function getState(sessionId = 'default') {
  if (!sessions.has(sessionId)) sessions.set(sessionId, emptyState());
  return sessions.get(sessionId);
}

/**
 * Entscheidet die Hilfestufe fuer die naechste Antwort.
 *
 * Die Regel setzt Scaffolding um: Unterstuetzung wird nur so weit
 * erhoeht, wie der Studierende sie braucht, und wieder zurueckgenommen,
 * sobald er selbst weiterarbeitet (Fading).
 *
 * - neue Aufgabe          -> zurueck auf Stufe 1
 * - Code hat sich geaendert -> eine Stufe zurueck (Fortschritt erkannt)
 * - Code unveraendert     -> eine Stufe hoeher (offenbar weiterhin blockiert)
 */
export function determineLevel({ sessionId = 'default', exerciseId, files }) {
  const state = getState(sessionId);
  const current = fingerprint(files);
  let reason;

  if (state.exerciseId !== exerciseId) {
    state.level = MIN_LEVEL;
    reason = 'neue Aufgabe';
  } else if (state.codeFingerprint === null) {
    state.level = MIN_LEVEL;
    reason = 'erste Frage';
  } else if (state.codeFingerprint !== current) {
    state.level = Math.max(MIN_LEVEL, state.level - 1);
    reason = 'Code wurde veraendert';
  } else {
    state.level = Math.min(MAX_LEVEL, state.level + 1);
    reason = 'Code unveraendert, erneute Nachfrage';
  }

  state.exerciseId = exerciseId;
  state.codeFingerprint = current;
  state.turns += 1;

  logger.info(`Hilfestufe ${state.level} (${reason})`);
  return { level: state.level, reason, turns: state.turns };
}

export function resetSession(sessionId = 'default') {
  sessions.set(sessionId, emptyState());
}