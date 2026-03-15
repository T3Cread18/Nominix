import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-100', '101-250', '250+'];

const INITIAL_FORM = {
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    correo: '',
    empleados: '',
    direccion: '',
};

const FIELDS = [
    { name: 'nombre',   label: 'Nombre',              type: 'text',  placeholder: 'Juan',             half: true },
    { name: 'apellido', label: 'Apellido',             type: 'text',  placeholder: 'Pérez',            half: true },
    { name: 'empresa',  label: 'Empresa',              type: 'text',  placeholder: 'Mi Empresa, C.A.', half: true },
    { name: 'telefono', label: 'Teléfono / WhatsApp',  type: 'tel',   placeholder: '+58 412 000 0000',  half: true },
    { name: 'correo',   label: 'Correo Electrónico',   type: 'email', placeholder: 'juan@empresa.com', half: false },
    { name: 'direccion',label: 'Dirección',            type: 'text',  placeholder: 'Ciudad, Estado',   half: false },
];

export default function ContactForm() {
    const [form, setForm]       = useState(INITIAL_FORM);
    const [errors, setErrors]   = useState({});
    const [status, setStatus]   = useState('idle'); // idle | loading | success | error
    const [serverError, setServerError] = useState('');

    const validate = () => {
        const next = {};
        if (!form.nombre.trim())    next.nombre    = 'Requerido';
        if (!form.apellido.trim())  next.apellido  = 'Requerido';
        if (!form.empresa.trim())   next.empresa   = 'Requerido';
        if (!form.telefono.trim())  next.telefono  = 'Requerido';
        if (!form.correo.trim())    next.correo    = 'Requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
                                    next.correo    = 'Correo inválido';
        if (!form.empleados)        next.empleados = 'Selecciona un rango';
        if (!form.direccion.trim()) next.direccion = 'Requerido';
        return next;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const next = validate();
        if (Object.keys(next).length) { setErrors(next); return; }

        setStatus('loading');
        setServerError('');
        try {
            await axiosClient.post('/contact/', form);
            setStatus('success');
            setForm(INITIAL_FORM);
        } catch (err) {
            setStatus('error');
            setServerError(
                err.response?.data?.error ||
                'No se pudo enviar el mensaje. Intente de nuevo.'
            );
        }
    };

    if (status === 'success') {
        return (
            <div className="bg-white border border-teal-200 rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-landing-teal" />
                </div>
                <h3 className="text-xl font-bold text-landing-deep mb-2">
                    Solicitud enviada
                </h3>
                <p className="text-slate-600 mb-6">
                    Recibimos tu información. Nuestro equipo se comunicará contigo a la brevedad.
                </p>
                <button
                    onClick={() => setStatus('idle')}
                    className="text-landing-teal font-semibold hover:underline cursor-pointer transition-colors duration-200"
                >
                    Enviar otra solicitud
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm max-w-2xl mx-auto"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FIELDS.map(({ name, label, type, placeholder, half }) => (
                    <div key={name} className={half ? '' : 'sm:col-span-2'}>
                        <label
                            htmlFor={`contact-${name}`}
                            className="block text-sm font-semibold text-landing-deep mb-1.5"
                        >
                            {label}
                        </label>
                        <input
                            id={`contact-${name}`}
                            name={name}
                            type={type}
                            value={form[name]}
                            onChange={handleChange}
                            placeholder={placeholder}
                            autoComplete={name === 'correo' ? 'email' : name === 'telefono' ? 'tel' : 'off'}
                            className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-800 placeholder-slate-400 outline-none transition-[border-color,box-shadow] duration-200
                                focus:border-landing-teal focus:ring-2 focus:ring-landing-teal/20
                                ${errors[name] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        />
                        {errors[name] && (
                            <p className="mt-1 text-xs text-red-500">{errors[name]}</p>
                        )}
                    </div>
                ))}

                {/* Número de empleados */}
                <div className="sm:col-span-2">
                    <label
                        htmlFor="contact-empleados"
                        className="block text-sm font-semibold text-landing-deep mb-1.5"
                    >
                        N° de Empleados Aproximado
                    </label>
                    <select
                        id="contact-empleados"
                        name="empleados"
                        value={form.empleados}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none cursor-pointer transition-[border-color,box-shadow] duration-200
                            focus:border-landing-teal focus:ring-2 focus:ring-landing-teal/20
                            ${errors.empleados ? 'border-red-400 bg-red-50 text-slate-800' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'}
                            ${!form.empleados ? 'text-slate-400' : ''}`}
                    >
                        <option value="" disabled>Selecciona un rango</option>
                        {EMPLOYEE_RANGES.map(r => (
                            <option key={r} value={r}>{r} empleados</option>
                        ))}
                    </select>
                    {errors.empleados && (
                        <p className="mt-1 text-xs text-red-500">{errors.empleados}</p>
                    )}
                </div>
            </div>

            {/* Error del servidor */}
            {status === 'error' && serverError && (
                <div className="mt-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{serverError}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-landing-teal text-white font-bold py-3.5 rounded-xl
                    hover:bg-teal-600 transition-colors duration-200 cursor-pointer
                    disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Enviar Solicitud
                    </>
                )}
            </button>

            <p className="mt-4 text-center text-xs text-slate-500">
                Tu información es confidencial. No compartimos datos con terceros.
            </p>
        </form>
    );
}
