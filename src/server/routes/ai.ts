import { Router, Request, Response } from 'express';
import { AIEngineService } from '../services/aiEngine.js';

const router = Router();

// POST /api/ai/analyze - Interactive AI preview
router.post('/analyze', (req: Request, res: Response) => {
  const { title = '', description = '', locality = '', city = 'Bengaluru' } = req.body;

  if (!title && !description) {
    return res.status(400).json({ error: 'Title or description is required for AI analysis.' });
  }

  const analysis = AIEngineService.analyzeComplaint({
    complaintId: 'PREVIEW-TEMP',
    title: String(title),
    description: String(description),
    locality: String(locality),
    city: String(city),
  });

  return res.json({ analysis });
});

export default router;
