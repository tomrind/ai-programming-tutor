import { useCallback, useRef, useState } from 'react';
import { streamChat } from '../services/chatStream.js';
import { api } from '../services/api.js';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(null);
  const abortRef = useRef(null);

  const send = useCallback(async (question) => {
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: 'user', text: question },
      { role: 'tutor', text: '', pending: true, filtered: false },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    const patchLast = (patch) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy.length - 1;
        copy[last] = typeof patch === 'function'
          ? patch(copy[last])
          : { ...copy[last], ...patch };
        return copy;
      });

    try {
      await streamChat({
        question,
        signal: controller.signal,
        onMeta: (meta) => {
          setLevel(meta);
          patchLast({ level: meta.level, levelLabel: meta.levelLabel });
        },
        onToken: ({ text, filtered }) =>
          patchLast((msg) => ({
            ...msg,
            text: msg.text + text,
            filtered: msg.filtered || Boolean(filtered),
          })),
        onDone: (done) => patchLast({ pending: false, stats: done.stats }),
        onError: (message) => patchLast({ pending: false, error: message }),
      });
    } catch (err) {
      if (err.name !== 'AbortError') patchLast({ pending: false, error: err.message });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(async () => {
    await api.resetSession();
    setMessages([]);
    setLevel(null);
  }, []);

  return { messages, busy, level, send, stop, reset };
}