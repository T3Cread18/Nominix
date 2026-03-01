import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Loader2, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, InputField } from '../components/ui';
import { cn } from '../utils/cn';

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
                        <div key={change.field} className="text-xs font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
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
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <History className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Bitácora de Auditoría</h1>
                        <p className="text-[10px] sm:text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Control de cambios y trazabilidad del sistema
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <InputField
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar usuario..."
                        icon={Search}
                        className="w-full sm:w-64"
                    />
                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1 sm:flex-initial">
                            Filtrar
                        </Button>
                        {searchUser && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchUser('');
                                    setPage(1);
                                }}
                            >
                                Limpiar
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} className="mt-0.5" />
                    <div>
                        <h3 className="font-bold text-sm">Error al cargar bitácora</h3>
                        <p className="text-xs mt-1">{error}</p>
                    </div>
                </div>
            )}

            <Card className="!p-0 overflow-hidden flex flex-col h-[70vh]">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50/80 backdrop-blur-md">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha y Hora</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Usuario</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Acción</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Registro</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-1/3">Cambios (Delta)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-nominix-electric" size={32} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando bitácora...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-400">
                                        <History size={48} className="mx-auto mb-4 opacity-10" />
                                        <p className="text-xs font-black uppercase tracking-widest">No se encontraron registros</p>
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
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Mostrando <span className="text-slate-600">{logs.length > 0 ? (page - 1) * rowsPerPage + 1 : 0}</span>-
                        <span className="text-slate-600">{Math.min(page * rowsPerPage, totalCount)}</span> de
                        <span className="text-slate-600"> {totalCount}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            Anterior
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AuditLogsManager;
