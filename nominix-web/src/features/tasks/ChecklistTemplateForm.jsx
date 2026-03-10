import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Plus, Trash2,
    GripVertical, ListPlus, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { tasksService } from '../../api/tasksService';
import toast from 'react-hot-toast';

export default function ChecklistTemplateForm({ templateId, onBack }) {
    const isNew = templateId === 'new';
    const [template, setTemplate] = useState({
        name: '',
        description: '',
        frequency: 'MANUAL',
        preferred_time: '',
        preferred_day: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isNew) {
            loadTemplate();
        }
    }, [templateId]);

    const loadTemplate = async () => {
        try {
            setLoading(true);
            const data = await tasksService.getChecklistTemplateDetail(templateId);
            setTemplate({
                name: data.name,
                description: data.description,
                frequency: data.frequency || 'MANUAL',
                preferred_time: data.preferred_time || '',
                preferred_day: data.preferred_day || ''
            });
            setCategories(data.categories || []);

            // Cargar items para cada categoría
            const updatedCategories = await Promise.all((data.categories || []).map(async (cat) => {
                const items = await tasksService.getCategoryItems(cat.id);
                return { ...cat, items: items.results || items || [] };
            }));
            setCategories(updatedCategories);
        } catch (error) {
            toast.error("Error al cargar detalle");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!template.name) return toast.error("El nombre es obligatorio");
        try {
            setSaving(true);
            if (isNew) {
                const res = await tasksService.createChecklistTemplate(template);
                toast.success("Plantilla creada");
                onBack(); // O redirigir al ID recién creado
            } else {
                await tasksService.updateChecklistTemplate(templateId, template);
                toast.success("Datos actualizados");
            }
        } catch (error) {
            toast.error("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const addCategory = async () => {
        if (isNew) return toast.info("Guarda primero la plantilla");
        const name = prompt("Nombre de la nueva categoría (proceso):");
        if (!name) return;
        try {
            const newCat = await tasksService.createCategory(templateId, { name, order: categories.length + 1 });
            setCategories([...categories, { ...newCat, items: [] }]);
            toast.success("Categoría añadida");
        } catch (error) {
            toast.error("Error al crear categoría");
        }
    };

    const addItem = async (catId) => {
        const text = prompt("Punto a evaluar (ítem):");
        if (!text) return;
        const indicator = prompt("Indicador (ej. FACHADA):");
        try {
            const newItem = await tasksService.createItem(catId, {
                text,
                indicator: indicator || "GENERAL",
                order: categories.find(c => c.id === catId).items.length + 1
            });
            setCategories(categories.map(c =>
                c.id === catId ? { ...c, items: [...c.items, newItem] } : c
            ));
            toast.success("Punto añadido");
        } catch (error) {
            toast.error("Error al crear ítem");
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-400">Cargando editor...</div>;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500">
                    <ArrowLeft className="w-4 h-4" /> Volver al listado
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saving} className="bg-nominix-electric hover:bg-nominix-ocean text-white gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Info Principal'}
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-lg">Configuración de la Plantilla</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Nombre del Checklist</label>
                        <input
                            type="text"
                            className="w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-nominix-electric/20 font-bold"
                            placeholder="Ej: Apertura Diaria, Auditoría Legal..."
                            value={template.name}
                            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Descripción Corta</label>
                        <textarea
                            className="w-full bg-white border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-nominix-electric/20 h-24 resize-none"
                            placeholder="Describe para qué sirve este proceso..."
                            value={template.description}
                            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Frecuencia</label>
                            <select
                                className="w-full bg-white border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-nominix-electric/20 text-sm font-bold"
                                value={template.frequency}
                                onChange={(e) => setTemplate({ ...template, frequency: e.target.value })}
                            >
                                <option value="MANUAL">Manual (Bajo demanda)</option>
                                <option value="DAILY">Diario</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="BIWEEKLY">Quincenal</option>
                                <option value="MONTHLY">Mensual</option>
                            </select>
                        </div>

                        {template.frequency !== 'MANUAL' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Hora Sugerida</label>
                                    <input
                                        type="time"
                                        className="w-full bg-white border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-nominix-electric/20 text-sm font-bold"
                                        value={template.preferred_time}
                                        onChange={(e) => setTemplate({ ...template, preferred_time: e.target.value })}
                                    />
                                </div>

                                {template.frequency === 'WEEKLY' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Día de la Semana</label>
                                        <select
                                            className="w-full bg-white border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-nominix-electric/20 text-sm font-bold"
                                            value={template.preferred_day}
                                            onChange={(e) => setTemplate({ ...template, preferred_day: e.target.value })}
                                        >
                                            <option value="">Cualquier día</option>
                                            <option value="1">Lunes</option>
                                            <option value="2">Martes</option>
                                            <option value="3">Miércoles</option>
                                            <option value="4">Jueves</option>
                                            <option value="5">Viernes</option>
                                            <option value="6">Sábado</option>
                                            <option value="7">Domingo</option>
                                        </select>
                                    </div>
                                )}

                                {template.frequency === 'MONTHLY' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Día del Mes</label>
                                        <input
                                            type="number"
                                            min="1" max="31"
                                            className="w-full bg-white border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-nominix-electric/20 text-sm font-bold"
                                            placeholder="1-31"
                                            value={template.preferred_day}
                                            onChange={(e) => setTemplate({ ...template, preferred_day: e.target.value })}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {!isNew && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between pt-4">
                        <h3 className="text-xl font-bold text-slate-800">Estructura del Checklist</h3>
                        <Button variant="outline" size="sm" onClick={addCategory} className="gap-2 border-dashed">
                            <Plus className="w-4 h-4" /> Añadir Proceso / Área
                        </Button>
                    </div>

                    {categories.length === 0 && (
                        <div className="py-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400">
                            <ListPlus className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No has definido procesos para esta plantilla.</p>
                        </div>
                    )}

                    {categories.map((cat, idx) => (
                        <Card key={cat.id} className="border-none shadow-sm overflow-hidden group">
                            <CardHeader className="bg-slate-50/30 px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500">
                                        {idx + 1}
                                    </div>
                                    <h4 className="font-bold text-slate-700 uppercase tracking-wide">{cat.name}</h4>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => addItem(cat.id)} className="text-nominix-electric hover:bg-nominix-electric/5 gap-2">
                                    <Plus className="w-4 h-4" /> Punto evaluable
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {cat.items?.map((item, itemIdx) => (
                                        <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="mt-1 text-slate-200">
                                                    <GripVertical className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-nominix-ocean uppercase tracking-widest mb-0.5">{item.indicator}</div>
                                                    <p className="text-sm text-slate-700">{item.text}</p>
                                                </div>
                                            </div>
                                            <button className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!cat.items || cat.items.length === 0) && (
                                        <div className="p-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                                            Sin ítems en esta categoría
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
