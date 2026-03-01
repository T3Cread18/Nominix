import React, { useState, useEffect } from 'react';
import importService from '../../services/import.service';
import FileUploader from './components/FileUploader';
import ColumnMapper from './components/ColumnMapper';
import ValidationReport from './components/ValidationReport';
import ImportResult from './components/ImportResult';
import { Loader2, ArrowLeft, ArrowRight, Play, Download, Users, Building2, Network, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const ImportWizard = () => {
    const [step, setStep] = useState(1);
    const [model, setModel] = useState('employee');
    const [file, setFile] = useState(null);
    const [fields, setFields] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [validationResult, setValidationResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(null);

    const templateModels = [
        { key: 'employee', label: 'Empleados', icon: Users, desc: 'Datos personales, salarios, contacto' },
        { key: 'branch', label: 'Sedes', icon: Building2, desc: 'Sucursales y ubicaciones' },
        { key: 'department', label: 'Departamentos', icon: Network, desc: 'Áreas organizacionales' },
        { key: 'jobposition', label: 'Cargos', icon: Briefcase, desc: 'Posiciones y cargos' },
    ];

    const handleDownloadTemplate = async (modelKey) => {
        setDownloading(modelKey);
        try {
            await importService.downloadTemplate(modelKey, 'xlsx');
            toast.success(`Plantilla de ${templateModels.find(m => m.key === modelKey)?.label} descargada`);
        } catch (error) {
            console.error("Error downloading template:", error);
            toast.error("Error al descargar la plantilla");
        } finally {
            setDownloading(null);
        }
    };

    // Fetch fields when model changes
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const response = await importService.getFields(model);
                setFields(response.data);
            } catch (error) {
                console.error("Error fetching fields:", error);
                toast.error("Error al cargar los campos del modelo");
            }
        };
        fetchFields();
    }, [model]);

    // Handle File Upload and Preview
    const handleFileUpload = async () => {
        if (!file) {
            toast.error("Por favor seleccione un archivo");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await importService.previewFile(formData);
            setHeaders(response.data.headers);
            setStep(2);
        } catch (error) {
            console.error("Error previewing file:", error);
            toast.error("Error al leer el archivo. Verifique el formato.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Validation
    const handleValidation = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await importService.validateImport(model, formData, mapping);
            setValidationResult(response.data);
            setStep(3);
        } catch (error) {
            console.error("Error validando:", error);
            toast.error("Error durante la validación.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Execution
    const handleExecution = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await importService.executeImport(model, formData, mapping);
            setImportResult(response.data);
            setStep(4);
            toast.success("¡Importación completada con éxito!");
        } catch (error) {
            console.error("Error ejecutando importación:", error);
            toast.error("Fallo en la importación. Revise la consola o intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setFile(null);
        setMapping({});
        setValidationResult(null);
        setImportResult(null);
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Asistente de Importación</h1>
                <p className="text-slate-600">Importe datos masivos de forma fácil y segura.</p>
            </div>

            {/* Template Downloads */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Download size={16} className="text-nominix-electric" />
                    Descargar Plantillas de Importación
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {templateModels.map((tm) => {
                        const Icon = tm.icon;
                        const isDownloading = downloading === tm.key;
                        return (
                            <button
                                key={tm.key}
                                onClick={() => handleDownloadTemplate(tm.key)}
                                disabled={isDownloading}
                                className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-nominix-electric/50 hover:bg-nominix-electric/5 transition-all text-center disabled:opacity-50"
                            >
                                {isDownloading ? (
                                    <Loader2 className="animate-spin text-nominix-electric" size={24} />
                                ) : (
                                    <Icon size={24} className="text-slate-400 group-hover:text-nominix-electric transition-colors" />
                                )}
                                <span className="text-sm font-bold text-slate-700">{tm.label}</span>
                                <span className="text-[10px] text-slate-400 leading-tight">{tm.desc}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center mb-10 px-10">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors
                ${step >= s ? 'bg-nominix-electric text-white' : 'bg-slate-200 text-slate-500'}
            `}>
                            {s}
                        </div>
                        {s < 4 && (
                            <div className={`w-24 h-1 mx-2 transition-colors ${step > s ? 'bg-nominix-electric' : 'bg-slate-200'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8 min-h-[400px]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center min-h-[300px]">
                        <Loader2 className="animate-spin text-nominix-electric w-12 h-12 mb-4" />
                        <p className="text-slate-500 font-medium">Procesando...</p>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <FileUploader
                                file={file}
                                setFile={setFile}
                                model={model}
                                setModel={setModel}
                            />
                        )}

                        {step === 2 && (
                            <ColumnMapper
                                headers={headers}
                                fields={fields}
                                mapping={mapping}
                                setMapping={setMapping}
                            />
                        )}

                        {step === 3 && (
                            <ValidationReport validationResult={validationResult} />
                        )}

                        {step === 4 && (
                            <ImportResult result={importResult} onReset={handleReset} />
                        )}
                    </>
                )}
            </div>

            {/* Actions */}
            {!loading && step < 4 && (
                <div className="flex justify-between mt-8">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(prev => prev - 1)}
                            className="flex items-center gap-2 px-6 py-2 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            <ArrowLeft size={18} /> Atrás
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-4">
                        {step === 1 && (
                            <button
                                onClick={handleFileUpload}
                                className="flex items-center gap-2 px-8 py-3 bg-nominix-electric text-white rounded-lg font-bold hover:bg-nominix-electric/90 transition-all shadow-md shadow-nominix-electric/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!file}
                            >
                                Continuar <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                onClick={handleValidation}
                                className="flex items-center gap-2 px-8 py-3 bg-nominix-electric text-white rounded-lg font-bold hover:bg-nominix-electric/90 transition-all shadow-md shadow-nominix-electric/20"
                            >
                                Validar Datos <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={handleExecution}
                                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-md shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!validationResult?.valid}
                            >
                                <Play size={18} /> Ejecutar Importación
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportWizard;
