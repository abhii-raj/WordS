import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function RoomHeader({ code, connectionStatus = 'connected', onCopy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy()
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

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Room</span>
          <span className="font-mono text-base font-extrabold text-white tracking-wider">{code}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Copy room code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Connection Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                : connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span
            className={
              connectionStatus === 'connected'
                ? 'text-emerald-400 font-semibold'
                : connectionStatus === 'connecting'
                ? 'text-amber-400'
                : 'text-rose-400'
            }
          >
            {connectionStatus === 'connected'
              ? 'Online'
              : connectionStatus === 'connecting'
              ? 'Connecting'
              : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}
