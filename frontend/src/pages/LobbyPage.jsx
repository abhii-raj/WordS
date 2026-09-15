import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogIn, AlertCircle, ArrowRight, Layers, KeyRound, Sparkles, Loader2 } from 'lucide-react'
import { api, getToken } from '../lib/api'

export default function LobbyPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const navigate = useNavigate()

  const createRoom = async () => {
    setError('')
    const token = getToken()
    if (!token) return navigate('/auth')
    setIsCreating(true)
    try {
      const room = await api('/api/rooms', { method: 'POST', token })
      navigate(`/room/${room.code}`)
    } catch (e) {
      setError(e.message || 'Failed to create room')
    } finally {
      setIsCreating(false)
    }
  }

  const joinRoom = async () => {
    setError('')
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      setError('Please enter a room code')
      return
    }
    const token = getToken()
    if (!token) return navigate('/auth')
    setIsJoining(true)
    try {
      const room = await api(`/api/rooms/${cleanCode}/join`, { method: 'POST', token })
      navigate(`/room/${room.code}`)
    } catch (e) {
      setError(e.message || 'Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-8 space-y-8">
      {/* Hero Intro */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-semibold text-indigo-300 shadow-md shadow-indigo-900/30">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Realtime Multiplayer Board</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Compete in live word-search battles
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Create a private room for your friends or enter a room code to join an ongoing match. Submit words, drag tiles, and top the leaderboard.
        </p>
      </div>

      {error && (
        <div className="max-w-xl mx-auto flex items-center gap-3 rounded-2xl border border-rose-800/80 bg-rose-950/60 p-4 text-sm text-rose-300 animate-fade-in shadow-xl shadow-rose-950/40">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <p className="flex-1 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-xs text-rose-400 hover:text-rose-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card 1: Create Room */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-black/30 hover:border-indigo-800/80 transition-all">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/70 shadow-inner">
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create a Room</h2>
              <p className="mt-1 text-sm text-slate-400">
                Generate a private room as host. Configure custom entry timers, word limits, and invite players.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Customizable countdown timer & word count
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Live socket-synchronized word grid
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800/80">
            <button
              type="button"
              onClick={createRoom}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-98 disabled:opacity-50 transition-all"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Create Room</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Join Room */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-black/30 hover:border-violet-800/80 transition-all">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-950 text-violet-400 border border-violet-800/70 shadow-inner">
              <KeyRound className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Join Existing Room</h2>
              <p className="mt-1 text-sm text-slate-400">
                Have a room code from a friend? Enter it below to jump directly into their lobby.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Room Code
              </label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-4 font-mono text-base font-bold uppercase tracking-widest text-indigo-300 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                placeholder="e.g. 7K2M9X"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinRoom()
                }}
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800/80">
            <button
              type="button"
              onClick={joinRoom}
              disabled={isJoining || !code.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-sm font-semibold text-slate-100 shadow-md hover:bg-slate-700 hover:text-white active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isJoining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4 text-indigo-400" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Flow Overview */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 max-w-4xl mx-auto shadow-xl">
        <h3 className="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>Game Flow</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-950 text-indigo-300 text-xs font-extrabold border border-indigo-800">1</span>
              <span>Lobby Gathering</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Players enter the lobby and hit Ready. Host configures timer duration and words per player.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-950 text-violet-300 text-xs font-extrabold border border-violet-800">2</span>
              <span>Word Input Phase</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every player secretly inputs chosen words before the countdown timer hits zero.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-300 text-xs font-extrabold border border-emerald-800">3</span>
              <span>Word Search Battle</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag over letters in any direction to select and claim target words for points in realtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
