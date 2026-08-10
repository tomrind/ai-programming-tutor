import fs from 'node:fs/promises';
import path from 'node:path';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

let currentId = null;

export class ExerciseNotFoundError extends Error {
  constructor(id) {
    super(`Aufgabe "${id}" nicht gefunden.`);
    this.status = 404;
  }
}

/**
 * Liest ausschliesslich description.md und meta.json ueber feste Pfade.
 * Bewusst kein Verzeichnis-Scan: so kann keine andere Datei aus dem
 * Aufgabenordner versehentlich in den Kontext des Tutors geraten.
 */
async function loadExercise(id) {
    const normalized = String(id ?? '').toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) throw new ExerciseNotFoundError(id);

  const dir = path.join(config.paths.exercises, normalized);
  try {
    const [description, metaRaw] = await Promise.all([
      fs.readFile(path.join(dir, 'description.md'), 'utf8'),
      fs.readFile(path.join(dir, 'meta.json'), 'utf8'),
    ]);
    return { ...JSON.parse(metaRaw), id, description };
  } catch {
    throw new ExerciseNotFoundError(id);
  }
}

export async function listExercises() {
  const entries = await fs.readdir(config.paths.exercises, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const { id, title, difficulty, concepts } = await loadExercise(entry.name);
      result.push({ id, title, difficulty, concepts });
    } catch {
      logger.warn(`Aufgabenordner "${entry.name}" unvollstaendig - uebersprungen`);
    }
  }
  return result.sort((a, b) => a.difficulty - b.difficulty);
}

export async function selectExercise(id) {
  const exercise = await loadExercise(id);
  currentId = exercise.id;
  logger.info(`Aufgabe gewaehlt: ${exercise.title}`);
  return exercise;
}

export async function getCurrentExercise() {
  return currentId ? loadExercise(currentId) : null;
}

/** Verdichtet die Aufgabe fuer den Prompt. */
export function toPromptSummary(exercise) {
  if (!exercise) return 'Keine Aufgabe ausgewaehlt.';
  return [
    `Aufgabe: ${exercise.title}`,
    exercise.description.trim(),
    `Lernziele: ${(exercise.learningGoals ?? []).join('; ')}`,
    `Erwartete Methoden: ${(exercise.expectedMethods ?? []).join(', ')}`,
  ].join('\n');
}