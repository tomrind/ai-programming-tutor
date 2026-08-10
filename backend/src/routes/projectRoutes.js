import { Router } from 'express';
import {
  selectProject, getStatus, getFiles, clearProject,
} from '../services/project/projectService.js';

const router = Router();

router.post('/project', async (req, res) => {
  const status = await selectProject(req.body?.path);
  res.json(status);
});

router.get('/project', async (req, res) => {
  res.json(await getStatus());
});

router.get('/project/files', async (req, res) => {
  res.json({ files: await getFiles() });
});

router.delete('/project', async (req, res) => {
  await clearProject();
  res.json({ selected: false, watching: false });
});

export default router;