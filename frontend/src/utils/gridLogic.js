
export function buildGrid(words, size = 8) {
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
