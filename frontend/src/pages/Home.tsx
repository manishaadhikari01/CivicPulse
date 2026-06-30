import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import { api, type Report } from '../lib/api'
import { formatSla, severityColor } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import MascotBubble from '../components/MascotBubble'

export default function Home() {
  const { user } = useAuth()

  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    api.reports({ limit: '5' }).then(setReports).catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Hello, {user?.name || 'there'}!</h1>
        <p className="text-sm text-on-surface/60">Here's what's happening near you.</p>
      </div>

      <div className="w-full">
        {user ? (
          <MascotBubble
            expression="greeting"
            size="lg"
            title="Welcome back"
            message={`Hi ${user.name}! Every report makes our city stronger. Ready to improve your neighbourhood today?`}
          />
        ) : (
          <MascotBubble
            expression="greeting"
            title="Welcome back"
            message="Hi! Every report makes our city stronger. Ready to improve your neighbourhood today?"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        
        <Link
          to="/report"
          className="block flex-1 rounded-2xl bg-primary-container p-6 text-white shadow-sm transition hover:opacity-95"
        >
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/95">📸 Report a New Issue</p>
            <p className="text-sm leading-relaxed text-white/85">
              Snap a photo. I'll identify the issue, find the right department, and prepare your report.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold">
                Report Now
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-outline/15 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">📊 Your Activity</h2>
            <p className="mt-1 text-xs text-on-surface/60">Quick snapshot of your reporting progress.</p>
          </div>
          <Link
            to="/profile"
            className="rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-outline/15 bg-white p-4">
            <p className="text-xs font-medium text-on-surface/60">Active Reports</p>
            <p className="mt-1 text-2xl font-bold text-primary">—</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4">
            <p className="text-xs font-medium text-on-surface/60">Reports Resolved</p>
            <p className="mt-1 text-2xl font-bold text-secondary">—</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4">
            <p className="text-xs font-medium text-on-surface/60">XP Earned</p>
            <p className="mt-1 text-2xl font-bold text-on-surface">{user ? user.xp : '—'}</p>
          </div>
          <div className="rounded-2xl border border-outline/15 bg-white p-4">
            <p className="text-xs font-medium text-on-surface/60">Latest Badge</p>
            <p className="mt-1 text-2xl font-bold text-on-surface">—</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="mb-1">
          <h2 className="text-base font-bold">📍 Issues Around You</h2>
        </div>
        {reports.map((r) => (
          <Link
            key={r.id}
            to={`/issues/${r.id}`}
            className="block overflow-hidden rounded-2xl border border-outline/15 bg-white shadow-sm"
          >
            <div className="flex gap-3 p-3">
              {r.image_url && (
                <img src={r.image_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${severityColor(r.severity)}`}
                  >
                    {r.severity}
                  </span>

                  {r.department && (
                    <span className="text-xs text-on-surface/60">{r.department}</span>
                  )}

                  {r.status !== 'resolved' && (
                    <span className="text-xs text-on-surface/50">{formatSla(r.sla_remaining_seconds)} left</span>
                  )}
                </div>

                <p className="truncate font-semibold">{r.title}</p>
                <p className="truncate text-xs text-on-surface/60">{r.location_text}</p>

                <p className="mt-1 text-xs text-on-surface/50">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Link>
        ))}
        {!reports.length && (
          <p className="rounded-xl bg-surface-container p-4 text-center text-sm text-on-surface/60">No reports yet. Be the first to report an issue!</p>
        )}
      </div>

      <div className="ai-pulse rounded-2xl bg-primary-container p-4 text-white">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Sparkles size={18} /> Pulse's Insight
        </div>
        <p className="text-sm text-white/90">
          Hey! Keep an eye on Zone B when the rains start—small issues can pop up quickly. If you spot something early, you'll help the right teams respond faster.
        </p>
      </div>

      <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Daily Motivation</h2>
            <p className="mt-1 text-sm text-on-surface/70">
              "One report today, a safer street tomorrow."
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-on-surface/50">— Pulse 🐾</p>
      </div>
    </div>
  )
}
