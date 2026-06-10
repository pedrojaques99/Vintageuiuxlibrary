import React, { useState, useEffect, useRef } from 'react'
import { Rnd } from 'react-rnd'
import { AppKnob } from './components/AppKnob'
import { AudioMixer } from './components/AudioMixer'
import { SoundboardPanel, type SbChannel } from './components/SoundboardPanel'
import { OBSControlPanel } from './components/OBSControlPanel'
import { BriefingPanel } from './components/BriefingPanel'
import { YouTubeChatPanel } from './components/YouTubeChatPanel'
import { TimerPanel } from './components/TimerPanel'
import { ShieldAlert } from './components/ShieldAlert'
import { API } from './lib/api'
import { loadGeo, saveGeo } from './lib/geo'
import { closeBtnStyle } from './lib/styles'
import { PanelProvider, usePanelCtx } from './lib/panel-context'
import './index.css'

const KEYS = [
  'key_f13','key_f14','key_f15',
  'key_f16','key_f17','key_f18',
  'key_f19','key_f20','key_f21',
  'key_f22','key_f23','key_f24',
]

const ICON: Record<string, string> = {
  play_audio: '🔈',
  open_app:   '🚀',
  run_script: '📜',
}

type Action = { type?: string; path?: string; args?: string; label?: string }
type Config = { buttons?: Record<string, Action> }

export default function App() {
  return <PanelProvider><AppInner /></PanelProvider>
}

