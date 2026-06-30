import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Search } from 'lucide-react'
import { api, type Report } from '../lib/api'
import { statusPinColor } from '../lib/utils'
import 'leaflet/dist/leaflet.css'

const DEHRADUN: [number, number] = [30.3165, 78.0322]

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.reports().then(setReports).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (typeFilter && !r.issue_type.toLowerCase().includes(typeFilter.toLowerCase())) return false
      if (search && !`${r.title} ${r.location_text}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [reports, statusFilter, typeFilter, search])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40" />
        <input
          placeholder="Search infrastructure reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-outline/20 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'open', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? 'bg-primary-container text-white' : 'bg-white border border-outline/20'}`}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="h-[55dvh] overflow-hidden rounded-2xl border border-outline/15 shadow-sm">
        <MapContainer center={DEHRADUN} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filtered.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={pinIcon(statusPinColor(r.status, r.severity))}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs capitalize">{r.status} · {r.severity}</p>
                  <Link to={`/issues/${r.id}`} className="text-primary underline">View details</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-on-surface/60">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-600" /> Critical</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-green-700" /> Resolved</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-600" /> Open</span>
      </div>

      <input
        placeholder="Filter by type (e.g. pothole)"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="w-full rounded-lg border border-outline/20 bg-white px-3 py-2 text-sm"
      />
    </div>
  )
}
