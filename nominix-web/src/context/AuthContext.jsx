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
        initAuth();
    }, []);

    const initAuth = async () => {
        if (!loading) setLoading(true);
        try {
            // Obtener info del usuario y del tenant en paralelo para velocidad
            const [userRes, tenantRes] = await Promise.allSettled([
                axiosClient.get('/auth/me/'),
                axiosClient.get('/tenant-info/')
            ]);

            if (userRes.status === 'fulfilled') {
                setUser(userRes.value.data);
            } else {
                setUser(null);
            }

            if (tenantRes.status === 'fulfilled') {
                setTenant(tenantRes.value.data.tenant);
            }
        } catch (error) {
            console.error("Error crítico en inicialización de AuthContext", error);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        try {
            const response = await axiosClient.get('/auth/me/');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        }
    };

    const login = async (username, password) => {
        const response = await axiosClient.post('/auth/login/', { username, password });
        setUser(response.data);
        setUser(response.data);

        // Intentar obtener info del tenant, pero no bloquear el login si falla
        try {
            const tenantRes = await axiosClient.get('/tenant-info/');
            setTenant(tenantRes.data.tenant);
        } catch (error) {
            console.warn("No se pudo obtener info del tenant al hacer login", error);
        }

        return response.data;
    };

    const logout = async () => {
        await axiosClient.post('/auth/logout/');
        setUser(null);
        setTenant(null);
    };

    return (
        <AuthContext.Provider value={{ user, tenant, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
