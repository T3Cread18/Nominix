import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Tamaños del modal.
 */
const modalSizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-[90vw]",
};

/**
 * Modal - Diálogo modal accesible y reutilizable.
 * 
 * @example
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={() => setIsOpen(false)}
 *   title="Confirmar Acción"
 * >
 *   <p>¿Estás seguro de continuar?</p>
 *   <ModalFooter>
 *     <Button variant="ghost" onClick={onClose}>Cancelar</Button>
 *     <Button variant="primary">Confirmar</Button>
 *   </ModalFooter>
 * </Modal>
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
}) => {
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    // Manejar escape key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && closeOnEscape) {
            onClose();
        }
    }, [onClose, closeOnEscape]);

    // Manejar click en overlay
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
            onClose();
        }
    };

    // Focus trap y scroll lock
    useEffect(() => {
        if (isOpen) {
            // Guardar elemento activo anterior
            previousActiveElement.current = document.activeElement;

            // Bloquear scroll del body
            document.body.style.overflow = 'hidden';

            // Focus al modal
            modalRef.current?.focus();

            // Agregar listener de escape
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);

            // Restaurar focus al cerrar
            if (!isOpen && previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        };
    }, [isOpen, handleKeyDown]);

    // No renderizar si está cerrado
    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nominix-dark/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={handleOverlayClick}
            role="presentation"
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
                aria-describedby={description ? "modal-description" : undefined}
                tabIndex={-1}
                className={cn(
                    "relative w-full bg-white rounded-[2rem] shadow-2xl",
                    "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
                    "focus:outline-none",
                    modalSizes[size],
                    className
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 sm:p-8 pb-0 sm:pb-0">
                        <div className="flex-1 pr-4">
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="text-lg sm:text-xl font-black text-nominix-dark"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p
                                    id="modal-description"
                                    className="text-xs sm:text-sm text-gray-500 mt-1"
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 sm:p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-300 hover:text-nominix-dark"
                                aria-label="Cerrar"
                            >
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4 sm:p-8">
                    {children}
                </div>
            </div>
        </div>
    );

    // Usar portal para renderizar fuera del DOM tree normal
    return createPortal(modalContent, document.body);
};

/**
 * ModalFooter - Pie del modal con botones de acción.
 */
const ModalFooter = ({ children, className }) => (
    <div className={cn(
        "flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100",
        className
    )}>
        {children}
    </div>
);

/**
 * ConfirmModal - Modal de confirmación preconfigurado.
 * 
 * @example
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Eliminar registro"
 *   message="Esta acción no se puede deshacer."
 *   variant="danger"
 * />
 */
const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar acción",
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "primary", // primary | danger
    loading = false,
}) => {
    const handleConfirm = async () => {
        if (onConfirm) {
            await onConfirm();
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
        >
            {message && (
                <p className="text-gray-600 text-sm leading-relaxed">
                    {message}
                </p>
            )}
            <ModalFooter>
                <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={loading}
                >
                    {cancelText}
                </Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    onClick={handleConfirm}
                    loading={loading}
                >
                    {confirmText}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default Modal;
export { Modal, ModalFooter, ConfirmModal, modalSizes };
