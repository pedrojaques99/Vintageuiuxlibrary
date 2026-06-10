import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API } from '../lib/api'
import { closeBtnStyle } from '../lib/styles'
import { PanelHeader } from '../lib/PanelHeader'

type Action = { type?: string; path?: string; label?: string }
type Config = { buttons?: Record<string, Action> }
type DeckState = { playing: boolean; currentTime: number; duration: number; volume: number }

const KEY_NAMES: Record<string, string> = {
  key_f13: 'F13', key_f14: 'F14', key_f15: 'F15',
  key_f16: 'F16', key_f17: 'F17', key_f18: 'F18',
  key_f19: 'F19', key_f20: 'F20', key_f21: 'F21',
  key_f22: 'F22', key_f23: 'F23', key_f24: 'F24',
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function isYouTube(p: string) { return /youtube\.com|youtu\.be/.test(p) }

/* ── Shared AudioContext + source registry (one source node per audio element) ── */
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

const CANVAS_STYLE: React.CSSProperties = { display: 'block', width: '100%', height: '24px', borderRadius: '4px', opacity: 0.85 }

/* ── Real visualizer (local audio via Web Audio API) ── */
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

/* ── Mock visualizer (YouTube / CORS-blocked) ── */
function MockVisualizer({ volume }: { volume: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  // Each bar: current height (0–1), target height, phase offset for sine wave
  const N = 14
  const barsRef = useRef<number[]>(Array.from({ length: N }, () => 0.2 + Math.random() * 0.4))
  const targetRef = useRef<number[]>(Array.from({ length: N }, () => 0.2 + Math.random() * 0.4))
  const phaseRef = useRef<number[]>(Array.from({ length: N }, (_, i) => i * 0.6))

  useEffect(() => {
    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current; if (!canvas) return
      const dt = Math.min((ts - lastRef.current) / 1000, 0.1) // seconds, capped
      lastRef.current = ts

      const bars = barsRef.current
      const targets = targetRef.current
      const phases = phaseRef.current
      const w = canvas.width, h = canvas.height
      const dctx = canvas.getContext('2d')!
      dctx.clearRect(0, 0, w, h)
      const bw = Math.floor(w / N) - 1

      for (let i = 0; i < N; i++) {
        // Slowly drift the sine phase
        phases[i] += dt * (0.4 + i * 0.07)
        // Target is a gentle sine wave scaled by volume (0–100)
        const vol = volume / 100
        const sineBase = (0.1 + vol * 0.25) + Math.sin(phases[i]) * (0.1 + vol * 0.2)
        // Occasionally pick a new target
        if (Math.random() < dt * 0.4) targets[i] = Math.max(0.05, Math.min(0.85, sineBase + (Math.random() - 0.5) * 0.15))
        // Lerp toward target — slow speed
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

/* ── Visualizer router ── */
function Visualizer({ audioEl, mock, volume }: { audioEl: HTMLAudioElement | null; mock: boolean; volume: number }) {
  if (mock) return <MockVisualizer volume={volume} />
  if (!audioEl) return <MockVisualizer volume={volume} />
  return <RealVisualizer audioEl={audioEl} />
}

/* ── Progress bar ── */
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

/* ── Vol slider ── */
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

/* ── Deck ── */
function Deck({ keyId, action, buttonMode, onKeyRef, onSyncRef, onWillPlay, registerPause, onHide, onRename, onVolumeChange }: {
  keyId: string
  action: Action
  buttonMode: boolean
  onKeyRef: (id: string, fn: () => void) => void
  onSyncRef?: (id: string, fn: (forcePlaying?: boolean) => void) => void
  onWillPlay: (id: string) => void
  registerPause: (id: string, fn: () => void) => void
  onHide: () => void
  onRename: (name: string) => void
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
        a = makeAudio(streamUrlRef.current!, false) // YT: no crossOrigin, mock visualizer
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

  /* ── Button mode: compact pill ── */
  if (buttonMode) {
    return (
      <button
        onClick={toggle}
        title={label}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 8px',
          borderRadius: 10, border: `1px solid ${state.playing ? 'rgba(0,184,96,0.4)' : 'rgba(255,255,255,0.07)'}`,
          background: state.playing ? 'linear-gradient(135deg,rgba(0,184,96,0.15),rgba(0,184,96,0.05))' : 'rgba(255,255,255,0.04)',
          cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
          boxShadow: state.playing ? '0 0 12px rgba(0,184,96,0.15)' : 'none',
        }}
      >
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-40)', fontWeight: 900, letterSpacing: '0.1em' }}>{keyName}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'rgba(255,255,255,0.12)', boxShadow: state.playing ? '0 0 6px rgba(0,184,96,0.8)' : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-70)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolving ? '⏳' : label}</span>
      </button>
    )
  }

  /* ── Full deck card ── */
  return (
    <div style={{
      width: 210, borderRadius: 14, flexShrink: 0,
      background: state.playing ? 'linear-gradient(160deg,rgba(0,184,96,0.08),rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${state.playing ? 'rgba(0,184,96,0.25)' : 'rgba(255,255,255,0.05)'}`,
      boxShadow: state.playing ? '0 0 20px rgba(0,184,96,0.08)' : 'none',
      display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 12px 10px',
      minHeight: 148, /* fixed height — no layout jump */
    }}>
      {/* Top: key + LED + label (editable) + hide */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.1em', padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: 'var(--text-40)', flexShrink: 0 }}>{keyName}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'rgba(255,255,255,0.1)', boxShadow: state.playing ? '0 0 6px rgba(0,184,96,0.7)' : 'none' }} />
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'var(--text-pure)', padding: '1px 5px', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span
            onDoubleClick={startEdit}
            title={`${path} — dbl-click para renomear`}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
          >{label}</span>
        )}
        <button onClick={onHide} title="Esconder" style={{ width: 16, height: 16, borderRadius: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
      </div>

      {/* Visualizer — always visible when playing; mock for YT/CORS */}
      {state.playing && <Visualizer audioEl={audioRef.current} mock={isYT} volume={state.volume} />}

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <ProgressBar current={state.currentTime} duration={state.duration} onSeek={t => { if (audioRef.current) audioRef.current.currentTime = t; setState(s => ({ ...s, currentTime: t })) }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(state.currentTime)}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)' }}>{fmt(state.duration)}</span>
        </div>
      </div>

      {/* Play + Vol */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: state.playing ? 'var(--status-ok)' : 'var(--bg-btn-silver)', color: state.playing ? '#000' : 'rgba(255,255,255,0.85)', fontSize: 12, boxShadow: 'var(--shadow-btn)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {resolving ? '⏳' : state.playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}><VolSlider value={state.volume} onChange={v => { setState(s => ({ ...s, volume: v })); if (audioRef.current) audioRef.current.volume = v / 100 }} /></div>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-20)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>{state.volume}</span>
      </div>
    </div>
  )
}

/* ── Soundboard deck (external channel) ── */
function SbDeck({ ch, buttonMode }: { ch: SbChannel; buttonMode: boolean }) {
  if (buttonMode) {
    return (
      <button
        onClick={ch.stop}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 8px',
          borderRadius: 10, border: '1px solid rgba(0,184,96,0.4)',
          background: 'linear-gradient(135deg,rgba(0,184,96,0.15),rgba(0,184,96,0.05))',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
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
      display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 12px 10px',
      minHeight: 148,
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

/* ── Panel ── */

import type { SbChannel } from '../lib/types'

export function SoundtrackPanel({ config, onClose, onRenameKey, onRegisterToggler, onRegisterSyncer, onPlayStateChange, dragHandleClass, extraDecks = [] }: {
  config: Config
  onClose?: () => void
  onRenameKey?: (keyId: string, label: string) => void
  onRegisterToggler?: (keyId: string, fn: () => void) => void
  onRegisterSyncer?: (keyId: string, fn: (forcePlaying?: boolean) => void) => void
  onPlayStateChange?: (keyId: string, playing: boolean) => void
  dragHandleClass?: string
  extraDecks?: SbChannel[]
}) {
  const togglersRef = useRef<Record<string, () => void>>({})
  const syncersRef = useRef<Record<string, (forcePlaying?: boolean) => void>>({})
  const pauseFnsRef = useRef<Record<string, () => void>>({})
  const playingQueueRef = useRef<string[]>([]) // max 2 different tracks
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('soundtrack-hidden') || '[]') } catch { return [] }
  })
  const [buttonMode, setButtonMode] = useState(() => localStorage.getItem('soundtrack-buttonmode') === 'true')
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('soundtrack-labels') || '{}') } catch { return {} }
  })

  const allDecks = Object.entries(config.buttons ?? {}).filter(([, a]) => a.type === 'play_audio' && a.path)
  const visible = allDecks.filter(([id]) => !hidden.includes(id))
  const hiddenDecks = allDecks.filter(([id]) => hidden.includes(id))

  useEffect(() => { localStorage.setItem('soundtrack-hidden', JSON.stringify(hidden)) }, [hidden])
  useEffect(() => { localStorage.setItem('soundtrack-buttonmode', String(buttonMode)) }, [buttonMode])
  useEffect(() => { localStorage.setItem('soundtrack-labels', JSON.stringify(labels)) }, [labels])

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
    if (q.length >= 2) {
      const oldest = q.shift()!
      pauseFnsRef.current[oldest]?.()
    }
    q.push(activeId)
    playingQueueRef.current = q
    onPlayStateChange?.(activeId, true)
  }, [])

  // keep queue clean when a track stops on its own (ended/paused externally)
  const handleRegisterPauseWrapped = useCallback((id: string, fn: () => void) => {
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

  return (
    <div style={{ borderRadius: 'var(--radius-panel)', background: 'var(--bg-chassis)', boxShadow: 'var(--shadow-chassis)', padding: '16px 20px 14px' }}>
      <PanelHeader title="// Soundtrack" onClose={onClose} className={dragHandleClass} noBorder>
        {hiddenDecks.length > 0 && (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 'var(--radius-xs)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-20)', fontWeight: 900, letterSpacing: '0.1em' }}>
            {visible.length}/{allDecks.length}
          </span>
        )}
        <button
          onClick={() => setButtonMode(v => !v)}
          title={buttonMode ? 'Deck mode' : 'Button mode'}
          style={{ ...closeBtnStyle, background: buttonMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', fontSize: 11, width: 'auto', padding: '0 8px', borderRadius: 'var(--radius-xs)' }}
        >
          {buttonMode ? '⊞' : '⊟'}
        </button>
      </PanelHeader>

      {allDecks.length === 0 && extraDecks.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-40)' }}>
          Nenhuma key configurada como <strong>Play Audio</strong>. Configure no painel de keyboard.
        </p>
      ) : (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, minWidth: '100%' }}>
          {/* Visible decks — drives the container width */}
          <div style={{ display: 'flex', gap: buttonMode ? 6 : 10, flexWrap: 'wrap', paddingBottom: 2 }}>
            {visible.map(([keyId, action]) => (
              <Deck
                key={keyId} keyId={keyId}
                action={{ ...action, label: labels[keyId] || action.label }}
                buttonMode={buttonMode}
                onKeyRef={handleKeyRef}
                onSyncRef={handleSyncRef}
                onWillPlay={handleWillPlay}
                registerPause={handleRegisterPauseWrapped}
                onHide={() => setHidden(h => [...h, keyId])}
                onRename={name => { setLabels(l => ({ ...l, [keyId]: name })); onRenameKey?.(keyId, name) }}
              />
            ))}
            {extraDecks.map(ch => (
              <SbDeck key={ch.id} ch={ch} buttonMode={buttonMode} />
            ))}
          </div>

          {/* Hidden tracks — constrained to deck row width, never expands panel */}
          {hiddenDecks.length > 0 && (
            <div style={{ width: 0, minWidth: '100%', paddingTop: 4 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                overflow: hiddenExpanded ? 'visible' : 'hidden',
                maxHeight: hiddenExpanded ? 'none' : 22,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 9, color: 'var(--text-20)', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', flexShrink: 0 }}>Ocultos:</span>
                {hiddenDecks.map(([id, a]) => (
                  <button key={id} onClick={() => setHidden(h => h.filter(x => x !== id))}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-40)', cursor: 'pointer', flexShrink: 0 }}>
                    {KEY_NAMES[id]} {labels[id] || a.label || (a.path?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? '')}
                  </button>
                ))}
                <button
                  onClick={() => setHiddenExpanded(v => !v)}
                  style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-40)', cursor: 'pointer', flexShrink: 0 }}
                >
                  {hiddenExpanded ? '▲' : `+${hiddenDecks.length}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
