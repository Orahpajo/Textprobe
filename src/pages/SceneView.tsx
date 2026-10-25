import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import ScenePreview from '../components/ScenePreview'
import { getScene, type Scene } from '../api/scenes'
import { loadSceneStats } from '../api/progress'
import { isOwnLine, parseScene, roleId as toRoleId } from '../lib/parser'
import { difficultyLevel, type LineStat } from '../lib/difficulty'
import { plural } from '../lib/plural'

export default function SceneView() {
  const { id } = useParams<{ id: string }>()
  const [scene, setScene] = useState<Scene | null>(null)
  const [stats, setStats] = useState<Map<string, Map<string, LineStat>>>(new Map())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getScene(id), loadSceneStats(id)])
      .then(([s, st]) => {
        setScene(s)
        setStats(st)
      })
      .catch((e) => setError(e.message))
  }, [id])

  const parsed = useMemo(() => (scene ? parseScene(scene.markdown) : null), [scene])

  if (error) return <Layout back={{ to: '/', label: 'Szenen' }}><p className="error">{error}</p></Layout>
  if (!scene || !parsed) return <Layout back={{ to: '/', label: 'Szenen' }}><p className="muted">Lade …</p></Layout>

  return (
    <Layout
      back={{ to: '/', label: 'Szenen' }}
      title={scene.title}
      actions={
        <Link className="btn ghost" to={`/szene/${scene.id}/bearbeiten`}>
          Text bearbeiten
        </Link>
      }
    >
      <h1 className="page-title">Wessen Text willst du lernen?</h1>
      <ul className="role-cards">
        {parsed.roles.map((role) => {
          const roleStats = stats.get(role.id)
          const own = parsed.items.filter((item) => isOwnLine(item, role.id))
          const geübt = own.filter((item) => (roleStats?.get(item.key)?.seen ?? 0) > 0).length
          const sitzt = own.filter((item) => difficultyLevel(roleStats?.get(item.key)) === 'sitzt').length
          const schwer = own.filter((item) =>
            ['hart', 'wackelig'].includes(difficultyLevel(roleStats?.get(item.key))),
          ).length
          const pct = own.length ? Math.round((sitzt / own.length) * 100) : 0
          return (
            <li key={role.id}>
              <Link className="role-card" to={`/szene/${scene.id}/lernen/${encodeURIComponent(role.id)}`}>
                <div className="role-head">
                  <h2>{role.name}</h2>
                  <span className="muted small">
                    {plural(role.lineCount, 'Replik', 'Repliken')} · {role.wordCount} Wörter
                  </span>
                </div>
                <div className="bar" aria-label={`${pct}% sitzen`}>
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="role-meta muted small">
                  {geübt === 0 ? (
                    'noch nicht geübt'
                  ) : (
                    <>
                      {pct}% sitzen · {plural(schwer, 'schwierige Stelle', 'schwierige Stellen')}
                    </>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <details className="details">
        <summary>Ganze Szene ansehen</summary>
        <ScenePreview items={parsed.items} highlightRole={parsed.roles[0] ? toRoleId(parsed.roles[0].name) : null} />
      </details>
    </Layout>
  )
}
