import { useEffect, useState } from 'react'
import { Trophy, Crown, Medal, Award, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api('/api/leaderboard')
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const getRankBadge = (index) => {
    if (index === 0) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-950/80 border border-amber-500/70 text-amber-300 font-bold text-xs shadow-md shadow-amber-500/20" title="1st Place">
          <Crown className="h-4 w-4 text-amber-400" />
        </div>
      )
    }
    if (index === 1) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-bold text-xs" title="2nd Place">
          <Medal className="h-4 w-4 text-slate-300" />
        </div>
      )
    }
    if (index === 2) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-950/40 border border-amber-800 text-amber-500 font-bold text-xs" title="3rd Place">
          <Medal className="h-4 w-4 text-amber-600" />
        </div>
      )
    }
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold text-slate-500">
        #{index + 1}
      </span>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-800/60 text-xs font-semibold text-amber-300 mb-2 shadow-sm">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Global Hall of Fame</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Player Leaderboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Rankings based on total points scored and games won across all rooms.
          </p>
        </div>

        <Link
          to="/"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-95"
        >
          <span>Play Now</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800" />
                  <div className="h-4 w-32 rounded bg-slate-800" />
                </div>
                <div className="h-4 w-16 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 border border-slate-700">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">No ranked players yet</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Be the first to complete a game and claim the top of the leaderboard!
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-500 transition"
              >
                Create a Room
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 w-16 text-center">Rank</th>
                  <th scope="col" className="py-3.5 px-3">Player</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Points</th>
                  <th scope="col" className="py-3.5 pr-6 pl-3 text-right">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((r, index) => (
                  <tr
                    key={r._id || index}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      index === 0 ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 pl-6 pr-3 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        {getRankBadge(index)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700">
                          {(r.username || 'P')[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {r.username || 'Anonymous'}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                              Current Champion
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                        {r.points.toLocaleString()} pts
                      </span>
                    </td>
                    <td className="py-3.5 pr-6 pl-3 whitespace-nowrap text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        {r.wins} {r.wins === 1 ? 'win' : 'wins'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
