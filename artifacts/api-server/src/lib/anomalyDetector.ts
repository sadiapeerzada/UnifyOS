const LOCATION_MAP: Record<string, string> = {
  'device-001': 'Main Lobby',
};

const CALIBRATION_READINGS = 30;
const OUTLIER_TRIM = Math.floor(CALIBRATION_READINGS * 0.1); // 3 each side
const RECALIBRATE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  crowdDensity?: 'low' | 'medium' | 'high';
  audioAnomaly?: boolean;
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
  explanation: string;
}

interface HistoryEntry extends SensorData {
  timestamp: Date;
}

interface Baseline {
  temp: number;
  smoke: number;
  calibrated: boolean;
  lastCalibrated: number;
}

interface AlertRecord {
  confidence: number;
  time: number;
}

export class AnomalyDetector {
  private sensorHistory: Map<string, HistoryEntry[]> = new Map();
  private baselines: Map<string, Baseline> = new Map();
  private calibrationReadings: Map<string, { temps: number[]; smokes: number[] }> = new Map();
  private lastAlerts: Map<string, AlertRecord> = new Map();
  private totalReadings = 0;
  private alertsFired = 0;
  private criticalAlerts = 0;

  private trimmedMean(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const trimmed = sorted.slice(OUTLIER_TRIM, sorted.length - OUTLIER_TRIM);
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }

  private calibrateBaseline(deviceId: string, temp: number, smoke: number): Baseline | null {
    if (!this.calibrationReadings.has(deviceId)) {
      this.calibrationReadings.set(deviceId, { temps: [], smokes: [] });
    }
    const cal = this.calibrationReadings.get(deviceId)!;
    const existing = this.baselines.get(deviceId);

    if (existing?.calibrated) {
      if (Date.now() - existing.lastCalibrated > RECALIBRATE_INTERVAL_MS) {
        this.calibrationReadings.set(deviceId, { temps: [], smokes: [] });
        this.baselines.delete(deviceId);
        console.log(`UnifyOS: Re-calibrating baseline for ${deviceId} (6h elapsed)`);
      } else {
        return existing;
      }
    }

    cal.temps.push(temp);
    cal.smokes.push(smoke);

    if (cal.temps.length >= CALIBRATION_READINGS) {
      const avgTemp = this.trimmedMean(cal.temps);
      const avgSmoke = this.trimmedMean(cal.smokes);
      const baseline: Baseline = { temp: avgTemp, smoke: avgSmoke, calibrated: true, lastCalibrated: Date.now() };
      this.baselines.set(deviceId, baseline);
      console.log(`UnifyOS: Baseline calibrated for ${deviceId} — temp: ${avgTemp.toFixed(1)}°C, smoke: ${avgSmoke.toFixed(0)} ppm`);
      return baseline;
    }
    return null;
  }

