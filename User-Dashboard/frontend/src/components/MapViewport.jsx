// ─────────────────────────────────────────────────────────────────────────────
// MapViewport — wraps the ParkMap and gives it real-map pan + zoom: one-finger
// drag to pan, two-finger pinch to zoom (mouse-wheel on desktop), plus +/−/reset
// controls. Taps still pass through to block markers; a tap is only swallowed if
// the user actually dragged/pinched. No external libraries.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useEffect, useCallback } from 'react'

const MIN = 1, MAX = 5

export default function MapViewport({ children, overlay }) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const pointers = useRef(new Map())
  const pinch = useRef({ dist: 0, mid: { x: 0, y: 0 } })
  const moved = useRef(false)
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const [dims, setDims] = useState({ vw: 0, vh: 0, contentH: 0 })

  // Track viewport + content size (for the LOD marker overlay + culling).
  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current, inner = innerRef.current
      if (w) setDims({ vw: w.clientWidth, vh: w.clientHeight, contentH: inner ? inner.clientHeight : w.clientWidth * 1674 / 939 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    if (innerRef.current) ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [])

  // Keep the scaled map inside the viewport (centered when smaller than it).
  const clamp = useCallback((s, x, y) => {
    const wrap = wrapRef.current, inner = innerRef.current
    if (!wrap || !inner) return { s, x, y }
    const W = wrap.clientWidth, H = wrap.clientHeight
    const cw = W, ch = inner.clientHeight
    s = Math.min(MAX, Math.max(MIN, s))
    const sw = cw * s, sh = ch * s
    x = sw <= W ? (W - sw) / 2 : Math.min(0, Math.max(W - sw, x))
    y = sh <= H ? (H - sh) / 2 : Math.min(0, Math.max(H - sh, y))
    return { s, x, y }
  }, [])

  const rectPt = (e) => {
    const r = wrapRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e) => {
    pointers.current.set(e.pointerId, rectPt(e))
    moved.current = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current.dist = Math.hypot(a.x - b.x, a.y - b.y)
      pinch.current.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
  }

  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)
    const cur = rectPt(e)
    pointers.current.set(e.pointerId, cur)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const prevMid = pinch.current.mid
      const ratio = dist / (pinch.current.dist || dist)
      setT(p => {
        const s = p.s * ratio
        const k = s / p.s
        const x = mid.x - k * (mid.x - p.x) + (mid.x - prevMid.x)
        const y = mid.y - k * (mid.y - p.y) + (mid.y - prevMid.y)
        return clamp(s, x, y)
      })
      pinch.current.dist = dist
      pinch.current.mid = mid
      moved.current = true
    } else if (pointers.current.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true
      setT(p => clamp(p.s, p.x + dx, p.y + dy))
    }
  }

  const onUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current.dist = 0
  }

  const zoomAt = (factor, px, py) => setT(p => {
    const s = p.s * factor, k = s / p.s
    return clamp(s, px - k * (px - p.x), py - k * (py - p.y))
  })

  const zoomCenter = (factor) => {
    const W = wrapRef.current.clientWidth, H = wrapRef.current.clientHeight
    zoomAt(factor, W / 2, H / 2)
  }
  const reset = () => setT(clamp(1, 0, 0))

  // Native (non-passive) wheel zoom so preventDefault works on desktop.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Swallow the click that ends a drag/pinch so it doesn't open a block.
  const onClickCapture = (e) => {
    if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false }
  }

  return (
    <div className="mv">
      <div
        ref={wrapRef}
        className="mv-vp"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        onClickCapture={onClickCapture}
      >
        <div ref={innerRef} className="mv-content" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
          {children}
        </div>
        {overlay && (
          <div className="mv-overlay">
            {overlay({ scale: t.s, tx: t.x, ty: t.y, vw: dims.vw, vh: dims.vh, contentH: dims.contentH })}
          </div>
        )}
      </div>
      <div className="mv-ctrls">
        <button type="button" className="mv-btn" onClick={() => zoomCenter(1.4)} aria-label="Zoom in">+</button>
        <button type="button" className="mv-btn" onClick={() => zoomCenter(1 / 1.4)} aria-label="Zoom out">−</button>
        <button type="button" className="mv-btn mv-btn-fit" onClick={reset} aria-label="Reset view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>
  )
}