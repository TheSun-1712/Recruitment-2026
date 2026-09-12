import { useState, useRef, useEffect } from 'react'

export default function TeamSelector({ teams, selected, onSelect }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef(null)
    const searchRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Focus search on open
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 60)
        else setSearch('')
    }, [open])

    const filtered = teams.filter(t =>
        t.team_name.toLowerCase().includes(search.toLowerCase())
    )

    const selectedData = teams.find(t => t.team_name === selected)

    function choose(teamName) {
        onSelect(teamName)
        setOpen(false)
        setSearch('')
    }

    return (
        <div ref={ref} className="dropdown-wrap">
            <button
                id="team-dropdown-btn"
                className="dropdown-btn"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span className="material-symbols-outlined text-orange" style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                        groups
                    </span>
                    {selectedData ? (
                        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedData.team_name}
                        </span>
                    ) : (
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                            Select a team…
                        </span>
                    )}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    {selectedData && (
                        <span style={{
                            fontSize: '0.72rem', fontWeight: 700, color: 'rgba(249,115,22,0.75)',
                            letterSpacing: '0.06em'
                        }}>
                            #{selectedData.rank} of {teams.length}
                        </span>
                    )}
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'rgba(249,115,22,0.6)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
                        expand_more
                    </span>
                </span>
            </button>

            {open && (
                <div className="dropdown-list" role="listbox">
                    <div className="dropdown-search">
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search teams…"
                            aria-label="Search teams"
                        />
                    </div>
                    {filtered.length === 0 && (
                        <div style={{ padding: '1.2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                            No teams found
                        </div>
                    )}
                    {filtered.map(t => (
                        <div
                            key={t.team_name}
                            role="option"
                            aria-selected={t.team_name === selected}
                            className={`dropdown-item${t.team_name === selected ? ' active' : ''}`}
                            onClick={() => choose(t.team_name)}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'rgba(249,115,22,0.1)',
                                    border: '1px solid rgba(249,115,22,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.6rem', fontWeight: 700, color: 'rgba(249,115,22,0.7)',
                                    flexShrink: 0,
                                }}>
                                    {t.rank}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.team_name}</span>
                            </span>
                            <span className="rank-tag">{t.total_score.toFixed(1)} pts</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
