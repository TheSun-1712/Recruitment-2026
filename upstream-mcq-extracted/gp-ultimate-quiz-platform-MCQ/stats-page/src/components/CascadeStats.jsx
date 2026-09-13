const STREAK_MULTIPLIER = 20

function statusBadge(status) {
    if (status === 'ACCEPTED') return { label: '✓ Correct', cls: 'badge-green' }
    if (status === 'WRONG') return { label: '✗ Wrong', cls: 'badge-red' }
    if (status === 'PARTIAL') return { label: '~ Partial', cls: 'badge-yellow' }
    return { label: status || '—', cls: 'badge-yellow' }
}

function StreakDots({ count, maxPossible = 15 }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {Array.from({ length: Math.min(maxPossible, 15) }, (_, i) => (
                <div key={i} style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: i < count
                        ? 'linear-gradient(135deg, #f97316, #dc2626)'
                        : 'rgba(255,255,255,0.07)',
                    boxShadow: i < count ? '0 0 6px rgba(249,115,22,0.5)' : 'none',
                    transition: 'background 0.2s',
                }} />
            ))}
            {maxPossible > 15 && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>+{maxPossible - 15}</span>}
        </div>
    )
}

export default function CascadeStats({ team }) {
    const { cascade } = team
    const questions = cascade.questions || []
    const session = cascade.session

    const accepted = questions.filter(q => q.status === 'ACCEPTED').length
    const maxStreak = session?.max_streak || 0
    const streakBonus = session?.streak_bonus_applied ? maxStreak * STREAK_MULTIPLIER : 0
    const baseScore = team.cascade_score - streakBonus

    return (
        <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
            <div className="section-header">
                <span className="material-symbols-outlined mat-icon" style={{ color: '#3b82f6' }}>code</span>
                <span className="section-title">Coding Cascade</span>
                <span style={{ marginLeft: 'auto' }}>
                    <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: '0.7rem' }}>
                        {accepted}/{questions.length} Solved
                    </span>
                </span>
            </div>

            {/* Summary row */}
            <div className="grid-3" style={{ marginBottom: '1.2rem' }}>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Total Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{team.cascade_score}</div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Max Streak</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>{maxStreak}</div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>in a row</span>
                    </div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Streak Bonus</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: session?.streak_bonus_applied ? '#22c55e' : 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                            +{streakBonus}
                        </div>
                        {session?.streak_bonus_applied && (
                            <span className="badge badge-green" style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}>Applied</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Streak visualizer */}
            {session && maxStreak > 0 && (
                <div className="card-sm" style={{ padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                        Streak Progression
                    </div>
                    <StreakDots count={maxStreak} maxPossible={Math.max(maxStreak, accepted)} />
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem' }}>
                        Max streak of {maxStreak} × {STREAK_MULTIPLIER} = {streakBonus} bonus pts
                    </div>
                </div>
            )}

            {/* No session */}
            {!session && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                    Did not participate in this round
                </div>
            )}

            {/* Question list */}
            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[...questions].sort((a, b) => a.sequence_order - b.sequence_order).map((q, i) => {
                        const { label, cls } = statusBadge(q.status)
                        return (
                            <div key={i} className="q-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                        background: q.status === 'ACCEPTED' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${q.status === 'ACCEPTED' ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                                    }}>
                                        {q.sequence_order}
                                    </span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {q.title}
                                    </span>
                                    {q.is_streak_eligible && (
                                        <span title="Streak eligible" style={{ fontSize: '0.65rem', color: '#f97316', flexShrink: 0 }}>🔥</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: q.score_awarded > 0 ? '#3b82f6' : 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                                        {q.score_awarded > 0 ? `+${q.score_awarded}` : '—'}
                                    </span>
                                    <span className={`badge ${cls}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.55rem' }}>{label}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
