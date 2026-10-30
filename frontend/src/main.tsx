import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { ToastProvider } from '@/components/ToastProvider'
import { ApiError } from '@/lib/api'
import { router } from '@/routes/router'
import { ThemeProvider } from '@/theme/ThemeProvider'
import './styles/tokens.css'
import './styles/bundle.css'
import './styles/app.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Repetir um 4xx só gasta requisição: o servidor já decidiu.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
    },
  },
})

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado no index.html.')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
