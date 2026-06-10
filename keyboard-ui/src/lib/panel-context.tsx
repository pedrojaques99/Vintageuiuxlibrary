import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react'

const MIN_CANVAS_WIDTH = 900
const BASE_SCALE = 0.65

interface PanelCtx {
  scale: number
  zOf: (id: string, base?: number) => number
  bringToFront: (id: string) => void
  endDrag: (id: string) => void
  isDragging: (id: string) => boolean
}

const Ctx = createContext<PanelCtx>({
  scale: BASE_SCALE,
  zOf: (_id, base = 10) => base,
  bringToFront: () => {},
  endDrag: () => {},
  isDragging: () => false,
})

export function PanelProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(BASE_SCALE)
  const zRef = useRef(20)
  const [zMap, setZMap] = useState<Record<string, number>>({})
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null)

  useEffect(() => {
    function update() {
      const available = window.innerWidth - 72
      const fitScale = available / MIN_CANVAS_WIDTH
      setScale(Math.min(BASE_SCALE, fitScale))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  function bringToFront(id: string) {
    zRef.current += 1
    setZMap(m => ({ ...m, [id]: zRef.current }))
    setDraggingPanel(id)
  }

  function endDrag(id: string) {
    setDraggingPanel(p => (p === id ? null : p))
  }

  const value: PanelCtx = {
    scale,
    zOf: (id, base = 10) => zMap[id] ?? base,
    bringToFront,
    endDrag,
    isDragging: (id) => draggingPanel === id,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePanelCtx() {
  return useContext(Ctx)
}
