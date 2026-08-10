import { Router } from 'express';
import {
  selectProject, getStatus, getFiles, clearProject,
} from '../services/project/projectService.js';
import { analyzeProject, toPromptSummary } from '../services/analysis/codeAnalysisService.js';
import { compileProject, toPromptSummary as compilerSummary }
  from '../services/analysis/compilerService.js';
import { getRoot } from '../services/project/projectService.js';

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

router.get('/project/analysis', async (req, res) => {
  const files = await getFiles();
  const analyses = analyzeProject(files);
  res.json({ analyses, summary: toPromptSummary(analyses) });
});

router.get('/project/diagnostics', async (req, res) => {
  const files = await getFiles();
  const result = await compileProject(getRoot(), files.map((f) => f.absPath));
  res.json({ ...result, summary: compilerSummary(result) });
});

router.delete('/project', async (req, res) => {
  await clearProject();
  res.json({ selected: false, watching: false });
});

export default router;