import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import FooterLogos from '../components/FooterLogos';

// ── Animation Variants ──
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: (i = 0) => ({
        opacity: 1,
        scale: 1,
        transition: { delay: i * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    }),
};

// ── Animated Counter Component ──
function AnimatedCounter({ target, duration = 1.2, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    useEffect(() => {
        if (!isInView) return;
        let start = 0;
        const increment = target / (duration * 60);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 1000 / 60);
        return () => clearInterval(timer);
    }, [isInView, target, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}

// ── Floating Background Glow Elements ──
function FloatingShapes() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Dark Cyan / Charcoal Teal Orb */}
            <div
                className="absolute w-[32rem] h-[32rem] rounded-full opacity-20 blur-3xl"
                style={{ background: '#264653', top: '-10%', left: '15%' }}
            />
            {/* Persian Green / Teal Orb */}
            <div
                className="absolute w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
                style={{ background: '#2A9D8F', bottom: '10%', left: '-5%' }}
            />
            {/* Burnt Sienna / Coral Orb */}
            <div
                className="absolute w-[30rem] h-[30rem] rounded-full opacity-20 blur-3xl"
                style={{ background: '#E76F51', top: '35%', right: '-8%' }}
            />
            {/* Saffron / Gold Orb */}
            <div
                className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl"
                style={{ background: '#E9C46A', bottom: '30%', right: '25%' }}
            />
        </div>
    );
}

// ── Subject Card Data (Direct 1:1 Palette Mapping) ──
const subjects = [
    { name: 'Mathematics', questions: 15, color: '#E76F51', bgColor: 'rgba(231, 111, 81, 0.12)', borderColor: 'rgba(231, 111, 81, 0.35)', icon: '∑' },
    { name: 'Aptitude', questions: 7, color: '#2A9D8F', bgColor: 'rgba(42, 157, 143, 0.12)', borderColor: 'rgba(42, 157, 143, 0.35)', icon: '◈' },
    { name: 'English', questions: 5, color: '#E9C46A', bgColor: 'rgba(233, 196, 106, 0.12)', borderColor: 'rgba(233, 196, 106, 0.35)', icon: 'Aa' },
    { name: 'C Basics', questions: 3, color: '#F4A261', bgColor: 'rgba(244, 162, 97, 0.12)', borderColor: 'rgba(244, 162, 97, 0.35)', icon: '</>' },
];

// ── Exam Details Data ──
const examDetails = [
    { num: '01', title: 'Format', desc: 'Multiple-choice questions with one correct answer.' },
    { num: '02', title: 'Duration', desc: 'You have 60 minutes to complete the exam.' },
    { num: '03', title: 'Navigation', desc: 'Move freely between all questions and change your answers at any time.' },
    { num: '04', title: 'Marking', desc: '1 mark for each correct answer. No negative marking.' },
    { num: '05', title: 'Submission', desc: 'Submit when you are finished.The exam will be submitted automatically when time runs out.' },
];

