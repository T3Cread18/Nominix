import React, { useState } from 'react';
import { Plus, Check, ChevronDown, Loader2, X, Briefcase, Edit3 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useJobPositions, useCreateJobPosition, useUpdateJobPosition } from '../hooks/useOrganization';

const EMPTY_FORM = { name: '', code: '', default_total_salary: '', currency: 'USD' };

/**
 * Selector de Cargo (JobPosition) con acciones inline de crear y editar.
 *
 * Props:
 *  - value: ID del cargo seleccionado
 *  - onChange(id): notifica el nuevo ID seleccionado al formulario padre
 *  - onJobSelected(job): notifica el objeto completo para auto-rellenar salarios
 *  - departmentId: filtra los cargos por departamento
 *  - disabled: deshabilita el selector
 *  - error: mensaje de error
 */
export default function JobPositionSelector({ value, onChange, onJobSelected, error, departmentId, disabled }) {
    const { data: positions = [], isLoading } = useJobPositions(departmentId, { enabled: !!departmentId });
    const createMutation = useCreateJobPosition();
    const updateMutation = useUpdateJobPosition();

    const [mode, setMode] = useState(null); // null | 'create' | 'edit'
    const [form, setForm] = useState(EMPTY_FORM);

    const selectedId = typeof value === 'object' ? value?.id : value;
    const selectedPos = positions.find(p => String(p.id) === String(selectedId));

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setMode('create');
    };

    const openEdit = () => {
        if (selectedPos) {
            setForm({
                name: selectedPos.name,
                code: selectedPos.code,
                default_total_salary: selectedPos.default_total_salary ?? '',
                currency: selectedPos.currency?.code || selectedPos.currency || 'USD',
            });
            setMode('edit');
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.code.trim()) return;
        try {
            if (mode === 'create') {
                const newPos = await createMutation.mutateAsync({
                    ...form,
                    department: departmentId,
                });
                onChange(String(newPos.id));
                onJobSelected?.(newPos);
            } else if (mode === 'edit' && selectedPos) {
                const updated = await updateMutation.mutateAsync({
                    id: selectedPos.id,
                    ...form,
                    department: departmentId,
                });
                onJobSelected?.(updated);
            }
            setMode(null);
        } catch (e) {
            console.error(e);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (isLoading && departmentId) return (
        <div className="w-full h-[50px] bg-gray-50 rounded-2xl animate-pulse flex items-center px-4">
            <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
    );

    // --- MODO FORMULARIO (crear o editar) ---
    if (mode) {
        return (
            <div className="bg-white border-2 border-nominix-electric rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-nominix-electric tracking-widest flex items-center gap-1">
                        <Briefcase size={10} />
                        {mode === 'create' ? 'Nuevo Cargo' : `Editando: ${selectedPos?.name}`}
                    </span>
                    <button type="button" onClick={() => setMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="space-y-2">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Nombre del cargo *"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } if (e.key === 'Escape') setMode(null); }}
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-nominix-electric focus:bg-white transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Código * (ej: CAR-01)"
                            value={form.code}
                            onChange={e => setForm({ ...form, code: e.target.value })}
                            className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-nominix-electric focus:bg-white transition-colors"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Sueldo"
                                value={form.default_total_salary}
                                onChange={e => setForm({ ...form, default_total_salary: e.target.value })}
                                className="flex-1 min-w-0 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-nominix-electric focus:bg-white transition-colors"
                            />
                            <select
                                value={form.currency}
                                onChange={e => setForm({ ...form, currency: e.target.value })}
                                className="w-14 shrink-0 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-nominix-electric focus:bg-white transition-colors"
                            >
                                <option value="USD">USD</option>
                                <option value="VES">VES</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button
                        type="button"
                        onClick={() => setMode(null)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending || !form.name.trim() || !form.code.trim()}
                        className="px-4 py-2 bg-nominix-electric text-white text-xs font-black rounded-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                        {isPending
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Check size={12} />
                        }
                        {mode === 'create' ? 'Crear Cargo' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        );
    }

    // --- MODO SELECTOR ---
    return (
        <div className="relative">
            <div className="flex gap-2 h-[50px]">
                <div className="relative w-full">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select
                        value={selectedId || ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            onChange(id);
                            const job = positions.find(p => String(p.id) === id);
                            if (job) onJobSelected?.(job);
                        }}
                        disabled={!departmentId || disabled}
                        className={cn(
                            'w-full pl-10 pr-10 p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark appearance-none cursor-pointer',
                            'focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300',
                            error && 'border-red-300 focus:border-red-500',
                            (!departmentId || disabled) && 'opacity-60 cursor-not-allowed bg-gray-100/50'
                        )}
                    >
                        <option value="">
                            {departmentId ? '-- Seleccionar Cargo --' : '-- Seleccione Dpto. primero --'}
                        </option>
                        {positions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <ChevronDown size={16} strokeWidth={3} />
                    </div>
                </div>

                {selectedPos && !disabled && (
                    <button
                        type="button"
                        onClick={openEdit}
                        className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-amber-50 hover:text-amber-500 border border-gray-100/50 transition-all duration-300"
                        title="Editar cargo"
                    >
                        <Edit3 size={16} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={openCreate}
                    disabled={!departmentId || disabled}
                    className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-nominix-electric hover:text-white border border-gray-100/50 hover:border-nominix-electric/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nuevo cargo"
                >
                    <Plus size={20} />
                </button>
            </div>

            {error && <p className="mt-1 text-[9px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
}
