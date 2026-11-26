import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StudentAvatar } from './StudentAvatar'

const PHOTO = 'https://storage.example/students/180385.jpg?sig=abc'

describe('StudentAvatar', () => {
  it('sem zoom a foto não vira botão', () => {
    render(<StudentAvatar name="Ana Souza" photoUrl={PHOTO} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('com zoom abre a foto ampliada em uma modal', async () => {
    const user = userEvent.setup()
    render(<StudentAvatar name="Ana Souza" ra="180385" photoUrl={PHOTO} zoomable />)

    await user.click(screen.getByRole('button', { name: 'Ver a foto de Ana Souza' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Ana Souza')
    expect(dialog).toHaveTextContent('RA 180385')
    expect(screen.getByAltText('Foto de Ana Souza')).toHaveAttribute('src', PHOTO)
  })

  it('fecha a modal pelo botão', async () => {
    const user = userEvent.setup()
    render(<StudentAvatar name="Ana Souza" photoUrl={PHOTO} zoomable />)

    await user.click(screen.getByRole('button', { name: 'Ver a foto de Ana Souza' }))
    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem foto mostra as iniciais e não oferece zoom', () => {
    render(<StudentAvatar name="Ana Souza" photoUrl={null} zoomable />)

    expect(screen.getByText('AS')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
