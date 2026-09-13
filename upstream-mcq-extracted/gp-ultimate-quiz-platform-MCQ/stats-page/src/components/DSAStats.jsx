const DSA_TC_COUNTS = { 0: 3, 1: 3, 2: 2, 3: 2, 4: 3 }

function TCDots({ passed, total }) {
    return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: i < passed ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    boxShadow: i < passed ? '0 0 5px rgba(34,197,94,0.5)' : 'none',
                }} />
            ))}
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>
                {passed}/{total}
            </span>
        </div>
    )
}

function statusBadge(status) {
    if (status === 'ACCEPTED') return { label: '✓ Accepted', cls: 'badge-green' }
    if (status === 'PARTIAL') return { label: '~ Partial', cls: 'badge-yellow' }
    if (!status || status === 'null') return { label: '—', cls: '' }
    return { label: status, cls: 'badge-yellow' }
}

export default function DSAStats({ team }) {
    const { dsa } = team
    const questions = dsa.questions || []
    const session = dsa.session

    const solved = questions.filter(q => q.status === 'ACCEPTED').length
    const partial = questions.filter(q => q.status === 'PARTIAL').length

    const durationHr = session
        ? (parseFloat(session.duration_secs || 0) / 3600).toFixed(1)
        : null

    return (
        <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
            <div className="section-header">
                <span className="material-symbols-outlined mat-icon" style={{ color: '#22c55e' }}>account_tree</span>
                <span className="section-title">DSA Arena</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {solved > 0 && (
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{solved} Solved</span>
                    )}
                    {partial > 0 && (
                        <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>{partial} Partial</span>
                    )}
                </span>
            </div>

            {/* Summary */}
            <div className="grid-3" style={{ marginBottom: '1.2rem' }}>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>DSA Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{team.dsa_score}</div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Questions</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {solved + partial}
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/{questions.length}</span>
                    </div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Duration</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {durationHr !== null ? durationHr : '—'}
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> hr</span>
                    </div>
                </div>
            </div>

            {/* No session */}
            {!session && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                    Did not participate in this round
                </div>
            )}

            {/* Question cards  */}
            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[...questions].sort((a, b) => a.sequence_order - b.sequence_order).map((q, i) => {
                        const { label, cls } = statusBadge(q.status)
                        const tcTotal = DSA_TC_COUNTS[q.sequence_order] ?? q.base_points > 100 ? 3 : 2
                        const pct = q.base_points > 0 ? Math.round((q.score_awarded / q.base_points) * 100) : 0

                        return (
                            <div key={i} style={{
                                padding: '0.9rem 1.1rem',
                                borderRadius: '0.85rem',
                                border: `1px solid ${q.status === 'ACCEPTED' ? 'rgba(34,197,94,0.2)' : q.status === 'PARTIAL' ? 'rgba(234,179,8,0.18)' : 'rgba(255,255,255,0.06)'}`,
                                background: q.status === 'ACCEPTED' ? 'rgba(34,197,94,0.04)' : 'rgba(0,0,0,0.2)',
                                transition: 'border-color 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                                background: 'rgba(34,197,94,0.08)',
                                                border: '1px solid rgba(34,197,94,0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.6rem', fontWeight: 700, color: 'rgba(34,197,94,0.6)',
                                            }}>
                                                Q{q.sequence_order + 1}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{q.title}</span>
                                        </div>
                                        <TCDots passed={q.passed_count || 0} total={tcTotal} />
                                    </div>

                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: q.score_awarded > 0 ? '#22c55e' : 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                                            {q.score_awarded > 0 ? `+${q.score_awarded}` : '—'}
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/{q.base_points}</span>
                                        </div>
                                        {cls && <span className={`badge ${cls}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.55rem' }}>{label}</span>}
                                    </div>
                                </div>

                                {/* Score bar */}
                                {q.base_points > 0 && (
                                    <div className="progress-bar" style={{ marginTop: '0.65rem', height: 3 }}>
                                        <div style={{
                                            height: '100%', borderRadius: 9999,
                                            width: `${pct}%`,
                                            background: q.status === 'ACCEPTED'
                                                ? 'linear-gradient(to right, #22c55e, #16a34a)'
                                                : 'linear-gradient(to right, #eab308, #ca8a04)',
                                            boxShadow: `0 0 6px ${q.status === 'ACCEPTED' ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.4)'}`,
                                            transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
