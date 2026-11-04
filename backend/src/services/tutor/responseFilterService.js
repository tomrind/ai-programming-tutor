import { logger } from '../../utils/logger.js';

const FENCE = /```[\w]*\n([\s\S]*?)```/g;

// Merkmale, an denen echter Java-Code erkennbar ist.
const JAVA_MARKERS = [
  /\bpublic\s+(class|void|int|String|boolean|double)\b/,
  /\bprivate\s+\w+\s+\w+\s*;/,
  /\breturn\s+\w+\s*;/,
  /\bthis\s*\.\s*\w+\s*=/,
  /\bnew\s+[A-Z]\w*\s*\(/,
];

const REPLACEMENT =
  '_[Der Tutor gibt auf dieser Hilfestufe keinen Code aus. '
  + 'Frag nach, wenn der Hinweis noch nicht reicht.]_';

function looksLikeJava(code) {
  return JAVA_MARKERS.some((re) => re.test(code));
}

/** Enthaelt der Block eine Methodensignatur aus der Aufgabenstellung? */
function containsExpectedMethod(code, expectedMethods = []) {
  return expectedMethods.some((m) =>
    new RegExp(`\\b${m}\\s*\\([^)]*\\)\\s*\\{`).test(code));
}

/**
 * Prueft die Modellantwort gegen die Regeln der aktuellen Hilfestufe.
 * Der System-Prompt allein reicht nicht: kleine Modelle geben trotz
 * Verbot Code aus, besonders bei mehrfacher Nachfrage.
 */
export function filterResponse(text, { level, exercise }) {
  const expectedMethods = exercise?.expectedMethods ?? [];
  let removed = 0;
  const reasons = [];

  const filtered = text.replace(FENCE, (block, code) => {
    const lineCount = code.trim().split('\n').length;

    if (containsExpectedMethod(code, expectedMethods)) {
      removed += 1;
      reasons.push('enthaelt geforderte Methodensignatur');
      return REPLACEMENT;
    }

    if (level <= 3 && lineCount > 1) {
      removed += 1;
      reasons.push(`mehrzeiliger Codeblock auf Stufe ${level}`);
      return REPLACEMENT;
    }

    if (level === 4 && looksLikeJava(code)) {
      removed += 1;
      reasons.push('Java-Code auf Stufe 4 (nur Beschreibung erlaubt)');
      return REPLACEMENT;
    }

    return block;
  });

  if (removed > 0) {
    logger.warn(`Antwortfilter: ${removed} Block/Bloecke entfernt (${reasons.join('; ')})`);
  }

  return { text: filtered, removedBlocks: removed, reasons, wasFiltered: removed > 0 };
}

const ANWEISUNG = /[;{}=]|\+\+|--|^return\b/;
const normal = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Prueft einen Inline-Code-Abschnitt (`...`). Bezeichner, Typen und
 * Signaturen bleiben erlaubt. Anweisungen (mit ; { } = ++ oder return)
 * sind nur erlaubt, wenn sie woertlich im Code des Studierenden stehen:
 * dann zitiert der Tutor nur, statt etwas vorzugeben.
 */
export function filterInline(span, { files = [] }) {
  const inner = normal(span.slice(1, -1));
  if (!ANWEISUNG.test(inner)) return { text: span, filtered: false };

  if (files.some((f) => normal(f.content).includes(inner))) {
    return { text: span, filtered: false };
  }

  logger.warn(`Antwortfilter: Inline-Code entfernt (${inner.slice(0, 60)})`);
  return { text: '`…`', filtered: true, reason: 'Anweisung als Inline-Code' };
}