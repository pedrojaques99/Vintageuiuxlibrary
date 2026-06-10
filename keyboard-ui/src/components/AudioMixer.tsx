import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API } from '../lib/api'
import { PanelHeader } from '../lib/PanelHeader'
import type { SbChannel } from '../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type AudioSession = {
  pid: number; name: string; display_name: string
  volume: number; muted: boolean; peak: number
  is_input?: boolean; inactive?: boolean
}
type Action = { type?: string; path?: string; label?: string }
type Config = { buttons?: Record<string, Action> }
type DeckState = { playing: boolean; currentTime: number; duration: number; volume: number }

const KEY_NAMES: Record<string, string> = {
  key_f13: 'F13', key_f14: 'F14', key_f15: 'F15', key_f16: 'F16',
  key_f17: 'F17', key_f18: 'F18', key_f19: 'F19', key_f20: 'F20',
  key_f21: 'F21', key_f22: 'F22', key_f23: 'F23', key_f24: 'F24',
}

// ─── App icon map ─────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  'Google Chrome': '🌐', Firefox: '🦊', Edge: '🔵', Opera: '🔴', Brave: '🦁',
  Discord: '💬', Spotify: '🎵', VLC: '🎬', 'OBS Studio': '📹', Steam: '🎮',
  Teams: '👥', Slack: '💼', Zoom: '📞', Skype: '📡', WhatsApp: '📱',
  Telegram: '✈️', foobar2000: '🎸', Winamp: '🎧', Audacity: '🎙️', REAPER: '🎚️',
  System: '🔊',
}

function icon(d: string, n: string, isInput?: boolean) {
  if (isInput || n === 'mic') return '🎙️'
  if (ICONS[d]) return ICONS[d]
  const l = n.toLowerCase()
  if (l.includes('game') || l.includes('unity')) return '🎮'
  if (l.includes('video') || l.includes('media')) return '🎬'
  return '⬡'
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function isYouTube(p: string) { return /youtube\.com|youtu\.be/.test(p) }

// ─── Shared AudioContext ───────────────────────────────────────────────────────
let sharedCtx: AudioContext | null = null
function getCtx() {
  if (!sharedCtx) sharedCtx = new AudioContext()
  return sharedCtx
}
type AudioNodes = { source: MediaElementAudioSourceNode; analyser: AnalyserNode }
const audioNodeMap = new WeakMap<HTMLAudioElement, AudioNodes>()
function getNodes(audioEl: HTMLAudioElement): AudioNodes {
  if (audioNodeMap.has(audioEl)) return audioNodeMap.get(audioEl)!
  const ctx = getCtx()
  const source = ctx.createMediaElementSource(audioEl)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 64
  source.connect(analyser)
  analyser.connect(ctx.destination)
  const nodes = { source, analyser }
  audioNodeMap.set(audioEl, nodes)
  return nodes
}

// ─── VU Meter (system channels) ───────────────────────────────────────────────
function VuMeter({ peak, muted }: { peak: number; muted: boolean }) {
  const SEGS = 24
  const boosted = muted ? 0 : Math.sqrt(peak) * 1.4
  const active = Math.min(SEGS, Math.ceil(boosted * SEGS))
  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2.25, alignItems: 'center', height: 144 }}>
      {Array.from({ length: SEGS }, (_, i) => {
        const on = i < active
        const isRed = i >= 20, isYellow = i >= 15 && i < 20
        const litColor = isRed ? '#ff1744' : isYellow ? '#ffd600' : 'var(--text-70)'
        const deadColor = isRed ? '#2a0808' : isYellow ? '#1e1800' : 'rgba(255,255,255,0.05)'
        return <div key={i} style={{ width: 15, height: 4, borderRadius: 1.5, background: on ? litColor : deadColor, transition: 'background 50ms' }} />
      })}
    </div>
  )
}

