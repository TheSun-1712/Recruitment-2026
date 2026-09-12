import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Exam Config', path: '/admin/exam', icon: 'tune' },
    { name: 'Shifts', path: '/admin/shifts', icon: 'schedule' },
    { name: 'Questions', path: '/admin/questions', icon: 'quiz' },
    { name: 'Weightage', path: '/admin/weightage', icon: 'grid_view' },
    { name: 'Generator', path: '/admin/generate', icon: 'auto_awesome' },
    { name: 'Tokens', path: '/admin/tokens', icon: 'badge' },
    { name: 'Results', path: '/admin/results', icon: 'analytics' },
];

export default function AdminLayout({ children, title, subtitle, actions }) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
        }
    }, [navigate]);

    function handleLogout() {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    }

    return (
        <div className="min-h-screen bg-[#0d0707] text-[#fbe9e7] flex flex-col font-sans selection:bg-orange-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-[#140b0b]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <Link to="/admin/dashboard" className="flex items-center space-x-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-orange-600/20 group-hover:scale-105 transition">
                            G
                        </div>
                        <div>
                            <span className="font-black tracking-wider uppercase text-sm text-white">G-Prime</span>
                            <span className="text-[10px] text-orange-400 font-bold tracking-widest block uppercase -mt-0.5">MCQ Exam Engine</span>
                        </div>
                    </Link>

                    <nav className="hidden xl:flex items-center space-x-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-1.5 ${
                                        isActive
                                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span>LAN Local Mode</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition flex items-center space-x-1"
                        title="Sign out of admin"
                    >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* Mobile / Secondary Navigation Bar */}
            <div className="xl:hidden bg-[#120808] border-b border-white/5 px-4 py-2 overflow-x-auto flex space-x-2 no-scrollbar">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-1 ${
                                isActive
                                    ? 'bg-orange-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Page Header (Optional title / actions banner) */}
            {(title || actions) && (
                <div className="border-b border-white/5 bg-[#120808]/50 px-4 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        {title && <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h1>}
                        {subtitle && <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex items-center space-x-3">{actions}</div>}
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
