const SFX_MAP = {
  chickenEat:    '/sounds/chicken-eat.mp3',
  fartJump:      '/sounds/fart-jump.mp3',
  gingerHit:     '/sounds/ginger-hit.mp3',
  toiletDebuff:  '/sounds/toilet-debuff.mp3',
  radishRecover: '/sounds/radish-recover.mp3',
  colaBad:       '/sounds/cola-bad.mp3',
  colaZero:      '/sounds/cola-zero.mp3',
  buttonHover:   '/sounds/button-hover.mp3',
  buttonClick:   '/sounds/button-click.mp3',
  clear:         '/sounds/clear.mp3',
  gameOver:      '/sounds/game-over.mp3',
}

const SFX_VOL = {
  chickenEat:    0.55,
  fartJump:      0.45,
  gingerHit:     0.60,
  toiletDebuff:  0.50,
  radishRecover: 0.50,
  colaBad:       0.45,
  colaZero:      0.50,
  buttonHover:   0.20,
  buttonClick:   0.30,
  clear:         0.65,
  gameOver:      0.60,
}

const POOL_SIZE = 3
const pools = {}

let enabled = true
try {
  const stored = localStorage.getItem('sfxEnabled')
  if (stored !== null) enabled = stored !== 'false'
} catch {}

export function getSfxEnabled() { return enabled }

export function setSfxEnabled(val) {
  enabled = !!val
  try { localStorage.setItem('sfxEnabled', enabled ? 'true' : 'false') } catch {}
}

export function preloadSounds() {
  for (const [key, src] of Object.entries(SFX_MAP)) {
    try {
      pools[key] = Array.from({ length: POOL_SIZE }, () => {
        const a = new Audio(src)
        a.preload = 'auto'
        a.volume = SFX_VOL[key] ?? 0.5
        return a
      })
    } catch {}
  }
}

let _unlocked = false
export function unlockAudio() {
  if (_unlocked) return
  _unlocked = true
  for (const pool of Object.values(pools)) {
    if (!pool || !pool[0]) continue
    try {
      const a = pool[0].cloneNode()
      a.volume = 0
      a.play().catch(() => {})
    } catch {}
    break
  }
}

export function playSound(key) {
  if (!enabled) return
  const pool = pools[key]
  if (!pool) return
  try {
    const audio = pool.find(a => a.paused || a.ended) ?? pool[0]
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {}
}
