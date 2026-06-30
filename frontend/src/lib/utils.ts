export function formatSla(seconds: number | null): string {
  if (seconds === null) return 'Resolved'
  if (seconds <= 0) return 'Overdue'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

export function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-green-100 text-green-700 border-green-200'
  }
}

export function statusPinColor(status: string, severity: string): string {
  if (status === 'resolved') return '#006c49'
  switch (severity.toLowerCase()) {
    case 'critical': return '#ba1a1a'
    case 'high': return '#ea580c'
    case 'medium': return '#d97706'
    default: return '#2563eb'
  }
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 250) + 1
}

export function badgeLabel(type: string): string {
  const labels: Record<string, string> = {
    first_report: 'First Report',
    five_reports: '5 Reports',
    neighborhood_hero: 'Neighborhood Hero',
  }
  return labels[type] || type
}
