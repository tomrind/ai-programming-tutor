export function StatusBar({ health, project, diagnostics }) {
    const items = [
      {
        label: 'Modell',
        value: health?.model ?? '—',
        ok: health?.ollamaReachable && health?.modelPulled,
      },
      {
        label: 'Projekt',
        value: project?.selected ? `${project.fileCount} Datei(en)` : 'nicht gewählt',
        ok: Boolean(project?.selected),
      },
      {
        label: 'Compiler',
        value: !diagnostics ? '—'
          : diagnostics.compiled ? 'fehlerfrei'
          : `${diagnostics.errorCount} Fehler`,
        ok: Boolean(diagnostics?.compiled),
      },
    ];
  
    return (
      <div className="statusbar">
        {items.map((item) => (
          <span key={item.label} className={`status ${item.ok ? 'ok' : 'warn'}`}>
            <strong>{item.label}:</strong> {item.value}
          </span>
        ))}
      </div>
    );
  }