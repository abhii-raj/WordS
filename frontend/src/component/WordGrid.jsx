import { useState, useEffect, useRef, useCallback } from 'react'

export default function WordGrid({
  grid = [],
  targetWords = [],
  foundPaths = [],
  onWordSelected
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [startCell, setStartCell] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const gridContainerRef = useRef(null)

  // Calculate straight line of cells from start to current
  const computeLine = useCallback((start, current) => {
    if (!start || !current) return []
    if (start.r === current.r && start.c === current.c) {
      return [start]
    }

    const dr = current.r - start.r
    const dc = current.c - start.c

    // Must be horizontal, vertical, or diagonal (45 deg)
    const isHorizontal = dr === 0 && dc !== 0
    const isVertical = dc === 0 && dr !== 0
    const isDiagonal = Math.abs(dr) === Math.abs(dc) && dr !== 0

    if (!isHorizontal && !isVertical && !isDiagonal) {
      return null
    }

    const stepR = Math.sign(dr)
    const stepC = Math.sign(dc)
    const steps = Math.max(Math.abs(dr), Math.abs(dc))

    const line = []
    for (let i = 0; i <= steps; i++) {
      line.push({
        r: start.r + i * stepR,
        c: start.c + i * stepC
      })
    }
    return line
  }, [])

  // Start selection
  const handlePointerDown = (r, c) => (e) => {
    e.preventDefault()
    setIsDragging(true)
    setStartCell({ r, c })
    setSelectedCells([{ r, c }])
  }

  // Extend selection smoothly along straight vector
  const handlePointerEnter = (r, c) => () => {
    if (!isDragging || !startCell) return
    const line = computeLine(startCell, { r, c })
    if (line) {
      setSelectedCells(line)
    }
  }

  // Finalize selection
  const finishSelection = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    if (selectedCells.length >= 2) {
      const forwardWord = selectedCells
        .map(({ r, c }) => grid[r]?.[c] || '')
        .join('')
        .toUpperCase()
      const reverseWord = forwardWord.split('').reverse().join('').toUpperCase()

      const upperTargets = targetWords.map((w) => String(w || '').toUpperCase().trim())

      let matchedWord = null
      if (upperTargets.includes(forwardWord)) {
        matchedWord = forwardWord
      } else if (upperTargets.includes(reverseWord)) {
        matchedWord = reverseWord
      }

      if (matchedWord) {
        onWordSelected?.(matchedWord, selectedCells)
      }
    }

    setStartCell(null)
    setSelectedCells([])
  }, [isDragging, selectedCells, grid, targetWords, onWordSelected])

  // Global pointer up listener so releasing mouse anywhere completes selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        finishSelection()
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [isDragging, finishSelection])

  // Touch move support
  const handleTouchMove = (e) => {
    if (!isDragging || !startCell) return
    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    if (target && target.dataset && target.dataset.r !== undefined) {
      const r = parseInt(target.dataset.r, 10)
      const c = parseInt(target.dataset.c, 10)
      const line = computeLine(startCell, { r, c })
      if (line) {
        setSelectedCells(line)
      }
    }
  }

  // Check if a cell is in found word paths
  const isCellFound = (r, c) => {
    for (const foundData of foundPaths) {
      if (foundData.path && foundData.path.some((cell) => cell.r === r && cell.c === c)) {
        return true
      }
    }
    return false
  }

  const numCols = grid[0]?.length || 8

  return (
    <div className="w-full flex flex-col items-center select-none">
      <div className="mb-3 text-center">
        <span className="text-xs font-semibold text-indigo-300/80 tracking-wide">
          Drag horizontally, vertically, or diagonally to select words
        </span>
      </div>

      <div
        ref={gridContainerRef}
        onTouchMove={handleTouchMove}
        className="inline-grid select-none gap-2 sm:gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl touch-none max-w-full overflow-auto backdrop-blur-md"
        style={{
          gridTemplateColumns: `repeat(${numCols}, minmax(2.4rem, 1fr))`
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((letter, c) => {
            const isSelected = selectedCells.some((cell) => cell.r === r && cell.c === c)
            const selectionIndex = selectedCells.findIndex((cell) => cell.r === r && cell.c === c)
            const isStart = isSelected && selectionIndex === 0
            const isEnd = isSelected && selectionIndex === selectedCells.length - 1 && selectedCells.length > 1
            const foundState = isCellFound(r, c)

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-r={r}
                data-c={c}
                onMouseDown={handlePointerDown(r, c)}
                onMouseEnter={handlePointerEnter(r, c)}
                onTouchStart={handlePointerDown(r, c)}
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 text-base sm:text-lg md:text-xl font-mono font-extrabold flex items-center justify-center rounded-xl transition-all duration-100 ${
                  isSelected
                    ? `tile-selected ${
                        isStart ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900' : ''
                      } ${
                        isEnd ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''
                      }`
                    : foundState
                    ? 'tile-found'
                    : 'bg-slate-800/80 border border-slate-700/70 text-slate-100 shadow-xs hover:bg-indigo-900/40 hover:border-indigo-500/50 active:scale-95'
                }`}
              >
                {letter}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
