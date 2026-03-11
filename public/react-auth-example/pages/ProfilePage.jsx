import React from 'react';
import { useAuth } from '../AuthContext';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-2">Profile</h2>
            <p>Name: {user?.name || '-'}</p>
            <p>Email: {user?.email || '-'}</p>
            <button className="mt-4 bg-red-600 text-white px-3 py-2 rounded" onClick={logout}>
                Logout
            </button>
        </div>
    );
}
