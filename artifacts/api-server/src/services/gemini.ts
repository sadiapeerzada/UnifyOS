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
}

interface GeminiResult {
  summary: string;
  immediateAction: string;
}

export async function generateIncidentSummary(alertData: AlertData): Promise<GeminiResult> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini key');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `You are an emergency response AI for UnifyOS.

Alert triggered:
- Location: ${alertData.location}
- Severity: ${alertData.severity}
- Confidence: ${alertData.confidence}%
- Triggered sensors: ${alertData.triggeredSensors.join(', ')}
- Temperature: ${alertData.temperature}C
- Smoke: ${alertData.smoke} ppm
- Motion: ${alertData.motion ? 'Yes' : 'No'}
- Panic button: ${alertData.button ? 'Yes' : 'No'}
- Time: ${new Date().toLocaleTimeString()}

Generate a concise 2-sentence incident summary for emergency responders.
Then provide the single most important immediate action.
Respond ONLY with this JSON: { "summary": "...", "immediateAction": "..." }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      summary: `${alertData.severity} alert at ${alertData.location}. ${alertData.triggeredSensors.join(' and ')} triggered with ${alertData.confidence}% confidence.`,
      immediateAction: alertData.suggestedAction,
    };
  }
}
