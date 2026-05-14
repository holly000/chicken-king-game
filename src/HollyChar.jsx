// 이미지 크기: holly_idle 487x536, cheer 483x540, worry 438x476, surprised 465x482
const HOLLY_IMGS = {
  idle:      '/assets/holly_idle.png',
  cheer:     '/assets/holly_cheer.png',
  worry:     '/assets/holly_worry.png',
  surprised: '/assets/holly_surprised.png',
  fallback:  '/assets/holly.png',
}

export default function HollyChar({
  size = 60,
  dialog = null,
  bubbleDir = 'right',
  bubbleBelow = false,
  hollyState = 'idle',
  flying = false,
}) {
  const imgSrc = HOLLY_IMGS[hollyState] || HOLLY_IMGS.idle

  // bubbleBelow=true → 발 아래 말풍선 (뿡치 추종 시 아이템 안 가림)
  // bubbleBelow=false → 머리 위 말풍선 (기본: StartScreen 등)
  const bubbleStyle = bubbleBelow
    ? {
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 5,
        zIndex: 80,
        minWidth: 90,
        maxWidth: 190,
      }
    : {
        position: 'absolute',
        bottom: '108%',
        [bubbleDir === 'right' ? 'left' : 'right']: '4%',
        zIndex: 80,
        minWidth: 160,
        maxWidth: 300,
      }

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: size }}>
      {dialog && (
        <div
          className={`holly-bubble${bubbleBelow ? ' below' : ''}`}
          style={bubbleStyle}
        >
          <p>{dialog}</p>
        </div>
      )}

      {/* 홀리 이미지 — 클리핑 컨테이너 */}
      <div style={{
        width: size,
        height: size * 1.05,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>
        <img
          src={imgSrc}
          alt="홀리"
          onError={e => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = '1'; e.target.src = HOLLY_IMGS.fallback } }}
          style={{
            width: '88%',
            height: 'auto',
            display: 'block',
            animation: 'holly-hop-idle 2s ease-in-out infinite',
            imageRendering: 'auto',
            filter: 'drop-shadow(0 3px 7px rgba(255,143,171,0.5))',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
