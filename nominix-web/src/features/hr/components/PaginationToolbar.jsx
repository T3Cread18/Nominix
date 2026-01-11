
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaginationToolbar = ({ currentPage, totalPages, onPageChange }) => {
    return (
        <div className="p-4 border-t border-slate-50 bg-white flex items-center justify-between flex-shrink-0 z-20">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationToolbar;
