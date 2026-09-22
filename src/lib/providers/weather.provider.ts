import { Coordinates, WeatherObservation, WeatherProvider } from '@/lib/providers/types';
import { getEnv } from '@/lib/env';

interface CachedWeather {
  observation: WeatherObservation;
  expiresAt: number;
}

const weatherCache = new Map<string, CachedWeather>();

export class OpenMeteoWeatherProvider implements WeatherProvider {
  async getWeather(lat: number, lng: number): Promise<WeatherObservation> {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const now = Date.now();

    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.observation;
    }

    const env = getEnv();
    if (env.WEATHER_PROVIDER === 'open-meteo') {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', lat.toFixed(4));
        url.searchParams.set('longitude', lng.toFixed(4));
        url.searchParams.set(
          'current',
          'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m'
        );
        url.searchParams.set('timezone', 'Asia/Kolkata');

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          const current = data.current;

          const temp = current?.temperature_2m ?? 24;
          const rain = current?.rain ?? current?.precipitation ?? 0;
          const wind = current?.wind_speed_10m ?? 8;
          const code = current?.weather_code ?? 0;

          const condition = this.mapWmoCode(code);
          const isSevere = rain > 15.0 || wind > 55.0 || [65, 67, 82, 95, 96, 99].includes(code);

          const observation: WeatherObservation = {
            lat,
            lng,
            temperatureC: Math.round(temp * 10) / 10,
            rainfallMm1h: Math.round(rain * 10) / 10,
            rainfallMm24h: Math.round(rain * 4.5 * 10) / 10,
            windSpeedKmh: Math.round(wind * 10) / 10,
            visibilityKm: isSevere ? 2.5 : 10.0,
            condition,
            isSevereWarning: isSevere,
            timestamp: current?.time || new Date().toISOString(),
          };

          const ttlMs = (env.WEATHER_STALE_AFTER_SECONDS || 1800) * 1000;
          weatherCache.set(cacheKey, { observation, expiresAt: now + ttlMs });

          return observation;
        }
      } catch (err) {
        console.warn('Open-Meteo weather fetch failed:', err);
      }
    }

    // In production, strictly reject fabricated weather observations
    if (!env.ALLOW_MOCK_PROVIDERS) {
      throw new Error(
        `Weather observation unavailable for coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}). Upstream service is unreachable and mock weather generation is prohibited in production.`
      );
    }

    // Isolated test environment fallback only when ALLOW_MOCK_PROVIDERS=true
    return this.generateFallbackWeather(lat, lng);
  }

  async getWeatherAlongRoute(points: Coordinates[]): Promise<WeatherObservation[]> {
    const env = getEnv();
    // Sample along the route (every ~4th point to avoid rate limiting)
    const step = Math.max(1, Math.floor(points.length / 5));
    const samples: Coordinates[] = [];

    for (let i = 0; i < points.length; i += step) {
      samples.push(points[i]);
    }
    if (points.length > 0 && samples[samples.length - 1] !== points[points.length - 1]) {
      samples.push(points[points.length - 1]);
    }

    const observations = await Promise.all(
      samples.map((point) =>
        this.getWeather(point.lat, point.lng).catch(() => {
          if (env.ALLOW_MOCK_PROVIDERS) {
            return this.generateFallbackWeather(point.lat, point.lng);
          }
          return null;
        })
      )
    );

    return observations.filter((o): o is WeatherObservation => o !== null);
  }

  private mapWmoCode(code: number): string {
    if (code === 0) return 'Clear';
    if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
    if ([45, 48].includes(code)) return 'Dense Fog';
    if ([51, 53, 55].includes(code)) return 'Drizzle';
    if ([61, 63].includes(code)) return 'Moderate Rain';
    if ([65, 67].includes(code)) return 'Heavy Torrential Rain';
    if ([80, 81, 82].includes(code)) return 'Monsoon Downpour';
    if ([95, 96, 99].includes(code)) return 'Severe Thunderstorm';
    return 'Overcast';
  }

  private generateFallbackWeather(lat: number, lng: number): WeatherObservation {
    const isHighAltitude = lat > 26.0;
    return {
      lat,
      lng,
      temperatureC: isHighAltitude ? 14.5 : 26.2,
      rainfallMm1h: isHighAltitude ? 4.2 : 0.8,
      rainfallMm24h: isHighAltitude ? 22.0 : 4.5,
      windSpeedKmh: isHighAltitude ? 18.0 : 9.5,
      visibilityKm: isHighAltitude ? 6.0 : 10.0,
      condition: isHighAltitude ? 'Mountain Mist' : 'Clear Sky',
      isSevereWarning: false,
      timestamp: new Date().toISOString(),
    };
  }
}

let _weatherProvider: WeatherProvider | null = null;

export function getWeatherProvider(): WeatherProvider {
  if (!_weatherProvider) {
    _weatherProvider = new OpenMeteoWeatherProvider();
  }
  return _weatherProvider;
}
