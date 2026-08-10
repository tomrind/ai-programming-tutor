import { Router } from 'express';
import {
  listExercises, selectExercise, getCurrentExercise,
} from '../services/exerciseService.js';

const router = Router();

router.get('/exercises', async (req, res) => {
  res.json({ exercises: await listExercises() });
});

router.get('/exercise', async (req, res) => {
  res.json({ exercise: await getCurrentExercise() });
});

router.post('/exercise', async (req, res) => {
  res.json({ exercise: await selectExercise(req.body?.id) });
});

export default router;