import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Rnd } from 'react-rnd'
import { audioSrc, API } from '../lib/api'
import { loadGeo, saveGeo } from '../lib/geo'
import type { SbChannel } from '../lib/types'
import { usePanelCtx } from '../lib/panel-context'
import { PanelHeader } from '../lib/PanelHeader'

export type { SbChannel }
export type SoundKey = { id: string; label: string; emoji: string; src: string; color?: string }
type PlayMode = 'toggle'

function isYouTube(s: string) { return /youtube\.com|youtu\.be/.test(s) }

const ytStreamCache = new Map<string, string>()

const COLORS = ['#00b860','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16']
const KEY_SIZE = 96
const GAP = 10
const PAD = 18

function makeKey(): SoundKey {
  return { id: crypto.randomUUID(), label: 'New Key', emoji: '🔊', src: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] }
}

function loadKeys(): SoundKey[] {
  try { const r = localStorage.getItem('soundboard-keys'); if (r) return JSON.parse(r) } catch {}
  return [
    { id: crypto.randomUUID(), label: 'Sound 1', emoji: '🔈', src: '', color: '#00b860' },
    { id: crypto.randomUUID(), label: 'Sound 2', emoji: '🎵', src: '', color: '#3b82f6' },
    { id: crypto.randomUUID(), label: 'Sound 3', emoji: '💥', src: '', color: '#f59e0b' },
    { id: crypto.randomUUID(), label: 'Sound 4', emoji: '🎤', src: '', color: '#ec4899' },
  ]
}

