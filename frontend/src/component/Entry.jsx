import { Clock, Plus, CheckCheck, Lock, AlertCircle, Sparkles } from 'lucide-react'
import ChatBox from './ChatBox'

const Entry = ({
  inputWords = '',
  setInputWords,
  timer = 15,
  addWords,
  roomSettings = { wordsPerPlayer: 3 },
  submitAndStart,
  words = [],
  error = '',
  players = [],
  playerSubmissions = [],
  getCurrentUserWordCount = () => 0,
  chatMessages = [],
  onSendMessage,
  connectionStatus = 'connected',
  userId
}) => {
  const currentCount = getCurrentUserWordCount()
  const maxWords = roomSettings.wordsPerPlayer
  const isLocked = timer <= 0

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-6xl mx-auto py-2">
      {/* Main Entry Card */}
      <div className="flex-1 w-full rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header with Countdown Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[11px] font-semibold text-indigo-300 mb-1.5 shadow-xs">
              <Sparkles className="h-3 w-3" />
              <span>Phase 1 — Secret Words</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Word Entry
            </h2>
            <p className="text-xs text-slate-400">
              Submit words to hide inside the board grid. Words must be at least 2 characters.
            </p>
          </div>

          {/* Digital Timer Badge */}
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${
              timer > 5
                ? 'bg-slate-950 border-slate-800 text-white shadow-inner'
                : 'bg-rose-950/70 border-rose-800/80 text-rose-300 animate-pulse shadow-md shadow-rose-900/40'
            }`}
          >
            <Clock className={`h-5 w-5 ${timer <= 5 ? 'text-rose-400' : 'text-indigo-400'}`} />
            <div className="flex flex-col items-end leading-none">
              <span className="font-mono text-2xl font-extrabold tracking-tight">
                {timer}s
              </span>
              <span className="text-[10px] font-medium text-slate-400">remaining</span>
            </div>
          </div>
        </div>

        {/* Input & Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">
                Enter Words (comma or line separated)
              </label>
              <span className="font-medium text-slate-400">
                Your words: <strong className="text-indigo-300">{currentCount}</strong> / {maxWords}
              </span>
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              placeholder="e.g. APPLE, BANANA, CHERRY"
              value={inputWords}
              onChange={(e) => setInputWords?.(e.target.value)}
              disabled={isLocked}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addWords?.()
                }
              }}
            />
            <p className="text-[11px] text-slate-500">
              Press Enter to add, or click Add Words below.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={addWords}
              disabled={isLocked || !inputWords.trim() || currentCount >= maxWords}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Words</span>
            </button>

            <button
              type="button"
              onClick={submitAndStart}
              disabled={isLocked}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 px-5 text-sm font-semibold text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <CheckCheck className="h-4 w-4 text-emerald-400" />
              <span>Submit & Finish</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-800/80 bg-rose-950/60 p-3.5 text-xs font-medium text-rose-300 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Word Pool Tags */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300">
              Room Word Pool ({words.length})
            </span>
            <span className="text-slate-400 font-mono">
              {playerSubmissions.length} / {players.length} submitted
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
            {words.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No words added yet.</p>
            ) : (
              words.map((w, i) => (
                <span
                  key={w + i}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shadow-xs animate-fade-in"
                >
                  {w}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Phase Lock Banner */}
        {isLocked && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 border border-slate-800 py-3 px-4 text-xs font-bold text-slate-300 shadow-md">
            <Lock className="h-4 w-4 text-indigo-400" />
            <span>Entry Phase Complete — Generating Grid Board...</span>
          </div>
        )}
      </div>

      {/* Standalone Chat Box */}
      <div className="w-full lg:w-80 shrink-0">
        <ChatBox
          chatMessages={chatMessages}
          onSendMessage={onSendMessage}
          connectionStatus={connectionStatus}
          currentUserId={userId}
          className="h-[480px]"
        />
      </div>
    </div>
  )
}

export default Entry