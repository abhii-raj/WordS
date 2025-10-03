import { useEffect, useState } from 'react'
import { api, getToken } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function LobbyPage() {
  const [code, setCode] = useState('')
  const [words, setWords] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const createRoom = async () => {
    setError('')
    try {
      const token = getToken()
      if (!token) return navigate('/auth')
      const room = await api('/api/rooms', { method: 'POST', token })
      navigate(`/room/${room.code}`)
    } catch (e) {
      setError(e.message)
    }
  }

  const joinRoom = async () => {
    setError('')
    try {
      const token = getToken()
      if (!token) return navigate('/auth')
      const room = await api(`/api/rooms/${code}/join`, { method: 'POST', token })
      navigate(`/room/${room.code}`)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold mb-4">Lobby</h2>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700" onClick={createRoom}>Create Room</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
        <input className="flex-1 rounded-md border px-3 py-2 uppercase" placeholder="Enter room code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="rounded-md border px-4 py-2 hover:bg-gray-50" onClick={joinRoom}>Join</button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <p className="text-sm text-gray-600">After creating a room, all players will input words in the room page before starting the game.</p>
    </div>
  )
}
