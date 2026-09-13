import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function HeroSection({ onJoin }) {
    return (
        <section className="relative max-w-[1440px] mx-auto px-6 sm:px-10 pt-6 pb-10">

            <section className="flex flex-col items-center justify-center text-center min-h-[75vh]">
                {/* <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 1.0 }}
          className="text-sm uppercase tracking-[0.4em] text-[#fdba87] font-bold mb-6"
        >
  
        </motion.p> */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="opulence-title-font text-[clamp(3.5rem,10vw,12rem)] leading-[0.95] bg-gradient-to-r from-[#f3b16f] via-[#ff7a3d] to-[#ff7a3d] bg-clip-text text-transparent drop-shadow-[0_4px_0_rgba(20,4,3,0.9)] sm:drop-shadow-[0_6px_0_rgba(20,4,3,0.9)]"
                >
                    GPRIME
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-4 text-sm sm:text-lg tracking-[0.2em] sm:tracking-[0.4em] text-orange-300 font-bold"
                >
                    10TH APRIL, 2026
                </motion.p>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-6 max-w-3xl text-orange-300 text-base sm:text-xl leading-relaxed font-bold px-4 sm:px-0"
                >
                    Push the boundaries of your code where raw logic meets flawless execution.
                    Welcome to GPrime—the ultimate arena for competitive coding.
                </motion.p>


            </section>

            {/* 📊 STATS */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 mt-16 sm:mt-24"
            >
                {[
                    ["PRIZE POOL", "Rs.15,000"],
                    ["PARTICIPANTS", "100+"],
                    ["DURATION", "8 HOURS"],
                ].map(([label, value]) => (
                    <div
                        key={label}
                        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-10"
                    >
                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.4em] text-orange-400 font-bold">
                            {label}
                        </p>
                        <p className="mt-2 sm:mt-3 text-3xl sm:text-4xl font-black text-white">
                            {value}
                        </p>
                    </div>
                ))}
            </motion.section>

            {/* ⚔️ ARENA */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-20 sm:mt-32"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 mb-10 sm:mb-16 border-l-4 border-orange-500 pl-6 sm:pl-8">
                    <div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase mb-2 sm:mb-4">
                            THE ARENA
                        </h2>
                        <p className="text-orange-200/60 max-w-2xl text-base sm:text-lg">
                            Where code meets planetary-scale competition. Only the most precise engineers survive.
                        </p>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                    {[
                        ["security", "Absolute Security", "Encrypted, isolated execution environments."],
                        ["bolt", "Performance", "Ultra-low latency real-time judging."],
                        ["verified_user", "Exclusivity", "Invite-only elite participation."],
                    ].map(([icon, title, desc]) => (
                        <div
                            key={title}
                            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10"
                        >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/30">
                                <span className="material-symbols-outlined text-orange-400 text-2xl sm:text-3xl">
                                    {icon}
                                </span>
                            </div>

                            <h3 className="mt-4 sm:mt-6 text-lg sm:text-xl font-black uppercase">
                                {title}
                            </h3>
                            <p className="mt-2 sm:mt-3 text-orange-200/50 text-sm sm:text-base leading-relaxed">
                                {desc}
                            </p>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* 🚀 CTA */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-20 sm:mt-32 text-center"
            >
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                    READY TO DOMINATE?
                </h2>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full max-w-sm sm:max-w-none mx-auto">
                    <Link to="/Rounds" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-xl border border-white/20 text-white font-bold">
                            Review Rounds
                        </button>
                    </Link>

                    <Link to="/leaderboard" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold shadow-lg shadow-orange-500/30">
                            Leaderboard
                        </button>
                    </Link>
                </div>
            </motion.section>

            {/* 🧾 FOOTER */}
            <motion.footer
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-20 sm:mt-32 py-8 sm:py-10 border-t border-white/10 text-center"
            >
                <p className="text-[10px] uppercase tracking-[0.5em] text-orange-200/40 font-bold">
                    © 2026 OPULENCE MARTIAN ARENA
                </p>
            </motion.footer>
        </section>
    );
}