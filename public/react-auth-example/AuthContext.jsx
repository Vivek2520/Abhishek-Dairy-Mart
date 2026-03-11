import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_KEY = 'auth_session';

function readSession() {
    try {
        const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.expiresAt || new Date(data.expiresAt).getTime() <= Date.now()) return null;
        return data;
    } catch (_) {
        return null;
    }
}

function writeSession(data, rememberMe) {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    const raw = JSON.stringify(data);
    if (rememberMe) localStorage.setItem(AUTH_KEY, raw);
    else sessionStorage.setItem(AUTH_KEY, raw);
}

function clearSession() {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
}

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => readSession());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const boot = async () => {
            const current = readSession();
            if (!current) {
                if (active) {
                    setAuth(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const res = await fetch('/api/users/validate', {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(current.token ? { Authorization: `Bearer ${current.token}` } : {})
                    }
                });
                if (!res.ok) throw new Error('Session expired');
                const body = await res.json();
                const next = { ...current, user: body.data };
                writeSession(next, !!current.rememberMe);
                if (active) setAuth(next);
            } catch (_) {
                clearSession();
                if (active) setAuth(null);
            } finally {
                if (active) setLoading(false);
            }
        };
        boot();
        return () => {
            active = false;
        };
    }, []);

    const value = useMemo(() => ({
        auth,
        user: auth?.user || null,
        isAuthenticated: !!auth,
        loading,
        async login({ emailOrUsername, password, rememberMe }) {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrUsername, password, rememberMe })
            });
            const body = await res.json();
            if (!res.ok || !body.success) {
                throw new Error(body.message || 'Login failed');
            }
            const session = {
                token: body.token,
                expiresAt: body.session?.expiresAt,
                rememberMe: !!rememberMe,
                user: body.data
            };
            writeSession(session, !!rememberMe);
            setAuth(session);
            return body;
        },
        async register(payload) {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const body = await res.json();
            if (!res.ok || !body.success) {
                throw new Error(body.message || 'Registration failed');
            }
            return body;
        },
        async logout() {
            try {
                await fetch('/api/users/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
            } catch (_) {}
            clearSession();
            setAuth(null);
        }
    }), [auth, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
