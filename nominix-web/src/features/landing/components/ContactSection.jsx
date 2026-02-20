import React, { useState } from 'react';
import { Send, Mail, Phone, MapPin, MessageSquare, Clock, CheckCircle } from 'lucide-react';

const ContactSection = () => {
    const [formData, setFormData] = useState({ name: '', email: '', company: '', employees: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Placeholder submit logic
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
    };

    return (
        <section id="contact" aria-label="Contacta con Nominix para una demo gratuita" className="py-28 relative">
            <div className="absolute inset-0 bg-[#0A0A0F]" aria-hidden="true" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/5 blur-[200px] rounded-full" aria-hidden="true" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                        Contacto
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        ¿Listo para empezar?
                    </h2>
                    <p className="text-gray-400 max-w-lg mx-auto text-lg">
                        Solicita una demo gratuita o cuéntanos sobre tus necesidades.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                    <a href="mailto:info@vexitech.net" className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all text-center">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Mail className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">Email</p>
                        <p className="text-xs text-gray-500">info@vexitech.net</p>
                    </a>
                    <a href="https://wa.me/584120550562" target="_blank" rel="noopener" className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all text-center">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">WhatsApp</p>
                        <p className="text-xs text-gray-500">+58 412 055 0562</p>
                    </a>
                    <div className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all text-center">
                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <MapPin className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">Ubicación</p>
                        <p className="text-xs text-gray-500">Venezuela</p>
                    </div>
                    <div className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all text-center">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">Horario</p>
                        <p className="text-xs text-gray-500">Lun-Vie 8am - 5pm</p>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="max-w-3xl mx-auto">
                    <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-blue-600/[0.06] via-indigo-600/[0.06] to-purple-600/[0.06] border border-white/5 overflow-hidden relative">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />

                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-white mb-2 text-center">Solicita tu Demo Gratuita</h3>
                            <p className="text-gray-500 text-sm mb-8 text-center">Te contactamos en menos de 24 horas.</p>

                            {submitted ? (
                                <div className="text-center py-10">
                                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-white mb-2">¡Mensaje enviado!</h4>
                                    <p className="text-gray-500 text-sm">Nos pondremos en contacto contigo pronto.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre</label>
                                            <input
                                                type="text" name="name" required
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Tu nombre completo"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                                            <input
                                                type="email" name="email" required
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="tu@empresa.com"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Empresa</label>
                                            <input
                                                type="text" name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                placeholder="Nombre de tu empresa"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nº de Empleados</label>
                                            <select
                                                name="employees"
                                                value={formData.employees}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm [&>option]:bg-[#0A0A0F] [&>option]:text-white"
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="1-25">1 – 25</option>
                                                <option value="26-50">26 – 50</option>
                                                <option value="51-100">51 – 100</option>
                                                <option value="101-250">101 – 250</option>
                                                <option value="250+">250+</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Mensaje (opcional)</label>
                                        <textarea
                                            name="message" rows="3"
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="¿Qué módulos te interesan? ¿Tienes alguna necesidad específica?"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
                                    >
                                        <Send size={16} />
                                        Solicitar Demo Gratuita
                                    </button>
                                    <p className="text-center text-[10px] text-gray-600">
                                        Al enviar aceptas nuestra política de privacidad.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