// ─── Deck Visualizer (soundtrack channels) ────────────────────────────────────
const CANVAS_STYLE: React.CSSProperties = { display: 'block', width: '100%', height: '24px', borderRadius: '4px', opacity: 0.85 }

function RealVisualizer({ audioEl }: { audioEl: HTMLAudioElement }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    let nodes: AudioNodes
    try { nodes = getNodes(audioEl) } catch { return }
    const { analyser } = nodes
    const data = new Uint8Array(analyser.frequencyBinCount)
    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current; if (!canvas) return
      const w = canvas.width, h = canvas.height
      const dctx = canvas.getContext('2d')!
      dctx.clearRect(0, 0, w, h)
      analyser.getByteFrequencyData(data)
      const bars = Math.min(data.length, 20), bw = w / bars - 1
      for (let i = 0; i < bars; i++) {
        const pct = data[i] / 255, bh = Math.max(2, pct * h)
        const g = dctx.createLinearGradient(0, h - bh, 0, h)
        g.addColorStop(0, `rgba(0,184,96,${0.4 + pct * 0.6})`)
        g.addColorStop(1, `rgba(0,184,96,0.15)`)
        dctx.fillStyle = g
        dctx.fillRect(i * (bw + 1), h - bh, bw, bh)
      }
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [audioEl])
  return <canvas ref={canvasRef} width={120} height={24} style={CANVAS_STYLE} />
}

function MockVisualizer({ volume }: { volume: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const N = 14
  const barsRef = useRef<number[]>(Array.from({ length: N }, () => 0.2 + Math.random() * 0.4))
  const targetRef = useRef<number[]>(Array.from({ length: N }, () => 0.2 + Math.random() * 0.4))
  const phaseRef = useRef<number[]>(Array.from({ length: N }, (_, i) => i * 0.6))
  useEffect(() => {
    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current; if (!canvas) return
      const dt = Math.min((ts - lastRef.current) / 1000, 0.1)
      lastRef.current = ts
      const bars = barsRef.current, targets = targetRef.current, phases = phaseRef.current
      const w = canvas.width, h = canvas.height
      const dctx = canvas.getContext('2d')!
      dctx.clearRect(0, 0, w, h)
      const bw = Math.floor(w / N) - 1
      for (let i = 0; i < N; i++) {
        phases[i] += dt * (0.4 + i * 0.07)
        const vol = volume / 100
        const sineBase = (0.1 + vol * 0.25) + Math.sin(phases[i]) * (0.1 + vol * 0.2)
        if (Math.random() < dt * 0.4) targets[i] = Math.max(0.05, Math.min(0.85, sineBase + (Math.random() - 0.5) * 0.15))
        bars[i] += (targets[i] - bars[i]) * Math.min(1, dt * 2.5)
        const pct = bars[i], bh = Math.max(2, pct * h)
        const g = dctx.createLinearGradient(0, h - bh, 0, h)
        g.addColorStop(0, `rgba(0,184,96,${0.2 + pct * 0.45})`)
        g.addColorStop(1, `rgba(0,184,96,0.05)`)
        dctx.fillStyle = g
        dctx.fillRect(i * (bw + 1), h - bh, bw, bh)
      }
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  return <canvas ref={canvasRef} width={120} height={24} style={CANVAS_STYLE} />
}

function Visualizer({ audioEl, mock, volume }: { audioEl: HTMLAudioElement | null; mock: boolean; volume: number }) {
  if (mock || !audioEl) return <MockVisualizer volume={volume} />
  return <RealVisualizer audioEl={audioEl} />
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, duration, onSeek }: { current: number; duration: number; onSeek: (t: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const pct = duration > 0 ? (current / duration) * 100 : 0
  function calc(e: MouseEvent | React.MouseEvent) {
    const el = ref.current; if (!el || !duration) return
    const r = el.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration)
  }
  useEffect(() => {
    const up = () => { drag.current = false }
    const mv = (e: MouseEvent) => { if (drag.current) calc(e) }
    window.addEventListener('mouseup', up); window.addEventListener('mousemove', mv)
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', mv) }
  }, [duration])
  return (
    <div ref={ref} style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, position: 'relative', cursor: 'pointer' }}
      onMouseDown={e => { drag.current = true; calc(e) }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.45)', borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--bg-btn-silver)', border: '1px solid rgba(255,255,255,0.2)' }} />
    </div>
  )
}

