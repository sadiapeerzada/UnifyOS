import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || '';

const geminiReady = !!GEMINI_API_KEY;

console.log('🤖 [Gemini] Service initialized. Proxy:', GEMINI_BASE_URL ? `${GEMINI_BASE_URL.slice(0, 50)}...` : 'direct');
console.log('🤖 [Gemini] API key:', geminiReady ? 'Connected ✅' : 'Missing ❌');

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || 'placeholder',
  ...(GEMINI_BASE_URL ? {
    httpOptions: {
      apiVersion: '',
      baseUrl: GEMINI_BASE_URL,
    },
  } : {}),
});

const MODEL = 'gemini-2.5-flash';

interface AlertData {
  location: string;
  severity: string;
  confidence: number;
  triggeredSensors: string[];
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  suggestedAction: string;
  explanation: string;
}

interface GeminiResult {
  summary: string;
  immediateAction: string;
  estimatedCause: string;
}

export async function testGeminiConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    console.log('🤖 [Gemini] Testing API connection...');
    if (!geminiReady) {
      return { ok: false, message: 'No API key configured (set AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY)' };
    }
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
    });
    const text = result.text?.trim() ?? '';
    console.log('✅ [Gemini] Test response:', text);
    return { ok: true, message: `Gemini responded: ${text}` };
  } catch (err: any) {
    console.error('❌ [Gemini] Test failed:', err?.message || err);
    return { ok: false, message: err?.message || 'Unknown error' };
  }
}

export async function generateIncidentReport(venue: string, alertHistory: any[]): Promise<string> {
  console.log('🤖 [Gemini] Generating incident report for venue:', venue);
  try {
    if (!geminiReady) throw new Error('No Gemini key');

    const alertSummary = alertHistory.slice(0, 20).map(a =>
      `[${a.severity}] ${new Date(a.createdAt).toLocaleString()} — ${a.deviceLocation}: ${a.message} (Confidence: ${a.confidence}%)`
    ).join('\n');

    const prompt = `Generate a professional incident report for venue "${venue}".

Alert History:
${alertSummary || 'No alerts recorded in this session.'}

Write a formal incident report with these exact sections:
SUMMARY
TIMELINE
SENSOR READINGS
ANOMALIES DETECTED
RESPONSE ACTIONS
RECOMMENDATIONS

Use professional emergency response language. Be specific and concise. Each section should have 2-4 sentences.`;

    console.log('🤖 [Gemini] Sending incident report request...');
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    const text = result.text ?? '';
    console.log('✅ [Gemini] Incident report generated, length:', text.length);
    return text;
  } catch (err: any) {
    console.error('❌ [Gemini] Incident report generation failed:', err?.message || err);
    return `SUMMARY\nIncident report for ${venue}. Generated in offline mode due to API unavailability.\n\nTIMELINE\nSee attached alert history for event timeline.\n\nSENSOR READINGS\nSensor data recorded by UnifyOS monitoring system.\n\nANOMALIES DETECTED\nAnomalies identified and logged in the alert history.\n\nRESPONSE ACTIONS\nStaff followed standard emergency response protocols.\n\nRECOMMENDATIONS\nReview alert thresholds and ensure all sensors are calibrated.`;
  }
}

export async function generateIncidentSummary(alertData: AlertData): Promise<GeminiResult> {
  try {
    if (!geminiReady) throw new Error('No Gemini key');
    console.log('🤖 [Gemini] Calling generateIncidentSummary for location:', alertData.location);

    const prompt = `You are an emergency response AI for UnifyOS crisis coordination platform.

ALERT DETAILS:
Location: ${alertData.location}
Severity: ${alertData.severity}
Confidence: ${alertData.confidence}%
Time: ${new Date().toLocaleTimeString()}

SENSOR READINGS:
Temperature: ${alertData.temperature}°C (${alertData.temperature > 40 ? 'ELEVATED' : 'normal'})
Smoke: ${alertData.smoke} ppm (${alertData.smoke > 300 ? 'ELEVATED' : 'normal'})
Motion detected: ${alertData.motion ? 'YES' : 'No'}
Panic button: ${alertData.button ? 'YES - MANUALLY TRIGGERED' : 'Not pressed'}

TRIGGERED SENSORS: ${alertData.triggeredSensors.join(', ')}
SYSTEM ANALYSIS: ${alertData.explanation}

Generate:
1. A 2-sentence incident summary for emergency responders (mention specific location, what triggered it, severity)
2. The single most critical immediate action to take
3. Estimated probable cause of the alert

Respond ONLY with this exact JSON:
{
  "summary": "...",
  "immediateAction": "...",
  "estimatedCause": "..."
}`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    const text = result.text ?? '';
    console.log('✅ [Gemini] generateIncidentSummary response received');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      summary: parsed.summary || '',
      immediateAction: parsed.immediateAction || alertData.suggestedAction,
      estimatedCause: parsed.estimatedCause || '',
    };
  } catch (err: any) {
    console.error('❌ [Gemini] generateIncidentSummary error:', err?.message || err);
    return {
      summary: `${alertData.severity} alert at ${alertData.location}. ${alertData.triggeredSensors.join(' and ')} triggered with ${alertData.confidence}% confidence.`,
      immediateAction: alertData.suggestedAction,
      estimatedCause: alertData.explanation,
    };
  }
}
