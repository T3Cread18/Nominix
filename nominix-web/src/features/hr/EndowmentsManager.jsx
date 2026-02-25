import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import { Download, Plus, Search, MapPin, Calendar as CalendarIcon, Users } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';

const EndowmentsManager = () => {
    const queryClient = useQueryClient();
    const [selectedBranch, setSelectedBranch] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Form Modal State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        branch_id: ''
    });

    // Fetch Branches for filters and forms
    const { data: branchesData } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await axiosClient.get('/branches/');
            return res.data.results || res.data;
        }
    });

    const branches = Array.isArray(branchesData) ? branchesData : [];

    // Fetch Endowment History
    const { data: historyData, isLoading } = useQuery({
        queryKey: ['endowments', selectedBranch],
        queryFn: async () => {
            const params = selectedBranch ? { branch: selectedBranch } : {};
            const res = await axiosClient.get('/endowments/', { params });
            return res.data.results || res.data;
        }
    });

    const history = Array.isArray(historyData) ? historyData : [];

    // Massive Assignment Mutation
    const massiveMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                date: data.date,
                description: data.description,
                branch_id: data.branch_id || undefined
            };
            const res = await axiosClient.post('/endowments/massive/', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Dotación masiva registrada exitosamente");
            queryClient.invalidateQueries(['endowments']);
            setShowModal(false);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                branch_id: ''
            });
        },
        onError: (err) => {
            console.error(err);
            toast.error(err.response?.data?.error || "Error al registrar la dotación masiva");
        }
    });

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const params = selectedBranch ? { branch: selectedBranch } : {};
            const res = await axiosClient.get('/exports/endowment-sizes/', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Tallas_Personal${selectedBranch ? `_Sede_${selectedBranch}` : ''}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success("Reporte exportado correctamente");
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error("Error al exportar el reporte.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleMassiveSubmit = (e) => {
        e.preventDefault();
        massiveMutation.mutate(formData);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-nominix-dark flex items-center gap-3">
                        <div className="p-2 bg-nominix-electric/10 rounded-xl text-nominix-electric">
                            <Users size={24} />
                        </div>
                        Sistema de Dotaciones
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Gestiona uniformes, tallas y el historial de dotaciones masivas
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? 'Exportando...' : 'Exportar Tallas'}
                    </Button>
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setShowModal(true)}
                    >
                        Dotación Masiva
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="w-64">
                    <SelectField
                        label="Filtrar por Sede"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        icon={MapPin}
                        options={[
                            { value: "", label: "Todas las Sedes" },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                    />
                </div>
            </div>

            {/* History Table */}
            <Card>
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-nominix-dark uppercase tracking-widest text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-nominix-electric rounded-full"></div>
                        Historial de Dotaciones
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-wider">Fecha</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-wider">Descripción</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-wider">Sede</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400 tracking-wider">Empleados Beneficiados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">
                                        Cargando historial...
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">
                                        No hay dotaciones registradas para esta selección
                                    </td>
                                </tr>
                            ) : (
                                history.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-bold text-gray-700">
                                                <CalendarIcon size={14} className="text-gray-400" />
                                                {event.date}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-gray-800">{event.description}</td>
                                        <td className="p-4 text-sm font-bold text-gray-500">
                                            {event.branch_name ? (
                                                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 truncate max-w-[150px] inline-block">
                                                    {event.branch_name}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500">
                                                    General (Todas)
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-nominix-electric/10 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-nominix-electric">{event.employee_count}</span>
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Personas</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Massive Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-nominix-dark/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
                        <h2 className="text-xl font-black text-nominix-dark mb-1">Registrar Dotación Masiva</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
                            Actualiza la fecha para un grupo
                        </p>

                        <form onSubmit={handleMassiveSubmit} className="space-y-5">
                            <InputField
                                label="Fecha de Dotación"
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                icon={CalendarIcon}
                            />

                            <InputField
                                label="Descripción"
                                required
                                placeholder="Ej. Entrega de Uniformes Enero 2026"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />

                            <SelectField
                                label="Alcance (Sede)"
                                value={formData.branch_id}
                                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                options={[
                                    { value: "", label: "Toda la Empresa (General)" },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                                icon={MapPin}
                            />

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" loading={massiveMutation.isPending}>
                                    Confirmar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EndowmentsManager;
