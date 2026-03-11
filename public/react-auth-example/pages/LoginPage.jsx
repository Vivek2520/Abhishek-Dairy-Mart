import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function useReturnTo() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    return returnTo && returnTo.startsWith('/') ? returnTo : '/';
}

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const returnTo = useReturnTo();
    const [form, setForm] = useState({
        emailOrUsername: '',
        password: '',
        rememberMe: true
    });
    const [error, setError] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(form);
            navigate(returnTo, { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            {error ? <p className="text-red-600 mb-3">{error}</p> : null}
            <form onSubmit={onSubmit} className="space-y-3">
                <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="Email or username"
                    value={form.emailOrUsername}
                    onChange={(e) => setForm((s) => ({ ...s, emailOrUsername: e.target.value }))}
                    required
                />
                <input
                    className="w-full border rounded px-3 py-2"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    required
                />
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.rememberMe}
                        onChange={(e) => setForm((s) => ({ ...s, rememberMe: e.target.checked }))}
                    />
                    Remember me
                </label>
                <button className="w-full bg-blue-600 text-white rounded px-3 py-2" type="submit">
                    Login
                </button>
            </form>
            <p className="mt-4 text-sm">
                New customer? <Link to="/signup" className="text-blue-600">Create an account</Link>
            </p>
        </div>
    );
}
