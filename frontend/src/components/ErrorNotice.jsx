export function ErrorNotice({ event, dismissedAt, onAsk, onDismiss }) {
    if (!event || event.compiled || event.errors.length === 0) return null;
    if (dismissedAt === event.at) return null;
  
    const first = event.errors[0];
    const more = event.errors.length - 1;
  
    const question =
      `In ${first.file}, Zeile ${first.line} gibt es einen Fehler `
      + `(${first.label}). Kannst du mir helfen?`;
  
    return (
      <div className="notice">
        <span>
          Neuer Fehler in <code>{first.file}</code>, Zeile {first.line}:{' '}
          <strong>{first.label}</strong>
          {more > 0 && ` (und ${more} weitere)`}
        </span>
        <span className="notice-actions">
          <button onClick={() => onAsk(question)}>Hinweis dazu</button>
          <button className="ghost" onClick={() => onDismiss(event.at)}>
            Später
          </button>
        </span>
      </div>
    );
  }