import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, DollarSign, Calendar, BarChart3, CheckCircle, Menu, X,
    Users, Clock, FileText, ChevronDown, ChevronUp, Zap, Building2,
    Fingerprint, Landmark, ClipboardList, BookOpen, ArrowRight, Star, Mail
} from 'lucide-react';
import ContactForm from './ContactForm';

const HERO_IMAGE = '/images/dashboard-preview.png';
const LOGO_IMAGE = '/images/nominix-logo.svg';

/* ─────────────── DATA ─────────────── */

const STATS = [
    { value: '99.9%', label: 'Uptime Garantizado', icon: Zap },
    { value: '24/7', label: 'Soporte Técnico Local', icon: Clock },
];

const STEPS = [
    {
        num: '01',
        title: 'Configura tu Empresa',
        description: 'Define tu estructura organizativa, departamentos, cargos y políticas salariales. Importa tu data existente en minutos con nuestro asistente de migración.',
    },
    {
        num: '02',
        title: 'Carga Empleados y Conceptos',
        description: 'Registra tu plantilla con todos los datos laborales requeridos por la LOTTT. Configura conceptos de asignación y deducción personalizados.',
    },
    {
        num: '03',
        title: 'Genera tu Nómina con un Clic',
        description: 'Ejecuta el cierre de nómina automático con cálculos de IVSS, INCES, FAOV, ISLR y prestaciones sociales. Exporta recibos, reportes y declaraciones al instante.',
    },
];

const MODULES = [
    {
        icon: DollarSign,
        title: 'Nómina Multi-Moneda',
        description: 'Calcula nóminas en bolívares con referencia en dólares. Sincronización automática con la tasa BCV oficial para cumplimiento total con la normativa cambiaria.',
        keywords: 'USD/VES • Tasa BCV • Doble moneda',
    },
    {
        icon: Shield,
        title: 'Cumplimiento LOTTT',
        description: 'Motor de cálculo actualizado con la Ley Orgánica del Trabajo vigente. Prestaciones sociales, utilidades, vacaciones, bonos y retroactivos calculados al centavo.',
        keywords: 'Prestaciones • Utilidades • Retroactivos',
    },
    {
        icon: Fingerprint,
        title: 'Control de Asistencia',
        description: 'Integración nativa con dispositivos biométricos Hikvision. Registro automático de entradas, salidas, horas extras y faltas para cálculos precisos en nómina.',
        keywords: 'Biométrico • Hikvision • Horas Extra',
    },
    {
        icon: Calendar,
        title: 'Vacaciones y Permisos',
        description: 'Gestión completa del ciclo vacacional según la LOTTT. Acumulación automática de días, simulación de pagos, aprobaciones y control de saldos en tiempo real.',
        keywords: 'Bono Vacacional • Días Acumulados • LOTTT',
    },
    {
        icon: Landmark,
        title: 'Declaraciones Gubernamentales',
        description: 'Genera y exporta tus declaraciones al IVSS, INCES, FAOV e ISLR en los formatos oficiales. Sin errores manuales, sin retrabajo, sin multas.',
        keywords: 'IVSS • INCES • FAOV • ISLR',
    },
    {
        icon: ClipboardList,
        title: 'Préstamos y Anticipos',
        description: 'Administra préstamos a empleados con cuotas automáticas descontadas en nómina. Historial completo, saldos pendientes y reportes de cartera.',
        keywords: 'Cuotas • Descuentos • Cartera',
    },
];

const TRUST_ITEMS = [
    { label: 'Uptime del Sistema', value: '99.9%' },
    { label: 'Backup de Datos', value: 'Diario Automático' },
    { label: 'Soporte Técnico', value: '24/7 Priority' },
];

const TRUST_CHECKS = [
    'Encriptación de datos grado bancario (AES-256).',
    'Soporte profesional local con expertos en LOTTT.',
    'Arquitectura Multi-Tenant para máxima eficiencia.',
    'Cumplimiento con estándares de protección de datos.',
];

