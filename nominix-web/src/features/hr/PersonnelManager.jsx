import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import ConfirmationModal from '../../components/ConfirmationModal'; // <--- 1. IMPORTAR MODAL
import {
    UserPlus, Search, Filter, Building2, ChevronLeft,
    ChevronRight, Loader2, CheckCircle2, XCircle, Trash2,
    Edit3, Hash, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const BACKEND_BASE = "http://gfo.localhost:8000";

const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BACKEND_BASE}${path}`;
};

const PersonnelManager = () => {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Estado para borrado (loading)
    const [deletingId, setDeletingId] = useState(null);

    // --- 2. ESTADO PARA EL MODAL DE CONFIRMACIÓN ---
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        isDangerous: false
    });

    // --- CARGA DE CATÁLOGOS ---
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await axiosClient.get('/branches/');
                setBranches(res.data.results || res.data);
            } catch (error) {
                console.error("Error cargando sedes", error);
            }
        };
        loadBranches();
    }, []);

    // --- FUNCIÓN PRINCIPAL DE CARGA ---
    const fetchEmployees = useCallback(async (page, search, branchId) => {
        setLoading(true);
        try {
            let url = `/employees/?page=${page}`;
            if (search) url += `&search=${search}`;
            if (branchId) url += `&branch=${branchId}`;

            const response = await axiosClient.get(url);

            if (response.data.results) {
                setEmployees(response.data.results);
                setTotalPages(Math.ceil(response.data.count / 20) || 1);
            } else {
                setEmployees(response.data);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Error cargando personal:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- EFECTO: DISPARAR BÚSQUEDA ---
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees(currentPage, searchTerm, selectedBranch);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, searchTerm, selectedBranch, fetchEmployees]);

    // --- 3. LÓGICA DE BORRADO ACTUALIZADA ---

    // Esta función es la que realmente ejecuta el borrado en el servidor
    const executeDelete = async (id) => {
        setDeletingId(id);
        setConfirmState(prev => ({ ...prev, isOpen: false })); // Cerramos modal

        try {
            await axiosClient.delete(`/employees/${id}/`);
            toast.success("Expediente eliminado correctamente");
            // Recargamos la lista
            fetchEmployees(currentPage, searchTerm, selectedBranch);
        } catch (error) {
            console.error(error);
            // Manejo de error 400 (ProtectedError)
            if (error.response && error.response.status === 400) {
                toast.error(error.response.data.error || "No se puede eliminar el registro.");
            } else {
                toast.error("Ocurrió un error al intentar eliminar.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    // Esta función es la que llama el botón (Solo abre el modal)
    const requestDelete = (e, id) => {
        e.stopPropagation(); // Evita navegar al detalle
        setConfirmState({
            isOpen: true,
            title: '¿Eliminar Expediente?',
            message: 'Esta acción eliminará permanentemente al colaborador y sus datos asociados. Si tiene historial de nómina, la acción será bloqueada por seguridad.',
            action: () => executeDelete(id),
            isDangerous: true
        });
    };

    return (
        <div className="relative h-[calc(100vh-100px)]">

            {/* 4. COMPONENTE MODAL RENDERIZADO AQUÍ */}
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                message={confirmState.message}
                isDangerous={confirmState.isDangerous}
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
            />

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">

                {/* Header & Toolbar */}
                <div className="p-6 border-b border-gray-50 bg-white/50 backdrop-blur-sm z-20">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Personal</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Gestión de Talento Humano
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">

                            {/* SELECTOR DE SEDE */}
                            <div className="relative group w-full sm:w-48">
                                <select
                                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-xs transition-all text-slate-600 appearance-none cursor-pointer"
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Todas las Sedes</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* BUSCADOR */}
                            <div className="relative group w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, cédula..."
                                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-xs transition-all text-slate-600 placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nominix-electric" size={16} />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* BOTÓN NUEVO */}
                            <button
                                onClick={() => navigate('/personnel/create')}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-nominix-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 whitespace-nowrap"
                            >
                                <UserPlus size={16} /> <span className="hidden sm:inline">Nuevo</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabla de Datos */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
                    {loading && employees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <Loader2 className="animate-spin mb-4 text-nominix-electric" size={40} />
                            <p className="font-black uppercase text-[10px] tracking-[0.3em]">Buscando...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-white/80 backdrop-blur-md shadow-sm">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden md:table-cell">Cargo & Área</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden lg:table-cell">Ubicación</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {employees.length > 0 ? employees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => navigate(`/personnel/${emp.id}`)}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100 flex-shrink-0">
                                                        {emp.photo ? (
                                                            <img
                                                                src={getPhotoUrl(emp.photo)}
                                                                alt={emp.first_name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <span
                                                            className="w-full h-full flex items-center justify-center font-black text-xs text-slate-500 uppercase"
                                                            style={{ display: emp.photo ? 'none' : 'flex' }}
                                                        >
                                                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                                                        emp.is_active ? "bg-green-500 shadow-sm" : "bg-slate-300"
                                                    )} />
                                                </div>

                                                <div className="flex flex-col">
                                                    <p className="font-bold text-slate-800 text-sm group-hover:text-nominix-electric transition-colors">
                                                        {emp.first_name} {emp.last_name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                                                        <Hash size={10} /> {emp.national_id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-700">{emp.position || 'Sin Cargo'}</p>
                                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                                                    {emp.department?.name || 'General'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 size={14} className="text-slate-300" />
                                                <span className="text-xs font-bold">{emp.branch?.name || 'Sede Principal'}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border",
                                                emp.is_active
                                                    ? "bg-green-50 text-green-600 border-green-100"
                                                    : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                {emp.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                {emp.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-nominix-electric border border-transparent hover:border-slate-100 shadow-sm transition-all">
                                                    <Edit3 size={16} />
                                                </button>

                                                {/* BOTÓN BORRAR: Llama a requestDelete en vez de handleDelete */}
                                                <button
                                                    onClick={(e) => requestDelete(e, emp.id)}
                                                    disabled={deletingId === emp.id}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 transition-all"
                                                >
                                                    {deletingId === emp.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                    <Filter size={24} className="text-slate-400" />
                                                </div>
                                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                                    {searchTerm || selectedBranch ? 'No hay coincidencias' : 'Sin datos'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Paginación */}
                <div className="p-4 border-t border-slate-50 bg-white flex items-center justify-between flex-shrink-0 z-20">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonnelManager;