import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from './gsap'

// ScrollTrigger solo lo usa el hero de la Home: importarlo desde acá lo deja en el chunk de la Home
// y no en el bundle principal.
gsap.registerPlugin(ScrollTrigger)

export { ScrollTrigger }
