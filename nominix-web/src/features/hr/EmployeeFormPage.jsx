import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import DepartmentSelector from '../../components/DepartmentSelector';
import ConfirmationModal from '../../components/ConfirmationModal'; // <--- 1. IMPORTAR MODAL
import LaborContractsManager from './contracts/LaborContractsManager';
import EmployeeConcepts from './EmployeeConcepts'; // <--- NUEVO: Conceptos de Nómina
import { toast } from 'sonner';
import {
    ArrowLeft, Save, Briefcase, Calculator,

    User, Camera, Loader2, Building2, ChevronLeft,
    UserX, UserCheck, Trash2 // <--- 2. NUEVOS ICONOS
} from 'lucide-react';
import { cn } from '../../utils/cn';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';

const EmployeeFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    // --- ESTADOS ---
    const [employee, setEmployee] = useState({
        first_name: '', last_name: '', national_id: '', email: '',
        phone: '', address: '', position: '', branch: '', department: '',
        hire_date: new Date().toISOString().split('T')[0],
        gender: '', bank_name: '', bank_account_number: '', bank_account_type: '',
        rif: '', is_active: true, // <--- Importante para el botón
        photo: null
    });

    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // Estado para el Modal de Confirmación
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        isDangerous: false,
        confirmText: ''
    });

    // Catálogos
    const [branches, setBranches] = useState([]);

    // Sub-entidades (Para evitar re-fetch en pestañas)
    const [contracts, setContracts] = useState([]);
    const [assignedConcepts, setAssignedConcepts] = useState([]);
    const [exchangeRate, setExchangeRate] = useState(60.00);
    const [loadingSubs, setLoadingSubs] = useState(false);

    // Lista de cargos para selector
    const [availableJobPositions, setAvailableJobPositions] = useState([]);

    const fileInputRef = useRef(null);
    const hasLoaded = useRef(false);

    // Helpers de Contrato
    const activeContract = contracts.find(c => c.is_active);
    const activeJobPosition = activeContract?.job_position; // Objeto (si el serializer lo trae) o ID

    // --- CARGA INICIAL ---
    useEffect(() => {
        if (!hasLoaded.current) {
            const loadCatalogs = async () => {
                try {
                    const res = await axiosClient.get('/branches/');
                    setBranches(res.data.results || res.data);
                } catch (error) { toast.error("Error cargando sedes"); }
            };
            loadCatalogs();

            if (isEditing) {
                fetchEmployee();
                fetchSubEntities();
            }
            hasLoaded.current = true;
        }
    }, [id, isEditing]);

    const fetchSubEntities = async () => {
        if (!id) return;
        setLoadingSubs(true);
        try {
            const [contractsRes, conceptsRes, rateRes] = await Promise.all([
                axiosClient.get(`/contracts/?employee=${id}`),
                axiosClient.get(`/employee-concepts/?employee=${id}`),
                axiosClient.get('/exchange-rates/latest/?currency=USD')
            ]);

            setContracts(contractsRes.data.results || contractsRes.data);
            setAssignedConcepts(conceptsRes.data.results || conceptsRes.data);

            const rate = rateRes.data.rate || rateRes.data.value || 60.00;
            setExchangeRate(parseFloat(rate));
        } catch (error) {
            console.error("Error loading sub-entities:", error);
        } finally {
            setLoadingSubs(false);
        }
    };

    const fetchEmployee = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/employees/${id}/`);
            setEmployee(response.data);
        } catch (error) {
            toast.error("No se encontró el colaborador");
            navigate('/personnel');
        } finally {
            setLoading(false);
        }
    };

    // --- CARGA DE CARGOS CUANDO CAMBIA EL DEPARTAMENTO O SEDE ---
    useEffect(() => {
        const fetchJobPositions = async () => {
            // Si hay departamento seleccionado, cargar cargos de ese depto
            const deptId = typeof employee.department === 'object' ? employee.department?.id : employee.department;
            if (deptId) {
                try {
                    const res = await axiosClient.get(`/job-positions/?department=${deptId}`);
                    setAvailableJobPositions(res.data.results || res.data);
                } catch (e) { console.error(e); }
            } else {
                setAvailableJobPositions([]);
            }
        };
        fetchJobPositions();
    }, [employee.department]);

    // --- MANEJADORES DE FOTO ---
    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Formato no soportado. Use JPG o PNG.");
            return;
        }
        setSelectedPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setPhotoPreview(reader.result); };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = async () => {
        if (!isEditing) return;
        if (!confirm("¿Seguro que desea eliminar la foto de perfil?")) return;
        try {
            await axiosClient.patch(`/employees/${id}/`, { photo: null });
            setEmployee(prev => ({ ...prev, photo: null }));
            setPhotoPreview(null);
            setSelectedPhotoFile(null);
            toast.success("Foto eliminada");
        } catch (error) {
            toast.error("Error al eliminar la foto");
        }
    };

    const handleProfileChange = (field, value) => {
        setEmployee(prev => ({ ...prev, [field]: value }));
    };

    // --- 3. LÓGICA DAR DE BAJA / REACTIVAR ---
    const executeStatusChange = async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false })); // Cerrar modal

        const newStatus = !employee.is_active;
        // Si damos de baja, sugerimos fecha de hoy como egreso, si reactivamos, limpiamos egreso (opcional)
        const payload = {
            is_active: newStatus,
            termination_date: newStatus ? null : new Date().toISOString().split('T')[0]
        };

        try {
            const res = await axiosClient.patch(`/employees/${id}/`, payload);
            setEmployee(prev => ({ ...prev, is_active: res.data.is_active }));
            toast.success(newStatus ? "Colaborador reactivado exitosamente" : "Colaborador dado de baja correctamente");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cambiar el estatus del colaborador");
        }
    };

    const handleToggleStatus = () => {
        if (employee.is_active) {
            // Flujo de BAJA
            setConfirmState({
                isOpen: true,
                title: '¿Dar de baja al colaborador?',
                message: 'El colaborador pasará a estado INACTIVO. Se registrará la fecha de hoy como fecha de egreso. No se eliminarán sus datos históricos.',
                action: executeStatusChange,
                isDangerous: true,
                confirmText: 'Sí, Dar de Baja'
            });
        } else {
            // Flujo de REACTIVACIÓN
            setConfirmState({
                isOpen: true,
                title: '¿Reactivar colaborador?',
                message: 'El colaborador volverá a estar ACTIVO en la nómina y se podrá procesar pagos nuevamente.',
                action: executeStatusChange,
                isDangerous: false, // Verde/Azul
                confirmText: 'Sí, Reactivar'
            });
        }
    };

    // --- GUARDADO GENERAL ---
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = { ...employee };

        // Convertimos objetos a IDs si es necesario
        if (payload.branch && typeof payload.branch === 'object') payload.branch = payload.branch.id;
        if (payload.department && typeof payload.department === 'object') payload.department = payload.department.id;
        if (payload.job_position && typeof payload.job_position === 'object') payload.job_position = payload.job_position.id;

        // Limpiar campos que no deben ir en el payload o que son de lectura
        delete payload.photo;
        delete payload.full_name;
        delete payload.concepts;
        delete payload.contracts;

        let savedEmployeeId = id;

        try {
            if (isEditing) {
                await axiosClient.put(`/employees/${id}/`, payload);
            } else {
                const res = await axiosClient.post('/employees/', payload);
                savedEmployeeId = res.data.id;
            }

            if (selectedPhotoFile && savedEmployeeId) {
                const formData = new FormData();
                formData.append('photo', selectedPhotoFile);
                await axiosClient.patch(`/employees/${savedEmployeeId}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            toast.success(isEditing ? "Expediente actualizado" : "Colaborador creado exitosamente");
            if (!isEditing) {
                navigate(`/personnel/${savedEmployeeId}`, { replace: true });
            }
            setSelectedPhotoFile(null);
            setPhotoPreview(null);
            if (isEditing) fetchEmployee();

        } catch (error) {
            console.error(error);
            const msg = error.response?.data ? "Verifique los campos resaltados" : "Error al guardar";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const getPhotoSrc = () => {
        if (photoPreview) return photoPreview;
        if (employee.photo) return employee.photo;
        return null;
    };
    const currentPhotoSrc = getPhotoSrc();

    // --- RENDER ---
    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="animate-spin text-nominix-electric mx-auto mb-4" size={40} />
                <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Cargando Expediente...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 relative">

            {/* 4. MODAL DE CONFIRMACIÓN */}
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                message={confirmState.message}
                isDangerous={confirmState.isDangerous}
                confirmText={confirmState.confirmText}
            />

            {/* TOP BAR */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/personnel')}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-nominix-dark transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">
                            {isEditing ? employee.full_name || `${employee.first_name} ${employee.last_name}` : 'Nuevo Ingreso'}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {isEditing ? `Ficha: ${employee.employee_code || 'S/N'}` : 'Formulario de registro'}
                            </p>
                            {/* Badge de estado en el header */}
                            {isEditing && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border",
                                    employee.is_active ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-500 border-red-200"
                                )}>
                                    {employee.is_active ? 'Activo' : 'Baja'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">

                    {/* 5. BOTÓN DAR DE BAJA / REACTIVAR */}
                    {isEditing && (
                        <button
                            onClick={handleToggleStatus}
                            className={cn(
                                "p-2 rounded-xl transition-all border flex items-center gap-2",
                                employee.is_active
                                    ? "text-red-400 border-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-100" // Estilo para Dar de Baja
                                    : "text-green-500 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-700" // Estilo para Reactivar
                            )}
                            title={employee.is_active ? "Dar de baja" : "Reactivar colaborador"}
                        >
                            {employee.is_active ? <UserX size={20} /> : <UserCheck size={20} />}
                            {!employee.is_active && <span className="text-[10px] font-black uppercase pr-1">Reactivar</span>}
                        </button>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-nominix-dark text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-nominix-dark/20"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mt-8 px-6">

                {/* BANNER DE AVISO SI ESTÁ DADO DE BAJA */}
                {!employee.is_active && isEditing && (
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 bg-white rounded-full text-red-500 shadow-sm">
                            <UserX size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-red-900">Colaborador Inactivo</h4>
                            <p className="text-xs text-red-600">Este empleado fue dado de baja y no aparecerá en las nóminas activas.</p>
                        </div>
                    </div>
                )}

                {/* HEADER DE PERFIL */}
                <div className={cn(
                    "bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 mb-8 transition-all",
                    !employee.is_active && "opacity-75 grayscale-[0.5]" // Efecto visual si está inactivo
                )}>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png" onChange={handlePhotoSelect} />

                    <div className="relative flex-shrink-0">
                        <div
                            onClick={() => fileInputRef.current.click()}
                            className="w-24 h-24 rounded-[2rem] bg-white shadow-xl border-4 border-white overflow-hidden group cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative"
                        >
                            {currentPhotoSrc ? (
                                <img src={currentPhotoSrc} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-nominix-electric flex items-center justify-center text-white text-3xl font-black">
                                    {(employee.first_name?.[0] || '') + (employee.last_name?.[0] || '')}
                                </div>
                            )}

                            <div className="absolute inset-0 bg-nominix-dark/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[1px]">
                                <Camera className="text-white mb-1" size={20} />
                                <span className="text-[8px] text-white font-black uppercase tracking-widest">Cambiar</span>
                            </div>
                        </div>

                        {isEditing && employee.photo && !selectedPhotoFile && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }}
                                className="absolute -bottom-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-all z-10"
                                title="Eliminar foto actual"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-2xl font-black text-slate-800">
                            {employee.first_name || employee.last_name ? `${employee.first_name} ${employee.last_name}` : 'Nombre del Colaborador'}
                        </h2>
                        <p className="text-sm font-medium text-gray-500">{employee.position || 'Cargo no definido'}</p>
                        {isEditing && (
                            <div className="flex gap-2 mt-3 justify-center md:justify-start">
                                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-500 tracking-wide">
                                    {employee.national_id}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS DE NAVEGACIÓN */}
                <div className="flex gap-6 border-b border-gray-200 mb-8 overflow-x-auto">
                    <TabButton id="profile" icon={User} label="Datos Personales" active={activeTab} onClick={setActiveTab} />
                    {isEditing && (
                        <>
                            <TabButton id="contract" icon={Briefcase} label="Contrato & Laboral" active={activeTab} onClick={setActiveTab} />
                            <TabButton id="payroll" icon={Calculator} label="Conceptos de Nómina" active={activeTab} onClick={setActiveTab} />
                        </>
                    )}
                </div>

                {/* CONTENIDO DEL FORMULARIO CON CSS HIDDEN PARA PRESERVAR ESTADO */}
                <div className={cn(activeTab !== 'profile' && "hidden")}>
                    <form id="employee-form" onSubmit={handleSave} className="space-y-8 animate-in fade-in">
                        <Section title="Información Básica">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Nombres" name="first_name" value={employee.first_name} onChange={e => handleProfileChange('first_name', e.target.value)} required />
                                <InputField label="Apellidos" name="last_name" value={employee.last_name} onChange={e => handleProfileChange('last_name', e.target.value)} required />
                                <InputField label="Cédula / ID" name="national_id" value={employee.national_id} onChange={e => handleProfileChange('national_id', e.target.value)} required disabled={isEditing} className={isEditing ? 'opacity-80' : ''} />
                                <InputField label="Correo Electrónico" name="email" value={employee.email} onChange={e => handleProfileChange('email', e.target.value)} type="email" />
                                <InputField label="Teléfono" name="phone" value={employee.phone} onChange={e => handleProfileChange('phone', e.target.value)} />
                                <SelectField
                                    label="Género"
                                    name="gender"
                                    value={employee.gender}
                                    onChange={e => handleProfileChange('gender', e.target.value)}
                                    options={[
                                        { value: "M", label: "Masculino" },
                                        { value: "F", label: "Femenino" }
                                    ]}
                                />
                                <InputField label="Fecha Nacimiento" name="date_of_birth" value={employee.date_of_birth} onChange={e => handleProfileChange('date_of_birth', e.target.value)} type="date" />
                                <InputField label="Dirección" name="address" value={employee.address} onChange={e => handleProfileChange('address', e.target.value)} className="md:col-span-2" />
                            </div>
                        </Section>

                        <Section title="Datos Organizativos">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Fecha Ingreso" name="hire_date" value={employee.hire_date} onChange={e => handleProfileChange('hire_date', e.target.value)} type="date" required />

                                {activeJobPosition && typeof activeJobPosition === 'object' ? (
                                    <div className="space-y-2 group">
                                        <label className="text-[9px] font-black uppercase text-gray-400 pl-3">Cargo (Estructura)</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                className="w-full p-4 bg-gray-100 border border-gray-100 rounded-2xl font-bold text-sm text-gray-600 outline-none cursor-not-allowed"
                                                value={`${activeJobPosition.name} (${activeJobPosition.code})`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-nominix-electric" title="Definido por contrato">
                                                <Briefcase size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <SelectField
                                        label="Cargo (Selección)"
                                        name="job_position"
                                        value={typeof employee.job_position === 'object' ? employee.job_position?.id : employee.job_position || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const selectedObj = availableJobPositions.find(p => p.id == val);
                                            setEmployee(prev => ({
                                                ...prev,
                                                job_position: val,
                                                position: selectedObj ? selectedObj.name : prev.position
                                            }));
                                        }}
                                        options={[
                                            { value: "", label: "-- Seleccionar Cargo --" },
                                            ...availableJobPositions.map(pos => ({ value: pos.id, label: pos.name }))
                                        ]}
                                        icon={Briefcase}
                                    />
                                )}
                                <InputField label="Cargo (Texto Manual)" name="position" value={employee.position} onChange={e => handleProfileChange('position', e.target.value)} />

                                <SelectField
                                    label="Sede"
                                    name="branch"
                                    value={typeof employee.branch === 'object' ? employee.branch?.id : employee.branch}
                                    onChange={e => handleProfileChange('branch', e.target.value)}
                                    options={[
                                        { value: "", label: "Sin Sede" },
                                        ...branches.map(b => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                                <div className="space-y-2 group">
                                    <label className="text-[9px] font-black uppercase text-gray-400 pl-3">Departamento</label>
                                    <DepartmentSelector
                                        branchId={typeof employee.branch === 'object' ? employee.branch?.id : employee.branch}
                                        value={typeof employee.department === 'object' ? employee.department?.id : employee.department}
                                        onChange={(val) => handleProfileChange('department', val)}
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section title="Información Bancaria">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Banco" name="bank_name" value={employee.bank_name} onChange={e => handleProfileChange('bank_name', e.target.value)} />
                                <SelectField
                                    label="Tipo de Cuenta"
                                    name="bank_account_type"
                                    value={employee.bank_account_type}
                                    onChange={e => handleProfileChange('bank_account_type', e.target.value)}
                                    options={[
                                        { value: "CURRENT", label: "Corriente" },
                                        { value: "SAVINGS", label: "Ahorro" }
                                    ]}
                                />
                                <InputField label="Número de Cuenta" name="bank_account_number" value={employee.bank_account_number} onChange={e => handleProfileChange('bank_account_number', e.target.value)} className="md:col-span-2" />
                            </div>
                        </Section>
                    </form>
                </div>

                {isEditing && (
                    <>
                        <div className={cn(activeTab !== 'contract' && "hidden", "bg-white p-8 rounded-[2rem] border border-gray-100")}>
                            <LaborContractsManager
                                employeeId={id}
                                employeeData={employee}
                                initialContracts={contracts}
                                onRefresh={fetchSubEntities}
                                loading={loadingSubs}
                            />
                        </div>
                        <div className={cn(activeTab !== 'payroll' && "hidden", "bg-white p-8 rounded-[2rem] border border-gray-100")}>
                            <EmployeeConcepts
                                employeeId={id}
                                employeeData={employee}
                                initialAssignedConcepts={assignedConcepts}
                                initialActiveContract={contracts.find(c => c.is_active)}
                                initialExchangeRate={exchangeRate}
                                onRefresh={fetchSubEntities}
                                isLoading={loadingSubs}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// SUB-COMPONENTES (Sin cambios)
const Section = ({ title, children }) => (
    <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-8 border-b border-gray-50 pb-4">{title}</h4>
        {children}
    </section>
);

const TabButton = ({ id, icon: Icon, label, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(id)}
        className={cn(
            "flex items-center gap-2 pb-3 border-b-2 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            active === id ? "border-nominix-electric text-nominix-electric" : "border-transparent text-gray-400 hover:text-gray-600"
        )}
    >
        <Icon size={16} /> {label}
    </button>
);

export default EmployeeFormPage;