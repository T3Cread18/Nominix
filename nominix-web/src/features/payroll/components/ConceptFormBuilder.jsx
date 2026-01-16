
import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../../api/axiosClient';
import { toast } from 'sonner';

// ============================================================================
// CONFIGURACIÓN DE UI PARA CADA BEHAVIOR
// ============================================================================
const BEHAVIOR_CONFIG = {
    'LAW_DEDUCTION': {
        title: "Deducción de Ley",
        description: "Configuración para deducciones como IVSS, FAOV, RPE.",
        fields: [
            { name: 'rate', label: 'Tasa / Porcentaje (0.00 - 1.00)', type: 'number', step: '0.0001', required: true, help: "Ej: 0.04 para 4%" },
            {
                name: 'base_source', label: 'Fuente de Base', type: 'select', required: true,
                options: [
                    { value: 'ACCUMULATOR', label: 'Acumulador (Suma de Incidencias)' },
                    { value: 'TOTAL_EARNINGS', label: 'Total Asignaciones' },
                    { value: 'BASIC_SALARY', label: 'Sueldo Base Mensual' }
                ]
            },
            {
                name: 'base_label', label: 'Etiqueta del Acumulador', type: 'text',
                required: true,
                help: "Tag interno usado para sumar incidencias (ej: FAOV_BASE)",
                showIf: (params) => params.base_source === 'ACCUMULATOR'
            },
            { name: 'cap_multiplier', label: 'Tope (Salarios Mínimos)', type: 'number', step: '1', help: "Dejar en blanco si no tiene tope." },
            { name: 'multiplier_var', label: 'Variable Multiplicadora', type: 'text', help: "Ej: 'LUNES' para multiplicar por lunes del mes." }
        ]
    },
    'SALARY_BASE': {
        title: "Sueldo Base",
        description: "Este concepto representa el pago del sueldo base. Generalmente no requiere parámetros adicionales.",
        fields: []
    },
    'CESTATICKET': {
        title: "Cestaticket",
        description: "Beneficio de alimentación. El monto se toma de la configuración de la empresa o contrato.",
        fields: []
    },
    'COMPLEMENT': {
        title: "Complemento Salarial",
        description: "Bonificaciones fijas recurrentes.",
        fields: []
    },
    'LOAN': {
        title: "Préstamo",
        description: "Deducción por concepto de pago de préstamos.",
        fields: []
    },
    'FIXED': {
        title: "Monto Fijo Manual",
        description: "Concepto de valor fijo asignado manualmente o por contrato.",
        fields: []
    },
    'DYNAMIC': {
        title: "Fórmula Python",
        description: "Cálculo avanzado mediante código Python.",
        customRender: true
    }
};

