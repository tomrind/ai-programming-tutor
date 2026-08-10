/**
 * Ordnet javac-Meldungen didaktischen Kategorien zu. Die Auswahl orientiert
 * sich an den haeufigsten Anfaengerfehlern, wie sie u. a. in den
 * Blackbox-Auswertungen von BlueJ-Nutzungsdaten beschrieben werden.
 */
const RULES = [
    {
      id: 'missing-semicolon',
      match: /';' expected/i,
      label: 'Fehlendes Semikolon',
      didactic: 'Jede Anweisung in Java endet mit einem Semikolon. Der Fehler wird oft eine Zeile spaeter gemeldet als er entsteht.',
    },
    {
      id: 'cannot-find-symbol',
      match: /cannot find symbol/i,
      label: 'Unbekannter Bezeichner',
      didactic: 'Der Name ist an dieser Stelle nicht bekannt: Tippfehler, fehlende Deklaration, oder ausserhalb des Gueltigkeitsbereichs.',
    },
    {
      id: 'incompatible-types',
      match: /incompatible types/i,
      label: 'Typfehler',
      didactic: 'Zugewiesener Wert und deklarierter Typ passen nicht zusammen.',
    },
    {
      id: 'missing-return',
      match: /missing return statement/i,
      label: 'Fehlende Rueckgabe',
      didactic: 'Eine Methode mit Rueckgabetyp muss auf jedem moeglichen Pfad einen Wert zurueckgeben.',
    },
    {
      id: 'illegal-start',
      match: /illegal start of (expression|type)/i,
      label: 'Unerwartetes Konstrukt',
      didactic: 'Haeufig Folge einer fehlenden oder ueberzaehligen geschweiften Klammer weiter oben.',
    },
    {
      id: 'class-filename-mismatch',
      match: /is public, should be declared in a file named/i,
      label: 'Klassenname passt nicht zum Dateinamen',
      didactic: 'Eine oeffentliche Klasse muss genauso heissen wie ihre Datei.',
    },
    {
      id: 'constructor-arguments',
      match: /constructor .* cannot be applied to given types/i,
      label: 'Konstruktoraufruf passt nicht',
      didactic: 'Anzahl oder Typen der uebergebenen Werte stimmen nicht mit dem Konstruktor ueberein.',
    },
    {
      id: 'method-arguments',
      match: /method .* cannot be applied to given types/i,
      label: 'Methodenaufruf passt nicht',
      didactic: 'Anzahl oder Typen der Argumente passen nicht zur Methodensignatur.',
    },
    {
      id: 'uninitialized-variable',
      match: /might not have been initialized/i,
      label: 'Variable ohne Wert',
      didactic: 'Lokale Variablen bekommen keinen Standardwert und muessen vor der Verwendung gesetzt werden.',
    },
    {
      id: 'static-context',
      match: /non-static .* cannot be referenced from a static context/i,
      label: 'Statischer Kontext',
      didactic: 'Aus einer statischen Methode kann nicht direkt auf Objektattribute zugegriffen werden.',
    },
    {
      id: 'brace-mismatch',
      match: /(class, interface, enum, or record expected|reached end of file while parsing)/i,
      label: 'Klammern unausgeglichen',
      didactic: 'Die Zahl der oeffnenden und schliessenden geschweiften Klammern stimmt nicht.',
    },
  ];
  
  export function classify(message) {
    const rule = RULES.find((r) => r.match.test(message));
    return rule
      ? { id: rule.id, label: rule.label, didactic: rule.didactic }
      : { id: 'other', label: 'Sonstiger Fehler', didactic: null };
  }
  
  export const categoryIds = RULES.map((r) => r.id);