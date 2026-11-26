import { useState } from 'react'
import { initialsFrom } from '@/lib/initials'
import { StudentPhotoModal } from './StudentPhotoModal'

/** A foto vem assinada pela API e expira. Falhou o carregamento, cai nas
 *  iniciais, que é o caso mais comum de qualquer forma. */
export function StudentAvatar({
  name,
  ra,
  photoUrl,
  size = 'md',
  zoomable = false,
}: {
  name: string
  ra?: string
  photoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  /** Só nas telas do professor: abre a foto ampliada para ele conferir o rosto. */
  zoomable?: boolean
}) {
  // Guarda a url que falhou, não um booleano: assim uma foto nova volta a ser
  // tentada sem precisar de efeito para zerar o estado.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)
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

  const photo = <img alt="" src={photoUrl} onError={() => setBrokenUrl(photoUrl)} />

  if (!zoomable) return <span className={className}>{photo}</span>

  return (
    <>
      <button
        className={`${className} uc-avatar-zoom`}
        type="button"
        title={`Ver a foto de ${name}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setZoomed(true)
        }}
      >
        {photo}
        <span className="uc-visually-hidden">Ver a foto de {name}</span>
        <span className="uc-avatar-zoom-icon" aria-hidden="true">
          <span className="uc-icon uc-i-search" />
        </span>
      </button>

      {zoomed ? (
        <StudentPhotoModal
          name={name}
          ra={ra}
          photoUrl={photoUrl}
          onClose={() => setZoomed(false)}
        />
      ) : null}
    </>
  )
}
