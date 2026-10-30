import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '@/lib/storage'
import {
  isThemePreference,
  THEME_STORAGE_KEY,
  ThemeContext,
  type ThemePreference,
} from './theme-context'

function storedPreference(): ThemePreference {
  const stored = readStored(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

/** "system" não escreve atributo nenhum: é o bloco @media do tokens.css que decide.
 *  "light" e "dark" escrevem data-theme e vencem o sistema operacional nos dois sentidos. */
function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', preference)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(storedPreference)

  useEffect(() => {
    applyPreference(preference)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writeStored(THEME_STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
