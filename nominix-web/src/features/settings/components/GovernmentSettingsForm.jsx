import React, { useState, useEffect } from 'react';
import { Save, Loader2, Settings2, AlertCircle, CheckCircle } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

/**
 * GovernmentSettingsForm — Configuración de parámetros gubernamentales.
 *
 * Campos configurables desde PayrollPolicy:
 * - Salario Mínimo (Bs.)
 * - IMII (USD)
 * - Cestaticket (USD)
 * - Valor UT (Bs.)
 * - Tasas: IVSS, RPE, FAOV, LPPSS, INCES
 * - Tope IVSS (multiplicador SM)
 */
export default function GovernmentSettingsForm() {
    const [form, setForm] = useState({
        minimum_wage_ves: '',
        imii_usd: '',
        cestaticket_amount_usd: '',
        ut_value_ves: '',
        ivss_employee_rate: '',
        rpe_employee_rate: '',
        faov_employee_rate: '',
        lppss_rate: '',
        inces_employer_rate: '',
        ivss_salary_cap_multiplier: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPolicy();
    }, []);

    const loadPolicy = async () => {
        try {
            const response = await axiosClient.get('/company/policies/');
            const data = response.data;
            setForm({
                minimum_wage_ves: data.minimum_wage_ves || '130.00',
                imii_usd: data.imii_usd || '130.00',
                cestaticket_amount_usd: data.cestaticket_amount_usd || '40.00',
                ut_value_ves: data.ut_value_ves || '9.00',
                ivss_employee_rate: data.ivss_employee_rate || '4.00',
                rpe_employee_rate: data.rpe_employee_rate || '0.50',
                faov_employee_rate: data.faov_employee_rate || '1.00',
                lppss_rate: data.lppss_rate || '9.00',
                inces_employer_rate: data.inces_employer_rate || '2.00',
                ivss_salary_cap_multiplier: data.ivss_salary_cap_multiplier || '5',
            });
        } catch (err) {
            console.error('Error cargando políticas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setSuccess(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axiosClient.patch('/company/policies/', form);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-nominix-electric" size={32} />
            </div>
        );
    }

    const FIELDS = [
        {
            section: 'Valores de Referencia', fields: [
                { key: 'minimum_wage_ves', label: 'Salario Mínimo (Bs.)', help: 'Tope para cálculo IVSS' },
                { key: 'imii_usd', label: 'IMII (USD)', help: 'Ingreso Mínimo Integral Indexado. Piso LPPSS' },
                { key: 'cestaticket_amount_usd', label: 'Cestaticket (USD)', help: 'Monto legal del cestaticket' },
                { key: 'ut_value_ves', label: 'Unidad Tributaria (Bs.)', help: 'Para cálculos de ISLR' },
            ]
        },
        {
            section: 'Tasas de Deducciones (%)', fields: [
                { key: 'ivss_employee_rate', label: 'IVSS Empleado', help: 'Seguro Social Obligatorio' },
                { key: 'rpe_employee_rate', label: 'RPE (Paro Forzoso)', help: 'Régimen Prestacional de Empleo' },
                { key: 'faov_employee_rate', label: 'FAOV (Vivienda)', help: 'Ahorro Obligatorio para Vivienda' },
                { key: 'lppss_rate', label: 'LPPSS (Pensiones)', help: 'Contribución Especial. Actualmente 9%' },
                { key: 'inces_employer_rate', label: 'INCES Patronal', help: 'Contribución patronal INCES' },
            ]
        },
        {
            section: 'Topes', fields: [
                { key: 'ivss_salary_cap_multiplier', label: 'Tope IVSS (× SM)', help: 'IVSS se calcula hasta N salarios mínimos', type: 'number' },
            ]
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-nominix-electric/10 rounded-xl">
                        <Settings2 className="text-nominix-electric" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-nominix-dark">Parámetros Gubernamentales</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configura valores legales sin modificar código</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-nominix-electric hover:bg-blue-700 text-white rounded-xl py-2.5 px-5 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3 border border-red-100">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-xl p-3 border border-green-100">
                    <CheckCircle size={16} />
                    <span>Parámetros guardados correctamente</span>
                </div>
            )}

            <div className="space-y-6">
                {FIELDS.map(section => (
                    <div key={section.section}>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                            {section.section}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.fields.map(field => (
                                <div key={field.key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                    <label className="block text-sm text-nominix-dark font-bold mb-1">{field.label}</label>
                                    <p className="text-xs text-gray-400 mb-2">{field.help}</p>
                                    <input
                                        type={field.type || 'text'}
                                        value={form[field.key]}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className="w-full bg-nominix-smoke border border-gray-200 rounded-lg px-3 py-2 text-nominix-dark text-sm focus:border-nominix-electric focus:ring-1 focus:ring-nominix-electric/20 outline-none transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