function AppInner() {
  const { scale, zOf, bringToFront, endDrag, isDragging } = usePanelCtx()
  const [config, setConfig] = useState<Config>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [actionType, setActionType] = useState('play_audio')
  const [actionPath, setActionPath] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [actionEmoji, setActionEmoji] = useState('')
  const [actionArgs, setActionArgs] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'ok'|'err'>('idle')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [online, setOnline] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [showKeys, setShowKeys] = useState(() => localStorage.getItem('panel-keys') !== 'false')
  const [showMixer, setShowMixer] = useState(() => localStorage.getItem('panel-mixer') !== 'false')
  const [showSoundboard, setShowSoundboard] = useState(() => localStorage.getItem('panel-soundboard') !== 'false')
  const [showOBS, setShowOBS] = useState(() => localStorage.getItem('panel-obs') === 'true')
  const [showBriefing, setShowBriefing] = useState(() => localStorage.getItem('panel-briefing') === 'true')
  const [showYTChat, setShowYTChat] = useState(() => localStorage.getItem('panel-ytchat') === 'true')
  const [showTimer, setShowTimer] = useState(() => localStorage.getItem('panel-timer') === 'true')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const deckTogglersRef = useRef<Record<string, () => void>>({})
  const deckSyncersRef = useRef<Record<string, (forcePlaying?: boolean) => void>>({})
  const [playingKeys, setPlayingKeys] = useState<Set<string>>(new Set())
  const [sbChannels, setSbChannels] = useState<SbChannel[]>([])
  const [ctxMenu, setCtxMenu] = useState<{ key: string; x: number; y: number } | null>(null)
  const [ctxSrc, setCtxSrc] = useState('')
  const [ctxSaving, setCtxSaving] = useState(false)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API}/api/config`)
      .then(r => r.json())
      .then(d => { setConfig(d); setOnline(true) })
      .catch(() => setOnline(false))
  }, [])

  useEffect(() => {
    localStorage.setItem('panel-keys', String(showKeys))
    localStorage.setItem('panel-mixer', String(showMixer))
    localStorage.setItem('panel-soundboard', String(showSoundboard))
    localStorage.setItem('panel-obs', String(showOBS))
    localStorage.setItem('panel-briefing', String(showBriefing))
    localStorage.setItem('panel-ytchat', String(showYTChat))
    localStorage.setItem('panel-timer', String(showTimer))
  }, [showKeys, showMixer, showSoundboard, showOBS, showBriefing, showYTChat, showTimer])

  /* ── Physical keyboard bridge: poll Flask for key-press events from AHK ── */
  useEffect(() => {
    let active = true
    async function poll() {
      while (active) {
        try {
          const r = await fetch(`${API}/api/key-event/poll?timeout=2`, { signal: AbortSignal.timeout(3000) })
          const ev = await r.json()
          if (ev.key) {
            const syncer = deckSyncersRef.current[ev.key]
            const toggler = deckTogglersRef.current[ev.key]
            // Physical key: prefer visual-only sync (audio already played by Python backend)
            ;(syncer ?? toggler)?.()
          }
        } catch { /* backend offline */ }
        if (active) await new Promise(res => setTimeout(res, 100))
      }
    }
    poll()
    return () => { active = false }
  }, [])

  /* close ctx menu on outside click */
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ctxMenu])

  async function saveCtxSrc() {
    if (!ctxMenu) return
    setCtxSaving(true)
    const key = ctxMenu.key
    const existing = config.buttons?.[key] || {}
    const next = { ...config, buttons: { ...config.buttons, [key]: { ...existing, path: ctxSrc } } }
    try {
      await fetch(`${API}/api/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      setConfig(next)
      if (selected === key) setActionPath(ctxSrc)
    } catch {}
    setCtxSaving(false)
    setCtxMenu(null)
  }

  function selectKey(key: string) {
    setSelected(key)
    const a = config.buttons?.[key] || {}
    setActionType(a.type || 'play_audio')
    setActionPath(a.path || '')
    setActionLabel(a.label || '')
    setActionEmoji((a as any).emoji || '')
    setActionArgs(a.args || '')
    setSaveStatus('idle')
  }

  async function save() {
    if (!selected) return
    setSaveStatus('saving')
    const action: Action = {
      type: actionType,
      path: actionPath,
      args: actionArgs,
      label: actionLabel.trim() || actionPath.split(/[\\/]/).pop(),
      ...(actionEmoji.trim() ? { emoji: actionEmoji.trim() } : {}),
    }
    const next = { ...config, buttons: { ...config.buttons, [selected]: action } }
    try {
      const r = await fetch(`${API}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!r.ok) throw new Error()
      setConfig(next)
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('err')
    }
  }

  async function handleDrop(key: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
      const res = await r.json()
      if (res.status === 'success') {
        let type = 'open_app'
        if (file.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) type = 'play_audio'
        if (file.name.endsWith('.ps1')) type = 'run_script'
        const next = {
          ...config,
          buttons: { ...config.buttons, [key]: { type, path: res.path, args: '', label: file.name } },
        }
        await fetch(`${API}/api/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
        setConfig(next)
      }
    } catch (e) { console.error('drop failed', e) }
  }

  function togglePreview() {
    if (previewing) {
      audioRef.current?.pause()
      audioRef.current = null
      setPreviewing(false)
      return
    }
    const url = `${API}/api/preview?path=${encodeURIComponent(actionPath)}`
    const a = new Audio(url)
    audioRef.current = a
    a.onended = () => { setPreviewing(false); audioRef.current = null }
    a.play().then(() => setPreviewing(true)).catch(() => setPreviewing(false))
  }

  async function handleUpload(file: File) {
    if (!selected) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
      const res = await r.json()
      if (res.status === 'success') {
        let type = actionType
        if (file.name.match(/\.(mp3|wav|ogg|flac|m4a|mp4)$/i)) type = 'play_audio'
        if (file.name.endsWith('.ps1')) type = 'run_script'
        setActionType(type)
        setActionPath(res.path)
      }
    } catch (e) { console.error(e) }
  }

  const kbGeo  = loadGeo('keyboard',   { x: 20,  y: 20,  w: 420, h: 480 })
  const cfGeo  = loadGeo('config',     { x: 460, y: 20,  w: 360, h: 560 })
  const mxGeo  = loadGeo('mixer',      { x: 840, y: 20,  w: 320, h: 480 })

  return (
    <div
      className="flex min-h-screen font-['Outfit',sans-serif] text-[var(--text-pure)]"
      style={{ background: 'var(--bg-surface)' }}
    >
      <ShieldAlert />
      {/* Background Glow */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(circle at 50% -20%, rgba(60,65,80,0.15) 0%, transparent 80%)' }}
      />

      {/* Sidebar */}
      <aside
        className="w-[72px] min-h-screen border-r border-white/5 flex flex-col items-center py-8 gap-6 shrink-0 sticky top-0 self-start z-20"
        style={{ background: 'linear-gradient(180deg,rgba(22,23,25,0.9) 0%,rgba(12,13,15,0.95) 100%)', backdropFilter: 'blur(20px)', height: '100vh' }}
      >
        <NavBtn active={showKeys} onClick={() => setShowKeys(v => !v)} title="Keyboard Panel">⌨️</NavBtn>
        <NavBtn active={showMixer} onClick={() => setShowMixer(v => !v)} title="Audio Mixer">🎚️</NavBtn>
        <NavBtn active={showSoundboard} onClick={() => setShowSoundboard(v => !v)} title="Soundboard">🎹</NavBtn>
        <button
          onClick={async () => {
            await fetch(`${API}/api/audio/stop-all`, { method: 'POST' })
            Object.values(deckSyncersRef.current).forEach(fn => fn(false))
          }}
          title="Force Stop All (keyboard audio)"
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.7)' }}
        >■</button>

        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
        <NavBtn active={showOBS} onClick={() => setShowOBS(v => !v)} title="OBS Control">🎬</NavBtn>
        <NavBtn active={showBriefing} onClick={() => setShowBriefing(v => !v)} title="Briefing">📋</NavBtn>
        <NavBtn active={showYTChat} onClick={() => setShowYTChat(v => !v)} title="YouTube Chat">💬</NavBtn>
        <NavBtn active={showTimer} onClick={() => setShowTimer(v => !v)} title="Timer">⏱</NavBtn>

        <div className="flex-1" />

        {(!showKeys || !showMixer || !showSoundboard) && (
          <button
            onClick={() => { setShowKeys(true); setShowMixer(true); setShowSoundboard(true) }}
            className="w-9 h-9 flex items-center justify-center opacity-20 hover:opacity-80 transition-opacity border-none bg-transparent cursor-pointer text-xs text-white"
            title="Restore All"
          >⊞</button>
        )}

        <div
          className="w-2 h-2 rounded-full mb-4"
          style={{
            background: online ? 'var(--status-ok)' : 'var(--status-err)',
            boxShadow: online ? '0 0 8px rgba(0,184,96,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
          }}
        />
      </aside>

      {/* Free-canvas */}
      <main className="flex-1 relative z-10 overflow-hidden" style={{ minHeight: '100vh' }}>
        <div style={{
          position: 'relative',
          width: scale < 1 ? `${100 / scale}%` : '100%',
          minHeight: scale < 1 ? `${100 / scale}vh` : '100vh',
          transformOrigin: 'top left',
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }}>

        {/* Keyboard panel */}
        {showKeys && (
          <Rnd
            default={{ x: kbGeo.x, y: kbGeo.y, width: 'auto', height: 'auto' }}
            enableResizing={false}
            bounds="parent"
            dragHandleClassName="drag-handle"
            className={`panel-drag${isDragging('keyboard') ? ' dragging' : ''}`}
            scale={scale}
            onDragStart={() => bringToFront('keyboard')}
            onDragStop={(_e, d) => { saveGeo('keyboard', { x: d.x, y: d.y }); endDrag('keyboard') }}
            style={{ zIndex: zOf('keyboard', 10) }}
          >
            <div
              className="drag-handle"
              style={{
                borderRadius: 'var(--radius-panel)',
                background: 'var(--bg-chassis)',
                boxShadow: 'var(--shadow-chassis)',
                padding: '24px',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              {/* Knobs row */}
              <div className="flex items-center justify-between mb-6 px-2">
                <AppKnob label="MASTER GAIN" size={96} />
                <div className="flex flex-col gap-2 pt-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--status-err)] border border-white/5" />
                  <div className="w-2 h-2 rounded-full bg-[#1a1c1e]" />
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setShowKeys(false)}
                    style={closeBtnStyle}
                  >×</button>
                </div>
                <AppKnob label="SYSTEM SCRL" size={96} />
              </div>

              {/* 3×4 key grid */}
              <div className="grid grid-cols-3" style={{ gap: 'var(--gap-standard)' }}>
                {KEYS.map(key => {
                  const action = config.buttons?.[key] || {} as any
                  const name = key.replace('key_', '').toUpperCase()
                  const isAudio = action.type === 'play_audio'
                  const isPlaying = playingKeys.has(key)
                  const emoji = action.emoji || ''
                  const displayLabel = action.label || (action.path ? action.path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') : '') || 'Vazio'
                  const showEmojiOnly = emoji && !action.label && !action.path
                  const showEmoji = !!emoji
                  const isActive = selected === key
                  const isDrag = dragOver === key

                  return (
                    <div
                      key={key}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => selectKey(key)}
                      onContextMenu={e => {
                        e.preventDefault()
                        setCtxMenu({ key, x: e.clientX, y: e.clientY })
                        setCtxSrc(config.buttons?.[key]?.path || '')
                      }}
                      onDragOver={e => { e.preventDefault(); setDragOver(key) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={e => {
                        e.preventDefault()
                        setDragOver(null)
                        const f = e.dataTransfer.files[0]
                        if (f) handleDrop(key, f)
                      }}
                      className="aspect-square cursor-pointer relative flex flex-col items-center justify-center p-2 select-none transition-all duration-75 group"
                      style={{
                        width: 'var(--key-size)',
                        borderRadius: 'var(--radius-key)',
                        background: isPlaying
                          ? 'linear-gradient(145deg,rgba(0,184,96,0.18),rgba(0,184,96,0.06))'
                          : isActive ? 'var(--bg-key-on)' : 'var(--bg-key-off)',
                        boxShadow: isPlaying
                          ? '0 9px 0 #000, 0 0 0 2px rgba(0,184,96,0.5), 0 12px 20px rgba(0,0,0,.6)'
                          : isActive
                            ? 'var(--shadow-key-on)'
                            : isDrag
                              ? '0 9px 0 #000, 0 0 0 3px #3b3d42, 0 12px 20px rgba(0,0,0,.6)'
                              : 'var(--shadow-key-off)',
                        transform: isActive ? 'translateY(6px)' : undefined,
                      }}
                    >
                      {isPlaying && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-ok)', boxShadow: '0 0 6px rgba(0,184,96,0.9)' }} />
                      )}
                      {isAudio && (
                        <div
                          onClick={e => { e.stopPropagation(); deckTogglersRef.current[key]?.() }}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                          style={{ borderRadius: 'var(--radius-key)', background: 'rgba(0,0,0,0.55)' }}
                        >
                          <span style={{ fontSize: 22, lineHeight: 1 }}>{isPlaying ? '⏸' : '▶'}</span>
                        </div>
                      )}
                      {showEmoji && <span style={{ fontSize: showEmojiOnly ? 28 : 18, lineHeight: 1, marginBottom: showEmojiOnly ? 0 : 2 }}>{emoji}</span>}
                      {!showEmojiOnly && <span className="text-[10px] text-[var(--text-20)] uppercase tracking-wider">{name}</span>}
                      {!showEmojiOnly && <span className="text-[12px] font-bold text-center leading-tight w-full px-1 truncate" style={{ color: isPlaying ? 'rgba(0,184,96,0.9)' : 'var(--text-70)' }}>{displayLabel}</span>}
                      {isDrag && <span className="absolute bottom-2 text-[9px] text-[var(--text-40)] font-black uppercase">RELEASE</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </Rnd>
        )}

        {/* Config panel */}
        {selected && (
          <Rnd
            default={{ x: cfGeo.x, y: cfGeo.y, width: cfGeo.w, height: 'auto' }}
            enableResizing={false}
            bounds="parent"
            dragHandleClassName="drag-handle"
            className={`panel-drag${isDragging('config') ? ' dragging' : ''}`}
            scale={scale}
            onDragStart={() => bringToFront('config')}
            onDragStop={(_e, d) => { saveGeo('config', { x: d.x, y: d.y }); endDrag('config') }}
            style={{ zIndex: zOf('config', 11) }}
          >
            <div
              className="drag-handle"
              style={{
                borderRadius: 'var(--radius-panel)',
                background: 'var(--bg-chassis)',
                boxShadow: 'var(--shadow-chassis)',
                padding: '28px 28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                cursor: 'grab',
                userSelect: 'none',
                width: cfGeo.w,
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-[12px] font-black text-[var(--text-40)] uppercase tracking-[0.4em] leading-none flex-1">
                    Control Module // {selected.replace('key_', '').toUpperCase()}
                  </h2>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setSelected(null)}
                    style={closeBtnStyle}
                  >×</button>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
              </div>

              <div className="flex flex-col gap-4" onMouseDown={e => e.stopPropagation()}>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black text-[var(--text-20)] uppercase tracking-[0.3em]">Action Type</label>
                  <div className="relative">
                    <select
                      value={actionType}
                      onChange={e => setActionType(e.target.value)}
                      className="w-full border border-black/80 text-[var(--text-pure)] text-[14px] outline-none appearance-none focus:border-white/10 transition-all font-medium"
                      style={{ borderRadius: 'var(--radius-input)', background: 'var(--bg-input)', padding: '14px 20px', boxShadow: 'var(--shadow-input)' }}
                    >
                      <option value="play_audio">🔈 Play Audio Asset</option>
                      <option value="open_app">🚀 Launch Application</option>
                      <option value="run_script">📜 PowerShell Script</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-20)] text-xs">▼</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex flex-col gap-2" style={{ width: 60 }}>
                    <label className="text-[11px] font-black text-[var(--text-20)] uppercase tracking-[0.3em]">Icon</label>
                    <input
                      type="text"
                      value={actionEmoji}
                      onChange={e => setActionEmoji(e.target.value)}
                      placeholder="🎵"
                      className="w-full border border-black/80 text-[var(--text-pure)] text-[18px] outline-none focus:border-white/10 transition-all placeholder:text-[var(--text-20)] text-center"
                      style={{ borderRadius: 'var(--radius-input)', background: 'var(--bg-input)', padding: '11px 8px', boxShadow: 'var(--shadow-input)' }}
                      maxLength={2}
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[11px] font-black text-[var(--text-20)] uppercase tracking-[0.3em]">Label</label>
                    <input
                      type="text"
                      value={actionLabel}
                      onChange={e => setActionLabel(e.target.value)}
                      placeholder={actionPath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Nome exibido...'}
                      className="w-full border border-black/80 text-[var(--text-pure)] text-[14px] outline-none focus:border-white/10 transition-all placeholder:text-[var(--text-20)] font-medium"
                      style={{ borderRadius: 'var(--radius-input)', background: 'var(--bg-input)', padding: '14px 20px', boxShadow: 'var(--shadow-input)' }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black text-[var(--text-20)] uppercase tracking-[0.3em]">Source Path</label>
                  <input
                    type="text"
                    value={actionPath}
                    onChange={e => setActionPath(e.target.value)}
                    placeholder="C:\Assets\sound.mp3"
                    className="w-full border border-black/80 text-[var(--text-pure)] text-[14px] outline-none focus:border-white/10 transition-all placeholder:text-[var(--text-20)] font-medium"
                    style={{ borderRadius: 'var(--radius-input)', background: 'var(--bg-input)', padding: '14px 20px', boxShadow: 'var(--shadow-input)' }}
                  />
                </div>

                <div className="flex gap-2">
                  {actionType === 'play_audio' && (
                    <button
                      onClick={togglePreview}
                      disabled={!actionPath}
                      className="flex-1 font-black text-[11px] uppercase tracking-[0.25em] cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ padding: '13px 0', borderRadius: 'var(--radius-input)', background: previewing ? 'var(--status-err)' : 'var(--bg-key-off)', color: previewing ? '#fff' : 'var(--text-40)', boxShadow: 'var(--shadow-key-off)', border: 'none' }}
                    >
                      {previewing ? '⏹ Stop' : '▶ Preview'}
                    </button>
                  )}
                  <button
                    onClick={() => uploadRef.current?.click()}
                    className="flex-1 font-black text-[11px] uppercase tracking-[0.25em] cursor-pointer transition-all active:translate-y-0.5"
                    style={{ padding: '13px 0', borderRadius: 'var(--radius-input)', background: 'var(--bg-key-off)', color: 'var(--text-40)', boxShadow: 'var(--shadow-key-off)', border: 'none' }}
                  >↑ Upload</button>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept=".mp3,.mp4,.wav,.ogg,.flac,.m4a,.ps1"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
                  />
                </div>

                {(actionType === 'open_app' || actionType === 'run_script') && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black text-[var(--text-20)] uppercase tracking-[0.3em]">Execution Args</label>
                    <input
                      type="text"
                      value={actionArgs}
                      onChange={e => setActionArgs(e.target.value)}
                      placeholder="--silent"
                      className="w-full border border-black/80 text-[var(--text-pure)] text-[14px] outline-none focus:border-white/10 transition-all placeholder:text-[var(--text-20)] font-medium"
                      style={{ borderRadius: 'var(--radius-input)', background: 'var(--bg-input)', padding: '14px 20px', boxShadow: 'var(--shadow-input)' }}
                    />
                  </div>
                )}
              </div>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={save}
                disabled={saveStatus === 'saving'}
                className="w-full font-black text-[13px] uppercase tracking-[0.35em] cursor-pointer transition-all active:translate-y-1 active:shadow-none disabled:opacity-50"
                style={{ padding: '18px 0', borderRadius: 'var(--radius-input)', background: saveStatus === 'ok' ? 'var(--status-ok)' : 'var(--bg-btn-silver)', color: '#000', boxShadow: 'var(--shadow-btn)', border: 'none' }}
              >
                {saveStatus === 'saving' ? '// Processing' : saveStatus === 'ok' ? '✓ Locked' : 'Commit Config'}
              </button>
            </div>
          </Rnd>
        )}

        {/* Mixer panel */}
        {showMixer && (
          <Rnd
            default={{ x: mxGeo.x, y: mxGeo.y, width: 'auto', height: 'auto' }}
            enableResizing={false}
            bounds="parent"
            dragHandleClassName="drag-handle"
            className={`panel-drag${isDragging('mixer') ? ' dragging' : ''}`}
            scale={scale}
            onDragStart={() => bringToFront('mixer')}
            onDragStop={(_e, d) => { saveGeo('mixer', { x: d.x, y: d.y }); endDrag('mixer') }}
            style={{ zIndex: zOf('mixer', 10) }}
          >
            <AudioMixer
              dragHandleClass="drag-handle"
              onClose={() => setShowMixer(false)}
              config={config}
              sbChannels={sbChannels}
              onRenameKey={async (keyId, label) => {
                const next = { ...config, buttons: { ...config.buttons, [keyId]: { ...config.buttons?.[keyId], label } } }
                await fetch(`${API}/api/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
                setConfig(next)
              }}
              onRegisterToggler={(keyId, fn) => { deckTogglersRef.current[keyId] = fn }}
              onRegisterSyncer={(keyId, fn) => { deckSyncersRef.current[keyId] = fn }}
              onPlayStateChange={(keyId, playing) => setPlayingKeys(prev => {
                const next = new Set(prev)
                playing ? next.add(keyId) : next.delete(keyId)
                return next
              })}
            />
          </Rnd>
        )}

        {/* Soundboard panel */}
        {showSoundboard && <SoundboardPanel onClose={() => setShowSoundboard(false)} onChannelChange={setSbChannels} />}

        {/* Live panels */}
        {showOBS && <OBSControlPanel onClose={() => setShowOBS(false)} />}
        {showBriefing && <BriefingPanel onClose={() => setShowBriefing(false)} />}
        {showYTChat && <YouTubeChatPanel onClose={() => setShowYTChat(false)} />}
        {showTimer && <TimerPanel onClose={() => setShowTimer(false)} />}

        </div>

        {/* Quick source edit popup (right-click on keyboard key) */}
        {ctxMenu && (
          <div
            ref={ctxRef}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999,
              borderRadius: 'var(--radius-sm)', padding: 12, width: 280,
              background: 'var(--bg-popup)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-40)' }}>
              Edit Source — {ctxMenu.key.replace('key_', '').toUpperCase()}
            </span>
            <input
              autoFocus
              value={ctxSrc}
              onChange={e => setCtxSrc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCtxSrc(); if (e.key === 'Escape') setCtxMenu(null) }}
              placeholder="Path or URL (.mp3, .wav, ...)"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(0,0,0,0.8)', background: 'var(--bg-input)',
                color: 'var(--text-pure)', fontSize: 12, outline: 'none',
                boxShadow: 'var(--shadow-input)',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={saveCtxSrc}
                disabled={ctxSaving}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'var(--bg-btn-silver)', color: '#000',
                  fontWeight: 800, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                  opacity: ctxSaving ? 0.5 : 1,
                }}
              >{ctxSaving ? '...' : 'Save'}</button>
              <button
                onClick={() => setCtxMenu(null)}
                style={{
                  padding: '7px 12px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-40)',
                  fontWeight: 700, fontSize: 11,
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function NavBtn({ active, onClick, title, children }: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-12 h-12 flex items-center justify-center cursor-pointer border-none transition-all active:translate-y-0.5 hover:brightness-125"
      style={{
        borderRadius: '14px',
        background: active ? 'var(--bg-key-on)' : 'transparent',
        boxShadow: active ? 'var(--shadow-key-on)' : 'none',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span className="text-lg" style={{ opacity: active ? 1 : 0.4 }}>{children}</span>
    </button>
  )
}
