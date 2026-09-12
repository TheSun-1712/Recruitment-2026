import React, { useState, useMemo } from 'react';

const STYLES = `
  @keyframes podium-rise {
    from { transform: scaleY(0); opacity: 0; }
    to   { transform: scaleY(1); opacity: 1; }
  }
  @keyframes crown-float {
    0%, 100% { transform: translateY(0px) rotate(-5deg); }
    50%       { transform: translateY(-6px) rotate(5deg); }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.25); }
    50%       { box-shadow: 0 0 45px rgba(255,215,0,0.55); }
  }
  @keyframes silver-pulse {
    0%, 100% { box-shadow: 0 0 16px rgba(226,232,240,0.2); }
    50%       { box-shadow: 0 0 36px rgba(226,232,240,0.45); }
  }
  @keyframes bronze-pulse {
    0%, 100% { box-shadow: 0 0 14px rgba(205,127,50,0.2); }
    50%       { box-shadow: 0 0 30px rgba(205,127,50,0.45); }
  }
`;

const MEDAL = {
    gold: {
        border: "#FFD700",
        glow: "glow-pulse 2.8s ease-in-out infinite",
        bg: "linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(255,160,0,0.06) 100%)",
        label: "linear-gradient(to right, #FFD700, #FFA500)",
        emoji: "🥇",
        rank: "1ST",
        height: 180,
    },
    silver: {
        border: "#CBD5E1",
        glow: "silver-pulse 2.8s ease-in-out infinite",
        bg: "linear-gradient(135deg, rgba(203,213,225,0.14) 0%, rgba(148,163,184,0.06) 100%)",
        label: "linear-gradient(to right, #CBD5E1, #94A3B8)",
        emoji: "🥈",
        rank: "2ND",
        height: 140,
    },
    bronze: {
        border: "#CD7F32",
        glow: "bronze-pulse 2.8s ease-in-out infinite",
        bg: "linear-gradient(135deg, rgba(205,127,50,0.14) 0%, rgba(161,100,36,0.06) 100%)",
        label: "linear-gradient(to right, #CD7F32, #A0622A)",
        emoji: "🥉",
        rank: "3RD",
        height: 110,
    },
};

const SORT_OPTIONS = [
    { id: 'total_score', label: 'Total Points', icon: 'military_tech' },
    { id: 'rapidfire_score', label: 'Rapid Fire', icon: 'bolt' },
    { id: 'cascade_score', label: 'Coding Cascade', icon: 'code' },
    { id: 'dsa_score', label: 'DSA Arena', icon: 'account_tree' }
];

function PodiumCard({ team, score, type, index }) {
    const m = MEDAL[type];
    const isGold = type === "gold";

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: `slide-in 0.6s ease both`,
            animationDelay: `${index * 0.12}s`
        }}>
            {isGold && (
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', animation: "crown-float 3s ease-in-out infinite" }}>
                    👑
                </div>
            )}

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', fontWeight: 900, color: 'white', marginBottom: '0.75rem',
                width: isGold ? 80 : 64,
                height: isGold ? 80 : 64,
                fontSize: isGold ? 32 : 24,
                background: m.bg,
                border: `2px solid ${m.border}`,
                animation: m.glow,
                boxShadow: `0 0 20px ${m.border}44`,
            }}>
                {m.emoji}
            </div>

            <p style={{ fontWeight: 900, textAlign: 'center', marginBottom: '0.25rem', fontSize: isGold ? '1.1rem' : '0.9rem', maxWidth: 120, lineHeight: 1.2 }}>
                {team}
            </p>

            <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {Number.isInteger(score) ? score : score.toFixed(3)} pts
            </p>

            <div style={{
                width: 120, borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '0.75rem',
                position: 'relative', overflow: 'hidden',
                height: m.height,
                background: m.bg,
                border: `1px solid ${m.border}44`,
                borderBottom: "none",
                transformOrigin: "bottom",
                animation: "podium-rise 0.7s cubic-bezier(0.34,1.56,0.64,1) both",
                animationDelay: `${index * 0.12 + 0.1}s`,
            }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: `linear-gradient(to right, transparent, ${m.border}88, transparent)` }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.1em', padding: '0.25rem 0.75rem', borderRadius: 9999, color: 'black', background: m.label }}>
                    {m.rank}
                </span>
            </div>
        </div>
    );
}

export default function LeaderboardView({ data }) {
    const [sortBy, setSortBy] = useState('total_score');

    // Sort teams dynamically
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => b[sortBy] - a[sortBy]);
    }, [data, sortBy]);

    const top3 = sortedData.slice(0, 3);
    const rest = sortedData.slice(3);

    const podiumOrder = top3.length >= 3
        ? [
            { ...top3[1], type: "silver", podiumIndex: 0 },
            { ...top3[0], type: "gold", podiumIndex: 1 },
            { ...top3[2], type: "bronze", podiumIndex: 2 },
        ]
        : top3.map((t, i) => ({ ...t, type: i === 0 ? "gold" : i === 1 ? "silver" : "bronze", podiumIndex: i }));

    return (
        <div className="anim-fade-up">
            <style>{STYLES}</style>

            {/* Sorting Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '3rem' }}>
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', borderRadius: '2rem',
                            background: sortBy === opt.id ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${sortBy === opt.id ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            color: sortBy === opt.id ? '#f97316' : 'rgba(255,255,255,0.6)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontWeight: 600, fontSize: '0.85rem'
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Podium */}
            {top3.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
                    {podiumOrder.map((t) => (
                        <PodiumCard
                            key={t.team_name}
                            team={t.team_name}
                            score={t[sortBy]}
                            type={t.type}
                            index={t.podiumIndex}
                        />
                    ))}
                </div>
            )}

            {/* Table */}
            {rest.length > 0 && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <th style={{ padding: '1rem 1.5rem', width: 60, textAlign: 'center' }}>Rank</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Team</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rest.map((t, i) => {
                                const rank = i + 4;
                                const score = t[sortBy];
                                return (
                                    <tr key={t.team_name} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        animation: 'slide-in 0.5s ease both',
                                        animationDelay: `${0.4 + i * 0.05}s`
                                    }}>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                                fontSize: '0.8rem', fontWeight: 900, color: 'rgba(255,255,255,0.6)'
                                            }}>
                                                {rank}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                                            {t.team_name}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 900, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
                                            {Number.isInteger(score) ? score : score.toFixed(3)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
