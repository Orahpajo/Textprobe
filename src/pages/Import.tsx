import { useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { createScene } from '../api/scenes'
import { parseScene } from '../lib/parser'
import { plural } from '../lib/plural'
import ScenePreview from '../components/ScenePreview'

const BEISPIEL = `# Szene 3 – Im Kontor

**SCROOGE:** Was wollen Sie zu dieser Stunde?

*Er zeigt auf das Namensschild an der Tür.*

**HARTY & JOLLYGOODE:** Wir sammeln für die Armen, Sir.

**SCROOGE:** Gibt es keine Gefängnisse mehr?`

export default function Import() {
  const [markdown, setMarkdown] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const parsed = useMemo(() => parseScene(markdown), [markdown])

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setMarkdown(await file.text())
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const scene = await createScene(markdown, title)
      navigate(`/szene/${scene.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Layout back={{ to: '/', label: 'Szenen' }} title="Szene einlesen">
      <div className="split">
        <section className="col">
          <label className="label" htmlFor="md">
            Szenen-Markdown
          </label>
          <textarea
            id="md"
            className="input mono"
            rows={18}
            placeholder={BEISPIEL}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <div className="row">
            <label className="btn ghost file">
              Markdown-Datei wählen
              <input type="file" accept=".md,.markdown,.txt,text/markdown" onChange={readFile} hidden />
            </label>
            <button className="btn ghost" onClick={() => setMarkdown(BEISPIEL)} type="button">
              Beispiel einfügen
            </button>
          </div>
          <label className="label" htmlFor="title">
            Titel {parsed.title && <span className="muted small">(erkannt: {parsed.title})</span>}
          </label>
          <input
            id="title"
            className="input"
            value={title}
            placeholder={parsed.title ?? 'Unbenannte Szene'}
            onChange={(e) => setTitle(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={!markdown.trim() || busy} onClick={save}>
            {busy ? 'Speichere …' : 'Szene speichern'}
          </button>
        </section>

        <section className="col">
          <h2 className="section-title">Erkannt</h2>
          {parsed.roles.length === 0 ? (
            <p className="muted">
              Noch keine Protagonisten gefunden. Sprecher werden als <code>**NAME:**</code> erwartet,
              Handlung als <code>*kursiver Absatz*</code>.
            </p>
          ) : (
            <ul className="role-chips">
              {parsed.roles.map((role) => (
                <li key={role.id} className="chip">
                  <strong>{role.name}</strong>
                  <span className="muted small">{plural(role.lineCount, 'Replik', 'Repliken')}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="preview-scroll">
            <ScenePreview items={parsed.items} />
          </div>
        </section>
      </div>
    </Layout>
  )
}
