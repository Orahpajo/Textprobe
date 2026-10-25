import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import ScenePreview from '../components/ScenePreview'
import { getScene, updateScene, type Scene } from '../api/scenes'
import { pruneStats } from '../api/progress'
import { diffScenes, validKeys } from '../lib/diffScene'
import { parseScene, stripMarkup } from '../lib/parser'
import { plural } from '../lib/plural'

export default function Edit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [scene, setScene] = useState<Scene | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getScene(id)
      .then((s) => {
        setScene(s)
        setMarkdown(s.markdown)
        setTitle(s.title)
      })
      .catch((e) => setError(e.message))
  }, [id])

  const parsed = useMemo(() => parseScene(markdown), [markdown])
  const diff = useMemo(
    () => (scene ? diffScenes(scene.markdown, markdown) : null),
    [scene, markdown],
  )
  const dirty = scene ? markdown !== scene.markdown || title !== scene.title : false

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setMarkdown(await file.text())
  }

  async function save() {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      await updateScene(id, { title: title.trim() || parsed.title || 'Unbenannte Szene', markdown })
      // Fortschritt zu Repliken aufräumen, die es nicht mehr gibt.
      await pruneStats(id, validKeys(markdown))
      navigate(`/szene/${id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  if (error && !scene)
    return <Layout back={{ to: '/', label: 'Szenen' }}><p className="error">{error}</p></Layout>
  if (!scene || !diff)
    return <Layout back={{ to: '/', label: 'Szenen' }}><p className="muted">Lade …</p></Layout>

  return (
    <Layout back={{ to: `/szene/${id}`, label: 'Zurück' }} title={`${scene.title} bearbeiten`}>
      <div className="split">
        <section className="col">
          <label className="label" htmlFor="md">
            Szenen-Markdown
          </label>
          <textarea
            id="md"
            className="input mono"
            rows={20}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <div className="row">
            <label className="btn ghost file">
              Datei ersetzen
              <input type="file" accept=".md,.markdown,.txt,text/markdown" onChange={readFile} hidden />
            </label>
            <button className="btn ghost" type="button" onClick={() => setMarkdown(scene.markdown)}>
              Änderungen verwerfen
            </button>
          </div>
          <label className="label" htmlFor="title">
            Titel
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={!dirty || !markdown.trim() || busy} onClick={save}>
            {busy ? 'Speichere …' : 'Änderungen speichern'}
          </button>
        </section>

        <section className="col">
          <h2 className="section-title">Auswirkung auf den Fortschritt</h2>
          {!dirty ? (
            <p className="muted">Noch nichts geändert.</p>
          ) : (
            <>
              <ul className="impact">
                <li>
                  <span className="badge level-sitzt">bleibt</span>
                  {plural(diff.kept.length, 'Replik behält', 'Repliken behalten')} ihren Lernstand
                </li>
                <li>
                  <span className="badge level-wackelig">neu</span>
                  {plural(diff.changed.length, 'Replik ist', 'Repliken sind')} neu oder geändert und
                  {diff.changed.length === 1 ? ' startet' : ' starten'} ohne Fortschritt
                </li>
                {diff.removed.length > 0 && (
                  <li>
                    <span className="badge level-hart">weg</span>
                    {plural(diff.removed.length, 'Replik entfällt', 'Repliken entfallen')} – ihr
                    Fortschritt wird gelöscht
                  </li>
                )}
              </ul>

              {diff.changed.length > 0 && (
                <details className="details" open>
                  <summary>Neu oder geändert</summary>
                  <ul className="line-list">
                    {diff.changed.map((item) => (
                      <li key={item.key}>
                        <strong>{item.speaker}:</strong> {excerpt(item.text)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {diff.removed.length > 0 && (
                <details className="details">
                  <summary>Entfallen</summary>
                  <ul className="line-list removed">
                    {diff.removed.map((item) => (
                      <li key={item.key}>
                        <strong>{item.speaker}:</strong> {excerpt(item.text)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          <h2 className="section-title">Vorschau</h2>
          <div className="preview-scroll">
            <ScenePreview items={parsed.items} />
          </div>
        </section>
      </div>
    </Layout>
  )
}

function excerpt(text: string, max = 70): string {
  const plain = stripMarkup(text).replace(/\s+/g, ' ')
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}
