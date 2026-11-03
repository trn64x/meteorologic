export const INSTALLATION_ID = Number(import.meta.env.VITE_AIRLY_INSTALLATION_ID) || 123514
export const REFRESH_MS = 30 * 60 * 1000 // free plan has a small daily request limit

async function getJson(path, signal) {
  const res = await fetch(`airly${path}`, { signal })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403)
      throw new Error("Airly rejected the API key. Check AIRLY_API_KEY in .env.local and restart Vite.")
    if (res.status === 429)
      throw new Error("Airly request limit reached. The dashboard will retry on the next refresh.")
    throw new Error(`Airly request failed (${res.status}).`)
  }
  return res.json()
}

export const getMeasurements = (signal) =>
  getJson(`/v2/measurements/installation?installationId=${INSTALLATION_ID}&includeWind=true`, signal)

export const getInstallation = (signal) => getJson(`/v2/installations/${INSTALLATION_ID}`, signal)

export const valueOf = (entry, name) => entry?.values?.find((v) => v.name === name)?.value

export const METRICS = {
  CAQI: { label: "CAQI", unit: "", digits: 0 },
  TEMPERATURE: { label: "Temperature", unit: "°C", digits: 1 },
  HUMIDITY: { label: "Humidity", unit: "%", digits: 0 },
  PRESSURE: { label: "Pressure", unit: "hPa", digits: 0 },
  WIND_SPEED: { label: "Wind", unit: "m/s", digits: 1 },
  PM1: { label: "PM1", unit: "µg/m³", digits: 1 },
  PM25: { label: "PM2.5", unit: "µg/m³", digits: 1 },
  PM10: { label: "PM10", unit: "µg/m³", digits: 1 },
  NO2: { label: "NO₂", unit: "µg/m³", digits: 1 },
  O3: { label: "O₃", unit: "µg/m³", digits: 1 },
  SO2: { label: "SO₂", unit: "µg/m³", digits: 1 },
  CO: { label: "CO", unit: "µg/m³", digits: 0 },
}

export const compass = (deg) =>
  ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][
    Math.round(deg / 22.5) % 16
  ]