import type { ReactNode } from 'react'
import { BrandMark } from '@/brand/BrandMark'

export function StudentShell({
  children,
  centred = false,
  role,
}: {
  children: ReactNode
  centred?: boolean
  role?: 'status'
}) {
  return (
    <div className="uc-student-screen">
      <header className="uc-student-head">
        <BrandMark size={24} />
        <span className="uc-student-brand">UniChamada</span>
      </header>
      <main className={centred ? 'uc-student-main uc-student-main-centred' : 'uc-student-main'} role={role}>
        {children}
      </main>
    </div>
  )
}
