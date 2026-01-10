import { createResilientFetch } from '../../utils';

const weatherFetch = createResilientFetch({
  label: 'WeatherTool',
  maxAttempts: 3,
  baseDelayMs: 400,
});

export interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  country: string;
  current: {
    temperatureC: number;
    temperatureF: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
    time: string;
  };
  source: string;
}

export async function getWeather(location: string): Promise<WeatherData | { error: string }> {
  try {
    const geoRes = await weatherFetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) {
      return { error: `Geocoding failed with status ${geoRes.status}` };
    }
    const geoData = await geoRes.json();
    if (!geoData?.results?.length) {
      return { error: `Could not find location: "${location}"` };
    }

    const place = geoData.results[0];
    const { latitude, longitude, name, country_code } = place;
    const resolvedName = [name, country_code].filter(Boolean).join(', ');

    const weatherRes = await weatherFetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!weatherRes.ok) {
      return { error: `Weather lookup failed with status ${weatherRes.status}` };
    }
    const weatherData = await weatherRes.json();
    const current = weatherData?.current_weather;
    if (!current) {
      return { error: 'Weather data unavailable for this location' };
    }

    return {
      location: resolvedName || location,
      latitude,
      longitude,
      country: country_code,
      current: {
        temperatureC: current.temperature,
        temperatureF: Math.round((current.temperature * 9) / 5 + 32),
        windSpeed: current.windspeed,
        windDirection: current.winddirection,
        weatherCode: current.weathercode,
        isDay: current.is_day === 1,
        time: current.time,
      },
      source: 'open-meteo',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { error: `Weather lookup failed: ${errMsg}` };
  }
}
