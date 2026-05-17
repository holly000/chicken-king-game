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

const MENU_BGM_SRC = '/sounds/bgm/opening-theme.mp3'
const MENU_BGM_VOLUME = 0.35
const POOL_SIZE = 3
const pools = {}
let menuBgm = null

let enabled = true
try {
  const stored = localStorage.getItem('sfxEnabled')
  if (stored !== null) enabled = stored !== 'false'
} catch {}

export function getSfxEnabled() { return enabled }

export function setSfxEnabled(val) {
  enabled = !!val
  try { localStorage.setItem('sfxEnabled', enabled ? 'true' : 'false') } catch {}
  if (!enabled) stopMenuBgm()
  try { window.dispatchEvent(new CustomEvent('sfxEnabledChange', { detail: enabled })) } catch {}
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

function getMenuBgm() {
  if (!menuBgm) {
    menuBgm = new Audio(MENU_BGM_SRC)
    menuBgm.loop = true
    menuBgm.volume = MENU_BGM_VOLUME
    menuBgm.preload = 'auto'
  }
  return menuBgm
}

export function playMenuBgm() {
  if (!enabled) return Promise.resolve(false)
  try {
    const audio = getMenuBgm()
    audio.loop = true
    audio.volume = MENU_BGM_VOLUME
    if (!audio.paused && !audio.ended) return Promise.resolve(true)
    return audio.play().then(() => true).catch(() => false)
  } catch {
    return Promise.resolve(false)
  }
}

export function stopMenuBgm() {
  if (!menuBgm) return
  try {
    menuBgm.pause()
    menuBgm.currentTime = 0
  } catch {}
}
