import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat.js';
import { HintLevelIndicator } from './HintLevelIndicator.jsx';

export function ChatWindow({ ready }) {
  const { messages, busy, level, send, stop, reset } = useChat();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit() {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft('');
    send(q);
  }

  return (
    <section className="chat">
      <div className="chat-head">
        <HintLevelIndicator
          level={level?.level}
          label={level?.levelLabel}
          reason={level?.reason}
        />
        <button className="ghost" onClick={reset} disabled={busy}>
          Neu beginnen
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <p className="hint">
            Stell eine Frage zu deinem Code. Der Tutor kennt deine Aufgabe
            und deinen aktuellen Programmierstand.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'tutor' && m.level && (
              <span className="msg-level">Stufe {m.level}</span>
            )}
            <div className="msg-text">
              {m.text}
              {m.pending && <span className="caret" />}
            </div>
            {m.filtered && (
              <p className="msg-note">
                Ein Codeblock wurde entfernt — der Tutor gibt keine fertigen Lösungen.
              </p>
            )}
            {m.error && <p className="error">{m.error}</p>}
            {m.stats && (
              <p className="msg-stats">
                {m.stats.timeToFirstTokenMs} ms bis zur Antwort ·{' '}
                {m.stats.tokensPerSecond} Token/s
              </p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder={ready ? 'Deine Frage…' : 'Erst Projekt und Aufgabe wählen'}
          disabled={!ready}
        />
        {busy
          ? <button className="ghost" onClick={stop}>Abbrechen</button>
          : <button onClick={submit} disabled={!ready || !draft.trim()}>Fragen</button>}
      </div>
    </section>
  );
}