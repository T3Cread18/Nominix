import React, { useRef } from 'react';
import { Controller } from 'react-hook-form';
import {
    Briefcase, User, Camera, Trash2, Phone, Mail, MapPin,
    Building2, CreditCard, Package, Calendar, Hash, UploadCloud
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import InputField from '../../../components/ui/InputField';
import SelectField from '../../../components/ui/SelectField';
import DepartmentSelector from '../../../components/DepartmentSelector';
import Avatar from '../../../components/ui/Avatar';

// ─── Venezuelan banks ────────────────────────────────────────────────────────
const VENEZUELAN_BANKS = [
    { value: '', label: '— Seleccionar Banco —' },
    { value: 'Banco de Venezuela',      label: '0102 · Banco de Venezuela' },
    { value: 'Venezolano de Crédito',   label: '0104 · Venezolano de Crédito' },
    { value: 'Banco Mercantil',         label: '0105 · Banco Mercantil' },
    { value: 'BBVA Provincial',         label: '0108 · BBVA Provincial' },
    { value: 'Banesco',                 label: '0114 · Banesco' },
    { value: 'Banco Exterior',          label: '0115 · Banco Exterior' },
    { value: 'BOD',                     label: '0116 · BOD — Occidental de Descuento' },
    { value: 'Banco Caroní',            label: '0128 · Banco Caroní' },
    { value: 'Banplus',                 label: '0134 · Banplus' },
    { value: 'BFC',                     label: '0151 · BFC Banco Fondo Común' },
    { value: '100% Banco',              label: '0156 · 100% Banco' },
    { value: 'Banco del Tesoro',        label: '0163 · Banco del Tesoro' },
    { value: 'Banco Agrícola',          label: '0166 · Banco Agrícola de Venezuela' },
    { value: 'Bancrecer',               label: '0168 · Bancrecer' },
    { value: 'Mi Banco',                label: '0169 · Mi Banco' },
    { value: 'Banco Activo',            label: '0171 · Banco Activo' },
    { value: 'Bancamiga',               label: '0172 · Bancamiga' },
    { value: 'Banco Bicentenario',      label: '0175 · Banco Bicentenario' },
    { value: 'Banfanb',                 label: '0177 · Banfanb' },
    { value: 'BNC',                     label: '0191 · BNC Nacional de Crédito' },
];

// ─── Section card ─────────────────────────────────────────────────────────────
const ACCENT = {
    blue:   'bg-blue-50   text-blue-500   border-blue-100',
    green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50  text-purple-600  border-purple-100',
    amber:  'bg-amber-50   text-amber-600   border-amber-100',
};

const FormSection = ({ icon: Icon, title, description, accent = 'blue', children }) => (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 pt-6 pb-5 border-b border-gray-50 flex items-center gap-3.5">
            <div className={cn('p-2.5 rounded-xl border', ACCENT[accent])}>
                <Icon size={17} />
            </div>
            <div>
                <h3 className="text-[13px] font-black text-slate-800 leading-tight">{title}</h3>
                {description && (
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{description}</p>
                )}
            </div>
        </div>
        <div className="px-8 py-7">{children}</div>
    </div>
);

// ─── Gender toggle ────────────────────────────────────────────────────────────
const GenderToggle = ({ value, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-gray-600 pl-3 tracking-wider block">
            Género
        </label>
        <div className="flex gap-2">
            {[
                { v: 'M', label: 'Masculino' },
                { v: 'F', label: 'Femenino' },
            ].map(({ v, label }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={cn(
                        'flex-1 py-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                        value === v
                            ? 'bg-nominix-electric border-nominix-electric text-white shadow-md shadow-nominix-electric/25'
                            : 'bg-slate-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-white'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    </div>
);

// ─── Account type toggle ──────────────────────────────────────────────────────
const AccountTypeToggle = ({ value, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-gray-600 pl-3 tracking-wider block">
            Tipo de Cuenta
        </label>
        <div className="flex gap-2">
            {[
                { v: 'CURRENT', label: 'Corriente' },
                { v: 'SAVINGS',  label: 'Ahorro' },
            ].map(({ v, label }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={cn(
                        'flex-1 py-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                        value === v
                            ? 'bg-nominix-electric border-nominix-electric text-white shadow-md shadow-nominix-electric/25'
                            : 'bg-slate-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-white'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    </div>
);

// ─── Completion ring (solo en creación) ───────────────────────────────────────
const CompletionRing = ({ watch }) => {
    const vals = [
        watch('first_name'), watch('last_name'), watch('national_id'),
        watch('email'), watch('phone'), watch('hire_date'),
        watch('branch'), watch('department'),
        watch('bank_name'), watch('bank_account_number'),
    ];
    const filled = vals.filter(v => v && String(v).trim() !== '').length;
    const pct    = Math.round((filled / vals.length) * 100);
    const r      = 22;
    const circ   = 2 * Math.PI * r;
    const dash   = (pct / 100) * circ;
    const color  = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1';

    return (
        <div className="flex flex-col items-center shrink-0" title={`Perfil ${pct}% completo`}>
            <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
                <circle
                    cx="28" cy="28" r={r} fill="none"
                    stroke={color} strokeWidth="4.5"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform="rotate(-90 28 28)"
                    style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }}
                />
                <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="900" fill={color}>
                    {pct}%
                </text>
            </svg>
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-gray-400 mt-0.5">
                Completitud
            </span>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
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
    activeJobPosition,
}) => {
    const fileInputRef = useRef(null);
    const firstName = watch('first_name');
    const lastName  = watch('last_name');

    return (
        <div className="space-y-5 animate-in fade-in duration-300">

            {/* ── HERO CARD ── */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* Accent band */}
                <div className="h-1.5 bg-gradient-to-r from-nominix-electric via-blue-400 to-indigo-500" />

                <div className="p-8 flex flex-col sm:flex-row items-center gap-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png"
                        onChange={onPhotoSelect}
                    />

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-28 h-28 rounded-[1.5rem] overflow-hidden cursor-pointer group border-4 border-white shadow-xl ring-2 ring-gray-100 hover:ring-nominix-electric/40 transition-all hover:scale-[1.03] active:scale-95"
                        >
                            <Avatar
                                src={photoPreview}
                                name={`${firstName} ${lastName}`}
                                size="2xl"
                                rounded="2xl"
                                className="w-full h-full text-3xl"
                            />
                            <div className="absolute inset-0 bg-nominix-dark/65 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5 backdrop-blur-[2px]">
                                <UploadCloud className="text-white" size={22} />
                                <span className="text-[9px] text-white font-black uppercase tracking-widest">Cambiar foto</span>
                            </div>
                        </div>
                        {isEditing && photoPreview && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onPhotoRemove(); }}
                                className="absolute -bottom-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-md border border-gray-100 hover:bg-red-50 z-10 transition-colors"
                                title="Quitar foto"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                        <h2 className="text-2xl font-black text-slate-800 truncate leading-tight">
                            {(firstName || lastName)
                                ? `${firstName} ${lastName}`.trim()
                                : <span className="text-gray-300 font-black">Nombre del Colaborador</span>
                            }
                        </h2>
                        <p className="text-sm text-gray-400 font-medium mt-0.5">
                            {watch('position') || <span className="italic text-gray-300">Cargo no definido</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                            {watch('national_id') && (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                    CI: {watch('national_id')}
                                </span>
                            )}
                            {watch('hire_date') && (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-500 rounded-lg text-[10px] font-bold">
                                    Ingreso: {new Date(watch('hire_date') + 'T12:00:00').toLocaleDateString('es-VE', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        timeZone: 'America/Caracas'
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Completion ring — only on create */}
                    {!isEditing && <CompletionRing watch={watch} />}
                </div>
            </div>

            {/* ── IDENTIFICACIÓN PERSONAL ── */}
            <FormSection
                icon={User}
                title="Identificación Personal"
                description="Datos de identidad, contacto y ubicación del colaborador"
                accent="blue"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField
                        label="Nombres"
                        placeholder="Juan Carlos"
                        {...register('first_name', { required: 'Requerido' })}
                        error={errors.first_name?.message}
                    />
                    <InputField
                        label="Apellidos"
                        placeholder="González Pérez"
                        {...register('last_name', { required: 'Requerido' })}
                        error={errors.last_name?.message}
                    />

                    {/* Cédula con prefijo visual */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-600 pl-3 tracking-wider flex items-center gap-1.5">
                            Cédula / ID
                            <span className="text-red-400">*</span>
                        </label>
                        <div className={cn(
                            'flex rounded-2xl border overflow-hidden transition-all',
                            isEditing
                                ? 'border-gray-100 bg-gray-100/60'
                                : 'border-gray-100/50 bg-slate-50 focus-within:border-nominix-electric focus-within:bg-white focus-within:ring-4 focus-within:ring-nominix-electric/5',
                            errors.national_id && 'border-red-300 bg-red-50/40'
                        )}>
                            <span className={cn(
                                'px-4 flex items-center text-xs font-black tracking-widest border-r shrink-0',
                                isEditing
                                    ? 'bg-gray-200/60 text-gray-400 border-gray-200'
                                    : 'bg-white/70 text-gray-400 border-gray-100'
                            )}>
                                V/E
                            </span>
                            <input
                                {...register('national_id', { required: 'Requerido' })}
                                disabled={isEditing}
                                placeholder="12.345.678"
                                className="flex-1 px-4 py-4 bg-transparent text-sm font-bold text-nominix-dark outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>
                        {errors.national_id && (
                            <p className="text-[10px] font-bold text-red-500 pl-1 animate-in slide-in-from-left-1">
                                {errors.national_id.message}
                            </p>
                        )}
                        {isEditing && (
                            <p className="text-[10px] text-gray-400 pl-1 font-medium">
                                La cédula no puede modificarse después del registro.
                            </p>
                        )}
                    </div>

                    <InputField
                        label="RIF"
                        placeholder="J-12345678-9"
                        {...register('rif')}
                    />
                    <InputField
                        label="Correo Electrónico"
                        type="email"
                        placeholder="colaborador@empresa.com"
                        icon={Mail}
                        {...register('email')}
                    />
                    <InputField
                        label="Teléfono"
                        placeholder="0414-123.45.67"
                        icon={Phone}
                        {...register('phone')}
                    />

                    <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                            <GenderToggle value={field.value} onChange={field.onChange} />
                        )}
                    />

                    <InputField
                        label="Fecha de Nacimiento"
                        type="date"
                        icon={Calendar}
                        {...register('date_of_birth')}
                    />

                    <div className="md:col-span-2">
                        <InputField
                            label="Dirección de Habitación"
                            placeholder="Calle, Sector, Municipio, Estado"
                            icon={MapPin}
                            {...register('address')}
                        />
                    </div>
                </div>
            </FormSection>

            {/* ── DATOS ORGANIZATIVOS ── */}
            <FormSection
                icon={Building2}
                title="Datos Organizativos"
                description="Ubicación y cargo dentro de la estructura de la empresa"
                accent="green"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField
                        label="Fecha de Ingreso"
                        type="date"
                        icon={Calendar}
                        {...register('hire_date', { required: 'Requerido' })}
                        error={errors.hire_date?.message}
                    />

                    <Controller
                        control={control}
                        name="branch"
                        render={({ field }) => (
                            <SelectField
                                label="Sede"
                                icon={Building2}
                                {...field}
                                value={field.value || ''}
                                options={[
                                    { value: '', label: 'Sin Sede asignada' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        )}
                    />

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-600 pl-3 tracking-wider block">
                            Departamento
                        </label>
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

                    {/* Cargo — muestra card si hay contrato, selector si no */}
                    {activeJobPosition ? (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-600 pl-3 tracking-wider block">
                                Cargo (por Contrato)
                            </label>
                            <div className="flex items-center gap-3 p-4 bg-nominix-electric/5 border-2 border-nominix-electric/20 rounded-2xl">
                                <div className="p-2 bg-nominix-electric/10 rounded-xl shrink-0">
                                    <Briefcase size={15} className="text-nominix-electric" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-nominix-dark truncate">
                                        {activeJobPosition.name}
                                    </p>
                                    <p className="text-[10px] text-nominix-electric font-bold tracking-wide">
                                        {activeJobPosition.code}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Controller
                            name="job_position"
                            control={control}
                            render={({ field }) => (
                                <SelectField
                                    label="Cargo (Estructura Org.)"
                                    icon={Briefcase}
                                    {...field}
                                    value={field.value || ''}
                                    options={[
                                        { value: '', label: '— Seleccionar Cargo —' },
                                        ...availableJobPositions.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                />
                            )}
                        />
                    )}

                    <InputField
                        label="Cargo (Texto Libre)"
                        placeholder="Ej: Analista de Sistemas"
                        icon={Briefcase}
                        {...register('position')}
                    />
                </div>
            </FormSection>

            {/* ── INFORMACIÓN BANCARIA ── */}
            <FormSection
                icon={CreditCard}
                title="Información Bancaria"
                description="Datos para acreditación de nómina en cuenta"
                accent="purple"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <SelectField
                        label="Banco"
                        icon={Building2}
                        {...register('bank_name')}
                        options={VENEZUELAN_BANKS}
                    />

                    <Controller
                        name="bank_account_type"
                        control={control}
                        render={({ field }) => (
                            <AccountTypeToggle value={field.value} onChange={field.onChange} />
                        )}
                    />

                    <div className="md:col-span-2 space-y-1.5">
                        <InputField
                            label="Número de Cuenta"
                            placeholder="01140000000000000000"
                            icon={Hash}
                            {...register('bank_account_number')}
                        />
                        <p className="text-[10px] text-gray-400 pl-3 font-medium">
                            20 dígitos sin guiones ni espacios.
                        </p>
                    </div>
                </div>
            </FormSection>

            {/* ── DOTACIÓN Y TALLAS ── */}
            <FormSection
                icon={Package}
                title="Dotación y Tallas"
                description="Información para entrega de uniformes y equipos de trabajo"
                accent="amber"
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <InputField
                        label="Talla Camisa"
                        placeholder="S, M, L, XL"
                        {...register('shirt_size')}
                    />
                    <InputField
                        label="Talla Pantalón"
                        placeholder="32, 34, 36"
                        {...register('pants_size')}
                    />
                    <InputField
                        label="Talla Calzado"
                        placeholder="38, 40, 42"
                        {...register('shoe_size')}
                    />
                    <InputField
                        label="Última Dotación"
                        type="date"
                        {...register('last_endowment_date')}
                    />
                </div>
            </FormSection>

        </div>
    );
};

export default EmployeeProfileForm;
