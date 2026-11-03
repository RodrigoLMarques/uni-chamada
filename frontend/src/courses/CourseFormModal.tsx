import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/useToast'
import { ApiError, NetworkError } from '@/lib/api'
import {
  COURSE_PERIODS,
  INSTITUTIONS,
  INSTITUTION_LABELS,
  PERIOD_LABELS,
  type Course,
} from './courses.api'
import { useCreateCourse, useUpdateCourse } from './useCourses'

const courseFormSchema = z.object({
  code: z.string().min(1, { message: 'Informe o código da disciplina.' }),
  name: z.string().min(1, { message: 'Informe o nome da disciplina.' }),
  term: z.string().min(1, { message: 'Informe o semestre, como 2026.2.' }),
  period: z.enum(COURSE_PERIODS),
  institution: z.enum(INSTITUTIONS),
})

type CourseForm = z.infer<typeof courseFormSchema>

function messageFor(error: unknown): string {
  // A API garante código, semestre e período únicos por professor.
  if (error instanceof ApiError && error.status === 409) {
    return 'Você já tem uma turma com esse código, semestre e período.'
  }
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível salvar a turma. Tente de novo.'
}

export function CourseFormModal({ course, onClose }: { course?: Course; onClose: () => void }) {
  const { notify } = useToast()
  const [failure, setFailure] = useState<string | null>(null)
  const codeId = useId()
  const nameId = useId()
  const termId = useId()
  const periodId = useId()
  const institutionLabelId = useId()

  const create = useCreateCourse()
  const update = useUpdateCourse(course?.id ?? '')
  const editing = Boolean(course)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      code: course?.code ?? '',
      name: course?.name ?? '',
      term: course?.term ?? '',
      period: course?.period ?? 'EVENING',
      institution: course?.institution ?? 'OTHER',
    },
  })

  async function onSubmit(values: CourseForm) {
    setFailure(null)
    try {
      if (course) await update.mutateAsync(values)
      else await create.mutateAsync(values)
      notify({ tone: 'success', title: editing ? 'Turma atualizada' : 'Turma criada' })
      onClose()
    } catch (error) {
      setFailure(messageFor(error))
    }
  }

  return (
    <Modal
      title={editing ? 'Editar turma' : 'Nova turma'}
      description={
        editing
          ? 'As alterações valem para as chamadas futuras e para o histórico já registrado.'
          : 'A turma começa vazia: você adiciona os alunos em seguida.'
      }
      busy={isSubmitting}
      onClose={onClose}
      actions={
        <>
          <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            className="uc-btn uc-btn-primary"
            type="submit"
            form="course-form"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <span className="uc-spinner" aria-hidden="true" /> : null}
            {editing ? 'Salvar turma' : 'Criar turma'}
          </button>
        </>
      }
    >
      <form id="course-form" className="uc-form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {failure ? (
          <p className="uc-banner uc-banner-danger" role="alert">
            <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
            {failure}
          </p>
        ) : null}

        <div className="uc-field">
          <label className="uc-label" htmlFor={nameId}>
            Nome da disciplina
          </label>
          <input className="uc-input" id={nameId} placeholder="Cálculo II" {...register('name')} />
          {errors.name ? <p className="uc-error-text">{errors.name.message}</p> : null}
        </div>

        <div className="uc-readonly-grid">
          <div className="uc-field">
            <label className="uc-label" htmlFor={codeId}>
              Código
            </label>
            <input className="uc-input" id={codeId} placeholder="MAT-202" {...register('code')} />
            {errors.code ? <p className="uc-error-text">{errors.code.message}</p> : null}
          </div>

          <div className="uc-field">
            <label className="uc-label" htmlFor={termId}>
              Semestre
            </label>
            <input className="uc-input" id={termId} placeholder="2026.2" {...register('term')} />
            {errors.term ? <p className="uc-error-text">{errors.term.message}</p> : null}
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label" htmlFor={periodId}>
            Período
          </label>
          <div className="uc-select">
            <select id={periodId} {...register('period')}>
              {COURSE_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {PERIOD_LABELS[period]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="uc-field">
          <span className="uc-label" id={institutionLabelId}>
            Instituição
          </span>
          <fieldset className="uc-segmented" aria-labelledby={institutionLabelId}>
            {INSTITUTIONS.map((institution) => (
              <label key={institution}>
                <input type="radio" value={institution} {...register('institution')} />
                {INSTITUTION_LABELS[institution]}
              </label>
            ))}
          </fieldset>
        </div>
      </form>
    </Modal>
  )
}
