// =============================================================================
// AuraNER / NER-RouteAI — Extended Kalman Filter (EKF)
// Discrete 4D Positional Filtering, Velocity Estimation & Dead Reckoning Engine
// State Vector: x = [lat, lng, v_lat, v_lng]^T
// =============================================================================

export interface KalmanState {
  lat: number;
  lng: number;
  vLat: number; // degrees per second
  vLng: number; // degrees per second
  speedKmh: number;
  headingDegrees: number;
  accuracyMeters: number;
  timestampMs: number;
}

export interface EKFConfig {
  processNoiseVariance?: number; // Acceleration / disturbance variance (q)
  defaultMeasurementNoise?: number; // GPS baseline measurement variance (r in meters)
}

export class ExtendedKalmanFilter {
  // State vector: [lat, lng, v_lat, v_lng]
  private x: [number, number, number, number];

  // 4x4 Error Covariance Matrix P
  private P: number[][];

  private lastTimestampMs: number;
  private readonly q: number; // Process noise intensity
  private readonly defaultR: number; // Measurement noise in meters

  constructor(
    initialLat: number,
    initialLng: number,
    initialTimestampMs: number = Date.now(),
    config: EKFConfig = {}
  ) {
    this.x = [initialLat, initialLng, 0, 0];
    this.lastTimestampMs = initialTimestampMs;

    // Process noise variance (tuning parameter for mountain terrain and turns)
    this.q = config.processNoiseVariance ?? 0.05;

    // Default GPS measurement error (e.g. 5.0m standard deviation)
    this.defaultR = config.defaultMeasurementNoise ?? 5.0;

    // Initial covariance P: low uncertainty on position, high on velocity
    const initVarPos = 0.00001; // ~1 meter in degrees
    const initVarVel = 0.001;

    this.P = [
      [initVarPos, 0, 0, 0],
      [0, initVarPos, 0, 0],
      [0, 0, initVarVel, 0],
      [0, 0, 0, initVarVel],
    ];
  }

  /**
   * Meters per degree latitude: ~111,139 meters.
   */
  private static readonly METERS_PER_DEG_LAT = 111139;

  /**
   * Meters per degree longitude at a given latitude.
   */
  private metersPerDegLng(lat: number): number {
    const rad = (lat * Math.PI) / 180;
    return Math.max(100, ExtendedKalmanFilter.METERS_PER_DEG_LAT * Math.cos(rad));
  }

  /**
   * Predicts next state given time delta dt in seconds.
   * x_pred = F * x
   * P_pred = F * P * F^T + Q
   */
  public predict(dt: number): void {
    if (dt <= 0) return;

    // 1. State transition: lat = lat + v_lat * dt, lng = lng + v_lng * dt
    this.x[0] += this.x[2] * dt;
    this.x[1] += this.x[3] * dt;

    // 2. F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]]
    // Analytical propagation of F * P * F^T + Q
    const dt2 = dt * dt;
    const dt3 = dt2 * dt / 2;
    const dt4 = dt2 * dt2 / 4;

    const mDegLat = ExtendedKalmanFilter.METERS_PER_DEG_LAT;
    const mDegLng = this.metersPerDegLng(this.x[0]);

    // Convert process noise q (m/s^2) into degrees/s^2
    const qLat = this.q / mDegLat;
    const qLng = this.q / mDegLng;

    // Continuous white noise acceleration model Q
    const q00 = dt4 * (qLat * qLat);
    const q02 = dt3 * (qLat * qLat);
    const q11 = dt4 * (qLng * qLng);
    const q13 = dt3 * (qLng * qLng);
    const q22 = dt2 * (qLat * qLat);
    const q33 = dt2 * (qLng * qLng);

    // Compute F * P * F^T
    const p = this.P;
    const p00 = p[0][0] + dt * (p[2][0] + p[0][2]) + dt2 * p[2][2] + q00;
    const p02 = p[0][2] + dt * p[2][2] + q02;
    const p20 = p[2][0] + dt * p[2][2] + q02;
    const p22 = p[2][2] + q22;

    const p11 = p[1][1] + dt * (p[3][1] + p[1][3]) + dt2 * p[3][3] + q11;
    const p13 = p[1][3] + dt * p[3][3] + q13;
    const p31 = p[3][1] + dt * p[3][3] + q13;
    const p33 = p[3][3] + q33;

    this.P = [
      [p00, p[0][1], p02, p[0][3]],
      [p[1][0], p11, p[1][2], p13],
      [p20, p[2][1], p22, p[2][3]],
      [p[3][0], p31, p[3][2], p33],
    ];
  }

