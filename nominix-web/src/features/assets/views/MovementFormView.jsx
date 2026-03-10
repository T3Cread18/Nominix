import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowRightLeft, Plus, X, Save, Search,
    ChevronRight, Check, Trash2
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { toast } from 'sonner';

/**
 * MovementFormView — Formulario para crear guía de remisión / movimiento inter-sedes.
 */
const MovementFormView = ({ onCreated, onCancel }) => {
    const [warehouses, setWarehouses] = useState([]);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [assetSearch, setAssetSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        origin_warehouse: '',
        destination_warehouse: '',
        reason: 'Traslado entre establecimientos de la misma empresa',
        transport_type: 'PRIVATE',
        vehicle_plate: '',
        driver_name: '',
        driver_id: '',
        notes: '',
    });

    useEffect(() => {
        assetsService.getWarehouses().then(setWarehouses).catch(console.error);
    }, []);

    // Cargar activos cuando se seleccione almacén origen
    useEffect(() => {
        if (!form.origin_warehouse) {
            setAvailableAssets([]);
            return;
        }
        assetsService.getAssets({ warehouse: form.origin_warehouse, status: 'ACTIVE', page_size: 100 })
            .then(data => setAvailableAssets(data.results || data))
            .catch(console.error);
    }, [form.origin_warehouse]);

    const toggleAsset = (asset) => {
        setSelectedAssets(prev => {
            const exists = prev.find(a => a.id === asset.id);
            if (exists) return prev.filter(a => a.id !== asset.id);
            return [...prev, asset];
        });
    };

    const handleSubmit = async () => {
        if (!form.origin_warehouse || !form.destination_warehouse) {
            toast.error('Seleccione almacén origen y destino');
            return;
        }
        if (form.origin_warehouse === form.destination_warehouse) {
            toast.error('El origen y destino deben ser diferentes');
            return;
        }
        if (selectedAssets.length === 0) {
            toast.error('Seleccione al menos un activo');
            return;
        }

        setLoading(true);
        try {
            await assetsService.createMovement({
                ...form,
                assets: selectedAssets.map(a => a.id),
            });
            toast.success('Guía de remisión creada exitosamente');
            onCreated?.();
        } catch (err) {
            const detail = err.response?.data;
            const msg = typeof detail === 'object'
                ? Object.values(detail).flat().join(', ')
                : 'Error al crear movimiento';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const filteredAssets = availableAssets.filter(a => {
        if (!assetSearch) return true;
        const q = assetSearch.toLowerCase();
        return a.name.toLowerCase().includes(q) ||
            a.code.toLowerCase().includes(q) ||
            (a.serial_number || '').toLowerCase().includes(q);
    });

    return (
        <Card className="border border-gray-200 rounded-2xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-nominix-dark flex items-center gap-2">
                        <ArrowRightLeft size={20} className="text-nominix-electric" />
                        Nueva Guía de Remisión
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Route */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Almacén Origen *</label>
                            <select
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-nominix-electric/30"
                                value={form.origin_warehouse}
                                onChange={(e) => {
                                    setForm(f => ({ ...f, origin_warehouse: e.target.value }));
                                    setSelectedAssets([]);
                                }}
                            >
                                <option value="">Seleccionar origen...</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.branch_name} — {w.name} ({w.asset_count} activos)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Almacén Destino *</label>
                            <select
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-nominix-electric/30"
                                value={form.destination_warehouse}
                                onChange={(e) => setForm(f => ({ ...f, destination_warehouse: e.target.value }))}
                            >
                                <option value="">Seleccionar destino...</option>
                                {warehouses.filter(w => String(w.id) !== String(form.origin_warehouse)).map(w => (
                                    <option key={w.id} value={w.id}>{w.branch_name} — {w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Assets selector */}
                    {form.origin_warehouse && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Activos a trasladar ({selectedAssets.length} seleccionados)
                                </label>
                                <div className="relative max-w-[200px]">
                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none"
                                        placeholder="Buscar..."
                                        value={assetSearch}
                                        onChange={(e) => setAssetSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                {filteredAssets.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">No hay activos disponibles en este almacén</p>
                                ) : filteredAssets.map(asset => {
                                    const isSelected = selectedAssets.some(a => a.id === asset.id);
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => toggleAsset(asset)}
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-nominix-electric/5' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border ${isSelected ? 'bg-nominix-electric border-nominix-electric text-white' : 'border-gray-200'
                                                }`}>
                                                {isSelected && <Check size={12} />}
                                            </div>
                                            <span className="font-mono text-xs text-nominix-electric font-bold">{asset.code}</span>
                                            <span className="text-xs text-nominix-dark truncate">{asset.name}</span>
                                            {asset.serial_number && (
                                                <span className="text-[10px] text-gray-400 ml-auto">S/N: {asset.serial_number}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Transport details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo de transporte</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                value={form.transport_type}
                                onChange={(e) => setForm(f => ({ ...f, transport_type: e.target.value }))}
                            >
                                <option value="PRIVATE">Privado</option>
                                <option value="PUBLIC">Público</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Placa vehículo</label>
                            <input
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                value={form.vehicle_plate}
                                onChange={(e) => setForm(f => ({ ...f, vehicle_plate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Conductor</label>
                            <input
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                value={form.driver_name}
                                onChange={(e) => setForm(f => ({ ...f, driver_name: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Reason & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Motivo</label>
                            <input
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                value={form.reason}
                                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Observaciones</label>
                            <input
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                value={form.notes}
                                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-nominix-electric text-white rounded-xl text-sm font-bold hover:bg-nominix-electric/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Crear Guía de Remisión
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MovementFormView;
