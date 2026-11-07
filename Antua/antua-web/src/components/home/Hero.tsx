import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useInView } from '../../hooks/useInView'
import { cookieConfig } from '../../three/cookie/cookieConfig'
import type { CookieHandle } from '../../three/cookie/CookieRig'
import { categoryHref } from '../../data/categories'
import { ButtonLink } from '../ui/ButtonLink'
import { HeroCookieStage } from './HeroCookieStage'
import { HeroPackCarousel } from './HeroPackCarousel'

/** Largo del scroll con el hero fijo, relativo al alto del viewport. */
const PIN_LENGTH = '+=160%'
const SCRUB = 0.6

// Línea de tiempo (en unidades de la timeline, que el scrub reparte sobre PIN_LENGTH).
const T_SWAP = 0.25 // cambia el texto y aparece el carrusel
const T_SWAP_DURATION = 0.3
const T_CAROUSEL = 0.65 // el carrusel recorre los tres packs
const T_CAROUSEL_DURATION = 0.6
const T_TOTAL = T_CAROUSEL + T_CAROUSEL_DURATION

export function Hero() {
  const reduced = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const phase1Ref = useRef<HTMLDivElement>(null)
  const phase2Ref = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const mainTriggerRef = useRef<ScrollTrigger | null>(null)

  // Se setea una sola vez, cuando la escena 3D está montada.
  const [cookie, setCookie] = useState<CookieHandle | null>(null)
  const inView = useInView(sectionRef)

  // Texto + carrusel: pin y scrub sobre el DOM. No depende del 3D (funciona también sin WebGL).
  useGSAP(
    () => {
      if (reduced) return
      const track = trackRef.current
      const viewport = viewportRef.current
      if (!track || !viewport) return

      const tl = gsap.timeline({
        defaults: { ease: 'power1.out' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: PIN_LENGTH,
          scrub: SCRUB,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      mainTriggerRef.current = tl.scrollTrigger ?? null

      tl.to(phase1Ref.current, { autoAlpha: 0, y: -24, duration: T_SWAP_DURATION }, T_SWAP)
        .fromTo(phase2Ref.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: T_SWAP_DURATION }, T_SWAP + 0.1)
        .fromTo(carouselRef.current, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: T_SWAP_DURATION }, T_SWAP + 0.1)
        .to(
          track,
          { x: () => -Math.max(0, track.scrollWidth - viewport.clientWidth), ease: 'none', duration: T_CAROUSEL_DURATION },
          T_CAROUSEL,
        )
        .fromTo(
          progressRef.current,
          { scaleX: 1 / 3 },
          { scaleX: 1, ease: 'none', duration: T_CAROUSEL_DURATION },
          T_CAROUSEL,
        )

      return () => {
        mainTriggerRef.current = null
      }
    },
    { scope: sectionRef, dependencies: [reduced] },
  )

  // Galleta: rotación ligada al scroll, en el mismo tramo que el pin.
  useGSAP(
    () => {
      const main = mainTriggerRef.current
      if (reduced || !cookie || !main) return
      const { stage, turn } = cookie

      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: () => main.start,
            end: () => main.end,
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        })
        .to(turn.rotation, { y: Math.PI * 2 * cookieConfig.scrollTurns, ease: 'none', duration: T_TOTAL }, 0)
        .to(
          stage.scale,
          { x: cookieConfig.carouselScale, y: cookieConfig.carouselScale, z: cookieConfig.carouselScale, duration: T_SWAP_DURATION },
          T_SWAP + 0.1,
        )
        .to(stage.position, { y: cookieConfig.carouselLift, duration: T_SWAP_DURATION }, T_SWAP + 0.1)
    },
    { dependencies: [reduced, cookie] },
  )

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className={`relative overflow-hidden ${reduced ? 'py-12 md:py-16' : 'h-svh min-h-150'}`}
    >
      <div
        className={`mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 ${
          reduced ? '' : 'h-full grid-rows-[auto_1fr] py-8 md:grid-rows-1 md:py-0'
        }`}
      >
        {/* Texto: las dos fases se apilan en la misma celda. */}
        <div className="grid">
          <div ref={phase1Ref} className="[grid-area:1/1]">
            <p className="text-sm font-bold text-accent-main dark:text-dark-accent-main">Galletas caseras</p>
            <h1
              id="hero-title"
              className="mt-3 font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] font-bold"
            >
              Hechas para darte un gustito.
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-text-main/85 dark:text-dark-text-secondary">
              Horneamos en tandas chicas, con manteca de verdad. También hay opciones sin gluten, veganas y sin
              azúcar.
            </p>
            <ButtonLink to={categoryHref('clasicas')} className="mt-8">
              Ver galletas
              <ArrowRight aria-hidden="true" className="size-5" />
            </ButtonLink>
          </div>

          {!reduced && (
            <div ref={phase2Ref} className="invisible opacity-0 [grid-area:1/1]">
              <p className="text-sm font-bold text-accent-main dark:text-dark-accent-main">Packs</p>
              <h2 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.1] font-bold">
                Elegí cuántas querés.
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-text-main/85 dark:text-dark-text-secondary">
                Una para el antojo, seis para compartir o doce para regalar. Todas recién horneadas.
              </p>
              <ButtonLink to={categoryHref('packs')} className="mt-8">
                Ver packs
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
            </div>
          )}
        </div>

        {/* Escena: galleta 3D y, encima, el carrusel que aparece con el scroll. */}
        <div className={`relative min-h-0 ${reduced ? 'aspect-square max-h-120 w-full' : 'h-full'}`}>
          <HeroCookieStage active={inView} reducedMotion={reduced} onReady={setCookie} />
          {!reduced && (
            <div ref={carouselRef} className="invisible absolute inset-x-0 bottom-6 opacity-0 md:bottom-16">
              <HeroPackCarousel
                isStatic={false}
                refs={{ viewport: viewportRef, track: trackRef, progress: progressRef }}
              />
            </div>
          )}
        </div>

        {reduced && (
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl font-semibold">Elegí cuántas querés</h2>
            <div className="mt-4">
              <HeroPackCarousel isStatic />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
