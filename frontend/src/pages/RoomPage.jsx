import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, getToken } from '../lib/api'
import { buildGrid } from '../utils/gridLogic'
import Lobby from '../component/Lobby'
import Entry from '../component/Entry'
import Play from '../component/Play'
import WinnerModal from '../component/WinnerModal'
import ResetModal from '../component/ResetModal'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export default function RoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [chatMessages, setChatMessages] = useState([])

  const [playersReady, setPlayersReady] = useState([])
  const [playerSubmissions, setPlayerSubmissions] = useState([])
  const [playerWords, setPlayerWords] = useState([])
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  // Dialog state
  const [winnerDialog, setWinnerDialog] = useState({ isOpen: false, winners: [], topScore: 0 })
  const [resetDialog, setResetDialog] = useState(false)

  const gridBuiltRef = useRef(false)
  const socketRef = useRef(null)
  const wordsRef = useRef(words)

  useEffect(() => {
    wordsRef.current = words
  }, [words])

  const memoGrid = useMemo(() => grid, [grid])
  const memoWords = useMemo(() => words, [words])

  // Build grid on entering play phase
  useEffect(() => {
    if (phase === 'play' && words.length > 0 && grid.length === 0 && !gridBuiltRef.current) {
      setGrid(buildGrid(words))
      gridBuiltRef.current = true
    }
  }, [phase, words, grid.length])

  const userId = useMemo(() => {
    try {
      const token = getToken()
      if (!token) return null
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.id
    } catch {
      return null
    }
  }, [])

  // Initial fetch and socket setup
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setError('Authentication required. Please sign in to join.')
      setIsLoading(false)
      return
    }

    api(`/api/rooms/${code}`, { token })
      .then((r) => {
        if (!r) {
          setError('Room not found. Please verify the code.')
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

        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            setIsPlayerReady((r.playersReady || []).some((id) => id === payload.id))
          } catch (e) {
            console.error('Error parsing token:', e)
          }
        }
        if (r.phase === 'play') {
          setGrid(buildGrid(r.words || []))
          gridBuiltRef.current = true
        }
        setIsLoading(false)
      })
      .catch((e) => {
        console.error('Room fetch error:', e)
        setError(`Failed to load room: ${e.message}`)
        setIsLoading(false)
      })
  }, [code])

  // Socket communication
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
      setConnectionStatus('connected')
      setError('')
      s.emit('join_room', { roomCode: code, user: { id: userId } })
    })

    s.on('disconnect', (reason) => {
      setConnectionStatus('disconnected')
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Please refresh the page.')
      }
    })

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
      setConnectionStatus('error')
      setError('Connection failed. Please check your network connection.')
    })

    s.on('reconnect', () => {
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
      }
      if (payload.type === 'words_update') {
        setWords(payload.words || [])
        setPlayerSubmissions(payload.playerSubmissions || [])
        setPlayerWords(payload.playerWords || [])
      }
      if (payload.type === 'phase') {
        setPhase(payload.phase)
        const currentWords = payload.words || wordsRef.current
        if (payload.phase === 'play' && currentWords.length > 0 && !gridBuiltRef.current) {
          setGrid(buildGrid(currentWords))
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

    s.on('phase_change', ({ phase: newPhase, phaseEnd: newPhaseEnd }) => {
      setPhase(newPhase)
      setPhaseEnd(newPhaseEnd ? new Date(newPhaseEnd) : null)
    })

    s.on('score_update', ({ scores: updatedScores }) => setScores(updatedScores || []))

    s.on('chat_message', (message) => {
      setChatMessages((prev) => [...prev, message])
    })

    s.on('settings_updated', ({ settings }) => {
      setRoomSettings(settings)
    })

    s.on('ready_status_updated', ({ playersReady: updatedReady }) => {
      setPlayersReady(updatedReady || [])
      const token = getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setIsPlayerReady((updatedReady || []).some((id) => id === payload.id))
        } catch (e) {
          console.error('Error parsing token:', e)
        }
      }
    })

    s.on('drop', ({ word, valid, duplicate, path }) => {
      if (valid && !duplicate) {
        const canonical = word.toUpperCase()
        setFound((prev) => new Set(prev).add(canonical))
        if (path) {
          setFoundPaths((prev) => [...prev, { word: canonical, path }])
        }
      }
    })

    return () => {
      s.disconnect()
    }
  }, [code, userId])

  // Timer logic for entry phase
  useEffect(() => {
    if (phase !== 'entry' || !phaseEnd) return
    const initialRemaining = Math.max(0, Math.ceil((phaseEnd - new Date()) / 1000))
    setTimer(initialRemaining)

    const interval = setInterval(() => {
      const currentTimer = Math.max(0, Math.ceil((phaseEnd - new Date()) / 1000))
      setTimer(currentTimer)

      if (currentTimer <= 0 && phase === 'entry' && socketRef.current) {
        socketRef.current.emit('check_phase', { roomCode: code })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, phaseEnd, code])

  // Handlers
  const getCurrentUserWordCount = () => {
    if (!userId || !playerWords) return 0
    const userWordEntry = playerWords.find((pw) => pw.user === userId)
    return userWordEntry ? userWordEntry.words.length : 0
  }

  const addWords = () => {
    if (phase !== 'entry' || timer <= 0) return

    const currentWordCount = getCurrentUserWordCount()
    if (currentWordCount >= roomSettings.wordsPerPlayer) {
      return
    }

    const remainingSlots = roomSettings.wordsPerPlayer - currentWordCount

    const newWords = inputWords
      .split(/[,\n\s]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2)
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, remainingSlots)

    if (!newWords.length) {
      setError('Please enter at least one word with 2 or more characters.')
      setTimeout(() => setError(''), 3000)
      return
    }

    socketRef.current?.emit('word_input', {
      roomCode: code,
      words: newWords,
      userId,
      justAdd: true
    })
    setInputWords('')
    setError('')
  }

  const submitAndStart = () => {
    if (phase !== 'entry' || timer <= 0) return
    const newWords = inputWords
      .split(/[,\n\s]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2)
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, roomSettings.wordsPerPlayer)

    socketRef.current?.emit('word_input', {
      roomCode: code,
      words: newWords,
      userId,
      submit: true
    })
    setInputWords('')
    setError('')
  }

  // Word selection drop event
  const handleWordSelected = useCallback((matchedWord, selectedPath) => {
    socketRef.current?.emit('drop', {
      roomCode: code,
      word: matchedWord,
      userId,
      path: selectedPath
    })
  }, [code, userId])

  const finalizeGame = async () => {
    const token = getToken()
    if (!token) {
      setError('Authentication required. Please sign in again.')
      return
    }

    if (scores.length === 0) {
      setError('No scores to finalize. Find words to score points!')
      return
    }

    setIsLoading(true)
    try {
      await api(`/api/rooms/${code}/finalize`, { method: 'POST', token })
      const topScore = Math.max(...scores.map((s) => s.score))
      const winnerList = scores
        .filter((s) => s.score === topScore)
        .map((s) => s.username || 'Player')

      setWinnerDialog({
        isOpen: true,
        winners: winnerList,
        topScore
      })
    } catch (e) {
      console.error('Finalize error:', e)
      setError(`Failed to finalize game: ${e.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const executeReset = () => {
    setResetDialog(false)
    setIsLoading(true)
    socketRef.current?.emit('reset_game', { roomCode: code })

    setPhase('lobby')
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

    setTimeout(() => setIsLoading(false), 800)
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (err) {
      console.error('Failed to copy room code:', err)
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
    socketRef.current.emit('toggle_ready', { roomCode: code, userId })
  }

  const updateSettings = (newSettings) => {
    if (!socketRef.current || !userId || !isHost) return
    socketRef.current.emit('update_settings', {
      roomCode: code,
      settings: newSettings,
      userId
    })
  }

  const handleSendMessage = useCallback((msgText) => {
    if (!socketRef.current || !userId || !code) return
    socketRef.current.emit('chat_message', {
      roomCode: code,
      message: msgText,
      userId
    })
  }, [code, userId])

  const isHost = useMemo(() => {
    const token = getToken()
    if (!token) return false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return room && room.host && payload.id === (room.host._id || room.host)
    } catch {
      return false
    }
  }, [room])

  // Loading View
  if (isLoading && !room) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-8 flex flex-col items-center shadow-2xl space-y-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <h3 className="text-base font-bold text-white">Connecting to Room</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Fetching game state and synchronizing room participants...
          </p>
        </div>
      </div>
    )
  }

  // Error View
  if (error && !room) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh] p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-slate-900/90 backdrop-blur-md p-8 flex flex-col items-center text-center shadow-2xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Room Unavailable</h3>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
          <div className="flex gap-2.5 w-full pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-xs font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {phase === 'lobby' && (
        <Lobby
          code={code}
          copyRoomCode={copyRoomCode}
          players={players}
          room={room}
          isLoading={isLoading}
          toggleReady={toggleReady}
          connectionStatus={connectionStatus}
          isPlayerReady={isPlayerReady}
          isHost={isHost}
          roomSettings={roomSettings}
          setRoomSettings={setRoomSettings}
          updateSettings={updateSettings}
          socketRef={socketRef}
          userId={userId}
          playersReady={playersReady}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      )}

      {phase === 'entry' && (
        <Entry
          inputWords={inputWords}
          setInputWords={setInputWords}
          timer={timer}
          addWords={addWords}
          roomSettings={roomSettings}
          submitAndStart={submitAndStart}
          words={words}
          error={error}
          players={players}
          playerSubmissions={playerSubmissions}
          getCurrentUserWordCount={getCurrentUserWordCount}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          connectionStatus={connectionStatus}
          userId={userId}
        />
      )}

      {phase === 'play' && (
        <Play
          code={code}
          copyRoomCode={copyRoomCode}
          connectionStatus={connectionStatus}
          memoWords={memoWords}
          found={found}
          scores={scores}
          isHost={isHost}
          resetGame={() => setResetDialog(true)}
          isLoading={isLoading}
          finalizeGame={finalizeGame}
          memoGrid={memoGrid}
          foundPaths={foundPaths}
          onWordSelected={handleWordSelected}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          userId={userId}
        />
      )}

      <WinnerModal
        isOpen={winnerDialog.isOpen}
        onClose={() => setWinnerDialog({ isOpen: false, winners: [], topScore: 0 })}
        winners={winnerDialog.winners}
        topScore={winnerDialog.topScore}
        onViewLeaderboard={() => {
          setWinnerDialog({ isOpen: false, winners: [], topScore: 0 })
          navigate('/leaderboard')
        }}
      />

      <ResetModal
        isOpen={resetDialog}
        onClose={() => setResetDialog(false)}
        onConfirm={executeReset}
      />
    </>
  )
}
