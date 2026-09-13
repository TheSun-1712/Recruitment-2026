const MAX_RF_SCORE = 15 // approx max per question for bar scaling

function statusBadge(status) {
    if (status === 'ACCEPTED') return { label: '✓ Accepted', cls: 'badge-green' }
    if (status === 'TIMEOUT') return { label: '⏱ Timeout', cls: 'badge-red' }
    if (status === 'WRONG') return { label: '✗ Wrong', cls: 'badge-red' }
    return { label: status || '—', cls: 'badge-yellow' }
}

export default function RapidfireStats({ team }) {
    const { rapidfire } = team
    const questions = rapidfire.questions || []

    const accepted = questions.filter(q => q.status === 'ACCEPTED').length
    const totalScore = rapidfire.questions.reduce((s, q) => s + (q.score_awarded || 0), 0)

    const session = rapidfire.session
    const durationMin = session
        ? Math.round(parseFloat(session.duration_secs || 0) / 60)
        : null

    return (
        <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
            {/* Header */}
            <div className="section-header">
                <span className="material-symbols-outlined mat-icon">bolt</span>
                <span className="section-title">Rapid Fire Round</span>
                <span style={{ marginLeft: 'auto' }}>
                    <span className="badge badge-orange" style={{ fontSize: '0.7rem' }}>
                        {accepted}/{questions.length} Solved
                    </span>
                </span>
            </div>

            {/* Summary row */}
            <div className="grid-3" style={{ marginBottom: '1.2rem' }}>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>{totalScore.toFixed(3)}</div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Accuracy</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {questions.length > 0 ? Math.round((accepted / questions.length) * 100) : 0}
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>%</span>
                    </div>
                </div>
                <div className="card-sm" style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Duration</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {durationMin !== null ? durationMin : '—'}
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> min</span>
                    </div>
                </div>
            </div>

            {/* No session */}
            {!session && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                    Did not participate in this round
                </div>
            )}

            {/* Question list */}
            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...questions].sort((a, b) => a.sequence_order - b.sequence_order).map((q, i) => {
                        const { label, cls } = statusBadge(q.status)
                        const pct = Math.min((q.score_awarded / MAX_RF_SCORE) * 100, 100)
                        return (
                            <div key={i} className="q-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                        background: q.status === 'ACCEPTED' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${q.status === 'ACCEPTED' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                                    }}>
                                        {q.sequence_order + 1}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {q.title}
                                        </div>
                                        <div style={{ width: 80, marginTop: 4 }}>
                                            <div className="progress-bar" style={{ height: 3 }}>
                                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: q.score_awarded > 0 ? '#f97316' : 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                                        {q.score_awarded > 0 ? `+${q.score_awarded.toFixed(3)}` : '—'}
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
