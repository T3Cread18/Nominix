import React from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import ModulesSection from './components/ModulesSection';
import PricingSection from './components/PricingSection';
import ContactSection from './components/ContactSection';
import { Github, Linkedin, Instagram } from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white selection:bg-blue-500/30 overflow-x-hidden">
            {/* Skip to content for accessibility */}
            <a href="#hero" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
                Ir al contenido principal
            </a>

            <Navbar />

            <main role="main">
                <HeroSection />
                <FeaturesSection />
                <ModulesSection />
                <PricingSection />
                <ContactSection />
            </main>

            {/* Footer */}
            <footer role="contentinfo" aria-label="Pie de página" className="border-t border-white/5 bg-[#050508]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center" aria-hidden="true">
                                    <span className="text-white font-black text-sm">N</span>
                                </div>
                                <span className="text-white font-bold text-lg">Nominix<span className="text-blue-400">.</span></span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Plataforma integral de gestión de Recursos Humanos diseñada para Venezuela. Nómina, biometría y cumplimiento LOTTT.
                            </p>
                        </div>

                        {/* Links */}
                        <nav aria-label="Enlaces de producto">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Producto</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#features" className="text-sm text-gray-500 hover:text-white transition-colors">Características</a></li>
                                <li><a href="#modules" className="text-sm text-gray-500 hover:text-white transition-colors">Módulos</a></li>
                                <li><a href="#pricing" className="text-sm text-gray-500 hover:text-white transition-colors">Planes y Precios</a></li>
                            </ul>
                        </nav>
                        <nav aria-label="Enlaces legales">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Legal</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Política de Privacidad</a></li>
                                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Términos de Servicio</a></li>
                                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">SLA</a></li>
                            </ul>
                        </nav>
                        <nav aria-label="Enlaces de soporte">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Soporte</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#contact" className="text-sm text-gray-500 hover:text-white transition-colors">Contacto</a></li>
                                <li><a href="mailto:info@vexitech.net" className="text-sm text-gray-500 hover:text-white transition-colors">info@vexitech.net</a></li>
                                <li><a href="https://wa.me/584120550562" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-white transition-colors">WhatsApp</a></li>
                            </ul>
                        </nav>
                    </div>

                    {/* Bottom */}
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-600">
                            © {new Date().getFullYear()} Nominix by <a href="mailto:info@vexitech.net" className="hover:text-white transition-colors">Vexitech</a>. Todos los derechos reservados.
                        </p>
                        <div className="flex items-center gap-5">
                            <a href="#" aria-label="GitHub" className="text-gray-600 hover:text-white transition-colors"><Github size={18} /></a>
                            <a href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-white transition-colors"><Linkedin size={18} /></a>
                            <a href="#" aria-label="Instagram" className="text-gray-600 hover:text-white transition-colors"><Instagram size={18} /></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
