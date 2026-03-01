import React, { useEffect, useState } from 'react';
import { Users, FileText, AlertCircle, Loader2 } from 'lucide-react';
import dashboardService from '../../api/dashboardService';

const DashboardMetrics = () => {
    const [metrics, setMetrics] = useState({
        active_employees: 0,
        open_payrolls: 0,
        expiring_contracts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await dashboardService.getMetrics();
                setMetrics(data);
            } catch (error) {
                console.error("Error fetching dashboard metrics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={`skeleton-${i}`} className="bg-white/40 h-24 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: "Empleados Activos",
            value: metrics.active_employees,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Nóminas Abiertas",
            value: metrics.open_payrolls,
            icon: FileText,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            title: "Contratos x Vencer",
            value: metrics.expiring_contracts,
            icon: AlertCircle,
            color: metrics.expiring_contracts > 0 ? "text-rose-500" : "text-slate-400",
            bg: metrics.expiring_contracts > 0 ? "bg-rose-50" : "bg-slate-50",
            alert: metrics.expiring_contracts > 0
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {cards.map((card, idx) => (
                <div key={card.title} className="bg-white/80 backdrop-blur-sm p-4 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between group hover:bg-white transition-all">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                        <div className="flex items-center gap-2">
                            <h4 className="text-3xl font-black text-slate-800">{card.value}</h4>
                            {card.alert && (
                                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                            )}
                        </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                        <card.icon size={24} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardMetrics;
