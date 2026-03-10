import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext<{
    user: any | null;
    token: string | null;
    signIn: (nationalId: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isLoading: boolean;
}>({
    user: null,
    token: null,
    signIn: async () => { },
    signOut: async () => { },
    isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    async function loadStorageData() {
        try {
            let authDataSerialized = null;
            if (Platform.OS === 'web') {
                authDataSerialized = localStorage.getItem('auth_data');
            } else {
                authDataSerialized = await SecureStore.getItemAsync('auth_data');
            }

            if (authDataSerialized) {
                const _authData = JSON.parse(authDataSerialized);
                setUser(_authData.user);
                setToken(_authData.token);

                // Configurar axios global
                axios.defaults.headers.common['Authorization'] = `Bearer ${_authData.token}`;
            }
        } catch (e) {
            console.log('Error loading auth data', e);
        } finally {
            setIsLoading(false);
        }
    }

    const signIn = async (nationalId: string, password: string) => {
        console.log('AuthContext: Attempting signIn for:', nationalId);
        try {
            const response = await axios.post(`${API_URL}/api/token/`, {
                username: nationalId,
                password: password,
            });
            console.log('AuthContext: SignIn success status:', response.status);

            const { access, refresh, full_name, employee_id } = response.data;
            const authData = {
                token: access,
                user: {
                    id: employee_id,
                    name: full_name,
                }
            };

            setUser(authData.user as any);
            setToken(access);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

            if (Platform.OS === 'web') {
                localStorage.setItem('auth_data', JSON.stringify(authData));
            } else {
                await SecureStore.setItemAsync('auth_data', JSON.stringify(authData));
            }
            console.log('AuthContext: Auth data stored, navigating...');
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('AuthContext: SignIn error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
        }
    };

    const signOut = async () => {
        setUser(null);
        setToken(null);
        delete axios.defaults.headers.common['Authorization'];

        if (Platform.OS === 'web') {
            localStorage.removeItem('auth_data');
        } else {
            await SecureStore.deleteItemAsync('auth_data');
        }

        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, signIn, signOut, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
