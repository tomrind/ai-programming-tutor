import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bewerteSzenario } from './metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.API ?? 'http://127.0.0.1:3001/api';

async function call(pfad, options = {}) {
  const res = await fetch(`${API}${pfad}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`${pfad}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Liest den SSE-Strom des Chat-Endpunkts und sammelt Text plus Kennzahlen. */
async function frage(question) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let puffer = '';
  let text = '';
  let meta = null;
  let done = null;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    puffer += decoder.decode(chunk.value, { stream: true });

    const teile = puffer.split('\n\n');
    puffer = teile.pop() ?? '';

    for (const teil of teile) {
      let event = '';
      let daten = '';
      for (const zeile of teil.split('\n')) {
        if (zeile.startsWith('event: ')) event = zeile.slice(7).trim();
        else if (zeile.startsWith('data: ')) daten += zeile.slice(6);
      }
      if (!daten) continue;
      const nutzlast = JSON.parse(daten);
      if (event === 'meta') meta = nutzlast;
      else if (event === 'token') text += nutzlast.text;
      else if (event === 'done') done = nutzlast;
      else if (event === 'error') throw new Error(nutzlast.message);
    }
  }

  return { text, meta, done };
}

async function ladeSzenarien() {
  const dir = path.join(__dirname, 'scenarios');
  const dateien = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  return Promise.all(
    dateien.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')))
  );
}

/**
 * Schreibt die Dateien des Szenarios in einen Wegwerf-Ordner und laesst
 * das Backend ihn ueberwachen. So laeuft der Test durch exakt dieselbe
 * Kette wie eine echte Nutzung.
 */
async function projektAufbauen(szenario) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `eval-${szenario.id}-`));
  await fs.writeFile(path.join(dir, 'package.bluej'), '');
  for (const [name, inhalt] of Object.entries(szenario.files)) {
    await fs.writeFile(path.join(dir, name), inhalt, 'utf8');
  }
  return dir;
}

async function fuehreSzenarioAus(szenario) {
  const dir = await projektAufbauen(szenario);

  await call('/project', { method: 'POST', body: JSON.stringify({ path: dir }) });
  await call('/exercise', { method: 'POST', body: JSON.stringify({ id: szenario.exercise }) });
  await call('/tutor/reset', { method: 'POST' });

  const zuege = [];
  for (let i = 0; i < szenario.turns; i += 1) {
    const nachfrage = i === 0 ? szenario.question : 'Das hilft mir noch nicht weiter.';
    const { text, meta, done } = await frage(nachfrage);
    zuege.push({
      nummer: i + 1,
      frage: nachfrage,
      antwort: text,
      stufe: meta?.level,
      stufeGrund: meta?.reason,
      gefiltert: done?.filteredCount ?? 0,
      stats: done?.stats ?? {},
    });
    process.stdout.write(`  Zug ${i + 1}: Stufe ${meta?.level}\n`);
  }

  await fs.rm(dir, { recursive: true, force: true });
  return { szenario: szenario.id, kategorie: szenario.kategorie, zuege };
}

async function main() {
  const gesundheit = await call('/health');
  console.log(`Modell: ${gesundheit.model}`);

  const szenarien = await ladeSzenarien();
  console.log(`${szenarien.length} Szenarien gefunden\n`);

  const WIEDERHOLUNGEN = Number(process.env.RUNS ?? 3);

  const ergebnisse = [];
  const bewertungen = [];
  for (const s of szenarien) {
    console.log(`▶ ${s.id} (${s.kategorie})`);
    for (let w = 1; w <= WIEDERHOLUNGEN; w += 1) {
      console.log(`  Durchlauf ${w}/${WIEDERHOLUNGEN}`);
    const ergebnis = await fuehreSzenarioAus(s);
    ergebnis.wiederholung = w;
    ergebnisse.push(ergebnis);
    bewertungen.push({ ...bewerteSzenario(ergebnis, s), wiederholung: w });
    }
  }

  const proSzenario = new Map();
  for (const b of bewertungen) {
    if (!proSzenario.has(b.szenario)) proSzenario.set(b.szenario, []);
    proSzenario.get(b.szenario).push(b.zusammenfassung);
  }

  const mittel = (arr, feld) => {
    const werte = arr.map((z) => z[feld]).filter((v) => v != null);
    return werte.length
      ? Number((werte.reduce((a, b) => a + b, 0) / werte.length).toFixed(2))
      : null;
  };

  const spanne = (arr, feld) => {
    const werte = arr.map((z) => z[feld]).filter((v) => v != null);
    return werte.length ? `${Math.min(...werte)}–${Math.max(...werte)}` : null;
  };

  console.log(`\n--- Mittelwerte aus ${WIEDERHOLUNGEN} Durchlaeufen ---`);
  console.table([...proSzenario].map(([name, zs]) => ({
    Szenario: name,
    Code: mittel(zs, 'codeAusgegeben'),
    Verrat: mittel(zs, 'verratZuege'),
    'Ähnlichkeit': mittel(zs, 'mittlereAehnlichkeit'),
    'Ähnl. Spanne': spanne(zs, 'mittlereAehnlichkeit'),
    'Form ok': mittel(zs, 'formPasstAnteil'),
    'Wörter': mittel(zs, 'mittlereWortzahl'),
    'TTFT ms': mittel(zs, 'mittlereTtftMs'),
  })));

  const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ziel = path.join(__dirname, 'results', `${stempel}.json`);
  await fs.writeFile(ziel, JSON.stringify({
    modell: gesundheit.model,
    zeitpunkt: new Date().toISOString(),
    ergebnisse,
    bewertungen,
  }, null, 2));

  // Backend nicht auf einem geloeschten Temp-Ordner stehen lassen.
  await call('/project', { method: 'DELETE' }).catch(() => {});

  console.log(`\nErgebnisse: ${ziel}`);
}

main().catch((err) => {
  console.error('Abbruch:', err.message);
  process.exit(1);
});
