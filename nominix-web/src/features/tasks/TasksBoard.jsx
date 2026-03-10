import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ClipboardList, Plus, RefreshCcw, Search, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksService } from '../../api/tasksService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskCreateModal from './TaskCreateModal';

export default function TasksBoard({ onSelectTask }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await tasksService.getTasks();
            setTasks(data.results || data || []);
        } catch (error) {
            console.error("Error cargando tareas:", error);
            toast.error("No se pudieron cargar las tareas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
            case 'VERIFIED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'CANCELLED': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'URGENT': return <Badge variant="destructive" className="ml-2">Urgente</Badge>;
            case 'HIGH': return <Badge variant="default" className="ml-2 bg-orange-500">Alta</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-nominix-electric" />
                        Gestor de Tareas Operativas
                    </h2>
                    <p className="text-sm text-slate-500">Asigna, verifica y haz seguimiento de tareas en sedes</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={fetchTasks} disabled={loading} variant="outline" className="gap-2">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-nominix-electric hover:bg-nominix-ocean">
                        <Plus className="w-4 h-4" />
                        Nueva Tarea
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-slate-500">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-500">No hay tareas creadas aún.</div>
                ) : (
                    tasks.map(task => (
                        <Card
                            key={task.id}
                            className="cursor-pointer hover:shadow-md transition-shadow border-t-4 hover:border-nominix-ocean"
                            style={{ borderTopColor: task.status === 'COMPLETED' ? '#22c55e' : (task.status === 'PENDING' ? '#eab308' : '#3b82f6') }}
                            onClick={() => onSelectTask(task.id)}
                        >
                            <CardContent className="p-4 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={getStatusColor(task.status)}>
                                        {task.status_display}
                                    </Badge>
                                    <span className="text-xs text-slate-400 font-mono">#{task.id}</span>
                                </div>

                                <h3 className="font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem] mt-1">
                                    {task.title}
                                    {getPriorityBadge(task.priority)}
                                </h3>

                                <div className="mt-auto pt-4 space-y-2 text-sm text-slate-500">
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-slate-700">{task.sede_name}</span>
                                            <span className="text-xs">{task.assignee_name}</span>
                                        </div>
                                        {task.due_date && (
                                            <div className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {format(new Date(task.due_date), "dd MMM")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <TaskCreateModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchTasks}
            />
        </div>
    );
}
