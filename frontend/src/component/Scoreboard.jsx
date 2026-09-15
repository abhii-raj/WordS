import { Trophy, Crown, CircleDot, RotateCcw, Loader2 } from 'lucide-react'

export default function Scoreboard({
  scores = [],
  isHost,
  isLoading,
  connectionStatus,
  onResetGame,
  onFinalizeGame
}) {
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-4">
      {/* Scoreboard Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span>Scoreboard</span>
        </h3>

        {sortedScores.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4 italic">
            No points scored yet. Drag tiles to claim words!
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80 text-sm">
            {sortedScores.map((s, index) => {
              const isLeader = index === 0 && s.score > 0
              return (
                <li
                  key={s.user || index}
                  className={`flex items-center justify-between py-2.5 px-2.5 rounded-xl transition-colors ${
                    isLeader ? 'bg-amber-950/30 border border-amber-900/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isLeader ? (
                      <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : (
                      <CircleDot className="h-3 w-3 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={`font-semibold text-xs sm:text-sm truncate ${
                        isLeader ? 'text-amber-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {s.username || s.user}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                      isLeader
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {s.score} pts
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Game Action Buttons */}
      <div className="space-y-2">
        {isHost && (
          <button
            type="button"
            onClick={onResetGame}
            disabled={isLoading || connectionStatus !== 'connected'}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-200 shadow-md hover:bg-slate-700 hover:text-white active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw className={`h-4 w-4 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Resetting Round...' : 'New Round'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onFinalizeGame}
          disabled={isLoading || connectionStatus !== 'connected' || scores.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trophy className="h-4 w-4 text-amber-300" />
          )}
          <span>{scores.length === 0 ? 'No Scores to Save' : 'Finalize Game'}</span>
        </button>
      </div>
    </div>
  )
}
