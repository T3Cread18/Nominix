import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { X, Save, Loader2, Briefcase, User, Calendar, Building2 } from 'lucide-react';
import DepartmentSelector from '../../components/DepartmentSelector';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';

const CreateEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]); // <--- State for branches
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        national_id: '',
        rif: '',
        email: '',
        position: '',
        branch: '',
        department: '',
        hire_date: new Date().toISOString().split('T')[0],
        shirt_size: '',
        pants_size: '',
        shoe_size: ''
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
                <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombres */}
                        <InputField
                            label="Nombres"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Juan Andrés"
                            icon={User}
                        />

                        {/* Apellidos */}
                        <InputField
                            label="Apellidos"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Pérez López"
                            icon={User}
                        />

                        {/* Cédula */}
                        <InputField
                            label="Cédula de Identidad"
                            name="national_id"
                            value={formData.national_id}
                            onChange={handleChange}
                            required
                            placeholder="V-12345678"
                        />
                        {/* RIF */}
                        <InputField
                            label="RIF"
                            name="rif"
                            value={formData.rif}
                            onChange={handleChange}
                            placeholder="V-12345678-0"
                        />

                        {/* Email */}
                        <InputField
                            label="Correo Electrónico"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            type="email"
                            placeholder="juan@correo.com"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Sede (Branch) - Prerequisite for Department */}
                        <SelectField
                            label="Sede"
                            name="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            required
                            icon={Building2}
                            options={[
                                { value: "", label: "-- Seleccionar Sede --" },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                        />

                        {/* Cargo */}
                        <InputField
                            label="Cargo Inicial"
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Farmacéutico"
                            icon={Briefcase}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 pl-3">Departamento</label>
                        <DepartmentSelector
                            branchId={formData.branch}
                            value={formData.department}
                            onChange={(val) => setFormData({ ...formData, department: val })}
                            error={null}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Fecha de Ingreso */}
                        <InputField
                            label="Fecha de Ingreso"
                            name="hire_date"
                            value={formData.hire_date}
                            onChange={handleChange}
                            required
                            type="date"
                            icon={Calendar}
                        />


                    </div>

                    {/* SECCIÓN TALLAS */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Dotación y Tallas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Talla Camisa"
                                name="shirt_size"
                                value={formData.shirt_size}
                                onChange={handleChange}
                                placeholder="S, M, L..."
                            />
                            <InputField
                                label="Talla Pantalón"
                                name="pants_size"
                                value={formData.pants_size}
                                onChange={handleChange}
                                placeholder="30, 32..."
                            />
                            <InputField
                                label="Talla Calzado"
                                name="shoe_size"
                                value={formData.shoe_size}
                                onChange={handleChange}
                                placeholder="38, 40..."
                            />
                        </div>
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