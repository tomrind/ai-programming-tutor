async function request(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
    return data;
  }
  
  export const api = {
    health: () => request('/health'),
  
    getProject: () => request('/project'),
    selectProject: (path) =>
      request('/project', { method: 'POST', body: JSON.stringify({ path }) }),
  
    getExercises: () => request('/exercises'),
    getCurrentExercise: () => request('/exercise'),
    selectExercise: (id) =>
      request('/exercise', { method: 'POST', body: JSON.stringify({ id }) }),
  
    getDiagnostics: () => request('/project/diagnostics'),
    getTutorState: () => request('/tutor/state'),
    resetSession: () => request('/tutor/reset', { method: 'POST' }),
  };