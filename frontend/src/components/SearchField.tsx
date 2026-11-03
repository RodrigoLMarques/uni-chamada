import { useRef } from 'react'

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  id,
  describedBy,
  busy = false,
}: {
  value: string
  onChange: (value: string) => void
  /** Obrigatório: o botão de limpar se esconde por CSS enquanto o placeholder aparece. */
  placeholder: string
  label: string
  id?: string
  describedBy?: string
  busy?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="uc-search">
      <span className="uc-icon uc-i-search" aria-hidden="true" />
      <input
        ref={inputRef}
        className="uc-input uc-search-input"
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        aria-describedby={describedBy}
        aria-busy={busy}
        onChange={(event) => onChange(event.target.value)}
      />
      {busy ? <span className="uc-spinner uc-search-spinner" aria-hidden="true" /> : null}
      <button
        className="uc-search-clear"
        type="button"
        aria-label="Limpar busca"
        onClick={() => {
          onChange('')
          inputRef.current?.focus()
        }}
      >
        <span className="uc-icon uc-i-x" aria-hidden="true" />
      </button>
    </div>
  )
}
