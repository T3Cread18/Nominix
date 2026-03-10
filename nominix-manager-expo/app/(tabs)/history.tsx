import React from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';

export default function HistoryScreen() {
    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />
            <View className="bg-white px-6 pt-16 pb-8 border-b border-slate-100">
                <Text className="text-2xl font-black text-slate-800">Historial</Text>
                <Text className="text-slate-400 font-medium">Registro de actividades pasadas</Text>
            </View>
            <ScrollView className="flex-1 p-6">
                <View className="bg-white p-8 rounded-[30px] items-center justify-center border border-slate-100 shadow-sm">
                    <Text className="text-slate-400 italic">No hay registros previos</Text>
                </View>
            </ScrollView>
        </View>
    );
}
