import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api('/api/leaderboard').then(setRows).catch(console.error)
  }, [])

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="py-2 px-3 text-left">Player</th>
              <th className="py-2 px-3 text-right">Points</th>
              <th className="py-2 px-3 text-right">Wins</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="odd:bg-white even:bg-gray-50">
                <td className="py-2 px-3">{r.username}</td>
                <td className="py-2 px-3 text-right">{r.points}</td>
                <td className="py-2 px-3 text-right">{r.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
