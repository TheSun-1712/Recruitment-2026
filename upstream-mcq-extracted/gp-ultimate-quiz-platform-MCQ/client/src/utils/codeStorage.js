// ==================================================================
// Shared Code Storage Utility
// Boilerplate defaults, localStorage persistence, language preference
// ==================================================================

// --- Judge0 Language IDs ---
export const LANGUAGE_IDS = {
    python: 71,  // Python 3.8
    c: 50,       // GCC 9.2 (C)
    cpp: 54,     // GCC 9.2 (C++)
    java: 62,    // OpenJDK 13
    go: 60,      // Go 1.13.5
};

// --- Default Boilerplate per Language ---
export const BOILERPLATE = {
    python: `# Type your code here\n`,
    c: `#include <stdio.h>

int main() {
    // Type your code here
    return 0;
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Type your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Type your code here
    }
}
`,
    go: `package main

import "fmt"

func main() {
    // Type your code here
    fmt.Println("Hello")
}
`,
};

// --- Monaco language identifier mapping ---
// Monaco uses "c" for C files and "cpp" for C++, which matches our keys.
// No special mapping needed.

// --- localStorage Key Helpers ---

function getStorageKey(prefix, questionId, language) {
    return `${prefix}_q${questionId}_${language}`;
}

/**
 * Save user code to localStorage.
 */
export function saveCode(prefix, questionId, language, code) {
    try {
        localStorage.setItem(getStorageKey(prefix, questionId, language), code);
    } catch (e) {
        console.warn("Failed to save code to localStorage", e);
    }
}

/**
 * Load user code from localStorage.
 * Returns null if nothing saved.
 */
export function loadCode(prefix, questionId, language) {
    try {
        return localStorage.getItem(getStorageKey(prefix, questionId, language));
    } catch (e) {
        return null;
    }
}

/**
 * Get saved code if it exists, otherwise return the language boilerplate.
 */
export function getCodeOrBoilerplate(prefix, questionId, language) {
    const saved = loadCode(prefix, questionId, language);
    if (saved !== null) return saved;
    return BOILERPLATE[language] || "";
}

/**
 * Clear all localStorage keys for a given contest prefix.
 * Only removes keys matching the pattern `<prefix>_q*`.
 */
export function clearCodeStorage(prefix) {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${prefix}_q`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
        console.warn("Failed to clear code storage", e);
    }
}

// --- Preferred Language Persistence ---

const PREFERRED_LANG_KEY = "preferredLang";

/**
 * Save the user's last-used language globally (persists across rounds).
 */
export function saveLastLanguage(lang) {
    try {
        localStorage.setItem(PREFERRED_LANG_KEY, lang);
    } catch (e) {
        // silently fail
    }
}

/**
 * Get the user's last-used language, defaulting to "python".
 */
export function getLastLanguage() {
    try {
        return localStorage.getItem(PREFERRED_LANG_KEY) || "python";
    } catch (e) {
        return "python";
    }
}
