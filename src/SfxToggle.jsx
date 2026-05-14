import { useState } from 'react'
import { getSfxEnabled, setSfxEnabled } from './utils/audio.js'

export default function SfxToggle({ style }) {
  const [on, setOn] = useState(() => getSfxEnabled())

  const toggle = () => {
    const next = !on
    setSfxEnabled(next)
    setOn(next)
  }

  return (
    <button
      onClick={toggle}
      title={on ? '효과음 끄기' : '효과음 켜기'}
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 6,
        cursor: 'pointer',
        padding: '2px 7px',
        fontSize: 16,
        lineHeight: 1,
        color: '#fff',
        flexShrink: 0,
        ...style,
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}
