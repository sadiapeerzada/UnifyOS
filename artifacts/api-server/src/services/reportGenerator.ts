import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

interface IncidentData {
  id: string;
  location: string;
  severity: string;
  confidence: number;
  startTime: Date;
  endTime: Date;
  triggeredSensors: string[];
  peakTemperature: number;
  peakSmoke: number;
  aiSummary: string;
  resolvedBy: string;
  notes: string;
  stepsCompleted: number;
}

export async function generateIncidentPDF(data: IncidentData): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });
    stream.on('error', reject);
    doc.pipe(stream);

    const duration = Math.round(
      (data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60
    );

    doc.fontSize(20).font('Helvetica-Bold')
       .text('UnifyOS — Incident Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).font('Helvetica-Bold').text('Incident Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Incident ID: ${data.id}`);
    doc.text(`Location: ${data.location}`);
    doc.text(`Severity: ${data.severity}`);
    doc.text(`Confidence: ${data.confidence}%`);
    doc.text(`Time: ${data.startTime.toLocaleString()}`);
    doc.text(`Duration: ${duration} minutes`);
    doc.text(`Resolved by: ${data.resolvedBy}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Sensor Data');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Triggered sensors: ${data.triggeredSensors.join(', ')}`);
    doc.text(`Peak temperature: ${data.peakTemperature}°C`);
    doc.text(`Peak smoke level: ${data.peakSmoke} ppm`);
    doc.moveDown(1);

    if (data.aiSummary) {
      doc.fontSize(14).font('Helvetica-Bold').text('AI Analysis');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.aiSummary);
      doc.moveDown(1);
    }

    if (data.notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('Responder Notes');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.notes);
      doc.moveDown(1);
    }

    doc.fontSize(14).font('Helvetica-Bold').text('Response Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Evacuation steps completed: ${data.stepsCompleted} of 6`);
    doc.text(`Status: Resolved`);
    doc.moveDown(2);

    doc.fontSize(9).font('Helvetica')
       .fillColor('#888888')
       .text('UnifyOS — Crisis Coordination Platform | Team BlackBit | Google Solution Challenge 2026',
         { align: 'center' });

    doc.end();
  });
}
