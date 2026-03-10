import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Plus, Filter, Package, Eye, Edit2, Trash2,
    ChevronLeft, ChevronRight, X, Camera, Save
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { toast } from 'sonner';

/**
 * AssetListView — Inventario de activos fijos con filtros y CRUD.
 */
const AssetListView = ({ onRefresh }) => {
    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ category: '', warehouse: '', status: '' });
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const pageSize = 20;

    const loadAssets = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (search) params.search = search;
            if (filters.category) params.category = filters.category;
            if (filters.warehouse) params.warehouse = filters.warehouse;
            if (filters.status) params.status = filters.status;

            const data = await assetsService.getAssets(params);
            setAssets(data.results || data);
            setTotalCount(data.count || (data.results || data).length);
        } catch (err) {
            toast.error('Error cargando activos');
        } finally {
            setLoading(false);
        }
    }, [page, search, filters]);

    const loadFilters = useCallback(async () => {
        try {
            const [cats, whs] = await Promise.all([
                assetsService.getCategories(),
                assetsService.getWarehouses(),
            ]);
            setCategories(cats);
            setWarehouses(whs);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => { loadFilters(); }, [loadFilters]);
    useEffect(() => { loadAssets(); }, [loadAssets]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este activo?')) return;
        try {
            await assetsService.deleteAsset(id);
            toast.success('Activo eliminado');
            loadAssets();
            onRefresh?.();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleSave = async (formData) => {
        try {
            if (editingAsset) {
                await assetsService.updateAsset(editingAsset.id, formData);
                toast.success('Activo actualizado');
            } else {
                await assetsService.createAsset(formData);
                toast.success('Activo registrado');
            }
            setShowForm(false);
            setEditingAsset(null);
            loadAssets();
            onRefresh?.();
        } catch (err) {
            const detail = err.response?.data;
            const msg = typeof detail === 'object'
                ? Object.values(detail).flat().join(', ')
                : 'Error al guardar';
            toast.error(msg);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const statusBadge = (status) => {
        const map = {
            'ACTIVE': { label: 'Activo', cls: 'bg-emerald-100 text-emerald-700' },
            'MAINTENANCE': { label: 'Mantenimiento', cls: 'bg-amber-100 text-amber-700' },
            'DISPOSED': { label: 'Baja', cls: 'bg-red-100 text-red-700' },
            'TRANSFERRED': { label: 'En tránsito', cls: 'bg-blue-100 text-blue-700' },
        };
        const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.cls}`}>{s.label}</span>;
    };

    if (showForm) {
        return (
            <AssetForm
                asset={editingAsset}
                categories={categories}
                warehouses={warehouses}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingAsset(null); }}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre, serial..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric outline-none"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                        value={filters.category}
                        onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                    >
                        <option value="">Categoría</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                        value={filters.warehouse}
                        onChange={(e) => setFilters(f => ({ ...f, warehouse: e.target.value }))}
                    >
                        <option value="">Almacén</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.branch_name} — {w.name}</option>)}
                    </select>
                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                        value={filters.status}
                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">Estado</option>
                        <option value="ACTIVE">Activo</option>
                        <option value="MAINTENANCE">Mantenimiento</option>
                        <option value="DISPOSED">Baja</option>
                        <option value="TRANSFERRED">En tránsito</option>
                    </select>

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-nominix-electric text-white rounded-xl text-xs font-bold hover:bg-nominix-electric/90 transition-colors"
                    >
                        <Plus size={14} /> Nuevo Activo
                    </button>
                </div>
            </div>

            {/* Table */}
            <Card className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Código</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Nombre</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Categoría</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Ubicación</th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Valor</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Estado</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-12 text-gray-400">Cargando...</td></tr>
                            ) : assets.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-12 text-gray-400">
                                    <Package size={40} className="mx-auto mb-2 opacity-30" />
                                    No hay activos registrados
                                </td></tr>
                            ) : assets.map(asset => (
                                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-nominix-electric text-xs">{asset.code}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-nominix-dark">{asset.name}</p>
                                            {asset.serial_number && (
                                                <p className="text-[10px] text-gray-400">S/N: {asset.serial_number}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{asset.category_name}</td>
                                    <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell">
                                        {asset.branch_name} — {asset.warehouse_name}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-nominix-dark hidden sm:table-cell">
                                        ${Number(asset.current_book_value || 0).toLocaleString('es', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center">{statusBadge(asset.status)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                onClick={() => { setEditingAsset(asset); setShowForm(true); }}
                                                className="p-1.5 text-gray-400 hover:text-nominix-electric hover:bg-nominix-electric/10 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">{totalCount} activos en total</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-white transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-gray-600">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-white transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};


/**
 * AssetForm — Formulario de creación/edición de activo.
 */
const AssetForm = ({ asset, categories, warehouses, onSave, onCancel }) => {
    const [form, setForm] = useState({
        name: asset?.name || '',
        serial_number: asset?.serial_number || '',
        description: asset?.description || '',
        barcode: asset?.barcode || '',
        category: asset?.category || '',
        brand: asset?.brand || '',
        model_name: asset?.model_name || '',
        warehouse: asset?.warehouse || '',
        acquisition_date: asset?.acquisition_date || new Date().toISOString().split('T')[0],
        acquisition_cost: asset?.acquisition_cost || '',
        currency: asset?.currency || 'USD',
        useful_life_years: asset?.useful_life_years || 5,
        residual_value: asset?.residual_value || '0',
        depreciation_method: asset?.depreciation_method || 'STRAIGHT_LINE',
        status: asset?.status || 'ACTIVE',
    });

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.category || !form.warehouse || !form.acquisition_cost) {
            toast.error('Complete los campos requeridos');
            return;
        }
        onSave(form);
    };

    return (
        <Card className="border border-gray-200 rounded-2xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-nominix-dark">
                        {asset ? 'Editar Activo' : 'Nuevo Activo'}
                    </h2>
                    <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Identificación */}
                    <FormField label="Nombre *" value={form.name} onChange={v => handleChange('name', v)} />
                    <FormField label="Serial" value={form.serial_number} onChange={v => handleChange('serial_number', v)} />
                    <FormField label="Código de barras / QR" value={form.barcode} onChange={v => handleChange('barcode', v)} />
                    <FormField label="Marca" value={form.brand} onChange={v => handleChange('brand', v)} />
                    <FormField label="Modelo" value={form.model_name} onChange={v => handleChange('model_name', v)} />

                    {/* Clasificación */}
                    <FormSelect
                        label="Categoría *"
                        value={form.category}
                        onChange={v => handleChange('category', v)}
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                    />
                    <FormSelect
                        label="Almacén *"
                        value={form.warehouse}
                        onChange={v => handleChange('warehouse', v)}
                        options={warehouses.map(w => ({ value: w.id, label: `${w.branch_name} — ${w.name}` }))}
                    />

                    {/* Financiero */}
                    <FormField label="Fecha de adquisición" type="date" value={form.acquisition_date} onChange={v => handleChange('acquisition_date', v)} />
                    <FormField label="Costo de adquisición *" type="number" value={form.acquisition_cost} onChange={v => handleChange('acquisition_cost', v)} />
                    <FormSelect
                        label="Moneda"
                        value={form.currency}
                        onChange={v => handleChange('currency', v)}
                        options={[{ value: 'USD', label: 'USD' }, { value: 'VES', label: 'VES' }]}
                    />
                    <FormField label="Vida útil (años)" type="number" value={form.useful_life_years} onChange={v => handleChange('useful_life_years', v)} />
                    <FormField label="Valor residual" type="number" value={form.residual_value} onChange={v => handleChange('residual_value', v)} />
                    <FormSelect
                        label="Método de depreciación"
                        value={form.depreciation_method}
                        onChange={v => handleChange('depreciation_method', v)}
                        options={[
                            { value: 'STRAIGHT_LINE', label: 'Línea Recta' },
                            { value: 'DECLINING_BALANCE', label: 'Saldos Decrecientes' },
                            { value: 'UNITS_OF_PRODUCTION', label: 'Unidades de Producción' },
                        ]}
                    />

                    {/* Descripción */}
                    <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Descripción</label>
                        <textarea
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric outline-none"
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                        />
                    </div>

                    {/* Submit */}
                    <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2.5 bg-nominix-electric text-white rounded-xl text-sm font-bold hover:bg-nominix-electric/90 transition-colors"
                        >
                            <Save size={14} /> {asset ? 'Guardar Cambios' : 'Registrar Activo'}
                        </button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};


// ─── Componentes auxiliares ──────────────────────────
const FormField = ({ label, type = 'text', value, onChange }) => (
    <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
        <input
            type={type}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const FormSelect = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
        <select
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 focus:border-nominix-electric outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">Seleccionar...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);


export default AssetListView;
