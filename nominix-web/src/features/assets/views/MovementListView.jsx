import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowRightLeft, Plus, Truck, PackageCheck, XCircle,
    ChevronRight, MapPin, Calendar
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import MovementFormView from './MovementFormView';
import { toast } from 'sonner';

/**
 * MovementListView — Lista de movimientos/guías de remisión.
 */
const MovementListView = () => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const data = await assetsService.getMovements(params);
            setMovements(data);
        } catch (err) {
            toast.error('Error cargando movimientos');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    const handleDispatch = async (id) => {
        if (!window.confirm('¿Despachar este movimiento?')) return;
        try {
            await assetsService.dispatchMovement(id);
            toast.success('Movimiento despachado');
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al despachar');
        }
    };

    const handleReceive = async (id) => {
        if (!window.confirm('¿Confirmar recepción?')) return;
        try {
            await assetsService.receiveMovement(id);
            toast.success('Recepción confirmada');
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al confirmar');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('¿Cancelar este movimiento?')) return;
        try {
            await assetsService.cancelMovement(id);
            toast.success('Movimiento cancelado');
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al cancelar');
        }
    };

    const statusConfig = {
        'DRAFT': { label: 'Borrador', cls: 'bg-gray-100 text-gray-600', icon: ArrowRightLeft },
        'IN_TRANSIT': { label: 'En tránsito', cls: 'bg-blue-100 text-blue-700', icon: Truck },
        'RECEIVED': { label: 'Recibido', cls: 'bg-emerald-100 text-emerald-700', icon: PackageCheck },
        'CANCELLED': { label: 'Cancelado', cls: 'bg-red-100 text-red-700', icon: XCircle },
    };

    if (showForm) {
        return (
            <MovementFormView
                onCreated={() => { setShowForm(false); load(); }}
                onCancel={() => setShowForm(false)}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="IN_TRANSIT">En tránsito</option>
                    <option value="RECEIVED">Recibido</option>
                    <option value="CANCELLED">Cancelado</option>
                </select>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-nominix-electric text-white rounded-xl text-xs font-bold hover:bg-nominix-electric/90 transition-colors"
                >
                    <Plus size={14} /> Nueva Guía
                </button>
            </div>

            {/* Movement Cards */}
            {loading ? (
                <p className="text-center text-gray-400 py-12">Cargando...</p>
            ) : movements.length === 0 ? (
                <div className="text-center py-16">
                    <ArrowRightLeft size={48} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">No hay movimientos registrados</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-nominix-electric text-white rounded-xl text-xs font-bold mx-auto hover:bg-nominix-electric/90 transition-colors"
                    >
                        <Plus size={14} /> Crear primera guía
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {movements.map(mov => {
                        const sc = statusConfig[mov.status] || statusConfig['DRAFT'];
                        const StatusIcon = sc.icon;
                        return (
                            <Card key={mov.id} className="border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Guide */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-lg ${sc.cls}`}>
                                                <StatusIcon size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-mono font-bold text-nominix-electric text-sm">{mov.guide_number}</p>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <Calendar size={10} />
                                                    {new Date(mov.created_at).toLocaleDateString('es')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Route */}
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="text-xs">
                                                <p className="font-semibold text-nominix-dark">{mov.origin_branch_name}</p>
                                                <p className="text-gray-400">{mov.origin_warehouse_name}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                                            <div className="text-xs">
                                                <p className="font-semibold text-nominix-dark">{mov.destination_branch_name}</p>
                                                <p className="text-gray-400">{mov.destination_warehouse_name}</p>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex items-center gap-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc.cls}`}>
                                                {sc.label}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {mov.asset_count} activo{mov.asset_count !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            {mov.status === 'DRAFT' && (
                                                <>
                                                    <button
                                                        onClick={() => handleDispatch(mov.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Truck size={12} /> Despachar
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancel(mov.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {mov.status === 'IN_TRANSIT' && (
                                                <button
                                                    onClick={() => handleReceive(mov.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                >
                                                    <PackageCheck size={12} /> Confirmar Recepción
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    {mov.reason && (
                                        <p className="mt-2 text-[11px] text-gray-400 italic">{mov.reason}</p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MovementListView;
