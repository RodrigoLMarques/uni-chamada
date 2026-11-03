import { useEffect, useId, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { SearchField } from '@/components/SearchField'
import { useToast } from '@/components/useToast'
import { INSTITUTIONS, INSTITUTION_LABELS, type InstitutionId } from '@/courses/courses.api'
import {
  searchUnifespStudents,
  useInstitutions,
  UNIFESP_QUERY_MIN_LENGTH,
  type InstitutionStudent,
} from '@/institutions/institutions.api'
import { ApiError, NetworkError } from '@/lib/api'
import { useEnrollFromUnifesp, useEnrollStudent } from './useEnrollments'

const SEARCH_DEBOUNCE_MS = 400

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.isRateLimited) {
    return 'Muitas buscas seguidas. Espere um instante e tente de novo.'
  }
  if (error instanceof ApiError && error.status === 409) {
    return 'Esse aluno já está matriculado nesta turma.'
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'O sistema da Unifesp não respondeu. Tente de novo ou cadastre manualmente.'
  }
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível adicionar o aluno. Tente de novo.'
}

export function AddStudentModal({
  courseId,
  courseLabel,
  defaultInstitution,
  onClose,
}: {
  courseId: string
  courseLabel: string
  defaultInstitution: InstitutionId
  onClose: () => void
}) {
  const { notify } = useToast()
  const { data: institutions } = useInstitutions()
  const [institution, setInstitution] = useState<InstitutionId>(defaultInstitution)
  const [failure, setFailure] = useState<string | null>(null)

  const institutionLabelId = useId()
  const searchId = useId()
  const searchHintId = useId()

  const fromUnifesp = useEnrollFromUnifesp(courseId)
  const manual = useEnrollStudent(courseId)

  const autofill = institutions?.find((entry) => entry.id === institution)?.autofill ?? false
  const useSearch = institution === 'UNIFESP' && autofill

  return (
    <Modal
      title="Adicionar aluno"
      description={`Entra na lista de ${courseLabel} e passa a contar a partir da próxima chamada.`}
      busy={fromUnifesp.isPending || manual.isPending}
      onClose={onClose}
      actions={
        <>
          <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="uc-btn uc-btn-primary"
            type="submit"
            form="add-student-form"
            disabled={fromUnifesp.isPending || manual.isPending}
            aria-busy={fromUnifesp.isPending || manual.isPending}
          >
            {fromUnifesp.isPending || manual.isPending ? (
              <span className="uc-spinner" aria-hidden="true" />
            ) : (
              <span className="uc-icon uc-i-plus" aria-hidden="true" />
            )}
            Adicionar aluno
          </button>
        </>
      }
    >
      <div className="uc-field">
        <span className="uc-label" id={institutionLabelId}>
          Instituição
        </span>
        <fieldset className="uc-segmented" aria-labelledby={institutionLabelId}>
          {INSTITUTIONS.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="institution"
                value={option}
                checked={institution === option}
                onChange={() => {
                  setInstitution(option)
                  setFailure(null)
                }}
              />
              {INSTITUTION_LABELS[option]}
            </label>
          ))}
        </fieldset>
        {institution === 'UNIFESP' && !autofill ? (
          <p className="uc-hint">
            A busca na Unifesp está indisponível no servidor. Cadastre os dados manualmente.
          </p>
        ) : null}
      </div>

      {failure ? (
        <p className="uc-banner uc-banner-danger" role="alert">
          <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
          {failure}
        </p>
      ) : null}

      {useSearch ? (
        <UnifespSearch
          searchId={searchId}
          hintId={searchHintId}
          submitting={fromUnifesp.isPending}
          onSubmit={async (hit) => {
            setFailure(null)
            try {
              const created = await fromUnifesp.mutateAsync({
                handle: hit.handle,
                name: hit.name,
                email: hit.email ?? undefined,
              })
              notify({ tone: 'success', title: `${created.student.name} entrou na turma` })
              onClose()
            } catch (error) {
              setFailure(messageFor(error))
            }
          }}
        />
      ) : (
        <ManualStudentForm
          submitting={manual.isPending}
          onSubmit={async (values) => {
            setFailure(null)
            try {
              const created = await manual.mutateAsync(values)
              notify({ tone: 'success', title: `${created.student.name} entrou na turma` })
              onClose()
            } catch (error) {
              setFailure(messageFor(error))
            }
          }}
        />
      )}
    </Modal>
  )
}

