import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { Inline } from '../components/Markdown'
import { getScene, type Scene } from '../api/scenes'
import { loadCursor, loadStats, recordResult, resetProgress, saveCursor } from '../api/progress'
import { isOwnLine, parseScene, type SceneItem } from '../lib/parser'
import { HINT_STAGES, MAX_HINT } from '../lib/hint'
import { LEVEL_LABEL, difficultyLevel, difficultyScore, type LineStat } from '../lib/difficulty'

type Mode = 'szene' | 'schwierig'

export default function Study() {
  const { id, roleId: rawRoleId } = useParams<{ id: string; roleId: string }>()
  const roleId = decodeURIComponent(rawRoleId ?? '')

  const [scene, setScene] = useState<Scene | null>(null)
  const [stats, setStats] = useState<Map<string, LineStat>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('szene')
  const [cursor, setCursor] = useState(0)
  const [hint, setHint] = useState(0)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => (scene ? parseScene(scene.markdown) : null), [scene])
  const items = parsed?.items ?? []

  /** Haltepunkte: alle Item-Indizes, an denen die eigene Rolle spricht. */
  const allStops = useMemo(
    () => items.map((item, i) => ({ item, i })).filter(({ item }) => isOwnLine(item, roleId)),
    [items, roleId],
  )

  const stops = useMemo(() => {
    if (mode === 'szene') return allStops
    return allStops
      .filter(({ item }) => ['hart', 'wackelig', 'neu'].includes(difficultyLevel(stats.get(item.key))))
      .sort((a, b) => difficultyScore(stats.get(b.item.key)) - difficultyScore(stats.get(a.item.key)))
  }, [allStops, mode, stats])

  useEffect(() => {
    if (!id) return
    Promise.all([getScene(id), loadStats(id, roleId), loadCursor(id, roleId)])
      .then(([s, st, savedIndex]) => {
        setScene(s)
        setStats(st)
        const parsedScene = parseScene(s.markdown)
        const own = parsedScene.items
          .map((item, i) => ({ item, i }))
          .filter(({ item }) => isOwnLine(item, roleId))
        const start = own.findIndex(({ i }) => i >= savedIndex)
        setCursor(start < 0 ? 0 : start)
      })
      .catch((e) => setError(e.message))
  }, [id, roleId])

  const current = stops[cursor]

  // Position merken, damit man später weitermachen kann (nur im Szenenmodus).
  useEffect(() => {
    if (!id || !current || mode !== 'szene') return
    const timer = setTimeout(() => {
      saveCursor(id, roleId, current.i).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [id, roleId, current, mode])

  useEffect(() => {
    setHint(0)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [cursor, mode])

  const isRevealed = current ? revealed.has(current.item.key) : false

  const reveal = useCallback(() => {
    if (!current) return
    setRevealed((prev) => new Set(prev).add(current.item.key))
  }, [current])

  /** Neuer Durchgang: Zeiger an den Anfang, alles wieder verdeckt. */
  const restart = useCallback((nextMode?: Mode) => {
    if (nextMode) setMode(nextMode)
    setCursor(0)
    setRevealed(new Set())
    setHint(0)
    setDone(false)
  }, [])

  const go = useCallback(
    (delta: number) => {
      setDone(false)
      setCursor((prev) => {
        const next = prev + delta
        if (next < 0) return 0
        if (next >= stops.length) {
          setDone(true)
          return prev
        }
        return next
      })
    },
    [stops.length],
  )

  const rate = useCallback(
    async (known: boolean) => {
      if (!id || !current) return
      reveal()
      const key = current.item.key
      // Optimistisch anzeigen, danach den Serverwert übernehmen.
      setStats((prev) => {
        const next = new Map(prev)
        const old = prev.get(key)
        next.set(key, {
          lineKey: key,
          seen: (old?.seen ?? 0) + 1,
          known: (old?.known ?? 0) + (known ? 1 : 0),
          forgotten: (old?.forgotten ?? 0) + (known ? 0 : 1),
          streak: known ? (old?.streak ?? 0) + 1 : 0,
          lastResult: known ? 'known' : 'forgot',
          lastReviewedAt: new Date().toISOString(),
        })
        return next
      })
      const isLast = cursor >= stops.length - 1
      if (isLast) setDone(true)
      else setTimeout(() => setCursor((c) => c + 1), known ? 250 : 700)
      try {
        const fresh = await recordResult(id, roleId, key, known)
        setStats((prev) => new Map(prev).set(key, fresh))
      } catch (e) {
        setError((e as Error).message)
      }
    },
    [id, roleId, current, cursor, stops.length, reveal],
  )

  // Tastatursteuerung fürs Spulen und Bewerten.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          go(1)
          break
        case 'ArrowLeft':
          event.preventDefault()
          go(-1)
          break
        case ' ':
        case 'Enter':
          event.preventDefault()
          if (!isRevealed) reveal()
          break
        case 'h':
          setHint((h) => Math.min(MAX_HINT, h + 1))
          break
        case 'g':
          rate(true)
          break
        case 'v':
          rate(false)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, rate, reveal, isRevealed])

  if (error) return <Wrap sceneId={id}><p className="error">{error}</p></Wrap>
  if (!scene || !parsed) return <Wrap sceneId={id}><p className="muted">Lade …</p></Wrap>

  if (allStops.length === 0) {
    return (
      <Wrap sceneId={id} title={scene.title}>
        <p className="notice">
          In dieser Szene spricht <strong>{roleId}</strong> nicht. Wähle eine andere Rolle.
        </p>
      </Wrap>
    )
  }

  if (stops.length === 0) {
    return (
      <Wrap sceneId={id} title={scene.title}>
        <p className="notice">Keine schwierigen Stellen mehr – alles sitzt.</p>
        <button className="btn primary" onClick={() => restart('szene')}>
          Ganze Szene üben
        </button>
      </Wrap>
    )
  }

  const visible: SceneItem[] =
    mode === 'szene'
      ? items.slice(0, (current?.i ?? 0) + 1)
      : items.slice(Math.max(0, (current?.i ?? 0) - 2), (current?.i ?? 0) + 1)

  const stat = current ? stats.get(current.item.key) : undefined
  const level = difficultyLevel(stat)

  return (
    <Wrap
      sceneId={id}
      title={`${scene.title} · ${roleId}`}
      actions={
        <div className="segmented">
          <button className={mode === 'szene' ? 'on' : ''} onClick={() => restart('szene')}>
            Szene
          </button>
          <button
            className={mode === 'schwierig' ? 'on' : ''}
            onClick={() => restart('schwierig')}
          >
            Schwierige Stellen
          </button>
        </div>
      }
    >
      <div className="study">
        <div className="script-pane" ref={scrollRef}>
          {visible.map((item, idx) => {
            const isCurrent = idx === visible.length - 1
            if (item.kind === 'stage')
              return (
                <p key={item.key} className="stage">
                  <Inline text={item.text} />
                </p>
              )
            if (item.kind === 'text')
              return (
                <p key={item.key} className="plain">
                  <Inline text={item.text} />
                </p>
              )

            const own = isOwnLine(item, roleId)
            const shown = !own || revealed.has(item.key)
            return (
              <div key={item.key} className={`line${own ? ' own' : ''}${isCurrent ? ' current' : ''}`}>
                <span className="speaker">{item.speaker}:</span>
                <div className="line-text">
                  {shown ? (
                    <Inline text={item.text} />
                  ) : (
                    <p className="masked">{HINT_STAGES[isCurrent ? hint : 0].render(item.text)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="controls">
          {done ? (
            <div className="done">
              <strong>Durch!</strong>
              <div className="row">
                <button className="btn" onClick={() => restart()}>
                  Von vorn
                </button>
                <button className="btn primary" onClick={() => restart('schwierig')}>
                  Schwierige Stellen üben
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="status-row">
                <span className={`badge level-${level}`}>{LEVEL_LABEL[level]}</span>
                {stat && stat.seen > 0 && (
                  <span className="muted small">
                    {stat.known}× gewusst · {stat.forgotten}× vergessen
                  </span>
                )}
              </div>

              {isRevealed ? (
                <div className="row">
                  <button className="btn forgot block" onClick={() => rate(false)}>
                    Vergessen
                  </button>
                  <button className="btn known block" onClick={() => rate(true)}>
                    Gewusst
                  </button>
                </div>
              ) : (
                <div className="row">
                  <button
                    className="btn block"
                    disabled={hint >= MAX_HINT}
                    onClick={() => setHint((h) => Math.min(MAX_HINT, h + 1))}
                  >
                    Tipp {hint > 0 && `(${HINT_STAGES[hint].label})`}
                  </button>
                  <button className="btn primary block" onClick={reveal}>
                    Aufdecken
                  </button>
                </div>
              )}
            </>
          )}

          <div className="scrub">
            <button className="btn ghost" onClick={() => go(-1)} disabled={cursor === 0} aria-label="Zurückspulen">
              ◀
            </button>
            <input
              className="range"
              type="range"
              min={0}
              max={Math.max(0, stops.length - 1)}
              value={cursor}
              onChange={(e) => { setDone(false); setCursor(Number(e.target.value)) }}
              aria-label="Position in der Szene"
            />
            <button
              className="btn ghost"
              onClick={() => go(1)}
              disabled={cursor >= stops.length - 1}
              aria-label="Vorspulen"
            >
              ▶
            </button>
            <span className="muted small counter">
              {cursor + 1}/{stops.length}
            </span>
          </div>

          <div className="hints muted small">
            ← → spulen · Leertaste aufdecken · H Tipp · G gewusst · V vergessen
            <button
              className="btn ghost danger small-btn"
              onClick={async () => {
                if (!id || !confirm(`Fortschritt für ${roleId} zurücksetzen?`)) return
                await resetProgress(id, roleId)
                setStats(new Map())
                setRevealed(new Set())
              }}
            >
              Fortschritt zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </Wrap>
  )
}

function Wrap({
  sceneId,
  title,
  actions,
  children,
}: {
  sceneId?: string
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Layout back={{ to: sceneId ? `/szene/${sceneId}` : '/', label: 'Rollen' }} title={title} actions={actions}>
      {children}
    </Layout>
  )
}
