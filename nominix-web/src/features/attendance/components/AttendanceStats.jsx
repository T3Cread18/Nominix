import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { Users, UserCheck, UserX, RefreshCw } from 'lucide-react';

/**
 * AttendanceStats - KPI cards para el dashboard de asistencia.
 * 
 * Muestra tarjetas con: total marcajes hoy, presentes, ausentes, última sincronización.
 */
const EMPTY_STATS = {};
const AttendanceStats = ({ stats = EMPTY_STATS }) => {
    const cards = [
        {
            title: 'Marcajes Hoy',
            value: stats.totalEventsToday ?? '—',
            icon: RefreshCw,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
        },
        {
            title: 'Presentes',
            value: stats.presentToday ?? '—',
            icon: UserCheck,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            title: 'Ausentes',
            value: stats.absentToday ?? '—',
            icon: UserX,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
        },
        {
            title: 'Empleados Mapeados',
            value: stats.mappedEmployees ?? '—',
            icon: Users,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card key={card.title} className="border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                    {card.title}
                                </p>
                                <p className="text-2xl font-black tracking-tight">
                                    {card.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${card.bg}`}>
                                <card.icon size={20} className={card.color} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default AttendanceStats;