  checkAnomalies(deviceId: string, sensorData: SensorData): AnomalyResult {
    const { temperature, smoke, motion, button, crowdDensity, audioAnomaly } = sensorData;
    const location = LOCATION_MAP[deviceId] ?? deviceId;
    this.totalReadings++;

    const baseline = this.calibrateBaseline(deviceId, temperature, smoke);
    if (!baseline) {
      const cal = this.calibrationReadings.get(deviceId)!;
      return {
        severity: 'CALIBRATING',
        confidence: 0,
        anomalies: [],
        action: 'WAIT',
        message: `Sensors warming up — ${cal.temps.length}/${CALIBRATION_READINGS} readings`,
        triggeredSensors: [],
        suggestedAction: 'Sensors warming up.',
        location,
        explanation: 'System calibrating baseline readings.',
      };
    }

    this.recordReading(deviceId, sensorData);
    const readings = this.sensorHistory.get(deviceId) || [];

    let confidence = 0;
    const anomalies: string[] = [];
    const triggeredSensors: string[] = [];
    const explanationParts: string[] = [];

    const tempThresholdHigh = baseline.temp + 10;
    const tempThresholdCritical = baseline.temp + 15;
    const smokeThresholdCritical = baseline.smoke + 250;
    const smokeThresholdHigh = baseline.smoke + 120;

    // --- Temperature threshold ---
    const tempAbove2x = temperature > baseline.temp * 2;
    if (temperature > tempThresholdCritical) {
      confidence += 30;
      anomalies.push('TEMP_CRITICAL');
      triggeredSensors.push('TEMP');
      explanationParts.push(`Temperature ${(temperature - baseline.temp).toFixed(1)}°C above baseline`);
    } else if (temperature > tempThresholdHigh) {
      if (!tempAbove2x) {
        confidence += 10;
      } else {
        confidence += 15;
      }
      anomalies.push('TEMP_HIGH');
      triggeredSensors.push('TEMP');
      explanationParts.push(`Temperature elevated ${(temperature - baseline.temp).toFixed(1)}°C`);
    }

    // --- Rate of change using last 5 readings ---
    const last5Temp = readings.slice(-5).map(r => r.temperature);
    const last5Smoke = readings.slice(-5).map(r => r.smoke);

    const tempTrend = last5Temp.length >= 2
      ? (last5Temp[last5Temp.length - 1] - last5Temp[0]) / last5Temp.length
      : 0;
    const smokeTrend = last5Smoke.length >= 2
      ? (last5Smoke[last5Smoke.length - 1] - last5Smoke[0]) / last5Smoke.length
      : 0;

    if (tempTrend > 2) {
      confidence += 15;
      anomalies.push('TEMP_RISING_FAST');
      if (!triggeredSensors.includes('TEMP')) triggeredSensors.push('TEMP');
      explanationParts.push(`Temperature rising ${tempTrend.toFixed(1)}°C/reading over last 5 samples`);
    }
    if (smokeTrend > 30) {
      confidence += 15;
      anomalies.push('SMOKE_RISING_FAST');
      if (!triggeredSensors.includes('SMOKE')) triggeredSensors.push('SMOKE');
      explanationParts.push(`Smoke rising ${smokeTrend.toFixed(0)} ppm/reading over last 5 samples`);
    }

    // --- Smoke threshold ---
    const smokeAbove2x = smoke > baseline.smoke * 2;
    if (smoke > smokeThresholdCritical) {
      confidence += 30;
      anomalies.push('SMOKE_DETECTED');
      triggeredSensors.push('SMOKE');
      explanationParts.push(`Smoke ${(smoke - baseline.smoke).toFixed(0)} ppm above baseline`);
    } else if (smoke > smokeThresholdHigh) {
      if (!smokeAbove2x) {
        confidence += 10;
      } else {
        confidence += 15;
      }
      anomalies.push('SMOKE_ELEVATED');
      if (!triggeredSensors.includes('SMOKE')) triggeredSensors.push('SMOKE');
      explanationParts.push(`Smoke elevated at ${smoke} ppm`);
    }

    // --- Panic button ---
    if (button === 1) {
      confidence += 15;
      anomalies.push('PANIC_BUTTON');
      triggeredSensors.push('BUTTON');
      explanationParts.push('Panic button manually activated');
    }

    // --- False alarm prevention: button alone max 15% ---
    const onlyButton = anomalies.length === 1 && anomalies[0] === 'PANIC_BUTTON';
    if (onlyButton) {
      confidence = Math.min(confidence, 15);
    }

    // --- Motion: never triggers alert alone, only adds context ---
    if (motion === 0 && confidence > 50) {
      anomalies.push('OCCUPANCY_EMPTY');
      triggeredSensors.push('MOTION');
      explanationParts.push('Area appears evacuated (no motion)');
    }

    // --- Sustained readings (last 3 from history) ---
    const sustainedTemp = readings.slice(-3).length === 3 &&
      readings.slice(-3).every(r => r.temperature > (baseline.temp + 10));
    const sustainedSmoke = readings.slice(-3).length === 3 &&
      readings.slice(-3).every(r => r.smoke > (baseline.smoke + 150));

    if (sustainedTemp) {
      confidence += 10;
      anomalies.push('TEMP_SUSTAINED');
      explanationParts.push('Temperature sustained above threshold for 3+ readings');
    }
    if (sustainedSmoke) {
      confidence += 10;
      anomalies.push('SMOKE_SUSTAINED');
      explanationParts.push('Smoke sustained above threshold for 3+ readings');
    }

    // --- Correlation bonuses ---
    if (anomalies.includes('TEMP_CRITICAL') && anomalies.includes('SMOKE_DETECTED')) {
      confidence += 20;
      anomalies.push('FIRE_CORRELATION');
      explanationParts.push('Critical temp + smoke correlation — high confidence fire event');
    }
    if (anomalies.includes('TEMP_CRITICAL') && anomalies.includes('SMOKE_DETECTED') && button === 1) {
      confidence += 15;
      anomalies.push('TRIPLE_CONFIRMATION');
      explanationParts.push('All 4 sensor types triggered simultaneously');
    }

    // --- Multi-sensor bonus ---
    if (triggeredSensors.length > 2) {
      confidence += 5;
    }

    // --- Crowd density + audio anomaly scoring ---
    if (crowdDensity === 'high') {
      confidence += 10;
      anomalies.push('HIGH_CROWD_DENSITY');
      explanationParts.push('High occupancy detected in this zone');
    }
    if (crowdDensity === 'high' && anomalies.includes('TEMP_CRITICAL')) {
      confidence += 10;
      anomalies.push('CROWD_EVACUATION_URGENT');
      explanationParts.push('High occupancy with critical temperature — urgent evacuation needed');
    }
    if (audioAnomaly === true) {
      confidence += 20;
      anomalies.push('AUDIO_ANOMALY_DETECTED');
      if (!triggeredSensors.includes('AUDIO')) triggeredSensors.push('AUDIO');
      explanationParts.push('Unusual audio detected');
    }
    if (audioAnomaly === true && button === 1) {
      confidence += 15;
      anomalies.push('AUDIO_PANIC_CONFIRMED');
      explanationParts.push('Audio anomaly confirmed by panic button press');
    }

    // --- Confidence cap and floor ---
    confidence = Math.min(Math.max(confidence, 0), 100);

    const explanation = explanationParts.length > 0
      ? explanationParts.join('. ') + '.'
      : 'All sensors within normal parameters.';

    const now = Date.now();
    const lastAlert = this.lastAlerts.get(deviceId);

    // --- Smart debounce per severity ---
    const debounce = (severity: string) => {
      if (!lastAlert) return false;
      const elapsed = now - lastAlert.time;
      if (severity === 'CRITICAL') return elapsed < 8000;
      if (severity === 'HIGH') return elapsed < 15000;
      if (severity === 'MEDIUM') return elapsed < 30000;
      return false;
    };

    // --- False alarm: require 3 consecutive readings for HIGH ---
    const hasThreeConsecutive = readings.slice(-3).length === 3;

    if (confidence >= 80) {
      if (debounce('CRITICAL')) return this.normalResult(location);
      const confDiff = lastAlert ? Math.abs(confidence - lastAlert.confidence) : 100;
      if (confDiff < 5 && lastAlert) return this.normalResult(location);
      this.lastAlerts.set(deviceId, { confidence, time: now });
      this.alertsFired++;
      this.criticalAlerts++;
      return {
        severity: 'CRITICAL',
        confidence,
        anomalies,
        action: 'EVACUATE_IMMEDIATELY',
        message: 'Fire detected with high confidence! Evacuate immediately.',
        triggeredSensors,
        suggestedAction: 'Evacuate immediately. Call 112.',
        location,
        explanation,
      };
    } else if (confidence >= 50) {
      if (!hasThreeConsecutive) {
        return {
          severity: 'MEDIUM',
          confidence: Math.min(confidence, 45),
          anomalies,
          action: 'MONITOR',
          message: 'Unusual activity detected — awaiting confirmation.',
          triggeredSensors,
          suggestedAction: 'Monitor closely. Await further readings.',
          location,
          explanation: explanation + ' (Insufficient consecutive readings for HIGH alert)',
        };
      }
      if (debounce('HIGH')) return this.normalResult(location);
      const confDiff = lastAlert ? Math.abs(confidence - lastAlert.confidence) : 100;
      if (confDiff < 5 && lastAlert) return this.normalResult(location);
      this.lastAlerts.set(deviceId, { confidence, time: now });
      this.alertsFired++;
      return {
        severity: 'HIGH',
        confidence,
        anomalies,
        action: 'ALERT_STAFF',
        message: 'Potential fire detected — investigate immediately.',
        triggeredSensors,
        suggestedAction: 'Alert staff. Investigate now.',
        location,
        explanation,
      };
    } else if (confidence >= 20) {
      if (debounce('MEDIUM')) return this.normalResult(location);
      this.lastAlerts.set(deviceId, { confidence, time: now });
      this.alertsFired++;
      return {
        severity: 'MEDIUM',
        confidence,
        anomalies,
        action: 'MONITOR',
        message: 'Unusual activity detected — monitoring sensors.',
        triggeredSensors,
        suggestedAction: 'Monitor closely. Check for false trigger.',
        location,
        explanation,
      };
    } else {
      return this.normalResult(location);
    }
  }

