import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Plus, Check, ChevronDown, Loader2, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

export default function DepartmentSelector({ value, onChange, error, branchId, disabled }) {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, [branchId]);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            // Si no hay sede seleccionada, traemos lista vacía o todas (depende de tu lógica)
            // Aquí forzamos vacía para obligar a seleccionar sede primero
            if (!branchId) {
                setDepartments([]);
                return;
            }
            const response = await axiosClient.get(`/departments/?branch=${branchId}`);
            setDepartments(response.data.results || response.data);
        } catch (err) {
            console.error(err);
            toast.error('Error cargando departamentos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newDeptName.trim()) return;

        if (!branchId) {
            toast.error('Debe seleccionar una Sede primero');
            return;
        }

        setCreateLoading(true);
        try {
            const response = await axiosClient.post('/departments/', {
                name: newDeptName,
                description: 'Creado rápido desde ficha de ingreso',
                branch: branchId
            });

            const newDept = response.data;
            // Optimistic update: agregamos el nuevo y lo seleccionamos
            setDepartments([...departments, newDept]);
            onChange(newDept.id);

            // Reset UI
            setIsCreating(false);
            setNewDeptName('');
            toast.success('Departamento creado');
        } catch (err) {
            console.error(err);
            toast.error('Error creando departamento');
        } finally {
            setCreateLoading(false);
        }
    };

    // --- ESTADO DE CARGA INICIAL ---
    if (loading) return (
        <div className="w-full h-[50px] bg-gray-50 rounded-2xl animate-pulse flex items-center px-4">
            <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
    );

    // --- MODO CREACIÓN ---
    if (isCreating) {
        return (
            <div className="flex gap-2 items-center animate-in fade-in zoom-in-95 duration-200 h-[50px]">
                <div className="relative w-full">
                    <input
                        autoFocus
                        type="text"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="Nombre del departamento..."
                        className="w-full pl-4 pr-4 py-3 bg-white border-2 border-nominix-electric rounded-2xl focus:outline-none font-bold text-sm transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                            if (e.key === 'Escape') setIsCreating(false);
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={createLoading || !newDeptName.trim()}
                    className="h-full aspect-square flex items-center justify-center bg-nominix-electric text-white rounded-xl hover:bg-black transition-colors shadow-lg shadow-nominix-electric/20"
                    title="Guardar"
                >
                    {createLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                </button>

                <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="h-full aspect-square flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Cancelar"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    // --- MODO SELECTOR NORMAL ---
    return (
        <div className="relative">
            <div className="flex gap-2 h-[50px]">
                {/* Wrapper del Select para controlar el icono y flecha */}
                <div className="relative w-full">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />

                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={!branchId || disabled}
                        className={cn(
                            "w-full pl-11 pr-8 py-3 bg-gray-50 border rounded-2xl outline-none font-bold text-sm appearance-none cursor-pointer transition-all h-full",
                            error
                                ? "border-red-300 text-red-900 focus:border-red-500"
                                : "border-gray-100 focus:bg-white focus:border-nominix-electric text-nominix-dark",
                            (!branchId || disabled) && "opacity-60 cursor-not-allowed bg-gray-100"
                        )}
                    >
                        <option value="">
                            {branchId ? "-- Seleccionar Departamento --" : "-- Seleccione Sede Primero --"}
                        </option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    {/* Flecha Custom */}
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <ChevronDown size={14} />
                    </div>
                </div>

                {/* Botón de Nuevo (+) */}
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    disabled={!branchId || disabled}
                    className="h-full aspect-square flex items-center justify-center bg-gray-100 text-gray-400 rounded-xl hover:bg-nominix-electric hover:text-white border border-transparent hover:border-nominix-electric/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Crear nuevo departamento"
                >
                    <Plus size={20} />
                </button>
            </div>

            {error && <p className="mt-1 text-[9px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
}