import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ClipboardList,
    FileText, Zap, ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function TasksSidebar() {
    const location = useLocation();

    const menuItems = [
        { path: '/audits', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/audits/board', label: 'Tablero / Tareas', icon: ClipboardList },
        { path: '/audits/templates', label: 'Plantillas / Checklists', icon: FileText },
        { path: '/audits/actions', label: 'Planes de Acción', icon: Zap },
    ];

    const isActive = (path) => {
        if (path === '/audits') return location.pathname === '/audits' || location.pathname === '/audits/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-8 pr-8 border-r border-slate-200">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Auditorías Tienda</p>
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center justify-between group px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    active
                                        ? "bg-nominix-electric/10 text-nominix-electric shadow-sm border border-nominix-electric/20"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={cn("w-5 h-5", active ? "text-nominix-electric" : "text-slate-400 group-hover:text-slate-600")} />
                                    {item.label}
                                </div>
                                {active && <ChevronRight className="w-4 h-4" />}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado del Mes</p>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Meta Sede Norte</span>
                    <span className="text-xs font-black text-nominix-electric">92%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-nominix-electric w-[92%]" />
                </div>
            </div>
        </div>
    );
}
