import { Router } from 'express';
import { config } from '../config/config.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    model: config.ollama.model,
    ollamaBaseUrl: config.ollama.baseUrl,
    inference: 'local',
  });
});

export default router;