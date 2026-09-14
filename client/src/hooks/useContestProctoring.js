import { useEffect, useState, useRef, useCallback } from "react";

/**
 * useContestProctoring — client-side proctoring hook for contest pages.
 *
 * Features:
 * 1. Fullscreen enforcement (non-penalizing initial gate; violation on exit)
 * 2. Tab-switch / minimize detection (warning on return)
 * 3. DevTools detection (passive heuristics: window-size in fullscreen + console getter)
 *    NO page reload — displays an in-place security overlay to preserve slow client performance.
 * 4. Keyboard shortcut blocking (F12, Ctrl+Shift+I/J/C/K, Ctrl+U)
 * 5. Right-click context menu disabled
 * 6. Auto-disqualification after MAX_VIOLATIONS total violations
 *
 * @param {string} contestPrefix  "exam" | "rapidfire" | "cascade" | "dsa"
 * @param {object} options
 * @param {boolean} options.contestEnded  When true, suppress all proctoring
 * @param {Function} options.onDisqualify  Called when violations hit MAX_VIOLATIONS
 * @returns {{ showWarning, warningTitle, warningMessage, warningButtonText, warningAction, violationCount, maxViolations, isViolation, cleanupProctoring }}
 */

// ─── Configurable constants ────────────────────────────────────────────────────
const DEFAULT_MAX_VIOLATIONS = 10;
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

