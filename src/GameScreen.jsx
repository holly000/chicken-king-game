import { useEffect, useRef, useReducer, useCallback, useState } from 'react'
import PpungchiChar from './PpungchiChar.jsx'
import HollyChar from './HollyChar.jsx'
import ParallaxBg from './ParallaxBg.jsx'
import SfxToggle from './SfxToggle.jsx'
import { playSound, preloadSounds, unlockAudio } from './utils/audio.js'

// ── 상수 ────────────────────────────────────────────────────────────────────────
const STAGE_TIME   = 45
const CHICKEN_GOAL = 10
const MOVE_SPEED   = 4.5
const JUMP_FORCE   = -15
const GRAVITY      = 0.58
const FART_FORCE   = -9.5
const FART_COST    = 16
const MAX_FART     = 100
const SPAWN_MS     = 1100

const HOLLY_LINES = {
  chicken:  ['치킨이다!', '빨리빨리!', '치킨 먹어!', '냠냠!!'],
  ginger:   ['생강은 안 돼애!!', '으악!! 생강이야!', '피해!! 어서!!', '뿡치 조심해!'],
  cola_zero:['제로콜라! 충전!', '방귀 게이지 업!', '럭키!!'],
  cola:     ['그건 일반 콜라야...', '또 실수했어... (한숨)'],
  radish:   ['치킨무다!! 화장실 탈출!!', '무 먹고 탈출했어!!', '행운이야!! 무가 최고야!!'],
  low_fart: ['게이지 부족! 콜라 먹어!', '제로콜라! 제로콜라!'],
  idle:     ['뿡치야~ 어디 가?', '내가 제일 귀엽지?', '홀리는 항상 여기 있을게!'],
  belly:    ['뱃살이 커졌어!', '뿡치 배 너무 커졌어!', '치킨 너무 많이 먹은 거 아니야?'],
  combo:    ['연속으로 먹어!', '콤보 이어가!', '치킨 폭주 모드!!'],
  timeWarn: ['서둘러!! 시간 없어!!', '빨리빨리!! 뿡치!!', '제한시간 얼마 없어!!'],
  bellyBig: ['뿡치 배 터질 것 같아!!', '배가 풍선같아!! 🎈', '더 먹으면 진짜 위험해!!'],
}

function pickLine(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function getItemPool(timeProgress) {
  // 0~0.22 ≈ 10초: 생강 없음, 치킨/콜라 위주
  if (timeProgress < 0.22) return ['chicken','chicken','chicken','chicken','chicken','chicken','chicken','cola_zero','cola']
  // 0.22~0.33 ≈ 15초: 생강 아주 드물게
  if (timeProgress < 0.33) return ['chicken','chicken','chicken','chicken','chicken','chicken','ginger','cola_zero','cola']
  // 0.33~0.55 ≈ 25초: 생강 가끔
  if (timeProgress < 0.55) return ['chicken','chicken','chicken','chicken','chicken','ginger','cola_zero','cola']
  // 0.55~0.78 ≈ 35초: 생강 소량 증가
  if (timeProgress < 0.78) return ['chicken','chicken','chicken','chicken','ginger','cola_zero','cola']
  // 후반: 긴장감만
  return ['chicken','chicken','chicken','ginger','cola_zero','cola']
}

// ── 초기 상태 ──────────────────────────────────────────────────────────────────
function makeInit(W, H, groundH) {
  const groundY = H - groundH
  const playerH = Math.round(H * 0.13)
  const playerW = Math.round(playerH * 0.76)
  return {
    W, H, groundH, groundY, playerW, playerH,
    player: {
      x: W * 0.10, y: groundY - playerH,
      vy: 0, onGround: true, isFlying: false, flyTick: 0,
      direction: 'right', bellySize: 100,
      health: 3, debuff: null, debuffTimer: 0,
      invincible: 0, eatTick: 0,
      landTick: 0, fartTick: 0, landCount: 0,
      airJumpsLeft: 2, airJumpConsumed: false, thrustTick: 0,
      isDucking: false, duckTick: 0,
    },
    fartGauge: 80,
    score: 0, chickenEaten: 0, fartCount: 0,
    timeLeft: STAGE_TIME,
    items: [], fartParticles: [], scorePopups: [], comboPopups: [],
    comboCount: 0, comboTimer: 0,
    shakeTimer: 0,
    nextId: 0,
    dialog: null, dialogTimer: 0, dialogCooldown: 0,
    lastIdleTick: 0, lastBellyNotice: 0, lastTimeWarn: 0,
    gameTick: 0,
    lastSpawnType: null,
    gingerCooldown: 0,
    itemToast: null, itemToastLife: 0, itemToastCd: {},
    keys: { left: false, right: false, jump: false, down: false },
    sfx: { chickenEat: 0, fartJump: 0, gingerHit: 0, colaBad: 0, colaZero: 0, radish: 0 },
  }
}

// ── 리듀서 ──────────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'KEY_DOWN': return state.keys[action.key] ? state : { ...state, keys: { ...state.keys, [action.key]: true } }
    case 'KEY_UP':   return state.keys[action.key] === false ? state : { ...state, keys: { ...state.keys, [action.key]: false } }
    case 'SPAWN_ITEM': {
      const timeProgress = Math.min(1, (STAGE_TIME - state.timeLeft) / STAGE_TIME)
      let pool = getItemPool(timeProgress)
      if (state.player.debuff === 'toilet') pool = ['radish','radish','radish','radish','radish','radish','chicken','cola_zero']
      let type = pool[Math.floor(Math.random() * pool.length)]
      if (type === 'ginger' && (state.lastSpawnType === 'ginger' || (state.gingerCooldown || 0) > 0)) {
        const ng = pool.filter(t => t !== 'ginger')
        if (ng.length > 0) type = ng[Math.floor(Math.random() * ng.length)]
      }
      const baseSize    = state.H * 0.09
      const scaleFactor = 0.78 + Math.random() * 0.48
      const iw = baseSize * scaleFactor, ih = iw
      const groundY = state.groundY

      let waveAmp, waveFreq, speedMult, rotSpeed, baseY
      switch (type) {
        case 'chicken':
          waveAmp = state.H * (0.07 + Math.random() * 0.12); waveFreq = 0.055 + Math.random() * 0.04
          speedMult = 0.85 + Math.random() * 0.55; rotSpeed = (Math.random() - 0.5) * 5
          baseY = groundY - ih - state.H * (0.04 + Math.random() * 0.22); break
        case 'ginger':
          waveAmp = state.H * (0.02 + Math.random() * 0.05); waveFreq = 0.10 + Math.random() * 0.06
          speedMult = 1.0 + Math.random() * 0.45; rotSpeed = (Math.random() - 0.5) * 9
          baseY = groundY - ih; break
        case 'cola_zero':
          waveAmp = state.H * (0.05 + Math.random() * 0.10); waveFreq = 0.04 + Math.random() * 0.03
          speedMult = 0.65 + Math.random() * 0.55; rotSpeed = 3 + Math.random() * 5
          baseY = groundY - ih - state.H * (0.08 + Math.random() * 0.28); break
        case 'radish':
          waveAmp = state.H * (0.05 + Math.random() * 0.10); waveFreq = 0.055 + Math.random() * 0.035
          speedMult = 0.75 + Math.random() * 0.45; rotSpeed = (Math.random() - 0.5) * 4
          baseY = groundY - ih - state.H * (0.06 + Math.random() * 0.18); break
        default:
          waveAmp = state.H * 0.01; waveFreq = 0.02
          speedMult = 1.15 + Math.random() * 0.3; rotSpeed = (Math.random() - 0.5) * 2
          baseY = groundY - ih
      }
      const item = {
        id: state.nextId, type,
        x: state.W + 20, y: baseY, baseY,
        w: iw, h: ih,
        waveAmp, waveFreq, waveOffset: Math.random() * Math.PI * 2,
        speedMult, rotSpeed, rotation: Math.random() * 360, alive: true,
      }
      return { ...state, items: [...state.items, item], nextId: state.nextId + 1, lastSpawnType: type }
    }
    case 'TICK': return tick(state)
    default: return state
  }
}

function tick(s) {
  let p = { ...s.player }
  let fartGauge = s.fartGauge, score = s.score
  let chickenEaten = s.chickenEaten, fartCount = s.fartCount, timeLeft = s.timeLeft
  let comboCount = s.comboCount, comboTimer = s.comboTimer
  let shakeTimer = Math.max(0, s.shakeTimer - 1)
  let fartParticles = s.fartParticles.map(fp => ({ ...fp, life: fp.life - 1 })).filter(fp => fp.life > 0)
  let scorePopups  = s.scorePopups.map(sp => ({ ...sp, life: sp.life - 1 })).filter(sp => sp.life > 0)
  let comboPopups  = s.comboPopups.map(cp => ({ ...cp, life: cp.life - 1 })).filter(cp => cp.life > 0)
  let dialog = s.dialog, dialogTimer = s.dialogTimer - 1
  let dialogCooldown = Math.max(0, s.dialogCooldown - 1)
  let lastIdleTick = s.lastIdleTick, lastBellyNotice = s.lastBellyNotice, lastTimeWarn = s.lastTimeWarn
  let gameTick = s.gameTick + 1
  let newDialog = null, highPriority = false
  let itemToast = s.itemToast, itemToastLife = Math.max(0, (s.itemToastLife || 0) - 1)
  if (itemToastLife === 0) itemToast = null
  const rawCd = s.itemToastCd || {}
  let itemToastCd = Object.fromEntries(Object.entries(rawCd).map(([k, v]) => [k, Math.max(0, v - 1)]))
  let gingerCooldown = Math.max(0, (s.gingerCooldown || 0) - 1)
  let sfx = s.sfx

  if (gameTick % 60 === 0) timeLeft = Math.max(0, timeLeft - 1)

  if (comboTimer > 0) comboTimer--
  else if (comboCount > 0) comboCount = 0

  if (p.debuffTimer > 0) { p.debuffTimer--; if (p.debuffTimer === 0) p.debuff = null }
  if (p.invincible > 0)  p.invincible--
  if (p.eatTick    > 0)  p.eatTick--
  if (p.landTick   > 0)  p.landTick--
  if (p.fartTick   > 0)  p.fartTick--
  if (p.thrustTick > 0)  p.thrustTick--

  const wasOnGround = p.onGround

  const spd = p.debuff === 'slow' ? MOVE_SPEED * 0.38 : MOVE_SPEED
  const canMove = p.debuff !== 'toilet'

  if (canMove) {
    if (s.keys.left)  { p.x = Math.max(0, p.x - spd); p.direction = 'left' }
    if (s.keys.right) { p.x = Math.min(s.W - s.playerW, p.x + spd); p.direction = 'right' }
  }

  const wantsJump = s.keys.jump
  const wantsDuck = s.keys.down
  if (!wantsJump) p.airJumpConsumed = false

  if (wantsJump && canMove) {
    if (p.onGround && fartGauge >= FART_COST) {
      p.vy = JUMP_FORCE; p.onGround = false; p.isFlying = true; p.flyTick = 35
      fartGauge = Math.max(0, fartGauge - FART_COST); fartCount++; shakeTimer = 8
      p.fartTick = 18; p.airJumpConsumed = true; p.airJumpsLeft = 2
      const px = p.direction === 'right' ? p.x - s.playerW * 0.3 : p.x + s.playerW * 0.8
      fartParticles = [...fartParticles, ...makeFartParticles(px, p.y + s.playerH * 0.8, s.playerW, p.direction)]
      sfx = { ...sfx, fartJump: sfx.fartJump + 1 }
      scorePopups = [...scorePopups, { id: `fp-${gameTick}`, x: p.x + s.playerW * 0.2, y: p.y, text: '방구 파워! 💨', life: 52, big: false }]
    } else if (!p.onGround && !p.airJumpConsumed && p.airJumpsLeft > 0 && fartGauge >= FART_COST) {
      p.vy = Math.min(p.vy, -11); p.isFlying = true; p.flyTick = 25
      p.airJumpsLeft--; p.airJumpConsumed = true; p.thrustTick = 20
      fartGauge = Math.max(0, fartGauge - FART_COST); fartCount++; shakeTimer = 5; p.fartTick = 18
      const px = p.direction === 'right' ? p.x - s.playerW * 0.3 : p.x + s.playerW * 0.8
      fartParticles = [...fartParticles, ...makeFartParticles(px, p.y + s.playerH * 0.8, s.playerW, p.direction)]
      sfx = { ...sfx, fartJump: sfx.fartJump + 1 }
    } else if (p.isFlying && p.flyTick > 0 && gameTick % 8 === 0 && fartGauge >= 6) {
      p.vy = Math.min(p.vy, FART_FORCE)
      fartGauge = Math.max(0, fartGauge - 6); fartCount++
      const px = p.direction === 'right' ? p.x - s.playerW * 0.2 : p.x + s.playerW * 0.7
      fartParticles = [...fartParticles, ...makeFartParticles(px, p.y + s.playerH * 0.75, s.playerW, p.direction)]
    }
  }

  if (wantsDuck && p.onGround && !p.isFlying) {
    p.isDucking = true; p.duckTick = 20
  } else if (p.duckTick > 0) {
    p.duckTick--; if (p.duckTick === 0) p.isDucking = false
  }

  if (p.isFlying) { p.flyTick = Math.max(0, p.flyTick - 1); if (p.flyTick === 0) p.isFlying = false }
  p.vy += (p.thrustTick > 0 ? GRAVITY * 0.22 : GRAVITY); p.y += p.vy
  if (p.y >= s.groundY - s.playerH) { p.y = s.groundY - s.playerH; p.vy = 0; p.onGround = true; p.isFlying = false; p.flyTick = 0 }
  if (!wasOnGround && p.onGround) {
    p.landTick = 24; p.landCount = (p.landCount || 0) + 1
    p.airJumpsLeft = 2; p.airJumpConsumed = false; p.thrustTick = 0
    p.isDucking = false; p.duckTick = 0
  }
  if (p.y < 0) { p.y = 0; p.vy = 0 }
  if (p.onGround && !s.keys.jump && fartGauge < MAX_FART) fartGauge = Math.min(MAX_FART, fartGauge + 0.18)

  const timeProgress = Math.min(1, (STAGE_TIME - timeLeft) / STAGE_TIME)
  const speedScale   = 1 + timeProgress * 0.40
  const baseItemSpd  = s.W / 365

  let items = s.items.map(i => {
    const spd  = baseItemSpd * speedScale * (i.speedMult ?? 1)
    const newX = i.x - spd
    const wave = Math.sin(gameTick * (i.waveFreq ?? 0.05) + (i.waveOffset ?? 0)) * (i.waveAmp ?? 0)
    const maxY = s.groundY - (i.h ?? 30)
    const newY = Math.min(maxY, (i.baseY ?? i.y) + wave)
    const newRot = ((i.rotation ?? 0) + (i.rotSpeed ?? 0)) % 360
    return { ...i, x: newX, y: newY, rotation: newRot }
  }).filter(i => i.x > -80 && i.alive)

  // 충돌 (duck 시 히트박스 위쪽 50% 축소)
  const hit = []
  items = items.map(item => {
    if (!item.alive) return item
    const px = p.x + s.playerW / 2
    const effH = p.isDucking ? s.playerH * 0.5 : s.playerH
    const py   = p.isDucking ? (p.y + s.playerH - effH / 2) : (p.y + s.playerH / 2)
    const ix = item.x + item.w / 2, iy = item.y + item.h / 2
    if (Math.abs(px - ix) < (s.playerW * 0.38 + item.w * 0.38) &&
        Math.abs(py - iy) < (effH * 0.38 + item.h * 0.38)) {
      hit.push(item); return { ...item, alive: false }
    }
    return item
  })
  items = items.filter(i => i.alive)

  for (const item of hit) {
    const idx = hit.indexOf(item)
    if (item.type === 'chicken') {
      comboCount++; comboTimer = 100
      const comboBonus = Math.min(comboCount - 1, 6) * 10
      const bellyBonus = Math.floor((p.bellySize - 100) / 50) * 10
      const bonus = 50 + comboBonus + bellyBonus
      score += bonus; chickenEaten++
      sfx = { ...sfx, chickenEat: sfx.chickenEat + 1 }
      const prevBelly = p.bellySize
      p.bellySize = Math.min(400, prevBelly + 14)
      fartGauge   = Math.min(MAX_FART, fartGauge + 14)
      p.eatTick   = 22
      scorePopups = [...scorePopups, {
        id: s.nextId + idx, x: item.x, y: item.y - 20,
        text: `+${bonus}`, life: 60, big: comboCount >= 3,
      }]
      if (comboCount >= 2) {
        comboPopups = [...comboPopups, {
          id: s.nextId + idx + 1000,
          text: comboCount >= 3 ? `🍗 치킨 폭주! ${comboCount}콤보!!` : `${comboCount}콤보!`,
          life: 80, fire: comboCount >= 3,
        }]
      }
      // 배 마일스톤 팝업
      const BELLY_MILESTONES = [[150,'배 빵빵!! 🍗'],[210,'배 꽉 찼어!! 💥'],[270,'완전 풍선!! 🎈'],[330,'배 터질듯!! 😱']]
      for (const [sz, txt] of BELLY_MILESTONES) {
        if (prevBelly < sz && p.bellySize >= sz) {
          scorePopups = [...scorePopups, { id: s.nextId + idx + 3000 + sz, x: p.x + s.playerW * 0.2, y: p.y - 30, text: txt, life: 100, big: true, belly: true }]
        }
      }
      newDialog = comboCount >= 3 ? pickLine(HOLLY_LINES.combo) : pickLine(HOLLY_LINES.chicken)
      if (p.bellySize >= 150) {
        const noticeInterval = p.bellySize >= 250 ? 90 : 180
        if (gameTick - lastBellyNotice > noticeInterval) {
          newDialog = p.bellySize >= 250 ? pickLine(HOLLY_LINES.bellyBig) : pickLine(HOLLY_LINES.belly)
          lastBellyNotice = gameTick
        }
      }
    } else if (item.type === 'ginger') {
      if (p.invincible === 0) {
        p.debuff = 'toilet'; p.debuffTimer = 130
        p.health = Math.max(0, p.health - 1); p.invincible = 90
        shakeTimer = 18; comboCount = 0; comboTimer = 0
        newDialog = pickLine(HOLLY_LINES.ginger); highPriority = true
        gingerCooldown = 300
        sfx = { ...sfx, gingerHit: sfx.gingerHit + 1 }
      }
    } else if (item.type === 'cola_zero') {
      fartGauge = Math.min(MAX_FART, fartGauge + 42)
      p.airJumpsLeft = 1
      newDialog = pickLine(HOLLY_LINES.cola_zero)
      sfx = { ...sfx, colaZero: sfx.colaZero + 1 }
    } else if (item.type === 'cola') {
      fartGauge = Math.max(0, fartGauge - 12)
      shakeTimer = 8
      newDialog = pickLine(HOLLY_LINES.cola); highPriority = true
      sfx = { ...sfx, colaBad: sfx.colaBad + 1 }
    } else if (item.type === 'radish') {
      p.debuff = null; p.debuffTimer = 0
      fartGauge = Math.min(MAX_FART, fartGauge + 20)
      newDialog = pickLine(HOLLY_LINES.radish); highPriority = true
      sfx = { ...sfx, radish: sfx.radish + 1 }
    }
  }

  // 아이템 토스트 — 생강 접근 경고 + 수집 안내
  for (const item of items) {
    if (item.type === 'ginger' && item.x < s.W * 0.5 && !(itemToastCd.ginger > 0)) {
      itemToast = '🫚 생강!! 피해!!'
      itemToastLife = 80; itemToastCd = { ...itemToastCd, ginger: 110 }
      break
    }
  }
  const TOAST_MSGS = { cola_zero:'🥤 제로콜라 마셔! 방귀 게이지 크게 충전!', cola:'🧃 일반콜라 조심! 방귀 게이지 감소!', radish:'🧊 치킨무! 화장실 탈출!' }
  for (const item of hit) {
    const msg = TOAST_MSGS[item.type]
    if (msg && !(itemToastCd[item.type] > 0)) {
      itemToast = msg; itemToastLife = 90
      itemToastCd = { ...itemToastCd, [item.type]: 120 }
    }
  }

  if (timeLeft <= 10 && timeLeft > 0 && gameTick - lastTimeWarn > 180 && !newDialog) {
    newDialog = pickLine(HOLLY_LINES.timeWarn); lastTimeWarn = gameTick; highPriority = true
  }
  if (fartGauge < 18 && dialogCooldown === 0 && !newDialog) newDialog = pickLine(HOLLY_LINES.low_fart)
  if (gameTick - lastIdleTick > 1400 && dialogCooldown === 0 && !newDialog) {
    newDialog = pickLine(HOLLY_LINES.idle); lastIdleTick = gameTick
  }
  if (newDialog && (highPriority || dialogCooldown === 0)) {
    dialog = newDialog; dialogTimer = 140; dialogCooldown = highPriority ? 0 : 90
  }
  if (dialogTimer <= 0) dialog = null

  return {
    ...s,
    player: p, fartGauge, score, chickenEaten, fartCount, timeLeft,
    items, fartParticles, scorePopups, comboPopups,
    comboCount, comboTimer, shakeTimer,
    dialog, dialogTimer, dialogCooldown,
    lastIdleTick, lastBellyNotice, lastTimeWarn, gameTick,
    itemToast, itemToastLife, itemToastCd,
    gingerCooldown, sfx,
  }
}

