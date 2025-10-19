import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api, getToken } from '../lib/api'
import { buildGrid } from '../utils/gridLogic'
import Lobby from '../component/Lobby'
import Entry from '../component/Entry'
import Play from '../component/Play'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

// Build a simple word-search grid given a list of words

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
        //third fallback
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
          <div className="text-red-500 text-xl mb-4">Warning</div>
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
      <Lobby code = {code}  copyRoomCode = {copyRoomCode} players = {players}  room ={room} isLoading={isLoading}
              toggleReady={toggleReady} connectionStatus ={connectionStatus} isPlayerReady={isPlayerReady}
              isHost={isHost} roomSettings={roomSettings} socketRef={socketRef} userId={userId} playersReady={playersReady}
              ChatComponent={ChatComponent}
      />
    )
  }

  // --- PHASE 1: WORD ENTRY ---
  if (phase === 'entry') {
    return (
      <Entry   inputWords ={inputWords}  timer ={timer}  addWords= {addWords} roomSettings ={roomSettings}
       submitAndStart ={submitAndStart} words={words}  error={error}  players={players}  playerSubmissions={playerSubmissions}
       ChatComponent={ChatComponent}
       />
    )
      
  }

  // --- PHASE 2: PLAY ---
  return (
    <Play/>
  )
    
}
