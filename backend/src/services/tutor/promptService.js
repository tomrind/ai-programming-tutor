import fs from 'node:fs/promises';
import path from 'node:path';

import { config } from '../../config/config.js';

let cache = null;

async function loadTemplates() {
  if (cache) return cache;
  const dir = config.paths.prompts;
  const [system, levelsRaw] = await Promise.all([
    fs.readFile(path.join(dir, 'system.md'), 'utf8'),
    fs.readFile(path.join(dir, 'levels.json'), 'utf8'),
  ]);
  cache = { system, levels: JSON.parse(levelsRaw) };
  return cache;
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '(nicht verfuegbar)');
}

export async function buildSystemPrompt(context, level) {
  const { system, levels } = await loadTemplates();
  const levelDef = levels[String(level)] ?? levels['1'];

  return fill(system, {
    levelInstruction: levelDef.instruction,
    exercise: context.sections.exercise,
    codeStructure: context.sections.codeStructure,
    currentFile: context.sections.currentFile,
    compilerStatus: context.sections.compilerStatus,
  });
}

export async function getLevelLabel(level) {
  const { levels } = await loadTemplates();
  return levels[String(level)]?.label ?? 'unbekannt';
}