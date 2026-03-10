import React, { useState } from 'react';
import { Plus, Edit3, Store, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { useBranches } from '../hooks/useOrganization';
import BranchFormModal from '../features/settings/components/BranchFormModal';

/**
 * Selector de Sede con acciones inline de crear y editar.
 * Al crear una sede nueva, la auto-selecciona.
 */
export default function BranchSelector({ value, onChange, error, disabled }) {
    const { data: branches = [], isLoading } = useBranches();
    const [modalState, setModalState] = useState(null); // null | { branch: object|null }

    const selectedBranch = branches.find(b => String(b.id) === String(value));

    const openCreate = () => setModalState({ branch: null });
    const openEdit = () => selectedBranch && setModalState({ branch: selectedBranch });
    const closeModal = () => setModalState(null);

    const handleSuccess = (result) => {
        // Auto-seleccionar al crear; al editar el valor ya está correcto
        if (!modalState?.branch && result?.id) {
            onChange(String(result.id));
        }
        closeModal();
    };

    return (
        <div className="space-y-1">
            <div className="flex gap-2 h-[50px]">
                <div className="relative w-full">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled || isLoading}
                        className={cn(
                            'w-full pl-10 pr-10 p-4 bg-slate-50 border border-gray-100/50 rounded-2xl font-bold text-sm text-nominix-dark appearance-none cursor-pointer',
                            'focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 outline-none transition-all duration-300',
                            error && 'border-red-300 focus:border-red-500',
                            disabled && 'opacity-60 cursor-not-allowed bg-gray-100/50'
                        )}
                    >
                        <option value="">-- Seleccionar Sede --</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <ChevronDown size={16} strokeWidth={3} />
                    </div>
                </div>

                {selectedBranch && !disabled && (
                    <button
                        type="button"
                        onClick={openEdit}
                        className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-amber-50 hover:text-amber-500 border border-gray-100/50 transition-all duration-300"
                        title="Editar sede"
                    >
                        <Edit3 size={16} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={openCreate}
                    disabled={disabled}
                    className="aspect-square flex items-center justify-center bg-slate-50 text-gray-400 rounded-2xl hover:bg-nominix-electric hover:text-white border border-gray-100/50 hover:border-nominix-electric/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nueva sede"
                >
                    <Plus size={20} />
                </button>
            </div>

            {error && <p className="mt-1 text-[9px] font-bold text-red-500 ml-1">{error}</p>}

            {modalState !== null && (
                <BranchFormModal
                    branch={modalState.branch}
                    onClose={closeModal}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
