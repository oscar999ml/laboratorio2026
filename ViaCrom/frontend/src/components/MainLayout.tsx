import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'

export default function MainLayout() {
  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
