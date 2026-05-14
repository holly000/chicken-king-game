import { useState } from 'react'
import {
  loadProfiles, createProfile, deleteProfile,
  resetProfileBest, renameProfile, setActiveId, getActiveId,
} from './utils/profiles.js'

export default function ProfileSelect({ onClose, onSelect, containerW, containerH }) {
  const [profiles, setProfiles] = useState(() => loadProfiles())
  const [activeId, setActive]   = useState(() => getActiveId())
  const [newName,  setNewName]  = useState('')
  const [editId,   setEditId]   = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmId, setConfirmId] = useState(null) // id to confirm delete

  function refresh() { setProfiles(loadProfiles()) }

  function handleSelect(id) {
    setActiveId(id); setActive(id)
  }

  function handleCreate() {
    if (profiles.length >= 4) return
    const p = createProfile(newName)
    if (p) { setActive(p.id); setNewName(''); refresh() }
  }

  function handleDeleteConfirm(id) {
    deleteProfile(id)
    const remaining = loadProfiles()
    setActive(remaining[0]?.id || null)
    setConfirmId(null)
    refresh()
  }

  function commitEdit(id) {
    renameProfile(id, editName)
    setEditId(null); refresh()
  }

  const isMobile = containerH < 500
  const px = (n) => `${Math.max(11, Math.min(Math.round(n), 16))}px`

  return (
    <div
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.86)', zIndex: 300,
               display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(8,8,24,0.98)',
          border: '2px solid rgba(255,217,61,0.55)',
          borderRadius: 18,
          padding: isMobile ? '12px 14px' : '20px 24px',
          width: Math.min(420, containerW * 0.92),
          maxHeight: containerH * 0.88,
          overflowY: 'auto',
          boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#FFD93D', fontWeight: 900, fontSize: px(18), marginBottom: 12, textAlign: 'center' }}>
          👤 플레이어 선택
        </h3>

        {/* Profile list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {profiles.map(p => (
            <div
              key={p.id}
              onClick={() => { setConfirmId(null); handleSelect(p.id) }}
              style={{
                background: activeId === p.id ? 'rgba(255,217,61,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${activeId === p.id ? 'rgba(255,217,61,0.7)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{activeId === p.id ? '✅' : '⬜'}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editId === p.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitEdit(p.id)}
                    onKeyDown={e => e.key === 'Enter' && commitEdit(p.id)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 6, color: '#fff', fontFamily: 'inherit',
                      fontSize: px(14), fontWeight: 800, padding: '2px 6px', width: '100%',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: px(14) }}>{p.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setEditId(p.id); setEditName(p.name) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 11, padding: '0 2px' }}
                      title="이름 변경"
                    >✏️</button>
                  </div>
                )}
                <div style={{ color: '#888', fontSize: px(11), marginTop: 2 }}>
                  플레이 {p.playCount || 0}회 · ⭐{p.best.score.toLocaleString()} · 🍗{p.best.chickenEaten}개
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {confirmId === p.id ? (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteConfirm(p.id) }}
                      style={{ background: 'rgba(230,57,70,0.3)', border: '1px solid rgba(230,57,70,0.6)',
                               borderRadius: 6, color: '#ff6b6b', cursor: 'pointer',
                               fontSize: px(11), padding: '3px 6px', fontFamily: 'inherit' }}
                    >확인</button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(null) }}
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                               borderRadius: 6, color: '#aaa', cursor: 'pointer',
                               fontSize: px(11), padding: '3px 6px', fontFamily: 'inherit' }}
                    >취소</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); resetProfileBest(p.id); refresh() }}
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                               borderRadius: 6, color: '#aaa', cursor: 'pointer',
                               fontSize: px(11), padding: '3px 6px', fontFamily: 'inherit' }}
                      title="기록 초기화"
                    >초기화</button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(p.id) }}
                      style={{ background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.4)',
                               borderRadius: 6, color: '#ff6b6b', cursor: 'pointer',
                               fontSize: px(11), padding: '3px 6px', fontFamily: 'inherit' }}
                      title="삭제"
                    >삭제</button>
                  </>
                )}
              </div>
            </div>
          ))}

          {profiles.length === 0 && (
            <p style={{ color: '#888', fontSize: px(13), textAlign: 'center', padding: '8px 0' }}>
              닉네임을 입력하고 프로필을 추가해주세요!
            </p>
          )}
        </div>

        {/* Create new */}
        {profiles.length < 4 ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={`플레이어 ${profiles.length + 1}`}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, color: '#fff', fontFamily: 'inherit',
                fontSize: px(13), padding: '7px 10px',
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                background: 'rgba(255,217,61,0.2)', border: '1px solid rgba(255,217,61,0.5)',
                borderRadius: 8, color: '#FFD93D', fontWeight: 900, fontSize: px(13),
                padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >+ 추가</button>
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: px(11), textAlign: 'center', marginBottom: 10 }}>
            최대 4명까지 등록 가능합니다.
          </p>
        )}

        {/* Confirm */}
        <button
          onClick={() => { if (activeId) { setActiveId(activeId); onSelect(activeId) } else onClose() }}
          disabled={!activeId}
          style={{
            width: '100%',
            background: activeId ? 'linear-gradient(135deg, #f57c00, #E63946)' : 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontWeight: 900, fontSize: px(15), padding: '11px 0',
            cursor: activeId ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >
          {activeId
            ? `✅ ${profiles.find(p => p.id === activeId)?.name || '선택됨'}(으)로 시작!`
            : '프로필을 선택하거나 추가해주세요'}
        </button>
      </div>
    </div>
  )
}
