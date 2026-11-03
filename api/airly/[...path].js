// Vercel serverless function: forwards /api/airly/* to the Airly API and adds the secret key.
// Set AIRLY_API_KEY in Vercel -> Project Settings -> Environment Variables.

const INSTALLATION_ID = String(process.env.VITE_AIRLY_INSTALLATION_ID || "123514")

export default async function handler(req, res) {
  const { path, ...query } = req.query
  const route = (Array.isArray(path) ? path : [path]).join("/")

  // Only allow the two calls the dashboard needs, and only for your own station,
  // so nobody can use your key to query arbitrary endpoints.
  const isMeasurements =
    route === "v2/measurements/installation" && String(query.installationId) === INSTALLATION_ID
  const isInstallation = route === `v2/installations/${INSTALLATION_ID}`
  if (!isMeasurements && !isInstallation) {
    return res.status(404).json({ error: "Not allowed" })
  }

  if (!process.env.AIRLY_API_KEY) {
    return res.status(500).json({ error: "AIRLY_API_KEY is not set on the server" })
  }

  const qs = new URLSearchParams(query).toString()
  const upstream = await fetch(`https://airapi.airly.eu/${route}${qs ? `?${qs}` : ""}`, {
    headers: { apikey: process.env.AIRLY_API_KEY, Accept: "application/json" },
  })

  // Cache at Vercel's edge: all visitors share one upstream request per 5 min,
  // which keeps you well inside the free Airly request limit.
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
  res.setHeader("Content-Type", "application/json")
  res.status(upstream.status).send(await upstream.text())
}