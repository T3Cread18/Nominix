import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Plus, Edit2, Trash2, X, Save, MapPin } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { toast } from 'sonner';

/**
 * WarehouseView — Gestión de almacenes por sede.
 */
const WarehouseView = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', branch: '', address: '', description: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [whs, brs] = await Promise.all([
                assetsService.getWarehouses(),
                assetsService.getBranches(),
            ]);
            setWarehouses(whs);
            setBranches(brs);
        } catch (err) {
            toast.error('Error cargando almacenes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openForm = (wh = null) => {
        if (wh) {
            setEditing(wh);
            setForm({ name: wh.name, branch: wh.branch, address: wh.address || '', description: wh.description || '' });
        } else {
            setEditing(null);
            setForm({ name: '', branch: branches[0]?.id || '', address: '', description: '' });
        }
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.branch) { toast.error('Nombre y sede son requeridos'); return; }
        try {
            if (editing) {
                await assetsService.updateWarehouse(editing.id, form);
                toast.success('Almacén actualizado');
            } else {
                await assetsService.createWarehouse(form);
                toast.success('Almacén creado');
            }
            setShowForm(false);
            load();
        } catch (err) {
            toast.error('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este almacén?')) return;
        try {
            await assetsService.deleteWarehouse(id);
            toast.success('Almacén eliminado');
            load();
        } catch (err) {
            toast.error('No se puede eliminar: tiene activos asignados');
        }
    };

    // Agrupar almacenes por sede
    const grouped = branches.map(branch => ({
        ...branch,
        warehouses: warehouses.filter(w => w.branch === branch.id),
    })).filter(g => g.warehouses.length > 0 || true);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-nominix-dark uppercase tracking-wider">Almacenes por Sede</h3>
                <button
                    onClick={() => openForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-nominix-electric text-white rounded-xl text-xs font-bold hover:bg-nominix-electric/90 transition-colors"
                >
                    <Plus size={14} /> Nuevo Almacén
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <Card className="border-2 border-nominix-electric/20 rounded-2xl">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-nominix-dark">{editing ? 'Editar' : 'Nuevo'} Almacén</h4>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre *</label>
                                <input
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 outline-none"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Sede *</label>
                                <select
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 outline-none"
                                    value={form.branch}
                                    onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}
                                >
                                    <option value="">Seleccionar...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Dirección</label>
                                <input
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                                    value={form.address}
                                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl">Cancelar</button>
                            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-nominix-electric text-white rounded-xl text-xs font-bold">
                                <Save size={14} /> Guardar
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Warehouse Cards */}
            {loading ? (
                <p className="text-center text-gray-400 py-12">Cargando...</p>
            ) : (
                <div className="space-y-6">
                    {grouped.map(branch => (
                        <div key={branch.id}>
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                <MapPin size={12} /> {branch.name}
                            </h4>
                            {branch.warehouses.length === 0 ? (
                                <p className="text-xs text-gray-300 italic ml-4">Sin almacenes</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {branch.warehouses.map(wh => (
                                        <Card key={wh.id} className="border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-nominix-electric/10 text-nominix-electric p-2 rounded-lg">
                                                            <Warehouse size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-nominix-dark">{wh.name}</p>
                                                            <p className="text-[10px] text-gray-400">{wh.asset_count} activos</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openForm(wh)} className="p-1.5 text-gray-400 hover:text-nominix-electric rounded">
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {wh.total_value > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Valor total</p>
                                                        <p className="font-bold text-sm text-nominix-dark">
                                                            ${Number(wh.total_value).toLocaleString('es', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WarehouseView;
