import { useEffect, useId, useRef } from 'react'

export function RaField({
  value,
  onChange,
  disabled = false,
  error,
  enterKeyHint = 'send',
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  enterKeyHint?: 'send' | 'search'
  autoFocus?: boolean
}) {
  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  return (
    <div className="uc-ra">
      <label className="uc-ra-label" htmlFor={inputId}>
        Seu RA
      </label>
      <input
        ref={inputRef}
        className="uc-ra-input"
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        placeholder="Só números"
        maxLength={12}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      />
      {error ? (
        <p className="uc-error-text" id={hintId}>
          <span className="uc-icon uc-i-circle-alert" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="uc-hint" id={hintId}>
          Sem pontos, traço ou espaço.
        </p>
      )}
    </div>
  )
}
