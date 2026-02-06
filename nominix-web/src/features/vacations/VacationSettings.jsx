import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Settings, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ToggleField from '../../components/ui/ToggleField';
import SelectField from '../../components/ui/SelectField';
import companyService from '../../services/company.service';
import { Loader2 } from 'lucide-react';

const VacationSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        vacation_salary_basis: 'BASE_PLUS_COMPLEMENT',
        vacation_receipt_currency: 'USD'
    });
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await companyService.getConfig();
            setConfig({
                vacation_salary_basis: data.vacation_salary_basis || 'BASE_PLUS_COMPLEMENT',
                vacation_receipt_currency: data.vacation_receipt_currency || 'USD'
            });
        } catch (err) {
            console.error('Error loading config:', err);
            setError('Error al cargar la configuración. Por favor recargue la página.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);
            setError(null);

            await companyService.updateConfig(config);

            setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });

            // Limpiar mensaje después de 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error('Error saving config:', err);
            setError('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-nominix-electric" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-nominix-electric/10 rounded-xl">
                    <Settings className="text-nominix-electric" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-nominix-dark">Configuración de Vacaciones</h1>
                    <p className="text-gray-500">Personaliza el cálculo y emisión de recibos</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {message && (
                <div className="bg-green-50 text-green-600 p-4 rounded-xl flex items-center gap-3 border border-green-100 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} />
                    <p>{message.text}</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Cálculo de Pagos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">
                            Base Salarial para Cálculos
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => setConfig({ ...config, vacation_salary_basis: 'BASE_ONLY' })}
                                className={`
                                    cursor-pointer p-4 rounded-xl border-2 transition-all
                                    ${config.vacation_salary_basis === 'BASE_ONLY'
                                        ? 'border-nominix-electric bg-nominix-electric/5'
                                        : 'border-gray-100 hover:border-gray-200'}
                                `}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                        ${config.vacation_salary_basis === 'BASE_ONLY' ? 'border-nominix-electric' : 'border-gray-300'}
                                    `}>
                                        {config.vacation_salary_basis === 'BASE_ONLY' && (
                                            <div className="w-2 h-2 rounded-full bg-nominix-electric" />
                                        )}
                                    </div>
                                    <span className="font-bold text-nominix-dark">Solo Sueldo Base</span>
                                </div>
                                <p className="text-xs text-gray-500 pl-7">
                                    Calcula vacaciones basándose únicamente en el sueldo base mensual del contrato.
                                </p>
                            </div>

                            <div
                                onClick={() => setConfig({ ...config, vacation_salary_basis: 'BASE_PLUS_COMPLEMENT' })}
                                className={`
                                    cursor-pointer p-4 rounded-xl border-2 transition-all
                                    ${config.vacation_salary_basis === 'BASE_PLUS_COMPLEMENT'
                                        ? 'border-nominix-electric bg-nominix-electric/5'
                                        : 'border-gray-100 hover:border-gray-200'}
                                `}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                        ${config.vacation_salary_basis === 'BASE_PLUS_COMPLEMENT' ? 'border-nominix-electric' : 'border-gray-300'}
                                    `}>
                                        {config.vacation_salary_basis === 'BASE_PLUS_COMPLEMENT' && (
                                            <div className="w-2 h-2 rounded-full bg-nominix-electric" />
                                        )}
                                    </div>
                                    <span className="font-bold text-nominix-dark">Paquete Total (Base + Complemento)</span>
                                </div>
                                <p className="text-xs text-gray-500 pl-7">
                                    Calcula sobre la suma del sueldo base y el complemento salarial.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Emisión de Recibos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <SelectField
                        label="Moneda del Recibo PDF"
                        value={config.vacation_receipt_currency}
                        onChange={(e) => setConfig({ ...config, vacation_receipt_currency: e.target.value })}
                        options={[
                            { value: 'USD', label: 'Dólares (USD)' },
                            { value: 'VES', label: 'Bolívares (Bs.)' },
                            { value: 'DUAL', label: 'Ambas Monedas (USD + Bs.)' }
                        ]}
                        description="Determina qué moneda se muestra en el recibo de vacaciones generado."
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button
                    variant="electric"
                    icon={Save}
                    onClick={handleSave}
                    loading={saving}
                    size="lg"
                >
                    Guardar Cambios
                </Button>
            </div>
        </div>
    );
};

export default VacationSettings;
