import { Router } from 'express';

import { buildContext } from '../services/tutor/contextService.js';
import { buildSystemPrompt, getLevelLabel } from '../services/tutor/promptService.js';
import { chatStream } from '../services/tutor/ollamaService.js';
import { determineLevel, pushTurn, getHistory }
  from '../services/tutor/hintLevelService.js';
import { filterResponse } from '../services/tutor/responseFilterService.js';
import { createStreamGuard } from '../services/tutor/streamGuard.js';
import { logger } from '../utils/logger.js';
import { recordRun } from '../repositories/runRepository.js';
import { fingerprint, getState } from '../services/tutor/hintLevelService.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: 'Feld "question" fehlt.' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const controller = new AbortController();
  res.on('close', () => controller.abort());

  try {
    const context = await buildContext();
    const { level, reason } = determineLevel({
      exerciseId: context.exercise?.id ?? null,
      files: context.files,
    });

    send('meta', {
      level, 
      levelLabel: await getLevelLabel(level),
      reason,
      exercise: context.exercise?.title ?? null,
      compilerOk: context.compilation.compiled,
      errorCount: context.compilation.errorCount ?? 0,
    });

    const system = await buildSystemPrompt(context, level);
    const messages = [...getHistory(), { role: 'user', content: question }];

    let shown = '';
    let filteredCount = 0;
    const filterReasons = [];

    const guard = createStreamGuard({
      onEmit: (text) => { shown += text; send('token', { text }); },
      onBlock: (block) => {
        const result = filterResponse(block, { level, exercise: context.exercise });
        shown += result.text;
        if (result.wasFiltered) filteredCount += result.removedBlocks; filterReasons.push(...result.reasons);
        send('token', { text: result.text, filtered: result.wasFiltered });
      },
    });

    const { stats } = await chatStream({
      system,
      messages,
      signal: controller.signal,
      onToken: (t) => guard.push(t),
    });
    guard.flush();

    pushTurn('default', 'user', question);
    pushTurn('default', 'assistant', shown);

    const errors = (context.compilation.diagnostics ?? [])
      .filter((d) => d.severity === 'error');

    try {
      recordRun({
        source: 'chat',
        exerciseId: context.exercise?.id ?? null,
        turnIndex: getState().turns,
        level,
        levelReason: reason,
        question,
        answer: shown,
        filteredBlocks: filteredCount,
        filterReasons,
        compilerOk: context.compilation.compiled,
        errorCount: errors.length,
        errorCategories: [...new Set(errors.map((e) => e.id))],
        codeFingerprint: fingerprint(context.files),
        codeSnapshot: JSON.stringify(
          context.files.map((f) => ({ path: f.path, content: f.content }))
        ),
        stats,
      });
    } catch (err) {
      logger.warn(`Protokollierung fehlgeschlagen: ${err.message}`);
    }

    logger.info('Antwort erzeugt', { level, filteredCount, ...stats });
    send('done', { level, filteredCount, stats });
  } catch (err) {
    logger.error(`Chat-Fehler: ${err.message}`);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

export default router;