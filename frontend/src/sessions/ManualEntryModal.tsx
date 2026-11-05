import { useId, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ApiError, NetworkError } from '@/lib/api'
import { formatTimeWithSeconds } from '@/lib/format'
import { METHOD_LABELS, type RollEntry } from './live.api'
import {
  BULK_LIMIT,
  parseRaList,
  useRecordManual,
  useRecordManualBulk,
  type BulkResult,
} from './manual.api'

type Outcome = {
  recorded: { ra: string; name: string | null }[]
  skipped: { ra: string; reason: string }[]
}

function describeSkip(ra: string, reason: string, entry: RollEntry | undefined): string {
  if (reason === 'NOT_ENROLLED') return 'Esse RA não está nesta turma. Confira os números.'

  if (entry?.recordedAt && entry.method) {
    return `${entry.student.name} já tem presença nesta chamada, registrada às ${formatTimeWithSeconds(entry.recordedAt)} por ${METHOD_LABELS[entry.method]}.`
  }
  return `${entry?.student.name ?? `O RA ${ra}`} já tem presença nesta chamada.`
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Esse RA não está nesta turma. Confira os números.'
  }
  if (error instanceof ApiError && error.status === 409) {
    return 'Esse RA já tem presença nesta chamada.'
  }
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Não foi possível lançar a presença. Tente de novo.'
}

export function ManualEntryModal({
  courseId,
  sessionId,
  sessionLabel,
  entries,
  onClose,
}: {
  courseId: string
  sessionId: string
  sessionLabel: string
  entries: RollEntry[]
  onClose: () => void
}) {
  const single = useRecordManual(courseId, sessionId)
  const bulk = useRecordManualBulk(courseId, sessionId)

  const [ra, setRa] = useState('')
  const [raw, setRaw] = useState('')
  const [singleError, setSingleError] = useState<string | undefined>(undefined)
  const [bulkError, setBulkError] = useState<string | undefined>(undefined)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const singleId = useId()
  const bulkId = useId()
  const bulkHintId = useId()

  const byRa = new Map(entries.map((entry) => [entry.student.ra, entry]))
  const parsed = parseRaList(raw)
  const overLimit = parsed.length > BULK_LIMIT

  function toOutcome(result: BulkResult): Outcome {
    return {
      recorded: result.recorded.map((value) => ({
        ra: value,
        name: byRa.get(value)?.student.name ?? null,
      })),
      skipped: result.skipped.map((entry) => ({
        ra: entry.ra,
        reason: describeSkip(entry.ra, entry.reason, byRa.get(entry.ra)),
      })),
    }
  }

  async function onSingle() {
    if (!ra) return
    setSingleError(undefined)
    try {
      await single.mutateAsync(ra)
      setOutcome({ recorded: [{ ra, name: byRa.get(ra)?.student.name ?? null }], skipped: [] })
      setRa('')
    } catch (error) {
      setSingleError(messageFor(error))
    }
  }

  async function onBulk() {
    if (parsed.length === 0 || overLimit) return
    setBulkError(undefined)
    try {
      setOutcome(toOutcome(await bulk.mutateAsync(parsed)))
      setRaw('')
    } catch (error) {
      setBulkError(messageFor(error))
    }
  }

  const busy = single.isPending || bulk.isPending

  return (
    <Modal
      title="Lançar presença manual"
      description={`Os RAs lançados aqui entram como Manual na ${sessionLabel}.`}
      busy={busy}
      onClose={onClose}
      actions={
        <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose} disabled={busy}>
          Voltar para a chamada
        </button>
      }
    >
      <div className="uc-field">
        <label className="uc-label" htmlFor={singleId}>
          RA do aluno
        </label>
        <div className="uc-manual-single">
          <input
            className="uc-input"
            id={singleId}
            inputMode="numeric"
            placeholder="Só os números"
            value={ra}
            disabled={busy}
            onChange={(event) => {
              setRa(event.target.value.replace(/\D/g, ''))
              setSingleError(undefined)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onSingle()
              }
            }}
          />
          <button
            className="uc-btn uc-btn-secondary"
            type="button"
            onClick={() => void onSingle()}
            disabled={busy || ra.length === 0}
          >
            Lançar presença
          </button>
        </div>
        {singleError ? (
          <p className="uc-error-text">
            <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
            {singleError}
          </p>
        ) : null}
      </div>

      <div className="uc-field">
        <label className="uc-label" htmlFor={bulkId}>
          Vários RAs de uma vez
        </label>
        <textarea
          className="uc-input uc-manual-bulk"
          id={bulkId}
          rows={5}
          value={raw}
          disabled={busy}
          aria-describedby={bulkHintId}
          onChange={(event) => {
            setRaw(event.target.value)
            setBulkError(undefined)
          }}
        />
        <p className="uc-hint" id={bulkHintId}>
          Cole um RA por linha. Vírgula e espaço também separam.
          {parsed.length > 0 ? ` ${parsed.length} de até ${BULK_LIMIT}.` : null}
        </p>
        {overLimit ? (
          <p className="uc-error-text">
            <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
            São {parsed.length} RAs. O limite por lote é {BULK_LIMIT}.
          </p>
        ) : null}
        {bulkError ? (
          <p className="uc-error-text">
            <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
            {bulkError}
          </p>
        ) : null}
        <div className="uc-manual-bulk-action">
          <button
            className="uc-btn uc-btn-primary"
            type="button"
            onClick={() => void onBulk()}
            disabled={busy || parsed.length === 0 || overLimit}
            aria-busy={bulk.isPending}
          >
            {bulk.isPending ? <span className="uc-spinner" aria-hidden="true" /> : null}
            Lançar presenças
          </button>
        </div>
      </div>

      {outcome ? (
        <section className="uc-manual-outcome" aria-label="Resultado do último lote">
          <h3 className="uc-manual-outcome-title">Resultado do último lote</h3>

          {outcome.recorded.length > 0 ? (
            <div className="uc-manual-group">
              <p className="uc-manual-group-head uc-manual-ok">
                <span className="uc-icon uc-i-circle-check" aria-hidden="true" />
                {outcome.recorded.length}{' '}
                {outcome.recorded.length === 1 ? 'presença lançada' : 'presenças lançadas'}
              </p>
              <ul className="uc-manual-list">
                {outcome.recorded.map((entry) => (
                  <li key={entry.ra}>
                    <span className="uc-manual-ra">{entry.ra}</span>
                    <span>{entry.name ?? 'Presença lançada'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {outcome.skipped.length > 0 ? (
            <div className="uc-manual-group">
              <p className="uc-manual-group-head uc-manual-bad">
                <span className="uc-icon uc-i-circle-x" aria-hidden="true" />
                {outcome.skipped.length}{' '}
                {outcome.skipped.length === 1 ? 'RA recusado' : 'RAs recusados'}
              </p>
              <ul className="uc-manual-list">
                {outcome.skipped.map((entry) => (
                  <li key={entry.ra}>
                    <span className="uc-manual-ra">{entry.ra}</span>
                    <span>{entry.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </Modal>
  )
}
