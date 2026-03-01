import React, { useEffect, useState } from 'react';
import { Gift, Award, CalendarDays, PartyPopper } from 'lucide-react';
import dashboardService from '../../api/dashboardService';

const UpcomingEventsWidget = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await dashboardService.getUpcomingEvents();
                setEvents(data);
            } catch (error) {
                console.error("Error fetching upcoming events:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) {
        return <div className="h-32 bg-white/40 rounded-[2rem] animate-pulse"></div>;
    }

    const formatDate = (isoStr) => {
        const date = new Date(isoStr);
        return new Intl.DateTimeFormat('es-VE', {
            day: 'numeric',
            month: 'long'
        }).format(date);
    };

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/60 shadow-sm relative overflow-hidden">
            {events.length > 0 && (
                <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none rotate-12">
                    <PartyPopper size={120} className="text-indigo-500" />
                </div>
            )}

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <CalendarDays size={16} className="text-indigo-500" />
                    Eventos de este mes
                </h3>
            </div>

            <div className="space-y-3 relative z-10">
                {events.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm font-medium text-slate-500">No hay cumpleaños ni aniversarios en los próximos 15 días.</p>
                    </div>
                ) : (
                    events.map((event, idx) => (
                        <div key={`${event.employee}-${event.type}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-shadow">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.type === 'birthday'
                                    ? 'bg-rose-100 text-rose-500'
                                    : 'bg-blue-100 text-blue-500'
                                }`}>
                                {event.type === 'birthday' ? <Gift size={18} /> : <Award size={18} />}
                            </div>

                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">{event.employee}</p>
                                <p className="text-[11px] font-medium text-slate-400 capitalize">
                                    {event.type === 'birthday' ? 'Cumpleaños' : `${event.years}º Aniversario Laboral`}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-600">{formatDate(event.date)}</p>
                                <p className="text-[10px] font-black tracking-wider uppercase text-indigo-500">
                                    {event.days_left === 0 ? '¡Hoy!' : `En ${event.days_left} días`}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UpcomingEventsWidget;
