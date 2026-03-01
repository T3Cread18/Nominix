import React, { useState } from 'react';
import { useBranches, useDeleteBranch } from '../../../hooks/useOrganization';
import { Button, Card } from '../../../components/ui';
import { SkeletonCard } from '../../../components/ui/Skeleton';
import {
    Plus, Edit3, Trash2, Store, Hash, Phone, MapPin,
    CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import BranchFormModal from './BranchFormModal';

const BranchManager = () => {
    const { data: branches, isLoading } = useBranches();
    const { mutate: deleteBranch } = useDeleteBranch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);

    const handleCreate = () => {
        setEditingBranch(null);
        setIsModalOpen(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm("¿Eliminar sede? Esta acción no se puede deshacer.")) {
            deleteBranch(id);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <SkeletonCard key={`skeleton-${i}`} />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleCreate} icon={Plus} variant="electric">
                    Nueva Sede
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches?.map(branch => (
                    <div key={branch.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                            <button onClick={() => handleEdit(branch)} className="p-2 bg-gray-50 text-nominix-dark rounded-lg hover:bg-nominix-electric hover:text-white transition-colors">
                                <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(branch.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="mb-4 relative">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 group-hover:bg-nominix-electric group-hover:text-white transition-colors">
                                <Store size={24} />
                            </div>
                            <h4 className="text-lg font-black text-nominix-dark">{branch.name}</h4>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mt-1">{branch.code}</p>
                        </div>

                        <div className="space-y-2 border-t border-gray-50 pt-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <Hash size={12} className="text-gray-300" /> {branch.rif || 'Sin RIF'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <Phone size={12} className="text-gray-300" /> {branch.phone || 'Sin Tlf'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <MapPin size={12} className="text-gray-300" /> <span className="truncate">{branch.address || 'Sin Dirección'}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-6 right-6">
                            {branch.is_active
                                ? <CheckCircle2 size={16} className="text-green-500" />
                                : <XCircle size={16} className="text-red-500" />
                            }
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {branches?.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-[2rem]">
                        <Store size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs font-black uppercase text-gray-400">No hay sedes registradas</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <BranchFormModal
                    branch={editingBranch}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default BranchManager;
