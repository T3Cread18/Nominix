import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Link2, UserPlus, Trash2, Search, AlertTriangle, Loader2, CheckCircle, RefreshCw, Wifi, UserCheck, UserX } from 'lucide-react';
import attendanceService from '../../services/attendance.service';
import axiosClient from '../../api/axiosClient';

const inputStyles = "w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const selectStyles = `${inputStyles} [&>option]:bg-[#1a1a2e] [&>option]:text-white`;
const labelStyles = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

/**
 * Extrae solo los dígitos de una cédula venezolana.
 * "V-24935968" → "24935968"
 * "E-12345678" → "12345678"
 */
function extractCedulaNumbers(cedula) {
    if (!cedula) return '';
    return cedula.replace(/\D/g, '');
}

/**
 * EmployeeMapping - Mapeo inteligente de IDs del dispositivo con empleados.
 * 
 * Extrae los números de cédula de los empleados, obtiene los IDs del huellero,
 * y compara automáticamente para facilitar el mapeo.
 */
const EmployeeMapping = () => {
    const [mappings, setMappings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [devices, setDevices] = useState([]);
    const [deviceUsers, setDeviceUsers] = useState([]); // IDs registrados en el huellero
    const [loading, setLoading] = useState(true);
    const [loadingDeviceUsers, setLoadingDeviceUsers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState('');

    // Form para nuevo mapeo manual
    const [form, setForm] = useState({
        employee: '',
        device: '',
        device_employee_id: '',
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [mappingsData, devicesData, employeesData] = await Promise.all([
                attendanceService.getMappings(),
                attendanceService.getDevices(),
                loadEmployees(),
            ]);
            setMappings(Array.isArray(mappingsData) ? mappingsData : []);
            setDevices(Array.isArray(devicesData) ? devicesData : []);
            setEmployees(Array.isArray(employeesData) ? employeesData : []);

            // Auto-select first device if only one
            if (devicesData.length === 1) {
                setSelectedDevice(String(devicesData[0].id));
            }
        } catch (err) {
            console.error('Error loading mapping data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Cargar usuarios del huellero cuando se selecciona un dispositivo
    const loadDeviceUsers = useCallback(async (deviceId) => {
        if (!deviceId) {
            setDeviceUsers([]);
            return;
        }
        setLoadingDeviceUsers(true);
        try {
            const result = await attendanceService.getDeviceUsers(deviceId);
            const users = result.users || result || [];
            setDeviceUsers(Array.isArray(users) ? users : []);
        } catch (err) {
            console.error('Error loading device users:', err);
            setDeviceUsers([]);
        } finally {
            setLoadingDeviceUsers(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDevice) {
            loadDeviceUsers(selectedDevice);
        }
    }, [selectedDevice, loadDeviceUsers]);

    // ==================== AUTO-MATCH LOGIC ====================

    /**
     * Compara las cédulas de empleados (solo números) contra los IDs del huellero.
     * Genera 3 listas: matched, unmappedDevice, unmappedEmployee.
     */
    const comparison = useMemo(() => {
        // Set de IDs ya mapeados
        const mappedDeviceIds = new Set(mappings.map(m => m.device_employee_id));
        const mappedEmployeeIds = new Set(mappings.map(m => String(m.employee)));

        // Mapa: números de cédula → empleado
        const cedulaMap = {};
        employees.forEach(emp => {
            const nums = extractCedulaNumbers(emp.national_id || emp.cedula || emp.identification_number);
            if (nums) {
                cedulaMap[nums] = emp;
            }
        });

        // IDs del huellero
        const deviceIdSet = new Set(deviceUsers.map(u => u.employee_no || u.employeeNo || ''));

        // Coincidencias automáticas (cédula = ID huellero, no mapeados aún)
        const matched = [];
        const unmappedDevice = [];
        const unmappedEmployee = [];

        // Buscar coincidencias
        deviceUsers.forEach(du => {
            const deviceId = du.employee_no || du.employeeNo || '';
            if (!deviceId) return;

            if (mappedDeviceIds.has(deviceId)) return; // Ya mapeado

            const emp = cedulaMap[deviceId];
            if (emp && !mappedEmployeeIds.has(String(emp.id))) {
                matched.push({ deviceUser: du, employee: emp, deviceId });
            } else {
                unmappedDevice.push({ deviceUser: du, deviceId });
            }
        });

        // Empleados sin mapeo ni coincidencia
        employees.forEach(emp => {
            if (mappedEmployeeIds.has(String(emp.id))) return;
            const nums = extractCedulaNumbers(emp.national_id || emp.cedula || emp.identification_number);
            if (!deviceIdSet.has(nums)) {
                unmappedEmployee.push(emp);
            }
        });

        return { matched, unmappedDevice, unmappedEmployee };
    }, [employees, deviceUsers, mappings]);

    // ==================== ACTIONS ====================

    const handleAutoMap = async (match) => {
        setSaving(true);
        setFormError('');
        try {
            await attendanceService.createMapping({
                employee: match.employee.id,
                device: parseInt(selectedDevice),
                device_employee_id: match.deviceId,
            });
            loadData();
        } catch (err) {
            const errData = err?.response?.data;
            if (errData && typeof errData === 'object') {
                setFormError(Object.values(errData).flat().join('. '));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAutoMapAll = async () => {
        if (comparison.matched.length === 0) return;
        setSaving(true);
        setFormError('');
        let count = 0;
        try {
            for (const match of comparison.matched) {
                await attendanceService.createMapping({
                    employee: match.employee.id,
                    device: parseInt(selectedDevice),
                    device_employee_id: match.deviceId,
                });
                count++;
            }
            setFormSuccess(`${count} mapeo(s) creados automáticamente`);
            loadData();
            setTimeout(() => setFormSuccess(''), 4000);
        } catch (err) {
            setFormError(`Error tras crear ${count} mapeos: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setFormError('');
        setFormSuccess('');
    };

    const handleManualAdd = async () => {
        if (!form.employee || !form.device || !form.device_employee_id) {
            setFormError('Todos los campos son obligatorios');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            await attendanceService.createMapping(form);
            setFormSuccess('Mapeo creado exitosamente');
            setForm({ employee: '', device: '', device_employee_id: '' });
            loadData();
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) {
            const errData = err?.response?.data;
            if (errData && typeof errData === 'object') {
                setFormError(Object.values(errData).flat().join('. ') || 'Error al crear mapeo');
            } else {
                setFormError('Error al crear el mapeo');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este mapeo?')) return;
        try {
            await attendanceService.deleteMapping(id);
            loadData();
        } catch (err) {
            console.error('Error deleting mapping:', err);
        }
    };

    return (
        <div className="space-y-4">
            {/* Selector de dispositivo + cargar usuarios */}
            <Card className="border-0">
                <CardHeader className="border-b border-white/5 pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Wifi size={16} className="text-blue-400" />
                        Seleccionar Dispositivo para Comparar
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex items-end gap-3">
                        <div className="flex-1 max-w-xs">
                            <label className={labelStyles}>Dispositivo</label>
                            <select
                                value={selectedDevice}
                                onChange={(e) => setSelectedDevice(e.target.value)}
                                className={selectStyles}
                            >
                                <option value="">Seleccionar...</option>
                                {devices.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => selectedDevice && loadDeviceUsers(selectedDevice)}
                            disabled={!selectedDevice || loadingDeviceUsers}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {loadingDeviceUsers ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Cargar IDs del Huellero
                        </button>
                        {deviceUsers.length > 0 && (
                            <span className="text-xs text-gray-400">
                                {deviceUsers.length} usuario(s) en el dispositivo
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Coincidencias Automáticas */}
            {comparison.matched.length > 0 && (
                <Card className="border-0 ring-1 ring-emerald-500/20">
                    <CardHeader className="border-b border-white/5 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <UserCheck size={16} className="text-emerald-400" />
                                Coincidencias Automáticas
                                <span className="text-xs text-emerald-400 font-normal ml-1">
                                    ({comparison.matched.length} encontradas)
                                </span>
                            </CardTitle>
                            <button
                                onClick={handleAutoMapAll}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                Mapear Todos
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">ID Huellero</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Cédula</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Empleado</th>
                                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparison.matched.map((m, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-emerald-500/[0.03] transition-colors">
                                            <td className="py-3 px-4">
                                                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">
                                                    {m.deviceId}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono text-gray-300">
                                                {m.employee.national_id || m.employee.cedula}
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {m.employee.first_name} {m.employee.last_name}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleAutoMap(m)}
                                                    disabled={saving}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                                                >
                                                    <Link2 size={12} />
                                                    Vincular
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* IDs del huellero sin coincidencia */}
            {comparison.unmappedDevice.length > 0 && (
                <Card className="border-0 ring-1 ring-amber-500/20">
                    <CardHeader className="border-b border-white/5 pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-400" />
                            IDs en el Huellero sin Empleado
                            <span className="text-xs text-amber-400 font-normal ml-1">
                                ({comparison.unmappedDevice.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                            {comparison.unmappedDevice.map((u, i) => (
                                <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20">
                                    {u.deviceId}
                                    {u.deviceUser.name && (
                                        <span className="ml-2 text-gray-400 font-sans text-[10px]">
                                            ({u.deviceUser.name})
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3">
                            Estos IDs están en el huellero pero no coinciden con ninguna cédula del sistema. Puedes mapearlos manualmente abajo.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Mapeos Existentes */}
            <Card className="border-0">
                <CardHeader className="border-b border-white/5 pb-3">
                    <CardTitle className="text-sm">
                        Mapeos Existentes
                        {!loading && (
                            <span className="ml-2 text-gray-400 font-normal">({mappings.length})</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : mappings.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Link2 size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No hay mapeos configurados</p>
                            <p className="text-xs mt-1 opacity-60">
                                Selecciona un dispositivo arriba para detectar coincidencias automáticas
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">ID Huellero</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Empleado</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Dispositivo</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Estado</th>
                                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3 px-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappings.map((m) => (
                                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 px-4">
                                                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">
                                                    {m.device_employee_id}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {m.employee_display || m.employee_name || `ID: ${m.employee}`}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-gray-400">
                                                {m.device_display || m.device_name || `ID: ${m.device}`}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${m.is_active !== false
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-gray-500/10 text-gray-400'
                                                    }`}>
                                                    {m.is_active !== false ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
                                                    title="Eliminar mapeo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mapeo Manual */}
            <Card className="border-0">
                <CardHeader className="border-b border-white/5 pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <UserPlus size={16} className="text-blue-400" />
                        Mapeo Manual
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {formError && (
                        <div className="flex items-center gap-2 p-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                            <AlertTriangle size={14} />
                            {formError}
                        </div>
                    )}
                    {formSuccess && (
                        <div className="flex items-center gap-2 p-3 mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
                            <CheckCircle size={14} />
                            {formSuccess}
                        </div>
                    )}
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[150px]">
                            <label className={labelStyles}>ID en Dispositivo</label>
                            <input
                                type="text"
                                value={form.device_employee_id}
                                onChange={(e) => handleFormChange('device_employee_id', e.target.value)}
                                placeholder="Ej: 24935968"
                                className={`${inputStyles} font-mono`}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className={labelStyles}>Empleado</label>
                            <select
                                value={form.employee}
                                onChange={(e) => handleFormChange('employee', e.target.value)}
                                className={selectStyles}
                            >
                                <option value="">Seleccionar empleado...</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {extractCedulaNumbers(emp.national_id || emp.cedula)} — {emp.first_name} {emp.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[180px]">
                            <label className={labelStyles}>Dispositivo</label>
                            <select
                                value={form.device}
                                onChange={(e) => handleFormChange('device', e.target.value)}
                                className={selectStyles}
                            >
                                <option value="">Seleccionar dispositivo...</option>
                                {devices.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleManualAdd}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                            Vincular
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

async function loadEmployees() {
    try {
        const response = await axiosClient.get('/employees/');
        return response.data.results || response.data;
    } catch {
        return [];
    }
}

export default EmployeeMapping;
