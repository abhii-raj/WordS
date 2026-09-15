import { useState } from 'react'
import { Copy, Check, Crown, Play, Users, Clock, Hash, Shield, Sparkles, Loader2 } from 'lucide-react'
import ChatBox from './ChatBox'

const Lobby = ({
  code,
  copyRoomCode,
  players = [],
  room,
  toggleReady,
  connectionStatus,
  isPlayerReady,
  isHost,
  roomSettings = { timerDuration: 15, wordsPerPlayer: 3 },
  setRoomSettings,
  updateSettings,
  socketRef,
  userId,
  playersReady = [],
  isLoading,
  chatMessages = [],
  onSendMessage
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (copyRoomCode) {
      await copyRoomCode()
    } else {
      try {
        await navigator.clipboard.writeText(code)
      } catch (e) {
        console.error(e)
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allPlayersReady = players.length > 0 && playersReady.length === players.length

  const handleStartGame = () => {
    if (socketRef?.current && userId && code) {
      socketRef.current.emit('start_game', { roomCode: code, userId })
    }
  }

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-6xl mx-auto py-2">
      {/* Main Lobby Card */}
      <div className="flex-1 w-full rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header with Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[11px] font-semibold text-indigo-300 mb-1.5 shadow-xs">
              <Sparkles className="h-3 w-3" />
              <span>Room Lobby</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Gathering Players
            </h2>
            <p className="text-xs text-slate-400">
              Share the room code with friends to invite them to this match.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 border border-slate-800 rounded-2xl p-1.5 pr-2 shadow-inner">
            <div className="px-3 py-1 font-mono text-lg font-extrabold tracking-widest text-indigo-300">
              {code}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="copy-room-button inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white active:scale-95 transition-all shadow-xs"
              title="Copy room code"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Players Roster */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>Players ({players.length})</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {playersReady.length} / {players.length} ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((player, index) => {
              const playerId = player._id || player.id
              const isReady = playersReady.some((id) => id === playerId)
              const isCurrentPlayerHost = playerId === (room?.host?._id || room?.host)
              const isCurrentUser = playerId === userId

              return (
                <div
                  key={playerId || index}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isReady
                      ? 'bg-emerald-950/30 border-emerald-800/60 shadow-xs'
                      : 'bg-slate-800/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-sm ${
                        isReady
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {(player.username || 'P')[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          {player.username || 'Player'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-indigo-400 font-medium">(You)</span>
                        )}
                      </div>
                      {isCurrentPlayerHost && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                          <Crown className="h-3 w-3" />
                          <span>HOST</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/70 shadow-2xs">
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                        Waiting
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ready Action Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={toggleReady}
            disabled={connectionStatus !== 'connected'}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isPlayerReady
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500'
            }`}
          >
            {isPlayerReady ? (
              <>
                <Check className="h-4 w-4" />
                <span>You are Ready</span>
              </>
            ) : (
              <span>Ready Up</span>
            )}
          </button>
        </div>

        {/* Host Settings or Match Settings */}
        {isHost ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>Host Game Settings</span>
              </h4>
              <span className="text-[11px] text-slate-500">Only host can adjust</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Entry Countdown */}
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    Entry Countdown
                  </span>
                  <span className="font-mono font-bold text-indigo-300">
                    {roomSettings.timerDuration}s
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={roomSettings.timerDuration}
                  onChange={(e) => {
                    const newSettings = { ...roomSettings, timerDuration: parseInt(e.target.value, 10) }
                    if (setRoomSettings) setRoomSettings(newSettings)
                    if (updateSettings) updateSettings(newSettings)
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5s</span>
                  <span>15s</span>
                  <span>30s</span>
                </div>
              </div>

              {/* Words Per Player */}
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-indigo-400" />
                    Words per Player
                  </span>
                  <span className="font-mono font-bold text-indigo-300">
                    {roomSettings.wordsPerPlayer} words
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        const newSettings = { ...roomSettings, wordsPerPlayer: count }
                        if (setRoomSettings) setRoomSettings(newSettings)
                        if (updateSettings) updateSettings(newSettings)
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        roomSettings.wordsPerPlayer === count
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {count} Words
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Game Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartGame}
                disabled={
                  players.length < 1 ||
                  isLoading ||
                  connectionStatus !== 'connected' ||
                  !allPlayersReady
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 px-6 font-bold text-sm text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : allPlayersReady ? (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Start Game</span>
                  </>
                ) : (
                  <span>
                    Waiting for All Players ({playersReady.length}/{players.length} Ready)
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Match Settings
            </h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Entry Timer:</span>
                <span className="font-semibold text-slate-100">{roomSettings.timerDuration}s</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Hash className="h-3.5 w-3.5 text-indigo-400" />
                <span>Words per Player:</span>
                <span className="font-semibold text-slate-100">{roomSettings.wordsPerPlayer}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-xs text-indigo-300 font-medium text-center">
              Waiting for the host to launch the game when everyone is ready.
            </div>
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

export default Lobby