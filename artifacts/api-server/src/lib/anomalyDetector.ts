const LOCATION_MAP: Record<string, string> = {
  'device-001': 'Main Lobby',
  'device-002': 'Floor 2 East Wing',
  'device-003': 'Kitchen',
  'device-004': 'Conference Hall',
  'device-005': 'Floor 3 West Wing',
};

interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
}

interface AnomalyResult {
  severity: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'CALIBRATING';
  confidence: number;
  anomalies: string[];
  action: string;
  message: string;
  triggeredSensors: string[];
  suggestedAction: string;
  location: string;
}

interface HistoryEntry extends SensorData {
  timestamp: Date;
}

interface Baseline {
  temp: number;
  smoke: number;
  calibrated: boolean;
}

export class AnomalyDetector {
  private sensorHistory: Map<string, HistoryEntry[]> = new Map();
  private baselines: Map<string, Baseline> = new Map();
  private calibrationReadings: Map<string, { temps: number[]; smokes: number[] }> = new Map();
  private lastAlertTime: Map<string, number> = new Map();

  private calibrateBaseline(deviceId: string, temp: number, smoke: number): Baseline | null {
    if (!this.calibrationReadings.has(deviceId)) {
      this.calibrationReadings.set(deviceId, { temps: [], smokes: [] });
    }
    const cal = this.calibrationReadings.get(deviceId)!;

    if (!this.baselines.get(deviceId)?.calibrated) {
      cal.temps.push(temp);
      cal.smokes.push(smoke);

      if (cal.temps.length >= 20) {
        const avgTemp = cal.temps.reduce((a, b) => a + b, 0) / cal.temps.length;
        const avgSmoke = cal.smokes.reduce((a, b) => a + b, 0) / cal.smokes.length;
        const baseline: Baseline = { temp: avgTemp, smoke: avgSmoke, calibrated: true };
        this.baselines.set(deviceId, baseline);
        console.log(`UnifyOS: Baseline calibrated for ${deviceId} — temp: ${avgTemp.toFixed(1)}°C, smoke: ${avgSmoke.toFixed(0)} ppm`);
        return baseline;
      }
      return null;
    }
    return this.baselines.get(deviceId)!;
  }

