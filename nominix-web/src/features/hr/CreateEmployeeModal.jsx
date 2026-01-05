import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { X, Save, Loader2, Briefcase, User, Calendar, Building2 } from 'lucide-react';
import DepartmentSelector from '../../components/DepartmentSelector';

const CreateEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]); // <--- State for branches
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        national_id: '',
        email: '',
        position: '',
        branch: '',
        department: '',
        hire_date: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState(null);

    // Load branches when modal opens
    React.useEffect(() => {
        if (isOpen) {
            axiosClient.get('/branches/').then(res => {
                setBranches(res.data.results || res.data);
            }).catch(console.error);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Petición POST al endpoint de empleados
            await axiosClient.post('/employees/', formData);

            // Si es exitoso:
            onSuccess(); // Recarga la tabla
            onClose();   // Cierra el modal
            // Aquí podrías disparar un Toast de éxito
        } catch (err) {
            console.error(err);
            // Manejo de errores de validación de Django (ej: Cédula repetida)
            if (err.response?.data) {
                setError(JSON.stringify(err.response.data));
            } else {
                setError("Error al crear el colaborador. Intente nuevamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop con Blur */}
            <div
                className="absolute inset-0 bg-nominix-dark/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Card */}
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-nominix-dark">Nuevo Ingreso</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Registrar datos básicos del colaborador
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombres */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Nombres</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    name="first_name"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                    placeholder="Ej. Juan Andrés"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Apellidos */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Apellidos</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    name="last_name"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                    placeholder="Ej. Pérez López"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Cédula */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cédula de Identidad</label>
                            <input
                                type="text"
                                name="national_id"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                placeholder="V-12345678"
                                value={formData.national_id}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                placeholder="juan@correo.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Sede (Branch) - Prerequisite for Department */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Sede</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <select
                                name="branch"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all appearance-none"
                                value={formData.branch}
                                onChange={handleChange}
                            >
                                <option value="">-- Seleccionar Sede --</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Cargo */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cargo Inicial</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                name="position"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                placeholder="Ej. Farmacéutico"
                                value={formData.position}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Fecha de Ingreso */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Fecha de Ingreso</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="date"
                                name="hire_date"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-nominix-electric focus:ring-0 outline-none font-bold text-nominix-dark transition-all"
                                value={formData.hire_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Departamento */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Departamento</label>
                        <DepartmentSelector
                            branchId={formData.branch}
                            value={formData.department}
                            onChange={(val) => setFormData({ ...formData, department: val })}
                            error={null}
                        />
                    </div>


                    {/* Footer Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-nominix-dark transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-nominix-electric text-white rounded-xl text-sm font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-nominix-electric/20 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {loading ? 'Guardando...' : 'Registrar Colaborador'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};

export default CreateEmployeeModal;