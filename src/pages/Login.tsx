import { useState, type FormEvent } from 'react'
import { supabase, authRedirectUrl } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() },
    })
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="center">
      <form className="card narrow" onSubmit={submit}>
        <h1>Textprobe</h1>
        <p className="muted">Szenen einlesen, Rolle wählen, Text abfragen.</p>
        {status === 'sent' ? (
          <p className="notice">
            Link ist unterwegs an <strong>{email}</strong>. Öffne ihn auf diesem Gerät.
          </p>
        ) : (
          <>
            <label className="label" htmlFor="email">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
            <button className="btn primary block" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sende …' : 'Magic Link schicken'}
            </button>
            <p className="muted small">Kein Passwort nötig – du bekommst einen Anmeldelink per E-Mail.</p>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
