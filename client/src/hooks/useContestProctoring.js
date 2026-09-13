import { useEffect, useState, useRef, useCallback } from "react";

/**
 * useContestProctoring — client-side proctoring hook for contest pages.
 *
 * Features:
 * 1. Fullscreen enforcement (overlay to re-enter on exit)
 * 2. Tab-switch / minimize detection (warning on return)
 * 3. DevTools detection (passive heuristics: window-size + console getter → reload)
 * 4. Keyboard shortcut blocking (F12, Ctrl+Shift+I/J/C, Ctrl+U)
 * 5. Right-click context menu disabled
 * 6. Auto-disqualification after MAX_VIOLATIONS total violations
 *
 * @param {string} contestPrefix  "rapidfire" | "cascade" | "dsa"
 * @param {object} options
 * @param {boolean} options.contestEnded  When true, suppress all proctoring
 * @param {Function} options.onDisqualify  Called when violations hit MAX_VIOLATIONS;
 *   should clear auth tokens and navigate away.
 * @returns {{ showWarning, warningMessage, warningButtonText, warningAction, violationCount, cleanupProctoring }}
 */

// ─── Configurable constants ────────────────────────────────────────────────────
// Change MAX_VIOLATIONS to adjust how many proctoring violations are allowed
// before the user is automatically disqualified and logged out.
const MAX_VIOLATIONS = 10;
// ──────────────────────────────────────────────────────────────────────────────
// --- Passive DevTools detection helpers (defined once outside the hook) ---

/**
 * Heuristic A: When DevTools is docked, innerWidth/innerHeight shrinks but
 * outer dimensions stay the same. A delta > 160px is a reliable signal.
 *
 * IMPORTANT: ONLY evaluate when in fullscreen mode!
 * In windowed mode (non-fullscreen), browser chrome (URL bar, tabs, OS taskbar)
 * can easily produce a delta > 160px on standard college lab screens (1366x768).
 */
function isDevToolsOpenBySize() {
    if (!document.fullscreenElement) {
        return false;
    }
    const widthDelta = window.outerWidth - window.innerWidth;
    const heightDelta = window.outerHeight - window.innerHeight;
    return widthDelta > 160 || heightDelta > 160;
}

/**
 * Heuristic B: console.log getter trick.
 * Chrome (and Chromium-based browsers) evaluate getters on objects passed to
 * console.log when the console panel is active. Define a getter on a throwaway
 * object — if DevTools console is open, the getter fires synchronously.
 *
 * @param {Function} onDetected — called immediately if DevTools is open
 */
function checkDevToolsViaConsole(onDetected) {
    let detected = false;
    const el = new Image();
    Object.defineProperty(el, 'id', {
        get: function () {
            detected = true;
            onDetected();
            // Throw to prevent Chrome from trying to log the rest of the object
            throw new Error('devtools-check');
        }
    });
    try {
        // eslint-disable-next-line no-console
        console.log('%c', el);
    } catch (_) { /* expected from getter throw */ }
    if (!detected) {
        // eslint-disable-next-line no-console
        console.clear();
    }
}

