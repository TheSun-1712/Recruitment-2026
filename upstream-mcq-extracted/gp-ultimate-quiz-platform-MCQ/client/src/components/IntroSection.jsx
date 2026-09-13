import { motion } from "framer-motion";

export default function IntroSection() {
    return (
        <div className="relative h-screen flex items-center justify-center px-4">

            <div className="text-center">



                <motion.h1
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="opulence-title-font text-[clamp(1.9rem,6vw,4.75rem)] font-bold leading-[0.95] tracking-[0.08em] bg-gradient-to-r from-[#d9ae75] via-[#bf752a] to-[#ab4113] bg-clip-text text-transparent drop-shadow-[0_4px_0_rgba(20,4,3,0.9)] sm:drop-shadow-[0_6px_0_rgba(20,4,3,0.9)]"
                >
                    AAC PRESENTS
                </motion.h1>

                <motion.h2
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 4, delay: 1.0 }}
                    className="opulence-title-font text-[clamp(3.5rem,13vw,14rem)] leading-[0.9] bg-gradient-to-r from-[#d9ae75] via-[#bf752a] to-[#ab4113] bg-clip-text text-transparent drop-shadow-[0_4px_0_rgba(20,4,3,0.9)] sm:drop-shadow-[0_6px_0_rgba(20,4,3,0.9)] mt-3"
                >
                    OPULENCE
                </motion.h2>

            </div>

        </div>
    );
}