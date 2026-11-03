import { useCallback, useEffect, useState } from "react"
import { getInstallation, getMeasurements, REFRESH_MS } from "@/airly"

export function useAirly(intervalMs = REFRESH_MS) {
  const [data, setData] = useState(null)
  const [installation, setInstallation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [nextAt, setNextAt] = useState(() => Date.now() + intervalMs)
  const [reloadKey, setReloadKey] = useState(0)

  // Installation details (address, elevation) rarely change: fetch once.
  useEffect(() => {
    const ctrl = new AbortController()
    getInstallation(ctrl.signal).then(setInstallation).catch(() => {})
    return () => ctrl.abort()
  }, [])

  // Poll loop. Changing `reloadKey` restarts it, which is how manual refresh works.
  useEffect(() => {
    const ctrl = new AbortController()
    let timer

    const tick = async () => {
      setRefreshing(true)
      try {
        const m = await getMeasurements(ctrl.signal)
        setData(m)
        setError(null)
        setUpdatedAt(new Date())
      } catch (e) {
        if (e.name === "AbortError") return
        setError(e.message)
      }
      if (ctrl.signal.aborted) return
      setRefreshing(false)
      setLoading(false)
      setNextAt(Date.now() + intervalMs)
      timer = setTimeout(tick, intervalMs)
    }
    tick()

    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [intervalMs, reloadKey])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  return { data, installation, error, loading, refreshing, updatedAt, nextAt, refresh }
}