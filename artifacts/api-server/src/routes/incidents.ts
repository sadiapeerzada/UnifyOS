import { Router, type IRouter } from 'express';
import cors from 'cors';
import { generateIncidentPDF } from '../services/reportGenerator.js';

const router: IRouter = Router();
const openCors = cors({ origin: '*' });

interface Incident {
  id: string;
  resolved: boolean;
  resolvedBy?: string;
  notes?: string;
  resolvedAt?: string;
  reportBase64?: string;
  location?: string;
  severity?: string;
  triggeredSensors?: string[];
}

const incidents = new Map<string, Incident>();

router.post('/incident/resolve', openCors, async (req, res) => {
  try {
    const {
      incidentId,
      resolvedBy,
      notes,
      location,
      severity,
      confidence,
      triggeredSensors,
      peakTemperature,
      peakSmoke,
      aiSummary,
      stepsCompleted,
      startTime,
    } = req.body as {
      incidentId: string;
      resolvedBy: string;
      notes?: string;
      location?: string;
      severity?: string;
      confidence?: number;
      triggeredSensors?: string[];
      peakTemperature?: number;
      peakSmoke?: number;
      aiSummary?: string;
      stepsCompleted?: number;
      startTime?: string;
    };

    if (!incidentId || !resolvedBy) {
      res.status(400).json({ error: 'incidentId and resolvedBy required' });
      return;
    }

    const endTime = new Date();
    const resolvedAt = endTime.toISOString();

    let reportBase64: string;
    try {
      reportBase64 = await generateIncidentPDF({
        id: incidentId,
        location: location ?? 'Unknown',
        severity: severity ?? 'CRITICAL',
        confidence: confidence ?? 0,
        startTime: startTime ? new Date(startTime) : new Date(endTime.getTime() - 5 * 60 * 1000),
        endTime,
        triggeredSensors: triggeredSensors ?? [],
        peakTemperature: peakTemperature ?? 0,
        peakSmoke: peakSmoke ?? 0,
        aiSummary: aiSummary ?? '',
        resolvedBy,
        notes: notes ?? '',
        stepsCompleted: stepsCompleted ?? 0,
      });
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr);
      reportBase64 = Buffer.from(JSON.stringify({
        incidentId,
        resolvedBy,
        notes,
        resolvedAt,
        generatedAt: new Date().toISOString(),
        platform: 'UnifyOS v3.0',
        team: 'Team BlackBit',
      })).toString('base64');
    }

    const incident: Incident = {
      id: incidentId,
      resolved: true,
      resolvedBy,
      notes,
      resolvedAt,
      reportBase64,
      location,
      severity,
      triggeredSensors,
    };

    incidents.set(incidentId, incident);

    res.json({
      success: true,
      incidentId,
      reportBase64,
      reportUrl: `/api/incident/${incidentId}/report`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
});

router.get('/incident/:id/report', openCors, (req, res) => {
  const { id } = req.params;
  const incident = incidents.get(id);

  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  if (!incident.resolved) {
    res.status(400).json({ error: 'Incident not yet resolved' });
    return;
  }

  res.json({
    incidentId: id,
    resolved: true,
    resolvedBy: incident.resolvedBy,
    resolvedAt: incident.resolvedAt,
    notes: incident.notes,
    reportBase64: incident.reportBase64,
  });
});

export default router;
