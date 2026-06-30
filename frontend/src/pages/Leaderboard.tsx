import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { api, type LeaderboardEntry } from '../lib/api'
import { badgeLabel, levelFromXp } from '../lib/utils'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [period, setPeriod] = useState<'weekly' | 'all'>('all')

  useEffect(() => {
    api.leaderboard(period).then(setEntries).catch(() => {})
  }, [period])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-bold">Community Heroes</h1>
        <p className="text-sm text-on-surface/60">Celebrating citizens driving resilient infrastructure in Dehradun.</p>
      </div>

      <div className="inline-flex rounded-full border border-outline/20 bg-white p-1 text-sm">
        {(['weekly', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 font-medium capitalize ${period === p ? 'bg-primary-container text-white' : 'text-on-surface/60'}`}
          >
            {p === 'all' ? 'All Time' : 'Weekly Top 5'}
          </button>
        ))}
      </div>

      {top3[0] && (
        <div className="rounded-2xl bg-primary-container p-5 text-white shadow-md">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold"><Trophy size={12} /> RANK #1</span>
          <p className="mt-3 text-xl font-bold">{top3[0].name}</p>
          <p className="text-sm text-white/80">{top3[0].xp.toLocaleString()} XP · Level {levelFromXp(top3[0].xp)}</p>
          <p className="mt-1 text-xs text-white/70">{top3[0].report_count} reports</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {top3.slice(1).map((e) => (
          <div key={e.id} className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold text-primary">RANK #{e.rank}</span>
            <p className="font-semibold">{e.name}</p>
            <p className="text-sm text-on-surface/60">{e.xp} XP · Level {levelFromXp(e.xp)}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Top Contributors</h2>
        <div className="space-y-2">
          {rest.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-outline/10 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-sm font-bold">{e.rank}</span>
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-on-surface/50">{e.report_count} reports</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">{e.xp} XP</p>
                {e.badges[0] && <p className="text-xs text-secondary">{badgeLabel(e.badges[0])}</p>}
              </div>
            </div>
          ))}
          {!entries.length && <p className="text-center text-sm text-on-surface/50">No leaderboard data yet.</p>}
        </div>
      </div>
    </div>
  )
}