// ─── Horizontal vol slider (deck cards) ───────────────────────────────────────
function VolSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  function calc(e: MouseEvent | React.MouseEvent) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    onChange(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100))
  }
  useEffect(() => {
    const up = () => { drag.current = false }
    const mv = (e: MouseEvent) => { if (drag.current) calc(e) }
    window.addEventListener('mouseup', up); window.addEventListener('mousemove', mv)
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', mv) }
  }, [])
  return (
    <div ref={ref} style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, position: 'relative', cursor: 'pointer', width: '100%' }}
      onMouseDown={e => { drag.current = true; calc(e) }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value}%`, background: 'var(--status-ok)', borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${value}%`, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--bg-btn-silver)', border: '1px solid rgba(255,255,255,0.2)' }} />
    </div>
  )
}

// ─── Vertical drag slider (system channel strips) ─────────────────────────────
function VerticalSlider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const active = useRef(false)
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const calc = useCallback((y: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r) return
    onChange(clamp(1 - (y - r.top) / r.height))
  }, [onChange])
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (active.current) calc(e.clientY) }
    const up = () => { active.current = false }
    document.addEventListener('mousemove', mv)
    document.addEventListener('mouseup', up)
    return () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up) }
  }, [calc])
  const pct = value * 100
  return (
    <div ref={trackRef}
      onMouseDown={e => { if (!disabled) { active.current = true; calc(e.clientY); e.preventDefault() } }}
      style={{ width: 18, height: 162, borderRadius: 9, background: 'var(--bg-input)', boxShadow: 'var(--shadow-input)', border: '1.5px solid rgba(0,0,0,.8)', position: 'relative', cursor: disabled ? 'default' : 'ns-resize', userSelect: 'none', flexShrink: 0 }}>
      <div style={{ position: 'absolute', bottom: 12, left: 4.5, right: 4.5, height: `calc(${pct}% - 24px)`, minHeight: 0, borderRadius: 4.5, background: disabled ? 'var(--text-20)' : 'var(--text-70)', transition: 'height 60ms ease' }} />
      <div style={{ position: 'absolute', left: -6, right: -6, height: 18, bottom: `calc(${pct}% - 9px)`, borderRadius: 4.5, background: 'var(--bg-btn-silver)', boxShadow: '0 4.5px 9px rgba(0,0,0,.8), inset 0 1.5px 0 rgba(255,255,255,0.4)', transition: 'bottom 60ms ease', cursor: disabled ? 'default' : 'ns-resize', zIndex: 1 }}>
        <div style={{ position: 'absolute', inset: '6px 4.5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {[0, 1, 2].map(j => <div key={j} style={{ height: 1.5, background: 'rgba(0,0,0,.3)', borderRadius: 1.5 }} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Mic monitor hook ─────────────────────────────────────────────────────────
function useMicMonitor() {
  const [active, setActive] = useState(false)
  const refs = useRef<{ ctx: AudioContext; source: MediaStreamAudioSourceNode; stream: MediaStream } | null>(null)
  async function toggle() {
    if (active) {
      refs.current?.source.disconnect()
      refs.current?.ctx.close()
      refs.current?.stream.getTracks().forEach(t => t.stop())
      refs.current = null
      setActive(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      source.connect(ctx.destination)
      refs.current = { ctx, source, stream }
      setActive(true)
    } catch { /* permission denied */ }
  }
  return { active, toggle }
}

// ─── Soundtrack Deck (card) ───────────────────────────────────────────────────
function Deck({ keyId, action, buttonMode, onKeyRef, onSyncRef, onWillPlay, registerPause, onHide, onRename }: {
  keyId: string; action: Action; buttonMode: boolean
  onKeyRef: (id: string, fn: () => void) => void
  onSyncRef?: (id: string, fn: (forcePlaying?: boolean) => void) => void
  onWillPlay: (id: string) => void
  registerPause: (id: string, fn: () => void) => void
  onHide: () => void; onRename: (name: string) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamUrlRef = useRef<string | null>(null)
  const [state, setState] = useState<DeckState>({ playing: false, currentTime: 0, duration: 0, volume: 80 })
  const [resolving, setResolving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const path = action.path ?? ''
  const isYT = isYouTube(path)
  const fileName = isYT ? 'YouTube' : (path.split(/[\\/]/).pop() ?? '').replace(/\.[^.]+$/, '')
  const label = action.label || fileName
  const keyName = KEY_NAMES[keyId] ?? keyId

  function makeAudio(src: string, cors = false) {
    const a = new Audio(src)
    if (cors) a.crossOrigin = 'anonymous'
    a.volume = state.volume / 100
    a.addEventListener('timeupdate', () => setState(s => ({ ...s, currentTime: a.currentTime })))
    a.addEventListener('loadedmetadata', () => setState(s => ({ ...s, duration: a.duration })))
    a.addEventListener('ended', () => setState(s => ({ ...s, playing: false, currentTime: 0 })))
    audioRef.current = a
    return a
  }

  const toggle = useCallback(async () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setState(s => ({ ...s, playing: false }))
      return
    }
    let a = audioRef.current
    if (!a) {
      if (isYT) {
        if (!streamUrlRef.current) {
          setResolving(true)
          try {
            const res = await fetch(`${API}/api/yt-stream?url=${encodeURIComponent(path)}`)
            const data = await res.json()
            if (data.error) { setResolving(false); return }
            streamUrlRef.current = data.url
          } catch { setResolving(false); return }
          setResolving(false)
        }
        a = makeAudio(streamUrlRef.current!, false)
      } else {
        a = makeAudio(`${API}/api/preview?path=${encodeURIComponent(path)}`, true)
      }
    }
    onWillPlay(keyId)
    if (getCtx().state === 'suspended') getCtx().resume()
    a.play().catch(console.error)
    setState(s => ({ ...s, playing: true }))
  }, [path, isYT])

  const syncVisual = useCallback((forcePlaying?: boolean) => {
    setState(s => ({ ...s, playing: forcePlaying !== undefined ? forcePlaying : !s.playing }))
  }, [])

  useEffect(() => { onKeyRef(keyId, toggle) }, [toggle])
  useEffect(() => { onSyncRef?.(keyId, syncVisual) }, [syncVisual])
  useEffect(() => {
    registerPause(keyId, () => { audioRef.current?.pause(); setState(s => ({ ...s, playing: false })) })
  }, [])
  useEffect(() => () => { audioRef.current?.pause() }, [])

  function startEdit() { setEditVal(label); setEditing(true); setTimeout(() => inputRef.current?.select(), 10) }
  function commitEdit() { setEditing(false); if (editVal.trim()) onRename(editVal.trim()) }

  if (buttonMode) {
    return (
      <button onClick={toggle} title={label} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 8px',
        borderRadius: 10, border: `1px solid ${state.playing ? 'rgba(0,184,96,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background: state.playing ? 'linear-gradient(135deg,rgba(0,184,96,0.15),rgba(0,184,96,0.05))' : 'rgba(255,255,255,0.04)',
        cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
        boxShadow: state.playing ? '0 0 12px rgba(0,184,96,0.15)' : 'none',
      }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-40)', fontWeight: 900, letterSpacing: '0.1em' }}>{keyName}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'rgba(255,255,255,0.12)', boxShadow: state.playing ? '0 0 6px rgba(0,184,96,0.8)' : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-70)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolving ? '⏳' : label}</span>
      </button>
    )
  }

  return (
    <div style={{
      width: 210, borderRadius: 14, flexShrink: 0,
      background: state.playing ? 'linear-gradient(160deg,rgba(0,184,96,0.08),rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${state.playing ? 'rgba(0,184,96,0.25)' : 'rgba(255,255,255,0.05)'}`,
      boxShadow: state.playing ? '0 0 20px rgba(0,184,96,0.08)' : 'none',
      display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 12px 10px', minHeight: 148,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em', padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: 'var(--text-40)', flexShrink: 0 }}>{keyName}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'rgba(255,255,255,0.1)', boxShadow: state.playing ? '0 0 6px rgba(0,184,96,0.7)' : 'none' }} />
        {editing ? (
          <input ref={inputRef} value={editVal} onChange={e => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'var(--text-pure)', padding: '1px 5px', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span onDoubleClick={startEdit} title={`${path} — dbl-click para renomear`}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}>
            {label}
          </span>
        )}
        <button onClick={onHide} title="Esconder" style={{ width: 16, height: 16, borderRadius: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
      </div>
      {state.playing && <Visualizer audioEl={audioRef.current} mock={isYT} volume={state.volume} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <ProgressBar current={state.currentTime} duration={state.duration}
          onSeek={t => { if (audioRef.current) audioRef.current.currentTime = t; setState(s => ({ ...s, currentTime: t })) }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(state.currentTime)}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(state.duration)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'var(--bg-btn-silver)', color: state.playing ? '#000' : 'rgba(255,255,255,0.85)', fontSize: 12, boxShadow: 'var(--shadow-btn)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {resolving ? '⏳' : state.playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <VolSlider value={state.volume} onChange={v => { setState(s => ({ ...s, volume: v })); if (audioRef.current) audioRef.current.volume = v / 100 }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>{state.volume}</span>
      </div>
    </div>
  )
}

// ─── Soundboard Deck (card) ────────────────────────────────────────────────────
function SbDeck({ ch, buttonMode }: { ch: SbChannel; buttonMode: boolean }) {
  if (buttonMode) {
    return (
      <button onClick={ch.stop} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 8px',
        borderRadius: 10, border: '1px solid rgba(0,184,96,0.4)',
        background: 'linear-gradient(135deg,rgba(0,184,96,0.15),rgba(0,184,96,0.05))',
        cursor: 'pointer', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14 }}>{ch.emoji}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-ok)', boxShadow: '0 0 6px rgba(0,184,96,0.8)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-70)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</span>
      </button>
    )
  }
  return (
    <div style={{
      width: 210, borderRadius: 14, flexShrink: 0,
      background: 'linear-gradient(160deg,rgba(0,184,96,0.08),rgba(255,255,255,0.02))',
      border: '1px solid rgba(0,184,96,0.25)',
      display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 12px 10px', minHeight: 148,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{ch.emoji}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-ok)', boxShadow: '0 0 6px rgba(0,184,96,0.7)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <ProgressBar current={ch.currentTime} duration={ch.duration} onSeek={ch.seek} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(ch.currentTime)}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(ch.duration)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={ch.stop} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: 'var(--status-ok)', color: '#000', fontSize: 12, boxShadow: 'var(--shadow-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏹</button>
        <div style={{ flex: 1 }}><VolSlider value={ch.volume} onChange={ch.setVolume} /></div>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>{ch.volume}</span>
      </div>
    </div>
  )
}

// ─── System Channel Strip ─────────────────────────────────────────────────────
function ChannelStrip({ s, onVolume, onMute, onHide }: {
  s: AudioSession
  onVolume: (pid: number, v: number) => void
  onMute: (pid: number, muted: boolean) => void
  onHide: (name: string) => void
}) {
  const pct = Math.round(s.volume * 100)
  const appIcon = icon(s.display_name, s.name, s.is_input)
  const mic = useMicMonitor()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 84,
      padding: '18px 12px 15px', borderRadius: 'var(--radius-key)',
      background: 'var(--bg-key-off)', boxShadow: 'var(--shadow-key-off)', position: 'relative',
      opacity: s.inactive ? 0.45 : 1, transition: 'opacity 300ms',
    }}>
      <button onClick={() => onHide(s.name)} style={{
        position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-20)', fontSize: 12, padding: 3, lineHeight: 1, transition: 'color 120ms',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-err)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-20)' }}
      >✕</button>
      <span style={{ fontSize: 30, lineHeight: 1, marginTop: 6 }}>{appIcon}</span>
      <span style={{ fontSize: 10, color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{s.display_name}</span>
      <VuMeter peak={s.peak} muted={s.muted} />
      <VerticalSlider value={s.volume} onChange={v => onVolume(s.pid, v)} disabled={s.muted} />
      <span style={{ fontSize: 12, color: s.muted ? 'var(--text-20)' : 'var(--text-70)', fontFamily: 'monospace', fontWeight: 'bold' }}>{pct}%</span>
      {s.is_input && (
        <button onClick={mic.toggle} title="Monitor mic input" style={{
          width: 54, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          transition: 'all 100ms', color: mic.active ? '#000' : 'var(--text-40)',
          background: mic.active ? '#ffd600' : 'var(--bg-key-off)',
          boxShadow: 'var(--shadow-btn)', transform: mic.active ? 'translateY(3px)' : undefined,
        }}>👂</button>
      )}
      <button onClick={() => onMute(s.pid, !s.muted)} style={{
        width: 54, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
        transition: 'all 100ms', color: '#000',
        background: s.muted ? 'var(--status-err)' : 'var(--bg-btn-silver)',
        boxShadow: 'var(--shadow-btn)', transform: s.muted ? 'translateY(3px)' : undefined,
      }}>M</button>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function AudioMixer({ onClose, config = { buttons: {} }, sbChannels = [], dragHandleClass, onRenameKey, onRegisterToggler, onRegisterSyncer, onPlayStateChange }: {
  onClose?: () => void
  config?: Config
  sbChannels?: SbChannel[]
  dragHandleClass?: string
  onRenameKey?: (keyId: string, label: string) => void
  onRegisterToggler?: (keyId: string, fn: () => void) => void
  onRegisterSyncer?: (keyId: string, fn: (forcePlaying?: boolean) => void) => void
  onPlayStateChange?: (keyId: string, playing: boolean) => void
}) {
  // ── System session state ──
  const [sessions, setSessions] = useState<AudioSession[]>([])
  const [hiddenSys, setHiddenSys] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mixer-hidden') || '[]') } catch { return [] }
  })
  const [showHiddenSys, setShowHiddenSys] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const localVols = useRef<Map<number, { v: number; expires: number }>>(new Map())

  // ── Soundtrack state ──
  const [buttonMode, setButtonMode] = useState(() => localStorage.getItem('soundtrack-buttonmode') === 'true')
  const [hiddenDecks, setHiddenDecks] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('soundtrack-hidden') || '[]') } catch { return [] }
  })
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('soundtrack-labels') || '{}') } catch { return {} }
  })
  const togglersRef = useRef<Record<string, () => void>>({})
  const syncersRef = useRef<Record<string, (forcePlaying?: boolean) => void>>({})
  const pauseFnsRef = useRef<Record<string, () => void>>({})
  const playingQueueRef = useRef<string[]>([])

  useEffect(() => { localStorage.setItem('soundtrack-buttonmode', String(buttonMode)) }, [buttonMode])
  useEffect(() => { localStorage.setItem('soundtrack-hidden', JSON.stringify(hiddenDecks)) }, [hiddenDecks])
  useEffect(() => { localStorage.setItem('soundtrack-labels', JSON.stringify(labels)) }, [labels])

  // ── System fetch ──
  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/audio/sessions`, { signal: AbortSignal.timeout(500) })
      if (!r.ok) { setAvailable(false); return }
      const raw: AudioSession[] = await r.json()
      const merged = new Map<string, AudioSession>()
      for (const s of raw) {
        const key = s.display_name
        if (!merged.has(key)) { merged.set(key, { ...s }); continue }
        const ex = merged.get(key)!
        if (s.inactive && !ex.inactive) continue
        if (!s.inactive && ex.inactive) { merged.set(key, { ...s }); continue }
        merged.set(key, { ...ex, peak: Math.min(1, ex.peak + s.peak), volume: Math.max(ex.volume, s.volume) })
      }
      const data = Array.from(merged.values())
      const now = Date.now()
      setSessions(data.map(s => {
        const local = localVols.current.get(s.pid)
        if (local && local.expires > now) return { ...s, volume: local.v }
        localVols.current.delete(s.pid)
        return s
      }))
      setAvailable(true)
    } catch { setAvailable(false) }
  }, [])

  useEffect(() => {
    fetchSessions()
    const id = setInterval(fetchSessions, 100)
    return () => clearInterval(id)
  }, [fetchSessions])

  // ── System handlers ──
  const handleVolume = useCallback(async (pid: number, volume: number) => {
    localVols.current.set(pid, { v: volume, expires: Date.now() + 400 })
    setSessions(p => p.map(s => s.pid === pid ? { ...s, volume } : s))
    if (pid === -1) return
    await fetch(`${API}/api/audio/sessions/volume`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, volume }),
    }).catch(() => {})
  }, [])

  const handleMute = useCallback(async (pid: number, muted: boolean) => {
    setSessions(p => p.map(s => s.pid === pid ? { ...s, muted } : s))
    if (pid === -1) return
    await fetch(`${API}/api/audio/sessions/mute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, muted }),
    }).catch(() => {})
  }, [])

  const handleHideSys = useCallback((name: string) => {
    setHiddenSys(p => { const n = [...p, name]; localStorage.setItem('mixer-hidden', JSON.stringify(n)); return n })
  }, [])

  const handleUnhideSys = useCallback((name: string) => {
    setHiddenSys(p => { const n = p.filter(x => x !== name); localStorage.setItem('mixer-hidden', JSON.stringify(n)); return n })
  }, [])

  // ── Soundtrack handlers ──
  const handleKeyRef = useCallback((id: string, fn: () => void) => {
    togglersRef.current[id] = fn
    onRegisterToggler?.(id, fn)
  }, [])

  const handleSyncRef = useCallback((id: string, fn: (forcePlaying?: boolean) => void) => {
    syncersRef.current[id] = fn
    onRegisterSyncer?.(id, fn)
  }, [])

  const handleWillPlay = useCallback((activeId: string) => {
    const q = playingQueueRef.current.filter(id => id !== activeId)
    if (q.length >= 2) { const oldest = q.shift()!; pauseFnsRef.current[oldest]?.() }
    q.push(activeId)
    playingQueueRef.current = q
    onPlayStateChange?.(activeId, true)
  }, [])

  const handleRegisterPause = useCallback((id: string, fn: () => void) => {
    pauseFnsRef.current[id] = () => {
      fn()
      playingQueueRef.current = playingQueueRef.current.filter(q => q !== id)
      onPlayStateChange?.(id, false)
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const match = Object.keys(KEY_NAMES).find(k => KEY_NAMES[k].toLowerCase() === e.key.toLowerCase())
      if (match && togglersRef.current[match]) { e.preventDefault(); togglersRef.current[match]() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Derived ──
  const allDecks = Object.entries(config.buttons ?? {}).filter(([, a]) => a.type === 'play_audio' && a.path)
  const visibleDecks = allDecks.filter(([id]) => !hiddenDecks.includes(id))
  const hiddenDeckItems = allDecks.filter(([id]) => hiddenDecks.includes(id))
  const visibleSessions = sessions.filter(s => !hiddenSys.includes(s.name))
  const hiddenSessionItems = sessions.filter(s => hiddenSys.includes(s.name))

  const hasSoundtrack = allDecks.length > 0 || sbChannels.length > 0
  const hasSystem = visibleSessions.length > 0

  return (
    <div style={{
      borderRadius: 'var(--radius-panel)', background: 'var(--bg-chassis)', boxShadow: 'var(--shadow-chassis)',
      padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 200,
    }}>
      <PanelHeader title="// Audio" onClose={onClose} className={dragHandleClass}>
        {hiddenSessionItems.length > 0 && (
          <button onClick={() => setShowHiddenSys(p => !p)} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: showHiddenSys ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xs)',
            color: 'var(--text-40)', padding: '3px 7px', cursor: 'pointer',
          }}>{hiddenSessionItems.length} hidden</button>
        )}
        {hasSoundtrack && (
          <button onClick={() => setButtonMode(v => !v)} title={buttonMode ? 'Deck mode' : 'Button mode'} style={{
            fontSize: 11, background: buttonMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-xs)',
            color: 'var(--text-40)', padding: '2px 8px', cursor: 'pointer',
          }}>{buttonMode ? '⊞' : '⊟'}</button>
        )}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: available === null ? '#555' : available ? 'var(--status-ok)' : 'var(--status-err)' }} />
      </PanelHeader>

      {/* Soundtrack section */}
      {hasSoundtrack && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: buttonMode ? 6 : 10, flexWrap: 'wrap' }}>
            {visibleDecks.map(([keyId, action]) => (
              <Deck
                key={keyId} keyId={keyId}
                action={{ ...action, label: labels[keyId] || action.label }}
                buttonMode={buttonMode}
                onKeyRef={handleKeyRef} onSyncRef={handleSyncRef}
                onWillPlay={handleWillPlay} registerPause={handleRegisterPause}
                onHide={() => setHiddenDecks(h => [...h, keyId])}
                onRename={name => { setLabels(l => ({ ...l, [keyId]: name })); onRenameKey?.(keyId, name) }}
              />
            ))}
            {sbChannels.map(ch => (
              <SbDeck key={ch.id} ch={ch} buttonMode={buttonMode} />
            ))}
          </div>
          {hiddenDeckItems.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflow: hiddenExpanded ? 'visible' : 'hidden', maxHeight: hiddenExpanded ? 'none' : 22 }}>
              <span style={{ fontSize: 9, color: 'var(--text-20)', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', flexShrink: 0 }}>Ocultos:</span>
              {hiddenDeckItems.map(([id, a]) => (
                <button key={id} onClick={() => setHiddenDecks(h => h.filter(x => x !== id))}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-40)', cursor: 'pointer', flexShrink: 0 }}>
                  {KEY_NAMES[id]} {labels[id] || a.label || (a.path?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? '')}
                </button>
              ))}
              <button onClick={() => setHiddenExpanded(v => !v)}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-40)', cursor: 'pointer', flexShrink: 0 }}>
                {hiddenExpanded ? '▲' : `+${hiddenDeckItems.length}`}
              </button>
            </div>
          )}
        </div>
      )}

      {hasSoundtrack && hasSystem && (
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      )}

      {/* System mixer strips */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>
        {visibleSessions.map(s => (
          <ChannelStrip key={s.display_name} s={s} onVolume={handleVolume} onMute={handleMute} onHide={handleHideSys} />
        ))}
      </div>

      {/* Hidden system sessions */}
      {showHiddenSys && hiddenSessionItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-40)', textTransform: 'uppercase' }}>Hidden</div>
          {hiddenSessionItems.map(s => (
            <div key={s.display_name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 10px' }}>
              <span style={{ fontSize: 16 }}>{icon(s.display_name, s.name, s.is_input)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-40)', flex: 1 }}>{s.display_name}</span>
              <button onClick={() => handleUnhideSys(s.name)} style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: 'var(--text-40)', padding: '2px 7px', cursor: 'pointer' }}>Show</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
