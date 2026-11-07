import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonVariant } from './buttonStyles'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

/** CTA tipo pill (DESIGN.md §4). Es navegación, por eso es un Link y no un <button>. */
export function ButtonLink({ variant = 'primary', className = '', ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />
}
