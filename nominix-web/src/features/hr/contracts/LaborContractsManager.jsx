import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import ContractCard from './ContractCard';
import UpsertContractModal from './UpsertContractModal';

const LaborContractsManager = ({ employeeId, employeeData, initialContracts, onRefresh, loading: parentLoading }) => {
    const [contracts, setContracts] = useState(initialContracts || []);
    const [loading, setLoading] = useState(parentLoading);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);

    useEffect(() => {
        setContracts(initialContracts);
        setLoading(parentLoading);
    }, [initialContracts, parentLoading]);

    const handleCreate = () => {
        setEditingContract(null);
        setModalOpen(true);
    };

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setModalOpen(true);
    };

    const activeContract = contracts.find(c => c.is_active);
    const historyContracts = contracts.filter(c => !c.is_active).sort((a, b) => new Date(b.end_date || b.start_date) - new Date(a.end_date || a.start_date));

    if (loading && contracts.length === 0) return (
        <div className="flex flex-col items-center justify-center p-12 text-gray-300">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Cargando Contratos...</p>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 text-left">

            {/* Header de Sección */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Historial Contractual</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Gestiona los acuerdos laborales</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-nominix-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                    <Plus size={16} /> Nuevo Contrato
                </button>
            </div>

            {/* Empty State */}
            {contracts.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-3xl text-gray-300">
                    <FolderOpen size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-bold">No hay contratos registrados</p>
                    <button onClick={handleCreate} className="mt-4 text-nominix-electric font-black text-xs uppercase tracking-widest hover:underline">
                        Crear el primer contrato
                    </button>
                </div>
            )}

            {/* Contrato Activo (Hero) */}
            {activeContract && (
                <div className="relative">
                    <div className="absolute -top-3 left-4 px-3 py-1 bg-white text-nominix-dark text-[10px] font-black uppercase tracking-widest border border-gray-100 rounded-full z-10 shadow-sm">
                        Contrato Vigente
                    </div>
                    <ContractCard contract={activeContract} isActive={true} onEdit={handleEdit} />
                </div>
            )}

            {/* Historial */}
            {historyContracts.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-dashed border-gray-100">
                    <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest pl-2">Historial Anterior</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {historyContracts.map(contract => (
                            <ContractCard key={contract.id} contract={contract} isActive={false} onEdit={handleEdit} />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            <UpsertContractModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={onRefresh}
                employeeId={employeeId}
                employeeData={employeeData}
                contractToEdit={editingContract}
            />
        </div>
    );
};

export default LaborContractsManager;
