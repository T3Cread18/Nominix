import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Plus,
    Settings2,
    Trash2,
    DollarSign,
    Percent,
    Code2,
    CheckCircle2,
    XCircle,
    Loader2,
    Search,
    X,
    Save,
    HelpCircle,
    Edit2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const ConceptCatalog = () => {
    const [concepts, setConcepts] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Estado inicial del formulario
    const [newConcept, setNewConcept] = useState({
        code: '',
        name: '',
        kind: 'EARNING',
        computation_method: 'FIXED_AMOUNT',
        value: '0.00',
        formula: '', // Campo nuevo para la fórmula
        currency: 'USD',
        active: true,
        is_salary_incidence: true,
        show_on_payslip: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [concRes, currRes] = await Promise.all([
                axiosClient.get('/payroll-concepts/'),
                axiosClient.get('/currencies/')
            ]);
            setConcepts(concRes.data.results || concRes.data);
            setCurrencies(currRes.data.results || currRes.data);
        } catch (error) {
            console.error("Error cargando catálogo de conceptos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setNewConcept({
            code: '',
            name: '',
            kind: 'EARNING',
            computation_method: 'FIXED_AMOUNT',
            value: '0.00',
            formula: '',
            currency: 'USD',
            active: true,
            is_salary_incidence: true,
            show_on_payslip: true
        });
        setIsAdding(false);
        setIsEditing(false);
        setEditingId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsAdding(true);
    };

    const handleOpenEdit = (concept) => {
        setNewConcept({
            code: concept.code,
            name: concept.name,
            kind: concept.kind,
            computation_method: concept.computation_method,
            value: concept.value,
            formula: concept.formula || '',
            currency: concept.currency_code || 'USD',
            active: concept.active,
            is_salary_incidence: concept.is_salary_incidence,
            show_on_payslip: concept.show_on_payslip ?? true
        });
        setEditingId(concept.id);
        setIsEditing(true);
        setIsAdding(true); // Reusamos el modal
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Limpiar datos según el método seleccionado
            const payload = { ...newConcept };
            if (payload.computation_method === 'DYNAMIC_FORMULA') {
                payload.value = '0.00';
            } else {
                payload.formula = '';
            }

            if (isEditing) {
                await axiosClient.put(`/payroll-concepts/${editingId}/`, payload);
            } else {
                await axiosClient.post('/payroll-concepts/', payload);
            }

            await fetchData();
            resetForm();
        } catch (error) {
            alert(error.response?.data?.error || "Error al guardar concepto. Verifique que el código sea único.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConcept = async (id) => {
        if (!confirm("¿Está seguro de eliminar este concepto global? Podría afectar cálculos de nómina históricos.")) return;
        try {
            await axiosClient.delete(`/payroll-concepts/${id}/`);
            await fetchData();
        } catch (error) {
            alert("No se pudo eliminar el concepto. Revise si está siendo usado por algún empleado.");
        }
    };

    const filteredConcepts = concepts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[700px] flex flex-col relative">

            {/* Modal Crear Concepto */}
            {isAdding && (
                <div className="absolute inset-0 z-50 bg-nominix-dark/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h4 className="text-xl font-black text-nominix-dark uppercase tracking-widest">
                                    {isEditing ? 'Editar Concepto' : 'Nuevo Concepto Global'}
                                </h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1">Definición de Regla Salarial</p>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-300 hover:text-nominix-dark">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Código (Sugerido: BONO_X)</label>
                                <input
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric"
                                    value={newConcept.code}
                                    onChange={e => setNewConcept({ ...newConcept, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Nombre Descriptivo</label>
                                <input
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric"
                                    value={newConcept.name}
                                    onChange={e => setNewConcept({ ...newConcept, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Tipo</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric"
                                    value={newConcept.kind}
                                    onChange={e => setNewConcept({ ...newConcept, kind: e.target.value })}
                                >
                                    <option value="EARNING">Asignación (+) </option>
                                    <option value="DEDUCTION">Deducción (-)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Método de Cálculo</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric"
                                    value={newConcept.computation_method}
                                    onChange={e => setNewConcept({ ...newConcept, computation_method: e.target.value })}
                                >
                                    <option value="FIXED_AMOUNT">Monto Fijo</option>
                                    <option value="PERCENTAGE_OF_BASIC">Porcentaje del Sueldo</option>
                                    <option value="DYNAMIC_FORMULA">Fórmula Dinámica (Python Safe)</option>
                                </select>
                            </div>

                            {/* CONDICIONAL: Si es Fórmula Dinámica mostramos el editor, sino el input simple */}
                            {newConcept.computation_method === 'DYNAMIC_FORMULA' ? (
                                <div className="col-span-2 bg-gray-900 rounded-2xl p-6 border border-gray-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                            <Code2 size={14} className="text-nominix-electric" /> Editor de Fórmula
                                        </label>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">SALARIO_MENSUAL</span>
                                            <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">DIAS</span>
                                            <span className="text-[9px] font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">LUNES</span>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full bg-transparent text-green-400 font-mono text-sm outline-none min-h-[100px] resize-y placeholder-gray-700"
                                        placeholder="(SALARIO_MENSUAL / 30) * DIAS"
                                        value={newConcept.formula}
                                        onChange={e => setNewConcept({ ...newConcept, formula: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 font-medium">
                                        Use operaciones matemáticas estándar (+, -, *, /) y funciones como min(), max().
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Valor Base</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric pl-10"
                                            value={newConcept.value}
                                            onChange={e => setNewConcept({ ...newConcept, value: e.target.value })}
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            {newConcept.computation_method === 'PERCENTAGE_OF_BASIC' ? <Percent size={16} /> : <DollarSign size={16} />}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {newConcept.computation_method === 'FIXED_AMOUNT' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Moneda</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-nominix-electric"
                                        value={newConcept.currency}
                                        onChange={e => setNewConcept({ ...newConcept, currency: e.target.value })}
                                    >
                                        {currencies.map(curr => (
                                            <option key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="col-span-2 flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-gray-300 text-nominix-electric focus:ring-nominix-electric"
                                        checked={newConcept.is_salary_incidence}
                                        onChange={e => setNewConcept({ ...newConcept, is_salary_incidence: e.target.checked })}
                                    />
                                    <span className="text-[10px] font-black text-gray-500 uppercase">Incidencia Salarial</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-gray-300 text-nominix-electric focus:ring-nominix-electric"
                                        checked={newConcept.show_on_payslip}
                                        onChange={e => setNewConcept({ ...newConcept, show_on_payslip: e.target.checked })}
                                    />
                                    <span className="text-[10px] font-black text-gray-500 uppercase">Mostrar en Recibo</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-gray-300 text-nominix-electric focus:ring-nominix-electric"
                                        checked={newConcept.active}
                                        onChange={e => setNewConcept({ ...newConcept, active: e.target.checked })}
                                    />
                                    <span className="text-[10px] font-black text-gray-500 uppercase">Concepto Activo</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="col-span-2 py-5 bg-nominix-electric text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-nominix-electric/90 transition-all shadow-xl shadow-nominix-electric/20 mt-4 active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Registrar Concepto Global
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-3xl font-black text-nominix-dark">Configuración de Conceptos</h3>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">DICCIONARIO MAESTRO DE REGLAS SALARIALES</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-3 px-8 py-4 bg-nominix-dark text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-nominix-dark/10 active:scale-95"
                    >
                        <Plus size={20} /> Crear Nuevo Concepto
                    </button>
                </div>

                <div className="relative max-w-xl group">
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        className="w-full pl-14 pr-6 py-5 bg-white border border-gray-200 rounded-[1.5rem] focus:border-nominix-electric focus:ring-4 focus:ring-nominix-electric/5 focus:outline-none font-bold text-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-nominix-electric transition-colors" size={24} />
                </div>
            </div>

            <div className="flex-1 p-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 overflow-y-auto">
                {loading ? (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-200">
                        <Loader2 className="animate-spin mb-6" size={50} />
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">sincronizando bóveda de reglas...</p>
                    </div>
                ) : filteredConcepts.length > 0 ? filteredConcepts.map(concept => (
                    <div key={concept.id} className="group p-8 rounded-[2.5rem] border border-gray-100 hover:border-nominix-electric/40 hover:shadow-2xl hover:shadow-nominix-electric/5 transition-all relative overflow-hidden bg-white animate-in zoom-in-95 duration-300">
                        <div className={cn(
                            "absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 opacity-[0.03] transition-transform group-hover:scale-110 group-hover:rotate-12",
                            concept.kind === 'EARNING' ? "text-green-500" : "text-red-500"
                        )}>
                            {concept.kind === 'EARNING' ? <DollarSign size={128} /> : <Percent size={128} />}
                        </div>

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <span className={cn(
                                "text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest",
                                concept.kind === 'EARNING' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                            )}>
                                {concept.kind === 'EARNING' ? 'Asignación' : 'Deducción'}
                            </span>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                                {concept.code}
                            </span>
                        </div>

                        <h4 className="text-lg font-black text-nominix-dark mb-2 group-hover:text-nominix-electric transition-colors leading-tight">{concept.name}</h4>

                        <div className="flex flex-wrap items-center gap-3 mb-8">
                            <div className="bg-gray-50 p-2 px-3 rounded-xl flex items-center gap-2 border border-transparent group-hover:border-gray-100 transition-all">
                                {concept.computation_method === 'DYNAMIC_FORMULA' ? <Code2 size={12} className="text-nominix-electric" /> : <Settings2 size={12} className="text-gray-400" />}
                                <span className="text-[10px] font-black uppercase text-gray-500">
                                    {concept.computation_method === 'DYNAMIC_FORMULA' ? 'Fórmula Dinámica' : concept.computation_method.replace(/_/g, ' ')}
                                </span>
                            </div>
                            {concept.is_salary_incidence && (
                                <div className="bg-blue-50/50 p-2 px-3 rounded-xl flex items-center gap-2 border border-blue-50">
                                    <CheckCircle2 size={12} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase text-blue-500">Salario Integral</span>
                                </div>
                            )}
                            <div className={cn(
                                "p-2 px-3 rounded-xl flex items-center gap-2 border",
                                concept.show_on_payslip
                                    ? "bg-purple-50/50 border-purple-50"
                                    : "bg-gray-100 border-gray-200"
                            )}>
                                {concept.show_on_payslip ? (
                                    <>
                                        <CheckCircle2 size={12} className="text-purple-500" />
                                        <span className="text-[10px] font-black uppercase text-purple-500">Visible en Recibo</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={12} className="text-gray-400" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">Oculto</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-dashed pt-6 border-gray-100 mt-auto">
                            <div>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mb-1">
                                    {concept.computation_method === 'DYNAMIC_FORMULA' ? 'Fórmula Definida' : 'Valor Defecto'}
                                </p>
                                {concept.computation_method === 'DYNAMIC_FORMULA' ? (
                                    <code className="text-[10px] bg-gray-900 text-green-400 p-2 rounded-lg block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                                        {concept.formula}
                                    </code>
                                ) : (
                                    <p className="text-2xl font-black text-nominix-dark tracking-tighter">
                                        {concept.value} <span className="text-sm text-gray-300 font-bold ml-1">
                                            {concept.computation_method === 'PERCENTAGE_OF_BASIC' ? '%' : (concept.currency_data?.symbol || '$')}
                                        </span>
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(concept)}
                                    className="p-3 bg-blue-50 text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all scale-90 hover:scale-100 shadow-lg shadow-blue-500/10"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDeleteConcept(concept.id)}
                                    className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all scale-90 hover:scale-100 shadow-lg shadow-red-500/10"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-100 border-4 border-dashed rounded-[3rem] border-gray-50 m-10">
                        <XCircle size={64} className="mb-4 opacity-20" />
                        <h4 className="text-xl font-black uppercase tracking-widest text-gray-200">Bóveda Vacía</h4>
                        <p className="text-xs font-bold uppercase mt-2">No se encontraron conceptos para su búsqueda</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConceptCatalog;