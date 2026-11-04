import fs from 'node:fs';
import path from 'node:path';
import { enthaeltCode, verraetLoesung, aehnlichkeit, formMerkmale, wortzahl } from './metrics.js';

const dir = 'eval/results';
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

  let code = 0, gefiltert = 0, verrat = 0, form = 0, woerter = 0, ttft = 0, zuege = 0;
  const aehn = [];

  for (const s of d.ergebnisse) {
    let vorher = null;
    for (const z of s.zuege) {
      zuege++;
      if (enthaeltCode(z.antwort)) code++;
      if ((z.gefiltert ?? 0) > 0) gefiltert++;
      if (verraetLoesung(z.antwort).verrat) verrat++;
      if (formMerkmale(z.antwort, z.stufe).formPasst) form++;
      woerter += wortzahl(z.antwort);
      ttft += z.stats?.timeToFirstTokenMs ?? 0;
      if (vorher) aehn.push(aehnlichkeit(vorher, z.antwort));
      vorher = z.antwort;
    }
  }
  const mw = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0;

  console.log(
    f.replace('.json', ''), '|', d.modell,
    '| Eintraege:', d.ergebnisse.length,
    '| Zuege:', zuege,
    '| Code:', code,
    '| gefiltert:', gefiltert,
    '| Verrat:', verrat,
    '| Aehnl:', mw(aehn).toFixed(2),
    '| Form:', (form / zuege).toFixed(2),
    '| Woerter:', (woerter / zuege).toFixed(0),
    '| TTFT:', (ttft / zuege / 1000).toFixed(1) + 's'
  );
}
