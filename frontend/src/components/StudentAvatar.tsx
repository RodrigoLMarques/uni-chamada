import { useState } from 'react'
import { initialsFrom } from '@/lib/initials'

/** A foto vem assinada pela API e expira. Falhou o carregamento, cai nas
 *  iniciais, que é o caso mais comum de qualquer forma. */
export function StudentAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string
  photoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  // Guarda a url que falhou, não um booleano: assim uma foto nova volta a ser
  // tentada sem precisar de efeito para zerar o estado.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const broken = photoUrl !== null && brokenUrl === photoUrl

  const className = ['uc-avatar', size === 'sm' && 'uc-avatar-sm', size === 'lg' && 'uc-avatar-lg']
    .filter(Boolean)
    .join(' ')

  if (!photoUrl || broken) {
    return (
      <span className={className} aria-hidden="true">
        {initialsFrom(name)}
      </span>
    )
  }

  return (
    <span className={className}>
      <img alt="" src={photoUrl} onError={() => setBrokenUrl(photoUrl)} />
    </span>
  )
}
