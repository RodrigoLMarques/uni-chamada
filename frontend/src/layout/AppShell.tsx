import { Outlet } from 'react-router'
import { SideNav } from './SideNav'

export function AppShell() {
  return (
    <div className="uc-app">
      <SideNav />
      <main className="uc-app-main">
        <Outlet />
      </main>
    </div>
  )
}
