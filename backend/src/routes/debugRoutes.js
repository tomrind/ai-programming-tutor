import { Router } from 'express';
import { chatStream } from '../services/tutor/ollamaService.js';
import { logger } from '../utils/logger.js';
import { buildContext } from '../services/tutor/contextService.js';
import { buildSystemPrompt } from '../services/tutor/promptService.js';

const router = Router();

router.post('/debug/ask', async (req, res) => {
  const { question, system } = req.body ?? {};
  if (!question?.trim()) {
    return res.status(400).json({ error: 'Feld "question" fehlt.' });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');

  const { stats } = await chatStream({
    system,
    messages: [{ role: 'user', content: question }],
    onToken: (token) => res.write(token),
  });

  logger.info('Antwort erzeugt', stats);
  res.end(`\n\n--- ${stats.timeToFirstTokenMs} ms bis zum ersten Token, ` +
          `${stats.tokensPerSecond} Token/s ---\n`);
});

router.get('/debug/prompt', async (req, res) => {
  const level = Number(req.query.level ?? 1);
  const context = await buildContext();
  const prompt = await buildSystemPrompt(context, level);

  res.type('text/plain; charset=utf-8').send(
    `${prompt}\n\n=== ${prompt.length} Zeichen, ca. ${Math.round(prompt.length / 4)} Token ===\n`
  );
});

export default router;