export async function getWeather({ city, dates }) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return mockWeather(city, dates);
  }

  const geoUrl = new URL("https://api.openweathermap.org/geo/1.0/direct");
  geoUrl.searchParams.set("q", city);
  geoUrl.searchParams.set("limit", "1");
  geoUrl.searchParams.set("appid", apiKey);

  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) {
    throw new Error(`OpenWeather geocoding request failed: ${geoResponse.status}`);
  }

  const [location] = await geoResponse.json();

  if (!location?.lat || !location?.lon) {
    throw new Error(`OpenWeather could not locate ${city}.`);
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", location.lat);
  url.searchParams.set("lon", location.lon);
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenWeather request failed: ${response.status}`);
  }

  const data = await response.json();
  const samples = data.list?.slice(0, 8).map((item) => ({
    time: item.dt_txt,
    tempC: Math.round(item.main?.temp),
    condition: item.weather?.[0]?.description ?? "unknown",
    rainChance: item.pop ?? 0,
  })) ?? [];

  const temps = samples.map((sample) => sample.tempC).filter(Number.isFinite);
  const low = temps.length ? Math.min(...temps) : null;
  const high = temps.length ? Math.max(...temps) : null;
  const conditions = [...new Set(samples.map((sample) => sample.condition))].slice(0, 3);

  return {
    source: "OpenWeather 5 Day / 3 Hour Forecast",
    city: data.city?.name ?? city,
    coordinates: {
      lat: location.lat,
      lon: location.lon,
    },
    dates,
    summary: `${data.city?.name ?? city} forecast: ${low}-${high} C, ${conditions.join(", ")}.`,
    samples,
  };
}

function mockWeather(city = "destination", dates = "flexible dates") {
  return {
    source: "Mock weather fallback",
    city,
    dates,
    summary: `${city} has warm, travel-friendly demo weather for ${dates}. Add OPENWEATHER_API_KEY for live data.`,
    samples: [
      { time: "Day 1 morning", tempC: 29, condition: "partly cloudy", rainChance: 0.15 },
      { time: "Day 1 evening", tempC: 26, condition: "clear", rainChance: 0.05 },
      { time: "Day 2 afternoon", tempC: 31, condition: "humid", rainChance: 0.2 },
    ],
  };
}
