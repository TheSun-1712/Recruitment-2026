const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Universal authenticated API fetch helper for Admin calls.
 */
export async function adminFetch(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            if (window.location.pathname !== '/admin/login') {
                window.location.href = '/admin/login';
            }
            throw new Error('Session expired. Please login again.');
        }

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || `Request failed with status ${response.status}` };
        }

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (err) {
        throw err;
    }
}

export async function candidateFetch(endpoint, options = {}) {
    let session = null;
    try {
        session = JSON.parse(sessionStorage.getItem('examSession') || 'null');
    } catch {
        session = null;
    }

    const headers = { ...options.headers };

    if (session?.jwt) {
        headers['Authorization'] = `Bearer ${session.jwt}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const response = await fetch(url, { ...options, headers });

    // Layer 2 Stateless Cryptographic Revocation: Catch 401 from DB session_version check
    if (response.status === 401) {
        sessionStorage.removeItem('examSession');
        alert('Your session was taken over on another device or has expired. Please rejoin.');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Logged in elsewhere or session expired.');
    }

    return response;
}

export { API_URL };
