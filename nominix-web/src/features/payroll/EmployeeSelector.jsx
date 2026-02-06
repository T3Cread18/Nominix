import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, ChevronDown, Check, X, Loader2, Building2, Filter } from 'lucide-react';
import { cn } from '../../utils/cn';

const EmployeeSelector = ({ employees, onSelect, isLoading = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // --- NUEVO: Estado para la Sede ---
    const [selectedBranch, setSelectedBranch] = useState("TODAS");
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

    const wrapperRef = useRef(null);
    const branchMenuRef = useRef(null);

    // 1. Extraer Sedes Únicas (Memoizado para rendimiento)
    const uniqueBranches = useMemo(() => {
        const branches = new Set(employees
            .map(e => e.branch?.name || e.branch || "Sin Sede") // Ajusta 'e.branch?.name' según tu backend
            .filter(Boolean)
        );
        return ["TODAS", ...Array.from(branches).sort()];
    }, [employees]);

    // 2. Filtrado Combinado (Texto + Sede)
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const empBranch = emp.branch?.name || emp.branch || "Sin Sede";

            // Filtro de Texto
            const matchesSearch = (
                (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.national_id.includes(searchTerm)
            );

            // Filtro de Sede
            const matchesBranch = selectedBranch === "TODAS" || empBranch === selectedBranch;

            return matchesSearch && matchesBranch;
        });
    }, [employees, searchTerm, selectedBranch]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            // Cerrar dropdown de empleados
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
            // Cerrar menú de sedes
            if (branchMenuRef.current && !branchMenuRef.current.contains(event.target)) {
                setIsBranchMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (emp) => {
        setSelectedEmployee(emp);
        setSearchTerm(`${emp.first_name} ${emp.last_name}`);
        setIsOpen(false);
        if (onSelect) onSelect(emp);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSearchTerm("");
        setSelectedEmployee(null);
        setIsOpen(true);
        if (onSelect) onSelect(null);
    };

    const getInitials = (name) => {
        if (!name) return "??";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const fullName = (emp) => `${emp.first_name} ${emp.last_name}`;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative z-20" ref={wrapperRef}>
            {/* Header con Filtro de Sede */}
            <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Colaborador
                </label>

                {/* Botón de Filtro de Sede */}
                <div className="relative" ref={branchMenuRef}>
                    <button
                        onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                            selectedBranch !== "TODAS"
                                ? "bg-nominix-electric text-white border-nominix-electric shadow-lg shadow-nominix-electric/20"
                                : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                        )}
                    >
                        <Building2 size={12} />
                        <span className="max-w-[100px] truncate">{selectedBranch === "TODAS" ? "Filtrar Sede" : selectedBranch}</span>
                        <ChevronDown size={10} className={cn("transition-transform", isBranchMenuOpen && "rotate-180")} />
                    </button>

                    {/* Menú Dropdown de Sedes */}
                    {isBranchMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                            <div className="p-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Seleccionar Sede</p>
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                {uniqueBranches.map(branch => (
                                    <button
                                        key={branch}
                                        onClick={() => {
                                            setSelectedBranch(branch);
                                            setIsBranchMenuOpen(false);
                                            setIsOpen(true); // Reabrir buscador al filtrar
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between transition-colors",
                                            selectedBranch === branch
                                                ? "bg-nominix-electric/10 text-nominix-electric"
                                                : "text-slate-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <span className="truncate">{branch === "TODAS" ? "Todas las Sedes" : branch}</span>
                                        {selectedBranch === branch && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative group">
                {/* Input Wrapper */}
                <div
                    className={cn(
                        "flex items-center bg-slate-50 border border-gray-100/50 rounded-2xl transition-all duration-300 cursor-text",
                        isOpen ? "bg-white border-nominix-electric ring-4 ring-nominix-electric/5" : "hover:bg-slate-100"
                    )}
                    onClick={() => setIsOpen(true)}
                >
                    <div className="pl-4">
                        {selectedEmployee ? (
                            <div className="h-6 w-6 rounded-full bg-nominix-electric text-white flex items-center justify-center text-[10px] font-bold">
                                {getInitials(fullName(selectedEmployee))}
                            </div>
                        ) : (
                            <Search size={16} className="text-gray-300 group-hover:text-nominix-electric transition-colors" />
                        )}
                    </div>

                    <input
                        type="text"
                        className="w-full p-4 bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 placeholder:text-gray-300 outline-none truncate"
                        placeholder={selectedBranch !== "TODAS" ? `Buscar en ${selectedBranch}...` : "Buscar por nombre o cédula..."}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                            if (selectedEmployee) setSelectedEmployee(null);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />

                    <div className="pr-4 flex items-center gap-2">
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin text-nominix-electric" />
                        ) : (
                            searchTerm && (
                                <button
                                    onClick={handleClear}
                                    className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )
                        )}
                        <ChevronDown
                            size={16}
                            strokeWidth={3}
                            className={cn("text-gray-400 transition-transform duration-300", isOpen && "rotate-180")}
                        />
                    </div>
                </div>

                {/* Dropdown de Resultados */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto custom-scrollbar z-50 animate-in fade-in slide-in-from-top-2">
                        {filteredEmployees.length > 0 ? (
                            <div className="py-2">
                                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 flex justify-between">
                                    <span>Resultados</span>
                                    {selectedBranch !== "TODAS" && <span className="text-nominix-electric">Filtro: {selectedBranch}</span>}
                                </div>
                                {filteredEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => handleSelect(emp)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-gray-50 last:border-0 group/item",
                                            selectedEmployee?.id === emp.id && "bg-blue-50/60"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                            selectedEmployee?.id === emp.id
                                                ? "bg-nominix-electric text-white"
                                                : "bg-slate-100 text-slate-500 group-hover/item:bg-white group-hover/item:shadow-sm"
                                        )}>
                                            {getInitials(fullName(emp))}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-bold truncate", selectedEmployee?.id === emp.id ? "text-nominix-electric" : "text-slate-700")}>
                                                {fullName(emp)}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{emp.national_id}</span>
                                                <span>•</span>
                                                <span className="truncate">
                                                    {emp.job_position?.name || emp.job_position || "Sin cargo"}
                                                </span>
                                            </div>
                                            {/* Mostrar Sede en el item si no estamos filtrando por una específica */}
                                            {selectedBranch === "TODAS" && (
                                                <p className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Building2 size={8} />
                                                    {emp.branch?.name || emp.branch || "Sin Sede"}
                                                </p>
                                            )}
                                        </div>

                                        {selectedEmployee?.id === emp.id && (
                                            <Check size={16} className="text-nominix-electric flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                                <Filter size={24} className="mb-2 opacity-20" />
                                <span className="text-xs font-medium">No hay empleados en esta sede</span>
                                {selectedBranch !== "TODAS" && (
                                    <button
                                        onClick={() => setSelectedBranch("TODAS")}
                                        className="mt-2 text-[10px] text-nominix-electric font-bold hover:underline"
                                    >
                                        Ver todas las sedes
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeSelector;