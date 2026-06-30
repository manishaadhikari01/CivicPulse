import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, type Report } from '../lib/api'
import { levelFromXp } from '../lib/utils'


export default function Profile() {
  const { user, logout, token } = useAuth()

  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoadingReports(true)
    api.reportsMe()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false))
  }, [token])

  if (!token || !user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-on-surface/60">Sign in to view your profile and report history.</p>
        <Link to="/login" className="inline-block rounded-xl bg-primary-container px-6 py-3 font-semibold text-white">Sign In</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-outline/15 bg-white p-5 shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-2xl font-bold text-white">
          {(user ? user.name.charAt(0) : 'D')}
        </div>
        <h1 className="text-xl font-bold">{user ? user.name : 'Demo Official'}</h1>
        <p className="text-sm text-on-surface/60">{user ? user.email : 'demo@civicpulse.gov'}</p>
        <div className="mt-4 flex gap-4">
          <div>
            <p className="text-2xl font-bold text-primary">{user ? user.xp : 1200}</p>
            <p className="text-xs text-on-surface/50">XP</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">Lv {levelFromXp(user ? user.xp : 1200)}</p>
            <p className="text-xs text-on-surface/50">Level</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">My Complaints</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-on-surface/60">Reports Submitted</p>
            <p className="mt-1 text-xl font-bold text-primary">{reports.length}</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-on-surface/60">Pending</p>
            <p className="mt-1 text-xl font-bold text-secondary">{reports.filter((r) => r.status === 'Pending').length}</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-on-surface/60">Resolved</p>
            <p className="mt-1 text-xl font-bold text-success">{reports.filter((r) => r.status === 'Resolved').length}</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-on-surface/60">XP</p>
            <p className="mt-1 text-xl font-bold text-on-surface">{user.xp}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {loadingReports ? (
            <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm text-sm text-on-surface/60">
              Loading complaints...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-on-surface/70">No complaints yet.</p>
              <p className="mt-1 text-xs text-on-surface/50">Submit an issue to see it here.</p>
            </div>
          ) : (
            reports.map((c) => (
              <Link
                key={c.id}
                to={`/issues/${c.id}`}
                className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm hover:bg-surface-container transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="mt-1 text-sm text-on-surface/60">{c.location_text}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      c.status === 'Pending'
                        ? 'bg-primary/10 text-primary'
                        : c.status === 'In Progress'
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-success/10 text-success'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-on-surface/50">
                  <span>Date created</span>
                  <span className="font-medium text-on-surface/60">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>


      <Link to="/leaderboard" className="flex items-center gap-3 rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
        <Trophy className="text-primary" />
        <span className="font-medium">View Leaderboard</span>
      </Link>

      <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline/20 py-3 text-sm font-medium text-error">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  )
}
