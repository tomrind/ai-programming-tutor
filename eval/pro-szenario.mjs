import fs from 'node:fs';
import { enthaeltCode, verraetLoesung, aehnlichkeit, formMerkmale, wortzahl } from './metrics.js';

const d = JSON.parse(fs.readFileSync('eval/results/2026-08-23T20-26-28.json', 'utf8'));
const agg = new Map();

for (const s of d.ergebnisse) {
  if (!agg.has(s.szenario)) agg.set(s.szenario, { kat: s.kategorie, code: 0, verrat: 0, form: 0, w: 0, t: 0, n: 0, ae: [] });
  const a = agg.get(s.szenario);
  let vorher = null;
  for (const z of s.zuege) {
    a.n++;
    if (enthaeltCode(z.antwort)) a.code++;
    if (verraetLoesung(z.antwort).verrat) a.verrat++;
    if (formMerkmale(z.antwort, z.stufe).formPasst) a.form++;
    a.w += wortzahl(z.antwort);
    a.t += z.stats?.timeToFirstTokenMs ?? 0;
    if (vorher) a.ae.push(aehnlichkeit(vorher, z.antwort));
    vorher = z.antwort;
  }
}
console.log('Szenario\tKategorie\tCode\tVerrat\tAehnl\tForm\tWoerter\tTTFT');
for (const [name, a] of agg) {
  const mw = a.ae.length ? a.ae.reduce((x, y) => x + y, 0) / a.ae.length : 0;
  console.log([name, a.kat, a.code, a.verrat, mw.toFixed(2),
    (a.form / a.n).toFixed(2), Math.round(a.w / a.n), (a.t / a.n / 1000).toFixed(1)].join('\t'));
}
