// Vercel serverless function: forwards /api/airly/* to the Airly API and adds the secret key.
// Needs AIRLY_API_KEY in Vercel -> Project Settings -> Environment Variables.

// "123514", "i123514" and " 123514 " all work here.
const INSTALLATION_ID = String(process.env.VITE_AIRLY_INSTALLATION_ID || "123514").replace(/\D/g, "")

export default async function handler(req, res) {
  // Read the route straight from the URL (more robust than req.query.path).
  const url = new URL(req.url, "http://localhost")
  const route = url.pathname.replace(/^\/api\/airly\/?/, "").replace(/\/+$/, "")
  const id = url.searchParams.get("installationId")

  // Only allow the two calls the dashboard needs, and only for your own station.
  const isMeasurements = route === "v2/measurements/installation" && id === INSTALLATION_ID
  const isInstallation = route === `v2/installations/${INSTALLATION_ID}`
  if (!isMeasurements && !isInstallation) {
    return res.status(404).json({ error: "Not allowed", route, installationId: id, expected: INSTALLATION_ID })
  }

  if (!process.env.AIRLY_API_KEY) {
    return res.status(500).json({ error: "AIRLY_API_KEY is not set on the server" })
  }

  const qs = url.searchParams.toString()
  try {
    const upstream = await fetch(`https://airapi.airly.eu/${route}${qs ? `?${qs}` : ""}`, {
      headers: { apikey: process.env.AIRLY_API_KEY, Accept: "application/json" },
    })

    // Cache at Vercel's edge so all visitors share one upstream request per 5 min.
    if (upstream.ok) res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    res.setHeader("Content-Type", "application/json")
    res.status(upstream.status).send(await upstream.text())
  } catch (e) {
    res.status(502).json({ error: "Could not reach Airly", detail: String(e) })
  }
}