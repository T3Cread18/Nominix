import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Loader2, AlertCircle, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const fetchAuditLogs = async (page = 1, searchUser = '', token) => {
    // Construir la URL base de forma segura, concatenando strings en lugar de usar new URL()
    // ya que VITE_API_URL puede ser una ruta relativa como "/api"
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    // Preparar query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    if (searchUser) {
        params.append('search_user', searchUser);
    }

    const response = await fetch(`${baseUrl}/audit-logs/?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Error al cargar la bitácora');
    }
    return response.json();
};

const Row = ({ row }) => {
    const getActionColor = (action) => {
        switch (action) {
            case 'Created': return 'bg-green-100 text-green-800 border-green-200';
            case 'Updated': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Deleted': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case 'Created': return 'Creación';
            case 'Updated': return 'Modificación';
            case 'Deleted': return 'Eliminación';
            default: return action;
        }
    };

    const getChangeSummary = () => {
        if (row.action === 'Created') return <span className="text-xs text-green-600 italic">Registro creado</span>;
        if (row.action === 'Deleted') return <span className="text-xs text-red-600 italic">Registro eliminado</span>;

        if (row.changes && row.changes.length > 0) {
            return (
                <div className="flex flex-col gap-1">
                    {row.changes.map((change, i) => (
                        <div key={i} className="text-xs font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                            <span className="font-bold text-gray-700">{change.field}:</span>{' '}
                            <span className="line-through text-red-400">{change.old === 'None' ? 'Vacío' : change.old}</span>{' '}
                            <span className="text-gray-400 mx-1">➔</span>{' '}
                            <span className="text-green-600 font-bold">{change.new === 'None' ? 'Vacío' : change.new}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="text-xs text-gray-500 italic">Sin cambios detectables</span>;
    };

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors align-top">
            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                {new Date(row.timestamp).toLocaleString('es-VE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                })}
            </td>
            <td className="p-3 font-medium text-sm text-gray-900">{row.user}</td>
            <td className="p-3 whitespace-nowrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionColor(row.action)}`}>
                    {getActionLabel(row.action)}
                </span>
            </td>
            <td className="p-3">
                <div className="text-sm font-bold text-gray-800">{row.model_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{row.object_repr}</div>
            </td>
            <td className="p-3">
                {getChangeSummary()}
            </td>
        </tr>
    );
};

const AuditLogsManager = () => {
    const { user } = useAuth();
    const token = localStorage.getItem('access');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [searchUser, setSearchUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const rowsPerPage = 50;

    const loadLogs = async (pageIndex, targetSearchUser) => {
        setLoading(true);
        try {
            const data = await fetchAuditLogs(pageIndex, targetSearchUser, token);
            setLogs(data.results);
            setTotalCount(data.count);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs(page, searchUser);
    }, [page, searchUser, token]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearchUser(searchTerm);
    };

    const totalPages = Math.ceil(totalCount / rowsPerPage);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <History className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Bitácora de Auditoría</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Registro de todas las modificaciones realizadas a los datos críticos del sistema.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por usuario / email..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Filtrar
                    </button>
                    {searchUser && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setSearchUser('');
                                setPage(1);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </form>
            </div>

            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
                    <AlertCircle size={20} className="mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-sm">Error al cargar bitácora</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[70vh]">
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Fecha y Hora</th>
                                <th className="p-3">Usuario</th>
                                <th className="p-3">Acción</th>
                                <th className="p-3">Registro Afectado</th>
                                <th className="p-3 w-1/3">Detalle de Cambios (Delta)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                                        Cargando registros...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-gray-500">
                                        No hay registros de auditoría disponibles en esta página.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((row) => (
                                    <Row key={row.id} row={row} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Mostrando <span className="font-medium">{logs.length > 0 ? (page - 1) * rowsPerPage + 1 : 0}</span> a <span className="font-medium">{Math.min(page * rowsPerPage, totalCount)}</span> de <span className="font-medium">{totalCount}</span> resultados
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogsManager;
