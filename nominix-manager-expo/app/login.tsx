import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { Lock, User, Eye, EyeOff, Building2 } from 'lucide-react-native';
import { cn } from '@/utils/cn';
import axios from 'axios';
import { API_URL } from '../config';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [isRegister, setIsRegister] = useState(false);

    const [nationalId, setNationalId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const showAlert = (title: string, message: string, buttons?: any[]) => {
        console.log(`Alert requested: ${title} - ${message}`);
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
            if (buttons && buttons.length > 0 && buttons[0].onPress) {
                buttons[0].onPress();
            }
        } else {
            Alert.alert(title, message, buttons);
        }
    };

    const handleAction = async () => {
        console.log('Action triggered:', isRegister ? 'Register' : 'Login');
        if (!nationalId || !password) {
            showAlert('Error', 'Por favor ingresa tu cédula y contraseña');
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                console.log('Setting up account at:', `${API_URL}/api/auth/setup-account/`);
                const response = await axios.post(`${API_URL}/api/auth/setup-account/`, {
                    national_id: nationalId,
                    password: password
                });
                console.log('Registration response received:', response.status);
                showAlert('Éxito', response.data.message, [
                    { text: 'Ir al Login', onPress: () => setIsRegister(false) }
                ]);
            } else {
                console.log('Attempting sign in for ID:', nationalId);
                await signIn(nationalId, password);
                console.log('Sign in successful.');
            }
        } catch (error: any) {
            console.error('Action error:', error);
            console.error('Action error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            const msg = error.response?.data?.error || error.message || 'Error en la operación';
            showAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 px-8 justify-center"
            >
                <View className="items-center mb-10">
                    <View
                        className="w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-6"
                        style={Platform.OS === 'web' ? { boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.4)' } : { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15 }}
                    >
                        <Building2 size={40} color="white" />
                    </View>
                    <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Nominix Manager</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-center px-4">{isRegister ? 'Crea tu contraseña para activar tu acceso móvil' : 'Ingresa tus credenciales para gestionar tu sucursal'}</Text>
                </View>

                <View>
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 ml-1">Cédula de Identidad</Text>
                        <View className="flex-row items-center bg-slate-100 dark:bg-slate-900 rounded-2xl px-4 py-4 border border-transparent focus:border-blue-500">
                            <User size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                            <TextInput
                                placeholder="V-12345678"
                                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                                className="flex-1 ml-3 text-slate-900 dark:text-white font-medium"
                                value={nationalId}
                                onChangeText={setNationalId}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 ml-1">{isRegister ? 'Nueva Contraseña' : 'Contraseña'}</Text>
                        <View className="flex-row items-center bg-slate-100 dark:bg-slate-900 rounded-2xl px-4 py-4 border border-transparent focus:border-blue-500">
                            <Lock size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                            <TextInput
                                placeholder="••••••••"
                                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                                className="flex-1 ml-3 text-slate-900 dark:text-white font-medium"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} color={isDark ? '#94a3b8' : '#64748b'} /> : <Eye size={20} color={isDark ? '#94a3b8' : '#64748b'} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    className={cn("bg-blue-600 rounded-2xl py-4 mt-6 items-center", loading && "opacity-70")}
                    style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)' } : { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }}
                    onPress={handleAction}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</Text>}
                </TouchableOpacity>

                <TouchableOpacity className="mt-6 self-center" onPress={() => setIsRegister(!isRegister)}>
                    <Text className="text-blue-600 dark:text-blue-400 font-medium">
                        {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Regístrate aquí'}
                    </Text>
                </TouchableOpacity>

                {!isRegister && (
                    <TouchableOpacity className="mt-4 self-center">
                        <Text className="text-slate-400 dark:text-slate-500 text-sm">¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>
                )}

                <View className="mt-auto mb-4 items-center">
                    <Text className="text-slate-400 dark:text-slate-600 text-xs text-center">v1.0.0 • Nominix SaaS</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
