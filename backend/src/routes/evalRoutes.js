import { Router } from 'express';
import { listRuns, getSummary, saveRating } from '../repositories/runRepository.js';

const router = Router();

router.get('/runs', (req, res) => {
  res.json({
    runs: listRuns({
      source: req.query.source,
      scenarioId: req.query.scenario,
      limit: Number(req.query.limit ?? 200),
    }),
  });
});

router.get('/runs/summary', (req, res) => {
  res.json({ summary: getSummary() });
});

router.post('/runs/:id/rating', (req, res) => {
  saveRating(Number(req.params.id), req.body ?? {});
  res.json({ ok: true });
});

export default router;