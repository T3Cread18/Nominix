import React, { useEffect, useState } from 'react';
import { CalendarClock, Banknote, Clock, CheckCircle2 } from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import { useNavigate } from 'react-router-dom';

const PendingTasksWidget = () => {
    const [tasks, setTasks] = useState({
        pending_vacations: 0,
        pending_loans: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await dashboardService.getPendingTasks();
                setTasks(data);
            } catch (error) {
                console.error("Error fetching pending tasks:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    if (loading) {
        return <div className="h-32 bg-white/40 rounded-[2rem] animate-pulse"></div>;
    }

    const totalPendings = tasks.pending_vacations + tasks.pending_loans;

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/60 shadow-sm relative overflow-hidden group">
            {totalPendings === 0 && (
                <div className="absolute inset-0 bg-emerald-500/5 transition-opacity"></div>
            )}

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <Clock size={16} className={totalPendings > 0 ? "text-amber-500" : "text-emerald-500"} />
                    Tareas Pendientes
                </h3>
                {totalPendings > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full">
                        {totalPendings} Módulo(s)
                    </span>
                )}
            </div>

            <div className="space-y-3 relative z-10">
                {totalPendings === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                        <p className="text-sm font-medium text-slate-500">Todo al día. No hay tareas pendientes.</p>
                    </div>
                ) : (
                    <>
                        {tasks.pending_vacations > 0 && (
                            <button
                                onClick={() => navigate('/vacations')}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-amber-50 rounded-xl border border-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <CalendarClock size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-700">Aprobar Vacaciones</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Requiere revisión administrativa</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-amber-600">{tasks.pending_vacations}</span>
                            </button>
                        )}

                        {tasks.pending_loans > 0 && (
                            <button
                                onClick={() => navigate('/loans')}
                                className="w-full flex items-center justify-between p-3 bg-white hover:bg-emerald-50 rounded-xl border border-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Banknote size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-700">Aprobar Préstamos</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Revisión de solicitudes crédito</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-emerald-600">{tasks.pending_loans}</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PendingTasksWidget;
