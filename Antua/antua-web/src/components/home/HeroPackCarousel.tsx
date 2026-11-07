import type { Ref } from 'react'
import { heroPacks } from '../../data/packs'
import { PackIllustration } from './PackIllustration'

export interface HeroPackCarouselRefs {
  viewport: Ref<HTMLDivElement>
  track: Ref<HTMLUListElement>
  progress: Ref<HTMLDivElement>
}

interface HeroPackCarouselProps {
  refs?: HeroPackCarouselRefs
  /** Sin animación: lista con scroll horizontal nativo y snap. */
  isStatic: boolean
}

/**
 * Mini carrusel de packs del hero. Lo mueve el scroll (GSAP en Hero.tsx), así que
 * no tiene controles propios; las cards son informativas y el CTA está en el texto.
 */
export function HeroPackCarousel({ refs, isStatic }: HeroPackCarouselProps) {
  return (
    <div>
      <div
        ref={refs?.viewport}
        // El padding del track deja ver las sombras; el margen negativo lo compensa.
        // Con scroll nativo, el contenedor tiene que poder enfocarse para scrollear con teclado.
        tabIndex={isStatic ? 0 : undefined}
        role={isStatic ? 'region' : undefined}
        aria-label={isStatic ? 'Packs' : undefined}
        className={isStatic ? '-m-3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain' : '-m-3 overflow-hidden'}
      >
        <ul ref={refs?.track} aria-label="Packs disponibles" className={`flex w-max gap-4 p-3 ${isStatic ? '' : 'will-change-transform'}`}>
          {heroPacks.map((pack) => (
            <li
              key={pack.id}
              className="flex w-64 shrink-0 snap-start items-center gap-4 rounded-card bg-surface p-4 shadow-soft sm:w-72 dark:bg-dark-card dark:shadow-dark-float"
            >
              <PackIllustration count={pack.count} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent-main dark:text-dark-accent-main">
                  x{pack.count}
                </p>
                <h3 className="font-display text-lg font-semibold leading-tight">{pack.title}</h3>
                <p className="mt-1 text-sm text-text-main/80 dark:text-dark-text-secondary">{pack.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!isStatic && (
        <div aria-hidden="true" className="mt-4 h-1 w-full overflow-hidden rounded-full bg-text-main/10 dark:bg-dark-text-main/10">
          <div ref={refs?.progress} className="h-full w-full origin-left scale-x-[0.3333] rounded-full bg-accent-main dark:bg-dark-accent-main" />
        </div>
      )}
    </div>
  )
}
