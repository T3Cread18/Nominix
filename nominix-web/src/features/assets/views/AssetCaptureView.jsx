import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, Save } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui';
import assetsService from '../../../services/assets.service';
import { toast } from 'sonner';

/**
 * AssetCaptureView — Registro rápido de activo con captura de foto + OCR.
 */
const AssetCaptureView = ({ categories, warehouses, onSaved }) => {
    const [step, setStep] = useState('capture'); // capture | review | form
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [ocrResult, setOcrResult] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '',
        serial_number: '',
        brand: '',
        model_name: '',
        category: '',
        warehouse: '',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: '',
        currency: 'USD',
        useful_life_years: 5,
        residual_value: '0',
        depreciation_method: 'STRAIGHT_LINE',
    });

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setStep('review');

        // Enviar a OCR
        setOcrLoading(true);
        try {
            const result = await assetsService.ocrExtract(file);
            setOcrResult(result);

            // Pre-rellenar formulario con datos OCR
            setForm(prev => ({
                ...prev,
                serial_number: result.serial_number || prev.serial_number,
                brand: result.brand || prev.brand,
                model_name: result.model || prev.model_name,
            }));

            if (result.serial_number || result.brand || result.model) {
                toast.success('Datos extraídos de la imagen');
            }
        } catch (err) {
            console.warn('OCR no disponible:', err);
            setOcrResult({ available: false, error: 'OCR no disponible' });
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.category || !form.warehouse || !form.acquisition_cost) {
            toast.error('Complete los campos requeridos');
            return;
        }
        try {
            const asset = await assetsService.createAsset(form);

            // Si hay imagen, subirla como foto principal
            if (imageFile) {
                await assetsService.uploadPhoto(asset.id, imageFile, true);
            }

            toast.success(`Activo ${asset.code} registrado exitosamente`);
            onSaved?.();
            resetForm();
        } catch (err) {
            const detail = err.response?.data;
            const msg = typeof detail === 'object'
                ? Object.values(detail).flat().join(', ')
                : 'Error al guardar';
            toast.error(msg);
        }
    };

    const resetForm = () => {
        setStep('capture');
        setImageFile(null);
        setImagePreview(null);
        setOcrResult(null);
        setForm({
            name: '', serial_number: '', brand: '', model_name: '',
            category: '', warehouse: '',
            acquisition_date: new Date().toISOString().split('T')[0],
            acquisition_cost: '', currency: 'USD', useful_life_years: 5,
            residual_value: '0', depreciation_method: 'STRAIGHT_LINE',
        });
    };

    return (
        <div className="space-y-4">
            {/* Step: Capture */}
            {step === 'capture' && (
                <Card className="border-2 border-dashed border-gray-300 rounded-2xl hover:border-nominix-electric/50 transition-colors">
                    <CardContent className="p-8 text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="bg-nominix-electric/10 text-nominix-electric w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Camera size={28} />
                            </div>
                            <h3 className="text-lg font-black text-nominix-dark mb-2">Registro Rápido</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Toma una foto de la etiqueta del activo. El sistema intentará extraer automáticamente el serial, marca y modelo.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-nominix-electric text-white rounded-xl font-bold hover:bg-nominix-electric/90 transition-colors"
                                >
                                    <Upload size={18} /> Seleccionar Imagen
                                </button>
                                <button
                                    onClick={() => setStep('form')}
                                    className="text-sm text-gray-500 hover:text-nominix-electric transition-colors"
                                >
                                    O registrar sin foto →
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step: Review OCR */}
            {step === 'review' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Image preview */}
                    <Card className="border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="relative">
                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-contain bg-gray-100" />
                            )}
                            <button
                                onClick={resetForm}
                                className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </Card>

                    {/* OCR Results */}
                    <Card className="border border-gray-200 rounded-2xl">
                        <CardContent className="p-5">
                            <h4 className="font-black text-nominix-dark mb-4">Datos Detectados</h4>

                            {ocrLoading ? (
                                <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Procesando imagen...</span>
                                </div>
                            ) : ocrResult?.available === false ? (
                                <div className="py-4">
                                    <div className="flex items-center gap-2 text-amber-600 text-sm mb-3">
                                        <AlertCircle size={16} />
                                        OCR no disponible — Ingrese los datos manualmente
                                    </div>
                                    <button
                                        onClick={() => setStep('form')}
                                        className="px-4 py-2 bg-nominix-electric text-white rounded-xl text-sm font-bold"
                                    >
                                        Continuar al formulario
                                    </button>
                                </div>
                            ) : ocrResult ? (
                                <div className="space-y-3">
                                    <OCRField label="Serial" value={ocrResult.serial_number} />
                                    <OCRField label="Marca" value={ocrResult.brand} />
                                    <OCRField label="Modelo" value={ocrResult.model} />
                                    <div className="pt-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                            Confianza: {Math.round((ocrResult.confidence || 0) * 100)}%
                                            {ocrResult.confidence >= 0.8 ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <AlertCircle size={14} className="text-amber-500" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setStep('form')}
                                            className="w-full px-4 py-2.5 bg-nominix-electric text-white rounded-xl text-sm font-bold hover:bg-nominix-electric/90 transition-colors"
                                        >
                                            Continuar al formulario →
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step: Form */}
            {(step === 'form' || step === 'review') && step === 'form' && (
                <Card className="border border-gray-200 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-nominix-dark">Completar Registro</h2>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        {imagePreview && (
                            <div className="mb-4 flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                                <img src={imagePreview} alt="" className="w-12 h-12 object-cover rounded-lg" />
                                <span className="text-xs text-emerald-700 font-semibold">Foto capturada — se guardará como foto principal</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField label="Nombre *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                            <FormField label="Serial" value={form.serial_number} onChange={v => setForm(f => ({ ...f, serial_number: v }))} highlight={!!ocrResult?.serial_number} />
                            <FormField label="Marca" value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} highlight={!!ocrResult?.brand} />
                            <FormField label="Modelo" value={form.model_name} onChange={v => setForm(f => ({ ...f, model_name: v }))} highlight={!!ocrResult?.model} />
                            <FormSelect label="Categoría *" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))}
                                options={categories.map(c => ({ value: c.id, label: c.name }))} />
                            <FormSelect label="Almacén *" value={form.warehouse} onChange={v => setForm(f => ({ ...f, warehouse: v }))}
                                options={warehouses.map(w => ({ value: w.id, label: `${w.branch_name} — ${w.name}` }))} />
                            <FormField label="Fecha de adquisición" type="date" value={form.acquisition_date} onChange={v => setForm(f => ({ ...f, acquisition_date: v }))} />
                            <FormField label="Costo *" type="number" value={form.acquisition_cost} onChange={v => setForm(f => ({ ...f, acquisition_cost: v }))} />
                            <FormSelect label="Moneda" value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))}
                                options={[{ value: 'USD', label: 'USD' }, { value: 'VES', label: 'VES' }]} />
                        </div>

                        <div className="flex gap-3 justify-end pt-6 border-t border-gray-100 mt-6">
                            <button onClick={resetForm} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                                Cancelar
                            </button>
                            <button onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2.5 bg-nominix-electric text-white rounded-xl text-sm font-bold hover:bg-nominix-electric/90 transition-colors">
                                <Save size={14} /> Registrar Activo
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


const OCRField = ({ label, value }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        {value ? (
            <span className="text-sm font-bold text-nominix-dark flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" /> {value}
            </span>
        ) : (
            <span className="text-xs text-gray-300 italic">No detectado</span>
        )}
    </div>
);

const FormField = ({ label, type = 'text', value, onChange, highlight }) => (
    <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {label} {highlight && <span className="text-emerald-500">● OCR</span>}
        </label>
        <input
            type={type}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-nominix-electric/30 outline-none ${highlight ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'
                }`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const FormSelect = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
        <select
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none"
            value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Seleccionar...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

export default AssetCaptureView;
