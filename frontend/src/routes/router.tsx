import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/layout/AppShell'
import { AccountPage } from './AccountPage'
import { CoursePage } from './CoursePage'
import { CoursesPage } from './CoursesPage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { PlaceholderPage } from './PlaceholderPage'
import { LookupPage } from './LookupPage'
import { NewSessionPage } from './NewSessionPage'
import { ScanPage } from './ScanPage'
import { RosterPage } from './RosterPage'
import { SessionPage } from './SessionPage'

export const router = createBrowserRouter([
  { path: '/entrar', element: <LoginPage /> },
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
          {
            path: '/turmas/:courseId/relatorio',
            element: <PlaceholderPage title="Relatório da turma" task="task 14" />,
          },
          { path: '/turmas/:courseId/chamadas/nova', element: <NewSessionPage /> },
          { path: '/turmas/:courseId/chamadas/:sessionId', element: <SessionPage /> },
          { path: '/conta', element: <AccountPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
