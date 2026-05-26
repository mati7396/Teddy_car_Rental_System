import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const token = localStorage.getItem('teddy_token');
        if (token) {
            try {
                const userData = await api.get('/auth/profile');
                setUser(userData);
                return userData;
            } catch (error) {
                localStorage.removeItem('teddy_token');
                setUser(null);
            }
        }
    };

    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('teddy_token', data.token);
        setUser(data.user);
        return data.user;
    };

    const driverLogin = async (email, password) => {
        const data = await api.post('/drivers/login', { email, password });
        localStorage.setItem('teddy_token', data.token);
        setUser(data.user);
        return data.user;
    };


    const register = async (userData) => {
        const data = await api.post('/auth/register', userData);
        localStorage.setItem('teddy_token', data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = useCallback(() => {
        localStorage.removeItem('teddy_token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, login, driverLogin, logout, register, loading, isAuthenticated: !!user, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