  checkAnomalies(deviceId: string, sensorData: SensorData): AnomalyResult {
    const { temperature, smoke, motion, button } = sensorData;
    const location = LOCATION_MAP[deviceId] ?? deviceId;

    const baseline = this.calibrateBaseline(deviceId, temperature, smoke);
    if (!baseline) {
      return {
        severity: 'CALIBRATING',
        confidence: 0,
        anomalies: [],
        action: 'WAIT',
        message: 'Sensors warming up — 20 seconds',
        triggeredSensors: [],
        suggestedAction: 'Sensors warming up.',
        location,
      };
    }

    let confidence = 0;
    const anomalies: string[] = [];
    const triggeredSensors: string[] = [];

    const tempThresholdHigh = baseline.temp + 10;
    const tempThresholdCritical = baseline.temp + 15;

    if (temperature > tempThresholdCritical) {
      confidence += 30;
      anomalies.push('TEMP_CRITICAL');
      triggeredSensors.push('TEMP');
    } else if (temperature > tempThresholdHigh) {
      confidence += 10;
      anomalies.push('TEMP_HIGH');
      if (!triggeredSensors.includes('TEMP')) triggeredSensors.push('TEMP');
    }

    const prevTemp = this.getPreviousReading(deviceId, 'temperature');
    const tempRate = temperature - prevTemp;
    if (tempRate > 2) {
      confidence += 20;
      anomalies.push('TEMP_SPIKE');
      if (!triggeredSensors.includes('TEMP')) triggeredSensors.push('TEMP');
    }

    const smokeThresholdCritical = baseline.smoke + 250;
    const smokeThresholdHigh = baseline.smoke + 120;

    if (smoke > smokeThresholdCritical) {
      confidence += 30;
      anomalies.push('SMOKE_DETECTED');
      triggeredSensors.push('SMOKE');
    } else if (smoke > smokeThresholdHigh) {
      confidence += 10;
      anomalies.push('SMOKE_ELEVATED');
      if (!triggeredSensors.includes('SMOKE')) triggeredSensors.push('SMOKE');
    }

    const prevSmoke = this.getPreviousReading(deviceId, 'smoke');
    const smokeRate = smoke - prevSmoke;
    if (smokeRate > 100) {
      confidence += 20;
      anomalies.push('SMOKE_SPIKE');
      if (!triggeredSensors.includes('SMOKE')) triggeredSensors.push('SMOKE');
    }

    if (button === 1) {
      confidence += 15;
      anomalies.push('PANIC_BUTTON');
      triggeredSensors.push('BUTTON');
    }

    if (anomalies.length > 2) {
      confidence += 5;
    }

    if (this.isSustained(deviceId, temperature, smoke)) {
      confidence += 5;
    }

    if (motion === 0 && confidence > 50) {
      anomalies.push('OCCUPANCY_EMPTY');
      triggeredSensors.push('MOTION');
    }

    this.recordReading(deviceId, sensorData);

    const clampedConfidence = Math.min(confidence, 100);

    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(deviceId) ?? 0;

    if (confidence >= 80) {
      if (now - lastAlert < 5000) {
        return this.normalResult(location);
      }
      this.lastAlertTime.set(deviceId, now);
      return {
        severity: 'CRITICAL',
        confidence: clampedConfidence,
        anomalies,
        action: 'EVACUATE_IMMEDIATELY',
        message: 'Fire detected with high confidence! Evacuate immediately.',
        triggeredSensors,
        suggestedAction: 'Evacuate immediately. Call 112.',
        location,
      };
    } else if (confidence >= 50) {
      if (now - lastAlert < 5000) {
        return this.normalResult(location);
      }
      this.lastAlertTime.set(deviceId, now);
      return {
        severity: 'HIGH',
        confidence: clampedConfidence,
        anomalies,
        action: 'ALERT_STAFF',
        message: 'Potential fire detected - investigate immediately.',
        triggeredSensors,
        suggestedAction: 'Alert staff. Investigate now.',
        location,
      };
    } else if (confidence >= 20) {
      return {
        severity: 'MEDIUM',
        confidence: clampedConfidence,
        anomalies,
        action: 'MONITOR',
        message: 'Unusual activity detected - monitoring sensors.',
        triggeredSensors,
        suggestedAction: 'Monitor closely. Check for false trigger.',
        location,
      };
    } else {
      return this.normalResult(location);
    }
  }

  private normalResult(location: string): AnomalyResult {
    return {
      severity: 'NORMAL',
      confidence: 0,
      anomalies: [],
      action: 'NONE',
      message: 'All sensors within normal parameters.',
      triggeredSensors: [],
      suggestedAction: 'All systems normal.',
      location,
    };
  }

  private getPreviousReading(deviceId: string, sensor: keyof SensorData): number {
    const history = this.sensorHistory.get(deviceId) || [];
    if (history.length > 0) {
      return history[history.length - 1][sensor] as number;
    }
    return 0;
  }

  private recordReading(deviceId: string, data: SensorData): void {
    if (!this.sensorHistory.has(deviceId)) {
      this.sensorHistory.set(deviceId, []);
    }
    const history = this.sensorHistory.get(deviceId)!;
    history.push({ ...data, timestamp: new Date() });
    if (history.length > 30) {
      history.shift();
    }
  }

  private isSustained(deviceId: string, temp: number, smoke: number): boolean {
    const history = this.sensorHistory.get(deviceId) || [];
    let count = 0;
    for (let i = Math.max(0, history.length - 5); i < history.length; i++) {
      if (history[i].temperature > 40 || history[i].smoke > 300) {
        count++;
      }
    }
    return count >= 3;
  }
}

export const anomalyDetector = new AnomalyDetector();
