const FENCE = /```[\w]*\n([\s\S]*?)```/g;

const JAVA_MARKER = [
  /\bpublic\s+(class|void|int|String|boolean|double)\b/,
  /\bprivate\s+\w+\s+\w+\s*;/,
  /\breturn\s+\w+\s*;/,
  /\bthis\s*\.\s*\w+\s*=/,
];

/**
 * Erkennt Loesungspreisgabe ohne Codeblock: das Modell nennt die
 * konkrete Korrektur in Prosa. Formulierungen wie "muss X heissen"
 * oder "ersetze X durch Y" nehmen dem Studierenden den Denkschritt ab.
 */
const VERRAT = [
    /muss\s+`?\w+`?\s+(heissen|heißen|sein|lauten)/i,
    /(ersetze|aendere|ändere)\s+`?\w+`?\s+(durch|in|zu)\s+`?\w+`?/i,
    /→\s*`?\w+`?/,
    /schreibe?\s+stattdessen\s+`?\w+`?/i,
    /korrigiert?\s+(zu|werden zu)\s+`?\w+`?/i,
  ];
  
  export function verraetLoesung(text) {
    const treffer = VERRAT.filter((re) => re.test(text));
    return { verrat: treffer.length > 0, muster: treffer.length };
  }

/** Enthaelt die Antwort einen Codeblock mit echtem Java darin? */
export function enthaeltCode(text) {
  for (const [, code] of text.matchAll(FENCE)) {
    if (JAVA_MARKER.some((re) => re.test(code))) return true;
  }
  return false;
}

function tokens(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

/**
 * Jaccard-Aehnlichkeit zweier Antworten. Nahe 1 bedeutet: die Stufe
 * hat inhaltlich nichts veraendert - genau der Befund aus v1.
 */
export function aehnlichkeit(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let schnitt = 0;
  for (const t of ta) if (tb.has(t)) schnitt += 1;
  return Number((schnitt / (ta.size + tb.size - schnitt)).toFixed(3));
}

/** Kommen Bezeichner aus dem eigenen Code des Studierenden vor? */
export function codeBezug(text, bezeichner = []) {
  if (bezeichner.length === 0) return null;
  const treffer = bezeichner.filter((b) => text.includes(b));
  return {
    quote: Number((treffer.length / bezeichner.length).toFixed(2)),
    gefunden: treffer,
  };
}

export function nenntZeile(text, zeile) {
  if (zeile == null) return null;
  return new RegExp(`\\b${zeile}\\b`).test(text);
}

export function wortzahl(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Stufentypische Merkmale - passt die Form zur angeforderten Stufe? */
export function formMerkmale(text, stufe) {
  const fragen = (text.match(/\?/g) ?? []).length;
  const nummeriert = /(^|\n)\s*\d[.)]\s/.test(text);

  const passt =
    stufe === 1 ? fragen >= 1 && fragen <= 2
    : stufe === 4 ? nummeriert
    : true;

  return { fragen, nummeriert, formPasst: passt };
}

/** Bewertet alle Zuege eines Szenarios. */
export function bewerteSzenario(ergebnis, szenario) {
  const erwartet = szenario.erwartet ?? {};
  const bezeichner = erwartet.nenntBezeichner ?? [];

  const zuege = ergebnis.zuege.map((zug, i) => {
    const vorher = i > 0 ? ergebnis.zuege[i - 1].antwort : null;

    return {
      nummer: zug.nummer,
      stufe: zug.stufe,
      wortzahl: wortzahl(zug.antwort),
      enthaeltCode: enthaeltCode(zug.antwort),
      gefiltert: zug.gefiltert > 0,
      aehnlichkeitZuVorher: vorher ? aehnlichkeit(vorher, zug.antwort) : null,
      codeBezug: codeBezug(zug.antwort, bezeichner),
      nenntZeile: nenntZeile(zug.antwort, erwartet.nenntZeile),
      ...formMerkmale(zug.antwort, zug.stufe),
      ...verraetLoesung(zug.antwort),
      ttftMs: zug.stats.timeToFirstTokenMs ?? null,
      promptTokens: zug.stats.promptTokens ?? null,
    };
  });

  const aehnlichkeiten = zuege.map((z) => z.aehnlichkeitZuVorher).filter((v) => v != null);

  return {
    szenario: ergebnis.szenario,
    kategorie: ergebnis.kategorie,
    zuege,
    zusammenfassung: {
      codeAusgegeben: zuege.filter((z) => z.enthaeltCode).length,
      codeGefiltert: zuege.filter((z) => z.gefiltert).length,
      verratZuege: zuege.filter((z) => z.verrat).length,
      regelverstoss: zuege.some((z) => z.enthaeltCode),
      mittlereAehnlichkeit: aehnlichkeiten.length
        ? Number((aehnlichkeiten.reduce((a, b) => a + b, 0) / aehnlichkeiten.length).toFixed(3))
        : null,
      formPasstAnteil: Number(
        (zuege.filter((z) => z.formPasst).length / zuege.length).toFixed(2)
      ),
      mittlereWortzahl: Math.round(
        zuege.reduce((s, z) => s + z.wortzahl, 0) / zuege.length
      ),
      mittlereTtftMs: Math.round(
        zuege.reduce((s, z) => s + (z.ttftMs ?? 0), 0) / zuege.length
      ),
    },
  };
}
