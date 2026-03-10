import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    TextInput,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Check,
    X,
    Minus,
    Camera,
    Send
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/config';
import { cn } from '@/utils/cn';

interface ItemDetails {
    indicator: string;
    text: string;
    requires_image: boolean;
    category_name?: string;
}

interface ChecklistAnswer {
    id: number;
    item: number;
    item_details: ItemDetails;
    status: 'OK' | 'NOK' | 'NA' | null;
    comments: string;
    image: string | null;
}

interface TaskDetail {
    id: number;
    title: string;
    description: string;
    category_name: string;
    status: string;
    checklist_template_name: string;
    checklist_answers: ChecklistAnswer[];
}

export default function TaskDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { token } = useAuth();

    const [task, setTask] = useState<TaskDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchTaskDetail = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/audits/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTask(response.data);
        } catch (error) {
            console.error('Error fetching task detail:', error);
            Alert.alert('Error', 'No se pudo cargar el detalle de la tarea');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetail();
    }, [id]);

    const updateAnswer = async (answerId: number, fields: Partial<ChecklistAnswer>) => {
        try {
            // Optimistic update
            if (task) {
                setTask({
                    ...task,
                    checklist_answers: task.checklist_answers.map(a =>
                        a.id === answerId ? { ...a, ...fields } : a
                    )
                });
            }

            const targetAnswer = task?.checklist_answers.find(a => a.id === answerId);
            if (!targetAnswer) return;

            await axios.patch(`${API_URL}/api/audits/${id}/checklist/${targetAnswer.item}/`, fields, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error updating answer:', error);
            // Revert optimization if needed (omitted for brevity in this first pass)
        }
    };

    const handleFinalize = async () => {
        try {
            setSubmitting(true);
            await axios.patch(`${API_URL}/api/audits/${id}/status/`, {
                status: 'COMPLETED'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.back();
        } catch (error) {
            console.error('Error finalizing task:', error);
            Alert.alert('Error', 'No se pudo finalizar la tarea');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#0088CC" />
            </View>
        );
    }

    if (!task) return null;

    // Agrupar respuestas por categoría
    const groupedAnswers = task.checklist_answers.reduce((acc, answer) => {
        const categoryMatch = answer.item_details.category_name;
        const categoryName = categoryMatch ? categoryMatch : 'Sin Categoría';
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(answer);
        return acc;
    }, {} as Record<string, ChecklistAnswer[]>);

    // Calcular cumplimiento
    const totalItems = task.checklist_answers.length;
    const okItems = task.checklist_answers.filter(a => a.status === 'OK').length;
    const compliancePercentage = totalItems > 0 ? Math.round((okItems / totalItems) * 100) : 0;

    return (
        <View className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="bg-white px-6 pt-14 pb-6 border-b border-slate-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full mr-4"
                >
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <View className="flex-1 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                        <Text className="text-xl font-bold text-slate-800" numberOfLines={1}>{task.title}</Text>
                        <Text className="text-slate-400 text-xs font-medium">Categoría: {task.category_name}</Text>
                    </View>
                    
                    {/* Compliance Badge */}
                    <View className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 items-center">
                        <Text className="text-xs font-black text-slate-700">CUMPLIMIENTO</Text>
                        <Text className={cn("text-lg font-black", compliancePercentage >= 80 ? "text-green-600" : compliancePercentage >= 50 ? "text-yellow-600" : "text-red-500")}>
                            {compliancePercentage}%
                        </Text>
                    </View>
                </View>
            </View>

            {/* Compliance Progress Bar */}
            <View className="h-1.5 w-full bg-slate-100">
                <View 
                    className={cn("h-full", compliancePercentage >= 80 ? "bg-green-500" : compliancePercentage >= 50 ? "bg-yellow-500" : "bg-red-500")} 
                    style={{ width: `${compliancePercentage}%` }} 
                />
            </View>

            <ScrollView
                className="flex-1 px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {Object.entries(groupedAnswers).map(([category, items]) => (
                    <View key={category} className="mb-8">
                        {/* Category Header */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-2 h-2 rounded-full bg-[#0088CC] mr-2" />
                            <Text className="text-slate-500 font-bold uppercase tracking-wider text-sm">{category}</Text>
                        </View>

                        {/* Category Items */}
                        {items.map((answer) => (
                            <View
                                key={answer.id}
                                className="bg-white rounded-[30px] p-6 mb-4 border border-slate-100"
                                style={Platform.OS === 'web' ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' } : { elevation: 2 }}
                            >
                                <Text className="text-lg font-bold text-slate-800 mb-1">
                                    {answer.item_details.indicator || 'Ítem de control'}
                                </Text>
                                <Text className="text-slate-500 mb-6 text-sm">
                                    {answer.item_details.text}
                                </Text>

                                {/* Response Buttons */}
                                <View className="flex-row gap-3 mb-6">
                                    <TouchableOpacity
                                        onPress={() => updateAnswer(answer.id, { status: 'OK' })}
                                        className={cn(
                                            "flex-1 flex-row items-center justify-center py-3 rounded-2xl border",
                                            answer.status === 'OK'
                                                ? "bg-green-50 border-green-200"
                                                : "bg-white border-slate-100"
                                        )}
                                    >
                                        <Check size={18} color={answer.status === 'OK' ? '#16a34a' : '#94a3b8'} strokeWidth={3} />
                                        <Text className={cn("ml-2 font-bold", answer.status === 'OK' ? "text-green-700" : "text-slate-400")}>OK</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => updateAnswer(answer.id, { status: 'NOK' })}
                                        className={cn(
                                            "flex-1 flex-row items-center justify-center py-3 rounded-2xl border",
                                            answer.status === 'NOK'
                                                ? "bg-red-50 border-red-200"
                                                : "bg-white border-slate-100"
                                        )}
                                    >
                                        <X size={18} color={answer.status === 'NOK' ? '#dc2626' : '#94a3b8'} strokeWidth={3} />
                                        <Text className={cn("ml-2 font-bold", answer.status === 'NOK' ? "text-red-700" : "text-slate-400")}>NOK</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => updateAnswer(answer.id, { status: 'NA' })}
                                        className={cn(
                                            "flex-1 flex-row items-center justify-center py-3 rounded-2xl border",
                                            answer.status === 'NA'
                                                ? "bg-slate-50 border-slate-200"
                                                : "bg-white border-slate-100"
                                        )}
                                    >
                                        <Minus size={18} color={answer.status === 'NA' ? '#475569' : '#94a3b8'} strokeWidth={3} />
                                        <Text className={cn("ml-2 font-bold", answer.status === 'NA' ? "text-slate-700" : "text-slate-400")}>N/A</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Photo Button */}
                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200"
                                >
                                    <Camera size={20} color="#64748b" className="mr-2" />
                                    <Text className="text-slate-600 font-bold ml-2">Tomar Foto (Obligatorio)</Text>
                                </TouchableOpacity>

                                {/* Comment Section */}
                                {answer.status === 'NOK' && (
                                    <View className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <TextInput
                                            placeholder="Agregar comentario/plan de acción..."
                                            placeholderTextColor="#94a3b8"
                                            className="text-slate-800 text-sm"
                                            multiline
                                            value={answer.comments || ''}
                                            onChangeText={(text) => {
                                                if (task) {
                                                    setTask({
                                                        ...task,
                                                        checklist_answers: task.checklist_answers.map(a =>
                                                            a.id === answer.id ? { ...a, comments: text } : a
                                                        )
                                                    });
                                                }
                                            }}
                                            onBlur={() => updateAnswer(answer.id, { comments: answer.comments })}
                                        />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>

            {/* Sticky Bottom Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-slate-100 p-6 pb-10">
                <TouchableOpacity
                    onPress={handleFinalize}
                    disabled={submitting}
                    className={cn(
                        "bg-slate-300 py-5 rounded-[24px] flex-row items-center justify-center shadow-lg",
                        submitting && "opacity-70",
                        task.checklist_answers.every(a => a.status !== null) && "bg-blue-600"
                    )}
                    style={task.checklist_answers.every(a => a.status !== null) ? (Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' } : { elevation: 8 }) : {}}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Send size={24} color="white" className="mr-2" />
                            <Text className="text-white font-black text-xl ml-2">Finalizar y Firmar</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
