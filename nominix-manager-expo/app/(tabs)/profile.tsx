import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { LogOut, CircleUser } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />
            <View className="bg-white px-6 pt-16 pb-12 rounded-b-[40px] shadow-sm items-center">
                <View
                    className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center mb-4 border-4 border-white"
                    style={Platform.OS === 'web' ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' } : { elevation: 3 }}
                >
                    <CircleUser size={60} color="#0088CC" />
                </View>
                <Text className="text-2xl font-black text-slate-800">{user?.name || 'Administrador'}</Text>
                <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gerente de Sede</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                <TouchableOpacity
                    onPress={signOut}
                    className="bg-rose-50 p-5 rounded-[25px] flex-row items-center gap-4 border border-rose-100"
                >
                    <View className="w-10 h-10 bg-rose-500 rounded-xl items-center justify-center">
                        <LogOut size={20} color="white" />
                    </View>
                    <Text className="text-rose-600 font-black uppercase text-sm">Cerrar Sesión</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
