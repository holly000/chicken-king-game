import { useEffect, useRef, useState } from 'react'

export default function ParallaxBg({ scrolling = true, totalH = 400, groundH = 80 }) {
  const [imgW, setImgW] = useState(Math.round(totalH * 1.78))
  const imgWRef = useRef(imgW)

  const div1Ref = useRef(null)
  const div2Ref = useRef(null)
  const div3Ref = useRef(null)
  const xRef    = useRef(0)
  const rafRef  = useRef(null)
  const lastRef = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const w = Math.round(img.naturalWidth * totalH / img.naturalHeight)
      setImgW(w)
      imgWRef.current = w
    }
    img.src = '/assets/background-stage1.png'
  }, [totalH])

  useEffect(() => { imgWRef.current = imgW }, [imgW])

  useEffect(() => {
    if (!scrolling) {
      const iw = imgWRef.current
      if (div1Ref.current) div1Ref.current.style.transform = 'translateX(0px)'
      if (div2Ref.current) div2Ref.current.style.transform = `translateX(${iw}px)`
      if (div3Ref.current) div3Ref.current.style.transform = `translateX(${iw * 2}px)`
      return
    }

    const speed = 55 // px/s (was 90)

    const loop = (ts) => {
      if (lastRef.current !== null) {
        const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
        xRef.current -= speed * dt

        const iw = imgWRef.current
        if (xRef.current < -iw) xRef.current += iw

        if (div1Ref.current) div1Ref.current.style.transform = `translateX(${xRef.current}px)`
        if (div2Ref.current) div2Ref.current.style.transform = `translateX(${xRef.current + iw}px)`
        if (div3Ref.current) div3Ref.current.style.transform = `translateX(${xRef.current + iw * 2}px)`
      }
      lastRef.current = ts
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [scrolling, imgW])

  const divStyle = {
    position: 'absolute',
    top: 0, left: 0,
    width: imgW, height: totalH,
    backgroundImage: 'url(/assets/background-stage1.png)',
    backgroundSize: `${imgW}px ${totalH}px`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left bottom',
    willChange: 'transform',
  }

  const clouds = [
    { w: 140, h: 44, top: '5%',  dur: '20s', delay: '0s',   op: 0.80 },
    { w: 90,  h: 30, top: '13%', dur: '29s', delay: '-7s',  op: 0.65 },
    { w: 170, h: 52, top: '3%',  dur: '24s', delay: '-13s', op: 0.72 },
    { w: 70,  h: 24, top: '19%', dur: '34s', delay: '-4s',  op: 0.58 },
    { w: 110, h: 36, top: '8%',  dur: '27s', delay: '-18s', op: 0.70 },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <div ref={div1Ref} style={divStyle} />
      <div ref={div2Ref} style={{ ...divStyle, transform: `translateX(${imgW}px)` }} />
      <div ref={div3Ref} style={{ ...divStyle, transform: `translateX(${imgW * 2}px)` }} />

      {/* 이음새 소프트닝: 8%로 넓힘 (was 4%) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.10) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.10) 100%)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {scrolling && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }}>
          {clouds.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: c.top,
              width: c.w, height: c.h,
              background: 'rgba(255,255,255,0.88)',
              borderRadius: '50px', opacity: c.op,
              filter: 'blur(0.8px)',
              boxShadow: '0 4px 16px rgba(180,220,255,0.35)',
              animation: `cloud-parallax ${c.dur} linear ${c.delay} infinite`,
            }} />
          ))}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: groundH, left: 0, right: 0,
        height: 5,
        background: 'linear-gradient(90deg, #2e7d32, #388e3c 12%, #4caf50 50%, #388e3c 88%, #2e7d32)',
        opacity: 0.85, zIndex: 5, pointerEvents: 'none',
      }} />
    </div>
  )
}
