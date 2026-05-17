import { useState, useEffect } from 'react'
import ParallaxBg from './ParallaxBg.jsx'
import HollyChar from './HollyChar.jsx'
import SfxToggle from './SfxToggle.jsx'
import { getSfxEnabled, playMenuBgm, playSound, preloadSounds, stopMenuBgm, unlockAudio } from './utils/audio.js'
import { loadBest } from './utils/highScore.js'
import { loadProfiles, getActiveId } from './utils/profiles.js'
import ProfileSelect from './ProfileSelect.jsx'

function getTodayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function shouldAutoShow() {
  try {
    return localStorage.getItem('storyPopupHiddenDate') !== getTodayStr()
  } catch {
    return true
  }
}

export default function StartScreen({ onStart, containerW, containerH, activeProfileId, onProfileChange }) {
  const [showStory,    setShowStory]    = useState(shouldAutoShow)
  const [showBest,     setShowBest]     = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [best,         setBest]         = useState(() => loadBest())
  const [profileName,  setProfileName]  = useState(() => {
    const id = activeProfileId || getActiveId()
    return id ? (loadProfiles().find(p => p.id === id)?.name || null) : null
  })
  // 소형 화면(모바일 가로)에서는 조작법 기본 접힘
  const [showControls, setShowControls] = useState(() => containerH > 450)

  useEffect(() => {
    const id = activeProfileId
    if (id) {
      const p = loadProfiles().find(pr => pr.id === id)
      setProfileName(p?.name || null)
    } else {
      setProfileName(null)
    }
  }, [activeProfileId])

  useEffect(() => { preloadSounds() }, [])
  useEffect(() => { setBest(loadBest()) }, [])
  useEffect(() => {
    let cleanedUp = false
    let retryArmed = false

    const cleanupRetry = () => {
      window.removeEventListener('pointerdown', retryOnce)
      window.removeEventListener('keydown', retryOnce)
      retryArmed = false
    }

    const retryOnce = () => {
      cleanupRetry()
      if (cleanedUp || !getSfxEnabled()) return
      playMenuBgm()
    }

    const armRetryOnce = () => {
      if (retryArmed) return
      retryArmed = true
      window.addEventListener('pointerdown', retryOnce, { once: true })
      window.addEventListener('keydown', retryOnce, { once: true })
    }

    const onSfxChange = (event) => {
      if (!event.detail) {
        cleanupRetry()
        stopMenuBgm()
        return
      }
      if (!cleanedUp) playMenuBgm()
    }

    playMenuBgm().then((played) => {
      if (!cleanedUp && !played && getSfxEnabled()) armRetryOnce()
    })
    window.addEventListener('sfxEnabledChange', onSfxChange)

    return () => {
      cleanedUp = true
      cleanupRetry()
      window.removeEventListener('sfxEnabledChange', onSfxChange)
      stopMenuBgm()
    }
  }, [])

  const click = (fn) => () => { unlockAudio(); playSound('buttonClick'); fn() }

  const closeStory = () => setShowStory(false)

  const hideForToday = () => {
    try { localStorage.setItem('storyPopupHiddenDate', getTodayStr()) } catch {}
    setShowStory(false)
  }

  const ppungchiW = Math.min(containerH * 0.78, containerW * 0.38)
  const hollyW    = ppungchiW * 0.38
  const fs        = (base, max) => `clamp(${Math.max(13, Math.round(base * 0.7))}px, ${Math.round(base)}px, ${max}px)`
  const imgBoxH   = Math.min(130, containerH * 0.16)

  return (
    <div style={{ width: containerW, height: containerH, position: 'relative', overflow: 'hidden' }}>

      <ParallaxBg scrolling={false} totalH={containerH} />

      {/* 반투명 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0.55) 100%)',
        zIndex: 1,
      }} />

      {/* ── 왼쪽: 뿡치 + 홀리 캐릭터 ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: containerW * 0.08,
        zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          alignSelf: 'flex-end',
          marginRight: ppungchiW * 0.05,
          marginBottom: -hollyW * 0.2,
          position: 'relative', zIndex: 12,
        }}>
          <HollyChar size={hollyW} hollyState="idle" flying={false} dialog="치킨 10개 먹고 마을을 구하자! 🍗" bubbleDir="right" />
        </div>
        <img
          src="/assets/boongchi_idle.png"
          alt="뿡치"
          style={{
            width: ppungchiW, height: 'auto',
            animation: 'pp-idle 2s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
            transformOrigin: 'bottom center',
          }}
          draggable={false}
        />
      </div>

      {/* ── 오른쪽: 타이틀 패널 ── */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: containerW * 0.48,
        zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
        padding: `${containerH * 0.05}px ${containerW * 0.04}px`,
      }}>
        <div style={{
          background: 'rgba(10,10,30,0.84)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,217,61,0.6)',
          borderRadius: 16,
          padding: `${containerH * 0.035}px ${containerW * 0.03}px`,
          width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          maxHeight: containerH * 0.95,
        }}>
          {/* SFX 토글 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <SfxToggle />
          </div>

          {/* 로고 + 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: Math.min(containerH * 0.08, 52) }}>🍗</span>
            <div>
              <h1 style={{
                fontSize: fs(containerH * 0.048, 44),
                fontWeight: 900, color: '#FFD93D',
                textShadow: '2px 2px 0 #7a4000, 0 0 20px rgba(255,217,61,0.5)',
                lineHeight: 1.1, fontFamily: 'inherit', wordBreak: 'keep-all',
              }}>이 세상 치킨 다 먹기</h1>
              <p style={{
                fontSize: fs(containerH * 0.022, 14),
                fontWeight: 700, color: '#ff8fab', marginTop: 3,
                wordBreak: 'keep-all',
              }}>외계인 뿡치와 홀리의 치킨정복기</p>
              <p style={{
                fontSize: fs(containerH * 0.021, 13),
                fontWeight: 700, color: '#FFE082', marginTop: 2,
              }}>치킨을 먹고 방귀로 날아라!</p>
            </div>
          </div>

          {/* 스토리 + 최고기록 버튼 행 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              onClick={click(() => setShowStory(true))}
              onMouseEnter={() => playSound('buttonHover')}
              style={{
                flex: 1,
                background: 'rgba(255,217,61,0.13)',
                border: '1px solid rgba(255,217,61,0.4)',
                borderRadius: 8, padding: '4px 10px',
                fontSize: fs(containerH * 0.026, 16),
                fontWeight: 800, color: '#FFD93D',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >📖 스토리</button>
            <button
              onClick={click(() => setShowBest(b => !b))}
              onMouseEnter={() => playSound('buttonHover')}
              style={{
                flex: 1,
                background: best.score > 0 ? 'rgba(255,217,61,0.18)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,217,61,0.35)',
                borderRadius: 8, padding: '4px 10px',
                fontSize: fs(containerH * 0.026, 16),
                fontWeight: 800, color: '#FFD93D',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >🏆 최고기록</button>
          </div>

          {/* 최고기록 패널 */}
          {showBest && (
            <div style={{
              background: 'rgba(255,217,61,0.07)',
              border: '1px solid rgba(255,217,61,0.28)',
              borderRadius: 10, padding: '8px 12px', marginBottom: 8,
            }}>
              {best.score > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                  {[
                    { icon: '⭐', label: '점수',  v: best.score.toLocaleString() },
                    { icon: '🍗', label: '치킨',  v: `${best.chickenEaten}개` },
                    { icon: '💨', label: '방귀',  v: `${best.fartCount}회` },
                    { icon: '🏋️', label: '뱃살',  v: `${Math.round(best.bellySize)}%` },
                  ].map(({ icon, label, v }) => (
                    <span key={label} style={{
                      fontSize: fs(containerH * 0.024, 14),
                      fontWeight: 700, color: '#ffe082', fontFamily: 'inherit',
                    }}>
                      {icon} {label} {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{
                  fontSize: fs(containerH * 0.024, 14),
                  fontWeight: 700, color: '#888', fontFamily: 'inherit',
                }}>아직 기록이 없어요. 도전해보세요! 🍗</p>
              )}
            </div>
          )}

          {/* 조작법 — 소형 화면 기본 접힘 */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => setShowControls(v => !v)}
              onMouseEnter={() => playSound('buttonHover')}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: showControls ? '10px 10px 0 0' : 10,
                padding: '5px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: fs(containerH * 0.026, 16),
                fontWeight: 700, color: '#FFD93D',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              <span>🎮 조작법</span>
              <span style={{ fontSize: fs(containerH * 0.022, 13), opacity: 0.7 }}>
                {showControls ? '▲ 접기' : '▼ 보기'}
              </span>
            </button>
            {showControls && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                padding: '6px 12px',
              }}>
                {[
                  ['← →', '이동'],
                  ['Space / ↑', '💨 방귀 점프'],
                  ['↓ / S', '🦆 몸 낮추기'],
                  ['🍗 치킨', '먹으면 점수 UP!'],
                  ['🫚 생강', '피해! 변기 감금'],
                  ['🥤 제로콜라', '방귀 게이지 크게 충전'],
                  ['🧃 일반콜라', '방귀 게이지 조금 감소!'],
                  ['🧊 치킨무', '변기 즉시 탈출! (3개 모으면 예비 저장)'],
                  ['↓↓ 연타 / 🧊버튼', '예비 치킨무 사용 — 변기 탈출!'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)',
                      borderRadius: 5, padding: '2px 6px',
                      fontSize: fs(containerH * 0.024, 14),
                      fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontFamily: 'inherit',
                    }}>{key}</span>
                    <span style={{
                      fontSize: fs(containerH * 0.024, 14),
                      fontWeight: 700, color: '#ddd', fontFamily: 'inherit',
                    }}>{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 프로필 표시 + 변경 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: fs(containerH * 0.023, 14), color: profileName ? '#7ee8ff' : '#888', fontWeight: 700, flex: 1 }}>
              {profileName ? `👤 ${profileName}` : '👤 게스트 (프로필 없음)'}
            </span>
            <button
              onClick={click(() => setShowProfile(true))}
              onMouseEnter={() => playSound('buttonHover')}
              style={{
                background: 'rgba(100,220,255,0.12)',
                border: '1px solid rgba(100,220,255,0.4)',
                borderRadius: 8, padding: '4px 10px',
                fontSize: fs(containerH * 0.022, 13),
                fontWeight: 800, color: '#7ee8ff',
                fontFamily: 'inherit', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >👤 프로필</button>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={click(onStart)}
            onMouseEnter={() => playSound('buttonHover')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f57c00, #E63946)',
              color: '#fff', border: 'none', borderRadius: 50,
              padding: `${Math.max(10, containerH * 0.026)}px 0`,
              fontSize: fs(containerH * 0.038, 26),
              fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,124,0,0.55)',
              animation: 'start-pulse 1.8s ease-in-out infinite',
            }}
          >🍗 게임 시작!</button>

          <p style={{
            textAlign: 'center', marginTop: 8,
            fontSize: fs(containerH * 0.025, 16),
            fontWeight: 800, color: '#FFD93D', fontFamily: 'inherit',
            textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
          }}>📍 45초 안에 치킨 10개!</p>
        </div>
      </div>

      {/* ── 프로필 모달 ── */}
      {showProfile && (
        <ProfileSelect
          containerW={containerW}
          containerH={containerH}
          onClose={() => setShowProfile(false)}
          onSelect={(id) => {
            if (onProfileChange) onProfileChange(id)
            const p = loadProfiles().find(pr => pr.id === id)
            setProfileName(p?.name || null)
            setShowProfile(false)
          }}
        />
      )}

      {/* ── 스토리 모달 ── */}
      {showStory && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={closeStory}
        >
          <div
            style={{
              background: 'rgba(8,8,24,0.98)',
              border: '2px solid rgba(255,217,61,0.55)',
              borderRadius: 20,
              padding: `${Math.max(16, containerH * 0.028)}px ${Math.max(18, containerW * 0.026)}px`,
              maxWidth: Math.min(540, containerW * 0.88),
              maxHeight: containerH * 0.90,
              overflowY: 'auto',
              boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 제목 */}
            <h2 style={{
              fontSize: fs(containerH * 0.042, 26),
              fontWeight: 900, color: '#FFD93D',
              textAlign: 'center', lineHeight: 1.2,
              textShadow: '2px 2px 0 #7a4000',
              fontFamily: 'inherit', marginBottom: 14,
            }}>🍗 뿡치와 홀리의<br />치킨마을 구출작전</h2>

            {/* 캐릭터 소개 — 같은 baseline 정렬 */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 12 }}>
              {/* 뿡치 */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  height: imgBoxH,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <img src="/assets/boongchi_idle.png" alt="뿡치"
                    style={{ maxHeight: imgBoxH, width: 'auto', maxWidth: Math.min(100, containerW * 0.13), display: 'block' }}
                    draggable={false}
                  />
                </div>
                <p style={{
                  fontSize: fs(containerH * 0.026, 17),
                  fontWeight: 900, color: '#FFD93D', fontFamily: 'inherit',
                }}>🐔 뿡치</p>
                <p style={{
                  fontSize: fs(containerH * 0.020, 13),
                  fontWeight: 700, color: '#bbb',
                  lineHeight: 1.4, wordBreak: 'keep-all', fontFamily: 'inherit',
                }}>치킨을 사랑하는 외계인.<br />먹을수록 배가 빵빵해진다.</p>
              </div>
              {/* 홀리 */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  height: imgBoxH,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <img src="/assets/holly_idle.png" alt="홀리"
                    style={{ maxHeight: imgBoxH * 0.82, width: 'auto', maxWidth: Math.min(80, containerW * 0.10), display: 'block' }}
                    draggable={false}
                  />
                </div>
                <p style={{
                  fontSize: fs(containerH * 0.026, 17),
                  fontWeight: 900, color: '#ff8fab', fontFamily: 'inherit',
                }}>🐰 홀리</p>
                <p style={{
                  fontSize: fs(containerH * 0.020, 13),
                  fontWeight: 700, color: '#bbb',
                  lineHeight: 1.4, wordBreak: 'keep-all', fontFamily: 'inherit',
                }}>뿡치의 소중한 친구.<br />겁은 많지만 끝까지 응원한다.</p>
              </div>
            </div>

            {/* 홀리 대사 */}
            <div style={{
              background: 'rgba(255,143,171,0.12)',
              border: '1px solid rgba(255,143,171,0.30)',
              borderRadius: 10, padding: '7px 14px', marginBottom: 12,
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: fs(containerH * 0.024, 15),
                fontWeight: 700, color: '#ffb3c6',
                fontFamily: 'inherit', fontStyle: 'italic',
              }}>🐰 홀리: "뿡치야, 내가 옆에서 끝까지 응원할게!"</p>
            </div>

            {/* 구분선 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', marginBottom: 10 }} />

            {/* 스토리 본문 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {[
                '치킨을 먹기 위해 지구를 찾아온 외계인 뿡치. 뿡치는 치킨을 먹을수록 배가 빵빵해지고, 방귀 추진력으로 하늘을 날 수 있다.',
                '하지만 치킨마을에는 무시무시한 생강 폭탄이 떨어지기 시작했다. 생강을 먹으면 뿡치는 화장실에 갇혀버리고 만다!',
                '겁은 많지만 의리 넘치는 친구 홀리는 뿡치 곁에서 열심히 응원한다.',
                '홀리와 함께 45초 안에 치킨 10개를 먹고 치킨마을을 구하자!',
              ].map((line, i) => (
                <p key={i} style={{
                  fontSize: fs(containerH * 0.023, 14),
                  fontWeight: 700, color: i === 3 ? '#FFD93D' : '#ccc',
                  lineHeight: 1.55, wordBreak: 'keep-all', fontFamily: 'inherit',
                }}>{line}</p>
              ))}
            </div>

            {/* 버튼 행 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={click(closeStory)}
                onMouseEnter={() => playSound('buttonHover')}
                style={{
                  flex: '1 1 auto',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 10, padding: '9px 8px',
                  fontSize: fs(containerH * 0.027, 16),
                  fontWeight: 800, color: '#bbb',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >닫기</button>
              <button
                onClick={click(hideForToday)}
                onMouseEnter={() => playSound('buttonHover')}
                style={{
                  flex: '2 1 auto',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 10, padding: '9px 8px',
                  fontSize: fs(containerH * 0.024, 14),
                  fontWeight: 800, color: '#999',
                  fontFamily: 'inherit', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >오늘 하루 보지 않기</button>
              <button
                onClick={click(onStart)}
                onMouseEnter={() => playSound('buttonHover')}
                style={{
                  flex: '2 1 auto',
                  background: 'linear-gradient(135deg, #f57c00, #E63946)',
                  border: 'none', borderRadius: 10,
                  padding: '9px 8px',
                  fontSize: fs(containerH * 0.027, 16),
                  fontWeight: 900, color: '#fff',
                  fontFamily: 'inherit', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(245,124,0,0.5)',
                  whiteSpace: 'nowrap',
                }}
              >🍗 바로 시작!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