function makeFartParticles(x, y, pw, dir) {
  return Array.from({ length: 4 }, () => ({
    id: Math.random(),
    x: x + (Math.random() - 0.5) * pw * 0.4,
    y: y + (Math.random() - 0.5) * pw * 0.2,
    size: pw * (0.28 + Math.random() * 0.32),
    life: 30, maxLife: 30,
    dx: (dir === 'right' ? -1 : 1) * (1.5 + Math.random() * 2),
    dy: -0.5 - Math.random() * 1.2,
  }))
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function GameScreen({ onGameOver, onClear, onRestart, onMenu, containerW, containerH }) {
  const GROUND_H = Math.round(containerH * 0.18)
  const HUD_TOP  = 44
  const HUD_BOT  = 38
  const CTRL_H   = 52
  const WORLD_H  = containerH - HUD_TOP - HUD_BOT - CTRL_H

  const initFn = useCallback(() => makeInit(containerW, WORLD_H, GROUND_H), [])
  const [state, dispatch] = useReducer(reducer, null, initFn)
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Pause 상태 ──
  const [paused, setPaused]   = useState(false)
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const rafRef       = useRef(null)
  const spawnRef     = useRef(null)
  const endedRef     = useRef(false)
  const mouseZoneRef = useRef(null)
  const prevSfxRef   = useRef(null)

  // 사운드 프리로드
  useEffect(() => { preloadSounds() }, [])

  // 키보드 (방향키 + 점프)
  useEffect(() => {
    const dn = e => {
      unlockAudio()
      if (e.key === 'Escape') { setPaused(p => !p); return }
      if (['ArrowLeft','a','A'].includes(e.key))              dispatch({ type:'KEY_DOWN', key:'left' })
      if (['ArrowRight','d','D'].includes(e.key))             dispatch({ type:'KEY_DOWN', key:'right' })
      if ([' ','ArrowUp','w','W'].includes(e.key))  { e.preventDefault(); dispatch({ type:'KEY_DOWN', key:'jump' }) }
      if (['ArrowDown','s','S'].includes(e.key))    { e.preventDefault(); dispatch({ type:'KEY_DOWN', key:'down' }) }
    }
    const up = e => {
      if (['ArrowLeft','a','A'].includes(e.key))              dispatch({ type:'KEY_UP', key:'left' })
      if (['ArrowRight','d','D'].includes(e.key))             dispatch({ type:'KEY_UP', key:'right' })
      if ([' ','ArrowUp','w','W'].includes(e.key))            dispatch({ type:'KEY_UP', key:'jump' })
      if (['ArrowDown','s','S'].includes(e.key))              dispatch({ type:'KEY_UP', key:'down' })
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // 게임 루프 (pause 시 tick 건너뜀)
  useEffect(() => {
    const loop = () => {
      if (!pausedRef.current) dispatch({ type:'TICK' })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // 스폰 — 랜덤 인터벌 (초반 여유롭게, 후반 빠르게)
  useEffect(() => {
    const getDelay = () => {
      const elapsed = STAGE_TIME - stateRef.current.timeLeft
      if (elapsed < 10) return 1300 + Math.random() * 600
      if (elapsed < 25) return 1100 + Math.random() * 500
      return 950 + Math.random() * 450
    }
    const doSpawn = () => {
      if (!pausedRef.current) dispatch({ type: 'SPAWN_ITEM' })
      spawnRef.current = setTimeout(doSpawn, getDelay())
    }
    spawnRef.current = setTimeout(doSpawn, 1600)
    return () => clearTimeout(spawnRef.current)
  }, [])

  // sfx 이벤트 감지 → 사운드 재생
  useEffect(() => {
    const curr = state.sfx
    if (!prevSfxRef.current) { prevSfxRef.current = curr; return }
    const prev = prevSfxRef.current
    if (curr.chickenEat !== prev.chickenEat) playSound('chickenEat')
    if (curr.fartJump   !== prev.fartJump)   playSound('fartJump')
    if (curr.gingerHit  !== prev.gingerHit)  { playSound('gingerHit'); playSound('toiletDebuff') }
    if (curr.colaZero   !== prev.colaZero)   playSound('colaZero')
    if (curr.colaBad    !== prev.colaBad)    playSound('colaBad')
    if (curr.radish     !== prev.radish)     playSound('radishRecover')
    prevSfxRef.current = curr
  }, [state.sfx])

  // 변기 디버프 진입 시 즉각 스폰 (치킨무 확률 높은 풀)
  useEffect(() => {
    if (state.player.debuff === 'toilet') {
      const t = setTimeout(() => {
        if (!pausedRef.current) dispatch({ type: 'SPAWN_ITEM' })
      }, 400)
      return () => clearTimeout(t)
    }
  }, [state.player.debuff])

  // 게임 종료 감지
  useEffect(() => {
    if (endedRef.current || paused) return
    const { player: p, timeLeft, chickenEaten } = state
    const stats = { score: state.score, chickenEaten, fartCount: state.fartCount, bellySize: p.bellySize }
    if (p.health <= 0) {
      endedRef.current = true
      cancelAnimationFrame(rafRef.current); clearInterval(spawnRef.current)
      playSound('gameOver')
      onGameOver(stats); return
    }
    if (timeLeft <= 0) {
      endedRef.current = true
      cancelAnimationFrame(rafRef.current); clearInterval(spawnRef.current)
      if (chickenEaten >= CHICKEN_GOAL) { playSound('clear'); onClear(stats) }
      else { playSound('gameOver'); onGameOver(stats) }
    }
  }, [state.player.health, state.timeLeft, paused])

  const { player: p, fartGauge, score, chickenEaten, fartCount, timeLeft, items, fartParticles, scorePopups, comboPopups, comboCount, shakeTimer, dialog, itemToast } = state

  const fartPct  = Math.round(fartGauge)
  const bellyPct = Math.round(((p.bellySize - 100) / 300) * 100)
  const timeWarn = timeLeft <= 10
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  const isMobileSm  = WORLD_H < 280
  const ppSize      = Math.round(WORLD_H * (isMobileSm ? 0.30 : 0.22))
  const hollySize   = Math.round(ppSize * 0.70)
  const itemCardSize = Math.round(WORLD_H * 0.095)
  const itemScale   = isMobileSm ? 1.72 : 1.45

  const charState = p.debuff === 'toilet' ? 'toilet'
                  : p.debuff === 'slow'   ? 'slow'
                  : p.isFlying            ? 'fly'
                  : p.vy < -2 && !p.onGround ? 'jump'
                  : p.eatTick > 0         ? 'eating'
                  : p.isDucking           ? 'idle'
                  : 'idle'
  const hollyIsFlying = p.isFlying || charState === 'fly' || charState === 'jump'

  const hollyState = p.eatTick > 10 ? 'cheer'
                   : p.invincible > 0 && p.debuff ? 'surprised'
                   : timeLeft <= 10 ? 'worry'
                   : comboCount >= 3 ? 'cheer'
                   : 'idle'

  const shakeX = shakeTimer > 0 ? Math.sin(state.gameTick * 2.2) * Math.min(shakeTimer, 5) : 0

  // 배 출렁 물리 계산
  const bellyStage = p.bellySize >= 350 ? 4 : p.bellySize >= 250 ? 3 : p.bellySize >= 175 ? 2 : p.bellySize >= 130 ? 1 : 0
  const bellyJiggle =
    p.eatTick > 0           ? 'eat' :
    p.isDucking             ? 'land' :
    (p.landTick || 0) > 0   ? 'land' :
    (p.fartTick || 0) > 0   ? 'fart' :
    p.onGround && (state.keys.left || state.keys.right)
      ? (bellyStage >= 3 ? 'walk-lg' : bellyStage >= 1 ? 'walk-md' : 'walk-sm') :
    'idle'
  const jiggleKey =
    bellyJiggle === 'eat'  ? `eat-${state.chickenEaten}` :
    bellyJiggle === 'fart' ? `fart-${state.fartCount}` :
    bellyJiggle === 'land' ? `land-${p.landCount || 0}` :
    bellyJiggle

  const charPixelH = ppSize * 1.05
  const charPixelW = ppSize * 0.85

  const pressL = useCallback(() => dispatch({ type:'KEY_DOWN', key:'left' }), [])
  const relL   = useCallback(() => dispatch({ type:'KEY_UP',   key:'left' }), [])
  const pressR = useCallback(() => dispatch({ type:'KEY_DOWN', key:'right'}), [])
  const relR   = useCallback(() => dispatch({ type:'KEY_UP',   key:'right'}), [])
  const pressJ = useCallback(() => dispatch({ type:'KEY_DOWN', key:'jump' }), [])
  const relJ   = useCallback(() => dispatch({ type:'KEY_UP',   key:'jump' }), [])
  const pressD = useCallback(() => dispatch({ type:'KEY_DOWN', key:'down' }), [])
  const relD   = useCallback(() => dispatch({ type:'KEY_UP',   key:'down' }), [])

  const handleWorldPointerDown = useCallback((e) => {
    unlockAudio()
    if (pausedRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    let zone
    if (pct < 0.35)      zone = 'left'
    else if (pct > 0.65) zone = 'right'
    else                  zone = 'jump'
    mouseZoneRef.current = zone
    dispatch({ type: 'KEY_DOWN', key: zone })
  }, [])

  const handleWorldPointerUp = useCallback((e) => {
    const zone = mouseZoneRef.current
    if (zone) { dispatch({ type: 'KEY_UP', key: zone }); mouseZoneRef.current = null }
  }, [])

  const icons      = { chicken:'🍗', ginger:'🫚', cola_zero:'🥤', cola:'🧃', radish:'🧊' }
  const itemLabel  = { cola_zero:'ZERO', cola:'COLA', radish:'무' }
  const labelColor = { cola_zero:'#01579b', cola:'#e65100', radish:'#0077cc' }

  return (
    <div style={{ width: containerW, height: containerH, position: 'relative', overflow: 'hidden', background: '#0d0d1a' }}>

      {/* ── HUD 상단 ── */}
      <div className="hud-bar top" style={{ width: containerW }}>
        <div className="hud-hearts">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`hud-heart ${i < p.health ? '' : 'dead'}`}>{i < p.health ? '❤️' : '🖤'}</span>
          ))}
        </div>
        <div className="hud-score">⭐ {score.toLocaleString()}</div>
        <div className="hud-mission">🍗 {chickenEaten}/{CHICKEN_GOAL}</div>
        <div className={`hud-timer ${timeWarn ? 'warn' : ''}`}>⏱ {mm}:{ss}</div>
        {/* SFX + 일시정지 버튼 */}
        <SfxToggle style={{ marginRight: 4 }} />
        <button
          className="pause-btn"
          onClick={() => setPaused(p => !p)}
          title="일시정지 (ESC)"
        >
          ⏸
        </button>
      </div>

      {/* ── 게임 월드 ── */}
      <div
        className="game-world"
        style={{
          position: 'absolute',
          top: HUD_TOP, left: 0, right: 0,
          height: WORLD_H,
          overflow: 'hidden',
          transform: `translateX(${shakeX}px)`,
          cursor: 'pointer',
        }}
        onPointerDown={handleWorldPointerDown}
        onPointerUp={handleWorldPointerUp}
        onPointerLeave={handleWorldPointerUp}
      >
        <ParallaxBg scrolling={!paused} groundH={GROUND_H} totalH={WORLD_H} />

        {/* 지면 */}
        <div className="game-ground" style={{ height: GROUND_H, position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5 }} />

        {/* 아이템 */}
        {items.map(item => {
          const isGinger = item.type === 'ginger'
          const shadow = isGinger
            ? 'drop-shadow(0 0 8px rgba(230,57,70,0.92)) drop-shadow(0 2px 5px rgba(0,0,0,0.35))'
            : item.type === 'chicken'
            ? 'drop-shadow(0 3px 7px rgba(200,160,0,0.72)) drop-shadow(0 1px 3px rgba(0,0,0,0.25))'
            : item.type === 'cola_zero'
            ? 'drop-shadow(0 2px 7px rgba(2,136,209,0.72)) drop-shadow(0 1px 3px rgba(0,0,0,0.22))'
            : item.type === 'radish'
            ? 'drop-shadow(0 2px 8px rgba(100,200,255,0.82)) drop-shadow(0 1px 3px rgba(0,0,0,0.22))'
            : 'drop-shadow(0 2px 7px rgba(200,100,0,0.62)) drop-shadow(0 1px 3px rgba(0,0,0,0.22))'
          const label = itemLabel[item.type]
          return (
            <div key={item.id} style={{
              position: 'absolute',
              left: item.x, top: item.y,
              width: item.w, height: item.h,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `rotate(${item.rotation ?? 0}deg)`,
              zIndex: 15, pointerEvents: 'none',
            }}>
              <div style={{
                transform: `scale(${itemScale})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                filter: shadow,
                animation: isGinger ? 'ginger-item-pulse 0.55s ease-in-out infinite' : undefined,
              }}>
                <span style={{ fontSize: item.w * 0.84, lineHeight: 1 }}>{icons[item.type]}</span>
                {label && (
                  <span style={{
                    fontSize: item.w * 0.25, fontWeight: 900,
                    color: labelColor[item.type] || '#fff',
                    textShadow: '1px 1px 0 rgba(0,0,0,0.55)',
                    lineHeight: 1, marginTop: 1,
                  }}>{label}</span>
                )}
              </div>
            </div>
          )
        })}

        {/* 방귀 파티클 */}
        {fartParticles.map(fp => {
          const progress = 1 - fp.life / fp.maxLife
          const alpha = fp.life > fp.maxLife * 0.4 ? 0.82 : fp.life / (fp.maxLife * 0.4) * 0.82
          return (
            <div key={fp.id} style={{
              position: 'absolute',
              left: fp.x + fp.dx * (fp.maxLife - fp.life) * 1.6,
              top:  fp.y + fp.dy * (fp.maxLife - fp.life) * 1.6,
              width: fp.size, height: fp.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFE082, #A1887F)',
              opacity: alpha,
              transform: `scale(${1 + progress * 1.3})`,
              zIndex: 25, pointerEvents: 'none',
            }} />
          )
        })}

        {/* 방귀 텍스트 */}
        {state.keys.jump && p.isFlying && (
          <div className="fart-text" key={`ft-${state.gameTick}`} style={{
            left: p.direction === 'right' ? p.x - 40 : p.x + charPixelW,
            top:  p.y + charPixelH * 0.55,
          }}>
            뿌우웅!!
          </div>
        )}

        {/* 점수 팝업 */}
        {scorePopups.map(sp => (
          <div key={sp.id} className={`score-popup ${sp.big ? 'big' : ''} ${sp.belly ? 'belly' : ''}`} style={{ left: sp.x, top: sp.y - (60 - sp.life) * 0.75 }}>
            {sp.text}
          </div>
        ))}

        {/* 콤보 팝업 */}
        {comboPopups.map(cp => (
          <div key={cp.id} className={`combo-popup ${cp.fire ? 'fire' : ''}`} style={{ opacity: Math.min(1, cp.life / 20) }}>
            {cp.text}
          </div>
        ))}

        {/* 아이템 토스트 안내 */}
        {itemToast && (
          <div
            className="item-toast"
            style={{
              position: 'absolute', top: 10, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10,10,30,0.88)',
              color: '#fff', fontWeight: 800,
              fontSize: Math.max(12, WORLD_H * 0.036),
              padding: '4px 14px', borderRadius: 20,
              border: '1.5px solid rgba(255,255,255,0.22)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              zIndex: 85, pointerEvents: 'none', whiteSpace: 'nowrap',
              animation: 'bubble-pop 0.2s ease-out',
            }}
          >
            {itemToast}
          </div>
        )}

        {/* TODO [2탄]: 스테이지 클리어 시 "파랑치킨 해금" 연출 추가 예정
            - onClear 콜백에서 획득 치킨 종류 전달
            - 다음 판부터 해금된 파랑치킨이 아이템 풀에 추가되는 시스템 */}

        {/* 뿡치 (변기 상태 제외) */}
        {charState !== 'toilet' && (
          <div style={{
            position: 'absolute',
            left: p.x - (charPixelW - state.playerW) / 2,
            top:  p.y - (charPixelH - state.playerH) * 0.82,
            zIndex: 20, pointerEvents: 'none',
            transform: p.isDucking ? 'scaleY(0.52) scaleX(1.3)' : p.isFlying ? 'scale(1.18)' : undefined,
            transformOrigin: 'bottom center',
          }}>
            <PpungchiChar size={ppSize} bellySize={p.bellySize} state={charState} direction={p.direction} invincible={p.invincible > 0} bellyJiggle={bellyJiggle} jiggleKey={jiggleKey} />
          </div>
        )}

        {/* 변기 갇힘 — 크게 중앙 표시 */}
        {charState === 'toilet' && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
            zIndex: 28, pointerEvents: 'none',
          }}>
            <img
              src="/assets/boongchi_toilet.png"
              alt="변기에 갇힌 뿡치"
              style={{
                height: Math.round(WORLD_H * 0.52),
                width: 'auto', display: 'block',
                filter: 'drop-shadow(0 6px 24px rgba(80,0,0,0.7))',
              }}
            />
          </div>
        )}

        {/* 홀리 — 뿡치 추종, 뿡치 위에 위치, 말풍선은 발 아래로 */}
        {charState !== 'toilet' && (
          <div style={{
            position: 'absolute',
            left: Math.max(0, p.x - hollySize * 0.6),
            top:  Math.max(4, p.y - hollySize * 0.5),
            zIndex: 22, pointerEvents: 'none',
          }}>
            <HollyChar size={hollySize} dialog={dialog} bubbleDir="right" bubbleBelow hollyState={hollyState} flying={false} />
          </div>
        )}

        {/* 변기 갇힘 텍스트 오버레이 */}
        {charState === 'toilet' && (
          <div style={{
            position: 'absolute', top: '8%', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(130,20,20,0.88)',
            borderRadius: 16, padding: '6px 20px',
            fontSize: Math.max(16, WORLD_H * 0.055),
            fontWeight: 900, color: '#fff',
            textShadow: '2px 2px 0 #4a0000',
            whiteSpace: 'nowrap', zIndex: 50,
            pointerEvents: 'none',
            animation: 'ginger-danger-pulse 0.5s ease-in-out infinite',
          }}>
            🚽 변기뿌시는 중!!
          </div>
        )}

        {/* 시간 경고 */}
        {timeWarn && timeLeft > 0 && !paused && (
          <div className="time-warn">⏰ 서둘러!! {timeLeft}초!</div>
        )}
      </div>

      {/* ── HUD 하단 ── */}
      <div className="hud-bar bottom" style={{ position: 'absolute', top: HUD_TOP + WORLD_H, width: containerW, height: HUD_BOT }}>
        <div className="hud-gauge-row">
          <span className="hud-gauge-label">💨 방귀</span>
          <div className="hud-gauge-bar" style={{ flex: 1, maxWidth: 160 }}>
            <div className={`hud-gauge-fill fart ${fartPct < 20 ? 'low' : fartPct > 80 ? 'high' : ''}`} style={{ width: `${fartPct}%` }} />
          </div>
          <span className="hud-gauge-pct">{fartPct}%</span>
        </div>
        <div className="hud-gauge-row" style={{ marginLeft: 12 }}>
          <span className="hud-gauge-label">🏋️ 뱃살</span>
          <div className="hud-gauge-bar" style={{ flex: 1, maxWidth: 120 }}>
            <div className="hud-gauge-fill belly" style={{ width: `${Math.min(100, bellyPct)}%` }} />
          </div>
          <span className="hud-gauge-pct">{Math.round(p.bellySize)}%</span>
        </div>
        <div className="hud-fart-count">💨×{fartCount}</div>
      </div>

      {/* ── 컨트롤 바 ── */}
      <div className="ctrl-bar" style={{ position: 'absolute', top: HUD_TOP + WORLD_H + HUD_BOT, width: containerW, height: CTRL_H }}>
        <div className="ctrl-dpad">
          <button className="ctrl-btn large" onPointerDown={pressL} onPointerUp={relL} onPointerLeave={relL} style={{ fontSize: Math.max(18, CTRL_H * 0.5) }}>◀</button>
          <button className="ctrl-btn large" onPointerDown={pressR} onPointerUp={relR} onPointerLeave={relR} style={{ fontSize: Math.max(18, CTRL_H * 0.5) }}>▶</button>
          <button className={`ctrl-btn ${p.isDucking ? 'active' : ''}`} onPointerDown={pressD} onPointerUp={relD} onPointerLeave={relD} style={{ fontSize: Math.max(14, CTRL_H * 0.4), minWidth: 36 }} title="몸 낮추기 (↓)">▼</button>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#888' }}>
          {p.debuff === 'toilet' ? '🚽 변기뿌시는 중...' : p.debuff === 'slow' ? '😵 더부룩...' : p.isDucking ? '🦆 납작!' : ''}
        </div>
        <button className={`ctrl-btn fart-btn ${fartGauge < FART_COST ? 'empty' : ''}`} onPointerDown={pressJ} onPointerUp={relJ} onPointerLeave={relJ} style={{ fontSize: Math.max(16, CTRL_H * 0.44), padding: '0 16px' }}>
          💨 방귀!
        </button>
      </div>

      {/* ── 일시정지 오버레이 ── */}
      {paused && (
        <div className="pause-overlay" onClick={() => setPaused(false)}>
          <div className="pause-menu" onClick={e => e.stopPropagation()}>
            <div className="pause-title">⏸ 일시정지</div>
            <div className="pause-stats">
              <span>🍗 {chickenEaten}/{CHICKEN_GOAL}</span>
              <span>⭐ {score.toLocaleString()}</span>
              <span>⏱ {mm}:{ss}</span>
            </div>
            <div className="pause-buttons">
              <button className="pause-btn-menu continue" onClick={() => setPaused(false)}>
                ▶ 계속하기
              </button>
              <button className="pause-btn-menu restart" onClick={onRestart}>
                🔄 다시하기
              </button>
              <button className="pause-btn-menu home" onClick={onMenu}>
                🏠 처음으로
              </button>
            </div>
            <p className="pause-hint">ESC 또는 배경 클릭으로 계속</p>
          </div>
        </div>
      )}

    </div>
  )
}
