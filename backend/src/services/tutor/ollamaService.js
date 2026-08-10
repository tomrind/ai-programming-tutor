import { config } from '../../config/config.js';
import { logger } from '../../utils/logger.js';

const { baseUrl, model, temperature } = config.ollama;

export class OllamaUnavailableError extends Error {
  constructor(cause) {
    super(`Ollama ist unter ${baseUrl} nicht erreichbar. Laeuft der Dienst?`);
    this.name = 'OllamaUnavailableError';
    this.status = 503;
    this.cause = cause;
  }
}

async function ollamaFetch(path, init) {
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch (cause) {
    // Abbruch durch den Client ist kein Verfuegbarkeitsproblem.
    if (cause?.name === 'AbortError') throw cause;
    throw new OllamaUnavailableError(cause);
  }
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Ollama antwortete mit ${res.status}: ${body}`);
    err.status = 502;
    throw err;
  }
  return res;
}

export async function listModels() {
  const res = await ollamaFetch('/api/tags');
  const data = await res.json();
  return (data.models ?? []).map((m) => m.name);
}

export async function isModelAvailable() {
  const names = await listModels();
  return names.includes(model);
}

/**
 * Wandelt die Kennzahlen aus Ollamas Abschluss-Chunk in lesbare Werte um.
 * Ollama liefert Zeiten in Nanosekunden.
 */
function summarize(done) {
  if (!done) return null;
  const toMs = (v) => (typeof v === 'number' ? Math.round(v / 1e6) : null);
  const responseTokens = done.eval_count ?? 0;
  const evalMs = toMs(done.eval_duration) ?? 0;

  return {
    model: done.model,
    loadMs: toMs(done.load_duration),
    promptEvalMs: toMs(done.prompt_eval_duration),
    totalMs: toMs(done.total_duration),
    promptTokens: done.prompt_eval_count ?? null,
    responseTokens,
    tokensPerSecond: evalMs > 0
      ? Number((responseTokens / (evalMs / 1000)).toFixed(1))
      : null,
  };
}

/**
 * Sendet eine Anfrage an das lokale Modell und ruft onToken fuer jedes
 * eintreffende Textstueck auf. Ollama antwortet als NDJSON-Strom:
 * eine JSON-Zeile pro Token.
 */
export async function chatStream({
  system,
  messages,
  onToken,
  signal,
  options = {},
}) {
 const startedAt = Date.now();

  const payload = {
    model,
    stream: true,
    messages: system
      ? [{ role: 'system', content: system }, ...messages]
      : messages,
    options: { temperature, ...options },
  };

  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let text = '';
  let finalChunk = null;
  let firstTokenAt = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Letzte Zeile kann unvollstaendig sein - zurueck in den Puffer.
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;

      let chunk;
      try {
        chunk = JSON.parse(line);
      } catch {
        logger.warn('Unlesbare Zeile im Ollama-Strom uebersprungen');
        continue;
      }

      const token = chunk.message?.content ?? '';
      if (token) {
        firstTokenAt ??= Date.now();
        text += token;
        onToken?.(token);
      }
      if (chunk.done) finalChunk = chunk;
    }
  }

  const stats = summarize(finalChunk) ?? {};
  stats.timeToFirstTokenMs = firstTokenAt ? firstTokenAt - startedAt : null;

  return { text, stats };
}

/** Bequemlichkeitsvariante ohne Streaming. */
export async function chat(args) {
  return chatStream({ ...args, onToken: undefined });
}

/**
 * Laedt das Modell beim Backend-Start in den Speicher. Ohne das
 * dauert die erste echte Nutzeranfrage mehrere Sekunden laenger.
 */
export async function warmUp() {
  const startedAt = Date.now();
  try {
    await chat({
      messages: [{ role: 'user', content: 'Hi' }],
      options: { num_predict: 1 },
    });
    logger.info(`Modell ${model} vorgeladen (${Date.now() - startedAt} ms)`);
  } catch (err) {
    logger.warn(`Warmlauf fehlgeschlagen: ${err.message}`);
  }
}