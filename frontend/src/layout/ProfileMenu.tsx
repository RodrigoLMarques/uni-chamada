import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import { useToast } from '@/components/useToast'
import { useTheme } from '@/theme/useTheme'
import { THEME_PREFERENCES, type ThemePreference } from '@/theme/theme-context'

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ProfileMenu({
  teacher,
  onClose,
  onSignOut,
}: {
  teacher: { name: string; email: string }
  onClose: () => void
  onSignOut: () => void
}) {
  const { preference, setPreference } = useTheme()
  const { notify } = useToast()
  const themeLabelId = useId()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element | null
      if (menuRef.current?.contains(target as Node)) return
      // O botão que abriu o menu já alterna sozinho no clique: fechar aqui faria
      // o menu piscar e reabrir.
      if (target?.closest('[aria-haspopup="dialog"]')) return
      onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose])

  const lookupUrl = `${window.location.origin}/consulta`

  async function handleCopy() {
    const copied = await copyToClipboard(lookupUrl)
    notify(
      copied
        ? { tone: 'success', title: 'Link copiado', body: 'Mande para a turma consultar a frequência.' }
        : { tone: 'warning', title: 'Não foi possível copiar', body: lookupUrl },
    )
  }

  return (
    <div ref={menuRef} className="uc-profile-menu" role="dialog" aria-label="Menu do perfil">
      <div className="uc-profile-menu-identity">
        <span className="uc-profile-menu-name">{teacher.name}</span>
        <span className="uc-profile-menu-email">{teacher.email}</span>
      </div>

      <hr className="uc-profile-menu-rule" />

      <Link className="uc-sidenav-item" to="/conta" onClick={onClose}>
        <span className="uc-icon uc-i-settings" aria-hidden="true" />
        Conta
      </Link>

      <hr className="uc-profile-menu-rule" />

      <div className="uc-field uc-profile-menu-theme">
        <span className="uc-label" id={themeLabelId}>
          Tema
        </span>
        <fieldset className="uc-segmented" aria-labelledby={themeLabelId}>
          {THEME_PREFERENCES.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="tema"
                value={option}
                checked={preference === option}
                onChange={() => setPreference(option)}
              />
              {THEME_LABELS[option]}
            </label>
          ))}
        </fieldset>
      </div>

      <hr className="uc-profile-menu-rule" />

      <button className="uc-profile-menu-copy" type="button" onClick={handleCopy}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        <span>
          <span>Copiar link da consulta de presença</span>
          <span className="uc-code">{lookupUrl}</span>
        </span>
      </button>

      <hr className="uc-profile-menu-rule" />

      <button className="uc-sidenav-item" type="button" onClick={onSignOut}>
        <span className="uc-icon uc-i-log-out" aria-hidden="true" />
        Sair
      </button>
    </div>
  )
}