export default function useContestProctoring(contestPrefix, { contestEnded = false, onDisqualify = null, teamName = null, backendUrl = null, maxViolations = DEFAULT_MAX_VIOLATIONS } = {}) {
    const STORAGE_KEY = `${contestPrefix}_violations`;

    const [showWarning, setShowWarning] = useState(false);
    const [warningTitle, setWarningTitle] = useState("");
    const [warningMessage, setWarningMessage] = useState("");
    const [warningButtonText, setWarningButtonText] = useState("");
    const [isViolation, setIsViolation] = useState(true);
    const warningActionRef = useRef(null);

    const [violationCount, setViolationCount] = useState(() => {
        return parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);
    });

    // Track whether the candidate has entered fullscreen at least once during this session
    const hasEnteredFullscreenRef = useRef(Boolean(document.fullscreenElement));
    // Track whether the tab was hidden (for tab-switch detection)
    const wasHiddenRef = useRef(false);
    // Guard: don't show multiple overlays at once
    const isShowingWarningRef = useRef(false);
    // Guard: contest ended — avoid triggering after navigation
    const contestEndedRef = useRef(contestEnded);
    // Cooldown for passive DevTools detection to avoid spamming violations while closing DevTools
    const lastDevToolsWarningRef = useRef(0);

    useEffect(() => {
        contestEndedRef.current = contestEnded;
    }, [contestEnded]);

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
     * Bypasses normal showOverlay guard so it always wins over any in-progress overlay.
     * Sets contestEndedRef to prevent any further proctoring triggers.
     */
    const triggerDisqualification = useCallback(() => {
        contestEndedRef.current = true; // stop all further proctoring loops
        isShowingWarningRef.current = true; // override any in-progress overlay

        try {
            const url = backendUrlRef.current;
            if (url) {
                const payload = JSON.stringify({
                    team_name: teamNameRef.current || "Unknown Team",
                    round: contestPrefix,
                    violations: maxViolations,
                });
                fetch(`${url}/admin/disqualify-report`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true, // survives page unload if user clicks Exit Contest quickly
                }).catch(() => { });
            }
        } catch (_) { /* non-critical */ }

        setIsViolation(true);
        setWarningTitle("Exam Terminated");
        setWarningMessage(
            `You have exceeded the maximum allowed security violations (${maxViolations}). Your exam has been automatically ended and submitted.`
        );
        setWarningButtonText("View Submission");
        warningActionRef.current = () => {
            setShowWarning(false);
            isShowingWarningRef.current = false;
            onDisqualify?.();
        };
        setShowWarning(true);

        // Automatically trigger disqualification/submission
        if (onDisqualify) {
            onDisqualify();
        }
    }, [onDisqualify, contestPrefix, maxViolations]);

    /**
     * showOverlay — increment FIRST, then check if the new count hits the limit.
     * Used exclusively for legitimate security violations.
     */
    const showOverlay = useCallback((message, buttonText, action, title = "Security Violation Detected") => {
        if (isShowingWarningRef.current) return;
        if (contestEndedRef.current) return;

        const next = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
        sessionStorage.setItem(STORAGE_KEY, String(next));
        setViolationCount(next);

        if (next >= maxViolations) {
            triggerDisqualification();
            return;
        }

        isShowingWarningRef.current = true;
        setIsViolation(true);
        setWarningTitle(title);
        setWarningMessage(message);
        setWarningButtonText(buttonText);
        warningActionRef.current = action;
        setShowWarning(true);
    }, [STORAGE_KEY, triggerDisqualification, maxViolations]);

    /**
     * showFullscreenPrompt — prompts the user to enter fullscreen without penalizing
     * or incrementing violations (used on initial exam mount / page reload).
     */
    const showFullscreenPrompt = useCallback(() => {
        if (isShowingWarningRef.current) return;
        if (contestEndedRef.current) return;
        if (document.fullscreenElement) return;

        isShowingWarningRef.current = true;
        setIsViolation(false);
        setWarningTitle("Fullscreen Required");
        setWarningMessage("You must be in fullscreen mode during the examination. Click the button below to enter fullscreen.");
        setWarningButtonText("Enter Fullscreen");
        warningActionRef.current = () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        };
        setShowWarning(true);
    }, []);

    const dismissWarning = useCallback(() => {
        setShowWarning(false);
        isShowingWarningRef.current = false;
        if (warningActionRef.current) {
            warningActionRef.current();
            warningActionRef.current = null;
        }
    }, []);

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

            if (document.fullscreenElement) {
                // Successfully entered fullscreen
                hasEnteredFullscreenRef.current = true;
                // If the non-penalizing initial prompt was showing, close it
                if (isShowingWarningRef.current && !isViolation) {
                    dismissWarning();
                }
            } else {
                // User exited fullscreen
                // Only increment violations if the user was already inside the exam in fullscreen
                if (hasEnteredFullscreenRef.current) {
                    showOverlay(
                        "You have exited fullscreen mode. Excessive violations may result in penalties.",
                        "Return to Fullscreen",
                        () => {
                            document.documentElement.requestFullscreen().catch(() => { });
                        }
                    );
                } else {
                    // Otherwise, display the non-penalizing gate
                    showFullscreenPrompt();
                }
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        // On mount: check fullscreen status
        if (document.fullscreenElement) {
            hasEnteredFullscreenRef.current = true;
        } else {
            // Give React render a brief moment before presenting the non-penalizing prompt
            const timer = setTimeout(() => {
                if (!document.fullscreenElement && !contestEndedRef.current) {
                    showFullscreenPrompt();
                }
            }, 300);
            return () => {
                clearTimeout(timer);
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
            };
        }

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, [contestEnded, showOverlay, showFullscreenPrompt, dismissWarning, isViolation]);

    // --- 2. Tab-switch / minimize detection ---

    useEffect(() => {
        if (contestEnded) return;

        const handleVisibilityChange = () => {
            if (contestEndedRef.current) return;

            if (document.visibilityState === "hidden") {
                wasHiddenRef.current = true;
            } else if (document.visibilityState === "visible" && wasHiddenRef.current) {
                wasHiddenRef.current = false;
                setTimeout(() => {
                    if (contestEndedRef.current) return;
                    showOverlay(
                        "Tab switch or window minimization detected. This activity is logged. Excessive violations may result in penalties.",
                        "I Understand",
                        () => { }
                    );
                }, 300);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [contestEnded, showOverlay]);

    // --- 3. DevTools detection — continuous passive polling (NO page reload) ---

    useEffect(() => {
        if (contestEnded) return;

        const interval = setInterval(() => {
            if (contestEndedRef.current) return;
            if (isShowingWarningRef.current) return; // Guard: modal already visible
            if (Date.now() - lastDevToolsWarningRef.current < 5000) return; // 5-second cooldown

            let detected = false;

            // Heuristic A — window size delta (only evaluated if in fullscreen)
            if (isDevToolsOpenBySize()) {
                detected = true;
            }

            // Heuristic B — console getter (Chromium family)
            if (!detected) {
                checkDevToolsViaConsole(() => { detected = true; });
            }

            if (detected) {
                lastDevToolsWarningRef.current = Date.now();
                showOverlay(
                    "Developer tools / inspect detected. This activity is strictly prohibited and logged. Please close developer tools immediately.",
                    "I Understand",
                    () => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => { });
                        }
                    }
                );
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [contestEnded, showOverlay]);

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
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K
            if (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c", "K", "k"].includes(e.key)) {
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
        warningAction: dismissWarning,
        violationCount,
        maxViolations,
        isViolation,
        cleanupProctoring,
    };
}
