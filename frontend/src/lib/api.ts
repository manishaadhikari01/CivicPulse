const API = '/api'

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export interface User {
  id: number
  email: string
  name: string
  xp: number
  is_official: boolean
  created_at: string
}

export interface Report {
  id: number
  title: string
  description: string
  issue_type: string
  severity: string
  department: string
  status: string
  confidence: number
  image_url: string | null
  latitude: number
  longitude: number
  location_text: string
  zone: string
  upvotes: number
  supporter_count: number
  reporter_id: number
  reporter_name: string
  created_at: string
  last_updated: string | null
  resolved_at: string | null
  sla_hours: number
  sla_remaining_seconds: number | null
  evidence_images: string[]
}

export interface Stats {
  total_reports: number
  resolved_reports: number
  active_members: number
  open_issues: number
  critical_issues: number
  overdue_tasks: number
  avg_resolution_hours: number
}

export interface LeaderboardEntry {
  rank: number
  id: number
  name: string
  xp: number
  report_count: number
  badges: string[]
}

export interface DuplicateInfo {
  report_id: number
  title: string
  distance: number
  severity: string
  supporter_count: number
  status: string
}

export interface AIAnalysis {
  issue_detected: boolean
  issue_type: string
  category: string
  severity: string
  department: string
  confidence: number
  title: string
  description: string
  reason: string
  mock?: boolean
  duplicate_found: boolean
  duplicate: DuplicateInfo | null
}

export const api = {
  authConfig: () => request<{ recaptcha_site_key: string }>('/auth/config'),
  signup: (data: { email: string; name: string; password: string; captcha_token: string }) =>
    request<{ access_token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string; captcha_token: string }) =>
    request<{ access_token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  demoOfficial: () => request<{ access_token: string; user: User }>('/auth/demo-official', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
  reportsMe: () => request<Report[]>('/reports/me'),

  stats: () => request<Stats>('/stats'),
  govStats: () => request<Stats>('/gov/stats'),
  reports: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<Report[]>(`/reports${q ? `?${q}` : ''}`)
  },
  govReports: (department?: string) =>
    request<Report[]>(`/gov/reports${department ? `?department=${department}` : ''}`),
  report: (id: number) => request<Report>(`/reports/${id}`),
  reportUpdates: (id: number) => request<Array<{ id: number; content: string; is_ai: boolean; created_at: string }>>(`/reports/${id}/updates`),
  analyze: (file: File, latitude?: number, longitude?: number) => {
    const fd = new FormData()
    fd.append('file', file)
    if (latitude != null) fd.append('latitude', String(latitude))
    if (longitude != null) fd.append('longitude', String(longitude))
    return request<AIAnalysis>('/reports/analyze', { method: 'POST', body: fd })
  },
  createReport: (data: Record<string, unknown>, image?: File | null) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)))
    if (image) fd.append('image', image)
    return request<Report>('/reports', { method: 'POST', body: fd })
  },
  upvote: (id: number) => request<{ upvotes: number }>(`/reports/${id}/upvote`, { method: 'POST' }),
  supportReport: (id: number, file: File | null, severity?: string) => {
    const fd = new FormData()
    if (file) fd.append('image', file)
    if (severity) fd.append('severity', severity)
    return request<{ supported: boolean; supporter_count: number; already_supported: boolean }>(
      `/reports/${id}/support`,
      { method: 'POST', body: fd },
    )
  },
  postUpdate: (id: number, content: string) =>
    request('/reports/${id}/updates'.replace('${id}', String(id)), { method: 'POST', body: JSON.stringify({ content }) }),
  updateStatus: (id: number, status: string) =>
    request<Report>(`/gov/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  leaderboard: (period: 'weekly' | 'all' = 'all') => request<LeaderboardEntry[]>(`/leaderboard?period=${period}`),
}
