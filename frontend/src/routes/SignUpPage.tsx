import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { signUp } from '@/auth/auth.api'
import { useAuth } from '@/auth/useAuth'
import { BrandMark } from '@/brand/BrandMark'
import { ApiError, NetworkError, api } from '@/lib/api'

const MINIMUM_PASSWORD_LENGTH = 6

const signUpSchema = z.object({
  name: z.string().min(1, { message: 'Informe seu nome.' }),
  email: z.email({ message: 'Informe um e-mail válido.' }),
  password: z.string().min(MINIMUM_PASSWORD_LENGTH, {
    message: `A senha precisa de pelo menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`,
  }),
})

type SignUpForm = z.infer<typeof signUpSchema>

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Já existe uma conta com esse e-mail. Tente entrar.'
  }
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível criar a conta. Tente de novo.'
}

export function SignUpPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<string | null>(null)
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(values: SignUpForm) {
    setFailure(null)
    try {
      await signUp(api, values)
      await signIn({ email: values.email, password: values.password })
      void navigate('/turmas', { replace: true })
    } catch (error) {
      setFailure(messageFor(error))
    }
  }

  return (
    <div className="uc-centered">
      <header className="uc-auth-head uc-centered-panel">
        <div className="uc-auth-brand">
          <BrandMark size={40} />
          <span className="uc-auth-brand-name">UniChamada</span>
        </div>
        <p className="uc-auth-tagline">A chamada da sua turma em segundos.</p>
      </header>

      <main className="uc-card uc-card-body uc-centered-panel">
        <form className="uc-form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <h1 className="uc-auth-title">Criar conta</h1>

          {failure ? (
            <p className="uc-banner uc-banner-danger" role="alert">
              <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
              {failure}
            </p>
          ) : null}

          <div className="uc-field">
            <label className="uc-label" htmlFor={nameId}>
              Nome
            </label>
            <input
              className="uc-input"
              id={nameId}
              type="text"
              autoComplete="name"
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name ? (
              <p className="uc-error-text">
                <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                {errors.name.message}
              </p>
            ) : null}
          </div>

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
              {...register('email')}
            />
            {errors.email ? (
              <p className="uc-error-text">
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
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password ? (
              <p className="uc-error-text">
                <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                {errors.password.message}
              </p>
            ) : (
              <p className="uc-hint">Pelo menos {MINIMUM_PASSWORD_LENGTH} caracteres.</p>
            )}
          </div>

          <button
            className="uc-btn uc-btn-primary uc-btn-block uc-auth-submit"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <span className="uc-spinner" aria-hidden="true" /> : null}
            {isSubmitting ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      </main>

      <p className="uc-auth-switch">
        <span>Já tem conta?</span>
        <Link className="uc-link" to="/entrar">
          Entrar
        </Link>
      </p>
    </div>
  )
}
