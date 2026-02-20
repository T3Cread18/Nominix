import React, { useState, useEffect } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

const getAdminUrl = () => {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    if (host === 'localhost') return `${protocol}//admin.localhost${port ? `:${port}` : ''}`;
    if (host === 'nominix.net' || host === 'www.nominix.net') return `${protocol}//admin.nominix.net`;
    return `${protocol}//admin.${host}${port ? `:${port}` : ''}`;
};

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { href: '#features', label: 'Características' },
        { href: '#modules', label: 'Módulos' },
        { href: '#pricing', label: 'Precios' },
        { href: '#contact', label: 'Contacto' },
    ];

    return (
        <header role="banner">
            <nav
                aria-label="Navegación principal"
                className={`fixed w-full z-50 transition-all duration-500 ${scrolled
                        ? 'bg-[#08080D]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
                        : 'bg-transparent'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <a href="#hero" className="flex-shrink-0 flex items-center gap-3 group" aria-label="Nominix - Inicio">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow" aria-hidden="true">
                                <span className="text-white font-black text-lg">N</span>
                            </div>
                            <span className="text-white font-bold text-xl tracking-tight">
                                Nominix<span className="text-blue-400">.</span>
                            </span>
                        </a>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map(link => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all duration-300"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="hidden md:flex items-center gap-3">
                            <a href="#contact" className="text-sm text-gray-400 hover:text-white font-medium transition-colors">
                                Demo Gratis
                            </a>
                            <a
                                href={getAdminUrl()}
                                className="px-5 py-2.5 rounded-full bg-white text-[#0A0A0F] font-bold text-sm hover:bg-blue-100 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-2"
                                rel="noopener"
                            >
                                <Sparkles size={14} aria-hidden="true" />
                                Ingresar
                            </a>
                        </div>

                        {/* Mobile toggle */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            aria-expanded={isOpen}
                            aria-controls="mobile-menu"
                            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
                        >
                            {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div
                    id="mobile-menu"
                    role="navigation"
                    aria-label="Menú móvil"
                    className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="bg-[#08080D]/98 backdrop-blur-xl border-t border-white/5 px-6 py-4 space-y-1">
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-gray-300 hover:text-white rounded-lg hover:bg-white/5 font-medium transition-all"
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href={getAdminUrl()}
                            className="block px-4 py-3 bg-blue-600 text-white rounded-lg font-bold text-center mt-3"
                            rel="noopener"
                        >
                            Ingresar al Sistema
                        </a>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export { getAdminUrl };
export default Navbar;
