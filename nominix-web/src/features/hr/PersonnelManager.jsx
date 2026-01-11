import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { toast } from 'sonner';
import ConfirmationModal from '../../components/ConfirmationModal';
import HeaderToolbar from './components/HeaderToolbar';
import PersonnelTable from './components/PersonnelTable';
import PaginationToolbar from './components/PaginationToolbar';

const PersonnelManager = () => {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Estado para borrado (loading)
    const [deletingId, setDeletingId] = useState(null);

    // --- ESTADO PARA EL MODAL DE CONFIRMACIÓN ---
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        isDangerous: false
    });

    // --- CARGA DE CATÁLOGOS ---
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await axiosClient.get('/branches/');
                setBranches(res.data.results || res.data);
            } catch (error) {
                console.error("Error cargando sedes", error);
            }
        };
        loadBranches();
    }, []);

    // --- FUNCIÓN PRINCIPAL DE CARGA ---
    const fetchEmployees = useCallback(async (page, search, branchId) => {
        setLoading(true);
        try {
            let url = `/employees/?page=${page}`;
            if (search) url += `&search=${search}`;
            if (branchId) url += `&branch=${branchId}`;

            const response = await axiosClient.get(url);

            if (response.data.results) {
                setEmployees(response.data.results);
                setTotalPages(Math.ceil(response.data.count / 20) || 1);
            } else {
                setEmployees(response.data);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Error cargando personal:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- EFECTO: DISPARAR BÚSQUEDA ---
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees(currentPage, searchTerm, selectedBranch);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, searchTerm, selectedBranch, fetchEmployees]);

    // --- LÓGICA DE BORRADO ACTUALIZADA ---
    const executeDelete = async (id) => {
        setDeletingId(id);
        setConfirmState(prev => ({ ...prev, isOpen: false })); // Cerramos modal

        try {
            await axiosClient.delete(`/employees/${id}/`);
            toast.success("Expediente eliminado correctamente");
            // Recargamos la lista
            fetchEmployees(currentPage, searchTerm, selectedBranch);
        } catch (error) {
            console.error(error);
            if (error.response && error.response.status === 400) {
                toast.error(error.response.data.error || "No se puede eliminar el registro.");
            } else {
                toast.error("Ocurrió un error al intentar eliminar.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const requestDelete = (e, id) => {
        e.stopPropagation(); // Evita navegar al detalle
        setConfirmState({
            isOpen: true,
            title: '¿Eliminar Expediente?',
            message: 'Esta acción eliminará permanentemente al colaborador y sus datos asociados. Si tiene historial de nómina, la acción será bloqueada por seguridad.',
            action: () => executeDelete(id),
            isDangerous: true
        });
    };

    return (
        <div className="relative h-[calc(100vh-100px)]">

            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                message={confirmState.message}
                isDangerous={confirmState.isDangerous}
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
            />

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">

                <HeaderToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={(val) => {
                        setSearchTerm(val);
                        setCurrentPage(1);
                    }}
                    selectedBranch={selectedBranch}
                    setSelectedBranch={(val) => {
                        setSelectedBranch(val);
                        setCurrentPage(1);
                    }}
                    branches={branches}
                    onNewClick={() => navigate('/personnel/create')}
                />

                <PersonnelTable
                    employees={employees}
                    loading={loading}
                    searchTerm={searchTerm}
                    selectedBranch={selectedBranch}
                    deletingId={deletingId}
                    onRowClick={(id) => navigate(`/personnel/${id}`)}
                    onRequestDelete={requestDelete}
                />

                <PaginationToolbar
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default PersonnelManager;