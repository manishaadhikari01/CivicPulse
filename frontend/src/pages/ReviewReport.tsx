import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, Crosshair, Send } from 'lucide-react'
import { api, type AIAnalysis } from '../lib/api'
import { reverseGeocode } from '../lib/reverseGeocode'
import { useAuth } from '../context/AuthContext'
type NavState = {
  file?: File
  analysis?: AIAnalysis
}

export default function ReviewReport() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()


  const { file, analysis } = (location.state || {}) as NavState

  const [submitting, setSubmitting] = useState(false)

  const defaultForm = useMemo(() => {
    const a = analysis
    return {
      title: a?.title || '',
      description: a?.description || '',
      issue_type: a?.issue_type || '',
      severity: a?.severity || 'medium',
      department: a?.department || 'PWD',
      // Prefilled after geolocation + reverse geocoding.
      location_text: '',
      latitude: 0,
      longitude: 0,
      zone: '',
      confidence: a?.confidence ?? 0,
    }
  }, [analysis])

  const [form, setForm] = useState(defaultForm)

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setForm((p) => ({ ...p, location_text: 'Location unavailable' }))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        let address = ''
        try {
          address = await reverseGeocode(lat, lng)
        } catch {
          // If reverse-geocoding fails, fall back to a readable coordinate string.
          address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        }

        setForm((p) => ({
          ...p,
          latitude: lat,
          longitude: lng,
          location_text: address,
        }))
      },
      (err) => {
        // Permission denied or unavailable.
        console.warn('Geolocation failed', err)
        setForm((p) => ({ ...p, location_text: 'Location unavailable' }))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    )
  }


  // Prefill as soon as the review page opens (without changing submit workflow).
  useEffect(() => {

    requestUserLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const submit = async () => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (!file) return

    setSubmitting(true)
    try {
      const report = await api.createReport(form, file)
      navigate(`/issues/${report.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!file || !analysis || !analysis.issue_detected) {
    return (
      <div className="space-y-4 pb-4">
        <p className="text-center text-on-surface/60">Missing analysis data. Please try again.</p>
        <button
          type="button"
          className="w-full rounded-xl bg-primary-container py-3.5 font-semibold text-white"
          onClick={() => navigate('/report', { replace: true })}
        >
          Go to Report
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="space-y-2 rounded-2xl border border-primary/20 bg-white p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <AlertCircle size={16} /> Review & submit your report
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-outline/15 bg-white p-3 text-sm">
            <Building2 size={16} className="mb-1 text-primary" /> Department: {form.department}
          </div>
          <div className="rounded-xl border border-outline/15 bg-white p-3 text-sm">
            <span className="text-sm font-medium">Confidence</span>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full bg-primary-container" style={{ width: `${form.confidence * 100}%` }} />
              </div>
              <span className="text-sm font-bold">{Math.round(form.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-outline/15 bg-white p-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-outline/30 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-outline/30 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Location</span>
          <div className="flex gap-2">
            <input
              value={form.location_text}
              onChange={(e) => setForm({ ...form, location_text: e.target.value })}
              className="flex-1 rounded-lg border border-outline/30 px-3 py-2"
            />
            <button type="button" onClick={requestUserLocation} className="rounded-lg bg-surface-container px-3 text-primary">
              <Crosshair size={18} />
            </button>

          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Urgency</span>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full rounded-lg border border-outline/30 px-3 py-2"
            >
              {['critical', 'high', 'medium', 'low'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Department</span>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full rounded-lg border border-outline/30 px-3 py-2"
            >
              {['PWD', 'Jal Sansthan', 'UPCL', 'Nagar Nigam'].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !form.title}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-semibold text-white disabled:opacity-50"
      >
        <Send size={18} /> {submitting ? 'Submitting…' : 'Submit Report'}
      </button>
    </div>
  )
}

