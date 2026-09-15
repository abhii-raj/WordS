import { RotateCcw } from 'lucide-react'
import Modal from './Modal'

export default function ResetModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a New Round"
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <RotateCcw className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Starting a new round will clear all current board tiles, word submissions, and round scores.
          </p>
        </div>

        <div className="flex gap-2.5 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 py-2 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 transition-all"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </Modal>
  )
}
