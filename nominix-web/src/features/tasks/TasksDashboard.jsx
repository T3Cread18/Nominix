import React from 'react';
import {
    CheckCircle, ClipboardList, AlertTriangle,
    ArrowRight, TrendingUp, Download, Search,
    Bell, Calendar, MapPin
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function TasksDashboard() {
    const stats = [
        { title: 'Cumplimiento Global', value: '87.5%', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
        { title: 'Auditorías este Mes', value: '142', icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
        { title: 'Alertas Legales', value: '2 por vencer', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', highlight: true },
    ];

    const sedes = [
        { name: 'Sede Centro', score: 95, color: 'bg-nominix-electric' },
        { name: 'Sede Este', score: 88, color: 'bg-nominix-ocean' },
        { name: 'Sede Portuguesa', score: 75, color: 'bg-orange-500' },
        { name: 'Sede Norte', score: 92, color: 'bg-nominix-electric' },
    ];

    const alerts = [
        { id: 1, title: 'Permiso SADA por vencer', sede: 'Sede Centro', date: 'Vence en 4 días (10 Mar)', type: 'warning' },
        { id: 2, title: 'Certificados de Salud', sede: 'Sede Portuguesa', date: 'Faltan 2 empleados por cargar', type: 'info' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section from mockup */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Operaciones de Tienda</h1>
                    <p className="text-slate-500 mt-1">Resumen de cumplimiento a nivel nacional.</p>
                </div>
                <Button className="bg-nominix-electric hover:bg-nominix-ocean text-white gap-2 shadow-lg shadow-nominix-electric/20 transition-all active:scale-95">
                    <Download className="w-4 h-4" />
                    Exportar Reporte
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className={`border-none shadow-sm hover:shadow-md transition-all ${stat.highlight ? 'ring-2 ring-red-100' : ''}`}>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                                <stat.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                            </div>
                        </CardContent>
                        {stat.highlight && <div className="h-1 bg-red-500 w-full absolute bottom-0 left-0" />}
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph Card */}
                <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-white">
                        <CardTitle className="text-lg font-bold text-slate-800">Cumplimiento Operativo por Sede</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-64 flex items-end justify-around gap-4">
                            {sedes.map((sede, i) => (
                                <div key={i} className="flex flex-col items-center gap-4 w-full max-w-[80px] group">
                                    <div className="w-full relative bg-slate-50 rounded-t-xl overflow-hidden h-48 flex items-end">
                                        <div
                                            className={`${sede.color} w-full rounded-t-lg transition-all duration-1000 ease-out group-hover:brightness-110 shadow-lg`}
                                            style={{ height: `${sede.score}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {sede.score}%
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 text-center leading-tight">{sede.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Axis markers */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-nominix-electric" /> Excelente</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Atención</div>
                            </div>
                            <span>Marzo 2025</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts Sidebar within Dashboard */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            Alertas Automáticas
                        </h3>
                        <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none px-2 py-0.5 text-[10px]">
                            2 Nuevas
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer group">
                                <div className="flex items-start gap-3">
                                    <div className="bg-white p-2 rounded-lg text-orange-600 shadow-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-nominix-ocean transition-colors">{alert.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <MapPin className="w-3 h-3" />
                                            {alert.sede}
                                        </div>
                                        <p className="text-[10px] text-orange-700 font-medium mt-2 bg-orange-100/50 inline-block px-2 py-0.5 rounded-full">
                                            {alert.date}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed border-2 hover:bg-slate-50 text-slate-500 text-xs py-10 flex flex-col gap-2">
                        <TrendingUp className="w-6 h-6 opacity-20" />
                        Ver todas las alertas
                    </Button>
                </div>
            </div>

            {/* Bottom Section */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b px-6 py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800">Últimos Checklists Recibidos</CardTitle>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar sede..."
                            className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-nominix-electric/20 transition-all w-64"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-8 text-center text-slate-400 text-sm italic">
                        El listado de checklists se cargará dinámicamente desde el Tablero...
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
