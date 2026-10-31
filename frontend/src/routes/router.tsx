import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/layout/AppShell'
import { AccountPage } from './AccountPage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { PlaceholderPage } from './PlaceholderPage'

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
          { path: '/turmas', element: <PlaceholderPage title="Turmas" task="task 11" /> },
          {
            path: '/turmas/:courseId',
            element: <PlaceholderPage title="Turma" task="task 11" />,
          },
          {
            path: '/turmas/:courseId/alunos',
            element: <PlaceholderPage title="Alunos da turma" task="task 11" />,
          },
          {
            path: '/turmas/:courseId/relatorio',
            element: <PlaceholderPage title="Relatório da turma" task="task 14" />,
          },
          {
            path: '/turmas/:courseId/chamadas/:sessionId',
            element: <PlaceholderPage title="Chamada" task="task 12" />,
          },
          { path: '/conta', element: <AccountPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
