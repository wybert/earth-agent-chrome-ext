import { createAITools } from './ai-tools';
import fetchMock from 'jest-fetch-mock';

describe('weatherTool', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns weather data from Open-Meteo', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        results: [{ latitude: 40.71, longitude: -74.01, name: 'New York', country_code: 'US' }],
      })
    );
    fetchMock.mockResponseOnce(
      JSON.stringify({
        current_weather: {
          temperature: 20,
          windspeed: 5,
          winddirection: 180,
          weathercode: 1,
          is_day: 1,
          time: '2024-01-01T00:00:00Z',
        },
      })
    );

    const { weatherTool } = createAITools();
    const result = await (weatherTool as any).execute({ location: 'New York' });

    expect(result.location).toContain('New York');
    expect(result.current.temperatureC).toBe(20);
    expect(result.current.temperatureF).toBe(68);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns error when location not found', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ results: [] }));

    const { weatherTool } = createAITools();
    const result = await (weatherTool as any).execute({ location: 'NowhereLand' });

    expect((result as any).error).toMatch(/Could not find location/i);
  });
});
