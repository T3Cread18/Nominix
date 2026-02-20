import React, { useState } from 'react';
import { Check, Sparkles, Users, ArrowRight, HelpCircle } from 'lucide-react';
import { getAdminUrl } from './Navbar';

const employeeTiers = [
    { range: '1 – 25', price: 25, perEmployee: 1.00 },
    { range: '26 – 50', price: 50, perEmployee: 1.00 },
    { range: '51 – 100', price: 100, perEmployee: 1.00 },
    { range: '101 – 250', price: 250, perEmployee: 1.00 },
    { range: '251+', price: null, perEmployee: 1.00 },
];

const includedFeatures = [
    'Todos los módulos incluidos',
    'Nómina multimoneda (USD/VES)',
    'Control biométrico Hikvision',
    'Vacaciones LOTTT automáticas',
    'Préstamos y deducciones',
    'Importación masiva Excel',
    'Recibos de pago PDF',
    'Reportes y dashboards',
    'Auditoría completa',
    'Soporte técnico incluido',
    'Actualizaciones continuas',
    'Multi-empresa',
];

const faqs = [
    {
        q: '¿Qué incluye el precio por empleado?',
        a: 'Todo. Todos los módulos, todas las funcionalidades, sin restricciones. Pagas solo por la cantidad de empleados activos en tu empresa.',
    },
    {
        q: '¿Hay un período de prueba?',
        a: 'Sí, ofrecemos 14 días de prueba gratuita con acceso completo a todos los módulos. No se requiere tarjeta de crédito.',
    },
    {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Absolutamente. No hay contratos a largo plazo ni penalidades por cancelación. Tu data siempre es tuya.',
    },
    {
        q: '¿Cómo se calcula el número de empleados?',
        a: 'Se cuenta la cantidad de empleados activos al momento de la facturación. Empleados inactivos o dados de baja no se cuentan.',
    },
    {
        q: '¿Aceptan pagos en bolívares?',
        a: 'Sí, aceptamos pagos en USD y VES (al tipo de cambio BCV del día). También aceptamos transferencias bancarias y Zelle.',
    },
    {
        q: '¿Incluye soporte para implementación?',
        a: 'Sí, incluimos asistencia en la configuración inicial, migración de datos y capacitación básica sin costo adicional.',
    },
];

const PricingSection = () => {
    const [openFaq, setOpenFaq] = useState(null);
    const [employeeCount, setEmployeeCount] = useState(25);

    const calculatedPrice = Math.max(employeeCount * 1, 25);

    return (
        <section id="pricing" aria-label="Precios y planes de Nominix – $1 por empleado" className="py-28 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#08080D] via-[#0A0A12] to-[#0A0A0F]" aria-hidden="true" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-20">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">
                        Precios
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Simple y transparente
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto text-lg">
                        Un solo plan. Todo incluido. Sin sorpresas.
                    </p>
                </div>

                {/* Main Pricing Card */}
                <div className="max-w-4xl mx-auto mb-20">
                    <div className="relative rounded-3xl bg-gradient-to-b from-blue-500/[0.08] to-transparent border border-blue-500/20 overflow-hidden">
                        {/* Badge */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-5 py-2 rounded-b-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-2 shadow-lg">
                            <Sparkles size={14} />
                            Todo Incluido
                        </div>

                        <div className="p-10 md:p-14 pt-16">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                {/* Left: Price */}
                                <div className="text-center md:text-left">
                                    <div className="flex items-baseline justify-center md:justify-start gap-2 mb-2">
                                        <span className="text-lg text-gray-500">$</span>
                                        <span className="text-7xl md:text-8xl font-black text-white tracking-tight">1</span>
                                    </div>
                                    <p className="text-xl text-gray-400 font-medium mb-6">
                                        por empleado / mes
                                    </p>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                        Sin límite de empleados, sin restricciones de módulos, sin costos ocultos. Todos los módulos incluidos desde el primer día.
                                    </p>

                                    {/* Calculator */}
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 block">
                                            Calcula tu precio
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 flex-1">
                                                <Users size={16} className="text-blue-400 shrink-0" />
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="500"
                                                    value={employeeCount}
                                                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                                                    className="flex-1 accent-blue-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="text-right min-w-[100px]">
                                                <span className="text-2xl font-black text-white">{employeeCount}</span>
                                                <span className="text-xs text-gray-500 ml-1">emp.</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-baseline">
                                            <span className="text-sm text-gray-500">Total mensual:</span>
                                            <span className="text-2xl font-black text-emerald-400">${calculatedPrice}<span className="text-sm text-gray-500 font-normal">/mes</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Features */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-5">
                                        Todo incluido:
                                    </h4>
                                    <ul className="space-y-3">
                                        {includedFeatures.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href={getAdminUrl()}
                                        className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 flex items-center justify-center gap-3"
                                    >
                                        Comenzar 14 días gratis
                                        <ArrowRight size={16} />
                                    </a>
                                    <p className="text-center text-[11px] text-gray-600 mt-3">
                                        Sin tarjeta de crédito · Cancela cuando quieras
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Price Table */}
                <div className="max-w-2xl mx-auto mb-20">
                    <h3 className="text-center text-lg font-bold text-white mb-8">Tabla de referencia</h3>
                    <div className="rounded-2xl border border-white/5 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Empleados</th>
                                    <th className="text-center px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">$/Empleado</th>
                                    <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Precio Mensual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeTiers.map((tier, i) => (
                                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{tier.range}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400 text-center">${tier.perEmployee.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-white font-bold text-right">
                                            {tier.price ? `$${tier.price}` : 'Personalizado'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-4">
                        Mínimo $25/mes · Precios en USD · Pagos mensuales
                    </p>
                </div>

                {/* FAQ */}
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-bold text-white mb-3">Preguntas frecuentes</h3>
                        <p className="text-gray-500 text-sm">Resolvemos tus dudas antes de empezar.</p>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden hover:border-white/10 transition-colors"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                                >
                                    <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                                    <HelpCircle
                                        size={16}
                                        className={`shrink-0 text-gray-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-blue-400' : ''}`}
                                    />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                                    }`}>
                                    <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">
                                        {faq.a}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
