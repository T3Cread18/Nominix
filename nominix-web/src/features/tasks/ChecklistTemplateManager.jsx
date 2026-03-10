import React, { useState, useEffect } from 'react';
import {
    Plus, FileText, Trash2, Edit2,
    MoreVertical, ListChecks, ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { tasksService } from '../../api/tasksService';
import toast from 'react-hot-toast';

export default function ChecklistTemplateManager({ onSelectTemplate }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await tasksService.getChecklistTemplates();
            setTemplates(data.results || data || []);
        } catch (error) {
            toast.error("Error al cargar plantillas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
        try {
            await tasksService.deleteChecklistTemplate(id);
            toast.success("Plantilla eliminada");
            fetchTemplates();
        } catch (error) {
            toast.error("No se pudo eliminar la plantilla");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Plantillas de Checklists</h2>
                    <p className="text-sm text-slate-500">Administra los procesos estructurados de auditoría.</p>
                </div>
                <Button className="bg-nominix-electric hover:bg-nominix-ocean text-white gap-2" onClick={() => onSelectTemplate('new')}>
                    <Plus className="w-4 h-4" /> Nueva Plantilla
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400">Cargando plantillas...</div>
                ) : templates.length === 0 ? (
                    <Card className="col-span-full py-20 border-dashed">
                        <CardContent className="flex flex-col items-center">
                            <FileText className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium text-lg">No hay plantillas creadas</p>
                            <Button variant="ghost" className="mt-4 text-nominix-electric" onClick={() => onSelectTemplate('new')}>
                                Crear la primera ahora
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    templates.map(tpl => (
                        <Card key={tpl.id} className="hover:shadow-md transition-all group overflow-hidden border-none shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-nominix-electric shadow-sm">
                                        <ListChecks className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800">{tpl.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onSelectTemplate(tpl.id)} className="p-1.5 text-slate-400 hover:text-nominix-electric">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(tpl.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-600 line-clamp-2 h-10 mb-4 italic">
                                    {tpl.description || "Sin descripción proporcionada."}
                                </p>
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="bg-nominix-electric/10 text-nominix-electric border-none">
                                        {tpl.items_count} Puntos evaluables
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-nominix-ocean" onClick={() => onSelectTemplate(tpl.id)}>
                                        Gestionar <ArrowRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