export default function ConceptFormBuilder({ initialData, onSave, onCancel }) {
    const queryClient = useQueryClient();
    const isEditing = !!initialData;

    // 1. Obtener Metadata del Backend y Monedas
    const { data: configMetadata, isLoading: loadingMeta } = useQuery({
        queryKey: ['conceptConfigMetadata'],
        queryFn: async () => {
            const res = await axios.get('/concepts/config-metadata/');
            return res.data;
        }
    });

    const { data: currencies, isLoading: loadingCurrencies } = useQuery({
        queryKey: ['currencies'],
        queryFn: async () => {
            const res = await axios.get('/currencies/');
            return res.data; // Asumiendo que retorna lista o {results: []}
        }
    });

    // 2. Configurar React Hook Form
    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            code: initialData?.code || '',
            name: initialData?.name || '',
            kind: initialData?.kind || 'EARNING',
            behavior: initialData?.behavior || 'DYNAMIC',
            currency: initialData?.currency || '', // Required field
            value: initialData?.value || 0,        // Required field
            incidences: initialData?.incidences || [],
            system_params: initialData?.system_params || {},
            formula: initialData?.formula || '',
            active: initialData?.active ?? true,
            appears_on_receipt: initialData?.appears_on_receipt ?? true,
            show_even_if_zero: initialData?.show_even_if_zero ?? false,
            calculation_base: initialData?.calculation_base || 'TOTAL',
            receipt_order: initialData?.receipt_order || 0
        }
    });

    // Watchers
    const selectedBehavior = watch('behavior');
    const currentParams = watch('system_params');
    const selectedKind = watch('kind');

    // Mutation para guardar
    const mutation = useMutation({
        mutationFn: (data) => {
            // Asegurar que value y currency existan (defaults si están vacíos para evitar 400)
            if (!data.value) data.value = 0;
            if (!data.currency && currencies?.length > 0) data.currency = currencies[0].code;

            if (isEditing) {
                return axios.put(`/payroll-concepts/${initialData.id}/`, data);
            } else {
                return axios.post('/payroll-concepts/', data);
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Concepto actualizado' : 'Concepto creado');
            queryClient.invalidateQueries(['payroll-concepts']);
            onSave && onSave();
        },
        onError: (err) => {
            toast.error('Error guardando concepto: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error desconocido'));
            console.error(err.response?.data);
        }
    });

    // Submit Handler
    const onSubmit = (formData) => {
        // Preparar Payload
        const payload = { ...formData };

        // Limpiar system_params (enviar solo lo relevante para el behavior)
        if (configMetadata?.behavior_required_params?.[payload.behavior]) {
            const requiredParams = configMetadata.behavior_required_params[payload.behavior];
            const cleanParams = {};

            // Mover campos dinámicos
            // Nota: En el form los params están dentro de system_params.key
            // Si usamos inputs anidados tipo register('system_params.rate') ya vienen listos.

            // Asegurarse de enviar tipos correctos (números)
            if (payload.system_params) {
                cleanParams.rate = payload.system_params.rate ? parseFloat(payload.system_params.rate) : null;
                cleanParams.cap_multiplier = payload.system_params.cap_multiplier ? parseInt(payload.system_params.cap_multiplier) : null;
                cleanParams.base_source = payload.system_params.base_source;
                cleanParams.base_label = payload.system_params.base_label;
                cleanParams.multiplier_var = payload.system_params.multiplier_var;

                // Limpiar nulos/undefined
                Object.keys(cleanParams).forEach(key => cleanParams[key] === undefined && delete cleanParams[key]);
            }
            payload.system_params = cleanParams;
        } else {
            // En DYNAMIC o FIXED, conservamos lo que sea necesario o limpiamos
            if (payload.behavior !== 'DYNAMIC') {
                payload.system_params = {};
            }
        }

        mutation.mutate(payload);
    };

    if (loadingMeta) return <div className="p-4">Cargando configuración...</div>;

    const currentBehaviorConfig = BEHAVIOR_CONFIG[selectedBehavior] || {};

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">

            {/* 1. Datos Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Código</label>
                    <input
                        {...register('code', { required: 'El código es requerido' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        disabled={isEditing} // Código inmutable
                    />
                    {errors.code && <span className="text-red-500 text-xs">{errors.code.message}</span>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input
                        {...register('name', { required: 'El nombre es requerido' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                        {...register('kind')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                    >
                        {configMetadata?.kinds?.map(k => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Comportamiento</label>
                    <select
                        {...register('behavior')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                    >
                        {configMetadata?.behaviors?.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Base de Cálculo</label>
                    <select
                        {...register('calculation_base')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                    >
                        {configMetadata?.calculation_base_options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Utilizado en porcentajes y horas extras</p>
                </div>

                {/* New Currency Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Moneda Referencial</label>
                    <select
                        {...register('currency', { required: 'La moneda es requerida' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">-- Moneda --</option>
                        {Array.isArray(currencies) ? currencies.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        )) : currencies?.results?.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                    </select>
                    {errors.currency && <span className="text-red-500 text-xs">{errors.currency.message}</span>}
                </div>

                {/* Default Value Field (Hidden or Visible based on behavior?) -> Always visible as fallback but might be 0 */}
                <div className={selectedBehavior !== 'FIXED' ? 'hidden' : ''}>
                    <label className="block text-sm font-medium text-gray-700">Valor Fijo</label>
                    <input
                        type="number" step="0.0001"
                        {...register('value')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                    />
                    <p className="text-xs text-gray-400">Usado solo si Comportamiento es 'Monto Fijo'</p>
                </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            {/* 2. Configuración Específica del Comportamiento */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-md font-medium text-indigo-700 mb-1">{currentBehaviorConfig.title || 'Configuración'}</h3>
                <p className="text-sm text-gray-500 mb-4">{currentBehaviorConfig.description}</p>

                {/* Renderizado de campos dinámicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentBehaviorConfig.fields?.map((field) => {
                        // Check showIf condition
                        if (field.showIf && !field.showIf(currentParams || {})) return null;

                        return (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'select' ? (
                                    <select
                                        {...register(`system_params.${field.name}`, { required: field.required })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {field.options?.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        step={field.step}
                                        {...register(`system_params.${field.name}`, { required: field.required })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 sm:text-sm border p-2"
                                    />
                                )}
                                {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
                            </div>
                        );
                    })}

                    {/* Editor de Fórmula (Solo para DYNAMIC) */}
                    {currentBehaviorConfig.customRender && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Código Python</label>
                            <textarea
                                {...register('formula')}
                                rows={6}
                                className="w-full font-mono text-sm p-3 border rounded-md bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ej: (SALARIO / 30) * DIAS"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Variables: SALARIO, DIAS, LUNES, TASA, ANTIGUEDAD.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Incidencias (Solo si es EARNING? Opcional) */}
            {selectedKind === 'EARNING' && (
                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Incidencias (Afecta a Bases)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-white p-3 border rounded-md max-h-40 overflow-y-auto">
                        {configMetadata?.accumulators?.map(acc => (
                            <div key={acc.code} className="flex items-start">
                                <input
                                    id={`inc-${acc.code}`}
                                    type="checkbox"
                                    value={acc.code}
                                    {...register('incidences')}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-1"
                                />
                                <label htmlFor={`inc-${acc.code}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                    {acc.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Opciones de Visualización */}
            <div className="flex gap-4 mt-4">
                <div className="flex items-center">
                    <input id="active" type="checkbox" {...register('active')} className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">Activo</label>
                </div>
                <div className="flex items-center">
                    <input id="appears_on_receipt" type="checkbox" {...register('appears_on_receipt')} className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                    <label htmlFor="appears_on_receipt" className="ml-2 block text-sm text-gray-900">Visible en Recibo</label>
                </div>

                <div className="flex-grow"></div>

                <div className="w-32">
                    <label className="block text-xs text-gray-500">Orden</label>
                    <input type="number" {...register('receipt_order')} className="w-full text-sm border rounded p-1" />
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={mutation.isLoading}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {mutation.isLoading ? 'Guardando...' : 'Guardar Concepto'}
                </button>
            </div>

        </form>
    );
}
