import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Users, Globe, Activity, Plus, Trash2,
    ArrowRight, Loader2, Search, Building2,
    Calendar, ShieldAlert, CheckCircle2, ChevronRight,
    FileText, CreditCard, Edit, X, RefreshCw, Wallet, UserCog, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

// Dominio base del tenant — se lee de la variable de entorno de Vite
const TENANT_DOMAIN = import.meta.env.VITE_TENANT_DOMAIN || 'localhost';

// Componente Interno Wizard (para evitar errores de importación circular/hoisting)
const TenantWizard = ({ onClose, onCreated }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        rif: '',
        domain: '',
        email: ''
    });

    const handleCreate = async (data = null) => {
        setLoading(true);
        const payload = data || form;
        try {
            await axiosClient.post('/tenants/', payload);
            toast.success('Nueva infraestructura desplegada exitosamente');
            onCreated();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error en el despliegue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 text-white">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black italic tracking-tight">Wizard de Despliegue</h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Configuración de nueva instancia SaaS</p>
                </div>
                <div className="flex gap-1">
                    {[1, 2].map(i => (
                        <div key={i} className={cn("w-8 h-1 rounded-full transition-all", i <= step ? "bg-nominix-electric" : "bg-white/10")} />
                    ))}
                </div>
            </div>

            {step === 1 ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Razón Social</label>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                                placeholder="Farmacia del Ahorro C.A."
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">RIF</label>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                                placeholder="J-12345678-9"
                                value={form.rif}
                                onChange={e => {
                                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                                    if (val.length === 1 && !val.includes('-')) val += '-';
                                    if (val.length === 10 && val.split('-').length === 2) val += '-';
                                    setForm({ ...form, rif: val });
                                }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correo Administrativo</label>
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                            placeholder="admin@empresa.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="p-6 bg-nominix-electric/5 border border-nominix-electric/20 rounded-3xl flex items-start gap-4">
                        <Globe className="text-nominix-electric shrink-0" size={24} />
                        <div>
                            <p className="text-sm font-bold text-white mb-1">Configuración de Dominio</p>
                            <p className="text-xs text-gray-400">El sistema creará un subdominio único para el inquilino. Este dominio servirá para identificar el esquema de base de datos.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dominio de Acceso</label>
                        <div className="relative">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all pr-32"
                                placeholder="nombre-farmacia"
                                value={form.domain}
                                onChange={e => {
                                    let val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    setForm({ ...form, domain: val });
                                }}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
                                .{TENANT_DOMAIN}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-12 flex justify-between items-center gap-4">
                <button onClick={onClose} className="text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">Cancelar</button>
                <div className="flex gap-4">
                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Atrás</button>
                    )}
                    {step === 1 ? (
                        <button onClick={() => setStep(2)} className="px-10 py-4 bg-nominix-electric hover:bg-nominix-electric/90 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-nominix-electric/20 flex items-center gap-2">
                            Siguiente <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                const finalDomain = form.domain.includes(`.${TENANT_DOMAIN}`) ? form.domain : `${form.domain}.${TENANT_DOMAIN}`;
                                handleCreate({ ...form, domain: finalDomain });
                            }}
                            disabled={loading}
                            className="px-12 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Desplegar Instancia'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditTenantModal = ({ tenant, onClose, onUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || '',
        address: tenant.address || '',
        rif: tenant.rif || '',
        price_per_employee: tenant.price_per_employee || 0
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Limpiar payload: remover campos vacíos que no deben enviarse (como RIF si está vacío)
        const payload = { ...form };
        if (!payload.rif) delete payload.rif;
        if (!payload.phone) delete payload.phone;
        if (!payload.address) delete payload.address;

        console.log("Enviando actualización de tenant:", payload);
        try {
            await axiosClient.patch(`/tenants/${tenant.id}/`, payload);
            toast.success('Tenant actualizado exitosamente');
            onUpdated();
            onClose();
        } catch (error) {
            console.error("Error al actualizar tenant:", error.response?.data);
            toast.error('Error al actualizar tenant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 text-white w-full max-w-lg mx-auto">
            <h3 className="text-2xl font-black italic tracking-tight mb-6">Editar Tenant</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Razón Social</label>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Administrativo</label>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Teléfono</label>
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">RIF (Solo lectura)</label>
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-gray-400 text-sm outline-none cursor-not-allowed"
                            value={form.rif}
                            readOnly
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-nominix-electric uppercase tracking-widest ml-1">Precio / Empleado ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full bg-nominix-electric/10 border border-nominix-electric/20 rounded-2xl py-3 px-5 text-nominix-electric text-sm outline-none focus:border-nominix-electric/50 transition-all font-mono font-bold"
                            value={form.price_per_employee}
                            onChange={e => setForm({ ...form, price_per_employee: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección Fiscal</label>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm outline-none focus:border-nominix-electric/50 transition-all resize-none h-24"
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                    />
                </div>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex-1 py-3 bg-nominix-electric hover:bg-nominix-electric/90 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-nominix-electric/20 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const TenantDetailModal = ({ tenant, onClose }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeepStats = async () => {
            try {
                const res = await axiosClient.get(`/tenants/${tenant.id}/deep_stats/`);
                setStats(res.data);
            } catch (error) {
                toast.error('No se pudo cargar la data profunda del tenant');
            } finally {
                setLoading(false);
            }
        };
        fetchDeepStats();
    }, [tenant.id]);

    return (
        <div className="p-8 text-white w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-2xl font-black italic tracking-tight">{tenant.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-white/10 px-2 py-0.5 rounded text-nominix-electric font-mono">{tenant.schema_name}</code>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{tenant.rif}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-nominix-electric" size={32} /></div>
            ) : (
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="p-3 bg-nominix-electric/10 rounded-2xl w-fit mb-3"><Users className="text-nominix-electric" size={24} /></div>
                        <p className="text-3xl font-black italic tracking-tighter">{stats?.active_employees}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Empleados Activos</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="p-3 bg-purple-500/10 rounded-2xl w-fit mb-3"><FileText className="text-purple-500" size={24} /></div>
                        <p className="text-3xl font-black italic tracking-tighter">{stats?.total_employees}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Nómina Histórica</p>
                    </div>

                    <div className="col-span-2 bg-gradient-to-br from-white/5 to-transparent p-6 rounded-3xl border border-white/10">
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><Globe size={16} className="text-gray-400" /> Dominios Registrados</h4>
                        <div className="space-y-2">
                            {tenant.domains?.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className={cn("text-xs font-mono", d.is_primary ? "text-white" : "text-gray-400")}>{d.domain}</span>
                                    {d.is_primary && <span className="text-[9px] bg-nominix-electric text-white px-2 py-0.5 rounded uppercase font-black tracking-widest">Principal</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RenewModal = ({ tenant, onClose, onRenewed }) => {
    const [months, setMonths] = useState(1);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosClient.get(`/tenants/${tenant.id}/deep_stats/`);
                setStats(res.data);
            } catch (error) {
                console.log(error);
                setStats({ active_employees: 0 });
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [tenant.id]);

    const handleRenew = async () => {
        setLoading(true);
        try {
            await axiosClient.post(`/tenants/${tenant.id}/renew/`, { months });
            toast.success('Suscripción renovada correctamente');
            onRenewed();
            onClose();
        } catch (error) {
            toast.error('Error al renovar suscripción');
        } finally {
            setLoading(false);
        }
    };

    const activeEmployees = stats?.active_employees || 0;
    const price = parseFloat(tenant.price_per_employee || 0);
    const totalCost = (activeEmployees * price * months).toFixed(2);

    return (
        <div className="p-8 text-white w-full max-w-sm mx-auto text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                <Wallet size={32} />
            </div>
            <h3 className="text-xl font-black italic tracking-tight mb-2">Renovar Suscripción</h3>
            <p className="text-xs text-gray-400 mb-6">Basado en uso: <span className="text-white font-bold">{tenant.name}</span></p>

            <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={() => setMonths(Math.max(1, months - 1))} className="p-3 bg-white/5 rounded-xl hover:bg-white/10">-</button>
                <div className="text-center">
                    <span className="text-3xl font-black italic">{months}</span>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Meses</p>
                </div>
                <button onClick={() => setMonths(months + 1)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10">+</button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10 text-left">
                {loadingStats ? (
                    <div className="flex justify-center"><Loader2 className="animate-spin text-gray-500" size={16} /></div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Empleados Activos</span>
                            <span className="text-white font-mono">{activeEmployees}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Tarifa/Emp</span>
                            <span className="text-white font-mono">${price}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-nominix-electric">Total</span>
                            <span className="text-xl font-black italic text-green-500">${totalCost}</span>
                        </div>
                    </div>
                )}
            </div>

            <button onClick={handleRenew} disabled={loading || loadingStats} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Procesar Pago'}
            </button>
        </div>
    );
};


const TenantUsersModal = ({ tenant, onClose }) => {
    const [users, setUsers] = useState([]);
    const [allRoles, setAllRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // list, create, edit
    const [editingUser, setEditingUser] = useState(null);

    // Form State
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false,
        is_active: true,
        role_ids: []
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [tenant.id]);

    const fetchRoles = async () => {
        try {
            const res = await axiosClient.get(`/tenants/${tenant.id}/roles/`);
            setAllRoles(res.data);
        } catch (error) {
            console.error('Error cargando roles del tenant');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/tenants/${tenant.id}/users/`);
            setUsers(res.data);
        } catch (error) {
            toast.error('Error cargando usuarios del tenant');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (view === 'create') {
                await axiosClient.post(`/tenants/${tenant.id}/users/`, form);
                toast.success('Usuario creado');
            } else if (view === 'edit') {
                // Clean password if empty
                const payload = { ...form };
                if (!payload.password) delete payload.password;

                await axiosClient.patch(`/tenants/${tenant.id}/users/?user_id=${editingUser.id}`, payload);
                toast.success('Usuario actualizado');
            }
            setView('list');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error guardando usuario');
        }
    };

    const handleDelete = async (userId) => {
        if (!confirm('¿Eliminar usuario? Esta acción es irreversible.')) return;
        try {
            await axiosClient.delete(`/tenants/${tenant.id}/users/?user_id=${userId}`);
            toast.success('Usuario eliminado');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error eliminando usuario');
        }
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            email: user.email,
            password: '', // Password empty by default
            first_name: user.first_name,
            last_name: user.last_name,
            is_staff: user.is_staff,
            is_superuser: user.is_superuser,
            is_active: user.is_active,
            role_ids: user.groups || []
        });
        setView('edit');
    };

    const resetForm = () => {
        setForm({
            username: '', email: '', password: '',
            first_name: '', last_name: '',
            is_staff: false, is_superuser: false, is_active: true,
            role_ids: []
        });
        setView('create');
    }

    return (
        <div className="p-8 text-white w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                    <h3 className="text-2xl font-black italic tracking-tight flex items-center gap-2">
                        <UserCog size={24} className="text-nominix-electric" />
                        Usuarios: {tenant.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Gestión de Acceso al Tenant</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            {/* Toolbar */}
            {view === 'list' && (
                <div className="flex justify-end mb-4 shrink-0">
                    <button
                        onClick={resetForm}
                        className="px-4 py-2 bg-nominix-electric hover:bg-nominix-electric/90 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-nominix-electric/10"
                    >
                        <Plus size={16} /> Nuevo Usuario
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-nominix-electric" size={32} /></div>
                ) : view === 'list' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-nominix-electric/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/5 rounded-lg">
                                            {u.is_superuser ? <Shield size={16} className="text-amber-500" /> : <Users size={16} className="text-gray-400" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">{u.username}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{u.is_superuser ? 'Super Admin' : (u.is_staff ? 'Staff' : 'Usuario')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(u)} className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400"><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                    <p className="text-xs text-gray-500">{u.first_name} {u.last_name}</p>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <span className={cn("text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest", u.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                        {u.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                    {u.roles?.map(role => (
                                        <span key={role.id} className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && <p className="col-span-2 text-center text-gray-500 py-10">No hay usuarios registrados.</p>}
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Usuario *</label>
                                <input className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-nominix-electric/50 outline-none"
                                    value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email *</label>
                                <input type="email" className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-nominix-electric/50 outline-none"
                                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre</label>
                                <input className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-nominix-electric/50 outline-none"
                                    value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Apellido</label>
                                <input className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-nominix-electric/50 outline-none"
                                    value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                    {view === 'edit' ? 'Nueva Contraseña (Dejar en blanco para mantener)' : 'Contraseña *'}
                                </label>
                                <input type="password" className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:border-nominix-electric/50 outline-none"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={view === 'create'} />
                            </div>
                        </div>

                        <div className="flex gap-4 py-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-2 rounded-xl border border-white/5 hover:border-white/20 transition-all select-none">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-nominix-electric w-4 h-4" />
                                <span className="text-xs font-bold text-gray-300">Activo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-2 rounded-xl border border-white/5 hover:border-white/20 transition-all select-none">
                                <input type="checkbox" checked={form.is_staff} onChange={e => setForm({ ...form, is_staff: e.target.checked })} className="accent-nominix-electric w-4 h-4" />
                                <span className="text-xs font-bold text-gray-300">Staff (Admin Panel)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-2 rounded-xl border border-white/5 hover:border-white/20 transition-all select-none">
                                <input type="checkbox" checked={form.is_superuser} onChange={e => setForm({ ...form, is_superuser: e.target.checked })} className="accent-nominix-electric w-4 h-4" />
                                <span className="text-xs font-bold text-gray-300">Superuser</span>
                            </label>
                        </div>

                        <div className="space-y-2 border-t border-white/5 pt-4">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Roles Asignados</label>
                            <div className="grid grid-cols-2 gap-2">
                                {allRoles.map(role => (
                                    <label key={role.id} className="flex items-center gap-2 cursor-pointer bg-black/10 px-3 py-2 rounded-xl border border-white/5 hover:border-nominix-electric/30 transition-all select-none">
                                        <input
                                            type="checkbox"
                                            checked={form.role_ids.includes(role.id)}
                                            onChange={e => {
                                                const ids = e.target.checked
                                                    ? [...form.role_ids, role.id]
                                                    : form.role_ids.filter(id => id !== role.id);
                                                setForm({ ...form, role_ids: ids });
                                            }}
                                            className="accent-nominix-electric w-4 h-4"
                                        />
                                        <span className="text-xs text-gray-300">{role.name}</span>
                                    </label>
                                ))}
                                {allRoles.length === 0 && (
                                    <p className="col-span-2 text-xs text-gray-500 italic">No hay roles definidos en este tenant. Créalos primero en la configuración del tenant.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setView('list')} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 bg-nominix-electric hover:bg-nominix-electric/90 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-nominix-electric/20">
                                {view === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const TenantsAdmin = () => {
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showWizard, setShowWizard] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [viewingTenant, setViewingTenant] = useState(null);

    const [renewingTenant, setRenewingTenant] = useState(null);
    const [managingUsersTenant, setManagingUsersTenant] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenantsRes, statsRes] = await Promise.all([
                axiosClient.get('/tenants/'),
                axiosClient.get('/tenants/stats/')
            ]);
            // Manejar respuesta paginada o array plano
            const tenantsData = Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data.results || []);
            setTenants(tenantsData);
            setStats(statsRes.data);
        } catch (error) {
            toast.error('Error al cargar datos maestros');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`¿Estás SEGURO de eliminar el tenant "${name}"? Esta acción borrará TODO el esquema de base de datos y es irreversible.`)) return;

        try {
            await axiosClient.delete(`/tenants/${id}/`);
            toast.success('Tenant eliminado exitosamente');
            fetchData();
        } catch (error) {
            toast.error('No se pudo eliminar el tenant');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.rif.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !stats) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0a0a0b]">
                <Loader2 className="animate-spin text-nominix-electric" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-8 lg:p-12 font-sans selection:bg-nominix-electric/30">
            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="px-2 py-0.5 bg-nominix-electric/10 border border-nominix-electric/20 rounded text-[10px] font-black text-nominix-electric uppercase tracking-widest">
                            Global Controller
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter italic">
                        SaaS <span className="text-nominix-electric not-italic">Infraestructura</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-nominix-electric transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar farmacia o RIF..."
                            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm outline-none focus:border-nominix-electric/50 focus:ring-4 focus:ring-nominix-electric/5 transition-all w-64 md:w-80"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="bg-nominix-electric hover:bg-nominix-electric/90 text-white font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-lg shadow-nominix-electric/20 flex items-center gap-3 transition-all active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Tenant
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Inquilinos', value: stats?.total_tenants, icon: Building2, color: 'text-nominix-electric' },
                        { label: 'Dominios Activos', value: stats?.total_domains, icon: Globe, color: 'text-purple-500' },
                        { label: 'Modo Producción', value: stats?.active_tenants, icon: CheckCircle2, color: 'text-green-500' },
                        { label: 'Período de Prueba', value: stats?.trial_tenants, icon: Activity, color: 'text-amber-500' },
                    ].map((s, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-[28px] backdrop-blur-xl">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-2xl bg-white/5", s.color)}>
                                    <s.icon size={24} />
                                </div>
                                <span className="text-3xl font-black tracking-tighter italic">{s.value || 0}</span>
                            </div>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tenants Table */}
                <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
                    <div className="p-8 border-b border-white/5">
                        <h2 className="text-xl font-black italic tracking-tight">Directorio de Empresas</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Nombre / Identidad</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Esquema / Dominio</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Suscripción</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-sm mb-1">{tenant.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tenant.rif}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <code className="text-[11px] text-nominix-electric bg-nominix-electric/10 px-2 py-0.5 rounded inline-block w-fit font-mono">
                                                    {tenant.schema_name}
                                                </code>
                                                {(() => {
                                                    const primaryDomain = tenant.domains?.find(d => d.is_primary)?.domain;
                                                    if (!primaryDomain) return <span className="text-xs text-gray-500">Sin dominio</span>;

                                                    const protocol = window.location.protocol;
                                                    const port = window.location.port ? `:${window.location.port}` : '';
                                                    const url = primaryDomain.includes('localhost')
                                                        ? `${protocol}//${primaryDomain}${port}`
                                                        : `${protocol}//${primaryDomain}`;

                                                    return (
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-nominix-electric hover:underline transition-colors mt-1"
                                                        >
                                                            <Globe size={12} />
                                                            {primaryDomain}
                                                        </a>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                {tenant.on_trial ? (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[9px] font-black uppercase tracking-widest">
                                                        Demo / Trial
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-[9px] font-black uppercase tracking-widest">
                                                        Producción
                                                    </span>
                                                )}
                                                {tenant.paid_until && (
                                                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        {tenant.paid_until}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setViewingTenant(tenant)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                                                    title="Ver Detalles y Estadísticas"
                                                >
                                                    <Activity size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingTenant(tenant)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                                                    title="Editar Información"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setRenewingTenant(tenant)}
                                                    className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl transition-all"
                                                    title="Renovar Suscripción"
                                                >
                                                    <CreditCard size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setManagingUsersTenant(tenant)}
                                                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-xl transition-all"
                                                    title="Gestionar Usuarios"
                                                >
                                                    <UserCog size={16} />
                                                </button>
                                                <a
                                                    href={`http://${tenant.domains?.find(d => d.is_primary)?.domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-nominix-electric/10 hover:bg-nominix-electric/20 rounded-xl transition-all text-nominix-electric"
                                                    title="Visitar Sitio"
                                                >
                                                    <Globe size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(tenant.id, tenant.name)}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                                                    title="Eliminar Empresa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTenants.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4 text-gray-600">
                                                    <ShieldAlert size={32} />
                                                </div>
                                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">No se encontraron infraestructuras registradas</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Wizard Modal */}
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0a0a0b] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <TenantWizard onClose={() => setShowWizard(false)} onCreated={fetchData} />
                    </div>
                </div>
            )}

            {editingTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0a0a0b] border border-white/10 w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <EditTenantModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onUpdated={fetchData} />
                    </div>
                </div>
            )}

            {viewingTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0a0a0b] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <TenantDetailModal tenant={viewingTenant} onClose={() => setViewingTenant(null)} />
                    </div>
                </div>
            )}

            {renewingTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0a0a0b] border border-white/10 w-full max-w-sm rounded-[40px] shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <RenewModal tenant={renewingTenant} onClose={() => setRenewingTenant(null)} onRenewed={fetchData} />
                    </div>
                </div>
            )}

            {managingUsersTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0a0a0b] border border-white/10 w-full max-w-4xl rounded-[40px] shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <TenantUsersModal tenant={managingUsersTenant} onClose={() => setManagingUsersTenant(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantsAdmin;
