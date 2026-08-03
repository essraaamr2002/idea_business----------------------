import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { recordWeb4Activation, verifyWeb4Activation } from '@/lib/web4.functions'

type PermState = 'unknown' | 'granted' | 'denied' | 'prompt'

export interface Web4Verification {
  verified: boolean
  server: { activated: boolean; mic: boolean; geo: boolean; updated_at: string | null }
  client: { mic: PermState; geo: PermState; broadcast: boolean }
}

export interface Web4State {
  activated: boolean
  mic: PermState
  geo: PermState
  coords: { lat: number; lng: number; accuracy: number } | null
  broadcastOk: boolean
  lastError: string | null
  lastVerification: Web4Verification | null
  requestAll: () => Promise<{ mic: PermState; geo: PermState; outcome: 'accepted' | 'denied' | 'partial' | 'error' }>
  verify: () => Promise<Web4Verification | null>
  reset: () => void
}

const Ctx = createContext<Web4State | null>(null)

export function useWeb4(): Web4State {
  const v = useContext(Ctx)
  if (!v) throw new Error('Web4Provider missing')
  return v
}

const LS_KEY = 'web4.activated.v1'
const AGENTS_CHANNEL = 'web4.agents.v1'
const AGENT_IDS = ['commander', 'developer', 'designer', 'researcher', 'writer', 'analyst'] as const

/** يبثّ الحالة لجميع الوكلاء الستة عبر BroadcastChannel + CustomEvent، ويرجّع نجاح الإرسال. */
function broadcastToAgents(payload: unknown): boolean {
  if (typeof window === 'undefined') return false
  let ok = false
  try {
    const bc = new BroadcastChannel(AGENTS_CHANNEL)
    for (const id of AGENT_IDS) bc.postMessage({ agent: id, payload })
    bc.close()
    ok = true
  } catch { /* Safari/old browsers */ }
  try {
    window.dispatchEvent(new CustomEvent('web4:agents', { detail: { agents: AGENT_IDS, payload } }))
    ok = true
  } catch { /* ignore */ }
  return ok
}

export function Web4Provider({ children }: { children: ReactNode }) {
  const [activated, setActivated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(LS_KEY) === '1'
  })
  const [mic, setMic] = useState<PermState>('unknown')
  const [geo, setGeo] = useState<PermState>('unknown')
  const [coords, setCoords] = useState<Web4State['coords']>(null)
  const [broadcastOk, setBroadcastOk] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastVerification, setLastVerification] = useState<Web4Verification | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return
    navigator.permissions.query({ name: 'microphone' as PermissionName }).then((s) => {
      setMic(s.state as PermState)
      s.onchange = () => setMic(s.state as PermState)
    }).catch(() => {})
    navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((s) => {
      setGeo(s.state as PermState)
      s.onchange = () => setGeo(s.state as PermState)
    }).catch(() => {})
  }, [])

  const requestAll = useCallback(async () => {
    let micState: PermState = mic
    let geoState: PermState = geo
    let lat: number | null = null, lng: number | null = null, acc: number | null = null
    let errMsg: string | null = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micState = 'granted'
      stream.getTracks().forEach((t) => t.stop())
    } catch (e: any) { micState = 'denied'; errMsg = errMsg ?? `mic: ${e?.name ?? 'denied'}` }

    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 })
      })
      geoState = 'granted'
      lat = pos.coords.latitude; lng = pos.coords.longitude; acc = pos.coords.accuracy
      setCoords({ lat, lng, accuracy: acc })
    } catch (e: any) { geoState = 'denied'; errMsg = `${errMsg ? errMsg + ' | ' : ''}geo: ${e?.code ?? 'denied'}` }

    setMic(micState); setGeo(geoState); setLastError(errMsg)

    const fullOk = micState === 'granted' && geoState === 'granted'
    const outcome: 'accepted' | 'denied' | 'partial' | 'error' =
      fullOk ? 'accepted' : (micState === 'denied' && geoState === 'denied') ? 'denied' : 'partial'

    // Fallback rule: 14D reality requires BOTH mic + geo. Otherwise, do NOT activate.
    let broadcasted = false
    if (fullOk) {
      broadcasted = broadcastToAgents({ activated: true, mic: micState, geo: geoState, coords: { lat, lng, accuracy: acc }, reality_dim: 14, at: Date.now() })
      setActivated(true)
      try { window.localStorage.setItem(LS_KEY, '1') } catch { /* ignore */ }
    } else {
      setActivated(false)
      try { window.localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    }
    setBroadcastOk(broadcasted)

    try {
      await recordWeb4Activation({ data: {
        mic_granted: micState === 'granted',
        geo_granted: geoState === 'granted',
        reality_dim: 14,
        last_lat: lat, last_lng: lng, last_accuracy_m: acc,
        user_agent: navigator.userAgent.slice(0, 500),
        mic_state: micState, geo_state: geoState,
        outcome, broadcast_agents: broadcasted,
        error_message: errMsg,
      }})
    } catch { /* not signed in */ }

    return { mic: micState, geo: geoState, outcome }
  }, [mic, geo])

  const verify = useCallback(async () => {
    try {
      const res = await verifyWeb4Activation({ data: { mic_state: mic, geo_state: geo, broadcast_ok: broadcastOk } })
      setLastVerification(res as Web4Verification)
      return res as Web4Verification
    } catch { return null }
  }, [mic, geo, broadcastOk])

  const reset = useCallback(() => {
    setActivated(false); setCoords(null); setBroadcastOk(false); setLastError(null); setLastVerification(null)
    try { window.localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  }, [])

  return (
    <Ctx.Provider value={{ activated, mic, geo, coords, broadcastOk, lastError, lastVerification, requestAll, verify, reset }}>
      {children}
    </Ctx.Provider>
  )
}
