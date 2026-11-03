import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { Droplets, Gauge, MapPin, RefreshCw, TriangleAlert, Wind } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useAirly } from "@/use-airly"
import { compass, INSTALLATION_ID, METRICS, valueOf } from "@/airly"

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

const humanize = (level) => level.replace(/_/g, " ").toLowerCase()

const loadColor = (pct) => (pct < 50 ? "#2f9e6e" : pct <= 100 ? "#d99a1f" : "#d64545")

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = Math.max(0, Math.round((target - now) / 1000))
  return (
    <span className="tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  )
}

function Reading({ icon: Icon, label, value, unit, note }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-1 size-5 text-muted-foreground" aria-hidden />}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-medium tabular-nums">
          {value} <span className="text-base font-normal text-muted-foreground">{unit}</span>
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}

// CAQI lives in `indexes`, everything else in `values`.
const pick = (entry, key) =>
  key === "CAQI" ? (entry.indexes?.[0]?.value ?? undefined) : valueOf(entry, key)

function SeriesCard({ title, description, entries, defaultMetric, withDay = false, emptyText }) {
  const available = useMemo(
    () => Object.keys(METRICS).filter((k) => entries.some((e) => pick(e, k) != null)),
    [entries],
  )
  const [metric, setMetric] = useState(defaultMetric)
  const active = available.includes(metric) ? metric : available[0]

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{emptyText}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const meta = METRICS[active]
  const tick = (v) =>
    new Date(v).toLocaleString(
      [],
      withDay
        ? { weekday: "short", hour: "2-digit", minute: "2-digit" }
        : { hour: "2-digit", minute: "2-digit" },
    )
  const rows = entries.map((e) => ({
    t: e.tillDateTime,
    value: pick(e, active) ?? null,
    color: e.indexes?.[0]?.color,
  }))
  const config = { value: { label: meta.label, color: "var(--chart-1)" } }

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="t" tickLine={false} axisLine={false} minTickGap={36} tickFormatter={tick} />
      <YAxis
        width={44}
        tickLine={false}
        axisLine={false}
        domain={active === "CAQI" ? [0, "auto"] : ["auto", "auto"]}
        tickFormatter={(v) => Number(v).toFixed(meta.digits)}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(_, p) => tick(p?.[0]?.payload?.t)}
            formatter={(v) => `${Number(v).toFixed(meta.digits)} ${meta.unit}`.trim()}
          />
        }
      />
    </>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <Tabs value={active} onValueChange={setMetric} className="overflow-x-auto pt-2">
          <TabsList>
            {available.map((k) => (
              <TabsTrigger key={k} value={k}>
                {METRICS[k].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          {active === "CAQI" ? (
            <BarChart data={rows} margin={{ left: 0, right: 12, top: 8 }}>
              {axes}
              <Bar dataKey="value" radius={2} isAnimationActive={false}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.color ?? "var(--color-value)"} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={rows} margin={{ left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              {axes}
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                fill={`url(#fill-${title})`}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function Loading() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Skeleton className="h-64 lg:col-span-3" />
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-48 lg:col-span-2" />
      <Skeleton className="h-48 lg:col-span-3" />
    </div>
  )
}

export default function App() {
  const { data, installation, error, loading, refreshing, updatedAt, nextAt, refresh } = useAirly()

  const current = data?.current
  const temp = valueOf(current, "TEMPERATURE")
  const humidity = valueOf(current, "HUMIDITY")
  const pressure = valueOf(current, "PRESSURE")
  const windSpeed = valueOf(current, "WIND_SPEED")
  const windBearing = valueOf(current, "WIND_BEARING")
  const pm1 = valueOf(current, "PM1")
  const pm25 = valueOf(current, "PM25")
  const pm10 = valueOf(current, "PM10")
  const hasPm = [pm1, pm25, pm10].some((v) => v !== undefined)
  const hasStandards = current?.standards?.length > 0
  const historyEntries = useMemo(
    () => [...(data?.history ?? []), ...(data?.current ? [data.current] : [])],
    [data],
  )
  const index = current?.indexes?.[0]
  const indexColor = index?.color ?? "var(--muted-foreground)"

  const place =
    installation?.address?.displayAddress1 ??
    installation?.address?.city ??
    `Installation ${INSTALLATION_ID}`
  const street = [installation?.address?.street, installation?.address?.number].filter(Boolean).join(" ")

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{place}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {street && `${street}, `}
            {installation
              ? `${installation.location.latitude.toFixed(4)}, ${installation.location.longitude.toFixed(4)}`
              : "50.6655, 17.8970"}
            {installation?.elevation ? `, ${Math.round(installation.elevation)} m n.p.m.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-muted-foreground">
            {updatedAt && <p>Updated {fmtTime(updatedAt)}</p>}
            <p>
              Next refresh in <Countdown target={nextAt} />
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Could not update measurements</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <Loading />}

      {current && (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Now at the station</CardTitle>
                <CardDescription>
                  Hour {fmtTime(current.fromDateTime)} to {fmtTime(current.tillDateTime)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <p className="flex items-baseline gap-1">
                  <span className="text-8xl font-light leading-none tracking-tighter tabular-nums">
                    {temp !== undefined ? temp.toFixed(1) : "–"}
                  </span>
                  <span className="text-3xl text-muted-foreground">°C</span>
                </p>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  {humidity !== undefined && (
                    <Reading icon={Droplets} label="Humidity" value={humidity.toFixed(0)} unit="%" />
                  )}
                  {pressure !== undefined && (
                    <Reading icon={Gauge} label="Pressure" value={pressure.toFixed(0)} unit="hPa" />
                  )}
                  {windSpeed !== undefined && (
                    <Reading
                      icon={Wind}
                      label="Wind"
                      value={windSpeed.toFixed(1)}
                      unit="m/s"
                      note={windBearing !== undefined ? `from ${compass(windBearing)}` : undefined}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2" style={{ borderTop: `4px solid ${indexColor}` }}>
              <CardHeader>
                <CardTitle>Air quality</CardTitle>
                <CardDescription>{index?.name?.replace("_", " ") ?? "Index"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {index ? (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-6xl font-light leading-none tabular-nums">
                        {index.value !== null ? Math.round(index.value) : "–"}
                      </span>
                      <Badge style={{ backgroundColor: indexColor, color: "#111" }} className="capitalize">
                        {humanize(index.level)}
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(index.value ?? 0, 100)}
                      style={{ "--c": indexColor }}
                      className="[&_[data-slot=progress-indicator]]:bg-[var(--c)]"
                    />
                    <p className="text-sm">{index.description}</p>
                    <p className="text-sm text-muted-foreground">{index.advice}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">This station reports no air quality index.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {(hasPm || hasStandards) && (
            <div className="grid gap-4 lg:grid-cols-5">
              {hasPm && (
                <Card className={hasStandards ? "lg:col-span-2" : "lg:col-span-5"}>
                  <CardHeader>
                    <CardTitle>Particulate matter</CardTitle>
                    <CardDescription>Dust concentration in the current hour</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    {[
                      ["PM1", pm1],
                      ["PM2.5", pm25],
                      ["PM10", pm10],
                    ].map(([label, v]) => (
                      <Reading
                        key={label}
                        label={label}
                        value={v !== undefined ? v.toFixed(1) : "–"}
                        unit="µg/m³"
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {hasStandards && (
                <Card className={hasPm ? "lg:col-span-3" : "lg:col-span-5"}>
                  <CardHeader>
                    <CardTitle>Share of WHO limits</CardTitle>
                    <CardDescription>Over 100% means the recommended limit is exceeded</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 sm:grid-cols-2">
                    {current.standards.map((s) => (
                      <div key={s.pollutant + s.averaging} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {METRICS[s.pollutant]?.label ?? s.pollutant}
                            <span className="ml-2 font-normal text-muted-foreground">
                              limit {s.limit} µg/m³, {s.averaging.toLowerCase()} avg
                            </span>
                          </span>
                          <span className="tabular-nums">{Math.round(s.percent)}%</span>
                        </div>
                        <Progress
                          value={Math.min(s.percent, 100)}
                          style={{ "--c": loadColor(s.percent) }}
                          className="[&_[data-slot=progress-indicator]]:bg-[var(--c)]"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <SeriesCard
            title="Forecast"
            description="Hourly forecast from Airly"
            entries={data.forecast ?? []}
            defaultMetric="CAQI"
            withDay
            emptyText="Airly has no forecast for this station right now."
          />

          <SeriesCard
            title="Last 24 hours"
            description="Hourly averages from the station"
            entries={historyEntries}
            defaultMetric="TEMPERATURE"
          />
        </>
      )}

      <footer className="pt-2 text-xs text-muted-foreground">
        Data from the Airly sensor network, installation {INSTALLATION_ID}.
      </footer>
    </main>
  )
}