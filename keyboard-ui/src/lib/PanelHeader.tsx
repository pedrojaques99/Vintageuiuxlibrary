import React from 'react'
import { closeBtnStyle } from './styles'

interface PanelHeaderProps {
  title: string
  onClose?: () => void
  children?: React.ReactNode       // badges / extra controls on the right
  className?: string               // drag handle class
  noBorder?: boolean
}

export function PanelHeader({ title, onClose, children, className, noBorder }: PanelHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 16px 12px',
        cursor: className ? 'grab' : undefined,
        borderBottom: noBorder ? undefined : '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-40)',
      }}>
        {title}
      </span>

      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>{children}</div>}

      <div style={{ flex: 1 }} />

      {onClose && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={closeBtnStyle}
        >×</button>
      )}
    </div>
  )
}
