import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, Map, Plus, Users } from 'lucide-react'
import { api, type Stats } from '../lib/api'
import { LeaderboardNavLink } from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'

function LandingAuthCtas() {
  const { user } = useAuth()

  if (user) return null

  return (
    <div className="flex gap-3 text-sm">
      <Link to="/login" className="flex-1 rounded-xl border border-outline/30 py-2.5 text-center font-medium">
        Sign In
      </Link>
      <Link
        to="/signup"
        className="flex-1 rounded-xl bg-primary/10 py-2.5 text-center font-medium text-primary"
      >
        Get Started
      </Link>
    </div>
  )
}

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
  }, [])

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

  return (
    <div className="space-y-6">
      <div className="space-y-3 pt-2">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          AI-Powered Resilience
        </span>
        <h1 className="text-3xl font-bold leading-tight text-on-surface">
          Report Local Issues. Improve Your Community.
        </h1>
        <p className="text-sm leading-relaxed text-on-surface/70">
          Empower Dehradun with infrastructure intelligence. Snap a photo of a pothole, broken light, or hazard—our AI analyzes and routes it to PWD, Jal Sansthan, UPCL, or Nagar Nigam instantly.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          to="/report"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-semibold text-white shadow-sm"
        >
          <Plus size={20} /> Report an Issue
        </Link>
        <Link
          to="/map"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline/30 bg-white py-3.5 font-semibold text-on-surface"
        >
          <Map size={20} /> View Community Map
        </Link>
        <LandingAuthCtas />
        <div className="text-center">
          <LeaderboardNavLink />
        </div>
      </div>

      <div className="grid gap-3">
        {[
          { icon: FileText, label: 'Total Reports', value: stats?.total_reports ?? 0, color: 'bg-blue-50 text-primary' },
          { icon: CheckCircle2, label: 'Resolved', value: stats?.resolved_reports ?? 0, color: 'bg-green-50 text-secondary' },
          { icon: Users, label: 'Active Members', value: stats?.active_members ?? 0, color: 'bg-amber-50 text-amber-700' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-outline/15 bg-white p-4 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold">{fmt(value)}</p>
              <p className="text-sm text-on-surface/60">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
