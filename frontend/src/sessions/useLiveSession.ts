import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { courseKeys } from '@/courses/useCourses'
import { getLive, getRoll } from './live.api'
import { closeSession, deleteSession, sessionKeys } from './sessions.api'

const POLL_MS = 3000
/** Folga para o token novo já estar valendo quando a resposta chega. */
const REALIGN_CUSHION_MS = 150

export const liveKeys = {
  live: (courseId: string, sessionId: string) => ['live', courseId, sessionId] as const,
  roll: (courseId: string, sessionId: string) => ['roll', courseId, sessionId] as const,
}

/** Enquanto a chamada está aberta, as duas consultas recarregam sozinhas. O
 *  TanStack Query mantém o conteúdo antigo na tela até o novo chegar, que é a
 *  regra do design system: sem skeleton, sem salto de rolagem, sem piscar.
 *  Em segundo plano o polling para sozinho (refetchIntervalInBackground é falso
 *  por padrão) e retoma quando a aba volta. */
export function useLiveSession(courseId: string, sessionId: string, open: boolean) {
  const live = useQuery({
    queryKey: liveKeys.live(courseId, sessionId),
    queryFn: () => getLive(courseId, sessionId),
    // Realinha cada ciclo pelo expiresAt em vez de um intervalo solto, senão o
    // QR exibido sai de fase com a janela que o servidor aceita.
    refetchInterval: (query) => {
      if (!open) return false
      const expiresAt = query.state.data?.qr?.expiresAt
      if (!expiresAt) return POLL_MS
      const remaining = new Date(expiresAt).getTime() - Date.now()
      return Math.min(POLL_MS, Math.max(400, remaining + REALIGN_CUSHION_MS))
    },
    // O QR precisa continuar girando mesmo com a janela fora de foco: durante a
    // projeção o professor pode clicar noutro monitor, e um código congelado
    // para de ser aceito pelo servidor.
    refetchIntervalInBackground: true,
  })

  const roll = useQuery({
    queryKey: liveKeys.roll(courseId, sessionId),
    queryFn: () => getRoll(courseId, sessionId),
    refetchInterval: open ? POLL_MS : false,
  })

  return {
    live,
    roll,
    reconnecting: live.isError || roll.isError,
  }
}

export function useCloseSession(courseId: string, sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => closeSession(courseId, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) })
      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
      void queryClient.invalidateQueries({ queryKey: ['session', courseId, sessionId] })
    },
  })
}

export function useDeleteSession(courseId: string, sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteSession(courseId, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byCourse(courseId) })
      void queryClient.invalidateQueries({ queryKey: courseKeys.all })
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) })
    },
  })
}
