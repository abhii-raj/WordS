import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { api, getToken } from './lib/api'
import './index.css'
import AuthPage from './pages/AuthPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import LeaderboardPage from './pages/LeaderboardPage'

function App() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const createRoomFromHeader = async () => {
    const t = getToken()
    if (!t) return navigate('/auth')
    try {
      const room = await api('/api/rooms', { method: 'POST', token: t })
      navigate(`/room/${room.code}`)
    } catch (e) {
      console.error(e)
      alert(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">Wordgame</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link className="hover:text-gray-900" to="/">Lobby</Link>
            <Link className="hover:text-gray-900" to="/leaderboard">Leaderboard</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700" onClick={createRoomFromHeader}>New Room</button>
            {token ? (
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => { localStorage.removeItem('token'); navigate('/auth') }}>Logout</button>
            ) : (
              <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" to="/auth">Login</Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
