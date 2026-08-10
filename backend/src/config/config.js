import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Zentrale Prämisse des Prototyps: Weder Studierendencode noch Prompts
 * verlassen den Rechner. Beide Prüfungen schlagen beim Start fehl,
 * nicht erst zur Laufzeit.
 */
function assertLocalInference(baseUrl, model) {
  let hostname;
  try {
    ({ hostname } = new URL(baseUrl));
  } catch {
    throw new Error(`OLLAMA_BASE_URL ist keine gültige URL: "${baseUrl}"`);
  }

  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `OLLAMA_BASE_URL zeigt auf "${hostname}". Der Tutor darf ausschliesslich lokal rechnen.`
    );
  }

  if (/cloud/i.test(model)) {
    throw new Error(
      `"${model}" ist ein Ollama-Cloud-Modell. Anfragen wuerden an ollama.com gehen. ` +
      `Bitte ein lokales Modell konfigurieren.`
    );
  }
}

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma3:4b';
const promptVersion = process.env.PROMPT_VERSION ?? 'v1';

assertLocalInference(ollamaBaseUrl, ollamaModel);

export const config = {
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL ?? 'info',

  ollama: {
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.4),
  },

  paths: {
    repoRoot,
    exercises: path.join(repoRoot, 'exercises'),
    data: path.join(__dirname, '..', 'data'),
    prompts: path.join(__dirname, '..', 'prompts', promptVersion),
  },

  javac: {
    path: process.env.JAVAC_PATH ?? 'javac',
    timeoutMs: Number(process.env.JAVAC_TIMEOUT_MS ?? 15000),
  },
  
};