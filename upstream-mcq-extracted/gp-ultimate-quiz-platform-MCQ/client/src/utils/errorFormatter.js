/**
 * errorFormatter.js — Shared utility for formatting error output in the UI.
 *
 * The dispatcher already sends detailed, language-specific error messages.
 * This utility provides consistent status label classification for the frontend.
 */

/**
 * Given submission result data from the socket, returns a classified error object.
 * @param {Object} data - The socket submission_result data
 * @returns {{ label: string, message: string, isError: boolean }}
 */
export function formatErrorForDisplay(data) {
    const stderr = data.stderr || '';
    const stdout = data.stdout || '';
    const error = data.error || '';

    // Build the message — prefer stderr (which now contains detailed formatted output from dispatcher)
    const message = stderr || error || stdout || 'Unknown Error';

    // Classify the error type for the status badge
    const label = classifyErrorLabel(stderr, data.status);

    return {
        label,
        message,
        isError: true,
    };
}

/**
 * Classifies an error into a human-readable label for the status badge.
 * Matches the simplified headers from the dispatcher.
 */
function classifyErrorLabel(stderr, status) {
    const lower = stderr.toLowerCase();

    // Match dispatcher emoji-tagged headers (simplified — no compiler names)
    if (lower.includes('compilation error')) return 'Compilation Error';
    if (lower.includes('time limit exceeded')) return 'Time Limit Exceeded';
    if (lower.includes('segmentation fault')) return 'Runtime Error (SIGSEGV)';
    if (lower.includes('floating point exception')) return 'Runtime Error (SIGFPE)';
    if (lower.includes('aborted')) return 'Runtime Error (SIGABRT)';
    if (lower.includes('non-zero exit') || lower.includes('nzec')) return 'Runtime Error (NZEC)';
    if (lower.includes('runtime error')) return 'Runtime Error';
    if (lower.includes('internal judge error')) return 'Internal Error';
    if (lower.includes('exec format error')) return 'Exec Format Error';

    // Fallback: detect from raw compiler/runtime markers
    if (lower.includes('error:')) return 'Compilation Error';
    if (lower.includes('traceback')) return 'Runtime Error';
    if (lower.includes('exception')) return 'Runtime Error';
    if (lower.includes('panic:')) return 'Runtime Error';

    if (status === 'FAILED') return 'Judge Error';
    if (status === 'ERROR') return 'Error';

    return 'Wrong Answer';
}
