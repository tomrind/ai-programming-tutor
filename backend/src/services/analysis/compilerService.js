import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { config } from '../../config/config.js';
import { logger } from '../../utils/logger.js';
import { classify } from './errorTaxonomy.js';

const execFileAsync = promisify(execFile);

let outDir = null;
let javacAvailable = null;

/**
 * Ausgabeverzeichnis liegt bewusst ausserhalb des Projektordners:
 * .class-Dateien im BlueJ-Projekt wuerden BlueJ selbst durcheinanderbringen
 * und ausserdem den Datei-Watcher ausloesen.
 */
async function getOutDir() {
  if (!outDir) {
    outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ki-tutor-classes-'));
    logger.debug(`Compiler-Ausgabeverzeichnis: ${outDir}`);
  }
  return outDir;
}

export async function isJavacAvailable() {
  if (javacAvailable !== null) return javacAvailable;
  try {
    await execFileAsync(config.javac.path, ['-version'], { timeout: 5000 });
    javacAvailable = true;
  } catch {
    javacAvailable = false;
    logger.warn(`javac unter "${config.javac.path}" nicht gefunden - Compilerfehler stehen nicht zur Verfuegung.`);
  }
  return javacAvailable;
}

/**
 * javac meldet im Format
 *   /pfad/Datei.java:9: error: illegal start of expression
 *       public void einzahlen(int betrag)
 *       ^
 * Folgezeilen (symbol:, location:) gehoeren zur vorherigen Meldung.
 */
function parseJavacOutput(output, root) {
  const HEADER = /^(.*\.java):(\d+):\s+(error|warning):\s+(.*)$/;
  const diagnostics = [];
  let current = null;

  for (const raw of output.split('\n')) {
    const header = raw.match(HEADER);

    if (header) {
      if (current) diagnostics.push(current);
      const [, file, line, severity, message] = header;
      current = {
        file: path.relative(root, file),
        line: Number(line),
        column: null,
        severity,
        message: message.trim(),
        sourceLine: null,
        details: [],
        ...classify(message),
      };
      continue;
    }

    if (!current) continue;

    // Die Zeile mit dem Zirkumflex markiert die Spalte.
    const caret = raw.indexOf('^');
    if (caret >= 0 && raw.trim() === '^') {
      current.column = caret + 1;
      continue;
    }

    if (/^\s*(symbol|location|required|found|reason):/.test(raw)) {
      current.details.push(raw.trim());
      continue;
    }

    if (current.sourceLine === null && raw.trim()) {
      current.sourceLine = raw.trim().slice(0, 120);
    }
  }

  if (current) diagnostics.push(current);
  return diagnostics;
}

/** Kompiliert alle uebergebenen Dateien und liefert die Diagnostics. */
export async function compileProject(root, absPaths) {
  if (!(await isJavacAvailable())) {
    return { available: false, diagnostics: [], compiled: false };
  }
  if (absPaths.length === 0) {
    return { available: true, diagnostics: [], compiled: true };
  }

  const target = await getOutDir();
  const args = [
    '-J-Duser.language=en',
    '-J-Duser.country=US',
    '-d', target,
    '-encoding', 'UTF-8',
    '-proc:none',
    '-sourcepath', root,
    ...absPaths,
  ];

  const startedAt = Date.now();
  let stderr = '';
  let compiled = true;

  try {
    const result = await execFileAsync(config.javac.path, args, {
      timeout: config.javac.timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });
    stderr = result.stderr ?? '';
  } catch (err) {
    // Nicht-null Exit-Code ist der Normalfall bei Compilerfehlern.
    if (err.killed) {
      logger.warn('javac-Zeitlimit ueberschritten');
      return { available: true, diagnostics: [], compiled: false, timedOut: true };
    }
    stderr = err.stderr ?? '';
    compiled = false;
  }

  const diagnostics = parseJavacOutput(stderr, root);
  const errors = diagnostics.filter((d) => d.severity === 'error');

  logger.debug(`javac: ${errors.length} Fehler in ${Date.now() - startedAt} ms`);

  return {
    available: true,
    compiled: compiled && errors.length === 0,
    durationMs: Date.now() - startedAt,
    diagnostics,
    errorCount: errors.length,
  };
}

/** Verdichtet die Diagnostics fuer den Prompt. */
export function toPromptSummary(result) {
  if (!result.available) return 'Compilerstatus: nicht verfuegbar.';
  if (result.compiled) return 'Compilerstatus: uebersetzt fehlerfrei.';

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length === 0) return 'Compilerstatus: uebersetzt fehlerfrei.';

  const parts = [`Compilerfehler (${errors.length}):`];
  for (const e of errors.slice(0, 5)) {
    parts.push(`  ${e.file}, Zeile ${e.line}: ${e.message} [${e.label}]`);
    if (e.sourceLine) parts.push(`    Quellzeile: ${e.sourceLine}`);
    if (e.details.length) parts.push(`    ${e.details.join(' | ')}`);
  }
  if (errors.length > 5) parts.push(`  ... und ${errors.length - 5} weitere`);

  return parts.join('\n');
}