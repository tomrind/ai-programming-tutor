import { useEffect, useState } from 'react';

/**
 * Hier funktioniert EventSource, weil der Endpunkt per GET erreichbar ist -
 * anders als der Chat, der einen Body braucht.
 */
export function useCodeEvents() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.addEventListener('code', (e) => {
      try { setEvent(JSON.parse(e.data)); } catch { /* ignorieren */ }
    });
    return () => source.close();
  }, []);

  return event;
}