import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { deleteScene, listScenes, type Scene } from '../api/scenes'
import { parseScene } from '../lib/parser'
import { plural } from '../lib/plural'

export default function Library() {
  const [scenes, setScenes] = useState<Scene[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    listScenes()
      .then(setScenes)
      .catch((e) => setError(e.message))
  }, [])

  async function remove(scene: Scene) {
    if (!confirm(`„${scene.title}“ mit allem Lernfortschritt löschen?`)) return
    await deleteScene(scene.id)
    setScenes((prev) => (prev ?? []).filter((s) => s.id !== scene.id))
  }

  return (
    <Layout actions={<button className="btn primary" onClick={() => navigate('/neu')}>Szene einlesen</button>}>
      <h1 className="page-title">Meine Szenen</h1>
      {error && <p className="error">{error}</p>}
      {!scenes && !error && <p className="muted">Lade …</p>}
      {scenes?.length === 0 && (
        <div className="empty">
          <p>Noch keine Szene da.</p>
          <Link className="btn primary" to="/neu">
            Markdown einlesen
          </Link>
        </div>
      )}
      <ul className="scene-list">
        {scenes?.map((scene) => {
          const parsed = parseScene(scene.markdown)
          return (
            <li key={scene.id} className="scene-row">
              <Link className="scene-link" to={`/szene/${scene.id}`}>
                <span className="scene-title">{scene.title}</span>
                <span className="muted small">
                  {plural(parsed.roles.length, 'Rolle', 'Rollen')} ·{' '}
                  {plural(parsed.items.length, 'Abschnitt', 'Abschnitte')} ·{' '}
                  {new Date(scene.updated_at).toLocaleDateString('de-DE')}
                </span>
              </Link>
              <button className="btn ghost danger" onClick={() => remove(scene)}>
                Löschen
              </button>
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}
