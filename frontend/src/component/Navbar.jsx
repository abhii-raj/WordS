import { useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Plus, Trophy, Grid, LogIn, LogOut, Loader2 } from 'lucide-react'
import { api, getToken } from '../lib/api'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const token = localStorage.getItem('token')

  const user = useMemo(() => {
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload
    } catch {
      return null
    }
  }, [token])

  const createRoom = async () => {
    const t = getToken()
    if (!t) return navigate('/auth')
    setIsCreating(true)
    try {
      const room = await api('/api/rooms', { method: 'POST', token: t })
      navigate(`/room/${room.code}`)
    } catch (e) {
      console.error(e)
      window.alert(e.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/auth')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-2.5 focus:outline-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-transform group-hover:scale-105">
              <Grid className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none group-hover:text-indigo-300 transition-colors">
                WordGame
              </span>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                Multiplayer
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5">
            <Link
              to="/"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Grid className="h-4 w-4" />
              Lobby
            </Link>
            <Link
              to="/leaderboard"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive('/leaderboard')
                  ? 'bg-indigo-950/80 text-amber-300 border border-amber-800/60 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              Leaderboard
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={createRoom}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
            <span>New Room</span>
          </button>

          {token ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {user && (
                <div className="hidden md:flex items-center gap-2 py-1 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-[11px] font-bold text-white">
                    {(user.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                    {user.username}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                title="Sign out of account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="sm:hidden flex items-center justify-around border-t border-slate-800/80 px-4 py-2 bg-slate-950">
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 text-xs font-medium py-1 px-3 rounded-lg ${
            isActive('/') ? 'text-indigo-400 font-bold bg-indigo-950/70 border border-indigo-800/60' : 'text-slate-400'
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          Lobby
        </Link>
        <Link
          to="/leaderboard"
          className={`inline-flex items-center gap-1.5 text-xs font-medium py-1 px-3 rounded-lg ${
            isActive('/leaderboard') ? 'text-amber-400 font-bold bg-amber-950/40 border border-amber-800/60' : 'text-slate-400'
          }`}
        >
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          Leaderboard
        </Link>
      </div>
    </header>
  )
}
