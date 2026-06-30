import { Home, Map, PlusCircle, Trophy, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/report', icon: PlusCircle, label: 'Report' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-outline/20 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                isActive ? 'bg-primary-container text-white' : 'text-on-surface/60 hover:text-primary'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function LeaderboardNavLink() {
  return (
    <NavLink to="/leaderboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
      <Trophy size={16} /> Leaderboard
    </NavLink>
  )
}
