import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table';
import axiosClient from '../../api/axiosClient';
import {
    Save,
    Loader2,
    FileSpreadsheet,
    Search,
    AlertCircle,
    Calendar,
    Download,
    Upload
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * NovedadesGrid - Componente de edición masiva de incidencias.
 * Proporciona una interfaz tipo Excel para cargar variables de nómina.
 */
const NovedadesGrid = ({ initialPeriods, initialEmployees }) => {
    const [periods, setPeriods] = useState(initialPeriods || []);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [employees, setEmployees] = useState(initialEmployees || []);
    const [loading, setLoading] = useState(!initialPeriods || !initialEmployees);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Estado local de la data de la tabla
    const [data, setData] = useState([]);

    useEffect(() => {
        if (initialEmployees && initialPeriods) {
            setupGrid();
        } else {
            loadInitialData();
        }
    }, [initialEmployees, initialPeriods]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [periodsRes, employeesRes] = await Promise.all([
                axiosClient.get('/payroll-periods/'),
                axiosClient.get('/employees/?is_active=true&page_size=1000')
            ]);
            const periodsList = periodsRes.data.results || periodsRes.data;
            const employeesList = employeesRes.data.results || employeesRes.data;

            const openPeriods = periodsList.filter(p => p.status === 'OPEN');
            setPeriods(openPeriods);
            setEmployees(employeesList);
            if (openPeriods.length > 0) {
                setSelectedPeriodId(openPeriods[0].id);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Inicializa el estado local basándose en las props.
     */
    const setupGrid = () => {
        const openPeriods = initialPeriods.filter(p => p.status === 'OPEN');
        setPeriods(openPeriods);
        setEmployees(initialEmployees);

        if (openPeriods.length > 0) {
            setSelectedPeriodId(openPeriods[0].id);
        }
        setLoading(false);
    };

    /**
     * Al cambiar el periodo o cargar empleados, busca las novedades existentes.
     */
    useEffect(() => {
        if (selectedPeriodId && employees.length > 0) {
            fetchNovelties();
        }
    }, [selectedPeriodId, employees]);

    const fetchNovelties = async () => {
        setLoading(true); // Re-activar loading al cambiar periodo
        try {
            const response = await axiosClient.get(`/payroll-novelties/?period=${selectedPeriodId}`);
            const novs = response.data.results || response.data;

            // Construir data para la tabla mapeando empleados con sus novedades
            const tableData = employees.map(emp => {
                const empNovs = novs.filter(n => n.employee === emp.id);
                return {
                    id: emp.id,
                    name: emp.full_name,
                    national_id: emp.national_id,
                    position: emp.position,
                    H_EXTRA: parseFloat(empNovs.find(n => n.concept_code === 'H_EXTRA')?.amount || 0),
                    B_NOCTURNO: parseFloat(empNovs.find(n => n.concept_code === 'B_NOCTURNO')?.amount || 0),
                    FALTAS: parseFloat(empNovs.find(n => n.concept_code === 'FALTAS')?.amount || 0),
                };
            });
            setData(tableData);
            setIsDirty(false);
        } catch (error) {
            console.error("Error al cargar novedades:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Exporta la data actual de la cuadrícula a un archivo Excel.
     */
    const handleExportExcel = () => {
        if (data.length === 0) {
            alert("No hay datos para exportar. Asegúrate de tener empleados activos.");
            return;
        }

        const periodName = periods.find(p => p.id === parseInt(selectedPeriodId))?.name || 'period';
        const exportData = data.map(row => ({
            'Cédula': row.national_id,
            'Nombre': row.name,
            'Cargo': row.position,
            'Horas Extra': row.H_EXTRA,
            'Bono Nocturno (Horas)': row.B_NOCTURNO,
            'Faltas (Días)': row.FALTAS,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Novedades");
        XLSX.writeFile(wb, `Plantilla_Novedades_${periodName.replace(/ /g, '_')}.xlsx`);
    };

    /**
     * Importa y procesa un archivo Excel para poblar la cuadrícula.
     */
    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const importedData = XLSX.utils.sheet_to_json(ws);

            // Hacer match por cédula (national_id)
            setData(currentData => {
                return currentData.map(row => {
                    const match = importedData.find(imp => imp['Cédula'] === row.national_id);
                    if (match) {
                        return {
                            ...row,
                            H_EXTRA: parseFloat(match['Horas Extra'] || 0),
                            B_NOCTURNO: parseFloat(match['Bono Nocturno (Horas)'] || match['Bono Nocturno'] || 0),
                            FALTAS: parseFloat(match['Faltas (Días)'] || match['Faltas'] || 0),
                        };
                    }
                    return row;
                });
            });
            setIsDirty(true);
            alert("Excel procesado. Revisa los datos y guarda los cambios.");
        };
        reader.readAsBinaryString(file);
        // Reset input
        e.target.value = '';
    };

    /**
     * Actualiza el estado local cuando cambia un valor en la cuadrícula.
     */
    const handleUpdateCell = (rowIndex, columnId, value) => {
        setData(old => old.map((row, index) => {
            if (index === rowIndex) {
                return {
                    ...row,
                    [columnId]: value === '' ? 0 : parseFloat(value),
                };
            }
            return row;
        }));
        setIsDirty(true);
    };

    /**
     * Envía todas las novedades modificadas al servidor en un solo lote.
     */
    const handleSave = async () => {
        if (!selectedPeriodId) {
            alert("Selecciona un periodo válido antes de guardar.");
            return;
        }

        setSaving(true);
        try {
            const payload = [];
            data.forEach(row => {
                ['H_EXTRA', 'B_NOCTURNO', 'FALTAS'].forEach(code => {
                    const amount = parseFloat(row[code]);
                    // Solo enviamos si el monto es un número válido y mayor o igual a cero
                    if (!isNaN(amount) && amount >= 0) {
                        payload.push({
                            employee_id: parseInt(row.id),
                            period_id: parseInt(selectedPeriodId),
                            concept_code: code,
                            amount: amount
                        });
                    }
                });
            });

            if (payload.length === 0) {
                alert("No hay cambios que guardar.");
                setSaving(false);
                return;
            }

            await axiosClient.post('/payroll-novelties/batch/', payload);
            setIsDirty(false);
            alert("Novedades sincronizadas exitosamente.");
        } catch (error) {
            console.error("Error al guardar:", error);
            const errorMsg = error.response?.data?.error || "No se pudo guardar el lote de novedades.";
            alert(`Error: ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    // Definición de columnas para TanStack Table
    const columns = useMemo(() => [
        {
            header: 'Colaborador',
            accessorKey: 'name',
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 leading-tight">{info.getValue()}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{info.row.original.position}</span>
                </div>
            )
        },
        {
            header: 'Cédula',
            accessorKey: 'national_id',
            cell: info => <span className="font-mono text-xs font-bold text-gray-400">{info.getValue()}</span>
        },
        {
            header: 'Horas Extra',
            accessorKey: 'H_EXTRA',
            cell: ({ getValue, row: { index }, column: { id } }) => (
                <input
                    type="number"
                    value={getValue()}
                    onChange={e => handleUpdateCell(index, id, e.target.value)}
                    className="w-full bg-transparent border-none focus:bg-white focus:ring-2 focus:ring-nominix-electric/20 text-right font-black text-gray-800 p-2 rounded-lg transition-all"
                    placeholder="0"
                />
            )
        },
        {
            header: 'Horas Noct.',
            accessorKey: 'B_NOCTURNO',
            cell: ({ getValue, row: { index }, column: { id } }) => (
                <input
                    type="number"
                    value={getValue()}
                    onChange={e => handleUpdateCell(index, id, e.target.value)}
                    className="w-full bg-transparent border-none focus:bg-white focus:ring-2 focus:ring-nominix-electric/20 text-right font-black text-gray-800 p-2 rounded-lg transition-all"
                    placeholder="0"
                />
            )
        },
        {
            header: 'Faltas (Días)',
            accessorKey: 'FALTAS',
            cell: ({ getValue, row: { index }, column: { id } }) => (
                <input
                    type="number"
                    value={getValue()}
                    onChange={e => handleUpdateCell(index, id, e.target.value)}
                    className="w-full bg-slate-50 border border-transparent focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-100 text-right font-black text-red-500 p-3 rounded-xl transition-all outline-none placeholder:text-red-200"
                    placeholder="0"
                />
            )
        }
    ], [data]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse">
                <Loader2 className="animate-spin text-nominix-electric mb-4" size={40} />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Cargando Plantilla de Datos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toolbar Superior */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-xl">
                        <FileSpreadsheet size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Carga Masiva de Novedades</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">Sincronización por Lotes (Batch)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {/* Botones de Excel */}
                    <div className="flex gap-2 mr-2">
                        <button
                            onClick={handleExportExcel}
                            className="p-3.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 flex items-center gap-2 text-xs font-bold"
                            title="Descargar Plantilla Excel"
                        >
                            <Download size={16} />
                            <span className="hidden xl:inline">Plantilla</span>
                        </button>

                        <label className="p-3.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 flex items-center gap-2 text-xs font-bold cursor-pointer">
                            <Upload size={16} />
                            <span className="hidden xl:inline">Importar</span>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <div className="flex-1 lg:flex-initial min-w-[240px] relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            value={selectedPeriodId}
                            onChange={e => setSelectedPeriodId(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border-2 border-transparent focus:border-nominix-electric rounded-2xl text-sm font-bold transition-all appearance-none cursor-pointer"
                        >
                            {periods.length > 0 ? (
                                periods.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Quincena Abierta)</option>
                                ))
                            ) : (
                                <option value="">No hay periodos abiertos</option>
                            )}
                        </select>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className={cn(
                            "flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                            isDirty
                                ? "bg-nominix-electric text-white shadow-xl shadow-nominix-electric/20 hover:scale-[1.02] active:scale-95"
                                : "bg-gray-100 text-gray-400 pointer-events-none opacity-50"
                        )}
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                {saving && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                        <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-3xl shadow-2xl border border-gray-100 animate-in zoom-in-95">
                            <Loader2 className="animate-spin text-nominix-electric" size={24} />
                            <span className="text-sm font-black uppercase tracking-widest text-gray-700">Persistiendo Datos en Batch...</span>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="bg-gray-50/70 border-b border-gray-100">
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-6 py-1.5 first:py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Search size={12} />
                        Universo de Colaboradores: {data.length}
                    </div>
                    {isDirty && (
                        <div className="flex items-center gap-2 text-nominix-electric font-black animate-pulse">
                            <AlertCircle size={14} />
                            Existen cambios sin persistir en el periodo actual
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NovedadesGrid;
