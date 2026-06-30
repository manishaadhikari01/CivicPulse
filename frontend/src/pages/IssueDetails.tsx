import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Clock, Flame, MapPin, Share2, Sparkles } from 'lucide-react'
import { api, type Report } from '../lib/api'
import { formatSla, severityColor } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Open', 'Verified', 'Assigned', 'In Progress', 'Resolved']

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (isNaN(diffMs)) return '—'
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSecs < 60) return 'just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function IssueDetails() {
  const { id } = useParams()
  const { token } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [updates, setUpdates] = useState<Array<{ id: number; content: string; is_ai: boolean; created_at: string }>>([])
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!id) return
    api.report(Number(id)).then(setReport).catch(() => {})
    api.reportUpdates(Number(id)).then(setUpdates).catch(() => {})
  }, [id])

  const postUpdate = async () => {
    if (!comment.trim() || !id) return
    await api.postUpdate(Number(id), comment)
    setComment('')
    api.reportUpdates(Number(id)).then(setUpdates)
  }

  if (!report) {
    return <p className="text-center text-on-surface/60">Loading report…</p>
  }

  const statusToStepIndex = (status: string) => {
    switch (status) {
      case 'open':
        return 0
      case 'verified':
        return 1
      case 'assigned':
        return 2
      case 'in_progress':
        return 3
      case 'resolved':
        return 4
      default:
        return 0
    }
  }

  const currentStepIndex = statusToStepIndex(report.status)
  const totalSupporters = (report.supporter_count ?? 0) + 1 // +1 for the original reporter

  return (
    <div className="space-y-4 pb-4">

      <div className="flex items-center justify-between">
        <Link to="/map" className="rounded-lg p-1 hover:bg-surface-container"><ArrowLeft size={20} /></Link>
        <h1 className="text-sm font-semibold">Report #{report.id}</h1>
        <button type="button" className="rounded-lg p-1 hover:bg-surface-container"><Share2 size={18} /></button>
      </div>

      {report.image_url && (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={report.image_url} alt="" className="max-h-56 w-full object-cover" />
          <span className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${severityColor(report.severity)}`}>
            {report.severity} severity
          </span>
        </div>
      )}

      {/* Community Verified Section */}
      {report.supporter_count > 0 && (
        <div className="rounded-2xl border border-outline/15 bg-white p-4 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-orange-600">
            <Flame size={16} className="fill-orange-500 text-orange-500" />
            <span className="text-sm">🔥 Community Verified</span>
          </div>
          <div className="text-xs text-on-surface/70 space-y-0.5">
            <p>Reported by <strong className="text-on-surface">{totalSupporters} citizen{totalSupporters !== 1 ? 's' : ''}</strong></p>
            <p>Supporters: <strong className="text-on-surface">{report.supporter_count}</strong></p>
            <p className="text-on-surface/50">Latest Update: {formatRelativeTime(report.last_updated || report.created_at)}</p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold">{report.title}</h2>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-outline/15 bg-white p-3 text-sm">
          <Building2 size={16} className="mb-1 text-primary" /> Department: {report.department}
        </div>
        <div className="rounded-xl border border-outline/15 bg-white p-3 text-sm">
          <Clock size={16} className="mb-1 text-error" /> SLA: {formatSla(report.sla_remaining_seconds)}
        </div>
      </div>
      <div className="rounded-xl border border-outline/15 bg-white p-3 text-sm">
        <MapPin size={16} className="mb-1 inline text-secondary" /> {report.location_text}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Activity Feed</h3>
        {updates.map((u) => (
          <div key={u.id} className={`rounded-xl p-3 text-sm ${u.is_ai ? 'bg-primary/5 border border-primary/10' : 'bg-white border border-outline/10'}`}>
            {u.is_ai && <Sparkles size={14} className="mb-1 inline text-primary" />} {u.content}
          </div>
        ))}
        {token && (
          <div className="space-y-2">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write an update..." className="w-full rounded-xl border border-outline/20 px-3 py-2 text-sm" rows={2} />
            <button type="button" onClick={postUpdate} className="rounded-xl bg-primary-container px-4 py-2 text-sm font-medium text-white">Post Update</button>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-on-surface/50">Tracking Status</h3>
        <div className="space-y-3 border-l-2 border-primary/20 pl-4">
          {STEPS.map((step, i) => (
            <div key={step} className="relative">
              <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${i <= currentStepIndex ? 'bg-primary-container' : 'bg-outline/30'}`} />
              <p className={`text-sm font-medium ${i <= currentStepIndex ? 'text-on-surface' : 'text-on-surface/40'}`}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-on-surface/50">Reported by {report.reporter_name || 'Citizen'} · {new Date(report.created_at).toLocaleString()}</p>
    </div>
  )
}
