import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useDeleteEmployee } from '../../hooks/useEmployees'; // Nuevo Hook
import { useBranches } from '../../hooks/useOrganization'; // Nuevo Hook
import ConfirmationModal from '../../components/ConfirmationModal';
import HeaderToolbar from './components/HeaderToolbar';
import PersonnelTable from './components/PersonnelTable';
import PaginationToolbar from './components/PaginationToolbar';
import Card from '../../components/ui/Card';

const PersonnelManager = () => {
    const navigate = useNavigate();

    // --- ESTADOS DE FILTRO Y PAGINACIÓN ---
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [branch, setBranch] = useState('');

    // --- HOOKS ---
    // Cargar empleados con React Query
    const {
        data: employeeData,
        isLoading: loadingEmployees,
        isFetching
    } = useEmployees({
        page,
        search,
        branch
    });

    // Cargar sedes para el filtro
    const { data: branches = [] } = useBranches();

    // Hook de eliminación
    const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

    // --- ESTADO PARA EL MODAL DE CONFIRMACIÓN ---
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        isDangerous: false
    });

    // --- HANDLERS ---

    // Cambio de filtros (resetea página)
    const handleSearchCheck = (val) => {
        setSearch(val);
        setPage(1);
    };

    const handleBranchChange = (val) => {
        setBranch(val);
        setPage(1);
    };

    // Lógica de borrado
    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setConfirmState({
            isOpen: true,
            title: '¿Eliminar Expediente?',
            message: 'Esta acción eliminará permanentemente al colaborador y sus datos asociados. Acciones irreversibles.',
            action: () => {
                deleteEmployee(id, {
                    onSuccess: () => setConfirmState(prev => ({ ...prev, isOpen: false }))
                });
            },
            isDangerous: true
        });
    };

    const employees = employeeData?.results || [];
    const totalPages = Math.ceil((employeeData?.count || 0) / 20) || 1;

    return (
        <div className="relative h-[calc(100vh-100px)]">
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                message={confirmState.message}
                isDangerous={confirmState.isDangerous}
                confirmText={isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                cancelText="Cancelar"
            />

            <Card className="flex flex-col h-full overflow-hidden !p-0 !rounded-[2rem]">
                <HeaderToolbar
                    searchTerm={search}
                    setSearchTerm={handleSearchCheck}
                    selectedBranch={branch}
                    setSelectedBranch={handleBranchChange}
                    branches={branches}
                    onNewClick={() => navigate('/personnel/create')}
                    onEndowmentsClick={() => navigate('/personnel/endowments')}
                />

                <PersonnelTable
                    employees={employees}
                    loading={loadingEmployees || isFetching}
                    searchTerm={search}
                    selectedBranch={branch}
                    onRowClick={(id) => navigate(`/personnel/${id}`)}
                    onRequestDelete={handleDeleteClick}
                />

                <PaginationToolbar
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </Card>
        </div>
    );
};

export default PersonnelManager;
