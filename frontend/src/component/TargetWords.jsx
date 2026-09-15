import { Sparkles, CheckCircle2 } from 'lucide-react'

export default function TargetWords({ targetWords = [], found = new Set() }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Target Words</span>
        </h3>
        <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-900/50">
          {found.size} / {targetWords.length} found
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {targetWords.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No target words loaded.</p>
        ) : (
          targetWords.map((w, i) => {
            const isFound = found.has(w.toUpperCase())
            return (
              <span
                key={w + i}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isFound
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 line-through opacity-85 shadow-xs'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {isFound && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                <span>{w}</span>
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
