import React, { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { Briefcase, User, Camera, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import Card from '../../../components/ui/Card'; // Usaremos Card en lugar de "Section" custom
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import Button from '../../../components/ui/Button';
import DepartmentSelector from '../../../components/DepartmentSelector';
import Avatar from '../../../components/ui/Avatar';

const EmployeeProfileForm = ({
    register,
    control,
    errors,
    watch,
    isEditing,
    branches,
    availableJobPositions,
    photoPreview,
    onPhotoSelect,
    onPhotoRemove,
    activeJobPosition
}) => {
    const fileInputRef = useRef(null);
    const firstName = watch('first_name');
    const lastName = watch('last_name');

    // Derived values
    const currentPhotoSrc = photoPreview; // La logica de fallback se puede manejar en el componente o en el padre, aqui asumimos que llega el src final o null

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Foto - Movido al componente padre o mantenido aqui? 
                En el diseño original estaba fuera del "form" tab, pero es parte del perfil.
                Lo mantendremos dentro del profile form visualmente.
            */}

            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png"
                    onChange={onPhotoSelect}
                />

                <div className="relative flex-shrink-0">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-[2rem] bg-white shadow-xl border-4 border-white overflow-hidden group cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative"
                    >
                        <Avatar
                            src={photoPreview}
                            name={`${firstName} ${lastName}`}
                            size="2xl"
                            rounded="2xl"
                            className="w-full h-full text-3xl"
                        />

                        <div className="absolute inset-0 bg-nominix-dark/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[1px]">
                            <Camera className="text-white mb-1" size={20} />
                            <span className="text-[8px] text-white font-black uppercase tracking-widest">Cambiar</span>
                        </div>
                    </div>

                    {isEditing && photoPreview && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPhotoRemove(); }}
                            className="absolute -bottom-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-all z-10"
                            title="Eliminar foto actual"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-black text-slate-800">
                        {firstName || lastName ? `${firstName} ${lastName}` : 'Nombre del Colaborador'}
                    </h2>
                    <p className="text-sm font-medium text-gray-500">{watch('position') || 'Cargo no definido'}</p>
                    {isEditing && (
                        <div className="flex gap-2 mt-3 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-500 tracking-wide">
                                {watch('national_id')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <Card>
                <Card.Section title="Información Básica">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField
                            label="Nombres"
                            {...register('first_name', { required: 'Requerido' })}
                            error={errors.first_name}
                        />
                        <InputField
                            label="Apellidos"
                            {...register('last_name', { required: 'Requerido' })}
                            error={errors.last_name}
                        />
                        <InputField
                            label="Cédula / ID"
                            {...register('national_id', { required: 'Requerido' })}
                            error={errors.national_id}
                            disabled={isEditing}
                            className={isEditing ? 'opacity-80' : ''}
                        />
                        <InputField
                            label="Correo Electrónico"
                            type="email"
                            {...register('email')}
                        />
                        <InputField
                            label="Teléfono"
                            {...register('phone')}
                        />
                        <SelectField
                            label="Género"
                            {...register('gender')}
                            options={[
                                { value: "M", label: "Masculino" },
                                { value: "F", label: "Femenino" }
                            ]}
                        />
                        <InputField
                            label="Fecha Nacimiento"
                            type="date"
                            {...register('date_of_birth')}
                        />
                        <div className="md:col-span-2">
                            <InputField
                                label="Dirección"
                                {...register('address')}
                            />
                        </div>
                    </div>
                </Card.Section>
            </Card>

            <Card>
                <Card.Section title="Datos Organizativos">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField
                            label="Fecha Ingreso"
                            type="date"
                            {...register('hire_date', { required: 'Requerido' })}
                            error={errors.hire_date}
                        />

                        {activeJobPosition ? (
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
                            <Controller
                                name="job_position"
                                control={control}
                                render={({ field }) => (
                                    <SelectField
                                        label="Cargo (Selección)"
                                        {...field}
                                        value={field.value || ""} // Ensure empty string if null
                                        options={[
                                            { value: "", label: "-- Seleccionar Cargo --" },
                                            ...availableJobPositions.map(pos => ({ value: pos.id, label: pos.name }))
                                        ]}
                                        icon={Briefcase}
                                        // Update text position when selected
                                        onChange={(e) => {
                                            field.onChange(e);
                                            // Side effect update handled in parent via watch or similar? 
                                            // The parent form uses watch('job_position') inside useEffect to update 'position' text if needed?
                                            // Actually best to handle this logic in the form submission or a separate effect in parent.
                                        }}
                                    />
                                )}
                            />
                        )}

                        <InputField
                            label="Cargo (Texto Manual)"
                            {...register('position')}
                        />

                        <Controller
                            control={control}
                            name="branch"
                            render={({ field }) => (
                                <SelectField
                                    label="Sede"
                                    {...field}
                                    value={field.value || ""}
                                    options={[
                                        { value: "", label: "Sin Sede" },
                                        ...branches.map(b => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            )}
                        />

                        <div className="space-y-2 group">
                            <label className="text-[9px] font-black uppercase text-gray-400 pl-3">Departamento</label>
                            <Controller
                                control={control}
                                name="department"
                                render={({ field }) => (
                                    <DepartmentSelector
                                        branchId={watch('branch')}
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </Card.Section>
            </Card>

            <Card>
                <Card.Section title="Información Bancaria">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField
                            label="Banco"
                            {...register('bank_name')}
                        />
                        <SelectField
                            label="Tipo de Cuenta"
                            {...register('bank_account_type')}
                            options={[
                                { value: "CURRENT", label: "Corriente" },
                                { value: "SAVINGS", label: "Ahorro" }
                            ]}
                        />
                        <div className="md:col-span-2">
                            <InputField
                                label="Número de Cuenta"
                                {...register('bank_account_number')}
                            />
                        </div>
                    </div>
                </Card.Section>
            </Card>
        </div>
    );
};

export default EmployeeProfileForm;
