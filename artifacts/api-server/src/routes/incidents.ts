import { Router, type IRouter } from 'express';
import cors from 'cors';

const router: IRouter = Router();
const openCors = cors({ origin: '*' });

interface Incident {
  id: string;
  resolved: boolean;
  resolvedBy?: string;
  notes?: string;
  resolvedAt?: string;
  reportUrl?: string;
}

const incidents = new Map<string, Incident>();

function generateReport(incident: Incident): string {
  return Buffer.from(JSON.stringify({
    incidentId: incident.id,
    resolvedBy: incident.resolvedBy,
    notes: incident.notes,
    resolvedAt: incident.resolvedAt,
    generatedAt: new Date().toISOString(),
    platform: 'UnifyOS v3.0',
    team: 'Team BlackBit',
  })).toString('base64');
}

router.post('/incident/resolve', openCors, async (req, res) => {
  try {
    const { incidentId, resolvedBy, notes } = req.body as { incidentId: string; resolvedBy: string; notes?: string };

    if (!incidentId || !resolvedBy) {
      res.status(400).json({ error: 'incidentId and resolvedBy required' });
      return;
    }

    const incident: Incident = {
      id: incidentId,
      resolved: true,
      resolvedBy,
      notes,
      resolvedAt: new Date().toISOString(),
    };

    const reportData = generateReport(incident);
    incident.reportUrl = `/api/incident/${incidentId}/report`;

    incidents.set(incidentId, incident);

    res.json({ success: true, reportUrl: incident.reportUrl });
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

  const reportData = generateReport(incident);

  res.json({
    incidentId: id,
    resolved: true,
    resolvedBy: incident.resolvedBy,
    resolvedAt: incident.resolvedAt,
    notes: incident.notes,
    reportBase64: reportData,
  });
});

export default router;
