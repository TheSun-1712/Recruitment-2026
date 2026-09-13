import { useState, useMemo } from 'react'
import statsData from './data/stats.json'
import Background from './components/Background'
import TeamSelector from './components/TeamSelector'
import OverallStats from './components/OverallStats'
import RapidfireStats from './components/RapidfireStats'
import CascadeStats from './components/CascadeStats'
import DSAStats from './components/DSAStats'
import SolutionLinks from './components/SolutionLinks'
import LeaderboardView from './components/LeaderboardView'

export default function App() {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [activeTab, setActiveTab] = useState('analytics')

  const teamData = useMemo(
    () => selectedTeam ? statsData.find(t => t.team_name === selectedTeam) : null,
    [selectedTeam]
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Background />

      {/* ── Header ── */}
      <header style={{ position: 'relative', zIndex: 10, padding: '2rem 1.5rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-orange">
            <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>satellite_alt</span>
            G-Prime 2026
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '0.4rem'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #f97316, #dc2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Team
          </span>{' '}
          Statistics
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', letterSpacing: '0.06em' }}>
          Select a team to view detailed performance across all three rounds
        </p>

        <SolutionLinks />
      </header>

      {/* ── Main ── */}
      <main style={{
        position: 'relative', zIndex: 10,
        maxWidth: activeTab === 'leaderboard' ? 1000 : 900,
        margin: '0 auto',
        padding: '0 1.25rem 4rem',
      }}>

        {/* ── View Toggle Tabs ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '2rem',
              background: activeTab === 'analytics' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeTab === 'analytics' ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeTab === 'analytics' ? '#f97316' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700, fontSize: '0.9rem'
            }}
          >
            Team Analytics
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '2rem',
              background: activeTab === 'leaderboard' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeTab === 'leaderboard' ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeTab === 'leaderboard' ? '#f97316' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700, fontSize: '0.9rem'
            }}
          >
            Global Leaderboard
          </button>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'leaderboard' ? (
          <LeaderboardView data={statsData} />
        ) : (
          <>
            {/* Selector */}
            <div style={{ marginBottom: '2.5rem' }}>
              <TeamSelector
                teams={statsData}
                selected={selectedTeam}
                onSelect={setSelectedTeam}
              />
            </div>

            {/* Stats panels */}
            {teamData && (
              <div key={teamData.team_name} className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <OverallStats team={teamData} totalTeams={statsData.length} />
                <RapidfireStats team={teamData} />
                <CascadeStats team={teamData} />
                <DSAStats team={teamData} />
              </div>
            )}

            {/* Empty state */}
            {!teamData && (
              <div style={{
                textAlign: 'center', padding: '4rem 1rem',
                color: 'rgba(255,255,255,0.18)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem', color: 'rgba(249,115,22,0.2)' }}>
                  travel_explore
                </span>
                <p style={{ fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Choose a team to begin
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center',
        padding: '1.5rem',
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.15)',
        borderTop: '1px solid rgba(249,115,22,0.06)',
      }}>
        © 2026 AAC — Opulence · G-Prime Quiz Platform
      </footer>
    </div>
  )
}
