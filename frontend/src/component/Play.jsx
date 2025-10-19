import React from 'react'

const Play = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-6 items-start w-full max-w-7xl mx-auto py-8">
      <div className="md:w-80 w-full space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Room {code}</h2>
            <button
              onClick={copyRoomCode}
              className="copy-room-button px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-medium transition-colors border border-gray-300"
              title="Copy room code"
            >
              📋
            </button>
          </div>
          <div className={`flex items-center gap-2 text-sm ${
            connectionStatus === 'connected' ? 'text-green-600' : 
            connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            {connectionStatus === 'connected' ? 'Online' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="font-semibold mb-2 text-lg">Find These Words</h3>
          <div className="flex flex-wrap gap-2">
            {memoWords.map((w, i) => (
              <span key={w + i} className={`px-4 py-2 rounded-full text-base font-semibold border transition-all duration-200 ${found.has(w.toUpperCase()) ? 'bg-green-100 text-green-700 line-through border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{w}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="font-semibold mb-2 text-lg">Scoreboard</h3>
          {scores.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No scores yet</p>
          ) : (
            <ul className="text-base text-gray-700 divide-y">
              {scores
                .sort((a, b) => b.score - a.score) // Sort by score descending
                .map((s, index) => (
                <li key={s.user} className={`flex justify-between items-center py-3 ${index === 0 ? 'bg-yellow-50 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div className="flex items-center gap-2">
                    {index === 0 && <span className="text-yellow-500">👑</span>}
                    <span className={`font-bold ${index === 0 ? 'text-yellow-700' : ''}`}>
                      {s.username || s.user}
                    </span>
                  </div>
                  <span className={`font-semibold ${index === 0 ? 'text-yellow-700' : 'text-blue-600'}`}>
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isHost && (
          <button 
            className="w-full mt-2 rounded-lg border-2 border-blue-400 px-4 py-2 text-lg font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={resetGame}
            disabled={isLoading || connectionStatus !== 'connected'}
          >
            {isLoading ? '🔄 Resetting...' : '🔄 New Round'}
          </button>
        )}
        <button 
          className="w-full mt-2 rounded-lg border-2 border-green-400 px-4 py-2 text-lg font-semibold text-green-700 hover:bg-green-50 hover:border-green-500 active:bg-green-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={finalizeGame}
          disabled={isLoading || connectionStatus !== 'connected' || scores.length === 0}
        >
          {scores.length === 0 ? '📊 No Scores to Save' : '🏆 Finalize Game'}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200 flex flex-col items-center">
          <div className="inline-grid select-none gap-3" style={{ gridTemplateColumns: `repeat(${memoGrid[0]?.length || 8}, minmax(2.8rem, 1fr))` }} onMouseLeave={() => setSelecting([])} onMouseUp={endSelect}>
            {memoGrid.flatMap((row, r) => row.map((ch, c) => {
              const selected = selecting.some(cell => cell.r === r && cell.c === c)
              const selectionIndex = selecting.findIndex(cell => cell.r === r && cell.c === c)
              const isStart = selectionIndex === 0
              const isEnd = selectionIndex === selecting.length - 1 && selecting.length > 1
              
              // Check if this cell is part of any found word path
              let isPartOfFoundWord = false
              for (const foundWordData of foundPaths) {
                if (foundWordData.path && foundWordData.path.some(cell => cell.r === r && cell.c === c)) {
                  isPartOfFoundWord = true
                  break
                }
              }
              
              // Fallback for words found before path tracking was implemented
              if (!isPartOfFoundWord && foundPaths.length === 0) {
                for (const foundWord of found) {
                  if (foundWord.includes(ch)) {
                    isPartOfFoundWord = true
                    break
                  }
                }
              }
              
              return (
                <button
                  key={`${r}-${c}`}
                  onMouseDown={startSelect(r, c)}
                  onMouseEnter={extendSelect(r, c)}
                  className={`w-11 h-11 md:w-12 md:h-12 border-2 text-sm md:text-base font-extrabold flex items-center justify-center rounded-md transition-all duration-150 
                    ${selected 
                      ? `bg-gradient-to-br from-yellow-200 to-yellow-300 border-yellow-500 shadow-xl scale-105 ${isStart ? 'ring-2 ring-green-400' : ''} ${isEnd ? 'ring-2 ring-red-400' : ''}` 
                      : isPartOfFoundWord 
                        ? 'bg-green-100 border-green-400 text-green-800' 
                        : 'bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                    }`}
                  style={{ 
                    boxShadow: selected 
                      ? '0 4px 20px rgba(251, 191, 36, 0.4), 0 0 12px 2px #fde047' 
                      : isPartOfFoundWord 
                        ? '0 2px 8px rgba(34, 197, 94, 0.2)' 
                        : undefined,
                    transform: selected ? 'scale(1.05) translateZ(0)' : undefined
                  }}
                >
                  {ch}
                </button>
              )
            }))}
          </div>
        </div>
      </div>
      
      {/* Chat sidebar for play phase */}
      <div className="lg:w-80 w-full">
        <ChatComponent className="h-96" />
      </div>
    </div>
  )
  
}

export default Play