  getStats() {
    const baselineDevices: Record<string, { temp: number; smoke: number; calibrated: boolean }> = {};
    this.baselines.forEach((b, id) => {
      baselineDevices[id] = { temp: b.temp, smoke: b.smoke, calibrated: b.calibrated };
    });
    const falseAlarmRate = this.alertsFired > 0
      ? `estimated ${Math.max(0, 100 - Math.round((this.criticalAlerts / this.alertsFired) * 100))}%`
      : 'N/A';
    const lastCalibrated = Math.max(...Array.from(this.baselines.values()).map(b => b.lastCalibrated), 0);
    return {
      totalReadings: this.totalReadings,
      alertsFired: this.alertsFired,
      criticalAlerts: this.criticalAlerts,
      baselineDevices,
      falseAlarmRate,
      lastCalibrated: lastCalibrated > 0 ? new Date(lastCalibrated).toISOString() : null,
    };
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
      explanation: 'All sensors within normal parameters.',
    };
  }

  private recordReading(deviceId: string, data: SensorData): void {
    if (!this.sensorHistory.has(deviceId)) {
      this.sensorHistory.set(deviceId, []);
    }
    const history = this.sensorHistory.get(deviceId)!;
    history.push({ ...data, timestamp: new Date() });
    if (history.length > 30) history.shift();
  }
}

export const anomalyDetector = new AnomalyDetector();
