import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/layout/AppShell'
import { AccountPage } from './AccountPage'
import { CoursePage } from './CoursePage'
import { CoursesPage } from './CoursesPage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { PlaceholderPage } from './PlaceholderPage'
import { NewSessionPage } from './NewSessionPage'
import { RosterPage } from './RosterPage'
import { SessionPage } from './SessionPage'

export const router = createBrowserRouter([
  // Rotas públicas: o aluno nunca autentica, e o login não pode exigir sessão.
  { path: '/entrar', element: <LoginPage /> },
  { path: '/scan', element: <PlaceholderPage title="Registrar presença" task="task 13" /> },
  { path: '/consulta', element: <PlaceholderPage title="Consultar presença" task="task 13" /> },

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
