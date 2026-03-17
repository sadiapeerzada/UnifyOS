import { Router, type IRouter } from 'express';
import cors from 'cors';
import { anomalyDetector } from '../lib/anomalyDetector.js';

const router: IRouter = Router();

const openCors = cors({ origin: '*' });

router.get('/anomaly-stats', openCors, (_req, res) => {
  const stats = anomalyDetector.getStats();
  res.json(stats);
});

export default router;
