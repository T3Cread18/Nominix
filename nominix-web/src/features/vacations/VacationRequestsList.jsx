import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    RefreshCw,
    Filter,
    User,
    CalendarDays,
    AlertTriangle,
    Eye,
    Trash2,
    ChevronDown,
    DollarSign,
    Download,
} from 'lucide-react';

import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import vacationService from '../../services/vacation.service';
import { cn } from '../../utils/cn';
import VacationPaymentModal from './VacationPaymentModal';
import VacationApprovalModal from './VacationApprovalModal';

/**
 * VacationRequestsList - Lista de solicitudes de vacaciones con acciones.
 */
const VacationRequestsList = ({ onRefresh }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // Payment modal state
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Approval modal state
    const [selectedApprovalRequest, setSelectedApprovalRequest] = useState(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

    const [downloadingId, setDownloadingId] = useState(null);

    // Cargar solicitudes
    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const filters = statusFilter ? { status: statusFilter } : {};
            const data = await vacationService.getRequests(filters);
            setRequests(data);
        } catch (err) {
            console.error('Error loading requests:', err);
            setError('Error al cargar las solicitudes');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Calcular días dinámicamente si no vienen del backend
    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Abrir modal de aprobación
    const handleOpenApprovalModal = (request) => {
        setSelectedApprovalRequest(request);
        setIsApprovalModalOpen(true);
    };

    // Confirmar aprobación
    const handleConfirmApprove = async (id) => {
        try {
            setActionLoading(id);
            await vacationService.approveRequest(id);
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error approving:', err);
            setError(err.response?.data?.error || 'Error al aprobar');
            throw err; // Propagate error to modal
        } finally {
            setActionLoading(null);
        }
    };

    // Rechazar solicitud
    const handleReject = async (id) => {
        try {
            setActionLoading(id);
            await vacationService.rejectRequest(id, rejectReason);
            setShowRejectModal(null);
            setRejectReason('');
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error rejecting:', err);
            setError(err.response?.data?.error || 'Error al rechazar');
        } finally {
            setActionLoading(null);
        }
    };

    // Eliminar solicitud
    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta solicitud?')) return;

        try {
            setActionLoading(id);
            await vacationService.deleteRequest(id);
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error deleting:', err);
            setError(err.response?.data?.error || 'Error al eliminar');
        } finally {
            setActionLoading(null);
        }
    };

    // Abrir modal de pago
    const handleOpenPaymentModal = (request) => {
        setSelectedRequest(request);
        setIsPaymentModalOpen(true);
    };

    // Descargar recibo PDF
    const handleDownloadReceipt = async (requestId) => {
        try {
            setDownloadingId(requestId);
            await vacationService.downloadReceiptPdf(requestId);
        } catch (err) {
            console.error('Error downloading PDF:', err);
            setError('Error al descargar el recibo');
        } finally {
            setDownloadingId(null);
        }
    };

    // Status badge colors
    const getStatusBadge = (status) => {
        const statusMap = {
            DRAFT: { variant: 'warning', label: 'Borrador', icon: Clock },
            APPROVED: { variant: 'success', label: 'Aprobada', icon: CheckCircle2 },
            REJECTED: { variant: 'error', label: 'Rechazada', icon: XCircle },
            PROCESSED: { variant: 'secondary', label: 'Procesada', icon: FileText },
        };
        const config = statusMap[status] || { variant: 'secondary', label: status, icon: Clock };
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon size={12} />
                {config.label}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={18} />
                            Solicitudes de Vacaciones
                        </CardTitle>
                        <CardDescription>
                            {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} encontrada{requests.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none bg-slate-50 border border-gray-100 rounded-xl px-4 py-2 pr-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-nominix-electric/20"
                            >
                                <option value="">Todos los estados</option>
                                <option value="DRAFT">Borradores</option>
                                <option value="APPROVED">Aprobadas</option>
                                <option value="REJECTED">Rechazadas</option>
                                <option value="PROCESSED">Procesadas</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={fetchRequests}
                            loading={loading}
                            icon={RefreshCw}
                        >
                            Actualizar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-nominix-electric" size={32} />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">No hay solicitudes</p>
                        <p className="text-xs mt-1">Las solicitudes aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className={cn(
                                    "p-4 bg-slate-50 rounded-xl border border-gray-100 hover:border-nominix-electric/30 transition-all",
                                    actionLoading === req.id && "opacity-50 pointer-events-none"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Employee & Dates */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-nominix-electric/10 rounded-lg">
                                                <User size={16} className="text-nominix-electric" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-nominix-dark">
                                                    {req.employee_name || `Empleado #${req.employee}`}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    ID: {req.id}
                                                </p>
                                            </div>
                                            {getStatusBadge(req.status)}
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mt-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-gray-600">
                                                    {req.start_date} → {req.end_date}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CalendarDays size={14} className="text-gray-400" />
                                                <span className="font-bold text-nominix-dark">
                                                    {req.days_requested} días
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Clock size={14} className="text-gray-400" />
                                                Retorno: {req.return_date}
                                            </div>
                                        </div>

                                        {req.notes && (
                                            <p className="text-xs text-gray-500 mt-2 italic">
                                                {req.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {req.status === 'DRAFT' && (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleOpenApprovalModal(req)}
                                                    loading={actionLoading === req.id}
                                                    icon={CheckCircle2}
                                                >
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => setShowRejectModal(req.id)}
                                                    icon={XCircle}
                                                >
                                                    Rechazar
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(req.id)}
                                                    icon={Trash2}
                                                />
                                            </>
                                        )}
                                        {req.status === 'APPROVED' && (
                                            <Button
                                                variant="electric"
                                                size="sm"
                                                onClick={() => handleOpenPaymentModal(req)}
                                                icon={DollarSign}
                                            >
                                                Procesar Pago
                                            </Button>
                                        )}
                                        {req.status === 'PROCESSED' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleDownloadReceipt(req.id)}
                                                loading={downloadingId === req.id}
                                                icon={Download}
                                            >
                                                Descargar Recibo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
                            <h3 className="text-lg font-bold text-nominix-dark mb-4 flex items-center gap-2">
                                <XCircle className="text-red-500" size={20} />
                                Rechazar Solicitud
                            </h3>
                            <div className="mb-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Motivo del Rechazo (Opcional)
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={3}
                                    placeholder="Ingrese el motivo..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowRejectModal(null);
                                        setRejectReason('');
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleReject(showRejectModal)}
                                    loading={actionLoading === showRejectModal}
                                    icon={XCircle}
                                >
                                    Confirmar Rechazo
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Modal */}
                <VacationPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    vacationRequest={selectedRequest}
                    onSuccess={fetchRequests}
                />

                {/* Approval Modal */}
                <VacationApprovalModal
                    isOpen={isApprovalModalOpen}
                    onClose={() => {
                        setIsApprovalModalOpen(false);
                        setSelectedApprovalRequest(null);
                    }}
                    vacationRequest={selectedApprovalRequest}
                    onApprove={handleConfirmApprove}
                />
            </CardContent>
        </Card>
    );
};

export default VacationRequestsList;
