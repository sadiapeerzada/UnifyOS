import { Router, type IRouter } from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { broadcastSensorUpdate } from '../lib/wsServer.js';

const router: IRouter = Router();
const openCors = cors({ origin: '*' });

router.post('/triage', openCors, async (req, res) => {
  try {
    const { alerts } = req.body as { alerts: any[] };
    if (!Array.isArray(alerts) || alerts.length === 0) {
      res.status(400).json({ error: 'alerts array required' });
      return;
    }

    let scored: any[] = [];

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `You are an emergency triage AI. Score each alert 1-10 for severity.

Alerts:
${JSON.stringify(alerts, null, 2)}

Return ONLY a JSON array of objects, same order as input but with a "severity_score" (1-10) added to each.
Higher number = more urgent. Consider: temperature, smoke, panic button, location.
Example: [{"id": 1, "severity_score": 9, ...originalFields}]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      scored = JSON.parse(text);
    } catch {
      scored = alerts.map((a, i) => ({
        ...a,
        severity_score: a.severity === 'CRITICAL' ? 10 : a.severity === 'HIGH' ? 7 : a.severity === 'MEDIUM' ? 4 : 1,
      }));
    }

    scored.sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0));

    try {
      const payload = JSON.stringify({ type: 'triage-update', data: scored });
    } catch {}

    res.json({ alerts: scored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Triage failed' });
  }
});

export default router;
