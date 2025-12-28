import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import EmployeeDetail from './EmployeeDetail';
import {
    UserPlus,
    Search,
    MoreHorizontal,
    Filter,
    Building2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    UserCheck,
    UserX,
    ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const PersonnelManager = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    const fetchEmployees = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/employees/?page=${page}&search=${search}`);
            // DRF pagination
            if (response.data.results) {
                setEmployees(response.data.results);
                setTotalPages(Math.ceil(response.data.count / 20)); // Assuming 20 per page as per DRF settings viewed before
            } else {
                setEmployees(response.data);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Error al cargar empleados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees(currentPage, searchTerm);
    }, [currentPage]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchEmployees(1, searchTerm);
    };

    return (
        <div className="relative">
            {/* Main Content */}
            <div className={cn(
                "bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col transition-all duration-500",
                selectedEmployeeId ? "mr-[500px] opacity-50 blur-sm scale-[0.98] pointer-events-none" : "mr-0"
            )}>
                {/* Header / Toolbar */}
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-nominix-dark">Directorio de Colaboradores</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Gestión integral de talento humano</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm">
                                <Filter size={14} /> Filtros
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-nominix-electric text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-nominix-electric/20 active:scale-95">
                                <UserPlus size={16} /> Nuevo Ingreso
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="mt-8 relative max-w-2xl">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cédula o cargo..."
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-nominix-electric focus:ring-0 focus:outline-none font-bold text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <button type="submit" className="hidden">Buscar</button>
                    </form>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Loader2 className="animate-spin mb-4" size={40} />
                            <p className="font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando base de datos...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo / Depto</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.length > 0 ? employees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => setSelectedEmployeeId(emp.id)}
                                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-nominix-smoke flex items-center justify-center text-nominix-dark font-black text-sm border border-gray-100 uppercase">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-nominix-dark text-sm group-hover:text-nominix-electric transition-colors">
                                                        {emp.full_name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                        ID: {emp.national_id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-bold text-gray-700">{emp.position || 'No especificado'}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{emp.department || 'General'}</p>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-gray-300" />
                                                {emp.branch?.name || 'Sede Central'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                emp.is_active
                                                    ? "bg-green-50 text-green-700 border border-green-100"
                                                    : "bg-red-50 text-red-700 border border-red-100"
                                            )}>
                                                {emp.is_active ? <UserCheck size={10} /> : <UserX size={10} />}
                                                {emp.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-nominix-dark border border-transparent hover:border-gray-100 shadow-sm">
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-nominix-dark border border-transparent hover:border-gray-100 shadow-sm">
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                            No se encontraron colaboradores
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Mostrando página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Side Drawer for Details */}
            {selectedEmployeeId && (
                <>
                    {/* Overlay to close when clicking outside */}
                    <div
                        className="fixed inset-0 bg-nominix-dark/20 backdrop-blur-sm z-[60] transition-opacity duration-300"
                        onClick={() => setSelectedEmployeeId(null)}
                    ></div>

                    {/* Drawer Panel */}
                    <div className="fixed top-0 right-0 h-full w-full max-w-[550px] bg-white shadow-2xl z-[70] transform transition-transform duration-500 ease-out animate-in slide-in-from-right overflow-hidden rounded-l-[3rem]">
                        <EmployeeDetail
                            employeeId={selectedEmployeeId}
                            onClose={() => setSelectedEmployeeId(null)}
                            onUpdate={() => fetchEmployees(currentPage, searchTerm)}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default PersonnelManager;
