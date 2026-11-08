import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('suma y resta de a una', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={2} max={5} onChange={onChange} label="Cantidad de Clásica" />)

    await userEvent.click(screen.getByRole('button', { name: 'Sumar una' }))
    await userEvent.click(screen.getByRole('button', { name: 'Restar una' }))

    expect(onChange.mock.calls).toEqual([[3], [1]])
  })

  it('deshabilita los botones en los límites (mínimo 1 y stock)', () => {
    const { rerender } = render(<QuantityStepper value={1} max={3} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Restar una' })).toBeDisabled()

    rerender(<QuantityStepper value={3} max={3} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sumar una' })).toBeDisabled()
  })

  it('al escribir una cantidad mayor al stock, la limita al confirmar', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={1} max={4} onChange={onChange} label="Cantidad" />)

    const input = screen.getByRole('spinbutton', { name: 'Cantidad' })
    await userEvent.clear(input)
    await userEvent.type(input, '9{Enter}')

    expect(onChange).toHaveBeenLastCalledWith(4)
  })

  it('el grupo tiene nombre accesible', () => {
    render(<QuantityStepper value={1} max={4} onChange={() => {}} label="Cantidad de Avena" />)
    expect(screen.getByRole('group', { name: 'Cantidad de Avena' })).toBeInTheDocument()
  })
})
