import { useState, useEffect } from 'react'
import HollyChar from './HollyChar.jsx'
import PpungchiChar from './PpungchiChar.jsx'
import { saveBest, loadBest } from './utils/highScore.js'

const FAIL_MSGS = [
  '뿡치... 괜찮아? 다시 해보자!',
  '다음엔 꼭 성공하자! 홀리가 믿어!!',
  '생강 먹지 말랬잖아...',
  '치킨은 다시 먹을 수 있어!',
]

export default function GameOverScreen({ result, onRestart, onMenu, containerW, containerH }) {
  const [best, setBest] = useState(() => loadBest())
  const [isNew, setIsNew] = useState({})

  useEffect(() => {
    if (!result) return
    const { best: newBest, isNew: newIsNew } = saveBest(result)
    setBest(newBest)
    setIsNew(newIsNew)
  }, [])

  if (!result) return null
  const { cleared, score, chickenEaten, fartCount, bellySize } = result

  const hollyMsg = cleared
    ? '뿡치 정말 최고야!! 양념거리로 출발하자!! 🌶️💕'
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

  const anyNew = Object.values(isNew).some(Boolean)

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

          {/* 제목 */}
          <div className="result-title" style={{ marginBottom: cleared ? 4 : 10 }}>
            <span className="result-icon" style={{ fontSize: fs(22, 0.06, 48) }}>{cleared ? '🎉' : '💀'}</span>
            <h1 style={{ fontSize: fs(22, 0.065, 52), fontWeight: 900, whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
              {cleared ? '치킨마을 생존 성공!' : '게임 오버'}
            </h1>
            <span className="result-icon" style={{ fontSize: fs(22, 0.06, 48) }}>{cleared ? '🍗' : '💀'}</span>
          </div>

          {/* 클리어 전용 부제목 */}
          {cleared && (
            <div style={{ marginBottom: 8, textAlign: 'center' }}>
              <p style={{ fontSize: fs(13, 0.030, 17), color: '#ffe082', fontWeight: 800, wordBreak: 'keep-all', whiteSpace: 'normal' }}>
                뿡치의 뱃살이 한 단계 진화했다!
              </p>
              <p style={{ fontSize: fs(12, 0.027, 15), color: '#ff8fab', fontWeight: 700, marginTop: 3, wordBreak: 'keep-all', whiteSpace: 'normal' }}>
                다음 목적지: 양념거리 🌶️
              </p>
            </div>
          )}

          <div className="holly-comment" style={{ marginTop: 8 }}>
            <div className="holly-comment-sprite">
              <HollyChar size={Math.max(32, containerH * 0.06)} hollyState={cleared ? 'cheer' : 'worry'} />
            </div>
            <div className="speech-bubble-big">
              <p style={{ fontSize: fs(13, 0.032, 22), fontWeight: 800 }}>"{hollyMsg}"</p>
              <span className="speech-speaker" style={{ fontSize: fs(11, 0.024, 16) }}>— 홀리</span>
            </div>
          </div>

          <div className="stats-card" style={{ marginTop: 10 }}>
            <h3 style={{ fontSize: fs(13, 0.03, 20), fontWeight: 800 }}>📊 이번 결과</h3>
            <div className="stats-grid">
              {[
                { icon: '⭐', label: '점수',  value: score.toLocaleString(),   newRec: isNew.score },
                { icon: '🍗', label: '치킨',  value: `${chickenEaten}개`,       newRec: isNew.chickenEaten },
                { icon: '💨', label: '방귀',  value: `${fartCount}회`,          newRec: isNew.fartCount },
                { icon: '🏋️', label: '뱃살',  value: `${Math.round(bellySize)}%`, newRec: isNew.bellySize },
              ].map(({ icon, label, value, newRec }) => (
                <div className="stat-item" key={label} style={{ position: 'relative' }}>
                  <span className="stat-icon" style={{ fontSize: fs(16, 0.038, 28) }}>{icon}</span>
                  <span className="stat-label" style={{ fontSize: fs(11, 0.026, 18), fontWeight: 700 }}>{label}</span>
                  <span className="stat-value" style={{ fontSize: fs(14, 0.034, 24), fontWeight: 900 }}>{value}</span>
                  {newRec && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#FFD93D', color: '#3D2817',
                      fontSize: fs(9, 0.020, 12), fontWeight: 900,
                      borderRadius: 4, padding: '1px 4px', lineHeight: 1.3,
                    }}>🆕</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 최고기록 카드 */}
          {best.score > 0 && (
            <div style={{
              marginTop: 8,
              background: 'rgba(255,217,61,0.07)',
              border: '1px solid rgba(255,217,61,0.28)',
              borderRadius: 10, padding: '7px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: fs(12, 0.028, 18) }}>🏆</span>
                <span style={{ fontSize: fs(11, 0.026, 16), fontWeight: 800, color: '#FFD93D' }}>역대 최고기록</span>
                {anyNew && (
                  <span style={{
                    background: '#FFD93D', color: '#3D2817',
                    fontSize: fs(9, 0.020, 12), fontWeight: 900,
                    borderRadius: 4, padding: '1px 6px', marginLeft: 'auto',
                  }}>신기록!</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { icon: '⭐', v: best.score.toLocaleString() },
                  { icon: '🍗', v: `${best.chickenEaten}개` },
                  { icon: '💨', v: `${best.fartCount}회` },
                  { icon: '🏋️', v: `${Math.round(best.bellySize)}%` },
                ].map(({ icon, v }) => (
                  <span key={icon} style={{ fontSize: fs(11, 0.025, 15), color: '#ccc', fontWeight: 700 }}>
                    {icon} {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="gameover-buttons" style={{ marginTop: 12, gap: 10 }}>
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
