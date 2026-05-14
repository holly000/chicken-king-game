import { useState, useEffect } from 'react'
import StartScreen from './StartScreen.jsx'
import GameScreen from './GameScreen.jsx'
import GameOverScreen from './GameOverScreen.jsx'

function useGameSize() {
  function calc() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const byWidth  = { w: vw,          h: vw * 9 / 16 }
    const byHeight = { w: vh * 16 / 9, h: vh }
    if (byWidth.h <= vh) return byWidth
    return byHeight
  }
  const [size, setSize] = useState(calc)
  useEffect(() => {
    const onResize = () => setSize(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default function App() {
  const [screen,  setScreen]  = useState('start')
  const [result,  setResult]  = useState(null)
  const [gameKey, setGameKey] = useState(0)   // 변경 시 GameScreen 강제 재마운트
  const { w, h } = useGameSize()

  function handleStart()         { setGameKey(k => k + 1); setScreen('game') }
  function handleGameOver(stats) { setResult({ ...stats, cleared: false }); setScreen('gameover') }
  function handleClear(stats)    { setResult({ ...stats, cleared: true  }); setScreen('gameover') }
  function handleRestart()       { setGameKey(k => k + 1); setScreen('game') }
  function handleMenu()          { setScreen('start') }

  return (
    <div className="app-wrapper">
      <div className="game-container" style={{ width: w, height: h }}>
        {screen === 'start' && (
          <StartScreen onStart={handleStart} containerW={w} containerH={h} />
        )}
        {screen === 'game' && (
          <GameScreen
            key={gameKey}
            onGameOver={handleGameOver}
            onClear={handleClear}
            onRestart={handleRestart}
            onMenu={handleMenu}
            containerW={w}
            containerH={h}
          />
        )}
        {screen === 'gameover' && (
          <GameOverScreen result={result} onRestart={handleRestart} onMenu={handleMenu} containerW={w} containerH={h} />
        )}
      </div>
    </div>
  )
}
