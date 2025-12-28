import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

/**
 * AuthProvider - Maneja el estado global de autenticación.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState(null);

    // Verificar sesión al cargar
    useEffect(() => {
        checkAuth();
        fetchTenantInfo();
    }, []);

    const fetchTenantInfo = async () => {
        try {
            const response = await axiosClient.get('/tenant-info/');
            setTenant(response.data.tenant);
        } catch (error) {
            console.error("No se pudo obtener info del tenant");
        }
    };

    const checkAuth = async () => {
        try {
            const response = await axiosClient.get('/auth/me/');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const response = await axiosClient.post('/auth/login/', { username, password });
        setUser(response.data);
        return response.data;
    };

    const logout = async () => {
        await axiosClient.post('/auth/logout/');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, tenant, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
