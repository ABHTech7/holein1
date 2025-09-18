import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => setIsMobile(mql.matches)

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update)
    } else if (typeof (mql as any).addListener === "function") {
      // Safari/iOS < 14 fallback
      ;(mql as any).addListener(update)
    }

    update()

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", update)
      } else if (typeof (mql as any).removeListener === "function") {
        ;(mql as any).removeListener(update)
      }
    }
  }, [])

  return !!isMobile
}
