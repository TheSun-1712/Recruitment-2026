import React from 'react';

const LINKS = [
    {
        name: 'Round 1 Answers',
        url: 'https://docs.google.com/document/d/1yhlGRjF5R7no8DbgIrYIWn_egJgkFAHMKshMc_Vm8Cg/edit?tab=t.0',
        icon: 'bolt',
        accent: '#f97316',
        bg: 'rgba(249,115,22,0.1)',
        border: 'rgba(249,115,22,0.3)'
    },
    {
        name: 'Round 2 Answers',
        url: 'https://docs.google.com/document/d/1MHaMLYFFvYGsqtgcSsBSBPkSLMC4j1xgyCuUllP0dQI/edit?tab=t.0',
        icon: 'code',
        accent: '#3b82f6',
        bg: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.3)'
    },
    {
        name: 'Round 3 Answers',
        url: 'https://docs.google.com/document/d/1jxMvpzWRB8Gd2ulJVLlYcML4v9WLh3uIFP5RRBD6FmU/edit?tab=t.0',
        icon: 'account_tree',
        accent: '#22c55e',
        bg: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.3)'
    }
];

export default function SolutionLinks() {
    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '1.5rem',
            marginBottom: '1rem'
        }}>
            {LINKS.map(link => (
                <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 1.2rem',
                        background: 'rgba(20, 5, 5, 0.65)',
                        border: `1px solid ${link.border}`,
                        borderRadius: '1rem',
                        color: 'white',
                        textDecoration: 'none',
                        backdropFilter: 'blur(16px)',
                        transition: 'all 0.2s',
                        boxShadow: `0 0 10px ${link.bg}`
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 4px 20px ${link.bg}`;
                        e.currentTarget.style.borderColor = link.accent;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 0 10px ${link.bg}`;
                        e.currentTarget.style.borderColor = link.border;
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: link.accent }}>
                        {link.icon}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                        {link.name}
                    </span>
                </a>
            ))}
        </div>
    );
}
