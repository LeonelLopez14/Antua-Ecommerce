import { useId, useState } from 'react'
import { Download } from 'lucide-react'
import type { CsvDownload, CsvSeparator } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { toast } from '../../stores/toastStore'
import { Button } from '../ui/Button'
import { SelectField } from './fields'

interface ExportCsvProps {
  /** Lo que se exporta, para los mensajes ("pedidos", "variantes"). */
  what: string
  /** Antes de pedir el archivo: un motivo si falta algo (por ejemplo, el rango de fechas). */
  validate?: () => string | null
  onExport: (separator: CsvSeparator) => Promise<CsvDownload>
}

/** Guarda el archivo con el nombre que mandó la API. */
function save({ blob, filename }: CsvDownload): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // El navegador ya tomó la descarga: se libera la memoria del Blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * "Exportar CSV" con el separador elegible. El botón queda habilitado hasta que arranca la
 * descarga; si falta algo, lo dice al lado (role="alert") en vez de deshabilitarse sin explicar.
 * El resultado también se anuncia en el Toaster (aria-live).
 */
export function ExportCsv({ what, validate, onExport }: ExportCsvProps) {
  const id = useId()
  const [separator, setSeparator] = useState<CsvSeparator>('semicolon')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    const problem = validate?.() ?? null
    setError(problem)
    if (problem) return
    setPending(true)
    try {
      const file = await onExport(separator)
      save(file)
      toast(`Exportamos ${file.rows} ${what} en ${file.filename}.`)
    } catch (caught) {
      const message = getApiErrorMessage(caught, 'No pudimos generar el archivo. Probá de nuevo en un rato.')
      setError(message)
      toast(message, 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField id={`${id}-separador`} label="Separador" value={separator} onChange={(event) => setSeparator(event.target.value as CsvSeparator)}>
        <option value="semicolon">Punto y coma (Excel en Uruguay)</option>
        <option value="comma">Coma</option>
      </SelectField>
      <Button variant="secondary" loading={pending} onClick={() => void run()} aria-describedby={error ? `${id}-error` : undefined}>
        <Download aria-hidden="true" className="size-4" />
        {pending ? 'Exportando…' : 'Exportar CSV'}
      </Button>
      {error && (
        <p id={`${id}-error`} role="alert" className="basis-full text-sm font-bold text-accent-main dark:text-dark-accent-main">
          {error}
        </p>
      )}
    </div>
  )
}
