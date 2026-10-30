import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { BrandMark } from '@/brand/BrandMark'
import { ApiError, NetworkError } from '@/lib/api'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }),
  password: z.string().min(1, { message: 'Informe sua senha.' }),
})

type LoginForm = z.infer<typeof loginSchema>

function messageFor(error: unknown): string {
  // Credencial errada nunca diz se o e-mail existe: a tela é pública.
  if (error instanceof ApiError && error.status === 401) {
    return 'E-mail ou senha incorretos. Confira e tente de novo.'
  }
  if (error instanceof ApiError) return error.message
  if (error instanceof NetworkError) return error.message
  return 'Não foi possível entrar. Tente de novo.'
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [failure, setFailure] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()
  const failureId = useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginForm) {
    setFailure(null)
    try {
      await signIn(values)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/turmas', { replace: true })
    } catch (error) {
      setFailure(messageFor(error))
    }
  }

  return (
    <div className="uc-centered">
      <header
        className="uc-centered-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <BrandMark size={40} />
          <span
            style={{
              font: 'var(--text-type-title)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-type-title)',
            }}
          >
            UniChamada
          </span>
        </div>
        <p
          style={{
            margin: 0,
            font: 'var(--text-type-body)',
            color: 'var(--text-muted)',
            textWrap: 'balance',
          }}
        >
          Registre a presença da turma com um QR na tela: cada aluno escaneia com o próprio celular
          e digita o RA.
        </p>
      </header>

      <main className="uc-card uc-card-body uc-centered-panel">
        <form className="uc-form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <h1
            style={{
              margin: '0 0 var(--space-2)',
              font: 'var(--text-type-heading)',
              letterSpacing: '-0.01em',
            }}
          >
            Entrar
          </h1>

          {failure ? (
            <p className="uc-banner uc-banner-danger" id={failureId} role="alert">
              <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
              {failure}
            </p>
          ) : null}

          <div className="uc-field">
            <label className="uc-label" htmlFor={emailId}>
              E-mail
            </label>
            <input
              className="uc-input"
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.edu.br"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${emailId}-erro` : undefined}
              {...register('email')}
            />
            {errors.email ? (
              <p className="uc-error-text" id={`${emailId}-erro`}>
                <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="uc-field">
            <label className="uc-label" htmlFor={passwordId}>
              Senha
            </label>
            <input
              className="uc-input"
              id={passwordId}
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? `${passwordId}-erro` : undefined}
              {...register('password')}
            />
            {errors.password ? (
              <p className="uc-error-text" id={`${passwordId}-erro`}>
                <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <button
            className="uc-btn uc-btn-primary uc-btn-block"
            type="submit"
            style={{ marginTop: 'var(--space-2)' }}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <span className="uc-spinner" aria-hidden="true" /> : null}
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </main>
    </div>
  )
}
