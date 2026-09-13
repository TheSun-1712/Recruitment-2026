import { useMemo } from 'react'

/* Deterministic "random" from seed */
function seededRng(seed) {
    let s = seed
    return () => {
        s = (s * 16807 + 0) % 2147483647
        return (s - 1) / 2147483646
    }
}

const STARS = Array.from({ length: 60 }, (_, i) => {
    const rng = seededRng(i * 7919 + 137)
    return {
        id: i,
        x: rng() * 100,
        y: rng() * 45,
        s: rng() * 1.6 + 0.4,
        o: rng() * 0.45 + 0.15,
        d: rng() * 5,
    }
})

const DUST = Array.from({ length: 16 }, (_, i) => {
    const rng = seededRng(i * 3571 + 89)
    return {
        id: i,
        w: rng() * 3 + 1,
        top: rng() * 70,
        left: rng() * 100,
        dur: 6 + rng() * 9,
        delay: rng() * 6,
    }
})

export default function Background() {
    return (
        <>
            {/* Base gradient */}
            <div className="mars-bg" />

            {/* Warm horizon glow */}
            <div style={{
                position: 'fixed', zIndex: -8, inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 65% 28% at 50% 0%, rgba(249,115,22,0.09) 0%, transparent 70%)',
            }} />

            {/* Stars */}
            <div className="mars-stars">
                {STARS.map(s => (
                    <div key={s.id} style={{
                        position: 'absolute',
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: s.s * 0.9,
                        height: s.s * 0.9,
                        borderRadius: '50%',
                        background: 'white',
                        opacity: s.o * 0.5,
                        animation: `twinkle ${3.5 + s.d}s ease-in-out infinite`,
                        animationDelay: `${s.d}s`,
                    }} />
                ))}
            </div>

            {/* Dust particles */}
            <div style={{ position: 'fixed', inset: 0, zIndex: -7, pointerEvents: 'none' }}>
                {DUST.map(d => (
                    <div key={d.id} style={{
                        position: 'absolute',
                        width: d.w,
                        height: d.w,
                        top: `${d.top}%`,
                        left: `${d.left}%`,
                        borderRadius: '50%',
                        background: 'rgba(249,115,22,0.18)',
                        animation: `float-dust ${d.dur}s ease-in-out infinite`,
                        animationDelay: `${d.delay}s`,
                    }} />
                ))}
            </div>

            {/* Vignette overlay */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -6, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(10,2,2,0.35) 0%, transparent 30%, transparent 70%, rgba(10,2,2,0.55) 100%)',
            }} />

            {/* Keyframes injected inline (avoids needing separate CSS animation in component) */}
            <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.04; transform: scale(0.5); }
        }
        @keyframes float-dust {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          33%       { transform: translateY(-14px) translateX(5px); opacity: 0.5; }
          66%       { transform: translateY(-7px) translateX(-4px); opacity: 0.35; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up {
          animation: fadeSlideUp 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both;
        }
      `}</style>
        </>
    )
}
