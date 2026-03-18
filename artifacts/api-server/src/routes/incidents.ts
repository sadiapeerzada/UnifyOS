import { Router, type IRouter } from 'express';
import cors from 'cors';
import { generateIncidentReport } from '../services/reportGenerator.js';

const router: IRouter = Router();
const openCors = cors({ origin: '*' });

router.post('/incidents/resolve', openCors, async (req, res) => {
  try {
    const {
      incidentId,
      resolvedBy,
      notes,
      stepsCompleted,
      location,
      severity,
      confidence,
      startTime,
      duration,
      triggeredSensors,
      sensorValues,
      aiSummary,
      explanation,
    } = req.body;

    const reportBase64 = await generateIncidentReport({
      incidentId: incidentId || `INC-${Date.now()}`,
      location: location || 'Main Lobby',
      severity: severity || 'UNKNOWN',
      confidence: confidence || 0,
      startTime: startTime || new Date().toISOString(),
      duration: duration || 'Unknown',
      triggeredSensors: triggeredSensors || [],
      sensorValues: sensorValues || {},
      aiSummary,
      explanation: explanation || 'No explanation available.',
      resolvedBy: resolvedBy || 'Unknown',
      notes: notes || '',
      stepsCompleted: stepsCompleted || [],
    });

    res.json({ success: true, reportBase64 });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Failed to generate incident report' });
  }
});

export default router;
