import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
// Alert component removed as it does not exist


const FileUploader = ({ file, setFile, model, setModel }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, [setFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        multiple: false
    });

    const removeFile = (e) => {
        e.stopPropagation();
        setFile(null);
    }

    const models = [
        { value: 'employee', label: 'Empleados' },
        { value: 'branch', label: 'Sedes' },
        // Add more as needed
    ];

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Seleccione el tipo de datos a importar
                </label>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nominix-electric/50 outline-none transition-all"
                >
                    {models.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
            </div>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-nominix-electric bg-nominix-electric/5' : 'border-slate-300 hover:border-slate-400'}
          ${file ? 'bg-slate-50' : ''}
        `}
            >
                <input {...getInputProps()} />

                {file ? (
                    <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-nominix-electric mb-3" />
                        <p className="font-medium text-slate-900 text-lg">{file.name}</p>
                        <p className="text-sm text-slate-500 mb-4">{(file.size / 1024).toFixed(2)} KB</p>
                        <button
                            onClick={removeFile}
                            className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 py-1 px-3 rounded hover:bg-red-50 transition-colors"
                        >
                            <X size={16} /> Eliminar archivo
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-900 text-lg">
                            {isDragActive ? 'Suelte el archivo aquí' : 'Arrastre y suelte su archivo aquí'}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Soporta CSV, Excel (.xlsx, .xls)
                        </p>
                        <span className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                            O haga clic para buscar
                        </span>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Asegúrese de que su archivo tenga encabezados en la primera fila.
                    El sistema intentará emparejar automáticamente las columnas, pero podrá ajustarlas en el siguiente paso.
                </p>
            </div>
        </div>
    );
};

export default FileUploader;
