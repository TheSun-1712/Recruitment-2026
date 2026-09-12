const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function StatCard({ icon, label, value, sub, accent = '#f97316' }) {
    return (
        <div className="card-sm" style={{ padding: '1.1rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: accent }}>{icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            </div>
            <div className="stat-number mono" style={{ color: accent === '#f97316' ? '#f97316' : accent }}>{value}</div>
            {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>{sub}</div>}
        </div>
    )
}

export default function OverallStats({ team, totalTeams }) {
    const isDQ = team.disqualifications.length > 0
    const topPct = Math.round((1 - team.rank / totalTeams) * 100)

    return (
        <div className="card" style={{ padding: '1.75rem 1.75rem 1.5rem' }}>
            {/* Team header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>{MEDAL[team.rank] || '🏅'}</span>
                        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
                            {team.team_name}
                        </h2>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
                        @{team.username}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 900,
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                        background: 'linear-gradient(135deg, #f97316, #dc2626)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {team.total_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Total Points
                    </div>
                </div>
            </div>

            {/* Rank pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span className="badge badge-orange">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>military_tech</span>
                    Rank #{team.rank} of {totalTeams}
                </span>
                {topPct >= 10 && (
                    <span className="badge badge-green">
                        Top {topPct}% of teams
                    </span>
                )}
                {isDQ && (
                    <span className="badge badge-red">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>gavel</span>
                        Disqualified in {team.disqualifications.map(d => d.round).join(', ')}
                    </span>
                )}
            </div>

            {/* Per-round scores */}
            <div className="grid-3" style={{ marginBottom: '1.2rem' }}>
                <StatCard icon="bolt" label="Rapid Fire" value={team.rapidfire_score.toFixed(3)} accent="#f97316" />
                <StatCard icon="code" label="Cascade" value={team.cascade_score} accent="#3b82f6" />
                <StatCard icon="account_tree" label="DSA Arena" value={team.dsa_score} accent="#22c55e" />
            </div>

            {/* Score breakdown bar */}
            <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                    <span>Score Breakdown</span>
                    <span>{team.total_score.toFixed(1)} pts total</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                    {team.total_score > 0 && <>
                        <div style={{ width: `${(team.rapidfire_score / team.total_score) * 100}%`, background: '#f97316', opacity: 0.9 }} title="Rapidfire" />
                        <div style={{ width: `${(team.cascade_score / team.total_score) * 100}%`, background: '#3b82f6', opacity: 0.9 }} title="Cascade" />
                        <div style={{ width: `${(team.dsa_score / team.total_score) * 100}%`, background: '#22c55e', opacity: 0.9 }} title="DSA" />
                    </>}
                </div>
                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                    <span><span style={{ color: '#f97316', marginRight: '0.3rem' }}>■</span>Rapidfire</span>
                    <span><span style={{ color: '#3b82f6', marginRight: '0.3rem' }}>■</span>Cascade</span>
                    <span><span style={{ color: '#22c55e', marginRight: '0.3rem' }}>■</span>DSA</span>
                </div>
            </div>
        </div>
    )
}
