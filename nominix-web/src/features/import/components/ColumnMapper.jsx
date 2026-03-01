import React, { useEffect } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';

const ColumnMapper = ({ headers, fields, mapping, setMapping }) => {

    // Auto-map on load
    useEffect(() => {
        const newMapping = { ...mapping };
        let changed = false;

        headers.forEach(header => {
            // Find matching field by name or label (case insensitive)
            const field = fields.find(f =>
                f.name.toLowerCase() === header.toLowerCase() ||
                f.label.toLowerCase() === header.toLowerCase()
            );

            if (field && !newMapping[header]) {
                newMapping[header] = field.name;
                changed = true;
            }
        });

        if (changed) {
            setMapping(newMapping);
        }
    }, [headers, fields, mapping, setMapping]);

    const handleSelectChange = (header, fieldName) => {
        setMapping(prev => ({
            ...prev,
            [header]: fieldName
        }));
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-lg font-medium text-slate-800 mb-2">Mapeo de Columnas</h3>
                <p className="text-sm text-slate-600">
                    Asocie las columnas de su archivo con los campos del sistema.
                    Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios.
                </p>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Columna Archivo
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Acción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Campo Destino (Sistema)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {headers.map((header, idx) => {
                            const selectedField = fields.find(f => f.name === mapping[header]);
                            const isMapped = !!selectedField;

                            return (
                                <tr key={header} className={isMapped ? 'bg-green-50/30' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        <div className="flex items-center gap-2">
                                            {isMapped ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-slate-300" />}
                                            {header}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <ArrowRight className="mx-auto text-slate-300" size={16} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <select
                                            className={`block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-nominix-electric focus:border-nominix-electric sm:text-sm rounded-md shadow-sm
                        ${isMapped ? 'border-green-300 ring-1 ring-green-300' : 'border-slate-300'}
                      `}
                                            value={mapping[header] || ''}
                                            onChange={(e) => handleSelectChange(header, e.target.value)}
                                        >
                                            <option value="">-- Ignorar columna --</option>
                                            {fields.map(field => (
                                                <option key={field.name} value={field.name}>
                                                    {field.label} {field.required ? '*' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Missing Required Fields Warning */}
            {fields.filter(f => f.required && !Object.values(mapping).includes(f.name)).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="font-medium text-amber-800">Faltan campos obligatorios sin mapear:</p>
                    <ul className="list-disc list-inside text-sm text-amber-700 mt-1">
                        {fields.filter(f => f.required && !Object.values(mapping).includes(f.name)).map(f => (
                            <li key={f.name}>{f.label}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ColumnMapper;
