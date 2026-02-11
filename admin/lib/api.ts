// Development: http://127.0.0.1:3001
// Production (Vercel): Use relative path '' to proxy to /api
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001') : '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    // OPT-1: 获取当前买手身份，用于操作追溯
    const currentBuyer = localStorage.getItem('current_buyer') || 'Unknown';

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Buyer-Name': encodeURIComponent(currentBuyer),
            ...options?.headers,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
    }

    return res.json();
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data?: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
    patch: <T>(path: string, data?: unknown) =>
        request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: <T>(path: string) =>
        request<T>(path, { method: 'DELETE' }),
};
