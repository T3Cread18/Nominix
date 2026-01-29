import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    useEmployee,
    useCreateEmployee,
    useUpdateEmployee,
    usePatchEmployee
} from '../../hooks/useEmployees';
import { useBranches, useJobPositions } from '../../hooks/useOrganization';
// Nuevo Hook
import { useContracts } from '../../hooks/useLabor';

import axiosClient from '../../api/axiosClient';

import {
    ArrowLeft, Save, Briefcase, Calculator,
    User, UserX, UserCheck, Shield, CalendarClock
} from 'lucide-react';
import { cn } from '../../utils/cn';

// UI Components
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Skeleton';
import ConfirmationModal from '../../components/ConfirmationModal';

// Subcomponents
import EmployeeProfileForm from './components/EmployeeProfileForm';
import LaborContractsManager from './contracts/LaborContractsManager';
import EmployeeConcepts from './EmployeeConcepts';
import ManageSocialBenefits from '../social-benefits/ManageSocialBenefits';
import EmployeeVariationsTab from './components/EmployeeVariationsTab';

const EmployeeFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    // --- HOOKS DE DATOS ---
    const {
        data: employee,
        isLoading: loadingEmployee,
        refetch: refetchEmployee
    } = useEmployee(id, { enabled: isEditing });

    const { data: branches = [] } = useBranches();

    // Usamos useContracts para determinar el cargo activo, sin fetch manual
    const { data: contracts = [] } = useContracts(id, { enabled: isEditing });

    // Mutations
    const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
    const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
    const { mutate: patchEmployee, isPending: isPatching } = usePatchEmployee();

    const isSaving = isCreating || isUpdating || isPatching;

    // --- FORM STATE ---
    const methods = useForm({
        defaultValues: {
            first_name: '', last_name: '', national_id: '', email: '',
            phone: '', address: '', position: '', branch: '', department: '',
            hire_date: new Date().toISOString().split('T')[0],
            gender: 'M', bank_name: '', bank_account_number: '', bank_account_type: 'CURRENT',
            is_active: true,
            job_position: ''
        }
    });

    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = methods;

    // --- LOCAL STATE ---
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    // Cargos dinámicos por departamento
    const currentDept = watch('department');
    const { data: availableJobPositions = [] } = useJobPositions(currentDept, { enabled: !!currentDept });

    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', action: null, isDangerous: false });

    // Helpers
    const activeContract = contracts.find(c => c.is_active);
    const activeJobPosition = activeContract?.job_position; // Objeto del contrato

    // DEBUG
    console.log('[EmployeeFormPage] isEditing:', isEditing);
    console.log('[EmployeeFormPage] contracts:', contracts);
    console.log('[EmployeeFormPage] ManageSocialBenefits imported:', !!ManageSocialBenefits);

    // --- EFECTOS ---

    // 1. Cargar datos iniciales en el formulario
    useEffect(() => {
        if (employee) {
            // Aplanar objetos a IDs para el formulario
            const flatData = { ...employee };
            if (flatData.branch && typeof flatData.branch === 'object') flatData.branch = flatData.branch.id;
            if (flatData.department && typeof flatData.department === 'object') flatData.department = flatData.department.id;
            if (flatData.job_position && typeof flatData.job_position === 'object') flatData.job_position = flatData.job_position.id;

            reset(flatData);
            setPhotoPreview(employee.photo); // URL remota
        }
    }, [employee, reset]);


    // --- HANDLERS ---

    const onSubmit = (data) => {
        const payload = { ...data };
        // Limpiamos campos que no van al payload
        delete payload.photo;

        // Handlers de éxito comunes
        const onSuccess = (savedData) => {
            const savedId = savedData.id;

            // Subir foto si existe
            if (selectedPhotoFile) {
                const formData = new FormData();
                formData.append('photo', selectedPhotoFile);
                // Usamos axios directo porque es multipart
                axiosClient.patch(`/employees/${savedId}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }).then(() => {
                    refetchEmployee();
                });
            }

            if (!isEditing) {
                navigate(`/personnel/${savedId}`, { replace: true });
            } else {
                refetchEmployee();
            }
        };

        if (isEditing) {
            updateEmployee({ id, data: payload }, { onSuccess });
        } else {
            createEmployee(payload, { onSuccess });
        }
    };

    // Foto
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

    const handlePhotoRemove = async () => {
        if (!isEditing) {
            setPhotoPreview(null);
            setSelectedPhotoFile(null);
            return;
        }
        if (confirm("¿Eliminar foto de perfil?")) {
            patchEmployee({ id, data: { photo: null } }, {
                onSuccess: () => {
                    setPhotoPreview(null);
                    setSelectedPhotoFile(null);
                    refetchEmployee();
                }
            });
        }
    };

    // Baja / Reactivación
    const handleToggleStatus = () => {
        const isActive = employee?.is_active;
        const newStatus = !isActive;
        const action = isActive ? "Dar de Baja" : "Reactivar";

        setConfirmState({
            isOpen: true,
            title: `¿${action} al colaborador?`,
            message: isActive
                ? 'El colaborador pasará a estado INACTIVO (egreso). No se eliminarán sus datos históricos.'
                : 'El colaborador volverá a estar ACTIVO en la nómina.',
            isDangerous: isActive,
            confirmText: `Sí, ${action}`,
            action: () => {
                const payload = {
                    is_active: newStatus,
                    termination_date: newStatus ? null : new Date().toISOString().split('T')[0]
                };
                patchEmployee({ id, data: payload }, {
                    onSuccess: () => setConfirmState(prev => ({ ...prev, isOpen: false }))
                });
            }
        });
    };


    if (loadingEmployee) return <PageLoader message="Cargando Expediente..." />;

    const employeeName = isEditing
        ? (employee?.first_name || employee?.last_name ? `${employee.first_name} ${employee.last_name}` : 'Sin Nombre')
        : 'Nuevo Ingreso';

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 relative">
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
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/personnel')}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-nominix-dark transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 leading-tight">
                            {employeeName}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {isEditing ? `Ficha: ${employee?.employee_code || 'S/N'}` : 'Formulario de registro'}
                            </p>
                            {isEditing && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border",
                                    employee?.is_active ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-500 border-red-200"
                                )}>
                                    {employee?.is_active ? 'Activo' : 'Baja'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isEditing && (
                        <button
                            onClick={handleToggleStatus}
                            className={cn(
                                "p-2 rounded-xl transition-all border flex items-center gap-2",
                                employee?.is_active
                                    ? "text-red-400 border-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                                    : "text-green-500 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-700"
                            )}
                            title={employee?.is_active ? "Dar de baja" : "Reactivar"}
                        >
                            {employee?.is_active ? <UserX size={20} /> : <UserCheck size={20} />}
                        </button>
                    )}

                    <Button
                        onClick={handleSubmit(onSubmit)}
                        loading={isSaving}
                        icon={Save}
                        variant="dark"
                    >
                        Guardar
                    </Button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mt-8 px-6">
                {/* Alerta de Inactivo */}
                {!employee?.is_active && isEditing && (
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-red-500 shadow-sm"><UserX size={18} /></div>
                        <div>
                            <h4 className="text-sm font-bold text-red-900">Colaborador Inactivo</h4>
                            <p className="text-xs text-red-600">Este empleado fue dado de baja.</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="profile" icon={User}>Datos Personales</TabsTrigger>
                        {isEditing && <TabsTrigger value="benefits" icon={Shield}>Prestaciones</TabsTrigger>}
                        {isEditing && <TabsTrigger value="contract" icon={Briefcase}>Contrato & Laboral</TabsTrigger>}
                        {isEditing && <TabsTrigger value="payroll" icon={Calculator}>Conceptos</TabsTrigger>}
                        {isEditing && <TabsTrigger value="variations" icon={CalendarClock}>Incidencias</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="profile">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <EmployeeProfileForm
                                register={register}
                                control={control}
                                errors={errors}
                                watch={watch}
                                isEditing={isEditing}
                                branches={branches}
                                availableJobPositions={availableJobPositions}
                                photoPreview={photoPreview}
                                onPhotoSelect={handlePhotoSelect}
                                onPhotoRemove={handlePhotoRemove}
                                activeJobPosition={activeJobPosition}
                            />
                        </form>
                    </TabsContent>

                    {isEditing && (
                        <>
                            <TabsContent value="contract">
                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100">
                                    <LaborContractsManager
                                        employeeId={id}
                                        employeeData={employee}
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="benefits">
                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100">
                                    <ManageSocialBenefits
                                        employeeId={id}
                                        employeeData={employee}
                                        contracts={contracts}
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="payroll">
                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100">
                                    <EmployeeConcepts
                                        employeeId={id}
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="variations">
                                <EmployeeVariationsTab employeeId={id} />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
        </div>
    );
};

export default EmployeeFormPage;
