import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Plus,
    Settings2,
    Trash2,
    DollarSign,
    Percent,
    Code2,
    CheckCircle2,
    XCircle,
    Loader2,
    Search,
    X,
    Edit2,
    ShieldCheck,
    ClipboardList
} from 'lucide-react';
import { cn } from '../../utils/cn';
import ConceptFormBuilder from './components/ConceptFormBuilder'; // Importar el Builder
import { useQueryClient } from '@tanstack/react-query'; // Para invalidar caché si fuera necesario desde el padre

const ConceptCatalog = () => {
    const [concepts, setConcepts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConcept, setEditingConcept] = useState(null);

    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'SYSTEM', 'CUSTOM'

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/payroll-concepts/');
            setConcepts(data.results || data);
        } catch (error) {
            console.error("Error cargando catálogo de conceptos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setEditingConcept(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (concept) => {
        setEditingConcept(concept);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingConcept(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        fetchData(); // Recargar lista
    };

    const handleDeleteConcept = async (id) => {
        if (!confirm("¿Está seguro de eliminar este concepto global? Podría afectar cálculos de nómina históricos.")) return;
        try {
            await axiosClient.delete(`/payroll-concepts/${id}/`);
            fetchData();
        } catch (error) {
            alert("No se pudo eliminar el concepto. Revise si está siendo usado por algún empleado.");
        }
    };

    const filteredConcepts = concepts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'ALL' ||
            (activeTab === 'SYSTEM' && c.is_system) ||
            (activeTab === 'CUSTOM' && !c.is_system);
        return matchesSearch && matchesTab;
    });

    const stats = {
        total: concepts.length,
        earnings: concepts.filter(c => c.kind === 'EARNING').length,
        deductions: concepts.filter(c => c.kind === 'DEDUCTION').length,
        system: concepts.filter(c => c.is_system).length
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[700px] flex flex-col relative">

            {/* Modal con Builder */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-nominix-dark/40 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="w-full max-w-6xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95vh] custom-scrollbar">
                        {/* El ConceptFormBuilder ya trae su propio contenedor oscuro y cabecera */}
                        <ConceptFormBuilder
                            key={editingConcept?.id || 'new'}
                            initialData={editingConcept}
                            onSave={handleSaveSuccess}
                            onCancel={handleCloseModal}
                        />
                    </div>
                </div>
            )}

            <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-nominix-dark rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                            <ClipboardList className="text-white" size={32} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-nominix-dark tracking-tighter uppercase italic">Catálogo <span className="text-nominix-electric not-italic">Global</span></h3>
                            <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.4em] mt-1">Diccionario Maestro de Reglas Salariales</p>
                        </div>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-3 px-8 py-5 bg-nominix-dark text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-nominix-dark/10 active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Concepto
                    </button>
                </div>

                {/* Summary Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Reglas', value: stats.total, icon: ClipboardList, color: 'text-nominix-dark' },
                        { label: 'Asignaciones', value: stats.earnings, icon: DollarSign, color: 'text-green-500' },
                        { label: 'Deducciones', value: stats.deductions, icon: Percent, color: 'text-red-500' },
                        { label: 'Protegidos', value: stats.system, icon: ShieldCheck, color: 'text-blue-500' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
                            <div className={cn("p-2 rounded-xl bg-gray-50", stat.color)}>
                                <stat.icon size={16} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">{stat.label}</p>
                                <p className="text-lg font-black text-nominix-dark leading-none">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative w-full max-w-xl group">
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-200 rounded-[1.5rem] focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-nominix-electric transition-colors" size={24} />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-2xl gap-1 shrink-0">
                        {[
                            { id: 'ALL', label: 'Todos' },
                            { id: 'SYSTEM', label: 'Estructurales' },
                            { id: 'CUSTOM', label: 'Personalizados' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-nominix-dark shadow-sm"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 overflow-y-auto">
                {loading ? (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-200">
                        <Loader2 className="animate-spin mb-6" size={50} />
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">sincronizando bóveda de reglas...</p>
                    </div>
                ) : filteredConcepts.length > 0 ? filteredConcepts.map(concept => (
                    <div key={concept.id} className="group p-8 rounded-[2.5rem] border border-gray-100 hover:border-nominix-electric/40 hover:shadow-2xl hover:shadow-nominix-electric/5 transition-all relative overflow-hidden bg-white animate-in zoom-in-95 duration-300">
                        <div className={cn(
                            "absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 opacity-[0.03] transition-transform group-hover:scale-110 group-hover:rotate-12",
                            concept.kind === 'EARNING' ? "text-green-500" : "text-red-500"
                        )}>
                            {concept.kind === 'EARNING' ? <DollarSign size={128} /> : <Percent size={128} />}
                        </div>

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <span className={cn(
                                "text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest",
                                concept.kind === 'EARNING' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                            )}>
                                {concept.kind === 'EARNING' ? 'Asignación' : 'Deducción'}
                            </span>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                                {concept.code}
                            </span>
                        </div>

                        <h4 className="text-lg font-black text-nominix-dark mb-2 group-hover:text-nominix-electric transition-colors leading-tight">{concept.name}</h4>

                        {/* Behavior Tag */}
                        <div className="mb-4">
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">
                                {concept.behavior_display || concept.behavior || 'Estándar'}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-8">
                            <div className="bg-gray-50 p-2 px-3 rounded-xl flex items-center gap-2 border border-transparent group-hover:border-gray-100 transition-all">
                                {concept.computation_method === 'DYNAMIC_FORMULA' ? <Code2 size={12} className="text-nominix-electric" /> : <Settings2 size={12} className="text-gray-400" />}
                                <span className="text-[10px] font-black uppercase text-gray-500">
                                    {concept.computation_method === 'DYNAMIC_FORMULA' ? 'Dinámico' : 'Fijo/Calc'}
                                </span>
                            </div>
                            {concept.is_salary_incidence && (
                                <div className="bg-blue-50/50 p-2 px-3 rounded-xl flex items-center gap-2 border border-blue-50">
                                    <CheckCircle2 size={12} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase text-blue-500">Salario</span>
                                </div>
                            )}
                            <div className={cn(
                                "p-2 px-3 rounded-xl flex items-center gap-2 border",
                                concept.show_on_payslip
                                    ? "bg-purple-50/50 border-purple-50"
                                    : "bg-gray-100 border-gray-200"
                            )}>
                                {concept.show_on_payslip ? (
                                    <>
                                        <CheckCircle2 size={12} className="text-purple-500" />
                                        <span className="text-[10px] font-black uppercase text-purple-500">Recibo</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={12} className="text-gray-400" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Oculto</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-dashed pt-6 border-gray-100 mt-auto">
                            <div>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mb-1">
                                    {concept.is_system ? 'Motor Interno' : 'Valor / Fórmula'}
                                </p>
                                {concept.is_system ? (
                                    <div className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center gap-2">
                                        <ShieldCheck size={12} />
                                        <span className="text-[10px] font-black uppercase">Sistema</span>
                                    </div>
                                ) : concept.computation_method === 'DYNAMIC_FORMULA' ? (
                                    <code className="text-[10px] bg-gray-900 text-green-400 p-2 rounded-lg block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                                        {concept.formula}
                                    </code>
                                ) : (
                                    <p className="text-2xl font-black text-nominix-dark tracking-tighter">
                                        {concept.value}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(concept)}
                                    // Permitir editar incluso si es de sistema (el backend bloquea campos críticos, el frontend debe permitir ver/editar lo permitido)
                                    className="p-3 bg-blue-50 text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all scale-90 hover:scale-100 shadow-lg shadow-blue-500/10"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDeleteConcept(concept.id)}
                                    disabled={concept.is_system}
                                    className={cn(
                                        "p-3 rounded-2xl transition-all scale-90 hover:scale-100 shadow-lg",
                                        concept.is_system
                                            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                            : "bg-red-50 text-red-400 hover:bg-red-500 hover:text-white shadow-red-500/10"
                                    )}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-100 border-4 border-dashed rounded-[3rem] border-gray-50 m-10">
                        <XCircle size={64} className="mb-4 opacity-20" />
                        <h4 className="text-xl font-black uppercase tracking-widest text-gray-200">Bóveda Vacía</h4>
                        <p className="text-xs font-bold uppercase mt-2">No se encontraron conceptos para su búsqueda</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConceptCatalog;
