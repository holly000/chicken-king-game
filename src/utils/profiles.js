const PROFILES_KEY = 'sesangChicken_profiles_v1'
const ACTIVE_KEY   = 'sesangChicken_activeProfile_v1'
const DEFAULT_BEST = { score: 0, chickenEaten: 0, fartCount: 0, bellySize: 100 }

export function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || [] }
  catch { return [] }
}
export function saveProfiles(p) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)) } catch {}
}
export function getActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY) || null } catch { return null }
}
export function setActiveId(id) {
  try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY) } catch {}
}
export function getActiveProfile() {
  const id = getActiveId()
  return id ? loadProfiles().find(p => p.id === id) || null : null
}
export function createProfile(name) {
  const profiles = loadProfiles()
  if (profiles.length >= 4) return null
  const id = `u${Date.now()}`
  const profile = {
    id,
    name: (name || '').trim() || `플레이어 ${profiles.length + 1}`,
    best: { ...DEFAULT_BEST },
    playCount: 0,
  }
  profiles.push(profile)
  saveProfiles(profiles)
  setActiveId(id)
  return profile
}
export function updateProfileBest(profileId, result) {
  const profiles = loadProfiles()
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx < 0) return {}
  const prev = profiles[idx].best
  const isNew = {
    score:        (result.score        || 0) > prev.score,
    chickenEaten: (result.chickenEaten || 0) > prev.chickenEaten,
    fartCount:    (result.fartCount    || 0) > prev.fartCount,
    bellySize:    (result.bellySize    || 100) > prev.bellySize,
  }
  profiles[idx] = {
    ...profiles[idx],
    playCount: (profiles[idx].playCount || 0) + 1,
    best: {
      score:        Math.max(prev.score,        result.score        || 0),
      chickenEaten: Math.max(prev.chickenEaten, result.chickenEaten || 0),
      fartCount:    Math.max(prev.fartCount,    result.fartCount    || 0),
      bellySize:    Math.max(prev.bellySize,    result.bellySize    || 100),
    },
  }
  saveProfiles(profiles)
  return isNew
}
export function deleteProfile(profileId) {
  let profiles = loadProfiles().filter(p => p.id !== profileId)
  saveProfiles(profiles)
  if (getActiveId() === profileId) setActiveId(profiles[0]?.id || null)
}
export function resetProfileBest(profileId) {
  const profiles = loadProfiles()
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx < 0) return
  profiles[idx] = { ...profiles[idx], best: { ...DEFAULT_BEST }, playCount: 0 }
  saveProfiles(profiles)
}
export function renameProfile(profileId, name) {
  const profiles = loadProfiles()
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx < 0) return
  const trimmed = (name || '').trim()
  if (!trimmed) return
  profiles[idx] = { ...profiles[idx], name: trimmed }
  saveProfiles(profiles)
}
