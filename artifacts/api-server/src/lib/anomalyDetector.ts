interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
}

interface AnomalyResult {
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  anomalies: string[];
  action: string;
  message: string;
}

interface HistoryEntry extends SensorData {
  timestamp: Date;
}

export class AnomalyDetector {
  private sensorHistory: Map<string, HistoryEntry[]> = new Map();

  checkAnomalies(deviceId: string, sensorData: SensorData): AnomalyResult {
    const { temperature, smoke, motion, button } = sensorData;
    let confidence = 0;
    const anomalies: string[] = [];

    if (temperature > 45) {
      confidence += 30;
      anomalies.push("TEMP_CRITICAL");
    } else if (temperature > 35) {
      confidence += 10;
      anomalies.push("TEMP_HIGH");
    }

    const prevTemp = this.getPreviousReading(deviceId, "temperature");
    const tempRate = temperature - prevTemp;
    if (tempRate > 2) {
      confidence += 20;
      anomalies.push("TEMP_SPIKE");
    }

    if (smoke > 400) {
      confidence += 30;
      anomalies.push("SMOKE_DETECTED");
    } else if (smoke > 250) {
      confidence += 10;
      anomalies.push("SMOKE_ELEVATED");
    }

    const prevSmoke = this.getPreviousReading(deviceId, "smoke");
    const smokeRate = smoke - prevSmoke;
    if (smokeRate > 100) {
      confidence += 20;
      anomalies.push("SMOKE_SPIKE");
    }

    if (button === 1) {
      confidence += 15;
      anomalies.push("PANIC_BUTTON");
    }

    if (anomalies.length > 2) {
      confidence += 5;
    }

    if (this.isSustained(deviceId, temperature, smoke)) {
      confidence += 5;
    }

    if (motion === 0 && confidence > 50) {
      anomalies.push("OCCUPANCY_EMPTY");
    }

    this.recordReading(deviceId, sensorData);

    const clampedConfidence = Math.min(confidence, 100);

    if (confidence >= 80) {
      return {
        severity: "CRITICAL",
        confidence: clampedConfidence,
        anomalies,
        action: "EVACUATE_IMMEDIATELY",
        message: "Fire detected with high confidence! Evacuate immediately.",
      };
    } else if (confidence >= 50) {
      return {
        severity: "HIGH",
        confidence: clampedConfidence,
        anomalies,
        action: "ALERT_STAFF",
        message: "Potential fire detected - investigate immediately.",
      };
    } else if (confidence >= 20) {
      return {
        severity: "MEDIUM",
        confidence: clampedConfidence,
        anomalies,
        action: "MONITOR",
        message: "Unusual activity detected - monitoring sensors.",
      };
    } else {
      return {
        severity: "NORMAL",
        confidence: 0,
        anomalies: [],
        action: "NONE",
        message: "All sensors within normal parameters.",
      };
    }
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
