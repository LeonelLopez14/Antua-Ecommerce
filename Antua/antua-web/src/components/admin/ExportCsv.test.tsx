import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { ExportCsv } from './ExportCsv'
import { useToastStore } from '../../stores/toastStore'

describe('ExportCsv', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    // jsdom no implementa object URLs.
    URL.createObjectURL = vi.fn(() => 'blob:prueba')
    URL.revokeObjectURL = vi.fn()
  })

  it('si falta algo lo dice al lado, sin pedir el archivo', () => {
    const onExport = vi.fn()
    render(<ExportCsv what="pedidos" validate={() => 'Elegí las fechas.'} onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí las fechas.')
    expect(onExport).not.toHaveBeenCalled()
  })

  it('descarga con el separador elegido y avisa cuántas filas', async () => {
    const onExport = vi.fn(() => Promise.resolve({ blob: new Blob(['x']), filename: 'pedidos.csv', rows: 12 }))
    render(<ExportCsv what="pedidos" onExport={onExport} />)
    fireEvent.change(screen.getByLabelText('Separador'), { target: { value: 'comma' } })
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() => expect(useToastStore.getState().toasts[0]?.message).toBe('Exportamos 12 pedidos en pedidos.csv.'))
    expect(onExport).toHaveBeenCalledWith('comma')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('muestra el motivo que da la API (por ejemplo, demasiadas filas)', async () => {
    const tooLarge = new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      data: { message: 'Son 12000 pedidos; el máximo por archivo es 10000. Acotá el rango de fechas o los filtros.' },
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    render(<ExportCsv what="pedidos" onExport={() => Promise.reject(tooLarge)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('el máximo por archivo es 10000')
  })
})
