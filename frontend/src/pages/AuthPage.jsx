import { useState } from 'react'
import { api, setToken } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') {
        const { token } = await api('/api/auth/signup', { method: 'POST', body: form })
        setToken(token)
      } else {
        const { token } = await api('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
        setToken(token)
      }
      navigate('/')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h2 className="text-2xl font-semibold mb-4">{mode === 'signup' ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input className="w-full rounded-md border px-3 py-2" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        )}
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full rounded-md border px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="w-full rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700" type="submit">{mode === 'signup' ? 'Create account' : 'Login'}</button>
      </form>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      <button className="mt-4 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        Switch to {mode === 'signup' ? 'Login' : 'Sign Up'}
      </button>
    </div>
  )
}