/* ── Edit popup ── */
function EditPopup({
  keyItem, anchorRef, onSave, onClose,
}: {
  keyItem: SoundKey
  anchorRef: React.RefObject<HTMLDivElement | null>
  onSave: (patch: Partial<SoundKey>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ label: keyItem.label, emoji: keyItem.emoji, src: keyItem.src, color: keyItem.color || COLORS[0] })
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })

  /* position relative to viewport, flip if near edge */
  useEffect(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const popH = 210
    if (spaceBelow >= popH + 8) {
      setPos({ top: r.bottom + 6, left: r.left })
    } else {
      setPos({ bottom: window.innerHeight - r.top + 6, left: r.left })
    }
  }, [anchorRef])

  /* close on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div
      ref={popRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', zIndex: 9999, width: 240,
        ...pos,
        borderRadius: 'var(--radius-sm)', padding: 12,
        background: 'var(--bg-popup)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={form.emoji}
          onChange={e => setForm(f => ({ ...f, emoji: e.target.value.slice(-2) || e.target.value }))}
          placeholder="🔊"
          maxLength={2}
          style={{ ...inp, width: 42, textAlign: 'center', fontSize: 16 }}
        />
        <input
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          placeholder="Label"
          style={{ ...inp, flex: 1 }}
          autoFocus
        />
      </div>
      <input
        value={form.src}
        onChange={e => setForm(f => ({ ...f, src: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') onSave(form); if (e.key === 'Escape') onClose() }}
        placeholder="URL or file path (.mp3, .wav…)"
        style={inp}
      />
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
            width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer',
            outline: form.color === c ? '2px solid #fff' : '2px solid transparent', outlineOffset: 1,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onSave(form)} style={{
          flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
          background: 'linear-gradient(180deg,#e5e7eb,#9ca3af)', color: '#000',
          fontWeight: 800, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>Save</button>
        <button onClick={onClose} style={{
          padding: '7px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
          fontWeight: 700, fontSize: 11,
        }}>✕</button>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.8)',
  background: '#0b0c0e', color: '#fff', fontSize: 12, outline: 'none',
  boxShadow: 'inset 0 6px 15px rgba(0,0,0,.8)',
}

type KeyState = { volume: number; currentTime: number; duration: number }

/* ── Main component ── */
export function SoundboardPanel({ onClose, onChannelChange }: {
  onClose: () => void
  onChannelChange?: (channels: SbChannel[]) => void
}) {
  const { zOf, bringToFront, endDrag, isDragging, scale } = usePanelCtx()
  const geo = loadGeo('soundboard', { x: 460, y: 520, w: 480, h: 260 })

  const [keys, setKeys] = useState<SoundKey[]>(loadKeys)
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set())
  const [keyStates, setKeyStates] = useState<Map<string, KeyState>>(new Map())
  const [editKey, setEditKey] = useState<SoundKey | null>(null)
  const [panelW, setPanelW] = useState(geo.w || 480)

  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map())
  const innerRef = useRef<HTMLDivElement>(null)
  const keyRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => { localStorage.setItem('soundboard-keys', JSON.stringify(keys)) }, [keys])
  useEffect(() => () => { audioMap.current.forEach(a => { a.pause(); a.src = '' }) }, [])

  useEffect(() => {
    if (!innerRef.current) return
    const ro = new ResizeObserver(entries => { const w = entries[0]?.contentRect.width; if (w) setPanelW(w) })
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [])

  /* emit channels to parent whenever playing/state changes */
  const keysRef = useRef(keys)
  keysRef.current = keys
  useEffect(() => {
    if (!onChannelChange) return
    const playing = keysRef.current.filter(k => playingIds.has(k.id))
    const channels: SbChannel[] = playing.map(k => {
      const st = keyStates.get(k.id) ?? { volume: 80, currentTime: 0, duration: 0 }
      return {
        id: k.id, label: k.label, emoji: k.emoji,
        playing: true, ...st,
        setVolume: (v: number) => {
          setKeyStates(prev => { const m = new Map(prev); m.set(k.id, { ...(m.get(k.id) ?? { volume: 80, currentTime: 0, duration: 0 }), volume: v }); return m })
          const a = audioMap.current.get(k.id); if (a) a.volume = v / 100
        },
        seek: (t: number) => {
          const a = audioMap.current.get(k.id); if (a) { a.currentTime = t; setKeyStates(prev => { const m = new Map(prev); m.set(k.id, { ...(m.get(k.id) ?? { volume: 80, currentTime: 0, duration: 0 }), currentTime: t }); return m }) }
        },
        stop: () => stopKey(k.id),
      }
    })
    onChannelChange(channels)
  }, [playingIds, keyStates])

  const cols = Math.max(1, Math.floor((panelW - PAD * 2 + GAP) / (KEY_SIZE + GAP)))

  const setPlaying = (id: string, on: boolean) =>
    setPlayingIds(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n })

  const stopKey = useCallback((id: string) => {
    const a = audioMap.current.get(id)
    if (a) { a.pause(); a.currentTime = 0 }
    setPlaying(id, false)
  }, [])

  const playKey = useCallback(async (key: SoundKey) => {
    if (!key.src) return
    let src: string
    if (isYouTube(key.src)) {
      let cached = ytStreamCache.get(key.src)
      if (!cached) {
        try {
          const res = await fetch(`${API}/api/yt-stream?url=${encodeURIComponent(key.src)}`)
          const data = await res.json()
          if (data.error || !data.url) return
          cached = data.url
          ytStreamCache.set(key.src, cached!)
        } catch { return }
      }
      src = cached!
    } else {
      src = audioSrc(key.src)
    }
    const initSt = { volume: keyStates.get(key.id)?.volume ?? 80, currentTime: 0, duration: 0 }
    let a = audioMap.current.get(key.id)
    if (!a) {
      a = new Audio(src)
      a.volume = initSt.volume / 100
      a.addEventListener('timeupdate', () => setKeyStates(prev => { const m = new Map(prev); const s = m.get(key.id) ?? initSt; m.set(key.id, { ...s, currentTime: a!.currentTime }); return m }))
      a.addEventListener('loadedmetadata', () => setKeyStates(prev => { const m = new Map(prev); const s = m.get(key.id) ?? initSt; m.set(key.id, { ...s, duration: a!.duration }); return m }))
      a.onended = () => setPlaying(key.id, false)
      audioMap.current.set(key.id, a)
    } else { a.src = src }
    a.currentTime = 0
    a.play().then(() => setPlaying(key.id, true)).catch(() => {})
  }, [keyStates])

  const handleClick = (key: SoundKey) => {
    playingIds.has(key.id) ? stopKey(key.id) : playKey(key)
  }

  const commitEdit = (id: string, patch: Partial<SoundKey>) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k))
    const a = audioMap.current.get(id)
    if (a && patch.src) a.src = audioSrc(patch.src)
    setEditKey(null)
  }

  const removeKey = (id: string) => {
    stopKey(id); audioMap.current.delete(id)
    setKeys(prev => prev.filter(k => k.id !== id))
    if (editKey?.id === id) setEditKey(null)
  }

  const closeBtnSt: React.CSSProperties = {
    width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  return (
    <>
      <Rnd
        default={{ x: geo.x, y: geo.y, width: geo.w, height: 'auto' }}
        minWidth={KEY_SIZE + PAD * 2}
        enableResizing={{ right: true, left: true, bottomRight: true, bottomLeft: true }}
        bounds="parent"
        dragHandleClassName="sb-drag"
        className={`panel-drag${isDragging('soundboard') ? ' dragging' : ''}`}
        scale={scale}
        onDragStart={() => bringToFront('soundboard')}
        onDragStop={(_e, d) => { saveGeo('soundboard', { x: d.x, y: d.y }); endDrag('soundboard') }}
        onResizeStop={(_e, _d, ref, _delta, pos) => {
          const w = ref.offsetWidth; setPanelW(w)
          saveGeo('soundboard', { w, h: ref.offsetHeight, x: pos.x, y: pos.y })
        }}
        style={{ zIndex: zOf('soundboard', 12) }}
      >
        <div
          ref={innerRef}
          style={{
            width: '100%', borderRadius: 'var(--radius-panel)',
            background: 'var(--bg-chassis)', boxShadow: 'var(--shadow-chassis)',
            padding: PAD, userSelect: 'none',
          }}
        >
          {/* Header */}
          <PanelHeader title="Soundboard" onClose={onClose} className="sb-drag" />

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${KEY_SIZE}px)`,
            gap: GAP,
          }}>
            {keys.map(key => {
              const isPlaying = playingIds.has(key.id)
              const accent = key.color || '#00b860'
              const anchorRef = { current: keyRefs.current.get(key.id) ?? null } as React.RefObject<HTMLDivElement | null>

              return (
                <div
                  key={key.id}
                  ref={el => { if (el) keyRefs.current.set(key.id, el); else keyRefs.current.delete(key.id) }}
                  className="sb-key-wrap"
                  onClick={() => handleClick(key)}
                  onContextMenu={e => { e.preventDefault(); setEditKey(key) }}
                  style={{
                    width: KEY_SIZE, height: KEY_SIZE,
                    borderRadius: 'var(--radius-key, 14px)',
                    background: isPlaying
                      ? `linear-gradient(160deg,${accent}18 0%,${accent}08 100%)`
                      : 'var(--bg-key-off)',
                    boxShadow: isPlaying
                      ? `0 3px 0 #000, inset 0 3px 6px rgba(0,0,0,.6), 0 0 12px ${accent}33`
                      : 'var(--shadow-key-off)',
                    border: isPlaying ? `1px solid ${accent}30` : '1px solid transparent',
                    cursor: key.src ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 5,
                    position: 'relative', overflow: 'hidden',
                    transition: 'box-shadow 0.2s, background 0.2s, border-color 0.2s',
                    opacity: key.src ? 1 : 0.55,
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{key.emoji}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--text-70)',
                    textAlign: 'center', padding: '0 5px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '92%',
                  }}>{key.label}</span>

                  {/* LED */}
                  <div style={{
                    position: 'absolute', bottom: 7, right: 7,
                    width: 4, height: 4, borderRadius: '50%',
                    background: isPlaying ? accent : 'rgba(255,255,255,0.08)',
                    boxShadow: isPlaying ? `0 0 4px ${accent}` : 'none',
                    animation: isPlaying ? 'sb-led-blink 2s ease-in-out infinite' : 'none',
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }} />

                  {/* Remove ✕ — top-right corner, appears on hover */}
                  <button
                    className="sb-key-remove"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); removeKey(key.id) }}
                    style={{
                      position: 'absolute', top: 5, right: 5, zIndex: 2,
                      width: 16, height: 16, border: 'none', borderRadius: 4, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.7)', color: '#fff',
                      fontSize: 9, fontWeight: 900, lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                  >✕</button>
                </div>
              )
            })}

            {/* Add key */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setKeys(prev => [...prev, makeKey()])}
              className="sb-key-add"
              style={{
                width: KEY_SIZE, height: KEY_SIZE,
                borderRadius: 'var(--radius-key, 14px)',
                background: 'transparent',
                border: '2px dashed rgba(255,255,255,0.08)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-20)',
              }}
              title="Add sound key"
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            </button>
          </div>
        </div>
      </Rnd>

      {/* Edit popup — rendered outside Rnd so it's never clipped */}
      {editKey && (
        <EditPopup
          keyItem={editKey}
          anchorRef={{ current: keyRefs.current.get(editKey.id) ?? null } as React.RefObject<HTMLDivElement | null>}
          onSave={patch => commitEdit(editKey.id, patch)}
          onClose={() => setEditKey(null)}
        />
      )}

      <style>{`
        @keyframes sb-led-blink {
          0%,100% { opacity:1; }
          50%      { opacity:0.35; }
        }
        .sb-drag:active { cursor:grabbing !important; }
        .sb-key-wrap:hover .sb-key-remove { opacity:1 !important; }
        .sb-key-add:hover { border-color:rgba(255,255,255,0.22) !important; color:var(--text-70) !important; }
      `}</style>
    </>
  )
}
