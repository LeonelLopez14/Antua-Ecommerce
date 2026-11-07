import { Dialog, type DialogProps } from './Dialog'

interface DrawerProps extends Omit<DialogProps, 'placement' | 'hideTitle' | 'headerContent'> {
  side?: 'left' | 'right'
}

/** Panel lateral modal (filtros de Tienda, carrito). Toda la lógica vive en Dialog. */
export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return <Dialog placement={side} {...props} />
}
