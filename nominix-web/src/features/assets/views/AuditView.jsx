import React, { useState, useEffect, useRef } from 'react';
import {
    ClipboardList, Play, CheckCircle2, XCircle,
    AlertCircle, Search, BarChart3, ChevronRight,
    QrCode, Trash2, Save, Download
} from 'lucide-react';
import {
    Button, InputField, SelectField,
    Card, Badge
} from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * AuditView - Vista de auditoría física de activos.
 */
const AuditView = ({ warehouses = [] }) => {
    const [audits, setAudits] = useState([]);
    const [activeAudit, setActiveAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Estado para nueva auditoría
    const [showNewForm, setShowNewForm] = useState(false);
    const [newAuditData, setNewAuditData] = useState({
        name: `Auditoría ${format(new Date(), 'dd/MM/yyyy')}`,
        warehouse: ''
    });

    // Estado para escaneo
    const [scanValue, setScanValue] = useState('');
    const [scanError, setScanError] = useState(null);
    const scanInputRef = useRef(null);

    useEffect(() => {
        loadAudits();
    }, []);

    useEffect(() => {
        // Enfocar el input de escaneo automáticamente si hay una auditoría activa
        if (activeAudit && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [activeAudit]);

    const loadAudits = async () => {
        setLoading(true);
        try {
            const data = await assetsService.getAudits();
            setAudits(data);
        } catch (err) {
            console.error('Error loading audits:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAudit = async (e) => {
        e.preventDefault();
        if (!newAuditData.warehouse) return;

        setSubmitting(true);
        try {
            const audit = await assetsService.createAudit(newAuditData);
            setAudits([audit, ...audits]);
            setActiveAudit(audit);
            setShowNewForm(false);
        } catch (err) {
            console.error('Error creating audit:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();
        const code = scanValue.trim();
        if (!code) return;

        setScanError(null);
        try {
            // Buscamos el activo por código
            const assetsData = await assetsService.getAssets({ search: code });
            const asset = assetsData.results?.find(a => a.code === code || a.serial_number === code || a.barcode === code);

            if (!asset) {
                // Registrar como sobrante si no existe
                await assetsService.addAuditItem(activeAudit.id, {
                    result: 'SURPLUS',
                    notes: `Escaneado el código: ${code}`
                });
            } else {
                // Verificar si ya fue escaneado en esta sesión
                const alreadyScanned = activeAudit.items?.some(item => item.asset === asset.id);
                if (alreadyScanned) {
                    setScanError(`El activo ${asset.code} ya fue registrado en esta auditoría.`);
                    setScanValue('');
                    return;
                }

                // Registrar según ubicación
                const isCorrectWarehouse = asset.warehouse === activeAudit.warehouse;
                await assetsService.addAuditItem(activeAudit.id, {
                    asset: asset.id,
                    result: isCorrectWarehouse ? 'FOUND' : 'SURPLUS',
                    notes: isCorrectWarehouse ? '' : `Ubicación original: ${asset.warehouse_name}`
                });
            }

            // Recargar auditoría activa para ver cambios
            const updatedAudit = await assetsService.getAudits({ id: activeAudit.id });
            const foundAudit = Array.isArray(updatedAudit) ? updatedAudit[0] : updatedAudit;
            setActiveAudit(foundAudit);
            setScanValue('');
        } catch (err) {
            console.error('Error scanning item:', err);
            setScanError('Error al procesar el escaneo.');
        }
    };

    const handleCompleteAudit = async () => {
        if (!window.confirm('¿Está seguro de completar la auditoría? No se podrán agregar más registros.')) return;

        setSubmitting(true);
        try {
            const updated = await assetsService.completeAudit(activeAudit.id);
            setActiveAudit(updated);
            loadAudits();
        } catch (err) {
            console.error('Error completing audit:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !activeAudit) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nominix-electric"></div>
                <p className="mt-4 text-gray-500 font-medium">Cargando sesiones de auditoría...</p>
            </div>
        );
    }

    // --- Renderizado de Auditoría Activa ---
    if (activeAudit) {
        const isCompleted = activeAudit.status === 'COMPLETED';

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setActiveAudit(null); loadAudits(); }}
                        >
                            <ChevronRight className="rotate-180" size={18} />
                        </Button>
                        <div>
                            <h2 className="text-xl font-bold text-nominix-dark">{activeAudit.name}</h2>
                            <p className="text-sm text-gray-500">{activeAudit.warehouse_name}</p>
                        </div>
                        <Badge variant={isCompleted ? 'success' : 'warning'}>
                            {isCompleted ? 'Completada' : 'En Progreso'}
                        </Badge>
                    </div>

                    {!isCompleted && (
                        <Button
                            onClick={handleCompleteAudit}
                            disabled={submitting}
                            variant="success"
                            className="gap-2"
                        >
                            <CheckCircle2 size={18} /> Finalizar Auditoría
                        </Button>
                    )}
                </div>

                {/* Dashboard de Auditoría */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard label="Esperados" value={activeAudit.total_expected} icon={Package} color="text-blue-600" bgColor="bg-blue-50" />
                    <StatsCard label="Encontrados" value={activeAudit.total_found} icon={CheckCircle2} color="text-emerald-600" bgColor="bg-emerald-50" />
                    <StatsCard label="Faltantes" value={activeAudit.total_missing} icon={XCircle} color="text-red-600" bgColor="bg-red-50" />
                    <StatsCard label="Sobrantes" value={activeAudit.total_surplus} icon={Plus} color="text-amber-600" bgColor="bg-amber-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel de Escaneo */}
                    <Card className="lg:col-span-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className={`p-4 rounded-full ${isCompleted ? 'bg-gray-100' : 'bg-nominix-electric/10'} mb-2`}>
                            <QrCode size={48} className={isCompleted ? 'text-gray-400' : 'text-nominix-electric'} />
                        </div>

                        <div className="max-w-[200px]">
                            <h3 className="font-bold text-gray-900">
                                {isCompleted ? 'Auditoría Cerrada' : 'Escanear Activo'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {isCompleted
                                    ? 'Esta sesión ha finalizado y no permite nuevos registros.'
                                    : 'Utilice un escáner de etiquetas o ingrese el código manualmente.'}
                            </p>
                        </div>

                        {!isCompleted && (
                            <form onSubmit={handleScan} className="w-full space-y-3">
                                <InputField
                                    ref={scanInputRef}
                                    placeholder="Código AF-..."
                                    value={scanValue}
                                    onChange={(e) => setScanValue(e.target.value)}
                                    className="text-center font-mono uppercase focus:ring-2 focus:ring-nominix-electric"
                                    autoComplete="off"
                                />
                                <Button type="submit" className="w-full hidden sm:flex">
                                    Registrar
                                </Button>
                            </form>
                        )}

                        {scanError && (
                            <div className="py-2 px-3 text-xs flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-md">
                                <AlertCircle size={14} className="shrink-0" />
                                {scanError}
                            </div>
                        )}
                    </Card>

                    {/* Lista de Registros */}
                    <div className="lg:col-span-2">
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <ClipboardList size={18} className="text-gray-400" />
                                    Items Registrados ({activeAudit.items?.length || 0})
                                </h3>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 text-gray-500">
                                    <Download size={14} /> Exportar
                                </Button>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white shadow-sm border-b text-[10px] uppercase font-bold text-gray-400 px-6">
                                        <tr>
                                            <th className="px-6 py-3">Activo</th>
                                            <th className="px-6 py-3">Resultado</th>
                                            <th className="px-6 py-3">Fecha/Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {activeAudit.items?.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-gray-400 italic">
                                                    No hay items registrados aún en esta sesión.
                                                </td>
                                            </tr>
                                        ) : (
                                            activeAudit.items?.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{item.asset_code || '---'}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.asset_name || item.notes}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold">
                                                        <ResultBadge result={item.result} />
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500">
                                                        {format(new Date(item.scanned_at), 'HH:mm:ss')}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // --- Renderizado de Lista de Sesiones ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-nominix-dark">Sesiones de Auditoría</h2>
                    <p className="text-sm text-gray-500">Historial y control de inventarios físicos</p>
                </div>
                <Button
                    onClick={() => setShowNewForm(true)}
                    className="gap-2 bg-nominix-electric hover:bg-nominix-electric/90 shadow-lg shadow-nominix-electric/20 transition-all font-bold"
                >
                    <Plus size={18} /> Nueva Auditoría
                </Button>
            </div>

            {showNewForm && (
                <Card className="p-6 bg-nominix-electric/5 border-nominix-electric/20 border-dashed border-2 animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleCreateAudit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-nominix-electric uppercase tracking-wider">Nombre de Auditoría</label>
                            <InputField
                                value={newAuditData.name}
                                onChange={(e) => setNewAuditData({ ...newAuditData, name: e.target.value })}
                                placeholder="Ej: Auditoría Anual - Main WH"
                                required
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-nominix-electric uppercase tracking-wider">Almacén a Auditar</label>
                            <SelectField
                                value={newAuditData.warehouse}
                                onChange={(e) => setNewAuditData({ ...newAuditData, warehouse: e.target.value })}
                                placeholder="Seleccione almacén..."
                                required
                            >
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.branch_name} — {wh.name}</option>
                                ))}
                            </SelectField>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={submitting} className="font-bold">
                                {submitting ? "..." : <Play size={18} className="mr-2" />}
                                Iniciar
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {audits.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-4">
                            <ClipboardList className="text-gray-300" size={48} />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg">Sin Auditorías</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">Inicie una nueva sesión para verificar la existencia física de sus activos.</p>
                        <Button variant="outline" onClick={() => setShowNewForm(true)}>Empezar ahora</Button>
                    </div>
                ) : (
                    audits.map((audit) => (
                        <Card
                            key={audit.id}
                            onClick={() => setActiveAudit(audit)}
                            className="group hover:border-nominix-electric transition-all cursor-pointer overflow-hidden p-0"
                        >
                            <div className="px-5 py-4 border-b border-gray-100 group-hover:bg-nominix-electric/5 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900 group-hover:text-nominix-electric transition-colors line-clamp-1">
                                        {audit.name}
                                    </h3>
                                    <Badge variant={audit.status === 'COMPLETED' ? 'success' : 'warning'}>
                                        {audit.status === 'COMPLETED' ? 'Finalizada' : 'En curso'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                    <Warehouse size={12} className="shrink-0" />
                                    {audit.warehouse_name}
                                </div>
                            </div>

                            <div className="px-5 py-4 bg-gray-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Esperados</p>
                                        <p className="text-lg font-black text-gray-900">{audit.total_expected}</p>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Gaps</p>
                                        <div className="flex items-center gap-1 justify-center">
                                            <span className="text-sm font-bold text-emerald-600">+{audit.total_found}</span>
                                            <span className="text-sm font-bold text-red-600">-{audit.total_missing}</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sobrantes</p>
                                        <p className="text-lg font-black text-amber-600">+{audit.total_surplus}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 border-t border-gray-100 pt-3">
                                    <span>Iniciada: {format(new Date(audit.started_at), 'dd MMM yyyy')}</span>
                                    <span className="flex items-center gap-1 text-nominix-electric group-hover:translate-x-1 transition-transform uppercase">
                                        Continuar <ChevronRight size={10} />
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

// Componentes Auxiliares
const StatsCard = ({ label, value, icon: Icon, color, bgColor }) => (
    <Card className="p-4 border-none shadow-sm flex items-center gap-3">
        <div className={`${bgColor} ${color} p-2 rounded-lg`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-lg font-black text-gray-900">{value}</p>
        </div>
    </Card>
);

const ResultBadge = ({ result }) => {
    switch (result) {
        case 'FOUND': return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Encontrado</span>;
        case 'MISSING': return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Faltante</span>;
        case 'SURPLUS': return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Sobrante</span>;
        case 'DAMAGED': return <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Dañado</span>;
        default: return result;
    }
};

export default AuditView;
