import React from 'react'

const Entry = ({
    inputWords , timer , addWords , roomSettings , submitAndStart, words , error , players , playerSubmissions ,ChatComponent
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-[60vh] gap-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg flex flex-col items-center border border-gray-200">
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Word Entry</h2>
          <div className="mb-6 flex items-center gap-4">
            <span className={`text-5xl font-mono font-extrabold px-6 py-2 rounded-2xl shadow-lg border-2 border-blue-200 ${timer > 5 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>{timer}</span>
            <span className="text-lg text-gray-500">seconds left</span>
          </div>
          <div className="w-full flex flex-col gap-3 mb-3">
            <textarea
              className="w-full rounded-lg border-2 border-blue-200 px-4 py-3 resize-none text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              rows={2}
              placeholder="Type words, comma or newline separated"
              value={inputWords}
              onChange={e => setInputWords(e.target.value)}
              disabled={timer <= 0}
              onKeyDown={e => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  addWords(); 
                } 
              }}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-blue-600 text-white px-4 py-2 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                onClick={addWords}
                disabled={timer <= 0 || !inputWords.trim() || getCurrentUserWordCount() >= roomSettings.wordsPerPlayer}
              >
                Add Words
              </button>
              <button
                className="rounded-lg border border-blue-400 px-4 py-2 text-lg font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition"
                onClick={submitAndStart}
                disabled={timer <= 0}
              >
                Submit & Start
              </button>
            </div>
          </div>
          {error && (
            <div className="w-full mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          <div className="w-full flex flex-wrap gap-1 min-h-[40px] mb-2 justify-center max-w-md">
            {words.length === 0 ? (
              <p className="text-gray-500 text-sm">No words added yet</p>
            ) : (
              words.map((w, i) => (
                <span key={w + i} className="bg-blue-100 text-blue-700 rounded-full px-2 py-1 text-sm font-semibold shadow animate-fade-in border border-blue-200 transition-all duration-200 hover:bg-blue-200">{w}</span>
              ))
            )}
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {words.length}/{roomSettings.wordsPerPlayer * players.length} words • {playerSubmissions.length}/{players.length} players submitted
          </div>
          {timer <= 0 && <div className="mt-2 text-red-600 font-semibold text-lg animate-pulse">⏰ Entry Phase Locked</div>}
        </div>
        
        {/* Chat sidebar */}
        <ChatComponent className="w-full max-w-sm lg:max-w-xs h-96" />
      </div>
    )
  
}

export default Entry