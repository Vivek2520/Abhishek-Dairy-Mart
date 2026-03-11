import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-6">Checking authentication...</div>;
    }

    if (!isAuthenticated) {
        const returnTo = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    return children;
}
