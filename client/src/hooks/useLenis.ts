import { useEffect, useRef } from 'react'
import Lenis, { type LenisOptions } from 'lenis'
import 'lenis/dist/lenis.css'

export function useLenis(options?: LenisOptions) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
      infinite: false,
      autoRaf: false,
      ...options,
    })

    lenisRef.current = lenis
    ;(window as any).__lenis = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
      delete (window as any).__lenis
    }
  }, [options])

  return lenisRef
}

export default useLenis
