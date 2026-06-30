import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import { CheckCircle2, MapPin, Sparkles, ThumbsUp } from 'lucide-react'
import { api, type AIAnalysis, type DuplicateInfo } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import MascotBubble from '../components/MascotBubble'

type NavState = {
  file?: File
}

const STEPS = [
  'Checking image quality',
  'Detecting the issue',
  'Finding the responsible department',
  'Checking for nearby duplicates',
] as const

type Step = (typeof STEPS)[number]

function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  })
}

// ── Duplicate Actions Card ──────────────────────────────────────────────────
interface DuplicateActionsProps {
  duplicate: DuplicateInfo
  file: File | undefined
  analysis: AIAnalysis
  navigate: NavigateFunction
}

function DuplicateActions({ duplicate, file, analysis, navigate }: DuplicateActionsProps) {
  const [supporting, setSupporting] = useState(false)
  const [supportResult, setSupportResult] = useState<{ supported: boolean; supporter_count: number; already_supported: boolean } | null>(null)

  const handleSupport = async () => {
    setSupporting(true)
    try {
      const result = await api.supportReport(duplicate.report_id, file ?? null, analysis.severity)
      setSupportResult(result)
      if (result.supported || result.already_supported) {
        // Small delay so user sees the success state, then navigate
        setTimeout(() => {
          navigate(`/issues/${duplicate.report_id}`)
        }, 1200)
      }
    } catch {
      // On error still redirect to the existing report
      navigate(`/issues/${duplicate.report_id}`)
    } finally {
      setSupporting(false)
    }
  }

  if (supportResult?.supported) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <span className="text-2xl">🎉</span>
        <p className="text-sm font-semibold text-green-800">Thank you for supporting this report!</p>
        <p className="text-xs text-green-700">Redirecting to the report…</p>
      </div>
    )
  }

  if (supportResult?.already_supported) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <span className="text-2xl">👍</span>
        <p className="text-sm font-semibold text-amber-800">You've already supported this report.</p>
        <p className="text-xs text-amber-700">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Duplicate meta info pill row */}
      <div className="flex flex-wrap gap-2 text-xs text-on-surface/60">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-1">
          <MapPin size={12} /> {duplicate.distance}m away
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 capitalize">
          {duplicate.severity} severity
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 capitalize">
          {duplicate.status.replace('_', ' ')}
        </span>
        {duplicate.supporter_count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
            <ThumbsUp size={12} /> {duplicate.supporter_count} supporters
          </span>
        )}
      </div>

      {/* Primary action: Support */}
      <button
        type="button"
        onClick={handleSupport}
        disabled={supporting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {supporting ? (
          <span className="animate-pulse">Submitting support…</span>
        ) : (
          <>👍 Support Existing Report</>
        )}
      </button>

      {/* Secondary: create new anyway */}
      <button
        type="button"
        onClick={() => navigate('/review', { state: { file, analysis } })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline/30 bg-white py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
      >
        ➕ Create New Report Anyway
      </button>

      {/* Tertiary text link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate(`/issues/${duplicate.report_id}`)}
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
        >
          View Existing Report
        </button>
      </div>
    </div>
  )
}
// ───────────────────────────────────────────────────────────────────────────

export default function AIAnalysis() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { file } = (location.state || {}) as NavState

  const safeFile = file

  // Keep a stable ref to navigate so effects don't re-run when the
  // router-provided function reference changes between renders.
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const stableNavigate: NavigateFunction = useCallback(
    (...args: Parameters<NavigateFunction>) =>
      (navigateRef.current as Function)(...args),
    [],
  ) as NavigateFunction

  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(() => new Set())
  const [started, setStarted] = useState(false)

  const stepIndexByCompletion = useMemo(() => {
    const arr = Array.from(completedSteps)
    const idxs = arr.map((s) => STEPS.indexOf(s))
    return idxs.length ? Math.max(...idxs) : -1
  }, [completedSteps])

  useEffect(() => {
    if (!safeFile) {
      stableNavigate('/report', { replace: true })
      return
    }

    if (!token) {
      stableNavigate('/login', { replace: true, state: { redirectTo: '/ai-analysis' } })
      return
    }

    setStarted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeFile, token])

  useEffect(() => {
    if (!started || !safeFile) return

    let cancelled = false

    const tickDelays = [600, 1000, 1400, 1800]

    tickDelays.forEach((d, idx) => {
      window.setTimeout(() => {
        if (cancelled) return
        setCompletedSteps((prev) => {
          const next = new Set(prev)
          next.add(STEPS[idx])
          return next
        })
      }, d)
    })

    getUserLocation().then((coords) => {
      if (cancelled) return
      return api.analyze(safeFile, coords?.latitude, coords?.longitude)
    })
      .then((result) => {
        if (cancelled || !result) return
        setAnalysis(result)
        setCompletedSteps(new Set(STEPS))

        if (!result.issue_detected) {
          setError(result.reason || 'No reportable civic infrastructure issue detected in this image.')
          return
        }

        if (result.duplicate_found && result.duplicate) {
          // Stay on this page to show the duplicate UI
          return
        }

        stableNavigate('/review', { state: { file: safeFile, analysis: result } })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Analysis failed')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, safeFile])

  const duplicate = analysis?.duplicate
  const isDuplicate = analysis?.duplicate_found && duplicate

  return (
    <div className="space-y-5 pb-4">
      {/* Mascot: switches to announcement expression when duplicate found */}
      <MascotBubble
        expression={isDuplicate ? 'announcement' : 'analyzing'}
        title={isDuplicate ? 'Similar issue already reported' : 'Analyzing your report...'}
        message={
          isDuplicate
            ? `I found a similar issue nearby.\n\nSupporting the existing report helps the municipality prioritize repairs instead of creating duplicate reports.`
            : 'Pulse is preparing your report details.'
        }
      />

      <div className="ai-pulse space-y-4 rounded-2xl border border-primary/20 bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <Sparkles size={14} /> AI Intelligence Analysis
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isComplete = completedSteps.has(step)
            return (
              <div key={step} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                    isComplete ? 'border-primary/30 bg-primary/10' : 'border-outline/30 bg-surface-container'
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={18} className="text-secondary" /> : <span className="text-sm">{i + 1}</span>}
                </span>
                <p className={`text-sm ${isComplete ? 'text-on-surface' : 'text-on-surface/60'}`}>{step}</p>
              </div>
            )
          })}
        </div>

        {/* Duplicate found — new action flow */}
        {isDuplicate && (
          <DuplicateActions
            duplicate={duplicate}
            file={safeFile}
            analysis={analysis}
            navigate={stableNavigate}
          />
        )}

        {error && (
          <div className="space-y-3 rounded-xl border border-error/20 bg-error/5 p-4">
            <p className="text-sm text-error">{error}</p>
            <button
              type="button"
              onClick={() => stableNavigate('/report', { replace: true })}
              className="w-full rounded-xl bg-primary-container py-2.5 text-sm font-semibold text-white"
            >
              Upload a different photo
            </button>
          </div>
        )}
        {!analysis && !error && <p className="text-xs text-on-surface/50">This will take a moment…</p>}

        {stepIndexByCompletion < 0 && <div className="h-2 w-full rounded bg-surface-container" />}
      </div>
    </div>
  )
}

