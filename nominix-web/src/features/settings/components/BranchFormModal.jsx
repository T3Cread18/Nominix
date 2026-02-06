import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateBranch, useUpdateBranch } from '../../../hooks/useOrganization';
import { Modal, InputField, ToggleField, Button } from '../../../components/ui';
import { Save } from 'lucide-react';

const BranchFormModal = ({ branch, onClose, onSuccess }) => {
    const { mutate: createBranch, isPending: creating } = useCreateBranch();
    const { mutate: updateBranch, isPending: updating } = useUpdateBranch();

    const isEditing = !!branch;
    const isSaving = creating || updating;

    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            is_active: true
        }
    });

    useEffect(() => {
        if (branch) {
            reset(branch);
        } else {
            reset({ is_active: true });
        }
    }, [branch, reset]);

    const onSubmit = (data) => {
        if (isEditing) {
            updateBranch({ id: branch.id, data }, {
                onSuccess: () => {
                    if (onSuccess) onSuccess();
                    onClose();
                }
            });
        } else {
            createBranch(data, {
                onSuccess: () => {
                    if (onSuccess) onSuccess();
                    onClose();
                }
            });
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={isEditing ? 'Editar Sede' : 'Nueva Sede'}
            maxWidth="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                    <InputField
                        label="Nombre"
                        placeholder="Ej: Sucursal Centro"
                        {...register('name', { required: true })}
                    />
                    <InputField
                        label="Código"
                        placeholder="Ej: S-001"
                        {...register('code', { required: true })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <InputField
                        label="RIF"
                        placeholder="J-12345678-9"
                        {...register('rif')}
                    />
                    <InputField
                        label="Teléfono"
                        placeholder="0212..."
                        {...register('phone')}
                    />
                </div>

                <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 pl-3 mb-1 block">Dirección Física</label>
                    <textarea
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none h-20 resize-none focus:bg-white focus:border-nominix-electric transition-colors"
                        {...register('address')}
                    />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                    <ToggleField
                        label="Sede Operativa"
                        {...register('is_active')}
                    />
                </div>

                <Button
                    type="submit"
                    fullWidth
                    loading={isSaving}
                    icon={Save}
                >
                    {isEditing ? 'Guardar Cambios' : 'Crear Sede'}
                </Button>
            </form>
        </Modal>
    );
};

export default BranchFormModal;
