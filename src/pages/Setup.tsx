export default function Setup() {
  return (
    <div className="center">
      <div className="card narrow">
        <h1>Textprobe</h1>
        <p>Es fehlen noch die Supabase-Zugangsdaten.</p>
        <p className="muted">
          Lege eine <code>.env</code> im Projektordner an (Vorlage: <code>.env.example</code>):
        </p>
        <pre className="code">
          {'VITE_SUPABASE_URL=https://<projekt>.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...'}
        </pre>
        <p className="muted">
          Für den GitHub-Pages-Build liegen dieselben Werte als Actions-Secrets im Repository.
          Danach <code>npm run dev</code> neu starten.
        </p>
      </div>
    </div>
  )
}
