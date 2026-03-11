const AUTH_SESSION_KEY = 'auth_session';

function safeParse(raw) {
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function clearSessionStorageOnly() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function getStoredSession() {
    const localRaw = localStorage.getItem(AUTH_SESSION_KEY);
    const sessionRaw = sessionStorage.getItem(AUTH_SESSION_KEY);

    return safeParse(localRaw) || safeParse(sessionRaw);
}

function isExpired(expiresAt) {
    if (!expiresAt) return true;
    const time = new Date(expiresAt).getTime();
    if (Number.isNaN(time)) return true;
    return Date.now() >= time;
}

export function clearAuthSession() {
    clearSessionStorageOnly();
}

export function getAuthSession() {
    const data = getStoredSession();
    if (!data) return null;

    if (isExpired(data.expiresAt)) {
        clearSessionStorageOnly();
        return null;
    }

    return data;
}

export function saveAuthSession({ token, expiresAt, user, rememberMe }) {
    const payload = {
        token,
        expiresAt,
        user: user || null,
        rememberMe: !!rememberMe
    };

    clearSessionStorageOnly();

    if (payload.rememberMe) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
    } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
    }
}

export function isAuthenticatedSession() {
    return !!getAuthSession();
}

export function withAutoLogout(onExpire) {
    const session = getAuthSession();
    if (!session || !session.expiresAt) return null;

    const delay = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
    const MAX_TIMEOUT = 2147483647;

    if (delay > MAX_TIMEOUT) {
        return setTimeout(() => {
            withAutoLogout(onExpire);
        }, MAX_TIMEOUT);
    }

    return setTimeout(() => {
        clearAuthSession();
        if (typeof onExpire === 'function') {
            onExpire();
        }
    }, delay);
}
