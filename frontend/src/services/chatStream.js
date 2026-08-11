/**
 * Liest den SSE-Strom des Chat-Endpunkts. EventSource scheidet aus,
 * weil es nur GET unterstuetzt - der Chat braucht POST mit Body.
 */
export async function streamChat({ question, signal, onMeta, onToken, onDone, onError }) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    });
  
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError?.(data.error ?? `Fehler ${res.status}`);
      return;
    }
  
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
  
      buffer += decoder.decode(value, { stream: true });
  
      // Ereignisse sind durch eine Leerzeile getrennt.
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
  
      for (const chunk of chunks) {
        let event = 'message';
        let data = '';
  
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) data += line.slice(6);
        }
        if (!data) continue;
  
        let payload;
        try { payload = JSON.parse(data); } catch { continue; }
  
        if (event === 'meta') onMeta?.(payload);
        else if (event === 'token') onToken?.(payload);
        else if (event === 'done') onDone?.(payload);
        else if (event === 'error') onError?.(payload.message);
      }
    }
  }