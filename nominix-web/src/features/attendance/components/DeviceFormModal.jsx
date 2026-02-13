import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui';
import { Wifi, Loader2 } from 'lucide-react';
import attendanceService from '../../../services/attendance.service';

const inputStyles = "w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const selectStyles = `${inputStyles} [&>option]:bg-[#1a1a2e] [&>option]:text-white`;
const labelStyles = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

/**
 * DeviceFormModal - Modal para crear/editar un dispositivo biométrico.
 */
const DeviceFormModal = ({ isOpen, onClose, device = null, onSaved }) => {
    const isEdit = !!device;
    const [loading, setLoading] = useState(false);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [form, setForm] = useState({
        name: '',
        device_type: '',
        ip_address: '',
        port: 80,
        username: 'admin',
        password: '',
        location: '',
        serial_number: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadDeviceTypes();
            if (device) {
                setForm({
                    name: device.name || '',
                    device_type: device.device_type || '',
                    ip_address: device.ip_address || '',
                    port: device.port || 80,
                    username: device.username || 'admin',
                    password: '',
                    location: device.location || '',
                    serial_number: device.serial_number || '',
                });
            } else {
                setForm({
                    name: '',
                    device_type: '',
                    ip_address: '',
                    port: 80,
                    username: 'admin',
                    password: '',
                    location: '',
                    serial_number: '',
                });
            }
            setError('');
        }
    }, [isOpen, device]);

    const loadDeviceTypes = async () => {
        try {
            const types = await attendanceService.getDeviceTypes();
            setDeviceTypes(types);
            if (!device && types.length > 0) {
                setForm(f => ({ ...f, device_type: types[0].id }));
            }
        } catch (err) {
            console.warn('Could not load device types:', err);
        }
    };

    const handleChange = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.ip_address || !form.device_type) {
            setError('Nombre, tipo e IP son obligatorios');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const payload = { ...form, port: parseInt(form.port) || 80 };
            if (isEdit && !payload.password) {
                delete payload.password;
            }
            if (isEdit) {
                await attendanceService.updateDevice(device.id, payload);
            } else {
                await attendanceService.createDevice(payload);
            }
            onSaved?.();
            onClose();
        } catch (err) {
            const errData = err?.response?.data;
            if (errData && typeof errData === 'object') {
                const msgs = Object.values(errData).flat().join('. ');
                setError(msgs || 'Error al guardar');
            } else {
                setError('Error al guardar el dispositivo');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Editar Dispositivo' : 'Agregar Dispositivo'}
            icon={Wifi}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Nombre */}
                <div>
                    <label className={labelStyles}>Nombre del dispositivo *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Ej: Huellero Entrada Principal"
                        className={inputStyles}
                    />
                </div>

                {/* Tipo de dispositivo */}
                <div>
                    <label className={labelStyles}>Tipo de dispositivo *</label>
                    <select
                        value={form.device_type}
                        onChange={(e) => handleChange('device_type', e.target.value)}
                        className={selectStyles}
                    >
                        <option value="">Seleccionar...</option>
                        {deviceTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.display_name || t.name}</option>
                        ))}
                    </select>
                </div>

                {/* IP + Puerto */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <label className={labelStyles}>Dirección IP *</label>
                        <input
                            type="text"
                            value={form.ip_address}
                            onChange={(e) => handleChange('ip_address', e.target.value)}
                            placeholder="192.168.1.100"
                            className={`${inputStyles} font-mono`}
                        />
                    </div>
                    <div>
                        <label className={labelStyles}>Puerto</label>
                        <input
                            type="number"
                            value={form.port}
                            onChange={(e) => handleChange('port', e.target.value)}
                            className={`${inputStyles} font-mono`}
                        />
                    </div>
                </div>

                {/* Usuario + Contraseña */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelStyles}>Usuario</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className={inputStyles}
                        />
                    </div>
                    <div>
                        <label className={labelStyles}>
                            Contraseña {isEdit && '(dejar vacío para no cambiar)'}
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            placeholder={isEdit ? '••••••' : ''}
                            className={inputStyles}
                        />
                    </div>
                </div>

                {/* Ubicación */}
                <div>
                    <label className={labelStyles}>Ubicación</label>
                    <input
                        type="text"
                        value={form.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="Ej: Puerta principal, Piso 2"
                        className={inputStyles}
                    />
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? 'Guardar Cambios' : 'Agregar Dispositivo'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DeviceFormModal;
