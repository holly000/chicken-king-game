import HollyChar from './HollyChar.jsx'
import PpungchiChar from './PpungchiChar.jsx'

const FAIL_MSGS = [
  '뿡치... 괜찮아? 다시 해보자!',
  '다음엔 꼭 성공하자! 홀리가 믿어!!',
  '생강 먹지 말랬잖아...',
  '치킨은 다시 먹을 수 있어!',
]

export default function GameOverScreen({ result, onRestart, onMenu, containerW, containerH }) {
  if (!result) return null
  const { cleared, score, chickenEaten, fartCount, bellySize } = result

  const hollyMsg = cleared
    ? '뿡치 최고야!! 치킨마을을 다 지켰어!!! 💕'
    : fartCount === 0
    ? '방귀를 한 번도 안 뀌었잖아... 뿡치야...'
    : chickenEaten < 4
    ? '뿡치... 괜찮아? 더 할 수 있어!'
    : chickenEaten < 8
    ? '생강 먹지 말랬잖아...'
    : '치킨은 다시 먹을 수 있어! 다음엔 꼭 성공하자!'

  const ppSize    = Math.min(containerH * 0.32, containerW * 0.16)
  const hollySize = ppSize * 0.62

  const fs = (min, vhFrac, max) => `clamp(${min}px, ${containerH * vhFrac}px, ${max}px)`

  return (
    <div
      className={`gameover-screen ${cleared ? 'cleared' : 'failed'}`}
      style={{ width: containerW, height: containerH }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: cleared
          ? 'radial-gradient(ellipse at 30% 50%, rgba(100,200,80,0.22) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at 70% 50%, rgba(200,50,50,0.22) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div className="gameover-content" style={{
        flexDirection: 'row', flexWrap: 'nowrap',
        alignItems: 'center', justifyContent: 'center',
        gap: containerW * 0.04,
        maxWidth: containerW,
        padding: `0 ${containerW * 0.04}px`,
      }}>

        {/* 왼쪽: 캐릭터 (뿡치 + 홀리 나란히) */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ filter: cleared ? 'drop-shadow(0 0 20px rgba(255,217,61,0.6))' : 'none' }}>
              <PpungchiChar
                size={ppSize}
                bellySize={bellySize}
                state={cleared ? 'eating' : 'idle'}
                direction="right"
              />
            </div>
            <HollyChar size={hollySize} hollyState={cleared ? 'cheer' : 'worry'} />
          </div>
        </div>

        {/* 오른쪽: 결과 */}
        <div style={{ flex: 1, minWidth: 220, maxWidth: 420 }}>

          <div className="result-title" style={{ marginBottom: 10 }}>
            <span className="result-icon" style={{ fontSize: fs(22, 0.06, 48) }}>{cleared ? '🎉' : '💀'}</span>
            <h1 style={{ fontSize: fs(22, 0.065, 52), fontWeight: 900, whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
              {cleared ? '스테이지 클리어!' : '게임 오버'}
            </h1>
            <span className="result-icon" style={{ fontSize: fs(22, 0.06, 48) }}>{cleared ? '🍗' : '💀'}</span>
          </div>

          <div className="holly-comment" style={{ marginTop: 10 }}>
            <div className="holly-comment-sprite">
              <HollyChar size={Math.max(32, containerH * 0.06)} hollyState={cleared ? 'cheer' : 'worry'} />
            </div>
            <div className="speech-bubble-big">
              <p style={{ fontSize: fs(13, 0.032, 22), fontWeight: 800 }}>"{hollyMsg}"</p>
              <span className="speech-speaker" style={{ fontSize: fs(11, 0.024, 16) }}>— 홀리</span>
            </div>
          </div>

          <div className="stats-card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: fs(13, 0.03, 20), fontWeight: 800 }}>📊 결과</h3>
            <div className="stats-grid">
              {[
                { icon: '⭐', label: '점수', value: score.toLocaleString() },
                { icon: '🍗', label: '치킨', value: `${chickenEaten}개` },
                { icon: '💨', label: '방귀', value: `${fartCount}회` },
                { icon: '🏋️', label: '뱃살', value: `${Math.round(bellySize)}%` },
              ].map(({ icon, label, value }) => (
                <div className="stat-item" key={label}>
                  <span className="stat-icon" style={{ fontSize: fs(16, 0.038, 28) }}>{icon}</span>
                  <span className="stat-label" style={{ fontSize: fs(11, 0.026, 18), fontWeight: 700 }}>{label}</span>
                  <span className="stat-value" style={{ fontSize: fs(14, 0.034, 24), fontWeight: 900 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="gameover-buttons" style={{ marginTop: 14, gap: 10 }}>
            <button
              className="btn-retry"
              onClick={onRestart}
              style={{
                fontSize: fs(14, 0.036, 26),
                fontWeight: 900,
                padding: `${Math.max(10, containerH * 0.025)}px ${Math.max(16, containerW * 0.02)}px`,
                borderRadius: 50,
              }}
            >
              🔄 다시 도전!
            </button>
            <button
              className="btn-menu"
              onClick={onMenu}
              style={{
                fontSize: fs(14, 0.036, 26),
                fontWeight: 900,
                padding: `${Math.max(10, containerH * 0.025)}px ${Math.max(16, containerW * 0.02)}px`,
                borderRadius: 50,
              }}
            >
              🏠 메뉴
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
