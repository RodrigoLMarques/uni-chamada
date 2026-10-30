import { createContext } from 'react'

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export type ThemeContextValue = {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const THEME_STORAGE_KEY = 'unichamada.theme'

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
}
