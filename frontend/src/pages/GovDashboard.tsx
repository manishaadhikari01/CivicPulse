import { useEffect, useState, useMemo } from 'react'
import {
  LayoutDashboard,
  FileText,
  Map as MapIcon,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Zap,
  Sparkles,
  Filter,
  Download,
  TrendingUp,
  X,
  MessageSquare,
  Shield,
  Activity
} from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { api, type Report, type Stats } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { severityColor, statusPinColor } from '../lib/utils'
import 'leaflet/dist/leaflet.css'

const DEHRADUN: [number, number] = [30.3165, 78.0322]
const DEPARTMENTS = ['', 'PWD', 'Jal Sansthan', 'UPCL', 'Nagar Nigam']

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function GovDashboard() {
  const { user, token, demoOfficial, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'map' | 'analytics' | 'teams' | 'settings'>('dashboard')
  
  // States for stats and reports
  const [stats, setStats] = useState<Stats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Real-time ticking time state
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // SLA live ticking seconds state
  const [slaTicks, setSlaTicks] = useState<Record<number, number>>({})
  
  // Details Modal state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportUpdates, setReportUpdates] = useState<Array<{ id: number; content: string; is_ai: boolean; created_at: string; author_id?: number }>>([])
  const [newUpdateContent, setNewUpdateContent] = useState('')
  
  // Quick Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [newReportData, setNewReportData] = useState({
    title: '',
    description: '',
    issue_type: 'Pothole',
    severity: 'medium',
    department: 'PWD',
    location_text: '',
    latitude: 30.3165,
    longitude: 78.0322,
    zone: 'Central Zone'
  })

  // Load stats and reports
  const loadData = () => {
    if (!token || !user?.is_official) return
    api.govStats().then(setStats).catch(() => {})
    // Load all reports for government use (we'll filter them client side or load all)
    api.reports().then(setReports).catch(() => {})
  }

  useEffect(() => {
    if (token && user?.is_official) {
      loadData()
    }
  }, [token, user])

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Countdown timer effect for SLA
  useEffect(() => {
    if (reports.length === 0) return
    
    // Initialize ticks
    const initialTicks: Record<number, number> = {}
    reports.forEach(r => {
      if (r.sla_remaining_seconds !== null) {
        initialTicks[r.id] = r.sla_remaining_seconds
      }
    })
    setSlaTicks(initialTicks)

    const timer = setInterval(() => {
      setSlaTicks(prev => {
        const next = { ...prev }
        let changed = false
        Object.keys(next).forEach(id => {
          const numId = Number(id)
          if (next[numId] > 0) {
            next[numId] -= 1
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [reports])

  // Format ticking SLA into hh:mm:ss
  const formatTickingSla = (id: number) => {
    const remaining = slaTicks[id]
    if (remaining === undefined) return 'Resolved'
    if (remaining <= 0) return 'Overdue'
    
    const h = Math.floor(remaining / 3600)
    const m = Math.floor((remaining % 3600) / 60)
    const s = remaining % 60
    
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  // Update Report Status
  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateStatus(id, status)
      loadData()
      // If modal is open, refresh updates
      if (selectedReport && selectedReport.id === id) {
        const updated = await api.report(id)
        setSelectedReport(updated)
        api.reportUpdates(id).then(setReportUpdates).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Open Report Details
  const handleOpenDetails = async (report: Report) => {
    setSelectedReport(report)
    setReportUpdates([])
    try {
      const updates = await api.reportUpdates(report.id)
      setReportUpdates(updates)
    } catch (e) {
      console.error(e)
    }
  }

  // Submit comment/update to report
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport || !newUpdateContent.trim()) return
    try {
      await api.postUpdate(selectedReport.id, newUpdateContent)
      setNewUpdateContent('')
      const updates = await api.reportUpdates(selectedReport.id)
      setReportUpdates(updates)
    } catch (e) {
      console.error(e)
    }
  }

  // Submit new report from official dashboard
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createReport({
        ...newReportData,
        confidence: 1.0 // official manually logged
      })
      setIsReportModalOpen(false)
      setNewReportData({
        title: '',
        description: '',
        issue_type: 'Pothole',
        severity: 'medium',
        department: 'PWD',
        location_text: '',
        latitude: 30.3165,
        longitude: 78.0322,
        zone: 'Central Zone'
      })
      loadData()
    } catch (err) {
      alert('Error creating report')
    }
  }

  // Filters and calculations
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Tab filter: 'dashboard' only shows active/unresolved tasks
      if (activeTab === 'dashboard' && r.status === 'resolved') return false
      
      // Department filter
      if (selectedDepartment && r.department !== selectedDepartment) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchTitle = r.title.toLowerCase().includes(query)
        const matchLoc = r.location_text.toLowerCase().includes(query)
        const matchType = r.issue_type.toLowerCase().includes(query)
        const matchId = `#inf-${r.id.toString().padStart(4, '0')}`.includes(query)
        if (!matchTitle && !matchLoc && !matchType && !matchId) return false
      }
      
      return true
    })
  }, [reports, activeTab, selectedDepartment, searchQuery])

  // Pagination mock
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredReports.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredReports, currentPage])

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  })

  // Render Login Gate
  if (!token || !user?.is_official) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-slate-800 p-8 shadow-2xl border border-slate-700/50">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
              <Shield size={32} />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">InfraGov AI Portal</h2>
            <p className="mt-2 text-sm text-slate-400">
              Government Infrastructure Monitoring & SLA Command Center
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-700/30 text-center text-xs text-slate-400 leading-relaxed">
              This administrative dashboard is restricted to authorized municipal officials of Dehradun (PWD, Jal Sansthan, UPCL, Nagar Nigam). Please sign in using official credentials.
            </div>
            <button
              onClick={() => demoOfficial()}
              type="button"
              className="group relative flex w-full justify-center rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sign In as Demo Official
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-950 font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Admin Panel</h2>
            <p className="text-xs text-slate-500">Infrastructure Dept</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'map', label: 'Map', icon: MapIcon },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any)
                  setCurrentPage(1)
                }}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-blue-600" />
                )}
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
            <HelpCircle size={18} className="text-slate-400" />
            Support
          </button>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Logout
          </button>

          {/* User Profile Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
              alt="Official Profile"
              className="h-9 w-9 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-[10px] text-slate-500 uppercase font-bold tracking-wider">Level 4 Auth</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* 2. TOP NAV BAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">InfraGov AI</h1>
            <div className="relative hidden w-80 sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports, zones, or assets..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 transition text-slate-600">
                <Bell size={18} />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-600" />
              </button>
            </div>
            
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 hover:shadow-blue-500/10 transition"
            >
              <Plus size={16} />
              New Report
            </button>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            
            {/* Main Welcome Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Welcome back, Director</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sector analysis for Greater Metro Area | System Status:{' '}
                  <span className="font-semibold text-green-600 inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" /> Operational
                  </span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold text-slate-900">{formattedDate}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">{formattedTime}</p>
              </div>
            </div>

            {/* Render views based on activeTab */}
            {activeTab === 'dashboard' && (
              <>
                {/* 4. KPI CARDS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: 'Total Reports',
                      value: stats ? stats.total_reports : 1284,
                      change: '+12%',
                      trend: 'up',
                      desc: 'Last 30 days summary',
                      icon: FileText,
                      color: 'text-blue-600 bg-blue-50'
                    },
                    {
                      label: 'Critical Issues',
                      value: stats ? stats.critical_issues : 42,
                      change: '+4%',
                      trend: 'up',
                      desc: 'Immediate action required',
                      icon: AlertTriangle,
                      color: 'text-red-600 bg-red-50'
                    },
                    {
                      label: 'Overdue Tasks',
                      value: stats ? stats.overdue_tasks : 15,
                      change: '-8%',
                      trend: 'down',
                      desc: 'Outside of SLA window',
                      icon: Clock,
                      color: 'text-amber-600 bg-amber-50'
                    },
                    {
                      label: 'Avg Resolution',
                      value: stats ? `${stats.avg_resolution_hours}h` : '4.8h',
                      change: '-1.2h',
                      trend: 'down',
                      desc: 'Efficiency target met',
                      icon: Zap,
                      color: 'text-green-600 bg-green-50'
                    }
                  ].map((card, idx) => {
                    const Icon = card.icon
                    const isPositive = card.trend === 'down' ? idx === 2 || idx === 3 : idx === 0 || idx === 1
                    return (
                      <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                            <Icon size={20} />
                          </div>
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {card.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {card.change}
                          </span>
                        </div>
                        <p className="mt-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                        <p className="mt-2 text-[10px] text-slate-400">{card.desc}</p>
                      </div>
                    )
                  })}
                </div>

                {/* 5. GRID ROW (Active Tasks & Resilience Insight) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  
                  {/* Active Tasks Table Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Active Tasks</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Priority queue for field engineering teams</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Department buttons inside dashboard filter */}
                        <div className="flex gap-1 overflow-x-auto p-0.5 border border-slate-100 rounded-lg bg-slate-50/50">
                          {DEPARTMENTS.map((d) => (
                            <button
                              key={d || 'all'}
                              type="button"
                              onClick={() => setSelectedDepartment(d)}
                              className={`rounded-md px-2 py-1 text-[10px] font-bold capitalize transition ${
                                selectedDepartment === d
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {d || 'All'}
                            </button>
                          ))}
                        </div>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition">
                          <Filter size={14} />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto rounded-xl border border-slate-150">
                      <table className="w-full text-left text-xs text-slate-500">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-150">
                          <tr>
                            <th className="px-4 py-3.5">Issue ID</th>
                            <th className="px-4 py-3.5">Preview</th>
                            <th className="px-4 py-3.5">Issue Type</th>
                            <th className="px-4 py-3.5">Priority</th>
                            <th className="px-4 py-3.5">Zone</th>
                            <th className="px-4 py-3.5">SLA Timer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedReports.map((r) => (
                            <tr
                              key={r.id}
                              onClick={() => handleOpenDetails(r)}
                              className="hover:bg-slate-50/80 transition cursor-pointer group"
                            >
                              <td className="px-4 py-4 font-bold text-blue-600 group-hover:text-blue-700 transition">
                                #INF-{r.id.toString().padStart(4, '0')}
                              </td>
                              <td className="px-4 py-2">
                                {r.image_url ? (
                                  <img
                                    src={r.image_url}
                                    alt="Issue Preview"
                                    className="h-10 w-12 rounded object-cover border border-slate-100"
                                  />
                                ) : (
                                  <div className="flex h-10 w-12 items-center justify-center rounded bg-slate-100 text-slate-400 border border-slate-100">
                                    <MapIcon size={16} />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {r.issue_type}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severityColor(r.severity)}`}>
                                  {r.severity}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {r.zone || 'Dehradun'}
                              </td>
                              <td className="px-4 py-4">
                                <div className={`inline-flex items-center gap-1.5 font-bold ${
                                  slaTicks[r.id] <= 0 ? 'text-red-600' : 'text-slate-700'
                                }`}>
                                  <Clock size={12} className={slaTicks[r.id] <= 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                                  {formatTickingSla(r.id)}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!filteredReports.length && (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                No active tasks match the current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                          {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                          {filteredReports.length} entries
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column containing both AI cards */}
                  <div className="space-y-6 lg:col-span-1">
                    {/* AI Resilience Insight Side Card */}
                    <div className="flex flex-col justify-between rounded-2xl bg-[#0f172a] text-white p-6 shadow-xl border border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 text-blue-400">
                          <Sparkles size={16} />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Resilience Insight AI</span>
                        </div>
                        <h3 className="mt-4 text-base font-bold leading-snug">
                          Anomalous Trend Detected: Sector 4
                        </h3>
                        <p className="mt-3 text-xs leading-relaxed text-slate-300">
                          Real-time thermal sensors indicate a 15% increase in bridge joint expansion at North Sector 4.
                          AI models predict a <span className="font-bold text-emerald-400">78% probability</span> of structural failure within the next 48 hours if heavy freight continues at current volumes.
                        </p>
                      </div>

                      <div className="mt-6 rounded-xl bg-slate-800/80 p-4 border border-slate-700/50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Recommended Action</p>
                        <p className="mt-1.5 text-xs text-slate-200 leading-relaxed">
                          Immediate freight diversion to Bay Crossing recommended. Deploy drone inspection team ID:{' '}
                          <span className="font-semibold text-blue-400">#D-77</span> within 2 hours.
                        </p>
                      </div>
                    </div>

                    {/* Predictive Infrastructure Risk (Beta) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>🧠</span> Predictive Infrastructure Risk (Beta)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Preview of AI-powered infrastructure forecasting.
                        </p>
                      </div>

                      {/* List of predicted high-risk zones */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🔴</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">Rajpur Road</p>
                              <p className="text-[10px] text-slate-500">Road Damage Risk — 82%</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🟠</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">Clock Tower</p>
                              <p className="text-[10px] text-slate-500">Garbage Accumulation Risk — 68%</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🟡</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">ISBT</p>
                              <p className="text-[10px] text-slate-500">Drain Blockage Risk — 61%</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🟢</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">Clement Town</p>
                              <p className="text-[10px] text-slate-500">Low Risk — 24%</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Color-coded legend */}
                      <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1"><span className="text-xs">🔴</span> High Risk</span>
                        <span className="flex items-center gap-1"><span className="text-xs">🟠</span> Medium Risk</span>
                        <span className="flex items-center gap-1"><span className="text-xs">🟢</span> Low Risk</span>
                      </div>

                      {/* short note */}
                      <p className="text-[10px] leading-relaxed text-slate-400 italic">
                        This preview uses simulated data. Future versions will combine historical reports, weather patterns, and infrastructure age to predict failures 30–90 days in advance.
                      </p>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* Reports View */}
            {activeTab === 'reports' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Reports Database</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Historical ledger of all community reports</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex gap-1 border border-slate-100 rounded-lg bg-slate-50/50 p-0.5">
                      {DEPARTMENTS.map((d) => (
                        <button
                          key={d || 'all'}
                          onClick={() => setSelectedDepartment(d)}
                          className={`rounded-md px-2 py-1 text-[10px] font-bold capitalize transition ${
                            selectedDepartment === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          {d || 'All'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="w-full text-left text-xs text-slate-500">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-150">
                      <tr>
                        <th className="px-4 py-3.5">ID</th>
                        <th className="px-4 py-3.5">Title</th>
                        <th className="px-4 py-3.5">Department</th>
                        <th className="px-4 py-3.5">Severity</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedReports.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => handleOpenDetails(r)}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                        >
                          <td className="px-4 py-4 font-bold text-blue-600">
                            #INF-{r.id.toString().padStart(4, '0')}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {r.title}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{r.department}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${severityColor(r.severity)}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td className="px-4 py-4 capitalize">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              r.status === 'resolved'
                                ? 'bg-green-50 text-green-700'
                                : r.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                      {filteredReports.length} entries
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map View */}
            {activeTab === 'map' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Interactive Command Map</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live geo-spatial analysis of pending and resolved reports</p>
                </div>
                
                <div className="h-[60vh] w-full overflow-hidden rounded-xl border border-slate-200">
                  <MapContainer center={DEHRADUN} zoom={13} className="h-full w-full" scrollWheelZoom>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {reports.map((r) => (
                      <Marker
                        key={r.id}
                        position={[r.latitude, r.longitude]}
                        icon={pinIcon(statusPinColor(r.status, r.severity))}
                      >
                        <Popup>
                          <div className="space-y-1 text-xs p-1">
                            <p className="font-bold text-slate-900">#INF-{r.id.toString().padStart(4, '0')}: {r.title}</p>
                            <p className="text-slate-600">Location: {r.location_text}</p>
                            <p className="text-slate-600 capitalize">Status: {r.status} · Priority: {r.severity}</p>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(r)}
                              className="text-blue-600 font-bold hover:underline mt-1 block text-left"
                            >
                              Inspect Details
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
                
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full bg-red-600 border border-white shadow-sm" /> Critical</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full bg-orange-500 border border-white shadow-sm" /> High</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full bg-amber-500 border border-white shadow-sm" /> Medium</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-600 border border-white shadow-sm" /> Low</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded-full bg-green-700 border border-white shadow-sm" /> Resolved</span>
                </div>
              </div>
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    Department Distribution
                  </h3>
                  <div className="space-y-4">
                    {['PWD', 'Jal Sansthan', 'UPCL', 'Nagar Nigam'].map(dept => {
                      const count = reports.filter(r => r.department === dept).length
                      const total = reports.length || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={dept} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{dept}</span>
                            <span className="text-slate-500">{count} issues ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-blue-600" />
                    SLA Compliance Rate
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-2xl font-black text-slate-900">92.4%</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Average compliance</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 text-green-700 px-2.5 py-1 text-[11px] font-bold">
                        <ArrowUpRight size={12} />
                        +3.2%
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1">v.s. last month</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Critical Priority Target (&lt; 4h)</span>
                      <span className="font-bold text-slate-950">87.5% compliance</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">High Priority Target (&lt; 24h)</span>
                      <span className="font-bold text-slate-950">94.1% compliance</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teams View */}
            {activeTab === 'teams' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Response Teams Dispatch</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Field operations status and assignments</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { name: 'PWD Team Alpha', dept: 'PWD', status: 'Dispatched', load: '3 tasks', icon: Users, color: 'border-blue-100 bg-blue-50/30' },
                    { name: 'Jal Sansthan Rescue', dept: 'Jal Sansthan', status: 'Active', load: '1 task', icon: Users, color: 'border-emerald-100 bg-emerald-50/30' },
                    { name: 'UPCL Power Line', dept: 'UPCL', status: 'Standby', load: '0 tasks', icon: Users, color: 'border-slate-100 bg-slate-50/30' },
                    { name: 'Nagar Nigam Squad', dept: 'Nagar Nigam', status: 'Dispatched', load: '4 tasks', icon: Users, color: 'border-blue-100 bg-blue-50/30' },
                  ].map(team => (
                    <div key={team.name} className={`rounded-xl border p-4 shadow-sm ${team.color}`}>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 text-sm">{team.name}</h4>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                          team.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' : team.status === 'Active' ? 'bg-emerald-105 bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {team.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Department: {team.dept}</p>
                      <p className="text-xs font-bold text-slate-700 mt-3 flex items-center gap-1.5">
                        <Activity size={12} />
                        Load: {team.load}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings View */}
            {activeTab === 'settings' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
                <h3 className="font-bold text-slate-900 text-lg mb-6 border-b border-slate-100 pb-3">SLA Command Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">SLA Thresholds</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase">Critical Priority</label>
                        <input type="text" defaultValue="4 hours" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase">High Priority</label>
                        <input type="text" defaultValue="24 hours" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">AI Engine Level</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white">
                      <option>Confidence threshold &gt; 80% (Auto-Route)</option>
                      <option>Confidence threshold &gt; 90% (Strict)</option>
                      <option>All Reports (Manual Approval Required)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* DETAIL INSPECTION DRAWER/MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm p-4">
          <div className="h-full w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-150 animate-in slide-in-from-right duration-350">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">
                  Issue Details #INF-{selectedReport.id.toString().padStart(4, '0')}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-0.5">
                  Routed to {selectedReport.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 transition text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Image Preview */}
              {selectedReport.image_url && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img
                    src={selectedReport.image_url}
                    alt="Report preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    AI Confidence: {Math.round(selectedReport.confidence * 100)}%
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-900 leading-tight">{selectedReport.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedReport.description}</p>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="text-xs font-bold text-slate-800 capitalize">{selectedReport.status.replace('_', ' ')}</p>
                </div>
                
                <div className="flex-1 flex justify-end gap-2">
                  {selectedReport.status === 'open' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'in_progress')}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 text-xs shadow-sm transition"
                    >
                      Assign Team
                    </button>
                  )}
                  {selectedReport.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                      className="rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold px-3 py-1.5 text-xs shadow-sm transition"
                    >
                      Resolve Issue
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-100 pt-4">
                <div>
                  <p className="text-slate-400 font-semibold">Priority</p>
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide mt-1 ${severityColor(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Zone</p>
                  <p className="font-bold text-slate-800 mt-1">{selectedReport.zone || 'Dehradun'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Reporter</p>
                  <p className="font-medium text-slate-800 mt-1">{selectedReport.reporter_name || 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Location</p>
                  <p className="font-medium text-slate-800 mt-1 truncate" title={selectedReport.location_text}>
                    {selectedReport.location_text}
                  </p>
                </div>
              </div>

              {/* Activity Logs & Comments */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-slate-400" />
                  Activity Timeline
                </h5>
                
                <div className="space-y-3 pl-2">
                  {reportUpdates.map((u) => (
                    <div key={u.id} className="relative pl-4 border-l border-slate-200 pb-1 text-xs">
                      <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-slate-300 border border-white" />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>{u.is_ai ? 'AI Assistant Routing' : 'Official update'}</span>
                        <span>{new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-1 text-slate-700 leading-relaxed">{u.content}</p>
                    </div>
                  ))}
                  {!reportUpdates.length && (
                    <p className="text-xs text-slate-400 italic">No activity logs recorded.</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddUpdate} className="flex gap-2 border-t border-slate-100 pt-4">
                  <input
                    type="text"
                    placeholder="Post administrative log update..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 text-xs transition"
                  >
                    Post
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* QUICK REPORT CREATION MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateReport}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-150 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Create Official Report</h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 transition text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Fields */}
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overpass support fracture"
                  value={newReportData.title}
                  onChange={(e) => setNewReportData({ ...newReportData, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide precise visual and structural symptoms..."
                  value={newReportData.description}
                  onChange={(e) => setNewReportData({ ...newReportData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide">Issue Type</label>
                  <input
                    type="text"
                    required
                    value={newReportData.issue_type}
                    onChange={(e) => setNewReportData({ ...newReportData, issue_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide">Zone</label>
                  <input
                    type="text"
                    required
                    value={newReportData.zone}
                    onChange={(e) => setNewReportData({ ...newReportData, zone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide">Severity</label>
                  <select
                    value={newReportData.severity}
                    onChange={(e) => setNewReportData({ ...newReportData, severity: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide">Department</label>
                  <select
                    value={newReportData.department}
                    onChange={(e) => setNewReportData({ ...newReportData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="PWD">PWD</option>
                    <option value="Jal Sansthan">Jal Sansthan</option>
                    <option value="UPCL">UPCL</option>
                    <option value="Nagar Nigam">Nagar Nigam</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide">Location Landmark Text</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ring Road Block B near overhead tank"
                  value={newReportData.location_text}
                  onChange={(e) => setNewReportData({ ...newReportData, location_text: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold px-4 py-2 text-xs transition text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 text-xs shadow-sm transition"
              >
                Log Report
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
