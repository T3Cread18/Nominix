import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop Blur */}
            <div
                className="absolute inset-0 bg-nominix-dark/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="p-8 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isDangerous ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        <AlertTriangle size={32} />
                    </div>

                    <h3 className="text-xl font-black text-nominix-dark mb-2">{title}</h3>
                    <p className="text-sm font-bold text-gray-400 mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isDangerous
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    : 'bg-nominix-electric hover:opacity-90 shadow-blue-500/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;