import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { updatePassword, updateProfile } from '@/auth/auth.api'
import { useAuth } from '@/auth/useAuth'
import { useToast } from '@/components/useToast'
import { ApiError, NetworkError, api } from '@/lib/api'

const accountSchema = z
  .object({
    name: z.string().min(1, { message: 'Informe seu nome.' }),
    email: z.email({ message: 'Informe um e-mail válido.' }),
    currentPassword: z.string(),
    newPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.newPassword && !values.currentPassword) return

    if (!values.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Informe a senha atual para trocar a senha.',
      })
    }
    if (values.newPassword.length < 6) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'A nova senha precisa de pelo menos 6 caracteres.',
      })
    }
  })

type AccountForm = z.infer<typeof accountSchema>

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof NetworkError) return error.message
  return 'Não foi possível salvar. Tente de novo.'
}

export function AccountPage() {
  const { teacher, replaceTeacher } = useAuth()
  const { notify } = useToast()
  const nameId = useId()
  const emailId = useId()
  const currentId = useId()
  const newId = useId()
  const hintId = useId()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    values: {
      name: teacher?.name ?? '',
      email: teacher?.email ?? '',
      currentPassword: '',
      newPassword: '',
    },
  })

  const current = useWatch({ control })
  const profileChanged = current.name !== teacher?.name || current.email !== teacher?.email
  const passwordChanged = Boolean(current.currentPassword) || Boolean(current.newPassword)
  const hasChanges = profileChanged || passwordChanged

  async function onSubmit(values: AccountForm) {
    // Os dois blocos têm endpoints separados; um submit pode tocar os dois.
    try {
      if (profileChanged) {
        const updated = await updateProfile(api, { name: values.name, email: values.email })
        replaceTeacher(updated)
      }
      if (passwordChanged) {
        await updatePassword(api, {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        })
      }
      reset({ ...values, currentPassword: '', newPassword: '' })
      notify({ tone: 'success', title: 'Alterações salvas' })
    } catch (error) {
      notify({ tone: 'danger', title: 'Não foi possível salvar', body: messageFor(error) })
    }
  }

  return (
    <>
      <h1 className="uc-page-title">Conta</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{
          width: '100%',
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <section className="uc-card">
          <header className="uc-card-head">
            <h2 className="uc-card-title">Dados pessoais</h2>
          </header>
          <div className="uc-card-body uc-form-stack">
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
          </div>
        </section>

        <section className="uc-card">
          <header className="uc-card-head">
            <h2 className="uc-card-title">Trocar senha</h2>
          </header>
          <div className="uc-card-body uc-form-stack">
            <div className="uc-field">
              <label className="uc-label" htmlFor={currentId}>
                Senha atual
              </label>
              <input
                className="uc-input"
                id={currentId}
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.currentPassword ? true : undefined}
                {...register('currentPassword')}
              />
              {errors.currentPassword ? (
                <p className="uc-error-text">
                  <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                  {errors.currentPassword.message}
                </p>
              ) : null}
            </div>

            <div className="uc-field">
              <label className="uc-label" htmlFor={newId}>
                Nova senha
              </label>
              <input
                className="uc-input"
                id={newId}
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.newPassword ? true : undefined}
                {...register('newPassword')}
              />
              {errors.newPassword ? (
                <p className="uc-error-text">
                  <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
                  {errors.newPassword.message}
                </p>
              ) : (
                <p className="uc-hint">Pelo menos 6 caracteres.</p>
              )}
            </div>
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <button
            className="uc-btn uc-btn-primary"
            type="submit"
            disabled={!hasChanges || isSubmitting}
            aria-busy={isSubmitting}
            aria-describedby={hasChanges ? undefined : hintId}
          >
            {isSubmitting ? <span className="uc-spinner" aria-hidden="true" /> : null}
            {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {hasChanges ? null : (
            <span id={hintId} style={{ font: 'var(--text-type-body-sm)', color: 'var(--text-subtle)' }}>
              Nenhuma alteração para salvar
            </span>
          )}
        </div>
      </form>
    </>
  )
}
