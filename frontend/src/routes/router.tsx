import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/layout/AppShell'
import { AccountPage } from './AccountPage'
import { CoursePage } from './CoursePage'
import { CoursesPage } from './CoursesPage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { LookupPage } from './LookupPage'
import { NewSessionPage } from './NewSessionPage'
import { ScanPage } from './ScanPage'
import { SignUpPage } from './SignUpPage'
import { ReportPage } from './ReportPage'
import { RosterPage } from './RosterPage'
import { SessionPage } from './SessionPage'

export const router = createBrowserRouter([
  { path: '/entrar', element: <LoginPage /> },
  { path: '/criar-conta', element: <SignUpPage /> },
  { path: '/scan', element: <ScanPage /> },
  { path: '/consulta', element: <LookupPage /> },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/turmas" replace /> },
          { path: '/turmas', element: <CoursesPage /> },
          { path: '/turmas/:courseId', element: <CoursePage /> },
          { path: '/turmas/:courseId/alunos', element: <RosterPage /> },
          { path: '/turmas/:courseId/relatorio', element: <ReportPage /> },
          { path: '/turmas/:courseId/chamadas/nova', element: <NewSessionPage /> },
          { path: '/turmas/:courseId/chamadas/:sessionId', element: <SessionPage /> },
          { path: '/conta', element: <AccountPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
