import { useState } from 'react';
import { api } from '../services/api.js';

export function ProjectSelector({ project, onChange }) {
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.selectProject(path);
      setPath('');
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>BlueJ-Projekt</h2>

      {project?.selected ? (
        <p className="current">
          <code>{project.root}</code>
          {!project.isBlueJ && (
            <span className="hint"> — keine package.bluej gefunden</span>
          )}
        </p>
      ) : (
        <p className="hint">Noch kein Projektordner ausgewählt.</p>
      )}

      <div className="row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && path.trim() && submit()}
          placeholder="~/BlueJ/MeinProjekt"
        />
        <button onClick={submit} disabled={busy || !path.trim()}>
          {project?.selected ? 'Wechseln' : 'Auswählen'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}