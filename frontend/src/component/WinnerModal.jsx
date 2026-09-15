import { Trophy, ArrowRight } from 'lucide-react'
import Modal from './Modal'

export default function WinnerModal({ isOpen, onClose, winners = [], topScore = 0, onViewLeaderboard }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Game Finalized"
    >
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/50 text-amber-400 border border-amber-800/70 shadow-lg shadow-amber-500/20">
          <Trophy className="h-7 w-7" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-100">
            {winners.length === 1
              ? `Winner: ${winners[0]}`
              : `Tie between: ${winners.join(', ')}`}
          </h4>
          <p className="mt-1 text-xs text-slate-400">
            Highest score: <strong className="text-amber-300 font-bold">{topScore} points</strong>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Scores and victories have been recorded on the leaderboard.
          </p>
        </div>

        <div className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={onViewLeaderboard}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all"
          >
            <span>View Leaderboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
