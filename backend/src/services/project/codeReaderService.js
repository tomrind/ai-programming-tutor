import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE_BYTES = 200_000;
const MAX_FILES = 100;
const MAX_DEPTH = 8;

// BlueJ-Artefakte, Build-Ausgaben und Bibliotheken. Generierter Code
// wuerde die Einschaetzung des Bearbeitungsstands verfaelschen.
const IGNORED_DIRS = new Set([
  '+libs', 'doc',
  'build', 'out', 'target', 'dist',
  'node_modules',
]);

export function isIgnoredPath(absPath, root) {
  const rel = path.relative(root, absPath);
  return rel.split(path.sep).some(
    (seg) => IGNORED_DIRS.has(seg) || seg.startsWith('.')
  );
}

/** Sammelt rekursiv alle .java-Dateien unterhalb von root. */
export async function findJavaFiles(root) {
  const found = [];

  async function walk(dir, depth) {
    if (depth > MAX_DEPTH || found.length >= MAX_FILES) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (found.length >= MAX_FILES) return;
      const abs = path.join(dir, entry.name);
      if (isIgnoredPath(abs, root)) continue;
      if (entry.isDirectory()) await walk(abs, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.java')) found.push(abs);
    }
  }

  await walk(root, 0);
  return found.sort();
}

export async function readJavaFile(absPath, root) {
  const stat = await fs.stat(absPath);
  const truncated = stat.size > MAX_FILE_BYTES;
  let content = await fs.readFile(absPath, 'utf8');
  if (truncated) content = content.slice(0, MAX_FILE_BYTES);

  return {
    path: path.relative(root, absPath),
    absPath,
    content,
    lines: content.split('\n').length,
    bytes: stat.size,
    modifiedAt: stat.mtimeMs,
    truncated,
  };
}

export async function readProjectFiles(root) {
  const files = await findJavaFiles(root);
  return Promise.all(files.map((f) => readJavaFile(f, root)));
}

/** Erkennt an package.bluej, ob es sich um ein BlueJ-Projekt handelt. */
export async function isBlueJProject(root) {
  try {
    await fs.access(path.join(root, 'package.bluej'));
    return true;
  } catch {
    return false;
  }
}