  /**
   * Updates state with new GPS measurement (lat, lng).
   * Calculates Kalman gain K and produces optimal posterior state estimate.
   */
  public update(
    measuredLat: number,
    measuredLng: number,
    timestampMs: number,
    accuracyMeters?: number
  ): KalmanState {
    const dt = Math.max(0.001, (timestampMs - this.lastTimestampMs) / 1000);
    this.lastTimestampMs = timestampMs;

    // 1. Time Update / Prediction Step
    this.predict(dt);

    // 2. Measurement Noise Covariance R in degrees squared
    const accMeters = accuracyMeters ?? this.defaultR;
    const mDegLat = ExtendedKalmanFilter.METERS_PER_DEG_LAT;
    const mDegLng = this.metersPerDegLng(this.x[0]);

    const rLat = Math.pow(accMeters / mDegLat, 2);
    const rLng = Math.pow(accMeters / mDegLng, 2);

    // 3. Measurement Residual y = z - H * x (H = [[1,0,0,0],[0,1,0,0]])
    const yLat = measuredLat - this.x[0];
    const yLng = measuredLng - this.x[1];

    // 4. Innovation Covariance S = H * P * H^T + R
    const sLat = this.P[0][0] + rLat;
    const sLng = this.P[1][1] + rLng;

    // 5. Kalman Gain K = P * H^T * S^-1
    const k0Lat = this.P[0][0] / sLat;
    const k2Lat = this.P[2][0] / sLat;

    const k1Lng = this.P[1][1] / sLng;
    const k3Lng = this.P[3][1] / sLng;

    // 6. State Correction x = x + K * y
    this.x[0] += k0Lat * yLat;
    this.x[1] += k1Lng * yLng;
    this.x[2] += k2Lat * yLat;
    this.x[3] += k3Lng * yLng;

    // 7. Covariance Update P = (I - K * H) * P
    this.P[0][0] *= (1 - k0Lat);
    this.P[0][2] *= (1 - k0Lat);
    this.P[2][0] -= k2Lat * this.P[0][0];
    this.P[2][2] -= k2Lat * this.P[0][2];

    this.P[1][1] *= (1 - k1Lng);
    this.P[1][3] *= (1 - k1Lng);
    this.P[3][1] -= k3Lng * this.P[1][1];
    this.P[3][3] -= k3Lng * this.P[1][3];

    return this.getState(timestampMs);
  }

  /**
   * Dead Reckoning: Projects position forward when GPS signal is temporarily lost.
   * Propagates state using last estimated velocity vector and increases covariance.
   */
  public predictDeadReckoning(durationSeconds: number): KalmanState {
    this.predict(durationSeconds);
    this.lastTimestampMs += durationSeconds * 1000;
    return this.getState(this.lastTimestampMs);
  }

  /**
   * Returns current estimated state including speed (km/h) and heading degrees.
   */
  public getState(timestampMs: number = this.lastTimestampMs): KalmanState {
    const lat = this.x[0];
    const lng = this.x[1];
    const vLat = this.x[2];
    const vLng = this.x[3];

    const mDegLat = ExtendedKalmanFilter.METERS_PER_DEG_LAT;
    const mDegLng = this.metersPerDegLng(lat);

    // Convert vLat and vLng to meters per second
    const vY = vLat * mDegLat;
    const vX = vLng * mDegLng;

    const speedMps = Math.sqrt(vX * vX + vY * vY);
    const speedKmh = parseFloat((speedMps * 3.6).toFixed(1));

    // Heading calculation (clockwise from North 0 deg)
    let headingDegrees = Math.round((Math.atan2(vX, vY) * 180) / Math.PI);
    if (headingDegrees < 0) headingDegrees += 360;

    // Estimate position uncertainty from covariance trace in meters
    const stdLatM = Math.sqrt(Math.max(0, this.P[0][0])) * mDegLat;
    const stdLngM = Math.sqrt(Math.max(0, this.P[1][1])) * mDegLng;
    const accuracyMeters = parseFloat(Math.sqrt(stdLatM * stdLatM + stdLngM * stdLngM).toFixed(1));

    return {
      lat,
      lng,
      vLat,
      vLng,
      speedKmh,
      headingDegrees,
      accuracyMeters: Math.max(1.0, accuracyMeters),
      timestampMs,
    };
  }
}
