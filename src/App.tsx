import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { isConfigured } from './lib/supabase'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Library from './pages/Library'
import Import from './pages/Import'
import SceneView from './pages/SceneView'
import Study from './pages/Study'

export default function App() {
  const { session, loading } = useAuth()

  if (!isConfigured) return <Setup />
  if (loading) return <div className="center muted">Lade …</div>
  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/neu" element={<Import />} />
      <Route path="/szene/:id" element={<SceneView />} />
      <Route path="/szene/:id/lernen/:roleId" element={<Study />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
