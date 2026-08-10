import { Router } from 'express';
import { getState, resetSession, determineLevel }
  from '../services/tutor/hintLevelService.js';
import { filterResponse } from '../services/tutor/responseFilterService.js';
import { getFiles } from '../services/project/projectService.js';
import { getCurrentExercise } from '../services/exerciseService.js';

const router = Router();

router.get('/tutor/state', (req, res) => {
  res.json(getState());
});

router.post('/tutor/reset', (req, res) => {
  resetSession();
  res.json(getState());
});

// Simuliert eine Frage, ohne das Modell zu befragen.
router.post('/debug/level', async (req, res) => {
  const files = await getFiles();
  const exercise = await getCurrentExercise();
  res.json(determineLevel({ exerciseId: exercise?.id ?? null, files }));
});

router.post('/debug/filter', async (req, res) => {
  const exercise = await getCurrentExercise();
  res.json(filterResponse(req.body?.text ?? '', {
    level: Number(req.body?.level ?? 1),
    exercise,
  }));
});

export default router;