import React, { useState } from 'react';
import { Plus, Check, ChevronDown, Loader2, X, Layers, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '../hooks/useOrganization';

export default function DepartmentSelector({ value, onChange, error, branchId, disabled }) {
    const { data: departments = [], isLoading } = useDepartments(branchId, { enabled: !!branchId });
    const createMutation = useCreateDepartment();
    const updateMutation = useUpdateDepartment();

    const [mode, setMode] = useState(null); // null | 'create' | 'edit'
    const [draftName, setDraftName] = useState('');

    const selectedId = typeof value === 'object' ? value?.id : value;
    const selectedDept = departments.find(d => String(d.id) === String(selectedId));

    const openCreate = () => {
        setDraftName('');
        setMode('create');
    };

    const openEdit = () => {
        if (selectedDept) {
            setDraftName(selectedDept.name);
            setMode('edit');
        }
    };

    const handleSave = async () => {
        if (!draftName.trim()) return;

        if (mode === 'create') {
            if (!branchId) {
                toast.error('Debe seleccionar una Sede primero');
                return;
            }
            try {
                const newDept = await createMutation.mutateAsync({
                    name: draftName,
                    description: '',
                    branch: branchId
                });
                onChange(newDept.id);
                setMode(null);
            } catch (err) {
                console.error(err);
            }
        } else if (mode === 'edit' && selectedDept) {
            try {
                await updateMutation.mutateAsync({ id: selectedDept.id, name: draftName, branch: branchId });
                setMode(null);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (isLoading && branchId) return (
        <div className="w-full h-[50px] bg-gray-50 rounded-2xl animate-pulse flex items-center px-4">
            <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
    );

    if (mode) {
        return (
            <div className="flex gap-2 items-center animate-in fade-in zoom-in-95 duration-200 h-[50px]">
                <div className="relative w-full">
                    <input
                        autoFocus
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder={mode === 'create' ? 'Nombre del departamento...' : 'Nuevo nombre...'}
                        className="w-full pl-4 pr-4 py-3 bg-white border-2 border-nominix-electric rounded-2xl focus:outline-none font-bold text-sm transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                            if (e.key === 'Escape') setMode(null);
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !draftName.trim()}
                    className="h-full aspect-square flex items-center justify-center bg-nominix-electric text-white rounded-xl hover:bg-black transition-colors shadow-lg shadow-nominix-electric/20 disabled:opacity-50"
                    title="Guardar"
                >
                    {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                </button>

                <button
                    type="button"
                    onClick={() => setMode(null)}
                    className="h-full aspect-square flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Cancelar"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex gap-2 h-[50px]">
                <div className="relative w-full">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select
                        value={selectedId || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={!branchId || disabled}
                        className={cn(
                            'w-full pl-10 pr-10 p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark appearance-none cursor-pointer',
                            'focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300',
                            error ? 'border-red-300 focus:border-red-500' : 'border-gray-100/50',
                            (!branchId || disabled) && 'opacity-60 cursor-not-allowed bg-gray-100/50'
                        )}
                    >
                        <option value="">
                            {branchId ? '-- Seleccionar Departamento --' : '-- Seleccione Sede Primero --'}
                        </option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <ChevronDown size={16} strokeWidth={3} />
                    </div>
                </div>

                {selectedDept && !disabled && (
                    <button
                        type="button"
                        onClick={openEdit}
                        className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-amber-50 hover:text-amber-500 border border-gray-100/50 transition-all duration-300"
                        title="Editar departamento"
                    >
                        <Edit3 size={16} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={openCreate}
                    disabled={!branchId || disabled}
                    className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-nominix-electric hover:text-white border border-gray-100/50 hover:border-nominix-electric/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Crear nuevo departamento"
                >
                    <Plus size={20} />
                </button>
            </div>

            {error && <p className="mt-1 text-[9px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
}