export default function useContestProctoring(contestPrefix, { contestEnded = false, onDisqualify = null, teamName = null, backendUrl = null } = {}) {
    const STORAGE_KEY = `${contestPrefix}_violations`;
    // sessionStorage key used to signal that a reload was triggered by DevTools detection
    const DEVTOOLS_RELOAD_FLAG = `${contestPrefix}_devtools_reload`;

    const [showWarning, setShowWarning] = useState(false);
    const [warningTitle, setWarningTitle] = useState("");
    const [warningMessage, setWarningMessage] = useState("");
    const [warningButtonText, setWarningButtonText] = useState("");
    const [isViolation, setIsViolation] = useState(true);
    const warningActionRef = useRef(null);
    const [violationCount, setViolationCount] = useState(() => {
        return parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);
    });

    // Track whether the tab was hidden (for tab-switch detection)
    const wasHiddenRef = useRef(false);
    // Guard: don't show multiple overlays at once
    const isShowingWarningRef = useRef(false);
    // Guard: contest ended — avoid triggering after navigation
    const contestEndedRef = useRef(contestEnded);

    useEffect(() => {
        contestEndedRef.current = contestEnded;
    }, [contestEnded]);
    // Ref to always hold the latest teamName — avoids stale closure if session loads
    // after the hook first mounts (e.g. DevTools-reload path where activeSession is null
    // at mount and initSession is still in-flight)
    const teamNameRef = useRef(teamName);
    useEffect(() => {
        teamNameRef.current = teamName;
    }, [teamName]);

    const backendUrlRef = useRef(backendUrl);
    useEffect(() => {
        backendUrlRef.current = backendUrl;
    }, [backendUrl]);

    /**
     * Show the disqualification overlay.
     * Bypasses the normal showOverlay guard so it always wins over any in-progress overlay.
     * Sets contestEndedRef to prevent any further proctoring triggers.
     */
    const triggerDisqualification = useCallback(() => {
        contestEndedRef.current = true; // stop all further proctoring loops
        isShowingWarningRef.current = true; // override any in-progress overlay

        // Report to admin — use sendBeacon so it survives page unload/navigate
        // Reads from refs to always get the latest values, even on DevTools-reload path
        try {
            const url = backendUrlRef.current;
            if (url) {
                const payload = JSON.stringify({
                    team_name: teamNameRef.current || "Unknown Team",
                    round: contestPrefix,
                    violations: MAX_VIOLATIONS,
                });
                // Use fetch with keepalive:true — survives navigate() + Component unmount.
                // sendBeacon with application/json Blob triggers a CORS preflight that
                // sendBeacon cannot handle, causing the request to be silently dropped.
                // fetch with explicit Content-Type headers is reliable and CORS-safe.
                fetch(`${url}/admin/disqualify-report`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true, // survives page unload if user clicks Exit Contest quickly
                }).catch(() => { }); // fire-and-forget
            }
        } catch (_) { /* non-critical */ }

        setWarningTitle("🚨 Disqualified");
        setWarningMessage(
            "You have been disqualified for repeated violations. This incident has been recorded and reported to the admin."
        );
        setWarningButtonText("Exit Exam");
        warningActionRef.current = () => {
            onDisqualify?.(); // contest page clears tokens + navigates away
        };
        setIsViolation(false);
        setShowWarning(true);

        // Immediately trigger onDisqualify so consumer component can transition state to terminated screen
        onDisqualify?.();
    }, [onDisqualify, contestPrefix]);

    /**
     * Used by the DevTools-reload path (effect 3a) which has already called
     * incrementViolations() in the polling interval before reloading.
     * Reads the CURRENT count from sessionStorage and triggers disqualification
     * if it has already reached MAX_VIOLATIONS.
     */
    const checkViolationLimit = useCallback(() => {
        const current = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
        if (current >= MAX_VIOLATIONS) {
            triggerDisqualification();
            return true;
        }
        return false;
    }, [STORAGE_KEY, triggerDisqualification]);

    /**
     * showOverlay — increment FIRST, then check if the new count hits the limit.
     *
     * Previous (buggy) order: check → increment → show warning
     *   → disqualification only fired on the (MAX_VIOLATIONS + 1)th event
     *
     * Fixed order: increment → check → disqualify OR show warning
     *   → disqualification fires exactly on the MAX_VIOLATIONSth event
     */
    const showOverlay = useCallback((message, buttonText, action) => {
        if (isShowingWarningRef.current) return; // one at a time
        if (contestEndedRef.current) return;

        // Increment synchronously in sessionStorage so it survives reloads,
        // and update React state for the UI violation counter.
        const next = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
        sessionStorage.setItem(STORAGE_KEY, String(next));
        setViolationCount(next);

        // If the new count has hit the limit, disqualify instead of a regular warning.
        if (next >= MAX_VIOLATIONS) {
            triggerDisqualification();
            return;
        }

        isShowingWarningRef.current = true;
        setWarningTitle("⚠ Proctoring Violation");
        setWarningMessage(message);
        setIsViolation(true);
        setWarningButtonText(buttonText);
        warningActionRef.current = action;
        setShowWarning(true);
    }, [STORAGE_KEY, triggerDisqualification]);

    const dismissWarning = useCallback(() => {
        setShowWarning(false);
        isShowingWarningRef.current = false;
        // Execute the stored action after dismissing
        if (warningActionRef.current) {
            warningActionRef.current();
            warningActionRef.current = null;
        }
    }, []);

    // Wrapped warningAction for consumers
    const warningAction = dismissWarning;

    // --- Cleanup (call on contest end) ---

    const cleanupProctoring = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
    }, [STORAGE_KEY]);

    // --- 1. Fullscreen enforcement ---

    useEffect(() => {
        if (contestEnded) return;

        const handleFullscreenChange = () => {
            if (contestEndedRef.current) return;
            if (!document.fullscreenElement) {
                // User exited fullscreen -> counts as a violation!
                showOverlay(
                    "You have exited full screen mode. Full screen is mandatory during the examination. Exceeding 10 violations will terminate your exam.",
                    "Return to Full Screen",
                    () => {
                        document.documentElement.requestFullscreen().catch(() => { });
                    }
                );
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        // Attempt automatic fullscreen on mount
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }

        // On mount: if not already fullscreen, show a non-penalizing overlay asking to enter full screen
        // IMPORTANT: Skip if the reload was triggered by DevTools detection.
        const wasDevToolsReload = sessionStorage.getItem(DEVTOOLS_RELOAD_FLAG) === 'true';
        if (!document.fullscreenElement && !wasDevToolsReload) {
            const timer = setTimeout(() => {
                if (!document.fullscreenElement && !contestEndedRef.current && !isShowingWarningRef.current) {
                    // Do NOT penalize on initial entry (do not increment violation count)
                    isShowingWarningRef.current = true;
                    setWarningMessage(
                        "You must be in full screen mode during the examination. Click the button below to enter full screen."
                    );
                    setWarningButtonText("Enter Full Screen");
                    warningActionRef.current = () => {
                        if (document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().catch(() => { });
                        }
                    };
                    setShowWarning(true);
                }
            }, 600);
            return () => {
                clearTimeout(timer);
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
            };
        }

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, [contestEnded, showOverlay]);

    // --- 2. Tab-switch / minimize detection ---

    useEffect(() => {
        if (contestEnded) return;

        const handleVisibilityChange = () => {
            if (contestEndedRef.current) return;

            if (document.visibilityState === "hidden") {
                wasHiddenRef.current = true;
            } else if (document.visibilityState === "visible" && wasHiddenRef.current) {
                wasHiddenRef.current = false;
                // Show warning after a tiny delay to let the existing timer-sync handler run first
                setTimeout(() => {
                    if (contestEndedRef.current) return;
                    showOverlay(
                        "Tab switch or window minimization detected. This activity is logged. Excessive violations may result in penalties.",
                        "I Understand",
                        () => { } // just dismiss
                    );
                }, 300);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [contestEnded, showOverlay]);

    // --- 3a. DevTools detection — post-reload warning (runs on mount) ---
    //
    // When the detection loop (3b) fires, it sets DEVTOOLS_RELOAD_FLAG in
    // sessionStorage and immediately calls window.location.reload().
    // On the next mount this effect reads that flag and shows the warning overlay
    // at 200ms — BEFORE the fullscreen "Enter Fullscreen" overlay (500ms delay).
    // The action callback re-enters fullscreen so the user only sees one overlay.

    useEffect(() => {
        if (contestEnded) return;

        const flag = sessionStorage.getItem(DEVTOOLS_RELOAD_FLAG);
        if (flag !== 'true') return;

        sessionStorage.removeItem(DEVTOOLS_RELOAD_FLAG);

        const timer = setTimeout(() => {
            if (contestEndedRef.current) return;
            // If this reload pushed violations to the limit, disqualify instead
            if (checkViolationLimit()) {
                // Re-enter fullscreen so the disqualification overlay renders cleanly
                document.documentElement.requestFullscreen().catch(() => { });
                return;
            }
            showOverlay(
                "Developer tools were detected! This is a serious violation and could result in disqualification.",
                "I Understand",
                () => {
                    // Re-enter fullscreen after the user dismisses (reload exits fullscreen)
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            );
        }, 200); // fires before the fullscreen overlay's 500ms delay

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — only runs once on mount

    // --- 3b. DevTools detection — continuous passive polling ---
    //
    // Two heuristics run every 1.5s:
    //   A. Window size delta  — catches docked DevTools (can't be disabled via browser settings)
    //   B. console getter     — catches undocked/detached DevTools panel
    //
    // On detection: persist the reload flag → reload immediately.
    // No clearInterval — the interval dies naturally when the page unloads.

    useEffect(() => {
        if (contestEnded) return;

        const interval = setInterval(() => {
            if (contestEndedRef.current) return;

            let detected = false;

            // Heuristic A — window size delta
            if (isDevToolsOpenBySize()) {
                detected = true;
            }

            // Heuristic B — console getter (Chromium family)
            if (!detected) {
                checkDevToolsViaConsole(() => { detected = true; });
            }

            if (detected) {
                // Persist flag and violation count BEFORE reloading (synchronous storage ops)
                // Inline increment: sessionStorage must be updated synchronously before reload
                const nextCount = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
                sessionStorage.setItem(STORAGE_KEY, String(nextCount));
                sessionStorage.setItem(DEVTOOLS_RELOAD_FLAG, 'true');
                window.location.reload();
                // No clearInterval needed — the page is about to unload
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [contestEnded, STORAGE_KEY, DEVTOOLS_RELOAD_FLAG]);


    // --- 4. Keyboard shortcut blocking ---

    useEffect(() => {
        if (contestEnded) return;

        const handleKeyDown = (e) => {
            // F12
            if (e.key === "F12") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            // Ctrl+U (view source)
            if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown, true); // capture phase
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [contestEnded]);

    // --- 5. Right-click disabled ---

    useEffect(() => {
        if (contestEnded) return;

        const handleContextMenu = (e) => {
            e.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, [contestEnded]);

    return {
        showWarning,
        warningTitle,
        warningMessage,
        warningButtonText,
        warningAction,
        violationCount,
        maxViolations: MAX_VIOLATIONS,
        isViolation,
        cleanupProctoring,
    };
}
