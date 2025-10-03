import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api, getToken } from '../lib/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

// Build a simple word-search grid given a list of words
function buildGrid(words, size = 8) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''))
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0], // horizontal/vertical
    [1, 1], [1, -1], [-1, 1], [-1, -1], // diagonals
  ]
  const rand = (n) => Math.floor(Math.random() * n)

  for (const raw of words) {
    const word = String(raw || '').replace(/\s+/g, '').toUpperCase()
    if (!word) continue
    let placed = false
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = directions[rand(directions.length)]
      const startR = rand(size)
      const startC = rand(size)
      const endR = startR + dir[0] * (word.length - 1)
      const endC = startC + dir[1] * (word.length - 1)
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue
      let ok = true
      for (let i = 0; i < word.length; i++) {
        const r = startR + dir[0] * i
        const c = startC + dir[1] * i
        if (grid[r][c] && grid[r][c] !== word[i]) { ok = false; break }
      }
      if (!ok) continue
      for (let i = 0; i < word.length; i++) {
        const r = startR + dir[0] * i
        const c = startC + dir[1] * i
        grid[r][c] = word[i]
      }
      placed = true
    }
  }
  // fill empty with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = letters[rand(letters.length)]
    }
  }
  return grid
}

export default function RoomPage() {
  const { code } = useParams()
  const [room, setRoom] = useState(null)
  const [phase, setPhase] = useState('lobby')
  const [phaseEnd, setPhaseEnd] = useState(null)
  const [timer, setTimer] = useState(15)
  const [inputWords, setInputWords] = useState('')
  const [words, setWords] = useState([])
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [grid, setGrid] = useState([])
  const [roomSettings, setRoomSettings] = useState({ timerDuration: 15, wordsPerPlayer: 3 })
  const [found, setFound] = useState(new Set())
  const [foundPaths, setFoundPaths] = useState([])
  const [selecting, setSelecting] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [chatMessages, setChatMessages] = useState([])

  const [playersReady, setPlayersReady] = useState([])
  const [playerSubmissions, setPlayerSubmissions] = useState([])
  const [playerWords, setPlayerWords] = useState([])
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const gridBuiltRef = useRef(false)
  const chatInputRef = useRef(null)

  // Memoize grid and words to prevent flicker in play phase
  const memoGrid = useMemo(() => grid, [grid]);
  const memoWords = useMemo(() => words, [words]);
  // Fallback to ensure grid is built when entering play phase
  useEffect(() => {
    if (phase === 'play' && words.length > 0 && grid.length === 0 && !gridBuiltRef.current) {
      setGrid(buildGrid(words));
      gridBuiltRef.current = true;
    }
  }, [phase]);

  const socketRef = useRef(null)
  const userId = useMemo(() => {
    try {
      const token = getToken()
      if (!token) return null
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.id
    } catch { return null }
  }, [])

  // Initial fetch and socket setup
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setError('Authentication required. Please login.')
      setIsLoading(false)
      return
    }
    
    api(`/api/rooms/${code}`, { token }).then((r) => {
      if (!r) {
        setError('Room not found. Please check the room code.')
        setIsLoading(false)
        return
      }
      
      setRoom(r)
      setPhase(r.phase || 'entry')
      setPhaseEnd(r.phaseEnd ? new Date(r.phaseEnd) : null)
      setWords(r.words || [])
      setPlayers(r.players || [])
      setChatMessages(r.chatMessages || [])
      setPlayerSubmissions(r.playerSubmissions || [])
      setPlayerWords(r.playerWords || [])
      setRoomSettings(r.settings || { timerDuration: 15, wordsPerPlayer: 3 })
      setPlayersReady(r.playersReady || [])
      
      // Check if current user is ready
      const token = getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setIsPlayerReady((r.playersReady || []).some(id => id === payload.id))
        } catch (e) {
          console.error('Error parsing token:', e)
        }
      }
      if (r.phase === 'play') {
        setGrid(buildGrid(r.words || []))
        gridBuiltRef.current = true
      }
      setIsLoading(false)
    }).catch(e => {
      console.error('Room fetch error:', e)
      setError(`Failed to load room: ${e.message}`)
      setIsLoading(false)
    })
  }, [code])

  useEffect(() => {
    if (!userId) return
    
    const s = io(SOCKET_URL, { 
      withCredentials: true, 
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })
    socketRef.current = s
    
    s.on('connect', () => {
      console.log('Socket connected:', s.id)
      setConnectionStatus('connected')
      setError('')
      s.emit('join_room', { roomCode: code, user: { id: userId } })
    })
    
    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnectionStatus('disconnected')
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Please refresh the page.')
      }
    })
    
    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnectionStatus('error')
      setError('Connection failed. Please check your internet connection.')
    })
    
    s.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
      setConnectionStatus('connected')
      setError('')
    })

    s.on('room_state', (payload) => {
      setIsLoading(false)
      if (payload.type === 'sync') {
        setPhase(payload.phase)
        setPhaseEnd(payload.phaseEnd ? new Date(payload.phaseEnd) : null)
        setWords(payload.words || [])
        setPlayers(payload.players || [])
        setPlayersReady(payload.playersReady || [])
        setPlayerSubmissions(payload.playerSubmissions || [])
        setPlayerWords(payload.playerWords || [])
        setRoomSettings(payload.settings || { timerDuration: 15, wordsPerPlayer: 3 })
        setChatMessages(payload.chatMessages || [])
        if (payload.phase === 'play' && payload.words?.length > 0 && !gridBuiltRef.current) {
          setGrid(buildGrid(payload.words || []))
          gridBuiltRef.current = true
        }
      }
      if (payload.type === 'player_update') {
        setPlayers(payload.players || [])
        console.log('Player list updated:', payload.players)
      }
      if (payload.type === 'words_update') {
        setWords(payload.words || [])
        setPlayerSubmissions(payload.playerSubmissions || [])
        setPlayerWords(payload.playerWords || [])
        // Don't rebuild grid here - it causes flickering
      }
      if (payload.type === 'phase') {
        setPhase(payload.phase)
        if (payload.phase === 'play' && words.length > 0 && !gridBuiltRef.current) {
          setGrid(buildGrid(words))
          gridBuiltRef.current = true
        }
      }
      if (payload.type === 'reset') {
        setPhase(payload.phase || 'lobby')
        setPhaseEnd(payload.phaseEnd ? new Date(payload.phaseEnd) : null)
        setWords([])
        setScores([])
        setFound(new Set())
        setFoundPaths([])
        setInputWords('')
        setGrid([])
        setChatMessages([])
        setPlayersReady([])
        setPlayerSubmissions([])
        setPlayerWords([])
        setIsPlayerReady(false)
        gridBuiltRef.current = false
      }
    })
    s.on('phase_change', ({ phase, phaseEnd, message }) => {
      console.log(`Phase changed to: ${phase}`)
      setPhase(phase)
      setPhaseEnd(phaseEnd ? new Date(phaseEnd) : null)
      if (message) {
        console.log(message)
      }
    })
    s.on('score_update', ({ scores }) => setScores(scores))
    s.on('chat_message', (message) => {
      setChatMessages((prev) => [...prev, message])
    })
    s.on('settings_updated', ({ settings }) => {
      setRoomSettings(settings)
      console.log('Room settings updated:', settings)
    })
    s.on('ready_status_updated', ({ playersReady, totalPlayers, allReady }) => {
      setPlayersReady(playersReady)
      
      const token = getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setIsPlayerReady(playersReady.some(id => id === payload.id))
        } catch (e) {
          console.error('Error parsing token:', e)
        }
      }
      
      console.log(`Ready status: ${playersReady.length}/${totalPlayers} players ready`)
    })
    s.on('drop', ({ word, valid, points, duplicate, path }) => {
      if (valid && !duplicate) {
        setFound((prev) => new Set(prev).add(word.toUpperCase()))
        // Store the path if provided (for proper highlighting)
        if (path) {
          setFoundPaths((prev) => [...prev, { word: word.toUpperCase(), path }])
        }
        console.log(`✅ Found word: ${word} (+${points} points)`)
      } else if (duplicate) {
        console.log(`⚠️ Already found: ${word}`)
      } else {
        console.log(`❌ Invalid word: ${word}`)
      }
    })

    return () => { s.disconnect() }
  }, [code, userId])

  // Timer logic
  useEffect(() => {
    if (phase !== 'entry' || !phaseEnd) return;
    const newTimer = Math.max(0, Math.ceil((phaseEnd - new Date()) / 1000));
    setTimer(newTimer);
    
    const interval = setInterval(() => {
      const currentTimer = Math.max(0, Math.ceil((phaseEnd - new Date()) / 1000));
      setTimer(currentTimer);
      
      // Safety check: if timer reaches 0 and we're still in entry phase, request phase check
      if (currentTimer <= 0 && phase === 'entry' && socketRef.current) {
        console.log('Timer expired, requesting phase check from server');
        socketRef.current.emit('check_phase', { roomCode: code });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, phaseEnd, code]);

  const addWords = () => {
    if (phase !== 'entry' || timer <= 0) return
    
    // Check if user has reached word limit
    const currentWordCount = getCurrentUserWordCount()
    if (currentWordCount >= roomSettings.wordsPerPlayer) {
      return // Silently prevent adding more words
    }
    
    // Calculate how many more words user can add
    const remainingSlots = roomSettings.wordsPerPlayer - currentWordCount
    
    const newWords = inputWords
      .split(/[,\n\s]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2) // Minimum word length
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, remainingSlots) // Limit to remaining slots only
    
    if (!newWords.length) {
      setError('Please enter at least one valid word (2+ characters)')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    console.log('Adding words:', newWords)
    socketRef.current?.emit('word_input', { roomCode: code, words: newWords, userId, justAdd: true })
    setInputWords('')
    setError('') // Clear any previous errors
  }

  // Submit and mark as ready to start
  const submitAndStart = () => {
    if (phase !== 'entry' || timer <= 0) return
    const newWords = inputWords
      .split(/[,\n\s]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2) // Minimum word length
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, roomSettings.wordsPerPlayer) // Limit based on room settings
    
    console.log('Submitting and starting with words:', newWords)
    socketRef.current?.emit('word_input', { roomCode: code, words: newWords, userId, submit: true })
    setInputWords('')
    setError('') // Clear any previous errors
  }

  function coordsEqual(a, b) { return a && b && a.r === b.r && a.c === b.c }

  const startSelect = (r, c) => () => { setSelecting([{ r, c }]) }
  const extendSelect = (r, c) => () => {
    if (!selecting.length) return
    setSelecting((sel) => {
      const start = sel[0]
      const isValidDirection = (start, end) => {
        const dr = Math.sign(end.r - start.r)
        const dc = Math.sign(end.c - start.c)
        return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0)
      }
      
      if (sel.length === 1) {
        return isValidDirection(start, { r, c }) ? [...sel, { r, c }] : sel
      }
      
      const direction = {
        r: Math.sign(sel[1].r - sel[0].r),
        c: Math.sign(sel[1].c - sel[0].c)
      }
      const expected = {
        r: sel[sel.length - 1].r + direction.r,
        c: sel[sel.length - 1].c + direction.c
      }
      
      if (r === expected.r && c === expected.c && r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
        return [...sel, { r, c }]
      }
      return sel
    })
  }
  
  const endSelect = () => {
    if (!selecting.length) return
    const word = selecting.map(({ r, c }) => grid[r][c]).join('')
    const reverseWord = word.split('').reverse().join('')
    const selectedPath = [...selecting] // Store the path for potential highlighting
    setSelecting([])
    if (!word) return
    
    // Try both forward and reverse word
    const targetWords = memoWords.map(w => w.toUpperCase())
    if (targetWords.includes(word.toUpperCase()) || targetWords.includes(reverseWord.toUpperCase())) {
      // Store the path with the word for highlighting when confirmed valid
      const wordToSend = word.toUpperCase()
      socketRef.current?.emit('drop', { roomCode: code, word: wordToSend, userId, path: selectedPath })
    } else {
      // Visual feedback for invalid word
      console.log('Invalid word:', word, 'Available:', targetWords)
    }
  }

  const finalizeGame = async () => {
    const token = getToken()
    if (!token) {
      setError('Authentication required. Please login again.')
      return
    }
    
    if (scores.length === 0) {
      setError('No scores to finalize. Play the game first!')
      return
    }
    
    setIsLoading(true)
    try {
      const result = await api(`/api/rooms/${code}/finalize`, { method: 'POST', token })
      const topScore = Math.max(...scores.map(s => s.score))
      const winners = scores.filter(s => s.score === topScore)
      
      let message = `🎉 Game finalized!\n\n`
      if (winners.length === 1) {
        message += `🏆 Winner: ${winners[0].username || 'Player'} with ${topScore} points!`
      } else {
        message += `🏆 Tie between: ${winners.map(w => w.username || 'Player').join(', ')} with ${topScore} points each!`
      }
      
      alert(message)
      console.log('Game finalized:', result)
    } catch (e) {
      console.error('Finalize error:', e)
      setError(`Failed to finalize game: ${e.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const resetGame = () => {
    if (confirm('Start a new round? This will clear all current progress.')) {
      setIsLoading(true)
      socketRef.current?.emit('reset_game', { roomCode: code })
      
      // Reset local state immediately for better UX
      setPhase('lobby')
      setWords([])
      setScores([])
      setFound(new Set())
      setFoundPaths([])
      setInputWords('')
      setGrid([])
      setSelecting([])
      setChatMessages([])
      setPlayersReady([])
      setPlayerSubmissions([])
      setPlayerWords([])
      setIsPlayerReady(false)
      gridBuiltRef.current = false
      
      setTimeout(() => setIsLoading(false), 1000) // Fallback timeout
    }
  }


  // Ready functionality
  // Get current user's word count
  const getCurrentUserWordCount = () => {
    if (!userId || !playerWords) return 0
    const userWordEntry = playerWords.find(pw => pw.user === userId)
    return userWordEntry ? userWordEntry.words.length : 0
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      // Visual feedback - could add a toast/notification here
      const button = document.querySelector('.copy-room-button')
      if (button) {
        const originalText = button.textContent
        button.textContent = '✓ Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy room code:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const toggleReady = () => {
    if (!socketRef.current || !userId) return
    
    socketRef.current.emit('toggle_ready', {
      roomCode: code,
      userId
    })
  }

  // Settings functionality
  const updateSettings = (newSettings) => {
    if (!socketRef.current || !userId || !isHost) return
    
    socketRef.current.emit('update_settings', {
      roomCode: code,
      settings: newSettings,
      userId
    })
  }

  // Chat functionality
  const sendChatMessage = () => {
    if (!chatInputRef.current || !socketRef.current || !userId) return
    
    const message = chatInputRef.current.value.trim()
    if (!message) return
    
    socketRef.current.emit('chat_message', {
      roomCode: code,
      message,
      userId
    })
    
    chatInputRef.current.value = ''
    chatInputRef.current.focus()
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  // UI helpers
  const isHost = useMemo(() => {
    const token = getToken()
    if (!token) return false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return room && room.host && payload.id === (room.host._id || room.host)
    } catch { return false }
  }, [room])

  // Chat component
  const ChatComponent = ({ className = "" }) => (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col ${className}`}>
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-700">Chat</h3>
      </div>
      
      <div className="flex-1 p-3 space-y-2 max-h-48 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">No messages yet...</p>
        ) : (
          chatMessages.map((msg, index) => (
            <div key={index} className="text-sm">
              <span className="font-semibold text-blue-600">{msg.username}</span>
              <span className="text-gray-500 text-xs ml-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <p className="text-gray-700 mt-1">{msg.message}</p>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={chatInputRef}
            type="text"


            onKeyPress={handleChatKeyPress}

            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={connectionStatus !== 'connected'}
          />
          <button
            type="button"
            onMouseDown={sendChatMessage}
            disabled={connectionStatus !== 'connected'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors select-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Loading room...</p>
          {connectionStatus === 'connecting' && <p className="text-sm text-gray-500 mt-2">Connecting...</p>}
          {connectionStatus === 'error' && <p className="text-sm text-red-500 mt-2">Connection failed</p>}
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-red-200">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // --- PHASE 0: LOBBY ---
  if (phase === 'lobby') {
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
                  📋 Copy
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
                            ✓ READY
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
                {isPlayerReady ? '✓ Ready' : 'Ready Up'}
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
                    {playersReady.length === players.length ? '🚀 Start Game' : `⏳ Waiting (${playersReady.length}/${players.length})`}
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

  // --- PHASE 1: WORD ENTRY ---
  if (phase === 'entry') {
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

  // --- PHASE 2: PLAY ---
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
