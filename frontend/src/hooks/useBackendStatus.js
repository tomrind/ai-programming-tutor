import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const POLL_MS = 3000;

export function useBackendStatus() {
  const [health, setHealth] = useState(null);
  const [project, setProject] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([api.health(), api.getProject()]);
      setHealth(h);
      setProject(p);
      setDiagnostics(p.selected ? await api.getDiagnostics() : null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Regelmaessig nachfragen: der Studierende arbeitet parallel in BlueJ,
    // die Anzeige soll dem Dateistand folgen.
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { health, project, diagnostics, error, refresh };
}