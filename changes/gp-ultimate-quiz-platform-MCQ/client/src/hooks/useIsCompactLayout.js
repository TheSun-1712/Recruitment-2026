import { useEffect, useState } from "react";

export default function useIsCompactLayout(breakpoint = 1024) {
    const getIsCompact = () => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < breakpoint;
    };

    const [isCompact, setIsCompact] = useState(getIsCompact);

    useEffect(() => {
        const handleResize = () => setIsCompact(getIsCompact());

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, [breakpoint]);

    return isCompact;
}