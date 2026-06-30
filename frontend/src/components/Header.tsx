import { Bell, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-outline/20 bg-white/90 px-4 py-3 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-white">
          <BarChart3 size={18} />
        </div>
        <span className="text-lg font-bold text-primary">CivicPulse</span>
      </Link>
      <button type="button" className="rounded-full p-2 text-on-surface/70 hover:bg-surface-container" aria-label="Notifications">
        <Bell size={20} />
      </button>
    </header>
  )
}
