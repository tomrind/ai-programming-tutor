import { Router } from 'express';
import { chatStream } from '../services/tutor/ollamaService.js';
import { logger } from '../utils/logger.js';

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

export default router;