function UnifespSearch({
  searchId,
  hintId,
  submitting,
  onSubmit,
}: {
  searchId: string
  hintId: string
  submitting: boolean
  onSubmit: (hit: InstitutionStudent) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<InstitutionStudent[] | null>(null)
  const [selected, setSelected] = useState<InstitutionStudent | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const requestId = useRef(0)

  function onQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    if (value.trim().length < UNIFESP_QUERY_MIN_LENGTH) {
      setHits(null)
      setSearchError(null)
    }
  }

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < UNIFESP_QUERY_MIN_LENGTH) return

    const controller = new AbortController()
    const id = ++requestId.current

    // A consulta vai ao sistema da universidade: devagar e limitada a 30 por
    // minuto. Sem debounce, cada tecla gastaria uma das trinta.
    const timer = window.setTimeout(() => {
      setSearching(true)
      searchUnifespStudents(trimmed, controller.signal)
        .then((found) => {
          if (id !== requestId.current) return
          setHits(found)
          setSearchError(null)
          if (found.length === 1) setSelected(found[0]!)
        })
        .catch((error: unknown) => {
          if (id !== requestId.current) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          setHits([])
          setSearchError(messageFor(error))
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <form
      id="add-student-form"
      className="uc-form-stack"
      onSubmit={(event) => {
        event.preventDefault()
        if (selected) onSubmit(selected)
      }}
    >
      <div className="uc-field">
        <label className="uc-label" htmlFor={searchId}>
          Buscar na Unifesp
        </label>
        <SearchField
          id={searchId}
          value={query}
          onChange={onQueryChange}
          placeholder="RA, nome ou e-mail"
          label="Buscar aluno na Unifesp"
          describedBy={hintId}
          busy={searching}
        />
        <p className="uc-hint" id={hintId}>
          Consulta o sistema acadêmico da Unifesp. Digite ao menos{' '}
          {UNIFESP_QUERY_MIN_LENGTH} caracteres.
        </p>
      </div>

      {searchError ? (
        <p className="uc-banner uc-banner-warning" role="status">
          <span className="uc-icon uc-i-triangle-alert" aria-hidden="true" />
          {searchError}
        </p>
      ) : null}

      {hits && hits.length === 0 && !searchError ? (
        <p className="uc-hint">Nenhum aluno encontrado para essa busca.</p>
      ) : null}

      {hits && hits.length > 0 ? (
        <section className="uc-result-box" aria-label="Resultado da busca">
          <p
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              font: 'var(--text-type-label)',
              color: 'var(--success-solid)',
            }}
          >
            <span className="uc-icon uc-i-circle-check" aria-hidden="true" />
            {hits.length === 1 ? '1 aluno encontrado' : `${hits.length} alunos encontrados`}
          </p>

          {hits.length > 1 ? (
            <ul className="uc-result-hits">
              {hits.map((hit) => (
                <li key={hit.handle}>
                  <button
                    className="uc-result-hit"
                    type="button"
                    aria-pressed={selected?.handle === hit.handle}
                    onClick={() => setSelected(hit)}
                  >
                    <span>{hit.name}</span>
                    <span className="uc-result-hit-meta">{hit.ra ?? hit.maskedCpf ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {selected ? <SelectedStudent hit={selected} /> : null}
        </section>
      ) : null}

      <button type="submit" hidden disabled={!selected || submitting} />
    </form>
  )
}

function SelectedStudent({ hit }: { hit: InstitutionStudent }) {
  const nameId = useId()
  const raId = useId()
  const emailId = useId()

  return (
    <>
      <div className="uc-readonly-grid">
        <div className="uc-field uc-span-2">
          <label className="uc-label" htmlFor={nameId}>
            Nome
          </label>
          <input className="uc-input" id={nameId} value={hit.name} readOnly aria-readonly="true" />
        </div>
        <div className="uc-field">
          <label className="uc-label" htmlFor={raId}>
            RA
          </label>
          <input
            className="uc-input"
            id={raId}
            value={hit.ra ?? ''}
            readOnly
            aria-readonly="true"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
        </div>
        <div className="uc-field">
          <label className="uc-label" htmlFor={emailId}>
            E-mail
          </label>
          <input
            className="uc-input"
            id={emailId}
            value={hit.email ?? ''}
            readOnly
            aria-readonly="true"
          />
        </div>
      </div>
      <p className="uc-hint" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <span className="uc-icon uc-i-info" aria-hidden="true" />
        Preenchido com os dados da Unifesp. A foto e o ano de ingresso entram ao adicionar.
      </p>
    </>
  )
}

function ManualStudentForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean
  onSubmit: (values: { ra: string; name: string; email?: string; entryYear?: number }) => void
}) {
  const [ra, setRa] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [entryYear, setEntryYear] = useState('')
  const raId = useId()
  const nameId = useId()
  const emailId = useId()
  const yearId = useId()

  return (
    <form
      id="add-student-form"
      className="uc-form-stack"
      onSubmit={(event) => {
        event.preventDefault()
        if (submitting) return
        onSubmit({
          ra: ra.trim(),
          name: name.trim(),
          email: email.trim() || undefined,
          entryYear: entryYear ? Number(entryYear) : undefined,
        })
      }}
    >
      <div className="uc-field">
        <label className="uc-label" htmlFor={nameId}>
          Nome
        </label>
        <input
          className="uc-input"
          id={nameId}
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="uc-readonly-grid">
        <div className="uc-field">
          <label className="uc-label" htmlFor={raId}>
            RA
          </label>
          <input
            className="uc-input"
            id={raId}
            value={ra}
            required
            inputMode="numeric"
            style={{ fontVariantNumeric: 'tabular-nums' }}
            onChange={(event) => setRa(event.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="uc-field">
          <label className="uc-label" htmlFor={yearId}>
            Ingresso
          </label>
          <input
            className="uc-input"
            id={yearId}
            value={entryYear}
            inputMode="numeric"
            maxLength={4}
            placeholder="2026"
            style={{ fontVariantNumeric: 'tabular-nums' }}
            onChange={(event) => setEntryYear(event.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      <div className="uc-field">
        <label className="uc-label" htmlFor={emailId}>
          E-mail
        </label>
        <input
          className="uc-input"
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="uc-hint">Opcional.</p>
      </div>
    </form>
  )
}