const FAQS = [
    {
        q: '¿Nóminix cumple con la LOTTT vigente?',
        a: 'Sí. Nuestro motor de cálculo está permanentemente actualizado con la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT) vigente en Venezuela. Esto incluye el cálculo de prestaciones sociales, utilidades, vacaciones, bono vacacional, retroactivos y todas las obligaciones patronales establecidas por ley.',
    },
    {
        q: '¿Puedo manejar nómina en dólares y bolívares simultáneamente?',
        a: 'Absolutamente. Nóminix opera de forma nativa con doble moneda (USD/VES). El sistema sincroniza automáticamente la tasa oficial del BCV en tiempo real, permitiéndote definir salarios en dólares y generar recibos, reportes y declaraciones en bolívares sin conversiones manuales ni riesgo de errores.',
    },
    {
        q: '¿Es seguro almacenar datos de empleados en la nube?',
        a: 'Nóminix utiliza encriptación de grado bancario (AES-256), conexiones seguras TLS 1.3 y una arquitectura multi-tenant con aislamiento total de datos entre empresas. Realizamos respaldos automáticos diarios y contamos con infraestructura de alta disponibilidad con 99.9% de uptime garantizado.',
    },
    {
        q: '¿Qué reportes gubernamentales puedo generar?',
        a: 'El sistema genera y exporta en formato oficial las declaraciones para IVSS (Seguro Social), INCES (capacitación), FAOV (ahorro habitacional), BANAVIH e ISLR (Impuesto sobre la Renta). Todos los archivos se producen listos para carga directa en los portales oficiales, eliminando errores de formato.',
    },
    {
        q: '¿Cómo funciona la integración con dispositivos biométricos?',
        a: 'Nóminix se integra directamente con dispositivos Hikvision para capturar eventos de asistencia (entradas, salidas, horas extras). Los datos se sincronizan de forma automática con el módulo de nómina, asegurando que las incidencias y bonificaciones de asistencia se reflejen con precisión en cada cierre.',
    },
    {
        q: '¿Cuánto tiempo toma migrar mi data actual a Nóminix?',
        a: 'La mayoría de nuestros clientes completan la migración en menos de 48 horas. Nóminix incluye un asistente de importación que acepta archivos Excel y CSV para carga masiva de empleados, conceptos y saldos históricos. Además, nuestro equipo de soporte te acompaña durante todo el proceso.',
    },
];

/* ─────────────── COMPONENT ─────────────── */

