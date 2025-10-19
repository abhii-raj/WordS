import React from 'react'
// import {       } from '../pages/RoomPage'

const Lobby = ({
    code ,  copyRoomCode ,players  , room ,
              toggleReady , connectionStatus  , isPlayerReady ,
              isHost ,roomSettings ,socketRef , userId , playersReady , isLoading , ChatComponent

}) => {

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-[60vh] gap-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center border border-gray-200">
          <h2 className="text-3xl font-extrabold mb-6 tracking-tight text-center">Room Lobby</h2>
          
          <div className="w-full mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-700">Room Code</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-extrabold px-4 py-2 rounded-xl bg-blue-100 text-blue-700 border-2 border-blue-200">
                  {code}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="copy-room-button px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-300"
                  title="Copy room code"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-700 mb-3">Players ({players.length})</h3>
              <div className="grid gap-2">
                {players.map((player, index) => {
                  const playerIsReady = playersReady.some(id => id === (player._id || player.id))
                  return (
                    <div key={player._id || index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                          {(player.username || 'P')[0].toUpperCase()}
                        </div>
                        <span className="font-semibold">{player.username || 'Player'}</span>
                        {player._id === (room?.host?._id || room?.host) && (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {playerIsReady ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                             READY
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            NOT READY
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Ready button for all players */}
            <div className="flex justify-center mb-4">
              <button
                onClick={toggleReady}
                disabled={connectionStatus !== 'connected'}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPlayerReady 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {isPlayerReady ? 'Ready' : 'Ready Up'}
              </button>
            </div>
            
            {isHost && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-bold text-gray-700 mb-3">Game Settings</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Entry Timer: {roomSettings.timerDuration} seconds
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={roomSettings.timerDuration}
                        onChange={(e) => {
                          const newSettings = { ...roomSettings, timerDuration: parseInt(e.target.value) }
                          setRoomSettings(newSettings)
                          updateSettings(newSettings)
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5s</span>
                        <span>30s</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Words per Player: {roomSettings.wordsPerPlayer}
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newSettings = { ...roomSettings, wordsPerPlayer: 3 }
                            setRoomSettings(newSettings)
                            updateSettings(newSettings)
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            roomSettings.wordsPerPlayer === 3 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          3
                        </button>
                        <button
                          onClick={() => {
                            const newSettings = { ...roomSettings, wordsPerPlayer: 4 }
                            setRoomSettings(newSettings)
                            updateSettings(newSettings)
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            roomSettings.wordsPerPlayer === 4 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          4
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      if (socketRef.current && userId) {
                        socketRef.current.emit('start_game', { roomCode: code, userId })
                      }
                    }}
                    disabled={
                      players.length < 1 || 
                      isLoading || 
                      connectionStatus !== 'connected' || 
                      playersReady.length !== players.length
                    }
                    title={
                      playersReady.length !== players.length 
                        ? `Waiting for ${players.length - playersReady.length} more players to ready up`
                        : 'Start the game'
                    }
                  >
                    {playersReady.length === players.length ? '🚀 Start Game' : ` Waiting (${playersReady.length}/${players.length})`}
                  </button>
                </div>
              </div>
            )}
            
            {!isHost && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-bold text-gray-700 mb-3">Game Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Timer:</span>
                      <span className="font-semibold">{roomSettings.timerDuration} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Words per Player:</span>
                      <span className="font-semibold">{roomSettings.wordsPerPlayer}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-blue-700 font-semibold">Waiting for host to start the game...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat sidebar */}
        <ChatComponent className="w-full max-w-sm lg:max-w-xs h-96" />
      </div>
    )
  
}

export default Lobby