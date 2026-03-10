import React, { useState, useEffect, useCallback } from 'react';
import { TrendingDown, Building2, Warehouse, Package, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { toast } from 'sonner';

/**
 * ValuationView — Dashboard de avalúo por sede y almacén.
 */
const ValuationView = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await assetsService.getValuation();
            setData(result);
        } catch (err) {
            toast.error('Error cargando avalúo');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Totales globales
    const totals = data.reduce((acc, b) => ({
        assets: acc.assets + b.total_assets,
        acquisition: acc.acquisition + b.total_acquisition_cost,
        book: acc.book + b.total_book_value,
        depreciation: acc.depreciation + b.total_depreciation,
    }), { assets: 0, acquisition: 0, book: 0, depreciation: 0 });

    const fmt = (n) => `$${Number(n).toLocaleString('es', { minimumFractionDigits: 2 })}`;

    if (loading) {
        return <p className="text-center text-gray-400 py-12">Cargando avalúo...</p>;
    }

    return (
        <div className="space-y-6">
            {/* Global Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Total Activos" value={totals.assets} icon={Package} color="text-nominix-electric" bg="bg-nominix-electric/10" />
                <SummaryCard label="Costo Adquisición" value={fmt(totals.acquisition)} icon={DollarSign} color="text-blue-600" bg="bg-blue-50" small />
                <SummaryCard label="Valor en Libros" value={fmt(totals.book)} icon={TrendingDown} color="text-emerald-600" bg="bg-emerald-50" small />
                <SummaryCard label="Deprec. Acumulada" value={fmt(totals.depreciation)} icon={TrendingDown} color="text-amber-600" bg="bg-amber-50" small />
            </div>

            {/* Per Branch */}
            {data.length === 0 ? (
                <div className="text-center py-16">
                    <Building2 size={48} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">No hay datos de avalúo disponibles</p>
                </div>
            ) : (
                data.map(branch => (
                    <Card key={branch.branch_id} className="border border-gray-200 rounded-2xl overflow-hidden">
                        {/* Branch Header */}
                        <div className="bg-gradient-to-r from-nominix-dark to-nominix-dark/90 text-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Building2 size={20} />
                                    <div>
                                        <p className="font-black text-lg">{branch.branch_name}</p>
                                        <p className="text-white/60 text-xs">{branch.total_assets} activos en {branch.warehouses.length} almacén(es)</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider">Valor neto</p>
                                    <p className="text-xl font-black">{fmt(branch.total_book_value)}</p>
                                </div>
                            </div>

                            {/* Depreciation bar */}
                            {branch.total_acquisition_cost > 0 && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                        <span>Depreciación: {fmt(branch.total_depreciation)}</span>
                                        <span>{((branch.total_depreciation / branch.total_acquisition_cost) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                        <div
                                            className="bg-amber-400 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (branch.total_depreciation / branch.total_acquisition_cost) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Warehouses Table */}
                        {branch.warehouses.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Almacén</th>
                                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Activos</th>
                                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Costo Adquisición</th>
                                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor Libros</th>
                                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Deprec.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {branch.warehouses.map(wh => (
                                            <tr key={wh.warehouse_id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 flex items-center gap-2">
                                                    <Warehouse size={14} className="text-gray-400" />
                                                    <span className="font-semibold text-nominix-dark">{wh.warehouse_name}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">{wh.asset_count}</td>
                                                <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{fmt(wh.total_acquisition_cost)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-nominix-dark">{fmt(wh.total_book_value)}</td>
                                                <td className="px-4 py-3 text-right text-amber-600 hidden md:table-cell">{fmt(wh.total_depreciation)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                ))
            )}
        </div>
    );
};

const SummaryCard = ({ label, value, icon: Icon, color, bg, small }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
            <div className={`${bg} ${color} p-2 rounded-lg`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className={`${small ? 'text-sm' : 'text-xl'} font-black text-nominix-dark`}>{value}</p>
            </div>
        </div>
    </div>
);

export default ValuationView;