export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    const goToLogin = () => navigate('/login');
    const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

    return (
        <div className="bg-white text-slate-900 antialiased">
            {/* Skip to content — accesibilidad teclado */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-landing-teal focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
            >
                Ir al contenido principal
            </a>

            {/* ═══════════ NAVIGATION ═══════════ */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50" aria-label="Navegación principal">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <img src={LOGO_IMAGE} alt="Nóminix - Software de Nómina y RRHH Venezuela" className="h-10 w-auto" />

                        <div className="hidden md:flex space-x-8 items-center">
                            <a href="#modules" className="text-slate-600 hover:text-landing-teal font-medium transition-colors">Módulos</a>
                            <a href="#howItWorks" className="text-slate-600 hover:text-landing-teal font-medium transition-colors">¿Cómo Funciona?</a>
                            <a href="#trust" className="text-slate-600 hover:text-landing-teal font-medium transition-colors">Seguridad</a>
                            <a href="#faq" className="text-slate-600 hover:text-landing-teal font-medium transition-colors">FAQ</a>
                            <a href="#contact" className="text-slate-600 hover:text-landing-teal font-medium transition-colors">Contacto</a>
                            <button
                                onClick={goToLogin}
                                className="bg-landing-deep text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-sm"
                            >
                                Iniciar Sesión
                            </button>
                        </div>

                        <button className="md:hidden text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menú móvil">
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div className="md:hidden pb-4 space-y-3">
                            <a href="#modules" className="block text-slate-600 hover:text-landing-teal font-medium" onClick={() => setMobileMenuOpen(false)}>Módulos</a>
                            <a href="#howItWorks" className="block text-slate-600 hover:text-landing-teal font-medium" onClick={() => setMobileMenuOpen(false)}>¿Cómo Funciona?</a>
                            <a href="#trust" className="block text-slate-600 hover:text-landing-teal font-medium" onClick={() => setMobileMenuOpen(false)}>Seguridad</a>
                            <a href="#faq" className="block text-slate-600 hover:text-landing-teal font-medium" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
                            <a href="#contact" className="block text-slate-600 hover:text-landing-teal font-medium" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
                            <button onClick={goToLogin} className="block w-full text-left bg-landing-deep text-white px-6 py-2.5 rounded-lg font-semibold">
                                Iniciar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ═══════════ HERO ═══════════ */}
            <section id="main-content" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-5">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-landing-teal rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-landing-deep rounded-full blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:flex lg:items-center lg:gap-12">
                        <div className="lg:w-1/2 text-center lg:text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-landing-deep leading-tight mb-6 mt-8">
                                La Nómina de tu Empresa en Venezuela, <span className="text-landing-teal">Resuelta</span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                                Olvídate de las hojas de cálculo. Nóminix automatiza tu nómina con <strong>cumplimiento total LOTTT</strong>, manejo nativo <strong>multi-moneda USD/VES</strong> y sincronización directa con la <strong>tasa BCV</strong> — todo desde la nube.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button
                                    onClick={goToLogin}
                                    className="px-8 py-4 bg-landing-teal text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/30 motion-safe:hover:-translate-y-1 transition-[colors,box-shadow,transform] duration-200 flex items-center justify-center gap-2"
                                >
                                    Solicitar Acceso <ArrowRight className="w-5 h-5" />
                                </button>
                                <a
                                    href="#modules"
                                    className="px-8 py-4 bg-white text-landing-deep border-2 border-slate-200 font-bold rounded-xl hover:border-landing-teal hover:text-landing-teal transition-all text-center"
                                >
                                    Explorar Módulos
                                </a>
                            </div>
                            <p className="mt-6 text-sm text-slate-500 flex items-center justify-center lg:justify-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                Sin tarjeta de crédito · Configuración en 15 minutos
                            </p>
                        </div>

                        <div className="lg:w-1/2 mt-16 lg:mt-0 relative">
                            <div className="relative z-10 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                                <img
                                    alt="Panel de control Nóminix mostrando gestión de nómina multi-moneda en Venezuela"
                                    className="w-full h-auto"
                                    src={HERO_IMAGE}
                                    loading="eager"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-20 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                        <span className="text-landing-teal font-bold">$</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Tasa BCV Hoy</p>
                                        <p className="text-sm font-bold text-landing-deep">Sincronizado Automáticamente</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ SOCIAL PROOF BAR ═══════════ */}
            <section className="py-10 bg-landing-deep" aria-label="Métricas de confianza">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-8 text-center max-w-3xl mx-auto">
                        {STATS.map(({ value, label, icon: Icon }) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <Icon className="w-6 h-6 text-landing-teal" />
                                <span className="text-3xl md:text-4xl font-extrabold text-white">{value}</span>
                                <span className="text-slate-400 text-sm font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section className="py-24 bg-white" id="howItWorks">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block py-1 px-3 rounded-full bg-teal-50 text-landing-teal text-xs font-bold tracking-widest uppercase mb-4">Proceso Simple</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-landing-deep mb-4">
                            Tu Nómina Lista en 3 Pasos
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                            De la configuración inicial al primer recibo de pago. Sin complicaciones, sin consultores externos.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                        {STEPS.map(({ num, title, description }, i) => (
                            <div key={num} className="relative">
                                {i < STEPS.length - 1 && (
                                    <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-landing-teal/30 to-transparent -translate-x-1/2 z-0" />
                                )}
                                <div className="relative z-10 bg-white p-8 rounded-2xl border border-slate-200 hover:border-landing-teal hover:shadow-lg transition-[border-color,box-shadow] duration-200 group cursor-pointer">
                                    <span className="text-5xl font-black text-landing-teal/15 group-hover:text-landing-teal/30 transition-colors">{num}</span>
                                    <h3 className="text-xl font-bold text-landing-deep mt-2 mb-3">{title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ MODULES (expanded Features) ═══════════ */}
            <section className="py-24 bg-slate-50" id="modules">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block py-1 px-3 rounded-full bg-teal-50 text-landing-teal text-xs font-bold tracking-widest uppercase mb-4">Plataforma Completa</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-landing-deep mb-4">
                            Todo lo que Necesitas para Gestionar RRHH en Venezuela
                        </h2>
                        <p className="text-slate-600 max-w-3xl mx-auto text-lg">
                            Seis módulos integrados diseñados específicamente para los retos complejos del mercado laboral venezolano. Sin parches, sin módulos de otros países adaptados — esto fue construido para ti.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {MODULES.map(({ icon: Icon, title, description, keywords }) => (
                            <div key={title} className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-landing-teal hover:shadow-lg transition-[border-color,box-shadow] duration-200 group cursor-pointer">
                                <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-landing-teal transition-colors">
                                    <Icon className="w-8 h-8 text-landing-teal group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-landing-deep mb-3">{title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">{description}</p>
                                <span className="text-xs font-semibold text-landing-teal/70 tracking-wide">{keywords}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ TRUST / SECURITY ═══════════ */}
            <section className="py-24 bg-landing-deep text-white overflow-hidden" id="trust">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 items-center gap-16">
                        <div>
                            <span className="inline-block py-1 px-3 rounded-full bg-white/10 text-landing-teal text-xs font-bold tracking-widest uppercase mb-4">Seguridad Enterprise</span>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                Infraestructura de Nivel Corporativo para tu Tranquilidad
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Los datos de nómina de tus empleados son información sensible. Por eso Nóminix utiliza la misma infraestructura de seguridad que usan los bancos — para que tú solo te preocupes por hacer crecer tu empresa.
                            </p>
                            <ul className="space-y-4">
                                {TRUST_CHECKS.map((text) => (
                                    <li key={text} className="flex items-center gap-4">
                                        <div className="p-1 bg-landing-teal rounded-full flex-shrink-0">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-slate-300">{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-10 rounded-3xl border border-white/20">
                            <div className="flex flex-col gap-6">
                                {TRUST_ITEMS.map(({ label, value }, i) => (
                                    <div key={label} className={`flex justify-between items-center ${i < TRUST_ITEMS.length - 1 ? 'border-b border-white/10 pb-4' : ''}`}>
                                        <span className="text-slate-400 font-medium">{label}</span>
                                        <span className="text-landing-teal font-bold">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FAQ ═══════════ */}
            <section className="py-24 bg-white" id="faq">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block py-1 px-3 rounded-full bg-teal-50 text-landing-teal text-xs font-bold tracking-widest uppercase mb-4">Preguntas Frecuentes</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-landing-deep mb-4">
                            Respuestas a tus Dudas sobre Nómina en Venezuela
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Todo lo que necesitas saber antes de digitalizar tu gestión de nómina y RRHH con Nóminix.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map(({ q, a }, i) => (
                            <div
                                key={i}
                                className={`border rounded-xl transition-all ${openFaq === i ? 'border-landing-teal bg-teal-50/30 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                    aria-expanded={openFaq === i}
                                >
                                    <span className="font-semibold text-landing-deep pr-4">{q}</span>
                                    {openFaq === i
                                        ? <ChevronUp className="w-5 h-5 text-landing-teal flex-shrink-0" />
                                        : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-slate-600 leading-relaxed text-sm">
                                        {a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ CONTACT ═══════════ */}
            <section className="py-24 bg-slate-50 border-t border-slate-200" id="contact">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <span className="inline-block py-1 px-3 rounded-full bg-teal-50 text-landing-teal text-xs font-bold tracking-widest uppercase mb-4">Solicitud de Acceso</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-landing-deep mb-4">
                            Comienza a Digitalizar tu Nómina
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                            Completa el formulario y un especialista de Nóminix se comunicará contigo para configurar tu cuenta.
                        </p>
                    </div>
                    <ContactForm />
                </div>
            </section>

            {/* ═══════════ CTA ═══════════ */}
            <section className="py-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-landing-teal rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-center gap-1 mb-6">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-300 fill-yellow-300" />)}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                Deja de Calcular Nómina a Mano.<br className="hidden md:block" /> Empieza Hoy.
                            </h2>
                            <p className="text-xl text-teal-50 mb-10 max-w-2xl mx-auto">
                                Automatiza tus procesos de RRHH con Nóminix. Tu próximo cierre de nómina puede ser el más fácil de tu historia.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={goToLogin}
                                    className="bg-white text-landing-teal px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors duration-200 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    Comenzar Ahora <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="mt-6 text-teal-100 text-sm">
                                Sin compromisos · Sin tarjeta de crédito · Soporte incluido
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                    </div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <img src={LOGO_IMAGE} alt="Nóminix - Software de Nómina y RRHH Venezuela" className="h-12 w-auto mb-6" />
                            <p className="text-slate-600 max-w-sm mb-6">
                                Nóminix Suite es la plataforma líder de nómina y gestión de RRHH diseñada para Venezuela. Cumplimiento LOTTT, multi-moneda USD/VES, prestaciones sociales, IVSS, INCES y más — todo en un solo lugar.
                            </p>
                            <p className="text-slate-500 text-xs">
                                Software de nómina Venezuela · Cálculo de prestaciones sociales · Gestión de RRHH SaaS
                            </p>
                        </div>
                        <div>
                            <h4 className="text-landing-deep font-bold mb-6">Producto</h4>
                            <ul className="space-y-4 text-slate-600">
                                <li><a href="#modules" className="hover:text-landing-teal transition-colors">Nómina Multi-Moneda</a></li>
                                <li><a href="#modules" className="hover:text-landing-teal transition-colors">Prestaciones LOTTT</a></li>
                                <li><a href="#modules" className="hover:text-landing-teal transition-colors">Control de Asistencia</a></li>
                                <li><a href="#modules" className="hover:text-landing-teal transition-colors">Declaraciones Gubernamentales</a></li>
                                <li><a href="#trust" className="hover:text-landing-teal transition-colors">Seguridad</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-landing-deep font-bold mb-6">Empresa</h4>
                            <ul className="space-y-4 text-slate-600">
                                <li><a href="#howItWorks" className="hover:text-landing-teal transition-colors">¿Cómo Funciona?</a></li>
                                <li><a href="#faq" className="hover:text-landing-teal transition-colors">Preguntas Frecuentes</a></li>
                                <li><a href="#contact" className="hover:text-landing-teal transition-colors">Documentación</a></li>
                                <li><a href="#contact" className="hover:text-landing-teal transition-colors">Contacto</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Nóminix Suite. Todos los derechos reservados.</p>
                        <div className="flex gap-6 text-sm text-slate-500">
                            <a href="#contact" className="hover:text-landing-teal transition-colors">Términos de Servicio</a>
                            <a href="#contact" className="hover:text-landing-teal transition-colors">Privacidad</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
