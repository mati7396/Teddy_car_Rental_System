import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // For admin routes, redirect to admin login
        let loginPath = '/login';
        if (location.pathname.startsWith('/admin')) loginPath = '/admin/login';
        if (location.pathname.startsWith('/driver')) loginPath = '/driver/login';
        
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        // Role not authorized, redirect to their home dashboard
        const homePath = user.role === 'ADMIN' ? '/admin/dashboard' :
            user.role === 'EMPLOYEE' ? '/employee/dashboard' : 
            user.role === 'DRIVER' ? '/driver/dashboard' : '/';
        return <Navigate to={homePath} replace />;
    }

    return children;
};

export default ProtectedRoute;
