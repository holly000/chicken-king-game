const HS_KEY = 'sesSangChicken_best_v1'
const DEFAULTS = { score: 0, chickenEaten: 0, fartCount: 0, bellySize: 100 }

export function loadBest() {
  try {
    const raw = localStorage.getItem(HS_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveBest(result) {
  try {
    const prev = loadBest()
    const next = {
      score:        Math.max(prev.score,        result.score        || 0),
      chickenEaten: Math.max(prev.chickenEaten, result.chickenEaten || 0),
      fartCount:    Math.max(prev.fartCount,    result.fartCount    || 0),
      bellySize:    Math.max(prev.bellySize,    result.bellySize    || 100),
    }
    const isNew = {
      score:        next.score        > prev.score,
      chickenEaten: next.chickenEaten > prev.chickenEaten,
      fartCount:    next.fartCount    > prev.fartCount,
      bellySize:    next.bellySize    > prev.bellySize,
    }
    localStorage.setItem(HS_KEY, JSON.stringify(next))
    return { best: next, isNew }
  } catch {
    return { best: loadBest(), isNew: {} }
  }
}
