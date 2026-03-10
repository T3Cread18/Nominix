import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Settings,
  CircleUser,
  Sun,
  ClipboardList,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config';
import { cn } from '../../utils/cn';

interface TaskItem {
  id: number;
  title: string;
  description?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  priority_display: string;
  category_name: string;
  status: 'PENDING' | 'COMPLETED' | 'IN_PROGRESS';
  sede_name: string;
  due_date: string;
  checklist_progress?: { answered: number; total: number };
}

const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === 'URGENT' || priority === 'HIGH') {
    return (
      <View className="bg-orange-100 px-3 py-1 rounded-lg">
        <Text className="text-orange-700 text-[10px] font-bold uppercase tracking-wider">Alta Prio</Text>
      </View>
    );
  }
  return null;
};
const formatTaskDate = (dateStr: string) => {
  if (!dateStr) return 'Pendiente';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  } catch (e) {
    return dateStr;
  }
};

export default function ManagerHome() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/audits/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const tasksData = response.data.results || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTasks();
    }
  }, [authLoading, token]);

  const taskList = Array.isArray(tasks) ? tasks : [];
  const activeTask = taskList.find(t => t.status !== 'COMPLETED');
  const upcomingTasks = taskList.filter(t => t.id !== activeTask?.id);


  if ((loading || authLoading) && tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0088CC" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="light-content" />

      {/* Blue Header Section */}
      <View
        className="bg-[#0088CC] px-6 pt-16 pb-12 rounded-b-[40px]"
        style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(0, 136, 204, 0.2)' } : { elevation: 10 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center border border-white/30">
              <CircleUser size={30} color="white" />
            </View>
            <View>
              <Text className="text-white/80 text-sm font-medium">Hola, {user?.name?.split(' ')[0] || 'Carlos'}</Text>
              <Text className="text-white text-xl font-bold">Sede Centro</Text>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Settings size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 -mt-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Active Task (Hero Card) */}
        {activeTask && (
          <View className="px-6 mb-8">
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/task/[id]", params: { id: activeTask.id } })}
              className="bg-white p-6 rounded-[30px] border border-slate-100"
              style={Platform.OS === 'web' ? { boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)' } : { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }}
              activeOpacity={0.9}
            >
              <View className="flex-row justify-between items-start mb-6">
                <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center">
                  <Sun size={32} color="#3b82f6" strokeWidth={2.5} />
                </View>
                <PriorityBadge priority={activeTask.priority} />
              </View>

              <Text className="text-2xl font-black text-slate-800 mb-1">{activeTask.title}</Text>
              <Text className="text-slate-500 font-medium mb-6 text-base">{activeTask.description || 'Cumplimiento de estándares operativos.'}</Text>

              {/* Progress Tracker */}
              <View className="mb-2">
                <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <View className={cn("h-full rounded-full", (activeTask.checklist_progress?.total || 0) > 0 && activeTask.checklist_progress!.answered === activeTask.checklist_progress!.total ? "bg-green-400" : "bg-blue-400")} style={{ width: `${(activeTask.checklist_progress?.total || 0) > 0 ? Math.round((activeTask.checklist_progress!.answered / activeTask.checklist_progress!.total) * 100) : 0}%` }} />
                </View>
              </View>
              <View className="flex-row justify-end">
                <Text className="text-slate-400 text-xs font-bold">{activeTask.checklist_progress?.answered || 0} / {activeTask.checklist_progress?.total || 0} completados</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Title */}
        <View className="px-8 mb-4">
          <Text className="text-slate-400 font-black tracking-[0.15em] text-sm">PRÓXIMOS</Text>
        </View>

        {/* Upcoming Tasks List */}
        <View className="px-6 gap-4">
          {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}
              className="bg-white p-6 rounded-[30px] border border-slate-100 flex-row items-center"
              style={Platform.OS === 'web' ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' } : { elevation: 2 }}
              activeOpacity={0.8}
            >
              <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center mr-4">
                <ClipboardList size={26} color="#a855f7" />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-lg font-bold text-slate-800">{task.title}</Text>
                  <Text className="text-slate-400 text-xs font-bold">{formatTaskDate(task.due_date)}</Text>
                </View>
                <Text className="text-slate-500 text-sm" numberOfLines={1}>
                  {task.description || 'Gestión periódica de la sucursal.'}
                </Text>
              </View>
            </TouchableOpacity>
          )) : (
            <View className="items-center py-8">
              <Text className="text-slate-400 font-medium italic">No hay tareas programadas</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
