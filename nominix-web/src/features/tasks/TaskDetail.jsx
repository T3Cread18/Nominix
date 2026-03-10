import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, CheckCircle2, Clock, MapPin, User, Image as ImageIcon, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksService } from '../../api/tasksService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TaskDetail({ taskId, onBack }) {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const data = await tasksService.getTaskDetail(taskId);
                setTask(data);
            } catch (error) {
                console.error("Error al cargar detalle de tarea:", error);
                toast.error("No se pudo cargar la información operativa");
                onBack();
            } finally {
                setLoading(false);
            }
        };

        if (taskId) {
            fetchDetail();
        }
    }, [taskId, onBack]);

    const handleVerify = async () => {
        try {
            setVerifying(true);
            await tasksService.updateTaskStatus(taskId, 'VERIFIED');
            toast.success("Tarea verificada y cerrada exitosamente");
            onBack();
        } catch (error) {
            toast.error("Ocurrió un error al intentar verificar la tarea");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando reporte operativo...</div>;
    }

    if (!task) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        Tarea #{task.id}
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Detalles de la Tarea (Izquierda) */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b">
                            <CardTitle className="text-lg">Información General</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500">Título</h3>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-500">Descripción</h3>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{task.category_name}</Badge>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{task.priority_display}</Badge>
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <div className="flex items-center text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="font-medium">{task.sede_name}</span>
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <User className="w-4 h-4 mr-2" />
                                    <span>Asignado a: <span className="font-medium">{task.assignee_name}</span></span>
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Clock className="w-4 h-4 mr-2 text-orange-500" />
                                    <span>Vence: {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy HH:mm", { locale: es }) : 'Sin fecha'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Acciones de Verificación */}
                    {task.status === 'COMPLETED' ? (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4 text-center space-y-4">
                                <p className="text-green-800 font-medium text-sm">El empleado ha marcado esta tarea como Completada. Revisa la evidencia y ciérrala.</p>
                                <Button
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {verifying ? 'Verificando...' : 'Aprobar y Cerrar Tarea'}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : task.status === 'VERIFIED' ? (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-3 text-indigo-700">
                            <CheckCircle2 className="w-6 h-6" />
                            <div>
                                <p className="font-bold">Tarea Verificada</p>
                                <p className="text-xs">Este asunto ha sido concluido y auditado visualmente.</p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Evidencia (Derecha) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Checklist Resultados si existe */}
                    {task.checklist_answers && task.checklist_answers.length > 0 && (
                        <Card className="border-nominix-electric/30">
                            <CardHeader className="bg-nominix-ocean/5 border-b flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-nominix-electric" />
                                    Resultados: {task.checklist_template_name}
                                </CardTitle>
                                <Badge variant="secondary" className="bg-nominix-electric text-white">
                                    {Math.round((task.checklist_answers.filter(a => a.status === 'OK').length / task.checklist_answers.length) * 100)}% CUMPLE
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden">
                                {Object.entries(
                                    task.checklist_answers.reduce((acc, ans) => {
                                        const cat = ans.item_details.category_name;
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(ans);
                                        return acc;
                                    }, {})
                                ).map(([category, answers]) => (
                                    <div key={category} className="border-b last:border-0">
                                        <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {category}
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {answers.map(ans => (
                                                <div key={ans.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                                                    <div className="flex-1">
                                                        <div className="text-xs font-semibold text-nominix-ocean mb-0.5">{ans.item_details.indicator}</div>
                                                        <div className="text-sm text-slate-700">{ans.item_details.text}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {ans.status === 'OK' ? (
                                                            <Badge className="bg-green-500 hover:bg-green-500">CUMPLE</Badge>
                                                        ) : ans.status === 'NOK' ? (
                                                            <Badge variant="destructive">NO CUMPLE</Badge>
                                                        ) : ans.status === 'NA' ? (
                                                            <Badge variant="outline" className="text-slate-400 border-slate-300">N/A</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">PENDIENTE</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                Evidencia Multimedia
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {task.evidences && task.evidences.length > 0 ? (
                                <div className="divide-y">
                                    {task.evidences.map((evidence, index) => (
                                        <div key={index} className="p-6">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                                <User className="w-4 h-4" />
                                                <span>Subido por <strong>{evidence.uploaded_by_name}</strong> el {format(new Date(evidence.uploaded_at), "dd MMM HH:mm", { locale: es })}</span>
                                            </div>

                                            {evidence.image && (
                                                <div className="mb-4 rounded-xl overflow-hidden border bg-slate-100 flex justify-center">
                                                    <img
                                                        src={evidence.image}
                                                        alt="Evidencia Operativa"
                                                        className="max-h-[500px] object-contain"
                                                    />
                                                </div>
                                            )}

                                            {evidence.notes && (
                                                <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3 mt-4">
                                                    <MessageSquare className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                                    <div className="text-sm text-yellow-800 whitespace-pre-wrap">
                                                        <span className="font-bold block mb-1">Nota del Colaborador:</span>
                                                        {evidence.notes}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-slate-500 text-lg">No hay evidencia subida aún</p>
                                    <p className="text-slate-400 text-sm mt-1">El personal de sede debe reportar el avance desde la aplicación móvil.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
