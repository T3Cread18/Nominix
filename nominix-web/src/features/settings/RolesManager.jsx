import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { Shield, Plus, Edit2, Trash2, Loader2, Save, X, AlertCircle } from 'lucide-react';
import { Card, Button, InputField } from '../../components/ui';
import { cn } from '../../utils/cn';

// Diccionario para traducir nombres de modelos a Módulos amigables
const MODEL_TO_MODULE_MAP = {
    // RRHH
    'employee': 'Gestión de Empleados',
    'employeevariation': 'Variaciones de Empleado',
    'employeedailyshift': 'Turnos y Asistencia',
    'jobposition': 'Cargos',
    'department': 'Departamentos',
    'branch': 'Sedes',
    'endowmentevent': 'Dotaciones',
    'laborcontract': 'Contratos Laborales',

    // Nómina
    'payrollperiod': 'Periodos de Nómina',
    'payrollconcept': 'Conceptos de Nómina',
    'employeeconcept': 'Asignación de Conceptos',
    'payrollnovelty': 'Novedades',
    'payrollpolicy': 'Políticas de Nómina',
    'payrollreceipt': 'Recibos de Pago',
    'company': 'Dashboard (Widgets)',
    'dashboard_metrics': 'Dashboard (Widgets)',
    'dashboard_tasks': 'Dashboard (Widgets)',
    'dashboard_events': 'Dashboard (Widgets)',

    // Vacaciones
    'vacation': 'Gestión de Vacaciones',
    'vacationsettings': 'Ajustes de Vacaciones',

    // Préstamos
    'loan': 'Préstamos y Anticipos',
    'loanpayment': 'Abonos a Préstamos',

    // Declaraciones e Impuestos
    'incesdeclaration': 'Declaraciones INCES',
    'lppssdeclaration': 'Declaraciones LPPSS',
    'islrretention': 'Retenciones ISLR',
    'islrretentiontable': 'Tramos ISLR',

    // Configuración y Tablas Básicas
    'company': 'Configuración de Empresa',
    'currency': 'Monedas',
    'exchangerate': 'Tasas de Cambio',
    'interestratebcv': 'Tasas BCV',

    // Generales
    'attendancerecord': 'Asistencia General',
    'report': 'Reportes',
    'historicalemployee': 'Historial de Cambios',

    // Control Biométrico y Asistencia
    'biometricdevice': 'Dispositivos Biométricos',
    'biometricdevicetype': 'Tipos de Dispositivo Biométrico',
    'attendanceevent': 'Registro de Asistencia',
    'employeedevicemapping': 'Mapeo Empleado-Dispositivo',

    // Menús de Navegación
    'menu_personnel': 'Menus de Navegación (Visibilidad)',
    'menu_payroll': 'Menus de Navegación (Visibilidad)',
    'menu_catalog': 'Menus de Navegación (Visibilidad)',
    'menu_closures': 'Menus de Navegación (Visibilidad)',
    'menu_vacations': 'Menus de Navegación (Visibilidad)',
    'menu_attendance': 'Menus de Navegación (Visibilidad)',
    'menu_config': 'Menus de Navegación (Visibilidad)',
    'menu_loans': 'Menus de Navegación (Visibilidad)',
    'menu_reports': 'Menus de Navegación (Visibilidad)',
    'menu_declarations': 'Menus de Navegación (Visibilidad)',
    'menu_roles': 'Menus de Navegación (Visibilidad)',

    // Sistema
    'user': 'Usuarios del Sistema',
    'group': 'Roles del Sistema'
};

// Objeto para ignorar permisos técnicos que no aportan valor visual al usuario final rrhh
const EXCLUDED_MODELS = [
    // Históricos
    'historicalcompany', 'historicaldepartment', 'historicalendowmentevent',
    'historicaljobposition', 'historicallaborcontract', 'historicalloan',
    'historicalpayrollpolicy', 'lppssdeclarationline',
    // Internos de Django y Frameworks
    'logentry', 'permission', 'contenttype', 'session', 'token',
    'tokenproxy', 'blacklistedtoken', 'outstandingtoken', 'tenant', 'domain',
    // Tareas programadas (celery/django-q si las hubiera)
    'task', 'schedule', 'success', 'failure'
];

