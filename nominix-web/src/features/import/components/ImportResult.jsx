import React from 'react';
import { BadgeCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ImportResult = ({ result, onReset }) => {
    if (!result) return null;

    return (
        <div className="text-center py-10">
            <div className="flex justify-center mb-6">
                <div className="bg-green-100 p-4 rounded-full">
                    <BadgeCheck className="w-16 h-16 text-green-600" />
                </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Importación Exitosa!</h2>
            <p className="text-slate-600 mb-8 text-lg">
                Se han procesado los datos correctamente.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-10">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="block text-3xl font-bold text-nominix-electric mb-1">{result.created}</span>
                    <span className="text-sm text-slate-500 uppercase tracking-wide font-medium">Registros Creados</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="block text-3xl font-bold text-nominix-electric mb-1">{result.updated}</span>
                    <span className="text-sm text-slate-500 uppercase tracking-wide font-medium">Registros Actualizados</span>
                </div>
            </div>

            <div className="flex justify-center gap-4">
                <Link
                    to="/"
                    className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                    Volver al Inicio
                </Link>
                <button
                    onClick={onReset}
                    className="px-6 py-3 bg-nominix-electric text-white font-medium rounded-lg hover:bg-nominix-electric/90 transition-colors flex items-center gap-2 shadow-lg shadow-nominix-electric/20"
                >
                    Importar otro Archivo <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default ImportResult;
