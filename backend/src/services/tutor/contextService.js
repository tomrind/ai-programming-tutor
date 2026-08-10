import { getFiles, getRoot } from '../project/projectService.js';
import { getCurrentExercise, toPromptSummary as exerciseSummary }
  from '../exerciseService.js';
import { analyzeProject, toPromptSummary as structureSummary }
  from '../analysis/codeAnalysisService.js';
import { compileProject, toPromptSummary as compilerSummary }
  from '../analysis/compilerService.js';

// Nur die zuletzt bearbeitete Datei geht im Volltext in den Prompt.
// Alle uebrigen sind ueber die Strukturzusammenfassung vertreten.
const MAX_CURRENT_FILE_LINES = 120;

function pickCurrentFile(files) {
  if (files.length === 0) return null;
  return files.reduce((a, b) => (a.modifiedAt >= b.modifiedAt ? a : b));
}

function formatCurrentFile(file) {
  if (!file) return 'Keine Datei vorhanden.';

  const lines = file.content.split('\n');
  const shown = lines.slice(0, MAX_CURRENT_FILE_LINES);
  const numbered = shown.map((l, i) => `${String(i + 1).padStart(3)} | ${l}`);

  if (lines.length > MAX_CURRENT_FILE_LINES) {
    numbered.push(`... (${lines.length - MAX_CURRENT_FILE_LINES} weitere Zeilen)`);
  }

  return `${file.path}\n${numbered.join('\n')}`;
}

/**
 * Stellt den vollstaendigen Kontext zusammen. Zeilennummern sind wichtig:
 * ohne sie kann der Tutor nicht auf konkrete Stellen verweisen.
 */
export async function buildContext() {
  const files = await getFiles();
  const exercise = await getCurrentExercise();
  const analyses = analyzeProject(files);
  const compilation = await compileProject(getRoot(), files.map((f) => f.absPath));
  const currentFile = pickCurrentFile(files);

  return {
    exercise,
    files,
    analyses,
    compilation,
    currentFile,
    sections: {
      exercise: exerciseSummary(exercise),
      codeStructure: structureSummary(analyses),
      currentFile: formatCurrentFile(currentFile),
      compilerStatus: compilerSummary(compilation),
    },
  };
}