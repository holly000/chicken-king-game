// 이미지 크기: idle 459x531, eat 389x485, fart 1536x1024(가로), sick 441x471, surprised 487x521, toilet 1536x1024(가로)
const IMGS = {
  idle:      '/assets/boongchi_idle.png',
  eat:       '/assets/boongchi_eat.png',
  sick:      '/assets/boongchi_sick.png',
  fart:      '/assets/boongchi_fart.png',
  surprised: '/assets/boongchi_surprised.png',
  toilet:    '/assets/boongchi_toilet.png',
  fallback:  '/assets/boongchi.png',
}

function getImgSrc(state) {
  if (state === 'eating')                  return IMGS.eat
  if (state === 'fly' || state === 'jump') return IMGS.fart
  if (state === 'toilet')                  return IMGS.toilet
  if (state === 'slow')                    return IMGS.sick
  if (state === 'surprised')               return IMGS.surprised
  return IMGS.idle
}

function getBellyStage(bellySize) {
  if (bellySize >= 350) return 4
  if (bellySize >= 250) return 3
  if (bellySize >= 175) return 2
  if (bellySize >= 130) return 1
  return 0
}

// bellyJiggle → CSS 클래스 매핑
const JIGGLE_CLASS = {
  'eat':     'belly-eat',
  'land':    'belly-land',
  'fart':    'belly-fart',
  'walk-sm': 'belly-walk-sm',
  'walk-md': 'belly-walk-md',
  'walk-lg': 'belly-walk-lg',
}

// bellySize에 따른 전체 스케일 (100%→1.0, 400%→1.72)
function computeOverallScale(bellySize) {
  const pct = Math.max(0, Math.min(1, (bellySize - 100) / 300))
  return 1 + Math.pow(pct, 0.82) * 0.72
}

export default function PpungchiChar({
  size = 100,
  bellySize = 100,
  state = 'idle',
  direction = 'right',
  invincible = false,
  bellyJiggle = 'idle',
  jiggleKey = 'idle',
}) {
  const bellyStage   = getBellyStage(bellySize)
  const overallScale = computeOverallScale(bellySize)
  const flip         = direction === 'left' ? -1 : 1

  const isFlying    = state === 'fly' || state === 'jump'
  const isToilet    = state === 'toilet'
  const isLandscape = isFlying || isToilet
  const isSlow      = state === 'slow'
  const isEating    = state === 'eating'
  const imgSrc      = getImgSrc(state)

  // 애니메이션 클래스: img 전용 (body animation — flip/scale은 wrapper 담당)
  const animClass = [
    isToilet  ? '' :
    isFlying  ? 'char-anim-jump'   :
    isEating  ? 'char-anim-eating' :
    isSlow    ? 'char-anim-slow'   : 'char-anim-idle',
    invincible ? 'char-anim-invincible' : '',
  ].filter(Boolean).join(' ')

  const jiggleClass = JIGGLE_CLASS[bellyJiggle] || ''

  // 배 aura: 단계별로 더 크고 강하게
  const auraConfigs = [
    null,
    { color: 'rgba(255,220,80,0.42)',  wX: 0.74, wY: 0.42, pulse: '1.2s' },
    { color: 'rgba(255,160,40,0.58)',  wX: 0.90, wY: 0.52, pulse: '0.9s' },
    { color: 'rgba(255,80,20,0.70)',   wX: 1.10, wY: 0.62, pulse: '0.65s' },
    { color: 'rgba(255,30,0,0.80)',    wX: 1.32, wY: 0.74, pulse: '0.45s' },
  ]
  const aura = auraConfigs[bellyStage]

  const cW = size
  const cH = size

  return (
    <div style={{ position: 'relative', width: cW, height: cH, flexShrink: 0 }}>

      {/* 배 aura — 단계별로 커지고 빨라짐 */}
      {aura && (<>
        {/* 메인 글로우 */}
        <div style={{
          position: 'absolute',
          bottom: cH * 0.04, left: '50%',
          transform: 'translateX(-50%)',
          width: cW * aura.wX, height: cH * aura.wY,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${aura.color} 0%, transparent 70%)`,
          animation: `belly-aura-pulse ${aura.pulse} ease-in-out infinite alternate`,
          pointerEvents: 'none', zIndex: 1,
        }} />
        {/* 고단계 외부 링 */}
        {bellyStage >= 3 && (
          <div style={{
            position: 'absolute',
            bottom: cH * 0.02, left: '50%',
            transform: 'translateX(-50%)',
            width: cW * (aura.wX + 0.28), height: cH * (aura.wY + 0.16),
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${aura.color.replace(/[\d.]+\)$/, '0.22)')} 0%, transparent 70%)`,
            animation: `belly-aura-pulse ${parseFloat(aura.pulse) * 0.7}s ease-in-out infinite alternate-reverse`,
            pointerEvents: 'none', zIndex: 0,
          }} />
        )}
      </>)}

      {/* 배 출렁 레이어: jiggleClass 애니메이션 (이미지 콘텐츠 감싸기)
          key 변경 시 remount → 애니메이션 강제 재시작 */}
      <div
        key={jiggleKey}
        className={jiggleClass}
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
      >
        {/* flip + overallScale wrapper (정적 transform — animClass와 분리) */}
        {!isLandscape && (
          <div style={{
            position: 'absolute', bottom: 0, left: '6%', width: '88%',
            transform: `scaleX(${flip}) scale(${overallScale})`,
            transformOrigin: 'bottom center',
          }}>
            <img
              src={imgSrc}
              alt="뿡치"
              className={animClass}
              onError={e => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = IMGS.fallback } }}
              style={{ width: '100%', height: 'auto', display: 'block', imageRendering: 'auto', transformOrigin: 'bottom center' }}
              draggable={false}
            />
          </div>
        )}

        {/* 가로형 이미지 (fart / toilet) */}
        {isLandscape && (
          <div style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: isFlying
              ? `translateX(-50%) scaleX(${flip}) scale(${overallScale})`
              : 'translateX(-50%)',
            transformOrigin: 'bottom center',
          }}>
            <img
              src={imgSrc}
              alt="뿡치"
              className={isFlying ? animClass : ''}
              onError={e => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = IMGS.fallback } }}
              style={{ height: cH, width: 'auto', display: 'block', imageRendering: 'auto' }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* 무적 깜빡 */}
      {invincible && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.42)',
          animation: 'inv-blink 0.12s step-start infinite',
          pointerEvents: 'none', zIndex: 6,
        }} />
      )}

      {/* 방귀 구름 (비행 중) */}
      {isFlying && (
        <div style={{
          position: 'absolute',
          bottom: cH * 0.08,
          [direction === 'right' ? 'left' : 'right']: -cW * 0.1,
          display: 'flex', gap: 3,
          animation: 'fart-cloud-spawn 0.2s ease-out',
          pointerEvents: 'none', zIndex: 7,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width:  cW * (0.14 - i * 0.03),
              height: cW * (0.14 - i * 0.03),
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFE082 0%, #BCAAA4 80%)',
              opacity: 0.78 - i * 0.2,
              animation: `fart-cloud-puff ${0.35 + i * 0.1}s ease-out forwards`,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
