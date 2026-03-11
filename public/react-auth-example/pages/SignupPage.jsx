import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function SignupPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            await register(form);
            setMessage('Registration complete. Verify OTP then login.');
            window.setTimeout(() => navigate('/login', { replace: true }), 1000);
        } catch (err) {
            setError(err.message || 'Registration failed');
        }
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
            {error ? <p className="text-red-600 mb-3">{error}</p> : null}
            {message ? <p className="text-green-700 mb-3">{message}</p> : null}
            <form onSubmit={onSubmit} className="space-y-3">
                <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    required
                />
                <input
                    className="w-full border rounded px-3 py-2"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
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
                <input
                    className="w-full border rounded px-3 py-2"
                    type="password"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                    required
                />
                <button className="w-full bg-green-600 text-white rounded px-3 py-2" type="submit">
                    Register
                </button>
            </form>
            <p className="mt-4 text-sm">
                Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
            </p>
        </div>
    );
}