export default function CandidateLanding() {
    const navigate = useNavigate();

    // Refs for scroll-triggered animations
    const structureRef = useRef(null);
    const detailsRef = useRef(null);
    const structureInView = useInView(structureRef, { once: true, margin: '-80px' });
    const detailsInView = useInView(detailsRef, { once: true, margin: '-80px' });

    return (
        <div className="min-h-screen bg-[#122027] text-white flex flex-col font-sans selection:bg-[#E76F51] selection:text-white relative overflow-x-hidden bg-tech-grid">
            <FloatingShapes />

            {/* ═══ Sticky Header ═══ */}
            <header className="w-full border-b border-[rgba(42,157,143,0.25)] bg-[#162932]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-3.5 shadow-lg">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="font-mono text-[11px] font-bold tracking-widest px-3 py-1.5 bg-gradient-to-r from-[#E76F51] to-[#F4A261] text-white rounded-md flex items-center gap-2 shadow-[0_0_12px_rgba(231,111,81,0.3)]">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>AAC</span>
                        </span>
                        <span className="hidden sm:inline-block text-[11px] font-mono tracking-wider text-[#9CB6BF] uppercase font-semibold">
                            Entrance Test Portal
                        </span>
                    </div>
                    <div className="text-[11px] font-mono tracking-widest text-[#9CB6BF] uppercase flex items-center space-x-3 font-medium">
                        <span className="text-white font-bold">First Year</span>
                        <span className="text-[rgba(42,157,143,0.4)]">•</span>
                        <span className="px-2.5 py-0.5 bg-[#2A9D8F]/15 text-[#2A9D8F] font-bold rounded-md border border-[#2A9D8F]/30">2026</span>
                    </div>
                </div>
            </header>

            {/* ═══ Main Content ═══ */}
            <main className="max-w-6xl mx-auto w-full px-6 sm:px-12 py-12 sm:py-20 flex-1 flex flex-col relative z-10">

                {/* ── Hero Section ── */}
                <motion.div
                    className="text-center mb-20"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                >
                    {/* Badge */}
                    <motion.div variants={fadeUp} custom={0} className="mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B313B]/90 border border-[rgba(42,157,143,0.3)] rounded-full text-[11px] font-mono font-bold tracking-[0.15em] text-[#E9C46A] uppercase shadow-md">
                            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
                            FIRST YEAR EXAMINATION · 2026
                        </span>
                    </motion.div>

                    {/* Main Title */}
                    <motion.h1
                        variants={fadeUp}
                        custom={1}
                        className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-extrabold tracking-tight text-white leading-[1.05] mb-2"
                    >
                        Welcome to
                    </motion.h1>
                    <motion.h1
                        variants={fadeUp}
                        custom={2}
                        className="text-4xl sm:text-6xl lg:text-7xl font-editorial font-extrabold tracking-tight leading-[1.05] mb-6"
                    >
                        <span className="text-[#E76F51]">AAC</span>{' '}
                        <span className="text-white">Entrance Test</span>
                    </motion.h1>

                    {/* Animated Underline */}
                    <motion.div
                        variants={fadeUp}
                        custom={3}
                        className="flex justify-center mb-8"
                    >
                        <div className="h-[3px] w-28 bg-gradient-to-r from-[#E76F51] via-[#F4A261] to-[#2A9D8F] rounded-full" />
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        variants={fadeUp}
                        custom={4}
                        className="text-base sm:text-lg text-[#9CB6BF] leading-relaxed max-w-xl mx-auto font-normal"
                    >
                        Your entrance assessment for the First Year programme. Please review the exam details before you begin.
                    </motion.p>

                    {/* Stat Pills */}
                    <motion.div
                        variants={fadeUp}
                        custom={5}
                        className="flex flex-wrap justify-center items-center gap-4 mt-10"
                    >
                        {[
                            { label: 'Questions', value: 30, color: '#E76F51' },
                            { label: 'Minutes', value: 60, color: '#2A9D8F' },
                            { label: 'Negative Marking', value: null, display: '0', color: '#E9C46A' },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="flex items-center space-x-3 px-5 py-3 bg-[#1B313B]/90 border border-[rgba(42,157,143,0.25)] rounded-lg shadow-md"
                            >
                                <span
                                    className="text-2xl font-editorial font-extrabold"
                                    style={{ color: stat.color }}
                                >
                                    {stat.value !== null ? (
                                        <AnimatedCounter target={stat.value} />
                                    ) : (
                                        stat.display
                                    )}
                                </span>
                                <span className="text-xs font-mono font-bold text-[#9CB6BF] uppercase tracking-wider">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </motion.div>

                    {/* Hero CTA */}
                    <motion.div
                        variants={fadeUp}
                        custom={6}
                        className="mt-10 flex flex-wrap justify-center gap-4"
                    >
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-[0_0_20px_rgba(231,111,81,0.35)] transition-colors duration-150 cursor-pointer flex items-center space-x-3 select-none"
                        >
                            <span>START EXAM</span>
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-white/20 rounded text-sm">
                                →
                            </span>
                        </button>
                        <button
                            onClick={() => {
                                const el = document.getElementById('exam-structure');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-7 py-4 bg-[#1B313B] hover:bg-[#264653] border border-[rgba(42,157,143,0.3)] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-md transition-colors duration-150 cursor-pointer select-none"
                        >
                            View Exam Details
                        </button>
                    </motion.div>
                </motion.div>

                {/* ── Exam Structure Section ── */}
                <section id="exam-structure" ref={structureRef} className="mb-20">
                    <motion.div
                        initial="hidden"
                        animate={structureInView ? 'visible' : 'hidden'}
                        variants={staggerContainer}
                    >
                        {/* Section Header */}
                        <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
                            <span className="inline-block px-3 py-1 bg-[#E76F51]/15 border border-[#E76F51]/30 text-[#E76F51] font-mono text-[10px] font-bold rounded-full tracking-[0.2em] uppercase mb-3">
                                OVERVIEW
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-editorial font-extrabold text-white tracking-tight">
                                Exam Structure
                            </h2>
                            <p className="text-sm text-[#9CB6BF] mt-2 max-w-md mx-auto">
                                30 multiple-choice questions across 4 subjects. Each question has one correct answer.                            </p>
                        </motion.div>

                        {/* Subject Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {subjects.map((subj, idx) => (
                                <motion.div
                                    key={subj.name}
                                    variants={scaleIn}
                                    custom={idx}
                                    className="relative bg-[#1B313B]/90 border border-[rgba(42,157,143,0.25)] rounded-xl p-6 shadow-md hover:border-[#2A9D8F]/60 transition-colors duration-200 overflow-hidden cursor-default"
                                >
                                    {/* Top accent line */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
                                        style={{ background: subj.color }}
                                    />

                                    {/* Icon */}
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono font-bold mb-4"
                                        style={{ background: subj.bgColor, color: subj.color, border: `1px solid ${subj.borderColor}` }}
                                    >
                                        {subj.icon}
                                    </div>

                                    <h3 className="font-editorial font-bold text-white text-base mb-1">
                                        {subj.name}
                                    </h3>
                                    <div className="flex items-baseline space-x-1">
                                        <span
                                            className="text-2xl font-editorial font-extrabold"
                                            style={{ color: subj.color }}
                                        >
                                            {subj.questions}
                                        </span>
                                        <span className="text-xs font-mono text-[#9CB6BF] uppercase tracking-wider">
                                            questions
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Total bar */}

                    </motion.div>
                </section>

                {/* ── Exam Details Timeline ── */}
                <section id="exam-details" ref={detailsRef} className="mb-16">
                    <motion.div
                        initial="hidden"
                        animate={detailsInView ? 'visible' : 'hidden'}
                        variants={staggerContainer}
                    >
                        {/* Section Header */}
                        <motion.div variants={fadeUp} custom={0} className="text-center sm:text-left mb-10">
                            {/* <span className="inline-block px-3 py-1 bg-[#2A9D8F]/15 border border-[#2A9D8F]/30 text-[#2A9D8F] font-mono text-[10px] font-bold rounded-full tracking-[0.2em] uppercase mb-3">
                                Guidelines
                            </span> */}
                            <h2 className="text-3xl sm:text-4xl font-editorial font-extrabold text-white tracking-tight">
                                Exam Pattern
                            </h2>
                        </motion.div>

                        {/* Timeline Items */}
                        <div className="relative">
                            {/* Vertical timeline line */}
                            <div className="absolute left-[19px] sm:left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#E76F51] via-[#F4A261] to-[#2A9D8F] rounded-full" />

                            <div className="space-y-4">
                                {examDetails.map((item, idx) => (
                                    <motion.div
                                        key={item.num}
                                        variants={fadeUp}
                                        custom={idx + 1}
                                        className="flex items-start gap-5 sm:gap-6"
                                    >
                                        {/* Timeline node */}
                                        <div className="relative z-10 shrink-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#1B313B] border border-[rgba(42,157,143,0.3)] shadow-md flex items-center justify-center font-mono font-bold text-xs text-[#E9C46A]">
                                                {item.num}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 bg-[#1B313B]/90 border border-[rgba(42,157,143,0.25)] rounded-xl p-5 shadow-md">
                                            <h3 className="font-editorial font-bold text-white text-sm uppercase tracking-wide mb-1">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-[#9CB6BF] leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* ── Enter Exam CTA ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-10"
                >
                    <button
                        onClick={() => navigate('/login')}
                        className="px-10 py-5 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-sm uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(231,111,81,0.35)] transition-colors duration-150 cursor-pointer inline-flex items-center space-x-3 select-none"
                    >
                        <span>CONTINUE TO EXAM</span>
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-white/20 rounded-md text-sm font-mono">
                            →
                        </span>
                    </button>
                    <p className="text-xs text-[#9CB6BF] mt-3 font-mono">
                        You'll need your access token provided by the invigilator
                    </p>
                </motion.div>
            </main>

            {/* ═══ Footer ═══ */}
            <footer className="w-full border-t border-[rgba(42,157,143,0.2)] bg-[#0E1A20] px-6 sm:px-12 py-5">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#9CB6BF]">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-white">AAC ENTRANCE TEST</span>
                        <span className="text-[rgba(42,157,143,0.4)]">•</span>
                        <span>Offline LAN Edition</span>
                        <span className="text-[rgba(42,157,143,0.4)]">•</span>
                        <span>© 2026</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <FooterLogos />
                    </div>
                </div>
            </footer>
        </div>
    );
}