const translateAction = (codename, name) => {
    if (codename.startsWith('view_menu_')) return name.replace('Can view ', 'Ver ');
    if (codename.startsWith('add_')) return 'Crear';
    if (codename.startsWith('change_')) return 'Editar / Modificar';
    if (codename.startsWith('delete_')) return 'Eliminar';
    if (codename.startsWith('view_')) return 'Ver / Consultar';
    return name; // Fallback al nombre original
};

const RolesManager = () => {
    const { tenant } = useAuth();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Formulario actual
    const [currentRole, setCurrentRole] = useState({ name: '', permission_ids: [] });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                axiosClient.get('/roles/'),
                axiosClient.get('/permissions/?limit=1000') // Fetch all permissions, bypass pagination
            ]);
            setRoles(rolesRes.data.results || rolesRes.data);
            setPermissions(permsRes.data.results || permsRes.data);
            setError('');
        } catch (err) {
            setError('Error al cargar datos. Verifique su conexión y permisos.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (currentRole.id) {
                // Edit
                await axiosClient.put(`/roles/${currentRole.id}/`, currentRole);
            } else {
                // Create
                await axiosClient.post('/roles/', currentRole);
            }
            setIsEditing(false);
            setCurrentRole({ name: '', permission_ids: [] });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.name?.[0] || 'Error al guardar el rol. Posiblemente el nombre ya existe.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Está seguro de que desea eliminar este Rol?")) return;
        try {
            await axiosClient.delete(`/roles/${id}/`);
            fetchData();
        } catch (err) {
            setError('Error al eliminar el rol. Podría estar asignado a usuarios.');
        }
    };

    const togglePermission = (permId) => {
        const currentIds = currentRole.permission_ids || [];
        if (currentIds.includes(permId)) {
            setCurrentRole({ ...currentRole, permission_ids: currentIds.filter(id => id !== permId) });
        } else {
            setCurrentRole({ ...currentRole, permission_ids: [...currentIds, permId] });
        }
    };

    // Agrupar permisos por módulo amigable para mejor UX
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const words = perm.codename.split('_');
        const modelName = words.slice(1).join('_'); // ej: 'employee'

        if (EXCLUDED_MODELS.includes(modelName)) return acc;

        let friendlyModuleName = MODEL_TO_MODULE_MAP[modelName] || 'Otros Permisos';

        // Refuerzo para asegurar que los permisos de dashboard se agrupen correctamente
        if (perm.codename.includes('dashboard')) {
            friendlyModuleName = 'Dashboard (Widgets)';
        }

        let actionLabel = translateAction(perm.codename, perm.name);

        // Si cae en "Otros Permisos" y el label es genérico ("Crear"), le añadimos el nombre del modelo
        // para que no sea ambiguo (ej. "Crear (tenant)") o usamos perm.name si es más legible.
        if (friendlyModuleName === 'Otros Permisos') {
            actionLabel = perm.name.charAt(0).toUpperCase() + perm.name.slice(1);
        }

        if (!acc[friendlyModuleName]) acc[friendlyModuleName] = [];

        acc[friendlyModuleName].push({
            id: perm.id,
            actionLabel: actionLabel,
            technicalName: perm.codename
        });

        return acc;
    }, {});

    // Ordenar alfabéticamente las llaves
    const sortedModules = Object.keys(groupedPermissions).sort();


    if (loading && roles.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Shield className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Roles y Permisos</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {tenant ? `Gestionando roles para ${tenant.name}` : "Cargando..."}
                        </p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setCurrentRole({ name: '', permission_ids: [] });
                            setIsEditing(true);
                            setError('');
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> Nuevo Rol
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md flex items-center gap-3">
                    <AlertCircle className="text-red-600" size={20} />
                    <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
            )}

            {isEditing ? (
                <Card>
                    <Card.Header>
                        <Card.Title>{currentRole.id ? 'Editar Rol' : 'Crear Nuevo Rol'}</Card.Title>
                    </Card.Header>

                    <div className="space-y-6">
                        <InputField
                            label="Nombre del Rol"
                            placeholder="Ej. Analista de Nómina"
                            value={currentRole.name}
                            onChange={e => setCurrentRole({ ...currentRole, name: e.target.value })}
                        />

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 pl-3 mb-2 block tracking-wider">Permisos Asignados</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {sortedModules.map(moduleName => {
                                    const perms = groupedPermissions[moduleName];
                                    // Determinar si todos los permisos del módulo están chequeados
                                    const isAllChecked = perms.every(p => currentRole.permission_ids?.includes(p.id));
                                    const isSomeChecked = perms.some(p => currentRole.permission_ids?.includes(p.id)) && !isAllChecked;

                                    const handleGlobalToggle = () => {
                                        let newIds = [...(currentRole.permission_ids || [])];
                                        if (isAllChecked) {
                                            // Quitar todos
                                            newIds = newIds.filter(id => !perms.map(p => p.id).includes(id));
                                        } else {
                                            // Agregar todos (evitando duplicados)
                                            perms.forEach(p => {
                                                if (!newIds.includes(p.id)) newIds.push(p.id);
                                            });
                                        }
                                        setCurrentRole({ ...currentRole, permission_ids: newIds });
                                    };

                                    return (
                                        <div key={moduleName} className={cn(
                                            "border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden",
                                            isSomeChecked || isAllChecked
                                                ? "bg-nominix-electric/5 border-nominix-electric/30 shadow-sm"
                                                : "bg-slate-50/50 border-slate-200"
                                        )}>
                                            {/* Header del Grupo */}
                                            <div className="flex items-center justify-between mb-4 border-b border-black/5 pb-3">
                                                <h3 className={cn(
                                                    "text-[11px] font-black uppercase tracking-widest",
                                                    isSomeChecked || isAllChecked ? "text-nominix-electric" : "text-slate-500"
                                                )}>
                                                    {moduleName}
                                                </h3>
                                                <input
                                                    type="checkbox"
                                                    title={isAllChecked ? "Desmarcar todos" : "Marcar todos"}
                                                    className="w-4 h-4 rounded text-nominix-electric border-slate-300 focus:ring-nominix-electric/30 cursor-pointer"
                                                    checked={isAllChecked}
                                                    ref={input => {
                                                        if (input) input.indeterminate = isSomeChecked;
                                                    }}
                                                    onChange={handleGlobalToggle}
                                                />
                                            </div>

                                            {/* Lista de Permisos */}
                                            <div className="space-y-2.5">
                                                {perms.map(p => {
                                                    const isChecked = currentRole.permission_ids?.includes(p.id);
                                                    return (
                                                        <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <div className="relative flex items-center shrink-0">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-slate-300 text-nominix-electric focus:ring-nominix-electric/20 transition-all cursor-pointer"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePermission(p.id)}
                                                                />
                                                            </div>
                                                            <span className={cn(
                                                                "text-xs transition-colors truncate block w-full",
                                                                isChecked ? "text-slate-800 font-bold" : "text-slate-500 group-hover:text-slate-700"
                                                            )} title={p.technicalName}>
                                                                {p.actionLabel}
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <Card.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => setIsEditing(false)}
                            icon={X}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!currentRole.name.trim()}
                            icon={Save}
                        >
                            Guardar Rol
                        </Button>
                    </Card.Footer>
                </Card>
            ) : (
                <Card className="!p-0 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nombre del Rol</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Permisos</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {roles.map(role => (
                                    <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-sm">{role.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                {role.permissions_list?.length || 0} Permisos
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-2 md:group-hover:translate-x-0">
                                                <button
                                                    onClick={() => {
                                                        setCurrentRole({
                                                            ...role,
                                                            permission_ids: role.permissions_list?.map(p => p.id) || []
                                                        });
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-nominix-electric border border-transparent hover:border-slate-100 shadow-sm transition-all"
                                                    title="Editar Rol"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(role.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 transition-all"
                                                    title="Eliminar Rol"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {roles.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                    <Shield size={24} className="text-slate-400" />
                                                </div>
                                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                                    Sin roles configurados
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default RolesManager;
