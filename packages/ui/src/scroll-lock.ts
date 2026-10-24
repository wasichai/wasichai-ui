import { useEffect } from 'react'

// how many open layers hold the page, and what <html> had before the first one
let holders = 0
let before: { overflow: string; paddingRight: string } | null = null

// keeps the page from scrolling while a modal layer is open. CSSOM, not an injected <style>:
// a strict CSP (style-src 'self') blocks the style react-remove-scroll adds, not element.style (#58)
export function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement
    if (holders++ === 0) {
      // the scrollbar goes away with the overflow: pad its width so the page does not jump
      const gap = window.innerWidth - root.clientWidth
      before = { overflow: root.style.overflow, paddingRight: root.style.paddingRight }
      root.style.overflow = 'hidden'
      if (gap > 0) root.style.paddingRight = `${gap}px`
    }
    return () => {
      if (--holders > 0 || !before) return
      root.style.overflow = before.overflow
      root.style.paddingRight = before.paddingRight
      before = null
    }
  }, [])
}
