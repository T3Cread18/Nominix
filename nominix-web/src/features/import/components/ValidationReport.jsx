import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const ValidationReport = ({ validationResult }) => {
    if (!validationResult) return null;

    const { valid, errors } = validationResult;

    if (valid) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800">¡Todo se ve bien!</h3>
                <p className="text-green-700 mt-2">
                    No se encontraron errores en la validación. <br />
                    Puede proceder con la importación.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                    <h3 className="text-lg font-semibold text-red-800">Se encontraron errores</h3>
                    <p className="text-red-700">
                        El archivo contiene errores que impiden la importación.
                        Por favor corrija los problemas listados abajo y vuelva a subir el archivo.
                    </p>
                </div>
            </div>

            <div className="border rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                                Fila
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Errores
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Datos
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-100">
                                    #{err.row}
                                </td>
                                <td className="px-6 py-4 text-sm text-red-600">
                                    <ul className="list-disc list-inside">
                                        {err.errors.map((msg, i) => (
                                            <li key={i}>{msg}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    <div className="max-w-md overflow-x-auto">
                                        <pre className="text-xs bg-slate-50 p-2 rounded border font-mono">
                                            {JSON.stringify(err.data, null, 2)}
                                        </pre>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ValidationReport;
