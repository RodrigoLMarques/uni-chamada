import { Modal } from './Modal'

export function StudentPhotoModal({
  name,
  ra,
  photoUrl,
  onClose,
}: {
  name: string
  ra?: string
  photoUrl: string
  onClose: () => void
}) {
  return (
    <Modal
      title={name}
      description={ra ? `RA ${ra}` : undefined}
      onClose={onClose}
      actions={
        <button className="uc-btn uc-btn-secondary" type="button" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="uc-photo-zoom">
        <img alt={`Foto de ${name}`} src={photoUrl} />
      </div>
    </Modal>
  )
}
