import { Route, Routes } from 'react-router-dom'
import Navbar from './component/Navbar'
import AuthPage from './pages/AuthPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import LeaderboardPage from './pages/LeaderboardPage'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1 flex flex-col">
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
