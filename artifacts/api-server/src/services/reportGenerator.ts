import PDFDocument from 'pdfkit';

interface ReportData {
  incidentId: string;
  location: string;
  severity: string;
  confidence: number;
  startTime: string;
  duration: string;
  triggeredSensors: string[];
  sensorValues: {
    temperature?: number;
    smoke?: number;
    motion?: number;
    button?: number;
  };
  aiSummary?: string;
  explanation: string;
  resolvedBy: string;
  notes: string;
  stepsCompleted: string[];
}

export async function generateIncidentReport(data: ReportData): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer.toString('base64'));
    });
    doc.on('error', reject);

    const accentColor = '#2563EB';
    const criticalColor = '#EF4444';
    const borderColor = '#E5E7EB';

    doc.rect(0, 0, doc.page.width, 80).fill('#0A0E1A');
    doc.fontSize(22).font('Helvetica-Bold').fill('#FFFFFF')
      .text('UnifyOS Incident Report', 50, 25, { align: 'center', width: doc.page.width - 100 });
    doc.fontSize(10).font('Helvetica').fill('#94A3B8')
      .text('Real-time Crisis Coordination Platform', 50, 52, { align: 'center', width: doc.page.width - 100 });

    doc.moveDown(3);
    doc.fontSize(9).font('Helvetica').fill('#6B7280')
      .text(`Generated: ${new Date().toUTCString()}`, { align: 'right' });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
    doc.moveDown(0.5);

    const severityColor = data.severity === 'CRITICAL' ? criticalColor :
      data.severity === 'HIGH' ? '#F97316' :
      data.severity === 'MEDIUM' ? '#EAB308' : '#22C55E';

    doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('INCIDENT DETAILS');
    doc.moveDown(0.3);

    const details = [
      ['Incident ID', data.incidentId],
      ['Location', data.location],
      ['Severity', data.severity],
      ['Confidence', `${data.confidence}%`],
      ['Time', new Date(data.startTime).toLocaleString()],
      ['Duration', data.duration],
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').fill('#374151').text(`${label}:  `, { continued: true });
      if (label === 'Severity') {
        doc.fontSize(10).font('Helvetica-Bold').fill(severityColor).text(value);
      } else {
        doc.fontSize(10).font('Helvetica').fill('#1F2937').text(value);
      }
    });

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
    doc.moveDown(0.5);

    doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('TRIGGERED SENSORS');
    doc.moveDown(0.3);
    if (data.triggeredSensors.length > 0) {
      doc.fontSize(10).font('Helvetica').fill('#1F2937').text(data.triggeredSensors.join(', '));
    } else {
      doc.fontSize(10).font('Helvetica').fill('#6B7280').text('None');
    }

    doc.moveDown(0.4);
    const sv = data.sensorValues;
    if (sv.temperature !== undefined) doc.fontSize(10).font('Helvetica').fill('#374151').text(`Temperature: ${sv.temperature.toFixed(1)}°C`);
    if (sv.smoke !== undefined) doc.fontSize(10).font('Helvetica').fill('#374151').text(`Smoke: ${sv.smoke} ppm`);
    if (sv.motion !== undefined) doc.fontSize(10).font('Helvetica').fill('#374151').text(`Motion: ${sv.motion ? 'Detected' : 'None'}`);
    if (sv.button !== undefined) doc.fontSize(10).font('Helvetica').fill('#374151').text(`Panic Button: ${sv.button ? 'Pressed' : 'Not Pressed'}`);

    if (data.aiSummary) {
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('AI ANALYSIS');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fill('#1F2937').text(data.aiSummary, { lineGap: 3 });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('ANOMALY EXPLANATION');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fill('#1F2937').text(data.explanation, { lineGap: 3 });

    if (data.stepsCompleted.length > 0) {
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('EVACUATION STEPS COMPLETED');
      doc.moveDown(0.3);
      data.stepsCompleted.forEach((step, i) => {
        doc.fontSize(10).font('Helvetica').fill('#1F2937').text(`${i + 1}. ${step}`, { lineGap: 2 });
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(borderColor).stroke();
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica-Bold').fill(accentColor).text('RESOLUTION');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').fill('#374151').text('Resolved By:  ', { continued: true });
    doc.fontSize(10).font('Helvetica').fill('#1F2937').text(data.resolvedBy);
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica-Bold').fill('#374151').text('Notes:');
    doc.fontSize(10).font('Helvetica').fill('#1F2937').text(data.notes || 'No notes provided.', { lineGap: 3 });

    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(doc.page.width - 50, footerY - 10).strokeColor(borderColor).stroke();
    doc.fontSize(9).font('Helvetica').fill('#9CA3AF')
      .text('UnifyOS · Team BlackBit · Google Solution Challenge 2026', 50, footerY, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  });
}
