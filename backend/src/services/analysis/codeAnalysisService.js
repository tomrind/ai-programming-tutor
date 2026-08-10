import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

const parser = new Parser();
parser.setLanguage(Java);

const LOOP_TYPES = new Set([
  'for_statement', 'enhanced_for_statement', 'while_statement', 'do_statement',
]);

function nameOf(node) {
  return node.childForFieldName('name')?.text ?? '(unbenannt)';
}

/** Liefert die Parameterliste als lesbaren String, z. B. "String name, int alter". */
function paramsOf(node) {
  const list = node.childForFieldName('parameters');
  if (!list) return '';
  return list.namedChildren
    .map((p) => {
      const type = p.childForFieldName('type')?.text ?? '?';
      const name = p.childForFieldName('name')?.text ?? '?';
      return `${type} ${name}`;
    })
    .join(', ');
}

/**
 * Sammelt Syntaxfehler. Tree-sitter ist fehlertolerant und markiert
 * defekte Stellen als ERROR- oder MISSING-Knoten, statt abzubrechen.
 * Genau deshalb funktioniert die Analyse auch bei unfertigem Code.
 */
function collectSyntaxErrors(root, sourceLines) {
  const errors = [];

  function visit(node) {
    if (node.type === 'ERROR' || node.isMissing) {
      const line = node.startPosition.row;
      errors.push({
        line: line + 1,
        column: node.startPosition.column + 1,
        kind: node.isMissing ? 'fehlend' : 'unerwartet',
        snippet: (sourceLines[line] ?? '').trim().slice(0, 80),
      });
      return; // Kinder eines Fehlerknotens nicht weiter aufschluesseln.
    }
    if (node.hasError) node.namedChildren.forEach(visit);
  }

  visit(root);
  return errors;
}

function analyzeClass(node) {
  const result = {
    name: nameOf(node),
    startLine: node.startPosition.row + 1,
    fields: [],
    constructors: [],
    methods: [],
    loops: 0,
    conditionals: 0,
  };

  const body = node.childForFieldName('body');
  if (!body) return result;

  for (const member of body.namedChildren) {
    switch (member.type) {
      case 'field_declaration': {
        const type = member.childForFieldName('type')?.text ?? '?';
        for (const decl of member.namedChildren) {
          if (decl.type !== 'variable_declarator') continue;
          result.fields.push({
            name: decl.childForFieldName('name')?.text ?? '?',
            type,
            initialized: Boolean(decl.childForFieldName('value')),
          });
        }
        break;
      }
      case 'constructor_declaration':
        result.constructors.push({
          params: paramsOf(member),
          startLine: member.startPosition.row + 1,
          bodyEmpty: isBodyEmpty(member),
        });
        break;
      case 'method_declaration':
        result.methods.push({
          name: nameOf(member),
          returnType: member.childForFieldName('type')?.text ?? '?',
          params: paramsOf(member),
          startLine: member.startPosition.row + 1,
          bodyEmpty: isBodyEmpty(member),
        });
        break;
    }
  }

  // Schleifen und Verzweigungen zaehlen, egal wie tief verschachtelt.
  function countControlFlow(n) {
    if (LOOP_TYPES.has(n.type)) result.loops += 1;
    if (n.type === 'if_statement') result.conditionals += 1;
    n.namedChildren.forEach(countControlFlow);
  }
  countControlFlow(body);

  return result;
}

function isBodyEmpty(node) {
  const body = node.childForFieldName('body');
  return !body || body.namedChildren.length === 0;
}

/** Analysiert eine einzelne Java-Datei. */
export function analyzeFile({ path, content }) {
  const tree = parser.parse(content);
  const lines = content.split('\n');

  const classes = [];
  function findClasses(node) {
    if (node.type === 'class_declaration' || node.type === 'interface_declaration') {
      classes.push(analyzeClass(node));
      return;
    }
    node.namedChildren.forEach(findClasses);
  }
  findClasses(tree.rootNode);

  const syntaxErrors = collectSyntaxErrors(tree.rootNode, lines);

  return {
    path,
    lineCount: lines.length,
    classes,
    syntaxErrors,
    hasSyntaxErrors: syntaxErrors.length > 0,
  };
}

export function analyzeProject(files) {
  return files.map(analyzeFile);
}

/**
 * Verdichtet die Analyse zu kompaktem Text fuer den Prompt.
 * Bewusst knapp: jedes Token hier fehlt spaeter beim Kontext.
 */
export function toPromptSummary(analyses) {
  const parts = [];

  for (const file of analyses) {
    parts.push(`Datei ${file.path} (${file.lineCount} Zeilen):`);

    if (file.classes.length === 0) {
      parts.push('  - keine Klasse erkannt');
    }

    for (const cls of file.classes) {
      parts.push(`  Klasse ${cls.name}:`);

      parts.push(cls.fields.length
        ? `    Felder: ${cls.fields.map((f) => `${f.type} ${f.name}`).join(', ')}`
        : '    Felder: keine');

      parts.push(cls.constructors.length
        ? `    Konstruktoren: ${cls.constructors
            .map((c) => `(${c.params})${c.bodyEmpty ? ' [leer]' : ''}`).join(', ')}`
        : '    Konstruktoren: keiner');

      parts.push(cls.methods.length
        ? `    Methoden: ${cls.methods
            .map((m) => `${m.returnType} ${m.name}(${m.params})${m.bodyEmpty ? ' [leer]' : ''}`)
            .join(', ')}`
        : '    Methoden: keine');

      if (cls.loops || cls.conditionals) {
        parts.push(`    Kontrollfluss: ${cls.loops} Schleife(n), ${cls.conditionals} Verzweigung(en)`);
      }
    }

    if (file.hasSyntaxErrors) {
      parts.push(`  Syntaxfehler (${file.syntaxErrors.length}):`);
      for (const e of file.syntaxErrors.slice(0, 5)) {
        parts.push(`    Zeile ${e.line}: ${e.kind} - ${e.snippet}`);
      }
    }
  }

  return parts.join('\n');
}