import { Router } from 'express';
import { config } from '../config/config.js';
import { listModels } from '../services/tutor/ollamaService.js';

const router = Router();

router.get('/health', async (req, res) => {
  const result = {
    status: 'ok',
    model: config.ollama.model,
    ollamaBaseUrl: config.ollama.baseUrl,
    inference: 'local',
  };

  try {
    const models = await listModels();
    result.ollamaReachable = true;
    result.modelPulled = models.includes(config.ollama.model);
    result.availableModels = models;
    if (!result.modelPulled) {
      result.status = 'degraded';
      result.hint = `ollama pull ${config.ollama.model}`;
    }
  } catch (err) {
    result.status = 'degraded';
    result.ollamaReachable = false;
    result.error = err.message;
  }

  res.json(result);
});

export default router;