import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

export async function generateIncidentSummary(alertData: AlertData): Promise<GeminiResult> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini key');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      summary: parsed.summary || '',
      immediateAction: parsed.immediateAction || alertData.suggestedAction,
      estimatedCause: parsed.estimatedCause || '',
    };
  } catch {
    return {
      summary: `${alertData.severity} alert at ${alertData.location}. ${alertData.triggeredSensors.join(' and ')} triggered with ${alertData.confidence}% confidence.`,
      immediateAction: alertData.suggestedAction,
      estimatedCause: alertData.explanation,
    };
  }
}
