import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send } from 'lucide-react'

const ChatBox = ({
  chatMessages = [],
  onSendMessage,
  connectionStatus = 'connected',
  currentUserId,
  className = ''
}) => {
  const [inputVal, setInputVal] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  const handleSend = () => {
    const trimmed = inputVal.trim()
    if (!trimmed || connectionStatus !== 'connected') return
    onSendMessage?.(trimmed)
    setInputVal('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={`rounded-2xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-md shadow-xl flex flex-col overflow-hidden ${className}`}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Room Chat
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {chatMessages.length} {chatMessages.length === 1 ? 'msg' : 'msgs'}
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto min-h-[160px] max-h-[340px]">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 space-y-1">
            <MessageSquare className="h-6 w-6 stroke-1 text-slate-600" />
            <p className="text-xs">No chat messages yet.</p>
          </div>
        ) : (
          chatMessages.map((msg, index) => {
            const isSelf = msg.userId === currentUserId
            return (
              <div key={index} className="text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      isSelf ? 'text-indigo-400' : 'text-slate-300'
                    }`}
                  >
                    {msg.username || 'Player'}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] text-indigo-400/70 font-medium">
                      (You)
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''}
                  </span>
                </div>
                <div
                  className={`rounded-xl p-2.5 leading-relaxed break-words text-slate-200 text-xs border ${
                    isSelf
                      ? 'bg-indigo-950/60 border-indigo-800/60'
                      : 'bg-slate-800/70 border-slate-700/60'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
            disabled={connectionStatus !== 'connected'}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={connectionStatus !== 'connected' || !inputVal.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20"
            title="Send Message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ChatBox)
