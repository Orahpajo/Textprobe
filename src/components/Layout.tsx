import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({
  children,
  back,
  title,
  actions,
}: {
  children: ReactNode
  back?: { to: string; label: string }
  title?: string
  actions?: ReactNode
}) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          {back ? (
            <Link className="btn ghost" to={back.to}>
              ← {back.label}
            </Link>
          ) : (
            <Link className="brand" to="/">
              Textprobe
            </Link>
          )}
          {title && <span className="topbar-title">{title}</span>}
        </div>
        <div className="topbar-right">
          {actions}
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
            Abmelden
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
