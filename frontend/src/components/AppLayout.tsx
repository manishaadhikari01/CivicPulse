import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-surface pb-20">
      <Header />
      <main className="px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
